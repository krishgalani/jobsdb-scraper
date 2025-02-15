import {ScrapeOperation, PageArgs, JobArgs} from './scrape_operation';
import * as path from 'path';
import * as fs from 'fs';
import {waitForPort, startServerProcess} from './server';
import { clean_dir,appendFileContent } from './file_io_utils';
import {parseNumPages, parseRegion, parseFormat, parseSaveDir} from './parseArguments';
import {setGracefulCleanup,fileSync, dirSync, dir} from 'tmp';
import { TempFile } from './tempfile';
import { printProgressBar } from './utils';
import { sleep } from './utils';
import {InvalidArgumentError, program} from 'commander';
import Hero from '@ulixee/hero'
import { findLastPage, get_base_url } from './scrape_utils';

//Globals
setGracefulCleanup()
const cloudNodeProcesses: any[] = [];
let numCloudNodes : number = 0; 
let pageRanges = [[0,0],[0,0]];
let testMode = false
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

async function main(options : any){
  let encountered_error = false;
  const resultsDir = options.saveDir;
  const region = options.region
  const baseUrl = get_base_url(region)
  const numPages = options.numPages
  try { 
    if (numPages > 10){
      numCloudNodes = 2
      pageRanges = [[1,Math.trunc(numPages/2)],[Math.trunc(numPages/2)+1,numPages]]
    } else {
      numCloudNodes = 1
      pageRanges[0] = [1,numPages]
    }
    // Remove old logs (if they exist)
    if(enableLogging){
      clean_dir('../jobsdb_scrape_logs')
    }
    //Start cloudnodes
    for (let i = 0; i < numCloudNodes; i++) {
      const serverProcess = startServerProcess(i.toString(),true);
      cloudNodeProcesses.push(serverProcess);
    }
    //Receive portnums
    for (let i = 0; i < numCloudNodes; i++) {
      ports.push(await waitForPort(cloudNodeProcesses[i]))
    }
    //Start scraping
    for (let i = 0; i < numCloudNodes; i++) {
      if(enableLogging){
        console.log(`Logfile ${i+1} created at ${logFiles[i].getFilePath()}`)
      }
      scrapeOperations.push(new ScrapeOperation(baseUrl,pageRanges[i],ports[i],outFiles[i],region,logFiles[i]))
      tasks.push(scrapeOperations[i].__call__())
    }
    let scrapeOperationsDone = false
    console.log(`Scraping the first ${numPages} pages of jobs.`)
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
      printProgressBar(pagesScraped,numPages)
      await sleep(1000)
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
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
        const resultFileName = `jobsdb-${region}-${numPages}-${formattedDate}.json`
        const resultPath = path.join(resultsDir,resultFileName)
        await mergedOutFile.renameTempFile(resultPath)
        console.log(`\nResult file saved to ${resultPath} in json format.`)
        console.log(`Scrape finished in ${Math.floor(Date.now()/1000 - start_time)} seconds`)
      }
  }
}
program
  .command('maxPages <region>')
  .description('Find the max number of pages you can scrape for a region')
  .action(async (region) => {
    parseRegion(region);
    const lastPage = await findLastPage(region);
    console.log(`You can scrape up to ${lastPage} pages of jobs`);
  });
program
  .command('scrape', { isDefault: true })
  .description('Scrape job listings')
  .requiredOption('-r, --region <two_letters>', 'hk (Hong Kong) or th (Thailand) (required)', parseRegion)
  .option('-n, --numPages <number>', 'Number of pages to scrape','all')
  // .requiredOption('-f, --format <file_format>', 'csv or json', parseFormat)
  .option('-s, --saveDir <pathToDir>', 'Directory to store results file (optional)', parseSaveDir, './jobsdb_scrape_results')
  .option('--enableTestMode', 'Enable test mode')
  .action(async (cmdObj) => {
    try {
      if(cmdObj.enableTestMode){
        testMode = true
      }
      cmdObj.numPages = await parseNumPages(cmdObj.numPages, cmdObj.region);
      await main(cmdObj)
    } catch (error) {
      throw error
    }
  });
(async () => {
  await program.parseAsync(process.argv);
})();
