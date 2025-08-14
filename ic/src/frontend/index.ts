// @ts-nocheck

import { Identity } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';
import { toJwt } from 'azle/experimental/http_client';
import { html, LitElement } from 'lit';
import { HttpAgent, Actor } from "@dfinity/agent";
import { customElement, property } from 'lit/decorators.js';
import { createActor,canisterId } from "../declarations/backend"
import fetch from "isomorphic-fetch";
import { idlFactory as whoami_idl } from "../declarations/backend/backend.did.js"
@customElement('azle-app')
export class AzleApp extends LitElement {
    @property()
    identity: Identity | null = null;

    @property()
    whoami: string = '';

    @property()
    chatMessage: string = "What's the balance of address tb1qexample1234567890?";

    @property()
    chatResponse: string = "";
    connectedCallback(): void {
        super.connectedCallback();
        this.authenticate();
    }
async sendChat(): Promise<void> {
    try {
        const response = await fetch("http://0.0.0.0:8001/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: this.chatMessage })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Chat response:", data);
        this.chatResponse = typeof data === "string" ? data : JSON.stringify(data);
    } catch (error) {
        console.error("Failed to send chat:", error);
        this.chatResponse = "Error sending chat";
    }
}
    async authenticate(): Promise<void> {
        const authClient = await AuthClient.create();
        const isAuthenticated = await authClient.isAuthenticated();

        if (isAuthenticated === true) {
            this.handleIsAuthenticated(authClient);
        } else {
            await this.handleIsNotAuthenticated(authClient);
        }
    }

    handleIsAuthenticated(authClient: AuthClient): void {
        this.identity = authClient.getIdentity();
    }

    async handleIsNotAuthenticated(authClient: AuthClient): Promise<void> {
        await new Promise((resolve, reject) => {
            authClient.login({
                identityProvider: import.meta.env.VITE_IDENTITY_PROVIDER,
                onSuccess: resolve as () => void,
                onError: reject,
                windowOpenerFeatures: `width=500,height=500`
            });
        });

        this.identity = authClient.getIdentity();
        const agent = new HttpAgent({
    identity: this.identity,
  });
  await agent.fetchRootKey();
   const whoamiActor = createActor("x3gbg-37777-77774-qaakq-cai", {
        agent,
    });

    const principal = await whoamiActor.whoami();
    console.log("✅ Authenticated as:", principal.toString());

      const args = {
    url: "/caller-address",
    method: "GET",
    body: new Uint8Array([]), // no body for GET
    headers: [],
  };
    
      const res = await whoamiActor.http_request_update(args);
      console.log(res)
        const bodyText = new TextDecoder().decode(new Uint8Array(res.body));

  console.log("Status:", res.status_code);
  console.log("Headers:", res.headers);
  console.log("Body:", bodyText);
    }
    async whoamiUnauthenticated(): Promise<void> {
        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/whoami`
        );
        const responseText = await response.text();

        this.whoami = responseText;
    }
async caller(){
          const response = await fetch(`${import.meta.env.VITE_CANISTER_ORIGIN}/caller-address`, {
                headers: [['X-Ic-Force-Update', 'true'],['Authorization', toJwt(this.identity)]]
            });
             const responseText = await response.text();
              this.whoami = responseText;
}
 async headersArray(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/headers-array`,
            {
                method: 'GET',
                headers: [
                    ['Authorization', toJwt(this.identity)],
                    ['X-Azle-Request-Key-0', 'X-Azle-Request-Value-0'],
                    ['X-Azle-Request-Key-1', 'X-Azle-Request-Value-1'],
                    ['X-Azle-Request-Key-2', 'X-Azle-Request-Value-2']
                ]
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            responseJson.value['X-Azle-Request-Key-0'.toLowerCase()] ===
                'X-Azle-Request-Value-0' &&
            responseJson.value['X-Azle-Request-Key-1'.toLowerCase()] ===
                'X-Azle-Request-Value-1' &&
            responseJson.value['X-Azle-Request-Key-2'.toLowerCase()] ===
                'X-Azle-Request-Value-2' &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).headersArraySuccess = true;
        }
    }

    async headersObject(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/headers-object`,
            {
                method: 'GET',
                headers: {
                    Authorization: toJwt(this.identity),
                    'X-Azle-Request-Key-0': 'X-Azle-Request-Value-0',
                    'X-Azle-Request-Key-1': 'X-Azle-Request-Value-1',
                    'X-Azle-Request-Key-2': 'X-Azle-Request-Value-2'
                }
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            responseJson.value['X-Azle-Request-Key-0'.toLowerCase()] ===
                'X-Azle-Request-Value-0' &&
            responseJson.value['X-Azle-Request-Key-1'.toLowerCase()] ===
                'X-Azle-Request-Value-1' &&
            responseJson.value['X-Azle-Request-Key-2'.toLowerCase()] ===
                'X-Azle-Request-Value-2' &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).headersObjectSuccess = true;
        }
    }

    async bodyUint8Array(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const textEncoder = new TextEncoder();
        const encodedText = textEncoder.encode(
            JSON.stringify({
                value: 'body-uint8array'
            })
        );

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/body-uint8array`,
            {
                method: 'POST',
                headers: [
                    ['Authorization', toJwt(this.identity)],
                    ['Content-Type', 'application/json']
                ],
                body: encodedText
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            JSON.stringify(responseJson.value) ===
                JSON.stringify({
                    value: 'body-uint8array'
                }) &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).bodyUint8ArraySuccess = true;
        }
    }
async fetchDummyData(): Promise<void> {
    try {
        const response = await fetch("https://jsonplaceholder.typicode.com/posts/1");

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dummy data:", data);

        this.whoami = `Title: ${data.title}`;
    } catch (error) {
        console.error("Failed to fetch dummy data:", error);
        this.whoami = "Error fetching dummy data";
    }
}

    async bodyString(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/body-string`,
            {
                method: 'PUT',
                headers: [
                    ['Authorization', toJwt(this.identity)],
                    ['Content-Type', 'application/json']
                ],
                body: JSON.stringify({
                    value: 'body-string'
                })
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            JSON.stringify(responseJson.value) ===
                JSON.stringify({
                    value: 'body-string'
                }) &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).bodyStringSuccess = true;
        }
    }

    async bodyArrayBuffer(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const textEncoder = new TextEncoder();
        const encodedText = textEncoder.encode(
            JSON.stringify({
                value: 'body-array-buffer'
            })
        );

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/body-array-buffer`,
            {
                method: 'PATCH',
                headers: [
                    ['Authorization', toJwt(this.identity)],
                    ['Content-Type', 'application/json']
                ],
                body: encodedText
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            JSON.stringify(responseJson.value) ===
                JSON.stringify({
                    value: 'body-array-buffer'
                }) &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).bodyArrayBufferSuccess = true;
        }
    }

    async bodyBlob(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const textEncoder = new TextEncoder();
        const encodedText = textEncoder.encode(
            JSON.stringify({
                value: 'body-blob'
            })
        );

        const blob = new Blob([encodedText], { type: 'application/json' });

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/body-blob`,
            {
                method: 'DELETE',
                headers: [
                    ['Authorization', toJwt(this.identity)],
                    ['Content-Type', 'application/json']
                ],
                body: blob
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            JSON.stringify(responseJson.value) ===
                JSON.stringify({
                    value: 'body-blob'
                }) &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).bodyBlobSuccess = true;
        }
    }

    async bodyDataView(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const textEncoder = new TextEncoder();
        const encodedText = textEncoder.encode(
            JSON.stringify({
                value: 'body-data-view'
            })
        );

        const dataView = new DataView(encodedText.buffer);

        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/body-data-view`,
            {
                method: 'POST',
                headers: [
                    ['Authorization', toJwt(this.identity)],
                    ['Content-Type', 'application/json']
                ],
                body: dataView
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            JSON.stringify(responseJson.value) ===
                JSON.stringify({
                    value: 'body-data-view'
                }) &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).bodyDataViewSuccess = true;
        }
    }

    async urlQueryParamsGet(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const response = await fetch(
            `${
                import.meta.env.VITE_CANISTER_ORIGIN
            }/url-query-params-get?type=get`,
            {
                headers: [['Authorization', toJwt(this.identity)]]
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            responseJson.value.type === 'get' &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).urlQueryParamsGetSuccess = true;
        }
    }

    async urlQueryParamsPost(): Promise<void> {
        if (this.identity === null) {
            throw new Error(`Identity must be defined`);
        }

        const response = await fetch(
            `${
                import.meta.env.VITE_CANISTER_ORIGIN
            }/url-query-params-post?type=post`,
            {
                method: 'POST',
                headers: [['Authorization', toJwt(this.identity)]]
            }
        );
        const responseJson = await response.json();

        if (
            responseJson.whoami === this.identity.getPrincipal().toString() &&
            responseJson.value.type === 'post' &&
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).urlQueryParamsPostSuccess = true;
        }
    }

    async notAuthorizedGet(): Promise<void> {
        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/not-authorized-get`,
            {
                headers: [['Authorization', toJwt(this.identity)]]
            }
        );

        if (response.status === 401) {
            (window as any).notAuthorizedGetSuccess = true;
        }
    }

    async notAuthorizedPost(): Promise<void> {
        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/not-authorized-post`,
            {
                method: 'POST',
                headers: [['Authorization', toJwt(this.identity)]]
            }
        );

        if (response.status === 401) {
            (window as any).notAuthorizedPostSuccess = true;
        }
    }

    async head(): Promise<void> {
        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/head`,
            {
                method: 'HEAD',
                headers: [['Authorization', toJwt(this.identity)]]
            }
        );

        if (
            response.headers.get('X-Azle-Response-Key-0') ===
                'X-Azle-Response-Value-0' &&
            response.headers.get('X-Azle-Response-Key-1') ===
                'X-Azle-Response-Value-1' &&
            response.headers.get('X-Azle-Response-Key-2') ===
                'X-Azle-Response-Value-2'
        ) {
            (window as any).headSuccess = true;
        }
    }

    async options(): Promise<void> {
        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/options`,
            {
                method: 'OPTIONS',
                headers: [['Authorization', toJwt(this.identity)]]
            }
        );

        if (
            response.headers.get('X-Azle-Response-Key-Options') ===
            'X-Azle-Response-Value-Options'
        ) {
            (window as any).optionsSuccess = true;
        }
    }

 async whoamiAuthenticated(): Promise<void> {
    try {
        console.log(this.identity);
        const response = await fetch(
            `${import.meta.env.VITE_CANISTER_ORIGIN}/whoami`,
            {
                method: 'GET',
                headers: [['X-Ic-Force-Update', 'true'],['Authorization', toJwt(this.identity)]],
            }
        );
        console.log(response)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const responseText = await response.text();
        this.whoami = responseText;
    } catch (error) {
        console.error('Failed to fetch whoami:', error);
        this.whoami = 'Error fetching whoami';
    }
}

    async logout(): Promise<void> {
  const authClient = await AuthClient.create();
  await authClient.logout();
  this.identity = null;
  this.whoami = '';
  // Optionally, refresh UI or redirect user
}


    render(): any {
        return html`
            <h1>Internet Identity</h1>

            <h2>
                Whoami principal:
                <span id="whoamiPrincipal">${this.whoami}</span>
            </h2>

            <button
                id="whoamiUnauthenticated"
                @click=${this.whoamiUnauthenticated}
            >
                Whoami Unauthenticated
            </button>
            <button
                id="whoamiAuthenticated"
                @click=${this.whoamiAuthenticated}
                .disabled=${this.identity === null}
            >
                Whoami Authenticated
            </button>
                 <button
                id="caller"
                @click=${this.caller}
                .disabled=${this.identity === null}
            >
                caller address
            </button>
            <button
  id="logout"
  @click=${this.logout}
  .disabled=${this.identity === null}
>
  Logout
</button>
   <div>
                <button
                    id="headersArrayButton"
                    @click=${this.headersArray}
                >
                    Headers Array
                </button>
            </div>

            <br />

            <div>
                <button
                    id="headersObjectButton"
                    @click=${this.headersObject}
                >
                    Headers Object
                </button>
            </div>

            <br />

            <div>
                <button
                    id="bodyUint8ArrayButton"
                    @click=${this.bodyUint8Array}
                >
                    Body Uint8Array
                </button>
            </div>

            <br />

            <div>
                <button
                    id="bodyStringButton"
                    @click=${this.bodyString}
                >
                    Body String
                </button>
            </div>

            <br />

            <div>
                <button
                    id="bodyArrayBufferButton"
                    @click=${this.bodyArrayBuffer}
                >
                    Body ArrayBuffer
                </button>
            </div>

            <br />

            <div>
                <button
                    id="bodyBlobButton"
                    @click=${this.bodyBlob}
                >
                    Body Blob
                </button>
            </div>

            <br />

            <div>
                <button
                    id="bodyDataViewButton"
                    @click=${this.bodyDataView}
                >
                    Body DataView
                </button>
            </div>

            <br />

            <div>
                <button
                    id="urlQueryParamsGetButton"
                    @click=${this.urlQueryParamsGet}
                >
                    Url Query Params GET
                </button>
            </div>

            <br />

            <div>
                <button
                    id="urlQueryParamsPostButton"
                    @click=${this.urlQueryParamsPost}
                >
                    Url Query Params POST
                </button>
            </div>

            <br />

            <div>
                <button
                    id="notAuthorizedGetButton"
                    @click=${this.notAuthorizedGet}
                >
                    Not Authorized GET
                </button>
            </div>

            <br />

            <div>
                <button
                    id="notAuthorizedPostButton"
                    @click=${this.notAuthorizedPost}
                >
                    Not Authorized POST
                </button>
            </div>

            <br />

            <div>
                <button
                    id="headButton"
                    @click=${this.head}
                >
                    HEAD
                </button>
            </div>

            <br />

            <div>
                <button
                    id="optionsButton"
                    @click=${this.options}
                >
                    OPTIONS
                </button>
            </div>
            <button
    id="fetchDummyData"
    @click=${this.fetchDummyData}
>
    Fetch Dummy Data
</button>
<div>
    <h3>Chat</h3>
    <input
        type="text"
        .value=${this.chatMessage}
        @input=${(e: any) => (this.chatMessage = e.target.value)}
        style="width: 400px;"
    />
    <button @click=${this.sendChat}>Send</button>
    <div style="margin-top: 10px;">
        <strong>Response:</strong>
        <pre>${this.chatResponse}</pre>
    </div>
</div>

        `;
    }
}