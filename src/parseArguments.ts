import { InvalidArgumentError } from 'commander';
import * as fs from 'fs';
import { findLastPage, get_base_url } from './scrape_utils';
import Hero from '@ulixee/hero'
export function parseRegion(region : string){
  const regions = new Set(['hk','th'])
  if(!regions.has(region)){
    throw new InvalidArgumentError('Region must be hk (hong kong) or th (thailand)')  
  }
  return region
}
export function parseSaveDir(dirPath : string){
  // Ensure the directory exists
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new InvalidArgumentError("The directory specified to save results file to is invalid, try specifying the absolute path")
  } else {
    try {
      fs.accessSync(dirPath, fs.constants.W_OK)
    } catch(err){
      throw new InvalidArgumentError('Directory path to results folder does not have write permissions')
    }
  }
  return dirPath
}
export function parseFormat(fmt : string){
  const formats = ['ndjson','csv']
  if(!formats.includes(fmt)){
    throw new InvalidArgumentError(`File format must be one of the following: ${formats}`)  
  }
  return fmt
}
export async function parseNumPages(numPages : string, region : string, heroes? : Hero[]) {
  console.log(`Finding pages available to scrape on ${get_base_url(region)}...`)
  const maxPages = await findLastPage(region)
  if(maxPages == -1){
    throw new Error("\nCouldn't find the pages available to scrape, please file an issue on github")
  }
  if(numPages == "all"){
    return [maxPages,maxPages]
  }
  const parsedValue = parseInt(numPages);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('Not a number.');
  } else if (parsedValue < 1){
    throw new InvalidArgumentError('numPages>=1')
  } else {
    if(maxPages < parsedValue){
      throw new InvalidArgumentError(`numPages <= ${maxPages}`)
    }
    return [parsedValue,maxPages];
  }
}