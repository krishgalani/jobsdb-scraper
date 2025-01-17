import { CorePlugin } from '@ulixee/hero-plugin-utils';
export class CoreNoBrowserSandboxPlugin extends CorePlugin {
  static readonly id = 'no-browser-sandbox-plugin';
  onNewBrowser(browser : any , userConfig: any ){
    browser.engine.launchArguments.push('--no-sandbox')
    browser.engine.launchArguments.push('--disable-setuid-sandbox')
  } 
}