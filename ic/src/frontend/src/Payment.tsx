// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "../../declarations/backend";
import { useParams } from "react-router-dom";

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
  const [isLightMode, setIsLightMode] = useState(true);
  const toggleTheme = () => setIsLightMode((prev) => !prev);
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
        body: new Uint8Array([1]),
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

  return (
    <div
      className={`${
        isLightMode ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-100"
      } min-h-screen p-6 transition-colors duration-300`}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">💳 Halaman Pembayaran</h1>
        <button
          onClick={toggleTheme}
          className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
            isLightMode
              ? "bg-gray-300 text-gray-900"
              : "bg-gray-800 text-gray-100"
          }`}
        >
          {isLightMode ? "Dark Mode" : "Light Mode"}
        </button>
      </div>

      {identity ? (
        <>
          {/* Info Principal & Saldo */}
          <div
            className={`p-6 rounded-xl shadow mb-6 transition-colors duration-300 ${
              isLightMode ? "bg-white shadow-md" : "bg-gray-800 shadow-lg"
            }`}
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
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>

          {/* Detail Event */}
          {eventDetail && (
            <div
              className={`p-6 rounded-xl shadow mb-6 transition-colors duration-300 ${
                isLightMode ? "bg-white shadow-md" : "bg-gray-800 shadow-lg"
              }`}
            >
              <h2 className="text-xl font-semibold mb-2">Detail Event</h2>
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
              <p>
                <strong>Capacity:</strong> {eventDetail.capacity} People
              </p>
            </div>
          )}

          {/* Form Pembayaran */}
          <div
            className={`p-6 rounded-xl shadow mb-6 transition-colors duration-300 ${
              isLightMode ? "bg-white shadow-md" : "bg-gray-800 shadow-lg"
            }`}
          >
            <h2 className="text-xl font-semibold mb-2">Form Pembayaran</h2>
            <label className="block mb-2">Email untuk notifikasi:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`w-full p-3 rounded-lg mb-4 border focus:outline-none transition-colors duration-300 ${
                isLightMode
                  ? "bg-gray-100 border-gray-300 text-gray-900 focus:ring-2 focus:ring-indigo-500"
                  : "bg-gray-700 border-gray-600 text-gray-100 focus:ring-2 focus:ring-indigo-400"
              }`}
            />
            <p className="mb-2">Jumlah: {amount} ETH</p>
            <button
              onClick={handlePayment}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
            >
              Bayar Sekarang
            </button>
            {paymentStatus && <p className="mt-2">{paymentStatus}</p>}
          </div>

          {/* Airdrop */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Airdrop ETH</h2>
            <button
              onClick={handleAirdrop}
              className={`px-4 py-2 rounded-lg transition ${
                isLightMode
                  ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                  : "bg-yellow-700 hover:bg-yellow-600 text-gray-100"
              }`}
            >
              💸 Airdrop 0.01 ETH
            </button>
            <p className="mt-2">{airdropStatus}</p>
          </div>
        </>
      ) : (
        <p>🔑 Silakan login menggunakan Internet Identity...</p>
      )}
    </div>
  );
}

export default Payment;
