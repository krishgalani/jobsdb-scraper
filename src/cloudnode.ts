import { CloudNode } from '@ulixee/cloud';
import NoSandboxPlugin from './NoSandboxPlugin';

(async () => {
  const cloudNode = new CloudNode({
    shouldShutdownOnSignals : true,
  });
  cloudNode.heroCore.use(NoSandboxPlugin)
  await cloudNode.listen();
  console.log(await cloudNode.port);
  return cloudNode;
})().catch(error => {
  console.error(error);
  process.exit(1);
});