// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "../../declarations/backend";
import { useParams } from "react-router-dom";
import "./Payment.css"; // we'll define hover styles here

function Payment() {
  const { eventId } = useParams();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [callerAddress, setCallerAddress] = useState("");
  const [callerBalance, setCallerBalance] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [canisterBalance, setCanisterBalance] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [canisterAddress, setCanisterAddress] = useState("");
  const [airdropStatus, setAirdropStatus] = useState("");
  const [email, setEmail] = useState("");
  const [eventDetail, setEventDetail] = useState(null);

  useEffect(() => {
    authenticateAndFetch();
  }, []);

  async function authenticateAndFetch() {
    try {
      const authClient = await AuthClient.create();
      let id: Identity;

      if (await authClient.isAuthenticated()) {
        id = authClient.getIdentity();
      } else {
        await new Promise((resolve, reject) => {
          authClient.login({
            identityProvider: import.meta.env.VITE_IDENTITY_PROVIDER,
            onSuccess: resolve,
            onError: reject,
            windowOpenerFeatures: `width=500,height=500`,
          });
        });
        id = authClient.getIdentity();
      }

      setIdentity(id);

      const agent = new HttpAgent({ identity: id });
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      await Promise.all([
        fetchCallerAndBalance(actor),
        fetchCanisterAndBalance(actor),
        eventId ? fetchEventDetail(actor, eventId) : Promise.resolve(null),
      ]);
    } catch (err) {
      console.error("Authentication/Fetch error:", err);
    }
  }

  async function fetchEventDetail(actor, eventId: string) {
    try {
      const res = await actor.http_request_update({
        url: `/events/${eventId}`,
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(raw);
        setEventDetail(parsed);
        setAmount(parsed.price);
      }
    } catch (err) {
      console.error("Gagal fetch event:", err);
    }
  }

  async function fetchCallerAndBalance(actor) {
    try {
      const res = await actor.http_request_update({
        url: "/caller-address",
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code === 200) {
        const addr = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(addr);
        const address = parsed.address;
        setCallerAddress(address);
        await fetchCallerBalance(actor, address);
      }
    } catch (err) {
      console.error("Gagal ambil caller address:", err);
    }
  }

  async function fetchCallerBalance(actor, address: string) {
    try {
      setCallerBalance("🔄 Mengambil saldo...");
      const res = await actor.http_request_update({
        url: `/address-balance?address=${address}`,
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(raw);
        const eth = Number(parsed.balance) / 1e18;
        setCallerBalance(`💰 Saldo: ${eth} ETH`);
      } else {
        throw new Error(`Gagal fetch saldo: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      setCallerBalance("❌ Gagal mengambil saldo");
    }
  }

  async function fetchCanisterAndBalance(actor) {
    try {
      const res = await actor.http_request_update({
        url: "/canister-address",
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code === 200) {
        const addr = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(addr);
        const address = parsed.address;
        setCanisterAddress(address);
        await fetchCanisterBalance(actor, address);
      }
    } catch (err) {
      console.error("Gagal ambil canister address:", err);
    }
  }

  async function fetchCanisterBalance(actor, address: string) {
    try {
      setCanisterBalance("🔄 Mengambil saldo...");
      const res = await actor.http_request_update({
        url: `/address-balance?address=${address}`,
        method: "GET",
        body: new Uint8Array([]),
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(raw);
        const eth = Number(parsed.balance) / 1e18;
        setCanisterBalance(`💰 Saldo: ${eth} ETH`);
      } else {
        throw new Error(`Gagal fetch saldo: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      setCanisterBalance("❌ Gagal mengambil saldo");
    }
  }

  async function logout() {
    const authClient = await AuthClient.create();
    await authClient.logout();
    setIdentity(null);
    setCallerAddress("");
    setPaymentStatus("");
  }

  async function handlePayment() {
    if (!identity) {
      alert("Login terlebih dahulu sebelum melakukan pembayaran");
      return;
    }

    try {
      setPaymentStatus("Memproses pembayaran...");
      const agent = new HttpAgent({ identity });
      await agent.fetchRootKey();
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const queryParams = new URLSearchParams({
        eventId: eventId,
        email: email,
      }).toString();

      const res = await actor.http_request_update({
        url: `/payout?${queryParams}`,
        method: "GET",
        body: [],
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(raw);
        const txHash = parsed.txHash;
        setPaymentStatus(`✅ Pembayaran sukses: ${txHash}`);

        await fetchCallerBalance(actor, callerAddress);
        await fetchCanisterBalance(actor, canisterAddress);
      } else {
        throw new Error(`Gagal transfer: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      setPaymentStatus("❌ Gagal memproses pembayaran");
    }
  }

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
      const agent = new HttpAgent({ identity });
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });
      await fetchCallerBalance(actor, callerAddress);
    } catch (err) {
      console.error(err);
      setAirdropStatus("❌ Gagal airdrop ETH");
    }
  }

  const containerStyle = {
    padding: "30px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: "600px",
    margin: "0 auto",
    backgroundColor: "var(--primary-color)",
    color: "var(--text-color)",
    minHeight: "100vh",
  };

  const cardStyle = {
    marginBottom: "20px",
    padding: "20px",
    borderRadius: "12px",
    backgroundColor: "var(--secondary-color)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
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
            <button className="btn logout" onClick={logout}>
              Logout
            </button>
          </div>

          {eventDetail && (
            <div style={{ ...cardStyle, backgroundColor: "#2a2a2a" }}>
              <h2 style={{ color: "var(--subheading-color)" }}>Detail Event</h2>
              <p>
                <strong>Nama Event:</strong> {eventDetail.name}
              </p>
              <p>
                <strong>Tanggal:</strong> {eventDetail.date}
              </p>
              <p>
                <strong>Lokasi:</strong> {eventDetail.location}
              </p>
              <p>
                <strong>Harga:</strong> {eventDetail.price} ETH
              </p>
            </div>
          )}

          <div style={{ ...cardStyle, backgroundColor: "#2a2a2a" }}>
            <h2 style={{ color: "var(--subheading-color)" }}>
              Form Pembayaran
            </h2>
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
                padding: "10px",
                borderRadius: "6px",
                border: "1px solid #555",
                backgroundColor: "#1f1f1f",
                color: "var(--text-color)",
                marginBottom: "12px",
              }}
            />
            <p>Jumlah: {amount} ETH</p>
            <button className="btn payment" onClick={handlePayment}>
              Bayar Sekarang
            </button>
            {paymentStatus && (
              <p style={{ marginTop: "10px" }}>{paymentStatus}</p>
            )}
          </div>

          <div style={sectionStyle}>
            <h2 style={{ color: "var(--subheading-color)" }}>Airdrop ETH</h2>
            <button className="btn airdrop" onClick={handleAirdrop}>
              💸 Airdrop 0.01 ETH
            </button>
            <p>{airdropStatus}</p>
          </div>
        </>
      ) : (
        <p>🔑 Silakan login menggunakan Internet Identity...</p>
      )}
    </div>
  );
}

export default Payment;
