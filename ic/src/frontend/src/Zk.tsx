// @ts-nocheck
import React, { useEffect } from "react";
import { UltraHonkBackend } from "@aztec/bb.js";
import { CompiledCircuit, Noir } from "@noir-lang/noir_js";
import zkJson from "./assets/zk.json"; // path to your zk.json

const ZKComponent = () => {
  useEffect(() => {
    const runZK = async () => {
      try {
        const noir = new Noir(zkJson as CompiledCircuit);
        const backend = new UltraHonkBackend(zkJson.bytecode);

        const input = {
          birth_year: "2000",
          current_year: new Date().getFullYear().toString(),
        };

        const { witness } = await noir.execute(input);
        const proof = await backend.generateProof(witness);
        console.log("Proof :", proof);
        const isValid = await backend.verifyProof(proof);
        console.log("Proof valid locally:", isValid);

        // Send proof to backend
        const response = await fetch(
          "http://w7lou-c7777-77774-qaamq-cai.raw.localhost:4943/zk",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proof }),
          }
        );
        console.log("Proof :", response);
        const result = await response.json();
        console.log("Server verification result:", result);
      } catch (err) {
        console.error("Error running ZK circuit:", err);
      }
    };

    runZK();
  }, []);

  return <div>ZK Component Running… Check console for output.</div>;
};

export default ZKComponent;
