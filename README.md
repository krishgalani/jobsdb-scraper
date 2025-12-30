
# JobsDB Scraper 

<img src="https://raw.githubusercontent.com/krishgalani/jobsdb-scraper/main/assets/jobsdb.png" width="300" alt="JobsDB Logo"><br>

![Static Badge](https://img.shields.io/badge/npm-package?logo=npm&logoSize=auto&color=red&link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2Fjobsdb-scraper)


About this scraper:

- You can use this scraper to download publicly advertised job information on any job results page (e.g. Salaries, job requirements, etc).

A few cool highlights:

- **Lightweight,and made to run on commodity computers** - Low memory/cpu utilization due to efficient use of modern web-scraping framework (https://github.com/ulixee).
- **Mindful of Traffic** - Compliant with website rate limits and mindful bot behavior.
- **Avoids detection along the entire stack** - High guarantees on ability to safely scrape jobs and sidestep anti-bot measures.
- **Customize which pages and how many you want to scrape** - You can specify any valid JobsDB search results url and the number of pages you want to scrape up to a maximum of all.

## Installation & Usage Instructions

### Requirements:

- **18** >= **Node.js** version <= **22**   If not installed, [go here](https://nodejs.org/en/download/) to download it.  You can check with node --version, and switch versions with `nvm use <node_version>`, or `nvm alias default <node_version>` to set your default node version. **Warning, if you use the wrong node version you may get an error when trying to run.**

- While not strictly required, a residential IP address is highly recommended. Run this from your home for safest guarantees to avoid bot detection. If you must run from outside of home, I recommend using a residential IP proxy.

### Option 1: Install globally (Reccomended for most users)

```shell script

# 1. In your CLI install the package globally with, this may take a few minutes.
npm install -g jobsdb-scraper

# To find the max available pages to scrape for a given JobsDB search results url:
jobsdb-scraper maxPages <searchResultsUrl>

#For instructions on how to run the scraper (can take up to ~10m):
jobsdb-scraper scrape -h 
```
### Usage Examples
```shell script
# Scrape 50 pages of jobs in Hong Kong and return results in ndjson format
jobsdb-scraper hk.jobsdb.com/jobs -n 50 -f ndjson

# Scrape all Software Engineering jobs in Hong Kong and return results in csv format, save to a folder called results from the current working directory.
jobsdb-scraper hk.jobsdb.com/Software-Engineer-jobs -f csv -n 'all' -s './results'

# Scrape all accounting jobs in Thailand and return results in ndjson format, set the output file name to "accounting_jobs"
jobsdb-scraper th.jobsdb.com/jobs-in-accounting -f ndjson -n 'all' --fn accounting_jobs
```
### Option 2: Install package as a dependency 

1. Open CLI In your project root:
```shell script
# This may take a few minutes.
npm install --save jobsdb-scraper
```

2. Import and use!
```js
// Warning: These operations are **NOT** thread-safe.
import {scrapeJobsdb, findMaxPages} from 'jobsdb-scraper';
import { ScrapeOptions } from 'jobsdb-scraper/dist/src/types.js';
import type { ScrapeStats } from 'jobsdb-scraper/dist/src/types.js';
(async () => {
    const scrapeops = new ScrapeOptions(
        //searchResultUrlString (required): The URL of the first page of search results to start scraping from.
        searchResultsUrlString: 'hk.jobsdb.com/jobs',
        //numPages (optional): The number of pages to scrape, 'all' by default
        numPages: 1,
        //saveDir (optional): The directory relative to the current working directory where you want to save results. 
        saveDir: './jobsdb-scrape-results',
        //format (optional): The format in which you want to save the results. Ndjson or csv. Ndjson by default.
        format: 'ndjson',
        //The name of the result file  (required)
        resultFileName: 'my_scrape_results',
    )
    try {
        //Will throw if invalid search results URL provided
        const maxPagesHk = await findMaxPages('hk.jobsdb.com/jobs')
        console.log(`Max Pages in HK JobsDB: ${maxPagesHk}`)
        //Will throw if any invalid scrape options
        const scrape_result = await scrapeJobsdb(scrapeops) 
        if(scrape_result !== undefined){
            const { resultPath, scrape_stats } = scrape_result
            const { totalJobsScraped, totalPagesScraped }: ScrapeStats = scrape_stats
            console.log(`Total Jobs Scraped: ${totalJobsScraped}`)
            console.log(`Total Pages Scraped: ${totalPagesScraped}`)
            console.log(`Results saved to: ${resultPath}`);
        } 
    } catch (error: any){
        //handle the error here
    }
})();
```
3. Alternatively you can run the locally installed package with `npx jobsdb-scraper -h`

The name format of the result file is `jobsdb-<region>-<num_pages>-<YY-MM-DD HH:MM:SS>.<format>` and saved to `<path_to_current_working_directory>/jobsdb_scrape_results` by default. UTC time is used for the date. Jobs are not ordered. 

## Have additional requirements? 

You can contact me at krishdgala@gmail.com with your requirements for a quote. Further data scraping & analysis can be performed to suite your needs.

## Questions or Bugs? 
Please raise an issue on Github.

## How it works

The server part of the program is represented by a maximum of two @ulixee/cloud locally hosted server nodes as the engines behind page navigation and fetches, both hosting a browser with many browsing environments. The decision to use two cloud nodes at most was made after testing for the most amount of parralel nodes that can be run before run-time is impacted (tests run on an M1 Macbook Air).

The client program uses the ulixee framework (github.com/ulixee), where each worker (a @ulixee/hero instance) is connected to a respective @ulixee/cloud server node and has a browser environment. It pops a page to scrape from the shared queue of requested pages,  makes GETS and POST fetches to the jobsdb HTTP/GraphQL web server for the relevant data. For each page, first the jobIds are parsed from the returned HTML response. Then for each jobId a fetch to the backend GraphQL DB is initiated for job details. The results are received in real time and written to a file locally. 

## License

[PROPRIETARY](PROPRIETARY)