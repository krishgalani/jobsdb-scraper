import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('scrape_jobsdb.js test', () => {
  const expectedFilePath = path.join(__dirname, '../jobsdb_scrape_results.txt');

  // Helper function to run the Node.js script synchronously
  function runScriptSync(scriptPath: string, args: string[]): void {
    const command = `node ${scriptPath} ${args.join(' ')}`;
    try {
      // Run the command synchronously
      const output = execSync(command); // Inherit stdio to show output in the console
    } catch (error) {
      console.error('Script error:', error);
      throw error; // Ensure the test fails if there's an error
    }
  }

  // Increase timeout for long-running test
  test('should successfully execute the script and check for result file', () => {
    const scriptPath = path.join(__dirname, '../build/scrape_jobsdb.js');

    if (fs.existsSync(expectedFilePath)) {
        fs.unlinkSync(expectedFilePath);  // Remove the existing file
    }
    // Run the script synchronously with argument "10"
    runScriptSync(scriptPath, ['10']);

    // Check if the result file exists
    const fileExists = fs.existsSync(expectedFilePath);
    expect(fileExists).toBe(true);
  }, 10 * 60 * 1000); // 10-minute timeout
});
