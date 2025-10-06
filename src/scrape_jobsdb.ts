import {ScrapeOperation, PageArgs, JobArgs} from './scrape_operation';
import {spawn} from 'child_process';
import * as path from 'path';
import Queue from 'queue-fifo';
import {createLogger} from './logger';
import type {Logger} from 'pino';
import {waitForPort} from './server';
import { clean_dir,getWriteStream, getWriteQueue, closeStream, drainQueue, createDir, convertNdjsonToCsv} from './file_io_utils';
import {parseNumPages, parseRegion, parseFormat, parseSaveDir} from './parseArguments';
import { printProgressBar } from './utils';
import { sleep } from './utils';
import {InvalidArgumentError, program, Option} from 'commander';
import { findLastPage, get_base_url } from './scrape_utils';
import type { QueueObject } from 'async';
import { createWriteStream } from 'fs';
import { WriteStream,unlinkSync } from 'fs';


//Globals
const enableLogging = process.env.LOG_ENABLED === "true";
if(!enableLogging){
  //ignore deprecation warning 
  process.removeAllListeners('warning');
} else {
  clean_dir('jobsdb_scrape_logs')
}
let logger = createLogger('client',enableLogging)
let outStream : WriteStream;
let outQueue : async.QueueObject<Object>;
const cloudNodeProcesses: any[] = [];
let numCloudNodes : number = 0; 
let pageQueue = new Queue<number>();

let scrapeOperations : ScrapeOperation[] = [];
let tasks : any = [];
let ports : number[] = [];
const start_time = Date.now()/1000;

async function main(options : any){
  let encountered_error = false;
  const resultsDir = options.saveDir;
  const maxPages = options.maxPages
  const region = options.region
  const numPages = options.numPages
  const now = new Date();
  const baseUrl = get_base_url(region)
  const formattedDateNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}_${String(now.getMinutes()).padStart(2, '0')}_${String(now.getSeconds()).padStart(2, '0')}.${String(now.getMilliseconds()).padStart(3, '0')}`;
  const resultFileName = `jobsdb-${region}-${numPages}-${formattedDateNow}.ndjson`
  const resultPath = path.join(resultsDir,resultFileName)

  for (let i = 1; i <= numPages; i++) {
    pageQueue.enqueue(i);
  }
  createDir(options.saveDir)
  outStream = getWriteStream(resultPath)
  outQueue = getWriteQueue(outStream)
  outStream.on('error', (err) => {
    logger.error(`WriteStream error: ${err.message}`);
    throw new Error(`WriteStream error: ${err.message}`)
  });
  if (numPages > 10){
    numCloudNodes = 2
  } else {
    numCloudNodes = 1
  }
  try { 
    //Start cloudnodes
    for (let i = 0; i < numCloudNodes; i++) {
      const serverProcess = spawn('node',
        ['build/src/cloudnode',String(i),String(enableLogging)],
        {shell : false}
      );
      logger.info(`Starting cloudnode ${i}...`);
      cloudNodeProcesses.push(serverProcess);
    }
    //Receive portnums
    for (let i = 0; i < numCloudNodes; i++) {
      ports.push(await waitForPort(cloudNodeProcesses[i]))
      logger.info(`Cloudnode ${i} started on port ${ports[i]}`);
    }
    //Start scraping
    for (let i = 0; i < numCloudNodes; i++) {
      scrapeOperations.push(new ScrapeOperation(i,baseUrl,ports[i],outQueue,region,logger.child({module: `scrapeOp${i+1}`}),pageQueue))
      tasks.push(scrapeOperations[i].__call__())
      logger.info(`Scrape operation ${i+1} initialized`);
    }
    let scrapeOperationsDone = false
    console.log(`Scraping ${numPages}/${maxPages} available pages of jobs on ${get_base_url(region)}.`)
    logger.info(`Scraping ${numPages}/${maxPages} available pages of jobs on ${get_base_url(region)}.`);
    Promise.all(tasks)
    .finally(() => {
      scrapeOperationsDone = true;
      if(!pageQueue.isEmpty()){
          console.error(`\nCouldn't complete scraping operation at this time, try again in ~1min, if still persists, please file an issue on github`)
      }
    });
    while(!scrapeOperationsDone){
      printProgressBar(numPages - pageQueue.size(),numPages)
      await sleep(1000)
    } 
    console.log()
    logger.info('All scrape operations completed.');
    await drainQueue(outQueue)
    logger.info("Object queue drained.")
    await closeStream(outStream)
    logger.info("Outstream closed.")
    if(options.format === 'csv'){
      await convertNdjsonToCsv(resultPath)
      unlinkSync(resultPath)
    }
  } catch (error : any) {
    encountered_error = true
    if(error.code === 'EACCES'){
      console.error("The specified result directory does not have write permissions.")
      logger.error("The specified result directory does not have write permissions.");
    } else {
      console.error('scrape_jobsdb.ts in main:', error);
      logger.error(`Error during scraping: ${error.message}`);
    }
    
  } finally {
      for (let i = 0; i < numCloudNodes; i++) {
        if(cloudNodeProcesses.length>0){
          logger.info(`Shutting down CloudNode ${i} on port ${ports[i]}...`);
          if(cloudNodeProcesses[i].kill() === false){
            console.log('Error during CloudNode shutdown');
            logger.error(`Error during CloudNode ${i} shutdown`);
          }
        }
      }
      if(!encountered_error){
        console.log(`Scrape finished in ${Math.floor(Date.now()/1000 - start_time)} seconds`)
        logger.info(`Result file saved to ${resultPath} in ndjson format.`);
        logger.info(`Scrape finished in ${Math.floor(Date.now()/1000 - start_time)} seconds`);
      }
  }
}
program
  .command('scrape', { isDefault: true })
  .description('Scrape job listings')
  .addOption(
    new Option('-r, --region <two_letters>','which jobsdb region')
      .choices(['hk','th'])
      .makeOptionMandatory()
      .argParser(parseRegion)
  )
  .addOption(
    new Option('-n, --numPages <number>', 'Number of pages to scrape')
      .default('all')
  )
  .addOption(
    new Option('-f, --format <file_format>', 'File format to use, csv files fields are completely flattened (including arrays), and date/time fields are normalized to SQL DateTime.')
      .default('ndjson')
      .choices(['ndjson', 'csv'])
      .argParser(parseFormat)
  )
  .addOption(
    new Option('-s, --saveDir <pathToDir>', 'Relative path directory from where the program is run to store results file (optional)')
      .default('./jobsdb_scrape_results')
      .argParser(parseSaveDir)
  )
  .action(async (cmdObj) => {
    const [numPages, maxPages] = await parseNumPages(cmdObj.numPages, cmdObj.region);
    cmdObj.numPages = numPages;
    cmdObj.maxPages = maxPages;
    await main(cmdObj);
  });
//program start
(async () => {
  await program.parseAsync(process.argv);
})();
