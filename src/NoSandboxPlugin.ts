import { CorePlugin } from '@ulixee/hero-plugin-utils';
export default class NoSandboxPlugin extends CorePlugin {
    static readonly id = 'NoSandboxPlugin';
    onNewBrowser(browser : any, userConfig: any) {
        this.browserEngine.launchArguments.push('--no-sandbox', '--disable-setuid-sandbox')
    }
}