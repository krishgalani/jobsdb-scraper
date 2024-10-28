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

import Deque from 'double-ended-queue';
import * as fs from 'fs';
import he from 'he'; // You need to install this package
import * as path from 'path';
import { createReadStream, createWriteStream , existsSync} from 'fs';
import {compile} from 'html-to-text'
export const parseHtml = compile({}); // options passed here
export async function arePathsOnDifferentDrives(path1 : string, path2 : string) {
  try {
    const stat1 = await fs.promises.stat(path1);
    const stat2 = await fs.promises.stat(path2);

    // Compare the device IDs (dev property)
    return stat1.dev !== stat2.dev;
  } catch (err) {
    throw err
  }
}
export function printProgressBar(completed : number, total : number, barLength = 40) {
  const progress = Math.min(completed / total, 1); // Ensure progress does not exceed 100%
  const filledLength = Math.round(progress * barLength);
  const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
  const percentage = (progress * 100).toFixed(2);

  // Only use TTY features if stdout supports it (i.e., we're in a terminal environment)
  if (process.stdout.isTTY) {
    process.stdout.clearLine(0); // Clear the current line
    process.stdout.cursorTo(0); // Move the cursor to the start of the line
    process.stdout.write(`Progress: [${bar}] ${percentage}%`);
    if (completed >= total) {
      process.stdout.write('\n'); // Move to the next line when complete
    }
  } else {
    // Fallback behavior for non-TTY environments (like Jest)
    console.log(`Progress: [${bar}] ${percentage}%`);
  }
}
export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export const appendFileContent = (inputFile: string, outputFile: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Ensure the output file exists; create it if it doesn't
    if (!existsSync(outputFile)) {
      createWriteStream(outputFile).close();
    }

    const readStream = createReadStream(inputFile);
    const writeStream = createWriteStream(outputFile, { flags: 'a' }); // 'a' for append mode

    // Pipe the input file directly to the output file
    readStream.pipe(writeStream);

    // Resolve or reject the promise based on completion or error
    readStream.on('error', (err) => reject(`Error reading ${inputFile}: ${err}`));
    writeStream.on('error', (err) => reject(`Error writing ${outputFile}: ${err}`));
    writeStream.on('finish', resolve);
  });
};

export const mergeFiles = (inputFile1: string, inputFile2: string, outputFile: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const readStream1 = createReadStream(inputFile1);
    const readStream2 = createReadStream(inputFile2);
    const writeStream = createWriteStream(outputFile);

    readStream1.pipe(writeStream, { end: false });
    
    readStream1.on('end', () => {
      readStream2.pipe(writeStream);
    });

    readStream1.on('error', (err) => reject(`Error reading ${inputFile1}: ${err}`));
    readStream2.on('error', (err) => reject(`Error reading ${inputFile2}: ${err}`));
    writeStream.on('error', (err) => reject(`Error writing ${outputFile}: ${err}`));

    writeStream.on('finish', resolve);
  });
};
export function reverseString(str: string): string {
  const retArray = [];
  for (let i = str.length - 1; i >= 0; i--) {
    retArray.push(str[i]);
  }
  return retArray.join('');
}
export function getObjectSize(obj: { [key: string]: any }): number {
  return Object.keys(obj).length;
}
export function clean_dir(dirname:string){
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
export function sumNumberVoidArray(arr: (number | void)[]): number {
  return arr
    .filter((value): value is number => value !== undefined) // Filters out `undefined` values
    .reduce((acc, num) => acc + num, 0); // Sums up the remaining numbers
}

export class AsyncBlockingQueue<T> {
  private resolvers: Deque<(value: T) => void>;
  private promises: Deque<Promise<T>>;

  constructor() {
    // invariant: at least one of the queues is empty
    this.resolvers = new Deque();
    this.promises = new Deque();
  }

  private _add(): void {
    this.promises.push(
      new Promise<T>((resolve) => {
        this.resolvers.push(resolve);
      })
    );
  }
  
  enqueue(value: T): void {
    if (!this.resolvers.isEmpty()) {
      const resolver = this.resolvers.shift();
      if (resolver) {
        resolver(value);
      }
    } else {
      this.promises.push(Promise.resolve(value));
    }
  }

  dequeue(): Promise<T> {
    if (this.promises.isEmpty()) {
      this._add();
    }
    return this.promises.shift()!;
  }

  // Utilities
 
  isEmpty(): boolean {
    // there are no values available
    return this.promises.isEmpty();
  }

  isBlocked(): boolean {
    // it's waiting for values
    return !this.resolvers.isEmpty();
  }

  get length(): number {
    return this.promises.length - this.resolvers.length;
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return {
      next: () =>
        this.dequeue().then((value) => ({
          done: false,
          value,
        })),
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  }
}
