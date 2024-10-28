import { appendFileContent } from '../src/utils';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';

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
