import { canisterSelf, msgCaller, Principal, setTimer, StableBTreeMap, stableJson } from "azle";
import { bitcoin_network } from "azle/canisters/management/idl";
import { ic,jsonStringify,  postUpgrade, preUpgrade, query, Server, text, ThresholdWallet } from 'azle/experimental';
import { ethers } from 'ethers';
import express, { Request } from "express";
import {  initDb } from './db';
import { Database } from 'sql.js/dist/sql-asm.js';
import { init } from 'azle/experimental';
import { getRouter as getRouterPosts } from './entities/posts/router';
import { getRouter as getRouterUsers } from './entities/users/router';
import { getRouter as getRouterEvents } from './entities/events/router';
import { getEvent, updateEvent } from "./entities/events/db";


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
           app.use('/events', getRouterEvents());

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
      const owner = Principal.fromText('your-owner-principal-id');
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



app.get('/payout', async (req: Request, res) => {
  try {
    const email = req.query.email as string;
    const eventId = req.query.eventId as string;

    if (!eventId) {
      return res.status(400).json({ error: "Missing 'eventId' query parameter" });
    }

    // 1. Ambil event
    const event = getEvent(db, Number(eventId));
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // 2. Cek kapasitas
    if (event.booked_count >= event.capacity) {
      return res.status(400).json({ error: "Event is fully booked" });
    }

    // 3. Ambil harga
    const valueStr = event.price?.toString();
    if (!valueStr) {
      return res.status(400).json({ error: "Event has no price set" });
    }

    const value = ethers.parseEther(valueStr);
    const gasLimit = 21_000n;

    ic.setOutgoingHttpOptions({ cycles: 200_850_523_200n });

    // Wallet pengirim
    const wallet = new ThresholdWallet(
      { derivationPath: [msgCaller().toUint8Array()] },
      ethers.getDefaultProvider('https://sepolia.base.org')
    );

    // Wallet penerima
    const walletPayment = new ThresholdWallet(
      { derivationPath: [canisterSelf().toUint8Array()] },
      ethers.getDefaultProvider('https://sepolia.base.org')
    );

    const to = await walletPayment.getAddress();

    // 4. Kirim transaksi
    const tx = await wallet.sendTransaction({ to, value, gasLimit });

    // 5. Update booked_count
    updateEvent(db, { id: event.id, booked_count: event.booked_count + 1 });

    // 6. Kirim notifikasi jika ada email
    if (email) {
      setTimer(10, () => {
        sendNotification(to, eventId, tx.hash, email);
      });
    }

    res.json({
      message: "Transaction sent",
      txHash: tx.hash,
      eventId,
      amount: valueStr,
      bookedCount: event.booked_count + 1
    });

  } catch (error: any) {
    console.error("Transaction failed:", error);
    res.status(500).json({
      error: "Failed to send transaction",
      details: error.message || "Unknown error",
    });
  }
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

function sendNotification(
  to: string,
  eventId: string,
  txHash?: string,
  email?: string
) {
  console.log("=== Notifikasi ===");
  console.log(`Event ID: ${eventId}`);
  console.log(`Tujuan transaksi: ${to}`);
  if (txHash) console.log(`Tx Hash: ${txHash}`);
  if (email) console.log(`Email notifikasi: ${email}`);
  console.log("=================");
}
