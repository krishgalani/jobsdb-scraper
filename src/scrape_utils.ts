import {compile} from 'html-to-text'
import HeroCore from '@ulixee/hero-core';
import { TransportBridge } from '@ulixee/net';
import { ConnectionToHeroCore } from '@ulixee/hero';
import Hero from '@ulixee/hero';
import NoSandboxPlugin from './NoSandboxPlugin';
export const parseHtml = compile({}); // options passed here

export async function isZeroResults(hero: Hero, url : string) {
    const { activeTab, document } = hero;
    await activeTab.goto(url);
    await activeTab.waitForLoad('DomContentLoaded');
    const elem = document.querySelector('[data-testid="job-card"')
    const hasResults = await elem.$exists;
    return hasResults === false
}
//Binary search the last page
async function positionFromLastPage(heroes : Hero[] , page : number, url : URL) {
    let url_deep_copy = new URL(url.href)
    let tasks = []  
    for(let i = 0; i < 2;i++){
        url_deep_copy.searchParams.set('page',String(page + i))
        tasks.push(isZeroResults(heroes[i],url_deep_copy.href))
    }
    let results = await Promise.all(tasks)
    for (let result of results){
        if (result === undefined) {
            throw new Error("Couldn't parse zero result section")
        }
    }
    let currentPageHasNoResults = results[0]
    let currentPageHasResults = !currentPageHasNoResults
    let pageAfterHasNoResults = results[1]
    if(currentPageHasResults && pageAfterHasNoResults){
       return 'on'
    } 
    if(currentPageHasNoResults){
        return 'after'
    }
    return 'before'
}
//Perform a binary search
//Perform a binary search
export async function findLastPage(searchResultsUrl : URL, heroes? : Hero[]){
    let heroCore;
    let selfInit = false
    if(heroes === undefined){
        selfInit = true
        const bridge1 = new TransportBridge();
        const bridge2 = new TransportBridge();
        const connectionToCore1 = new ConnectionToHeroCore(bridge1.transportToCore);
        const connectionToCore2 = new ConnectionToHeroCore(bridge2.transportToCore);
        heroCore = new HeroCore({disableSessionPersistence: true});
        heroCore.use(NoSandboxPlugin);
        heroCore.addConnection(bridge1.transportToClient);
        heroCore.addConnection(bridge2.transportToClient);
        heroes = [
            new Hero({
                noChromeSandbox: true,
                blockedResourceTypes: ['All'],
                connectionToCore: connectionToCore1,
            }),
            new Hero({
                noChromeSandbox: true,
                blockedResourceTypes: ['All'],
                connectionToCore: connectionToCore2,
            }),
        ];
    }
    let start = 1
    let end = 1000
    let ret = -1
    while(start <= end){
        let mid = Math.trunc((start + end) / 2)
        let pos = await positionFromLastPage(heroes,mid,searchResultsUrl)
        if(pos === 'before'){
            start = mid + 1
        } else if(pos === 'on'){
            ret=mid
            break
        } else {
            end = mid - 1
        }
    }
    if(selfInit){
        for(let hero of heroes){
            await hero.close()
        }
        await heroCore?.close()
    }
    if(ret === -1 || ret < 1){
        ret = -1
        // Couldn't find last page
        // console.log(`Couldn't find pages available to scrape in ${get_base_url(region)}`)
    }
    return ret 
}