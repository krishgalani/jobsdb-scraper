import { ICookie } from '@ulixee/unblocked-specification/agent/net/ICookie';
import type { Logger } from 'pino';
import Hero from '@ulixee/hero';
import Queue from 'queue-fifo';
import { get_page_url, parseHtml } from './scrape_utils';
import { v4 as uuidv4 } from 'uuid';
import Semaphore from 'semaphore-async-await'

import type { QueueObject } from 'async';
import { CustomLevelLogger } from 'pino';
import { createTimeoutPromise, sleep } from './utils';

export class Cookie {
    cookie : {[key: string]: string};
    constructor(cookie : {[key: string]: string} = {}){
        this.cookie = cookie
    }
}

export class PageArgs {
    number: number;
    jobIds: string[];
    cookie: Cookie;
    constructor(number: number, cookie: Cookie = new Cookie(), jobIds: string[] = []) {
        this.number = number;
        this.jobIds = jobIds;
        this.cookie = cookie;
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
    id : number
    baseUrl : string
    cloudNodePort : number
    region : string
    pageQueue : Queue<number>
    timeout : number
    logger : Logger
    outQueue : QueueObject<Object>
    timeoutPromise : any
    timeoutClear : any
    constructor(id : number, baseUrl: string, cloudNodePort : number, outQueue : QueueObject<Object>, region : string, logger: Logger, pageQueue : Queue<number>, timeout : number = 3600) {
        this.id = id
        this.baseUrl = baseUrl
        this.outQueue = outQueue
        this.region = region
        this.logger = logger
        this.pageQueue = pageQueue
        this.timeout = timeout
        const { promise: timeoutPromise, clear: timeoutClear } = createTimeoutPromise(timeout, 'Timeout');
        this.timeoutPromise = timeoutPromise.then(() => logger.error(`Scrape op ${id} timed out.`));
        this.timeoutClear = timeoutClear;
        this.cloudNodePort = cloudNodePort
    }
    /* Helpers */
    assemble_cookie(cookie: Cookie): string {
        return Object.entries(cookie.cookie)
          .map(([key, value]) => `${key}=${value}`)
          .join('; ');
    }
    get_dict(cookies : ICookie[]): { [key: string]: string } {
        const cookieDict : { [key: string]: string } = {}
        for (let i = 0; i < cookies.length; i++) {
          cookieDict[cookies[i].name] = cookies[i].value;
        }
        return cookieDict
    }
    /*Scraping Logic*/
    async scrape_job_details(workerId : number, hero : Hero, userAgent : string ,jobId : string, pageArgs : PageArgs, semaphore: Semaphore) : Promise<any> {
        let nAttempts = 0
        const maxAttempts = 3
        let success = false
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
            'x-seek-ec-sessionid': cookie['JobseekerSessionId'] ?? "",
            'x-seek-ec-visitorid': cookie['JobseekerVisitorId'] ?? "",
            'x-seek-site': 'chalice',
        };
        const jsonData = {
            'operationName': 'jobDetails',
            'variables': {
                'jobId':  jobId,
                'jobDetailsViewedCorrelationId': uuidv4(),
                'sessionId': cookie["JobseekerSessionId"] ?? '',
                'zone': 'asia-1',
                'locale': 'en-HK',
                'languageCode': 'en',
                'countryCode': 'HK',
                'timezone': 'America/New_York',
            },
            'query': query
        }
        while(!success && nAttempts < maxAttempts){
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
                    this.logger.error(`Hero ${this.id}.${workerId} encountered error status ${await response.status} on job fetch for p${pageArgs.number}`)
                    throw new Error(`Hero ${this.id}.${workerId} encountered error status ${await response.status} on job fetch for p${pageArgs.number}`);
                } 
                const responseJson : any = await response.json()
                const job = responseJson.data.jobDetails.job
                job.content = parseHtml(job.content)
                //write a ndjson object to outstream
                this.outQueue.push(job, (err: any) => {
                    if (err) {
                        this.logger.error(`Hero ${this.id}.${workerId}'s queue push failed:, ${err.message}`);
                        throw new Error(`Hero ${this.id}.${workerId}'s queue push failed:, ${err.message}`)
                    }
                })
                success = true
                nAttempts++
            } catch (e: any) {
                this.logger.error(`Hero ${this.id}.${workerId} failed to scrape job ${jobId} on page ${pageArgs.number} on attempt #${nAttempts}: ${e.toString()}`)  
            } 
        }
        semaphore.release()
        if(nAttempts == maxAttempts){
            this.logger.error(`Hero ${this.id}.${workerId} failed to scrape job ${jobId} on page ${pageArgs.number}`)
            throw new Error(`Hero ${this.id}.${workerId} failed to scrape job ${jobId} on page ${pageArgs.number}`)
        }
    }
    
    async scrape_page_job_details(workerId : number,hero: Hero, semaphore : Semaphore, userAgent : string, pageArgs : PageArgs) : Promise<any> {
        let tasks : any = []
        for (let jobId of pageArgs.jobIds) {
            await semaphore.acquire()
            tasks.push(this.scrape_job_details(workerId, hero, userAgent, jobId, pageArgs, semaphore))
        }
        await Promise.all(tasks);
    }
    async startWorker(workerId : number){
        const hero = new Hero({
            sessionPersistence : false,
            blockedResourceTypes: [
            'All'
            ],
            connectionToCore: {
                host: `localhost:${this.cloudNodePort}`,
            }
        }); 
        let workerPagesScraped = 0
        const userAgent = (await hero.meta).userAgentString
        this.logger.info(`Hero instance ${this.id}.${workerId} started`);
        const concurrency_lim : number = 8
        const semaphore = new Semaphore(concurrency_lim)
        try {
            while(!this.pageQueue.isEmpty()){
                let jobIds : any = []
                const pageNum = this.pageQueue.dequeue() as number
                this.logger.info(`Hero ${this.id}.${workerId} dequeued page ${pageNum}`)
                await hero.goto(get_page_url(pageNum,this.region))
                await hero.waitForLoad('DomContentLoaded')
                //must await here
                let article_elems = await hero.querySelectorAll('article[data-job-id]')
                for (let elem of article_elems) {
                    const jobId = await elem.getAttribute('data-job-id')
                    jobIds.push(jobId)
                }
                const cookie = new Cookie(this.get_dict((await hero.activeTab.cookieStorage.getItems())))
                const pageArgs = new PageArgs(pageNum,cookie,jobIds)
                await this.scrape_page_job_details(workerId,hero,semaphore,userAgent,pageArgs)
                workerPagesScraped++
                this.logger.info(`Hero ${this.id}.${workerId} successfully scraped page ${pageArgs.number}`)
            }
        } catch (error){
            this.logger.info(`Hero ${this.id}.${workerId} failed on ${await hero.activeTab.url}`)
            throw error
        } finally {
            await hero.close()
            this.logger.info(`Hero instance ${this.id}.${workerId} closed, scraped ${workerPagesScraped} pages`);
        }
    }
    /* Partitions the scraping operation into concurrent page ranges */
    async scrape_all_jobs(){
        const tasks : any = []
        let heroInstances = Math.min(this.pageQueue.size(),10)
        this.logger.info(`Starting ${heroInstances} hero instances on scrape op ${this.id}`)
        for(let i = 0; i<heroInstances; i++){
            tasks.push(this.startWorker(i))
        }
        await Promise.all(tasks)
    }
    /*Starts the scrape*/
    async __call__() : Promise<number> {
        try {
            this.logger.info(`Starting scrape operation ${this.id}, using cloud node on port ${this.cloudNodePort}`)
            await Promise.race([this.scrape_all_jobs(), this.timeoutPromise]);
        } finally {
            this.timeoutClear();
        }
        return 0
    }
}