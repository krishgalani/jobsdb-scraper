import { mergeFiles } from '../src/utils';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';

describe('mergeFiles', () => {
  const inputFile1 = 'testFile1.txt';
  const inputFile2 = 'testFile2.txt';
  const outputFile = 'testMergedOutput.txt';

  beforeEach(() => {
    // Set up test input files with content
    writeFileSync(inputFile1, 'Content of File 1\n');
    writeFileSync(inputFile2, 'Content of File 2\n');
  });

  afterEach(() => {
    // Clean up test files
    unlinkSync(inputFile1);
    unlinkSync(inputFile2);
    unlinkSync(outputFile);
  });

  it('should merge two files asynchronously', async () => {
    await mergeFiles(inputFile1, inputFile2, outputFile);
    
    const mergedContent = readFileSync(outputFile, 'utf-8');
    const expectedContent = 'Content of File 1\nContent of File 2\n';

    expect(mergedContent).toBe(expectedContent);
  });
});
