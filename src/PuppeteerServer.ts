import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import express, {type Express, type Request, type Response } from 'express';
import { type Browser} from 'puppeteer';

// Configure stealth plugin
puppeteer.use(StealthPlugin());

interface ServerConfig {
  port?: number;
  browserArgs: string[];
}

class PuppeteerServer {
  private app : Express = express();
  private browser: Browser | null = null;
  private config: ServerConfig;

  constructor(args: string[]) {
    this.config = {
      port: parseInt(args[0]), 
      browserArgs :  [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ]
    }
  }
  private async initBrowser(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: false,
        browserWSEndpoint : `ws://localhost:${this.config.port}`,
        args: this.config.browserArgs,
      });
      this.setupShutdownHandlers();
      console.log(this.wsEndpoint);
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw error;
    }
  }

  private get wsEndpoint(): string | null {
    return this.browser?.wsEndpoint() || null;
  }


  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      console.log(`${signal} received. Browser server shutting down gracefully...`);
      if (this.browser) {
        await this.browser.close().catch(error => console.error('Browser close error:', error));
      }
      process.exit(0);
    };
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  public async start(): Promise<void> {
    try {
      await this.initBrowser();
      this.app.listen(this.config.port, () => {
        console.log(`Server running on port ${this.config.port}`);
        console.log(`WebSocket endpoint: ${this.wsEndpoint}`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Start the server 
const args = process.argv.slice(2);
const server = new PuppeteerServer(args);
server.start();