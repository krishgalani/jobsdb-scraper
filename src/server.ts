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
export function startServerProcess(name: string, testMode? : boolean): any {
    let args = ['build/src/cloudnode']
    if(testMode){
      args.push('--enableTestMode')
    }
    const serverProcess = spawn('node', args);
    serverProcess.on('close', (code: number | null) => {
        if(code !== null){
        console.log(`Cloud node exited abrutly`)
        }
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