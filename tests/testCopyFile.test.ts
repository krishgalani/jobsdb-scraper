import * as fs from 'fs';
import * as path from 'path';
import { TempFile } from '../tempfile'; // Adjust the path if needed
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
