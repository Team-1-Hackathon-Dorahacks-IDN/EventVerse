// @ts-nocheck
import React, { useEffect, useState } from "react";
import { Identity, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { toJwt } from "azle/experimental/http_client";
import { createActor } from "../../declarations/backend";
import fetch from "isomorphic-fetch";

function Payment() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [whoami, setWhoami] = useState("");

  useEffect(() => {
    authenticate();
  }, []);

  async function authenticate() {
    const authClient = await AuthClient.create();
    const isAuthenticated = await authClient.isAuthenticated();
    if (isAuthenticated) {
      setIdentity(authClient.getIdentity());
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

    const agent = new HttpAgent({ identity: id });
    await agent.fetchRootKey();
    const whoamiActor = createActor("x3gbg-37777-77774-qaakq-cai", { agent });
    const principal = await whoamiActor.whoami();
    console.log("✅ Authenticated as:", principal.toString());
    const args1 = {
      url: "/canister-address",
      method: "GET",
      body: new Uint8Array([]),
      headers: [],
    };
    const res = await whoamiActor.http_request_update(args1);

    const address = new TextDecoder().decode(new Uint8Array(res.body));
    console.log("Canister address:", address);
    const args = {
      url: "/caller-address",
      method: "GET",
      body: new Uint8Array([]),
      headers: [],
    };
    try {
      const res = await whoamiActor.http_request_update(args);

      if (res.status_code !== 200) {
        throw new Error(`Server returned ${res.status_code}`);
      }

      const address = new TextDecoder().decode(new Uint8Array(res.body));
      console.log("Caller address:", address);
    } catch (err) {
      console.error("Failed to fetch caller address:", err);
    }
  }

  async function whoamiUnauthenticated() {
    const response = await fetch(
      `${import.meta.env.VITE_CANISTER_ORIGIN}/whoami`
    );
    setWhoami(await response.text());
  }

  async function caller() {
    const response = await fetch(
      `${import.meta.env.VITE_CANISTER_ORIGIN}/caller-address`,
      {
        headers: [
          ["X-Ic-Force-Update", "true"],
          ["Authorization", toJwt(identity)],
        ],
      }
    );
    setWhoami(await response.text());
  }

  async function fetchDummyData() {
    try {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts/1"
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setWhoami(`Title: ${data.title}`);
    } catch (error) {
      console.error("Failed to fetch dummy data:", error);
      setWhoami("Error fetching dummy data");
    }
  }

  async function whoamiAuthenticated() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_CANISTER_ORIGIN}/whoami`,
        {
          method: "GET",
          headers: [
            ["X-Ic-Force-Update", "true"],
            ["Authorization", toJwt(identity)],
          ],
        }
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      setWhoami(await response.text());
    } catch (error) {
      console.error("Failed to fetch whoami:", error);
      setWhoami("Error fetching whoami");
    }
  }

  async function logout() {
    const authClient = await AuthClient.create();
    await authClient.logout();
    setIdentity(null);
    setWhoami("");
  }

  return (
    <div>
      <h1>Internet Identity</h1>
      <h2>
        Whoami principal: <span>{whoami}</span>
      </h2>

      <button onClick={whoamiUnauthenticated}>Whoami Unauthenticated</button>
      <button onClick={whoamiAuthenticated} disabled={!identity}>
        Whoami Authenticated
      </button>
      <button onClick={caller} disabled={!identity}>
        caller address
      </button>
      <button onClick={logout} disabled={!identity}>
        Logout
      </button>
      <button onClick={fetchDummyData}>Fetch Dummy Data</button>
    </div>
  );
}

export default Payment;
