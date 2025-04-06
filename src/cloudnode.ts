import { CloudNode } from '@ulixee/cloud';
(async () => {
  const cloudNode = new CloudNode({
    shouldShutdownOnSignals : true
  });
  await cloudNode.listen();
  console.log(await cloudNode.port);
  return cloudNode;
})().catch(error => {
  console.error(error);
  process.exit(1);
});