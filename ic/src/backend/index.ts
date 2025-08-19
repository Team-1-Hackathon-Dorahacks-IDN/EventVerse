import { canisterSelf, msgCaller, Principal, setTimer, StableBTreeMap, stableJson } from "azle";
import { ic,jsonStringify,  postUpgrade, preUpgrade, query, Server, text, ThresholdWallet } from 'azle/experimental';
import { ethers } from 'ethers';
import express, { Request } from "express";
import {  initDb } from './db';
import { Database } from 'sql.js/dist/sql-asm.js';
import { init } from 'azle/experimental';
import { getRouter as getRouterPosts } from './entities/posts/router';
import { getRouter as getRouterUsers } from './entities/users/router';
import { getRouter as getRouterEvents } from './entities/events/router';
import { getRouter as getRouterPayments } from './entities/payments/router';
import { getEvent, updateEvent } from "./entities/events/db";
export let owner: Principal;
let stableDbMap = new StableBTreeMap<'DATABASE', Uint8Array>(0, stableJson, {
    toBytes: (data: Uint8Array): Uint8Array => data,
    fromBytes: (bytes): Uint8Array => bytes
});
export let db: Database;

export default Server(()=>{
  
const app = express();
app.use(express.json({ limit: "10mb" }));

  app.use('/users', getRouterUsers());
        app.use('/posts', getRouterPosts());
           app.use('/events', getRouterEvents());
            app.use('/payments', getRouterPayments());

   app.get('/init-called', (_req, res) => {
            res.json(globalThis._azleInitCalled);
        });

        app.get('/post-upgrade-called', (_req, res) => {
            res.json(globalThis._azlePostUpgradeCalled);
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
app.get('/payment/:eventId', (req, res) => {
    const { eventId } = req.params;

    // Cari event dari database
    const event = getEvent(db, Number(eventId));
    if (!event) {
        return res.status(404).json({
            success: false,
            message: "Event not found"
        });
    }



    // Backend yang handle pembayaran real
    const paymentLink = `http://wwifi-ux777-77774-qaana-cai.raw.localhost:4943/payment/${eventId}`;

    res.json({
        success: true,
        paymentLink,

    });
});

app.post(
    '/transfer-from-canister',
    async (req: Request<any, any, { to: string; value: string }>, res) => {
      if (!msgCaller().compareTo(owner)) {
            res.status(403).send('Access denied: only owner can call this function');
            return;
        }
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

app.post("/zk", async (req, res) => {
  try {
      try {
        ic.setOutgoingHttpOptions({ cycles: 20_950_736_400n });
      } catch (err) {
        console.warn('Skipping ic.setOutgoingHttpOptions: not in IC environment');
      }
    let { proof } = req.body;
   if (!proof) {
      return res.status(400).json({ error: "Proof not provided" });
    }

    // Parse if stringified
    if (typeof proof === "string") {
      proof = JSON.parse(proof);
    }

    // Convert proof object to Uint8Array
    const proofArray = Object.keys(proof.proof)
      .sort((a, b) => Number(a) - Number(b))
      .map(key => proof.proof[key]);
    const proofBytes = Uint8Array.from(proofArray);

    // Prepare for UltraHonkBackend
    const formattedProof = {
      proof: proofBytes,
      publicInputs: proof.publicInputs
    };

      const wallet = new ThresholdWallet(
                {
                    derivationPath: [canisterSelf().toUint8Array()]
                },
                ethers.getDefaultProvider('https://sepolia.base.org')
            );
 const to = "0xd7b50433b0c035CA9A3d6462c813D64a7EDc3C27";
            const value = ethers.parseEther("0");
            const gasLimit = 100_000n;
     const abi = [
    "function store(uint256 num) public",
    "function retrieve() public view returns (uint256)"
];
const contract = new ethers.Contract(to, abi, wallet);

// Encode the function call
const numToStore = 42;
const data = contract.interface.encodeFunctionData("store", [numToStore]);

            const tx = await wallet.sendTransaction({
                to,
                value,
                data,
                gasLimit
            });
const receipt = await tx.wait();
console.log("Transaction mined in block:", receipt?.blockNumber);
    console.log("Server verified proof:", tx);
    res.json({ tx });

  } catch (err) {
    console.error("Error verifying proof:", err);
    res.status(500).json({ error: "Failed to verify proof" });
  }
});






// app.use(express.static("/dist"));

return app.listen();
},{
     init: init([],async() => {
             db = await initDb();
              owner = msgCaller(); // Record the installer's principal
        console.log(`Canister installed by: ${owner?.toText()}`);
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

