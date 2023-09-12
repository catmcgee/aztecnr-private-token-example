import {
    AztecRPC,
    createAztecRpcClient,
    createDebugLogger,
    getSchnorrAccount,
    makeFetch,
    waitForSandbox,
  } from '@aztec/aztec.js';
  ////////////// CREATE THE CLIENT INTERFACE AND CONTACT THE SANDBOX //////////////
  const logger = createDebugLogger('private-token');
  const sandboxUrl = 'http://localhost:8080';

  // We create AztecRPC client connected to the sandbox URL and we use fetch with
  // 3 automatic retries and a 1s, 2s and 3s intervals between failures.
  const aztecRpc = createAztecRpcClient(sandboxUrl, makeFetch([1, 2, 3], false));
  // Wait for sandbox to be ready
  await waitForSandbox(aztecRpc);

  const nodeInfo = await aztecRpc.getNodeInfo();

  console.log('Aztec Sandbox Info ', nodeInfo);