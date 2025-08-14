import { canisterSelf, msgCaller, StableBTreeMap, stableJson } from "azle";
import { bitcoin_network } from "azle/canisters/management/idl";
import { ic, jsonStringify, postUpgrade, preUpgrade, query, Server, text, ThresholdWallet } from 'azle/experimental';
import { ethers } from 'ethers';
import express, { Request } from "express";
import {  initDb } from './db';
import { Database } from 'sql.js/dist/sql-asm.js';
import { init,Principal } from 'azle/experimental';
import { getRouter as getRouterPosts } from './entities/posts/router';
import { getRouter as getRouterUsers } from './entities/users/router';
import cors from 'cors';
// Dummy values instead of real Bitcoin interactions
const NETWORK: bitcoin_network = { testnet: null };
const DERIVATION_PATH: Uint8Array[] = [];
const KEY_NAME: string = "test_key_1";
let stableDbMap = new StableBTreeMap<'DATABASE', Uint8Array>(0, stableJson, {
    toBytes: (data: Uint8Array): Uint8Array => data,
    fromBytes: (bytes): Uint8Array => bytes
});
export let db: Database;
export default Server(()=>{
const app = express();
app.use(express.json());

  app.use('/users', getRouterUsers());
        app.use('/posts', getRouterPosts());
/// Dummy: Returns the balance of a given Bitcoin address.
app.get("/", async (req: Request, res) => {
  const welcomeMessage = {
    message: "Welcome to the Dummy Bitcoin Canister API",
  };
  res.json(welcomeMessage);
});
   app.get('/init-called', (_req, res) => {
            res.json(globalThis._azleInitCalled);
        });

        app.get('/post-upgrade-called', (_req, res) => {
            res.json(globalThis._azlePostUpgradeCalled);
        });

/// Dummy: Returns the balance of a given Bitcoin address.
app.post("/get-balance", async (req: Request, res) => {
  const { address } = req.body;
  const dummyBalance = {
    address: address,
    balance: 0.005, // in BTC
    unit: "BTC",
  };
  res.json(dummyBalance);
});

app.get('/caller-address', async (_req:Request, res) => {
   ic.setOutgoingHttpOptions({
                    cycles: 200_850_523_200n
                });
    const wallet = new ThresholdWallet(
        {
            derivationPath: [msgCaller().toUint8Array()]
        },
        ethers.getDefaultProvider('https://sepolia.base.org')
    );


  res.json({address: await wallet.getAddress()});
});
app.get(
    '/keccak256',
    (req: Request<any, any, any, { message: string }>, res) => {
        res.send(ethers.keccak256(Buffer.from(req.query.message)));
    }
);

app.get('/canister-address', async (_req, res) => {
    ic.setOutgoingHttpOptions({
                    cycles: 200_850_523_200n
                });
    const wallet = new ThresholdWallet(
        {
            derivationPath: [canisterSelf().toUint8Array()]
        },
        ethers.getDefaultProvider('https://sepolia.base.org')
    );

    res.json({address: await wallet.getAddress()});
});

app.get(
    '/address-balance',
    async (req: Request<any, any, any, { address: string }>, res) => {
        ic.setOutgoingHttpOptions({
                    cycles: 400_850_523_200n
                });
        const balance = await ethers
            .getDefaultProvider('https://sepolia.base.org')
            .getBalance(req.query.address);
res.json({ balance: balance.toString() });
    }
);
app.get('/whoami', (req, res) => {

    res.send(msgCaller().toString());
});

app.post(
  '/transfer-from-sepolia-faucet-wallet',
  async (req: Request<any, any, { to: string; value: string }>, res) => {
    try {
      const { to, value } = req.body;

      if (!to || !value) {
        return res.status(400).json({ error: 'Both "to" and "value" are required' });
      }

      if (!ethers.isAddress(to)) {
        return res.status(400).json({ error: 'Invalid Ethereum address' });
      }

      let parsedValue;
      try {
        parsedValue = ethers.parseEther(value);
      } catch {
        return res.status(400).json({ error: 'Invalid ETH value format' });
      }

      // Kalau memang mau set cycle untuk outgoing HTTP
      try {
        ic.setOutgoingHttpOptions({ cycles: 20_950_736_400n });
      } catch (err) {
        console.warn('Skipping ic.setOutgoingHttpOptions: not in IC environment');
      }

      const wallet = new ethers.Wallet(
        '0x6f784763681eb712dc16714b8ade23f6c982a5872d054059dd64d0ec4e52be33',
        ethers.getDefaultProvider('https://sepolia.base.org')
      );

      const tx = await wallet.sendTransaction({
        to,
        value: parsedValue,
        gasLimit: 21_000n
      });

      res.json({ message: 'Transaction sent', txHash: tx.hash });
    } catch (error: any) {
      console.error('Transaction failed:', error);
      res.status(500).json({
        error: 'Failed to send transaction',
        details: error.message || 'Unknown error',
      });
    }
  }
);
app.get('/payment', (req, res) => {
    const to = "0xReceiverWalletAddress";
    const valueInEth = "0.01";

    // Ethereum payment URI
    const paymentLink = `http://wwifi-ux777-77774-qaana-cai.raw.localhost:4943/payment`;

    res.json({
        success: true,
        paymentLink
    });
});

app.post(
    '/transfer-from-canister',
    async (req: Request<any, any, { to: string; value: string }>, res) => {
      
  
            const wallet = new ThresholdWallet(
                {
                    derivationPath: [canisterSelf().toUint8Array()]
                },
                ethers.getDefaultProvider('https://sepolia.base.org')
            );

            const to = req.body.to;
            const value = ethers.parseEther(req.body.value);
            const gasLimit = 21_000n;

            const tx = await wallet.sendTransaction({
                to,
                value,
                gasLimit
            });

            res.send(`transaction sent with hash: ${tx.hash}`);
       
    }
);
app.post(
  '/payout',
  async (req: Request<any, any, { to: string; value: string }>, res) => {

   try{
          ic.setOutgoingHttpOptions({
                    cycles: 200_850_523_200n
                });
             
    const wallet = new ThresholdWallet(
        {
            derivationPath: [msgCaller().toUint8Array()],
            keyId:{
              curve:'secp256k1',
              name:'dfx_test_key' 
            }
        },
        ethers.getDefaultProvider('https://sepolia.base.org')
    );
   
      const to = req.body.to;
            const value = ethers.parseEther(req.body.value);
            const gasLimit = 21_000n;
  
      const tx = await wallet.sendTransaction({
             to,
                value,
                gasLimit
      });

     res.json({ message: 'Transaction sent', txHash: tx.hash });
    }catch(error:any){
       console.error('Transaction failed:', error);
      res.status(500).json({
        error: 'Failed to send transaction',
        details: error.message || 'Unknown error',
      });
    }
  }
);

/// Dummy: Returns the UTXOs of a given Bitcoin address.
app.post("/get-utxos", async (req: Request, res) => {
  const { address } = req.body;
  const dummyUtxos = [
    {
      txid: "dummy-txid-1",
      vout: 0,
      value: 25000,
      confirmations: 5,
    },
    {
      txid: "dummy-txid-2",
      vout: 1,
      value: 50000,
      confirmations: 3,
    },
  ];
  res.json(dummyUtxos);
});

/// Dummy: Returns the 100 fee percentiles measured in millisatoshi/byte.
app.post("/get-current-fee-percentiles", async (_req, res) => {
  const dummyFees = Array.from({ length: 100 }, (_, i) => 100 + i); // Example: [100, 101, ..., 199]
  res.json(dummyFees);
});

/// Dummy: Returns the P2PKH address of this canister.
app.post("/get-p2pkh-address", async (_req, res) => {
  const dummyAddress = "tb1qdummyaddressxyz1234567890";
  res.json({ address: dummyAddress });
});

/// Dummy: Sends satoshis from this canister to a specified address.
app.post("/send", async (req, res) => {
  try {
    const { destinationAddress, amountInSatoshi } = req.body;

    const dummyTxId = "dummy-txid-sent-1234567890";
    const response = {
      success: true,
      destination: destinationAddress,
      amount: amountInSatoshi,
      txId: dummyTxId,
    };
    res.json(response);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "DUMMY_ERROR",
        message: "This is a dummy error response",
        details: null,
      },
    });
  }
});

/// Dummy test endpoint
app.post("/dummy-test", (_req, res) => {
  const dummyResponse = {
    status: "success",
    data: {
      message: "This is a dummy response",
      timestamp: new Date().toISOString(),
      testData: {
        id: 1,
        name: "Test Bitcoin Data",
        value: 0.001,
        isTest: true,
      },
    },
  };
  res.json(dummyResponse);
});

// app.use(express.static("/dist"));

return app.listen();
},{
     init: init([],async() => {
             db = await initDb();
        
        }),
        preUpgrade:preUpgrade(()=>{
  stableDbMap.insert('DATABASE', db.export());
        }),
         postUpgrade: postUpgrade([],async() => {
           const database = stableDbMap.get('DATABASE');

        if (database === null) {
            throw new Error('Failed to get database');
        }

        db = await initDb(database);
        }),
        whoami:query([],text,()=>{
          return msgCaller().toString();
        })
        
    }

)
export function determineKeyName(network: bitcoin_network): string {
  return "test_key_1"; // always return dummy key
}

export function determineNetwork(
  networkName?: string,
): bitcoin_network | undefined {
  return { testnet: null }; // always return dummy network
}
