import { mergeFiles ,appendFileContent} from '../src/file_io_utils';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import * as fs from 'fs';
import * as path from 'path';
import { TempFile } from '../src/tempfile'; // Adjust the path if needed
import {fileSync} from "tmp"


describe('TempFile - copyFile', () => {
    let tempFile: TempFile;
    const destFilePath = path.join(__dirname, 'copy.txt');
  
    beforeEach(() => {
      // Create the TempFile instance
      tempFile = new TempFile(fileSync());
    });
    afterEach(() => {
      if (fs.existsSync(destFilePath)) {
        fs.unlinkSync(destFilePath);
      }
    });
    it('should copy the temporary file to a new destination path', async () => {
      // Write some content to the temp file
      await tempFile.writeToFile('Hello, TempFile!');
  
      // Ensure destination file does not exist before copying
      expect(fs.existsSync(destFilePath)).toBe(false);
  
      // Use the copyFile method
      await tempFile.copyFile(destFilePath);
  
      // Check if the file was successfully copied
      expect(fs.existsSync(destFilePath)).toBe(true);
      const copiedContent = fs.readFileSync(destFilePath, 'utf-8');
      expect(copiedContent).toBe('Hello, TempFile!');
    });
  });
  
describe('appendFileContent', () => {
  const inputFile = 'testInputFile.txt';
  const outputFile = 'testOutputFile.txt';

  beforeEach(() => {
    // Create the input file with initial content
    writeFileSync(inputFile, 'Content of Input File\n');

    // Initialize the output file with some content
    writeFileSync(outputFile, 'Initial Output Content\n');
  });

  afterEach(() => {
    // Clean up files after each test
    unlinkSync(inputFile);
    unlinkSync(outputFile);
  });

  it('should append content from input file to output file asynchronously', async () => {
    await appendFileContent(inputFile, outputFile);

    const outputContent = readFileSync(outputFile, 'utf-8');
    const expectedContent = 'Initial Output Content\nContent of Input File\n';

    expect(outputContent).toBe(expectedContent);
  });
});

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
