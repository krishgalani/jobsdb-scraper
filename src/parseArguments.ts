import { InvalidArgumentError } from 'commander';
import * as fs from 'fs';
import { findLastPage } from './scrape_utils';
import HeroCore from '@ulixee/hero-core';
import { TransportBridge } from '@ulixee/net';
import { ConnectionToHeroCore } from '@ulixee/hero';
import NoSandboxPlugin from './NoSandboxPlugin';
import { isZeroResults } from './scrape_utils';
import Hero from '@ulixee/hero';
export async function parseSearchUrl(url: string) {
  const SUPPORTED_HOSTNAMES = ['hk.jobsdb.com', 'th.jobsdb.com'];
  // Early validation for empty or non-string input
  if (!url || typeof url !== 'string') {
    throw new InvalidArgumentError('URL must be a non-empty string');
  }

  let hero: Hero | null = null;
  let heroCore: HeroCore | null = null;
  let parsedUrl : URL;
  try {
    // Parse the URL
    if (url.startsWith('https://') === false){
      url = 'https://' + url;
    }
    parsedUrl = new URL(url);
    // Validate hostname
    if (
      !SUPPORTED_HOSTNAMES.includes(parsedUrl.hostname) 
    ) {
      throw new Error()
    }

    // Initialize components
    const bridge = new TransportBridge();
    heroCore = new HeroCore();
    heroCore.addConnection(bridge.transportToClient);
    heroCore.use(NoSandboxPlugin)
    hero = new Hero({
      sessionPersistence: false,
      blockedResourceTypes: ['All'],
      connectionToCore: new ConnectionToHeroCore(bridge.transportToCore),
    });

    // Check for zero results
    const hasZeroResults = await isZeroResults(hero, parsedUrl.href);
    if (hasZeroResults) {
      throw new Error();
    }
  } catch (err) {
    throw new InvalidArgumentError(`Invalid search url, urls must start with https://${SUPPORTED_HOSTNAMES[0]} or https://${SUPPORTED_HOSTNAMES[1]} and point to a valid search results page`)
  } finally {
    // Cleanup resources
    if (hero) {
      await hero.close(); // Assuming Hero has a close method
    }
    if (heroCore) {
      await heroCore.close(); // Assuming HeroCore has a close method
    }
  }
  return parsedUrl
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
export async function parseNumPages(numPages : string, searchResultsUrl : URL, heroes? : Hero[]) {
  console.log(`Finding pages available to scrape on ${searchResultsUrl}...`)
  const maxPages = await findLastPage(searchResultsUrl)
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