import express, { Request, Response, Router } from 'express';
import { ethers } from 'ethers';
import { getEvent, updateEvent } from '../events/db';
import { db } from '../..';
import { ic, ThresholdWallet } from 'azle/experimental';
import { canisterSelf, msgCaller, setTimer} from "azle";

export function getRouter(): Router {
    const router = express.Router();

    router.post(
       '/payout', async (req: Request<any, any, { email: number }>, res) => {
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
}
    );

    return router;
}

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
