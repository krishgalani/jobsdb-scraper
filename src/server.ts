import {spawn} from 'child_process';

//Wait for port number to be returned from cloudnode in order to pass to scraping Hero instances
export function waitForPort(process: any): Promise<number>{
    return new Promise((resolve, reject) => {
      process.stdout?.once('data', (data: Buffer) => {
        try {
          const port = parseInt(data.toString(), 10); // Convert data to number
          resolve(port);
        }catch(error){
          reject(error)
        }
      });
    });
  }
//Init cloudnodes
export function startServerProcess(name: string, enableLogging: boolean): any {
    const serverProcess = spawn('node', ['build/src/cloudnode']);

    serverProcess.stdout.on('data', (data: Buffer) => {
      if(enableLogging) console.log(data.toString());
    });
    serverProcess.stderr.on('data', (error: Buffer) => {
        const errorMessage = error.toString();
        if (errorMessage.includes('Warning')) {
        if(!errorMessage.includes("Deprecat")){
            console.warn(`Cloud Node ${name} Warning:`, errorMessage);
        }
        } else {
        console.error(`Cloud Node ${name} Error:`, errorMessage);
        }
    });

return serverProcess;
}