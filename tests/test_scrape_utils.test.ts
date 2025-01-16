import { findLastPage, isZeroResults } from '../src/scrape_utils';
import HeroCore from '@ulixee/hero-core';
import { TransportBridge } from '@ulixee/net';
import { ConnectionToHeroCore } from '@ulixee/hero';
import Hero from '@ulixee/hero';

describe('Find last page', () => {
    let heroes : Hero[];
    let heroCore : HeroCore;
    // Set up Hero instances and core connections
    beforeAll(() => {
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
                blockedResourceTypes: ['All'],
                connectionToCore: connectionToCore1,
            }),
            new Hero({
                sessionPersistence: false,
                connectionToCore: connectionToCore2,
            }),
        ];
    });

    // Clean up Hero instances and core connections
    afterAll(async () => {
        for (const hero of heroes) {
            await hero.close();
        }
        await heroCore.close();
    });

    // Define tests
    it('isZeroResults', async () => {
        expect(await isZeroResults(heroes[1],1,'hk')).toBe(false)
        expect(await isZeroResults(heroes[1],10000,'hk')).toBe(true)
        expect(await isZeroResults(heroes[1],1,'th')).toBe(false)
        expect(await isZeroResults(heroes[1],10000,'th')).toBe(true)
    })
    it('Returns a page value for hk > 1', async () => {
        const lastPage = await findLastPage('hk')
        expect(lastPage).toBeGreaterThan(1);
        console.log(lastPage)
    });
    it('Returns a page value for th > 1', async () => {
        const lastPage = await findLastPage('th')
        expect(lastPage).toBeGreaterThan(1);
        console.log(lastPage)
    });
});
