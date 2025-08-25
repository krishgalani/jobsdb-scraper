<img src="assets/jobsdb.png" width="300" height="auto"><br>
# JobsDB Scraper

A few cool highlights about this scraper:

- **Lightweight,and made to run on commodity computers** - Low memory/cpu utilization due to efficient use of modern web-scraping framework (https://github.com/ulixee).
- **Avoids detection along the entire stack** - High guarantees on ability to safely scrape jobs and bypass Cloudflare.
- **Customize how many pages you want to scrape** - You can specify how many pages of jobs you want to scrape up to a maximum of all.

## Installation

### Requirements:

- **Node.js** version **18** or higher. If not installed, [go here](https://nodejs.org/en/download/) to download it.
- **git** required. If not installed, [go here](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) to download it.
### Steps:
1. clone the repo
```shell script
git clone https://github.com/krishgalani/jobsdb-scraper.git
```
2. cd into the repo
```shell script
cd jobsdb-scraper
```
3. install dependencies
```shell script
npm install 
```
4. compile typescript
```shell script
npm run build
```

## Usage
### Warning: This operation is **NOT** thread-safe.

To find the maxPages available to scrape for a region (hk or th):
```shell script
node build/src/scrape_jobsdb maxPages <region>
```
To run the scraper (can take up to ~10m):
```shell script
node build/src/scrape_jobsdb [options]
Options:
  -r, --region <two_letters>  hk (Hong Kong) or th (Thailand) (required)
  -n, --numPages <number>     Number of pages to scrape (default: "all")
  -s, --saveDir <pathToDir>   Directory to store results file  (default: "./jobsdb_scrape_results")
```
## Examples
Find maxPages available to scrape for Hong Kong
```shell script
node build/src/scrape_jobsdb maxPages hk
```
Scrape all pages in thailand
```shell script
node build/src/scrape_jobsdb -r th
```
The name format of the result file is jobsdb-\<region>-\<pages>-\<date>.json and saved in a folder called jobsdb_scrape_results by default.

## How it works

The server part of the program is represented by a maximum of two @ulixee/cloud locally hosted server nodes as the engines behind page navigation and fetches, both hosting a browser with many browsing environments. The decision to use two cloud nodes at most was made after testing for the most amount of parralel nodes that can be run before run-time is impacted (tests run on an M1 Macbook Air).

The client program uses the ulixee framework (github.com/ulixee), where each worker (a @ulixee/hero instance) is connected to a respective @ulixee/cloud server node and has a browser environment. It pops a page to scrape from the shared queue of requested pages,  makes GETS and POST fetches to the jobsdb HTTP/GraphQL web server for the relevant data. For each page, first the jobIds are parsed from the returned HTML response. Then for each jobId a fetch to the backend GraphQL DB is initiated for job details. The results are received in real time and written to a JSON file locally.

## License

[MIT](LICENSE)