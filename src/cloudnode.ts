import { CloudNode } from '@ulixee/cloud';
import { CoreNoBrowserSandboxPlugin } from './NoBrowserSandboxPlugin';

(async () => {
  const cloudNode = new CloudNode({
    shouldShutdownOnSignals : true,
  });
  if(process.argv.length > 2){
    cloudNode.heroCore.use(CoreNoBrowserSandboxPlugin) 
  }
  await cloudNode.listen();
  console.log(await cloudNode.port);
  return cloudNode;
})().catch(error => {
  console.error(error);
  process.exit(1);
});