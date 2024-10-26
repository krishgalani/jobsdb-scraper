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

import {spawn} from 'child_process'
import {ScrapeOperation, PageArgs, JobArgs} from './scrape_operation'
import {clean_dir ,appendFileContent} from './utils';
import {setGracefulCleanup,fileSync, dirSync} from 'tmp';
import { TempFile } from './tempfile';
import { printProgressBar } from './utils';
import { sleep } from './utils';

//Globals
setGracefulCleanup()
const baseUrl = "https://hk.jobsdb.com/jobs"
const cloudNodeProcesses: any[] = [];
const numCloudNodes : number = 2; 
let pageRanges = [[1,500],[501,1000]];
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
  const serverProcess = spawn('node', ['build/cloudnode']);
  
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
  const args = process.argv.slice(2); // Get all the arguments passed after "node script.js"
  if (args.length > 0) { 
    const numPages = parseInt(args[0])
    pageRanges = [[1,numPages/2],[numPages/2+1,numPages]]
  }   
  let encountered_error = false;
  let totalPagesToScrape = 0
  try { 
    //Remove old logs (if they exist)
    if(enableLogging){
      clean_dir('jobsdb_scrape_logs')
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
      tasks.push(scrapeOperations[i].__call__().catch((err) => {throw err}))
    }
    let scrapeOperationsDone = false
    console.log(`Scraping ${totalPagesToScrape} pages of jobs, warning your computer may run slowly and this will take ~10 minutes.`)
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
  } catch (error) {
    encountered_error = true
    console.error('scrape.ts:', error);
  } finally {
      //Cleanup results
      await mergedOutFile.writeToFile('[\n')
      for (let i = 0; i < numCloudNodes; i++) {
        if(enableLogging){
          const logFileSavePath = `./jobsdb_scrape_logs/p${pageRanges[i][0]}-${pageRanges[i][1]}.log`
          await logFiles[i].renameTempFile(logFileSavePath)
          console.log(`\nLogfile ${i+1} saved to ${logFileSavePath}`)
        }
        await appendFileContent(outFiles[i].getFilePath(),mergedOutFile.getFilePath())
        cloudNodeProcesses[i].kill('SIGKILL')
      }
      await mergedOutFile.popLine()
      await mergedOutFile.writeToFile('}\n]')
      if(!encountered_error){
        await mergedOutFile.renameTempFile('jobsdb_scrape_results.txt')
        console.log(`\nResults saved to jobsdb_scrape_results.txt in json format.`)
      }
      console.log(`Scrape finished in ${Math.floor(Date.now()/1000 - start_time)} seconds`)
  }
})();
