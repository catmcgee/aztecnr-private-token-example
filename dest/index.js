import { createAztecRpcClient, createDebugLogger, makeFetch, waitForSandbox, } from '@aztec/aztec.js';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUVILG9CQUFvQixFQUNwQixpQkFBaUIsRUFFakIsU0FBUyxFQUNULGNBQWMsR0FDZixNQUFNLGlCQUFpQixDQUFDO0FBQ3pCLGlGQUFpRjtBQUNqRixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNsRCxNQUFNLFVBQVUsR0FBRyx1QkFBdUIsQ0FBQztBQUUzQywrRUFBK0U7QUFDL0Usc0VBQXNFO0FBQ3RFLE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDL0UsK0JBQStCO0FBQy9CLE1BQU0sY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRS9CLE1BQU0sUUFBUSxHQUFHLE1BQU0sUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBRTlDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsUUFBUSxDQUFDLENBQUMifQ==