import { createReadStream, createWriteStream , existsSync} from 'fs';
import * as fs from 'fs';
import path, { delimiter } from 'path';
import { pipeline } from 'stream/promises';
import async from 'async'
import {Transform} from '@json2csv/node'
import { DateTime } from 'luxon';
import {flatten} from '@json2csv/transforms'
// converts an ISO 8601 date string to a DATETIME date string in sql
function toSQLDateTime(isoDateStr : string) {
  if (!isoDateStr) return undefined;
  const dateTime = DateTime.fromISO(isoDateStr);
  if (!dateTime.isValid) return undefined;
  return dateTime.toFormat('yyyy-MM-dd HH:mm:ss');
}
//Stream related
async function closeStream(stream : fs.WriteStream) {
  return new Promise(resolve => {
    stream.once('finish', resolve as () => void);
    stream.end();
  });
}

function getWriteStream(filePath : string) {
  // Connect to output file

  const writeStream = fs.createWriteStream(filePath, {
      flags: 'a', //append
      flush: true, // ensures that data in the stream’s internal buffer is sent to the destination without delay.
      highWaterMark: 64 * 1024 * 1024 // 64 MB buffer
  });
  return writeStream // Return so caller can write data later
}

async function drainQueue(queue: async.QueueObject<Object>): Promise<void> {
  return new Promise<void>((resolve) => {
    if (queue.length() === 0 && queue.running() === 0) {
      resolve();
    } else {
      queue.drain(resolve);
    }
  });
}
//the queue that wraps the output stream to allow streaming of async writes
function getWriteQueue(writeStream:fs.WriteStream) : async.QueueObject<Object>{
  return async.queue((obj, callback) => {
    try {
      // Process the object
      const toWrite = JSON.stringify(obj) + '\n';
      // Attempt to write
      if (!writeStream.write(toWrite)) {
        // Buffer full, wait for drain and retry
        writeStream.once('drain', () => {
          if (writeStream.write(toWrite)) {
            callback(); // Success after drain
          } else {
            callback(new Error('Write failed after drain')); // Unexpected failure
          }
        });
      } else {
        // Write succeeded immediately
        callback()
      }
    } catch (error) {
      callback(error as Error); // Pass error to queue
    }
  },1); 
} 
//csv related

//converts an ndjson file already written to a csv one, preserving the original
async function convertNdjsonToCsv(ndjsonFilePath : string, topLevelFields : Set<string>){
  const csvFilePath = ndjsonFilePath.replace(".ndjson",".csv")
  const input = fs.createReadStream(ndjsonFilePath, {encoding: 'utf-8'});
  const output = fs.createWriteStream(csvFilePath, {encoding: 'utf-8'});
  const opts:any = {ndjson : true, defaultValue : null, transforms : [flatten({ objects: true, arrays: true, separator: '_'}),normalizeDateTimeFieldsInFlattenedObj],fields : [...topLevelFields]};
  const transformOpts = {};
  const asyncOpts = {};
  const parser = new Transform(opts, asyncOpts, transformOpts);
  //runs the workload
  await pipeline(input,parser,output)
}

function normalizeDateTimeFieldsInFlattenedObj(obj: any): void {
  for (const key in obj) {
    const val = obj[key];
    if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        obj[key] = toSQLDateTime(val);
      } catch (error) {
        console.warn(`Failed to parse date for key "${key}": ${val}, error: ${error}`);
        obj[key] = null; // Set to null on invalid date
      }
    }
  }
  return obj
}

function clean_dir(dirname:string){
    // Define the path to the directory
    const d = path.join(__dirname, dirname);
    if (fs.existsSync(d)) {
        try {
            // Remove the directory and all of its contents
            fs.rmSync(d, { recursive: true, force: true });
            // console.log('Logs directory removed successfully.');
        } catch (err) {
            console.error('Error while removing logs directory:', err);
        }
    }
}
function createDir(folderPath : string){
  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
}
export {getWriteStream,getWriteQueue,drainQueue,closeStream, clean_dir, createDir,convertNdjsonToCsv}