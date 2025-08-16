// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "../../declarations/backend";

function Payment() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [callerAddress, setCallerAddress] = useState("");
  const [callerBalance, setCallerBalance] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [canisterBalance, setCanisterBalance] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [canisterAddress, setCanisterAddress] = useState("");
  const [airdropStatus, setAirdropStatus] = useState("");
  // Tambahkan state baru
  const [email, setEmail] = useState("");

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
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const callerRes = await actor.http_request_update({
        url: "/caller-address",
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (callerRes.status_code === 200) {
        const addr = new TextDecoder().decode(new Uint8Array(callerRes.body));
        const parsed = JSON.parse(addr);
        const address = parsed.address;
        setCallerAddress(address);
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
      const parsed = JSON.parse(raw);
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
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

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
      const parsed = JSON.parse(raw);
      const eth = Number(parsed.balance) / 1e18;
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
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const queryParams = new URLSearchParams({
        to: canisterAddress,
        value: amount,
        email: email, // kirim email ke backend
      }).toString();

      const res = await actor.http_request_update({
        url: `/payout?${queryParams}`,
        method: "GET",
        body: [],
        headers: [],
      });

      if (res.status_code !== 200) {
        throw new Error(`Gagal transfer: ${res.status_code}`);
      }
      const raw = new TextDecoder().decode(new Uint8Array(res.body));
      const parsed = JSON.parse(raw);
      const txHash = parsed.txHash;
      setPaymentStatus(`✅ Pembayaran sukses: ${txHash}`);

      await fetchCallerBalance(identity, callerAddress);
      await fetchCanisterBalance(identity, canisterAddress);
    } catch (err) {
      console.error(err);
      setPaymentStatus("❌ Gagal memproses pembayaran");
    }
  }

  // ====== Airdrop ======
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to: callerAddress, value: "0.01" }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Airdrop gagal");

      setAirdropStatus(`✅ Airdrop sukses! Tx Hash: ${data.txHash}`);
      await fetchCallerBalance(identity, callerAddress);
    } catch (err) {
      console.error(err);
      setAirdropStatus("❌ Gagal airdrop ETH");
    }
  }

  // ====== Styles ======
  const containerStyle = {
    padding: "30px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const cardStyle = {
    marginBottom: "20px",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "12px",
    backgroundColor: "#fefefe",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
  };

  const buttonStyle = {
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    transition: "all 0.2s",
  };

  const logoutButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#ff4d4f",
    color: "#fff",
    marginTop: "15px",
  };

  const paymentButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#52c41a",
    color: "#fff",
  };

  const airdropButtonStyle = {
    ...buttonStyle,
    backgroundColor: "#1890ff",
    color: "#fff",
    marginBottom: "10px",
  };

  const sectionStyle = { marginBottom: "25px" };

  return (
    <div style={containerStyle}>
      <h1 style={{ marginBottom: "25px" }}>💳 Halaman Pembayaran</h1>

      {identity ? (
        <>
          <div style={cardStyle}>
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

            <button style={logoutButtonStyle} onClick={logout}>
              Logout
            </button>
          </div>

          <div style={sectionStyle}>
            <h2>Airdrop ETH</h2>
            <button style={airdropButtonStyle} onClick={handleAirdrop}>
              💸 Airdrop 0.01 ETH
            </button>
            <p>{airdropStatus}</p>
          </div>

          <div style={{ ...cardStyle, backgroundColor: "#fffbe6" }}>
            <h2>Form Pembayaran</h2>

            <label style={{ display: "block", marginBottom: "8px" }}>
              Email untuk notifikasi:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid #ccc",
                marginBottom: "12px",
              }}
            />

            <p>Jumlah: {amount} ETH</p>
            <button style={paymentButtonStyle} onClick={handlePayment}>
              Bayar Sekarang
            </button>
            {paymentStatus && (
              <p style={{ marginTop: "10px" }}>{paymentStatus}</p>
            )}
          </div>
        </>
      ) : (
        <p>🔑 Silakan login menggunakan Internet Identity...</p>
      )}
    </div>
  );
}

export default Payment;
