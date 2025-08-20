// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { createActor } from "../../declarations/backend";
import { useParams } from "react-router-dom";
import KtpOcr from "./ocr";
import { UltraHonkBackend } from "@aztec/bb.js";
import { CompiledCircuit, Noir } from "@noir-lang/noir_js";
import zk from "./assets/zk.json"; // path to your zk.json

function Payment() {
  const { eventId } = useParams();
  const [isProofValid, setIsProofValid] = useState(false);
  const [proofBlobUrl, setProofBlobUrl] = useState<string | null>(null);
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
      console.error("Failed to fetch event:", err);
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
      console.error("Failed to fetch caller address:", err);
    }
  }

  async function fetchCallerBalance(actor, address: string) {
    try {
      setCallerBalance("🔄 Fetching balance...");
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
        setCallerBalance(`💰 Balance: ${eth} ETH`);
      } else {
        throw new Error(`Failed to fetch balance: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      setCallerBalance("❌ Failed to fetch balance");
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
      console.error("Failed to fetch canister address:", err);
    }
  }

  async function fetchCanisterBalance(actor, address: string) {
    try {
      setCanisterBalance("🔄 Fetching balance...");
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
        setCanisterBalance(`💰 Balance: ${eth} ETH`);
      } else {
        throw new Error(`Failed to fetch balance: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      setCanisterBalance("❌ Failed to fetch balance");
    }
  }

  async function logout() {
    const authClient = await AuthClient.create();
    await authClient.logout();
    setIdentity(null);
    setCallerAddress("");
    setPaymentStatus("");
  }

  async function handlePayment(email: string) {
    if (!identity) {
      alert("Please login before making a payment.");
      return;
    }

    try {
      setPaymentStatus("Processing payment...");
      const agent = new HttpAgent({ identity });
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });

      const queryParams = new URLSearchParams({
        eventId: eventId,
        email: email,
      }).toString();

      const res = await actor.http_request_update({
        url: `/payments/payout?${queryParams}`,
        method: "POST",
        body: new TextEncoder().encode(JSON.stringify({ email })),
        headers: [],
      });

      if (res.status_code === 200) {
        const raw = new TextDecoder().decode(new Uint8Array(res.body));
        const parsed = JSON.parse(raw);
        const txHash = parsed.txHash;
        setPaymentStatus(`✅ Payment successful: ${txHash}`);

        await fetchCallerBalance(actor, callerAddress);
        await fetchCanisterBalance(actor, canisterAddress);
      } else {
        throw new Error(`Failed to transfer: ${res.status_code}`);
      }
    } catch (err) {
      console.error(err);
      setPaymentStatus("❌ Payment failed");
    }
  }

  async function handleAirdrop() {
    if (!callerAddress) {
      alert("Address not available. Please login first.");
      return;
    }

    try {
      setAirdropStatus("🚀 Sending ETH airdrop...");

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
      if (!res.ok) throw new Error(data.error || "Airdrop failed");

      setAirdropStatus(`✅ Airdrop successful! Tx Hash: ${data.txHash}`);
      const agent = new HttpAgent({ identity });
      const actor = createActor("w7lou-c7777-77774-qaamq-cai", { agent });
      await fetchCallerBalance(actor, callerAddress);
    } catch (err) {
      console.error(err);
      setAirdropStatus("❌ Airdrop failed");
    }
  }

  return (
    <div
      className={`${
        isLightMode ? "bg-gray-100 text-gray-900" : "bg-gray-900 text-gray-100"
      } min-h-screen p-6 transition-colors duration-300`}
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">💳 Payment Page</h1>
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
          {/* Principal & Balance Info */}
          <div
            className={`p-6 rounded-xl shadow mb-6 transition-colors duration-300 ${
              isLightMode ? "bg-white shadow-md" : "bg-gray-800 shadow-lg"
            }`}
          >
            <p>
              <strong>Principal:</strong> {identity.getPrincipal().toString()}
            </p>
            <p>
              <strong>Caller Address:</strong> {callerAddress || "-"}
            </p>
            <p>
              <strong>Balance:</strong> {callerBalance || "-"}
            </p>
            <p>
              <strong>Payment Address:</strong> {canisterAddress || "-"}
            </p>
            <p>
              <strong>Payment Balance:</strong> {canisterBalance || "-"}
            </p>
            <button
              onClick={logout}
              className="mt-4 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
            >
              Logout
            </button>
          </div>

          {/* Event Details */}
          {eventDetail && (
            <div
              className={`p-6 rounded-xl shadow mb-6 transition-colors duration-300 ${
                isLightMode ? "bg-white shadow-md" : "bg-gray-800 shadow-lg"
              }`}
            >
              <h2 className="text-xl font-semibold mb-2">Event Details</h2>
              <p>
                <strong>Event Name:</strong> {eventDetail.name}
              </p>
              <p>
                <strong>Date:</strong> {eventDetail.date}
              </p>
              <p>
                <strong>Location:</strong> {eventDetail.location}
              </p>
              <p>
                <strong>Price:</strong> {eventDetail.price} ETH
              </p>
              <p>
                <strong>Capacity:</strong> {eventDetail.capacity} People
              </p>
            </div>
          )}

          {/* Payment Form */}
          <div
            className={`p-6 rounded-xl shadow mb-6 transition-colors duration-300 ${
              isLightMode ? "bg-white shadow-md" : "bg-gray-800 shadow-lg"
            }`}
          >
            <h2 className="text-xl font-semibold mb-2">Payment Form</h2>

            {/* Show KtpOcr only if min_age >= 18 */}
            {eventDetail?.min_age >= 18 && (
              <KtpOcr
                onExtractBirthdate={async (dob) => {
                  const year = dob
                    ?.split("-")
                    .find((part) => part.length === 4);
                  if (!year) {
                    console.error("Year not found in date of birth.");
                    setIsProofValid(false);
                    return;
                  }

                  try {
                    const noir = new Noir(zk as CompiledCircuit);
                    const backend = new UltraHonkBackend(zk.bytecode);

                    const input = {
                      birth_year: year,
                      current_year: new Date().getFullYear().toString(),
                    };

                    const { witness } = await noir.execute(input);
                    const proof = await backend.generateProof(witness);
                    const isValid = await backend.verifyProof(proof);

                    setIsProofValid(isValid);

                    if (isValid) {
                      const blob = new Blob([JSON.stringify(proof)], {
                        type: "application/json",
                      });
                      const url = URL.createObjectURL(blob);
                      setProofBlobUrl(url);
                    }

                    console.log(
                      `Proof is ${isValid ? "valid" : "invalid"}... ✅`
                    );
                  } catch (e) {
                    console.log("error", e);
                    setIsProofValid(false);
                  }
                }}
              />
            )}

            <label className="block mb-2">Email for notifications:</label>
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
            <p className="mb-2">Amount: {amount} ETH</p>

            <button
              onClick={() => handlePayment(email)}
              disabled={eventDetail?.min_age >= 18 && !isProofValid}
              className={`px-4 py-2 rounded-lg text-white transition ${
                eventDetail?.min_age >= 18 && !isProofValid
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              Pay Now
            </button>
            {eventDetail?.min_age >= 18 && !isProofValid && (
              <p className="text-red-500 mt-2">
                🔒 Please verify your ID first
              </p>
            )}
            {paymentStatus && <p className="mt-2">{paymentStatus}</p>}
          </div>

          {/* Airdrop */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">ETH Airdrop</h2>
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
        <p>🔑 Please login using Internet Identity...</p>
      )}
    </div>
  );
}

export default Payment;
