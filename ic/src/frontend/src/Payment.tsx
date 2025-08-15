// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { toJwt } from "azle/experimental/http_client";
import { createActor } from "../../declarations/backend";
import fetch from "isomorphic-fetch";

function Payment() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [callerAddress, setCallerAddress] = useState("");
  const [callerBalance, setCallerBalance] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [canisterBalance, setCanisterBalance] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [canisterAddress, setCanisterAddress] = useState("");
  const [airdropStatus, setAirdropStatus] = useState("");
  useEffect(() => {
    authenticate();
  }, []);

  // ====== Authentication ======
  async function authenticate() {
    const authClient = await AuthClient.create();
    const isAuthenticated = await authClient.isAuthenticated();
    if (isAuthenticated) {
      setIdentity(authClient.getIdentity());
      await fetchCallerAndBalance(authClient.getIdentity());
      await fetchCanisterAndBalance(authClient.getIdentity());
    } else {
      await handleIsNotAuthenticated(authClient);
    }
  }

  async function handleIsNotAuthenticated(authClient: AuthClient) {
    await new Promise((resolve, reject) => {
      authClient.login({
        identityProvider: import.meta.env.VITE_IDENTITY_PROVIDER,
        onSuccess: resolve,
        onError: reject,
        windowOpenerFeatures: `width=500,height=500`,
      });
    });
    const id = authClient.getIdentity();
    setIdentity(id);
    await fetchCallerAndBalance(id);
  }

  // ====== Fetch Caller & Balance ======
  async function fetchCallerAndBalance(id: Identity) {
    try {
      const agent = new HttpAgent({ identity: id });
      await agent.fetchRootKey(); // hapus kalau di mainnet
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      // Ambil caller address
      const callerRes = await actor.http_request_update({
        url: "/caller-address",
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (callerRes.status_code === 200) {
        const addr = new TextDecoder().decode(new Uint8Array(callerRes.body));
        const parsed = JSON.parse(addr); // parsed = { address: "0x6163..." }
        const address = parsed.address; // ambil value dari field "address"
        setCallerAddress(address);

        // Ambil saldo otomatis setelah alamat didapat
        await fetchCallerBalance(id, address);
      }
    } catch (err) {
      console.error("Gagal ambil caller address:", err);
    }
  }

  async function fetchCallerBalance(id: Identity, address: string) {
    try {
      setCallerBalance("🔄 Mengambil saldo...");
      const agent = new HttpAgent({ identity: id });
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const res = await actor.http_request_update({
        url: `/address-balance?address=${address}`,
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code !== 200) {
        throw new Error(`Gagal fetch saldo: ${res.status_code}`);
      }

      const raw = new TextDecoder().decode(new Uint8Array(res.body));
      const parsed = JSON.parse(raw); // { balance: "1000000000000000000" }
      const eth = Number(parsed.balance) / 1e18;
      setCallerBalance(`💰 Saldo: ${eth} ETH`);
    } catch (err) {
      console.error(err);
      setCallerBalance("❌ Gagal mengambil saldo");
    }
  }
  // ====== Fetch Canister & Balance ======
  async function fetchCanisterAndBalance(id: Identity) {
    try {
      const agent = new HttpAgent({ identity: id });
      await agent.fetchRootKey(); // hapus kalau di mainnet
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      // Ambil canister address
      const canisterRes = await actor.http_request_update({
        url: "/canister-address",
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (canisterRes.status_code === 200) {
        const addr = new TextDecoder().decode(new Uint8Array(canisterRes.body));
        const parsed = JSON.parse(addr);
        const address = parsed.address;
        setCanisterAddress(address);

        // Ambil saldo otomatis setelah alamat didapat
        await fetchCanisterBalance(id, address);
      }
    } catch (err) {
      console.error("Gagal ambil canister address:", err);
    }
  }
  async function fetchCanisterBalance(id: Identity, address: string) {
    try {
      setCanisterBalance("🔄 Mengambil saldo...");
      const agent = new HttpAgent({ identity: id });
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const res = await actor.http_request_update({
        url: `/address-balance?address=${address}`,
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code !== 200) {
        throw new Error(`Gagal fetch saldo: ${res.status_code}`);
      }

      const raw = new TextDecoder().decode(new Uint8Array(res.body));
      const parsed = JSON.parse(raw); // { balance: "1000000000000000000" }
      const eth = Number(parsed.balance) / 1e18; // Wei → ETH

      setCanisterBalance(`💰 Saldo: ${eth} ETH`);
    } catch (err) {
      console.error(err);
      setCanisterBalance("❌ Gagal mengambil saldo");
    }
  }
  // ====== Logout ======
  async function logout() {
    const authClient = await AuthClient.create();
    await authClient.logout();
    setIdentity(null);
    setCallerAddress("");
    setPaymentStatus("");
  }

  // ====== Payment ======
  async function handlePayment() {
    if (!identity) {
      alert("Login terlebih dahulu sebelum melakukan pembayaran");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      alert("Masukkan jumlah pembayaran yang valid");
      return;
    }

    try {
      setPaymentStatus("Memproses pembayaran...");

      const agent = new HttpAgent({ identity });
      await agent.fetchRootKey(); // hapus kalau di mainnet
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      // Prepare JSON payload
      const payload = JSON.stringify({
        to: canisterAddress, // recipient address
        value: amount, // payment amount as string
      });

      // Convert JSON to Uint8Array / number[]
      const payloadBytes = new TextEncoder().encode(payload);
      console.log(payloadBytes);
      const res = await actor.http_request_update({
        url: "/payout",
        method: "POST",
        body: payloadBytes,
        headers: [["Content-Type", "application/json"]],
      });
      console.log(res);
      if (res.status_code !== 200) {
        throw new Error(`Gagal transfer: ${res.status_code}`);
      }
      const raw = new TextDecoder().decode(new Uint8Array(res.body));
      console.log("raw", raw);
      const parsed = JSON.parse(raw);
      const txHash = parsed.txHash;
      setPaymentStatus(`✅ Pembayaran sukses: ${txHash}`);

      // Update balances
      await fetchCallerBalance(identity, callerAddress);
      await fetchCanisterBalance(identity, canisterAddress);
    } catch (err) {
      console.error(err);
      setPaymentStatus("❌ Gagal memproses pembayaran");
    }
  }

  // ====== Airdrop dari Faucet ======
  async function handleAirdrop() {
    if (!callerAddress) {
      alert("Alamat belum tersedia. Login dulu.");
      return;
    }

    try {
      setAirdropStatus("🚀 Mengirim airdrop ETH...");

      const res = await fetch(
        `${
          import.meta.env.VITE_CANISTER_ORIGIN
        }/transfer-from-sepolia-faucet-wallet`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: callerAddress,
            value: "0.01", // jumlah ETH airdrop
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Airdrop gagal");
      }

      setAirdropStatus(`✅ Airdrop sukses! Tx Hash: ${data.txHash}`);

      // Update saldo setelah airdrop
      await fetchCallerBalance(identity, callerAddress);
    } catch (err) {
      console.error(err);
      setAirdropStatus("❌ Gagal airdrop ETH");
    }
  }

  // ====== Render ======
  return (
    <div style={{ padding: "20px" }}>
      <h1>💳 Halaman Pembayaran</h1>

      {identity ? (
        <>
          <div
            style={{
              marginBottom: "20px",
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              backgroundColor: "#f9f9f9",
            }}
          >
            <p>
              <strong>Principal:</strong> {identity.getPrincipal().toString()}
            </p>
            <p>
              <strong>Alamat Caller:</strong> {callerAddress || "-"}
            </p>
            <p>
              <strong>Saldo:</strong> {callerBalance || "-"}
            </p>
            <p>
              <strong>Alamat Pembayaran:</strong> {canisterAddress || "-"}
            </p>
            <p>
              <strong>Saldo Pembayaran:</strong> {canisterBalance || "-"}
            </p>

            <button
              onClick={logout}
              style={{
                marginTop: "10px",
                padding: "8px 15px",
                backgroundColor: "#ff4d4f",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>

          <h2>Airdrop ETH</h2>
          <button onClick={handleAirdrop}>💸 Airdrop 0.01 ETH</button>
          <p>{airdropStatus}</p>
          <div
            style={{
              flex: 2,
              padding: "15px",
              border: "1px solid #ddd",
              borderRadius: "10px",
              backgroundColor: "#fffbe6",
            }}
          >
            <h2>Form Pembayaran</h2>
            <p>jumlah: {amount} ETH</p>

            <button
              onClick={handlePayment}
              style={{
                padding: "8px 15px",
                backgroundColor: "#52c41a",
                color: "#fff",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Bayar Sekarang
            </button>
          </div>

          {paymentStatus && <p>{paymentStatus}</p>}
        </>
      ) : (
        <p>🔑 Silakan login menggunakan Internet Identity...</p>
      )}
    </div>
  );
}

export default Payment;
