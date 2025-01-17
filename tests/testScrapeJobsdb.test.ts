import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to find a file that matches the wildcard pattern
function findFileWithPattern(directory: string, pattern: RegExp): string | null {
  const files = fs.readdirSync(directory);
  const matchedFile = files.find(file => pattern.test(file));
  return matchedFile ? path.join(directory, matchedFile) : null;
}

describe('scrape_jobsdb.ts test', () => {
  const directoryPath = __dirname;
  const filePatternHK = /^jobsdb-hk.*\.json$/; // Pattern to match jobsdb*.json
  const filePatternTH = /^jobsdb-th.*\.json$/; // Pattern to match jobsdb*.json

  // Helper function to run the Node.js script synchronously
  function runScriptSync(scriptPath: string, args: string[]): void {
    const command = `ts-node ${scriptPath} ${args.join(' ')}`;
    try {
      // Run the command synchronously
      execSync(command); // Inherit stdio to show output in the console
    } catch (error) {
      console.error('Script error:', error);
      throw error; // Ensure the test fails if there's an error
    }
  }

  // Increase timeout for long-running test
  test('should successfully execute the script for region=hk and check for result file', () => {
    const scriptPath = 'src/scrape_jobsdb.ts';

    // Run the script synchronously 
    runScriptSync(scriptPath, ['-n 1', '-s tests','-r hk','--enableTestMode']);

    // Check if the result file exists by finding a matching file
    const resultFile = findFileWithPattern(directoryPath, filePatternHK);
    expect(resultFile).not.toBeNull(); // Expect that a matching file was found
  });
  test('should successfully execute the script for region=th and check for result file', () => {
    const scriptPath = 'src/scrape_jobsdb.ts';

    // Run the script synchronously with argument "10"
    runScriptSync(scriptPath, ['-n 1', '-s tests','-r th', '--enableTestMode']);

    // Check if the result file exists by finding a matching file
    const resultFile = findFileWithPattern(directoryPath, filePatternTH);
    expect(resultFile).not.toBeNull(); // Expect that a matching file was found
  });
  beforeAll(() => {
    const existingFileHK = findFileWithPattern(directoryPath, filePatternHK);
      if (existingFileHK) {
        fs.unlinkSync(existingFileHK);
      }
    const existingFileTH = findFileWithPattern(directoryPath, filePatternTH);
    if (existingFileTH) {
      fs.unlinkSync(existingFileTH);
    }
  })
  // Remove the file after all tests have completed
  afterAll(() => {
    const resultFileHK = findFileWithPattern(directoryPath, filePatternHK);
    if (resultFileHK && fs.existsSync(resultFileHK)) {
      fs.unlinkSync(resultFileHK);
    }
    const resultFileTH = findFileWithPattern(directoryPath, filePatternTH);
    if (resultFileTH && fs.existsSync(resultFileTH)) {
      fs.unlinkSync(resultFileTH);
    }
  });
});
