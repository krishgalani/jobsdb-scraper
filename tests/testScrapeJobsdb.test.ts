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
  const filePattern = /^jobsdb.*\.json$/; // Pattern to match jobsdb*.json

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
  test('should successfully execute the script and check for result file', () => {
    const scriptPath = 'src/scrape_jobsdb.ts';

    // Find and delete existing matching file if it exists
    const existingFile = findFileWithPattern(directoryPath, filePattern);
    if (existingFile) {
      fs.unlinkSync(existingFile);
    }

    // Run the script synchronously with argument "10"
    runScriptSync(scriptPath, ['1', 'tests']);

    // Check if the result file exists by finding a matching file
    const resultFile = findFileWithPattern(directoryPath, filePattern);
    expect(resultFile).not.toBeNull(); // Expect that a matching file was found
  });

  // Remove the file after all tests have completed
  afterAll(() => {
    const resultFile = findFileWithPattern(directoryPath, filePattern);
    if (resultFile && fs.existsSync(resultFile)) {
      fs.unlinkSync(resultFile);
    }
  });
});
