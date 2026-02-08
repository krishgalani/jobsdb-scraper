
<div align="center">

**⚠️ DEPRECATED ⚠️**  
Due to critical limitations and bugs with the underlying web scraping framework (Ulixee),  
**this scraper is no longer being maintained.**  

Thank you for your support!

</div>

# JobsDB Scraper 

<img src="https://raw.githubusercontent.com/krishgalani/jobsdb-scraper/main/assets/jobsdb.png" width="300" alt="JobsDB Logo"><br>

[![NPM Version](https://img.shields.io/npm/v/jobsdb-scraper?logo=npm&logoSize=auto&color=red)](https://www.npmjs.com/package/jobsdb-scraper?activeTab=readme)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/krishgalani)](https://www.github.com/sponsors/krishgalani)


About this scraper:

- You can use this scraper to download publicly advertised job information on any job results page (e.g. Salaries, job requirements, etc).

A few cool highlights:

- **Made to run on commodity computers** - Low memory/cpu utilization due to efficient use of modern web-scraping framework (https://github.com/ulixee).
- **Mindful of Traffic** - Compliant with website rate limits and mindful bot behavior.
- **Avoids detection along the entire stack** - High guarantees on ability to safely scrape jobs and sidestep anti-bot measures.
- **Customize which pages and how many you want to scrape** - You can specify any valid JobsDB search results url and the number of pages you want to scrape up to a maximum of all.

## Installation & Usage Instructions

### Requirements:

- **Node.js** version **20** or **22** and **npm >=8.0.0** If not installed, [go here](https://nodejs.org/en/download/) to download it (npm should come bundled with it). You can check by doing `node -v`, `npm -v` to ensure you have installed the correct versions. To switch versions use `nvm use <node_version>`, or `nvm alias default <node_version>` if you want to set default node version. **Warning, if you use the wrong node version you may get an error when trying to install.**

- While not strictly required, a residential IP address is highly recommended. Run this from your home for safest guarantees to avoid bot detection. If you must run from outside of home/work, I recommend using a residential IP proxy.


### Option 1: Install globally (Recommended for most users)

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

# Warning. These operations are **not** thread-safe.

# Scrape 50 pages of jobs in Hong Kong and return results in ndjson and csv format
jobsdb-scraper hk.jobsdb.com/jobs -n 50 -f ndjson csv

# Scrape all Software Engineering jobs and return results in csv format, save to a folder called results from the current working directory.
jobsdb-scraper hk.jobsdb.com/Software-Engineer-jobs -f csv -n 'all' -s './results'

# Scrape all accounting jobs in Thailand and return results in ndjson format, set the output file name to "accounting_jobs"
jobsdb-scraper th.jobsdb.com/jobs-in-accounting -f ndjson -n 'all' --fn accounting_jobs
```

If you are spawning the scraper process from within a script (e.g. system call), and you want to kill the scraper. You can simply send the process a 'SIGINT', and wait for the 'exit' event to allow it to shutdown gracefully.

### Option 2: Install package as a dependency 

1. Open CLI In your project root:
```shell script
# This may take a few minutes.
npm install --save jobsdb-scraper
```

2. Import and use!
```js
// Warning: These operations are **NOT** thread-safe.
import {scrapeJobsdb, findMaxPages} from 'jobsdb-scraper/dist/scrape_jobsdb.js';
import { ScrapeOptions } from 'jobsdb-scraper/dist/types.js';
import type { ScrapeStats } from 'jobsdb-scraper/dist/types.js';
(async () => {
    const scrapeops = new ScrapeOptions(
        //searchResultUrlString (required): The URL of the first page of search results to start scraping from.
        'hk.jobsdb.com/jobs',
        //numPages (optional): The number of pages to scrape, 'all' by default
        1,
        //saveDir (optional): The directory relative to the current working directory where you want to save results. 
        './jobsdb-scrape-results',
        //Export formats : The format(s) in which you want to save the results. Ndjson or csv or both. e.g. ['ndjson', 'csv']. 
        'ndjson',
        //The name of the result file  (optional,    jobsdb-<region>-<num_pages>-<yyyy-MM-dd_HH-mm-ss>.<format> by default)
        'my_scrape_results',
    )
    try {
        //Promise will reject if invalid search results URL provided
        const {maxPagesPromise, abortController : AbortController} = findMaxPages('hk.jobsdb.com/jobs')
        
        console.log(`Max Pages in HK JobsDB: ${await maxPagesPromise}`)
        /*If aborting do this instead 
        abortController.abort()
        const pages = await maxPagesPromise (will resolve -1)
        */

        //Promise will reject with message if any invalid scrape options
        const {scrapeResultPromise, abortController : AbortController} = scrapeJobsdb(scrapeops) 
        const scrape_result = await scrapeResultPromise
        /* Do instead of above line if you want to abort
        abortController.abort()
        const scrape_result = await maxPagesPromise (may be undefined or return results depending on when you abort)
        */
        if(scrape_result){
            //May be more than one result path if more than one export format is specified.
            const { resultPaths, scrape_stats } = scrape_result
            const { totalJobsScraped, totalPagesScraped }: ScrapeStats = scrape_stats
            console.log(`Total Jobs Scraped: ${totalJobsScraped}`)
            console.log(`Total Pages Scraped: ${totalPagesScraped}`)
            console.log(`Results saved to: ${resultPaths}`);
        } 
    } catch (error: any){
        //handle any scraping error here
    }
})();
```

The name format of the result file is `jobsdb-<region>-<num_pages>-<yyyy-MM-dd_HH-mm-ss>.<format>` by default and saved to `<current_working_directory>/jobsdb_scrape_results` by default. The results folder will be created if found not to exist. UTC time is used for the date. Jobs are not ordered. 

## Have additional requirements? 

You can contact me at krishdgala@gmail.com with your requirements for a quote. Further data scraping & analysis can be performed to suite your needs.

## Questions or Bugs? 
Please raise an issue on Github.

## Support the project <3

Your donation will help keep this project **free**!

Please consider donating/sponsoring me if you can afford it, or if you are an organization! 

[![Static Badge](https://img.shields.io/badge/Donate-8A2BE2)](https://www.github.com/sponsors/krishgalani)

## License

[PROPRIETARY](LICENSE)