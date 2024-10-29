/*
 *  -------------------------------------------------
 *  |                                                |
 *  |           Created by Krish Galani              |
 *  |         Copyright © 2024 Krish Galani          |
 *  |               MIT License                      |
 *  |        GitHub: github.com/krishgalani          |
 *  |                                                |
 *  -------------------------------------------------
 */

import {spawn} from 'child_process';
import {ScrapeOperation, PageArgs, JobArgs} from './scrape_operation';
import * as path from 'path';
import * as fs from 'fs';
import {clean_dir ,appendFileContent} from './utils';
import {setGracefulCleanup,fileSync, dirSync, dir} from 'tmp';
import { TempFile } from './tempfile';
import { printProgressBar } from './utils';
import { sleep } from './utils';

//Globals
setGracefulCleanup()
const baseUrl = "https://hk.jobsdb.com/jobs"
const cloudNodeProcesses: any[] = [];
let numCloudNodes : number = 0; 
let pageRanges = [[0,0],[0,0]];
const enableLogging = false
const tmpDir = dirSync({unsafeCleanup: !enableLogging})
const mergedOutFile = new TempFile(fileSync({dir : tmpDir.name}))
const outFiles = Array.from({ length: 2 }, () => new TempFile(fileSync({ dir: tmpDir.name })));
let logFiles: any = Array(2).fill(null)
if(enableLogging){
  logFiles = Array.from({ length: 2 }, () => new TempFile(fileSync({ dir: tmpDir.name, keep : true })));
}

let scrapeOperations : ScrapeOperation[] = [];
let tasks : any = [];
let ports : number[] = [];
const start_time = Date.now()/1000;
//Wait for port number to be returned from cloudnode in order to pass to scraping Hero instances
function waitForPort(process: any): Promise<number>{
  return new Promise((resolve, reject) => {
    process.stdout?.once('data', (data: Buffer) => {
      try {
        const port = parseInt(data.toString(), 10); // Convert data to number
        resolve(port);
      }catch(error){
        reject(error)
      }
    });
  });
}
//Init cloudnodes
function startServerProcess(name: string): any {
  const serverProcess = spawn('node', ['build/src/cloudnode']);
  
  serverProcess.on('close', (code: number | null) => {
    if(code !== null){
      console.log(`Cloud node exited abrutly`)
    }
  });
  
  serverProcess.stderr.on('data', (error: Buffer) => {
    const errorMessage = error.toString();
    if (errorMessage.includes('Warning')) {
      if(!errorMessage.includes("Deprecat")){
        console.warn(`Cloud Node ${name} Warning:`, errorMessage);
      }
    } else {
      console.error(`Cloud Node ${name} Error:`, errorMessage);
    }
  });

  return serverProcess;
}
//Main
(async () => {
  let encountered_error = false;
  let totalPagesToScrape = 0
  let resultsDir = "./jobsdb_scrape_results";
  let numPages;
  try { 
    const args = process.argv.slice(2); // Get all the arguments passed after "node script.js"
    if (args.length > 0 && !Number.isNaN(parseInt(args[0])) && parseInt(args[0]) >= 1 && parseInt(args[0]) <= 1000) { 
      numPages = parseInt(args[0])
      if (numPages > 10){
        numCloudNodes = 2
        pageRanges = [[1,Math.trunc(numPages/2)],[Math.trunc(numPages/2)+1,numPages]]
      } else {
        numCloudNodes = 1
        pageRanges[0] = [1,numPages]
      }
      if(args.length > 1){
        const dirPath = args[1];
        // Ensure the directory exists
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
          console.log("The directory specified to save results file to is invalid")
          encountered_error = true
          return
        } else {
          fs.accessSync(dirPath, fs.constants.W_OK)
          resultsDir = dirPath
        }
      }
    } else {
      encountered_error = true
      console.error("Please enter a valid number of pages to scrape (1-1000)")
      return
    }
    //Remove old logs (if they exist)
    if(enableLogging){
      clean_dir('../jobsdb_scrape_logs')
    }
    //Start cloudnodes
    for (let i = 0; i < numCloudNodes; i++) {
      const serverProcess = startServerProcess(i.toString());
      cloudNodeProcesses.push(serverProcess);
    }
    //Start scraping operations
    for (let i = 0; i < numCloudNodes; i++) {
      if(enableLogging){
        console.log(`Logfile ${i+1} created at ${logFiles[i].getFilePath()}`)
      }
      totalPagesToScrape += pageRanges[i][1] - pageRanges[i][0] +1
      ports.push(await waitForPort(cloudNodeProcesses[i]))
      scrapeOperations.push(new ScrapeOperation(baseUrl,pageRanges[i],ports[i],outFiles[i],logFiles[i]))
      tasks.push(scrapeOperations[i].__call__())
    }
    let scrapeOperationsDone = false
    console.log(`Scraping the first ${totalPagesToScrape} pages of jobs.`)
    Promise.all(tasks)
    .catch(err => {
      throw err;
    })
    .finally(() => {
      scrapeOperationsDone = true;
    });
    while(!scrapeOperationsDone){
      let pagesScraped = 0
      for(let scrapeOp of scrapeOperations){
        pagesScraped += scrapeOp.pagesScraped
      }
      printProgressBar(pagesScraped,totalPagesToScrape)
      await sleep(10000)
    }
  } catch (error : any) {
    encountered_error = true
    if(error.code === 'EACCES'){
      console.error("The specified result directory does not have write permissions.")
    } else {
      console.error('scrape.ts:', error);
    }
    
  } finally {
      //Cleanup results
      await mergedOutFile.writeToFile('[\n')
      for (let i = 0; i < numCloudNodes; i++) {
        if(enableLogging){
          const logFileSavePath = `jobsdb_scrape_logs/p${pageRanges[i][0]}-${pageRanges[i][1]}.log`
          await logFiles[i].renameTempFile(logFileSavePath)
          console.log(`\nLogfile ${i+1} saved to ${logFileSavePath}`)
        }
        await appendFileContent(outFiles[i].getFilePath(),mergedOutFile.getFilePath())
        if(cloudNodeProcesses.length){
          cloudNodeProcesses[i].kill('SIGKILL')
        }
      }
      await mergedOutFile.popLine()
      await mergedOutFile.writeToFile('}\n]')
      if(!encountered_error){
        const now = new Date();
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        // const resultFileName = `jobsdb-${numPages}-${formattedDate}.json`
        const resultFileName = 'jobsdb_scrape_results.txt'
        const resultPath = path.join(resultsDir,resultFileName)
        await mergedOutFile.renameTempFile(resultPath)
        console.log(`\nResult file saved to ${resultPath} in json format.`)
        console.log(`Scrape finished in ${Math.floor(Date.now()/1000 - start_time)} seconds`)
      }
  }
})();
