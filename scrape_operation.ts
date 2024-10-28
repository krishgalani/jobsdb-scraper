/*
 *  -------------------------------------------------
 *  |                                                |
 *  |           Created by Krish Galani              |
 *  |         Copyright © 2024 Krish Galani          |
 *  |               MIT License                      |
 *  |        GitHub: github.com/krishgalani          |
 *  |                                                |
 *  -------------------------------------------------
 */

import { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import Hero from '@ulixee/hero';
import { AsyncBlockingQueue} from './utils';
import { v4 as uuidv4 } from 'uuid';
import Semaphore from 'semaphore-async-await'

export class Cookie {
    user_agent : string;
    cookie : {[key: string]: string};
    constructor(user_agent : string = "", cookie : {[key: string]: string} = {}){
        this.user_agent = user_agent
        this.cookie = cookie
    }
}
export class UserAgent {
    user_agent: string;
    sec_ch_ua: string;
    sec_ch_ua_mobile: string;
    sec_ch_ua_platform: string;
    constructor(
        user_agent: string = "",
        sec_ch_ua: string = "",
        sec_ch_ua_mobile: string = "",
        sec_ch_ua_platform: string = ""
    ) {
        this.user_agent = user_agent;
        this.sec_ch_ua = sec_ch_ua;
        this.sec_ch_ua_mobile = sec_ch_ua_mobile;
        this.sec_ch_ua_platform = sec_ch_ua_platform;
    }
}
export class PageArgs {
    number: number;
    jobIds: string[];
    cookie: Cookie;
    // ua: UserAgent;
    constructor(number: number, cookie: Cookie = new Cookie(), jobIds: string[] = []) {
        this.number = number;
        this.jobIds = jobIds;
        this.cookie = cookie;
        // this.ua = ua;
    }
}
export class JobArgs {
    pageArgs: PageArgs;
    jobid: string;
    constructor(pageArgs: PageArgs, jobid: string) {
        this.pageArgs = pageArgs;
        this.jobid = jobid;
    }
}
export class ScrapeOperation {  
    baseUrl : string
    cookie_jar : AsyncBlockingQueue<Cookie>
    pageQueue : AsyncBlockingQueue<number>
    cloudNodePort : number
    timeout : number
    pagesScraped : number
    pageRange : number[]
    logFile : any 
    outFile : any 
    num_pages : number
    timeoutPromise : any
    timeoutClear : any
    stopMiningCookies : boolean
    constructor(baseUrl: string, pageRange: number[], cloudNodePort : number, outFile : any, logFile : any = null, timeout : number = 3600){
        this.baseUrl = baseUrl
        this.pagesScraped = 0
        this.outFile = outFile
        this.logFile = logFile
        this.timeout = timeout
        this.num_pages = pageRange[1] - pageRange[0] + 1
        const { promise: timeoutPromise, clear: timeoutClear } = this.createTimeoutPromise(timeout, 'Timeout');
        this.timeoutPromise = timeoutPromise;
        this.timeoutClear = timeoutClear;
        this.pageRange = pageRange
        this.cookie_jar = new AsyncBlockingQueue<Cookie>()
        this.pageQueue = new AsyncBlockingQueue<number>()
        this.stopMiningCookies = false
        this.cloudNodePort = cloudNodePort
    }
    /* Helpers */
    createTimeoutPromise(timeout: number, timeoutVal: any) {
        let timeoutId: NodeJS.Timeout;

        const promise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(timeoutVal), timeout*1000);
        });
      
        return {
          promise,
          clear: () => clearTimeout(timeoutId)
        };
    }
    async log(strToLog : any){
        if(this.logFile !== null){
         await this.logFile.writeToFile(strToLog+"\n")   
        }
    }
    assemble_cookie(cookie: Cookie): string {
        return Object.entries(cookie.cookie)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
    }
    get_page_url(page: number): string {
        return `${this.baseUrl}?page=${page}`;
    }
    get_dict(cookies : ICookie[]): { [key: string]: string } {
        const cookieDict : { [key: string]: string } = {}
        for (let i = 0; i < cookies.length; i++) {
          cookieDict[cookies[i].name] = cookies[i].value;
        }
        return cookieDict
    }
    /*Scraping Logic*/
    async startWorker(){
        const hero = new Hero({
            sessionPersistence : false,
            blockedResourceTypes: [
            'All'
            ],
            connectionToCore: {
                host: `localhost:${this.cloudNodePort}`,
            }
        }); 
        const userAgent = (await hero.meta).userAgentString
        const concurrency_lim : number = 8
        const semaphore = new Semaphore(concurrency_lim)
        const scrape_page_job_details = async (pageArgs : PageArgs) : Promise<any> => {
            const scrape_job_details = async (jobId : string) : Promise<any> => {
                let cookie : {[key: string]:string} = pageArgs.cookie.cookie
                //Original graphql query
                // let query = 'query jobDetails($jobId: ID!, $jobDetailsViewedCorrelationId: String!, $sessionId: String!, $zone: Zone!, $locale: Locale!, $languageCode: LanguageCodeIso!, $countryCode: CountryCodeIso2!, $timezone: Timezone!) {\n  jobDetails(\n    id: $jobId\n    tracking: {channel: "WEB", jobDetailsViewedCorrelationId: $jobDetailsViewedCorrelationId, sessionId: $sessionId}\n  ) {\n    job {\n      sourceZone\n      tracking {\n        adProductType\n        classificationInfo {\n          classificationId\n          classification\n          subClassificationId\n          subClassification\n          __typename\n        }\n        hasRoleRequirements\n        isPrivateAdvertiser\n        locationInfo {\n          area\n          location\n          locationIds\n          __typename\n        }\n        workTypeIds\n        postedTime\n        __typename\n      }\n      id\n      title\n      phoneNumber\n      isExpired\n      expiresAt {\n        dateTimeUtc\n        __typename\n      }\n      isLinkOut\n      contactMatches {\n        type\n        value\n        __typename\n      }\n      isVerified\n      abstract\n      content(platform: WEB)\n      status\n      listedAt {\n        label(context: JOB_POSTED, length: SHORT, timezone: $timezone, locale: $locale)\n        dateTimeUtc\n        __typename\n      }\n      salary {\n        currencyLabel(zone: $zone)\n        label\n        __typename\n      }\n      shareLink(platform: WEB, zone: $zone, locale: $locale)\n      workTypes {\n        label(locale: $locale)\n        __typename\n      }\n      advertiser {\n        id\n        name(locale: $locale)\n        isVerified\n        registrationDate {\n          dateTimeUtc\n          __typename\n        }\n        __typename\n      }\n      location {\n        label(locale: $locale, type: LONG)\n        __typename\n      }\n      classifications {\n        label(languageCode: $languageCode)\n        __typename\n      }\n      products {\n        branding {\n          id\n          cover {\n            url\n            __typename\n          }\n          thumbnailCover: cover(isThumbnail: true) {\n            url\n            __typename\n          }\n          logo {\n            url\n            __typename\n          }\n          __typename\n        }\n        bullets\n        questionnaire {\n          questions\n          __typename\n        }\n        video {\n          url\n          position\n          __typename\n        }\n        __typename\n      }\n      __typename\n    }\n    companyProfile(zone: $zone) {\n      id\n      name\n      companyNameSlug\n      shouldDisplayReviews\n      branding {\n        logo\n        __typename\n      }\n      overview {\n        description {\n          paragraphs\n          __typename\n        }\n        industry\n        size {\n          description\n          __typename\n        }\n        website {\n          url\n          __typename\n        }\n        __typename\n      }\n      reviewsSummary {\n        overallRating {\n          numberOfReviews {\n            value\n            __typename\n          }\n          value\n          __typename\n        }\n        __typename\n      }\n      perksAndBenefits {\n        title\n        __typename\n      }\n      __typename\n    }\n    companySearchUrl(zone: $zone, languageCode: $languageCode)\n    learningInsights(platform: WEB, zone: $zone, locale: $locale) {\n      analytics\n      content\n      __typename\n    }\n    companyTags {\n      key(languageCode: $languageCode)\n      value\n      __typename\n    }\n    restrictedApplication(countryCode: $countryCode) {\n      label(locale: $locale)\n      __typename\n    }\n    sourcr {\n      image\n      imageMobile\n      link\n      __typename\n    }\n    gfjInfo {\n      location {\n        countryCode\n        country(locale: $locale)\n        suburb(locale: $locale)\n        region(locale: $locale)\n        state(locale: $locale)\n        postcode\n        __typename\n      }\n      workTypes {\n        label\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n'
                //Modified query to remove useless fields
                let query = 'query jobDetails($jobId: ID!, $jobDetailsViewedCorrelationId: String!, $sessionId: String!, $zone: Zone!, $locale: Locale!, $languageCode: LanguageCodeIso!, $countryCode: CountryCodeIso2!, $timezone: Timezone!) {\n  jobDetails(\n    id: $jobId\n    tracking: {channel: "WEB", jobDetailsViewedCorrelationId: $jobDetailsViewedCorrelationId, sessionId: $sessionId}\n  ) {\n    job {\n      sourceZone\n      id\n      title\n      phoneNumber\n      isExpired\n      expiresAt {\n        dateTimeUtc\n      }\n      isLinkOut\n      contactMatches {\n        type\n        value\n      }\n      isVerified\n      abstract\n      content(platform: WEB)\n      status\n      listedAt {\n        label(context: JOB_POSTED, length: SHORT, timezone: $timezone, locale: $locale)\n        dateTimeUtc\n      }\n      salary {\n        currencyLabel(zone: $zone)\n        label\n      }\n      shareLink(platform: WEB, zone: $zone, locale: $locale)\n      workTypes {\n        label(locale: $locale)\n      }\n      advertiser {\n        id\n        name(locale: $locale)\n        isVerified\n        registrationDate {\n          dateTimeUtc\n        }\n      }\n      location {\n        label(locale: $locale, type: LONG)\n      }\n      classifications {\n        label(languageCode: $languageCode)\n      }\n      products {\n        branding {\n          id\n          cover {\n            url\n          }\n          thumbnailCover: cover(isThumbnail: true) {\n            url\n          }\n          logo {\n            url\n          }\n        }\n        bullets\n        questionnaire {\n          questions\n        }\n        video {\n          url\n          position\n        }\n      }\n    }\n    companyProfile(zone: $zone) {\n      id\n      name\n      companyNameSlug\n      shouldDisplayReviews\n      branding {\n        logo\n      }\n      overview {\n        description {\n          paragraphs\n        }\n        industry\n        size {\n          description\n        }\n        website {\n          url\n        }\n      }\n      reviewsSummary {\n        overallRating {\n          numberOfReviews {\n            value\n          }\n          value\n        }\n      }\n      perksAndBenefits {\n        title\n      }\n    }\n    companySearchUrl(zone: $zone, languageCode: $languageCode)\n    companyTags {\n      key(languageCode: $languageCode)\n      value\n    }\n    restrictedApplication(countryCode: $countryCode) {\n      label(locale: $locale)\n    }\n  }\n}'
                const headers: {[key: string]: string} = {
                    'accept': '*/*',
                    'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
                    'content-type': 'application/json',
                    'origin': 'https://hk.jobsdb.com',
                    'Connection': 'keep-alive',
                    'Cookie' : this.assemble_cookie(pageArgs.cookie),
                    'priority': 'u=1, i',
                    'referer': `https://hk.jobsdb.com/jobs?jobId=${jobId}&type=standard`,
                    // Uncomment if needed:
                    // 'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Google Chrome";v="128"',
                    // 'sec-ch-ua-mobile': '?0',
                    // 'sec-ch-ua-platform': '"macOS"',
                    'sec-fetch-dest': 'empty',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                    'seek-request-brand': 'jobsdb',
                    'seek-request-country': 'HK',
                    'user-agent': userAgent,
                    'x-seek-ec-sessionid': cookie['JobseekerSessionId'] || "",
                    'x-seek-ec-visitorid': cookie['JobseekerVisitorId'] || "",
                    'x-seek-site': 'chalice',
                };
                const jsonData = {
                    'operationName': 'jobDetails',
                    'variables': {
                        'jobId':  jobId,
                        'jobDetailsViewedCorrelationId': uuidv4(),
                        'sessionId': "JobseekerSessionId" in cookie ? cookie["JobseekerSessionId"] : '',
                        'zone': 'asia-1',
                        'locale': 'en-HK',
                        'languageCode': 'en',
                        'countryCode': 'HK',
                        'timezone': 'America/New_York',
                    },
                    'query': query
                }
                try{
                    const response: any = await hero.fetch(
                        'https://hk.jobsdb.com/graphql',
                        {
                            method : 'POST',
                            headers: headers,
                            body : JSON.stringify(jsonData)
                        }
                    );
                    if (await response.status !== 200) {
                        return [jobId, null, `Error Status ${await response.status} on job fetch for p${pageArgs.number}`];
                    }
                    const responseJson : any = await response.json()
                    // await this.log(responseJson)
                    return [jobId, responseJson.data.jobDetails, null];
                } catch (e: any) {
                    return [jobId, null, e.toString()];
                } 
            }
            let tasks : any = []
            const writePageObject = async (jobs : any) => {
                let page = {'page' : {'number' : pageArgs.number, jobs}}
                let data = JSON.stringify(page,null,2);
                await this.outFile.writeToFile(data + ",\n");
            }
            const limited_scrape_job_details = async (jobId : string) => {
                let ret : any = []
                try{
                    await semaphore.acquire()
                    ret = await scrape_job_details(jobId)
                } catch(error){
                    throw error
                } finally {
                    semaphore.release()
                }
                return ret
            }
            for (let jobId of pageArgs.jobIds) {
                tasks.push(limited_scrape_job_details(jobId))
            }
            const rets = await Promise.all(tasks);
            const jobs : any = []
            for (const [jobId, jobDetails, err] of rets) {
                  if (err) {
                    await this.log(err)
                    return pageArgs
                  } else {
                    const job = {jobId : jobId, jobDetails}
                    jobs.push(job)
                  }
            };
            await writePageObject(jobs)
        }
        try {
            while(!this.pageQueue.isEmpty()){
                const jobIds : any = []
                const pageNum = await this.pageQueue.dequeue()
                await hero.goto(this.get_page_url(pageNum))
                await hero.waitForLoad('DomContentLoaded')
                const article_elems = await hero.querySelectorAll('article[data-job-id]').$detach();
                for (let elem of article_elems) {
                    const jobId = elem.getAttribute('data-job-id')
                    if(jobId !== null){
                        jobIds.push(jobId)
                    }
                }
                const cookie = new Cookie("",this.get_dict((await hero.activeTab.cookieStorage.getItems())))
                const pageArgs = new PageArgs(pageNum,cookie,jobIds)
                // await this.log(`Starting scrape page operation on ${pageArgs.number}`)
                let ret : any 
                do { 
                    if(ret !== undefined){
                        await this.log(`Trying again to scrape page ${pageArgs.number}\n`)
                    } else {
                        await this.log(`Trying to scrape page ${pageArgs.number}\n`)
                    }
                    ret = await scrape_page_job_details(pageArgs)
                } while(ret !== undefined);
                this.pagesScraped++
            }
        } catch(err){
            throw err
        } finally {
            await hero.close()
        }
    }
    /* Partitions the scraping operation into concurrent page ranges */
    async scrape_all_jobs(){
        const tasks : any = []
        try{
            await this.log(`Adding ${this.num_pages} pages to page queue`)
            for(let i = this.pageRange[0]; i <= this.pageRange[1]; i++){
                this.pageQueue.enqueue(i)
            }
            let heroInstances = Math.min(this.num_pages,10)
            for(let i = 0; i<heroInstances; i++){
                tasks.push(this.startWorker())
            }
            await Promise.all(tasks)
        } catch (err){
            throw err
        } 
    }
    /*Starts the scrape*/
    async __call__() : Promise<number> {
        try {
            await this.log(`New scrape operation started on page range ${this.pageRange}`)
            await Promise.race([this.scrape_all_jobs(), this.timeoutPromise]);
        } catch (error) {
            throw error;
        } finally {
            this.timeoutClear();
            if(this.pagesScraped < this.num_pages){
                console.error("\nCouldn't complete scraping operation at this time, try again in ~1min, if still persists, please file an issue on github")
                return -1
            }
        }
        return 0
    }
}