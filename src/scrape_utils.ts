import {compile} from 'html-to-text'
import HeroCore from '@ulixee/hero-core';
import { TransportBridge } from '@ulixee/net';
import { ConnectionToHeroCore } from '@ulixee/hero';
import Hero from '@ulixee/hero';
import { sleep } from './utils';
export const parseHtml = compile({}); // options passed here
export function get_page_url(page: number, region : string): string {
    return `https://${region}.jobsdb.com/jobs?page=${page}`;
}
export function get_base_url(region : string): string {
    return `https://${region}.jobsdb.com/jobs`;
}
export async function isZeroResults(hero: Hero, page: number, region: string){
    const {activeTab, document} = hero
    console.log(`${page},${region}`)
    await activeTab.goto(get_page_url(page,region))
    let elem = activeTab.querySelector('script[data-automation="server-state"]')
    await activeTab.waitForElement(elem)
    const scriptText = await elem.textContent
    if(scriptText === null){
        throw new Error("Cannot parse script tag when finding isZeroResults")
    }
    const match = scriptText.match(/window\.SEEK_REDUX_DATA\s*=\s*(\{.*?\});/s);
    
    if (!match) {
        throw new Error('Could not find window.SEEK_REDUX_DATA in the script content.');
    }
    const reduxJsonString = match[1];
    let reduxData;
    try {
      reduxData = JSON.parse(reduxJsonString);
    } catch (err : any) {
      throw new Error(`Failed to parse Redux data: ${err.message}`);
    }
    const isZeroResults = reduxData?.results?.results.jobs === null
    return isZeroResults
}
async function positionFromLastPage(heroes : Hero[] , page : number, region : string) {
    let tasks = []
    for(let i = 0; i < 2;i++){
        tasks.push(isZeroResults(heroes[i],page+i,region))
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
export async function findLastPage(region : string, heroes? : Hero[]){
    console.log("Finding the number of pages available to scrape...")
    let heroCore;
    let selfInit = false
    if(heroes === undefined){
        selfInit = true
        const bridge1 = new TransportBridge();
        const bridge2 = new TransportBridge();
        const connectionToCore1 = new ConnectionToHeroCore(bridge1.transportToCore);
        const connectionToCore2 = new ConnectionToHeroCore(bridge2.transportToCore);
        heroCore = new HeroCore();
        heroCore.addConnection(bridge1.transportToClient);
        heroCore.addConnection(bridge2.transportToClient);
        heroes = [
            new Hero({
                sessionPersistence: false,
                connectionToCore: connectionToCore1,
            }),
            new Hero({
                sessionPersistence: false,
                connectionToCore: connectionToCore2,
            }),
        ];
    }
    let start = 1
    let end = 1000
    let ret = -1
    while(start <= end){
        let mid = Math.trunc((start + end) / 2)
        let pos = await positionFromLastPage(heroes,mid,region)
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
    return ret // Couldn't find last page
}