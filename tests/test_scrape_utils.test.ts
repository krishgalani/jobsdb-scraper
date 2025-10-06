import { findLastPage, isZeroResults } from '../src/scrape_utils';
import HeroCore from '@ulixee/hero-core';
import { TransportBridge } from '@ulixee/net';
import { ConnectionToHeroCore } from '@ulixee/hero';
import Hero from '@ulixee/hero';
import NoSandboxPlugin from '../src/NoSandboxPlugin'
import { describe, beforeAll,afterAll, it, expect } from 'vitest';

describe('Find last page', () => {
    let heroes : Hero[];
    let heroCore : HeroCore;
    // Set up Hero instances and core connections
    beforeAll(() => {
        heroCore = new HeroCore();
        heroCore.use(NoSandboxPlugin)
        heroes = [];
    
        for (let i = 0; i < 4; i++) {
            const bridge = new TransportBridge();
            const connectionToCore = new ConnectionToHeroCore(bridge.transportToCore);
    
            heroCore.addConnection(bridge.transportToClient);
    
            heroes.push(
                new Hero({
                    sessionPersistence: false,
                    blockedResourceTypes: ['All'],
                    connectionToCore,
                }),
            );
        }
    });
    

    // Clean up Hero instances and core connections
    afterAll(async () => {
        for (const hero of heroes) {
            await hero.close();
        }
        await heroCore.close();
    });

    it('isZeroResults', async () => {
        await Promise.all([
            expect(isZeroResults(heroes[0], 1, 'hk')).resolves.toBe(false),
            expect(isZeroResults(heroes[1], 10000, 'hk')).resolves.toBe(true),
            expect(isZeroResults(heroes[2],1,'th')).resolves.toBe(false),
            expect(isZeroResults(heroes[3],10000,'th')).resolves.toBe(true)
        ]);
    })
    it('Returns a page value for hk > 1', async () => {
        const lastPage = await findLastPage('hk')
        expect(lastPage).toBeGreaterThan(1);

    });
    it('Returns a page value for th > 1', async () => {
        const lastPage = await findLastPage('th')
        expect(lastPage).toBeGreaterThan(1);
    });
});
