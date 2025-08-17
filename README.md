# Eventverse 
![tag:innovationlab](https://img.shields.io/badge/innovationlab-3D8BD3)

Eventverse is an AI-powered event management agent built on the Internet Computer (ICP). It leverages **ASI1 AI API** for natural language understanding and **ICP canisters** for managing events. Users can query events, get event details, generate payment links, and interact via both REST API and chat protocols.

---

## Features

- **Create events** on ICP canisters.
- **Retrieve events** with optional pagination (`limit` & `offset`).
- **Get event details** by ID.
- **Generate payment links** for events.
- **Retrieve canister address** for the event management system.
- **AI-powered chat interface** for natural language queries.
- **REST API endpoint** for chat queries.

---

## Requirements

- Python 3.10+
- `.env` file with the following key:
  ```text
  ASI1_API_KEY=your_asi1_api_key_here


* Installed Python packages:

  ```bash
  pip install requests python-dotenv uagents-core uagents
  ```

---

## Configuration

* **ASI1 API**

  * API key is loaded from `.env`.
  * Base URL: `https://api.asi1.ai/v1`.
* **ICP Canister**

  * Canister ID: `w7lou-c7777-77774-qaamq-cai`.
  * Local testing URL: `http://127.0.0.1:4943`.

---

## Available Tools / Functions

1. **create\_event**

   * Create a new event.
   * Required: `name`, `date`, `location`, `price`.
   * Optional: `capacity`.

2. **get\_events**

   * Retrieve a list of events.
   * Optional: `limit`, `offset`.
   * Prices are returned in ETH.

3. **get\_event\_by\_id**

   * Fetch details of a specific event by ID.

4. **payment**

   * Generate a payment link for an event by ID.

5. **canister\_address**

   * Returns the ICP canister address.

---

## Usage

### REST API

Start the agent:

```bash
python main.py
```

**Endpoint:** `POST /chat`

**Request Body Example:**

```json
{
  "message": "Show me the upcoming events"
}
```

**Response Example:**

```json
{
  "status": "success",
  "message": "Here are the upcoming events..."
}
```

---

### Chat Protocol

* Supports `ChatMessage` and `ChatAcknowledgement`.
* Handles start session messages and normal text messages.
* AI-powered responses using `ASI1` and ICP tool calls.

---

## Sample Queries

**/get-events**

* List all events available.
* Show me the upcoming events.
* Can I get the events list with limit 5?

**/get-event-by-id**

* Get details of event with ID `ev12345`.
* Show me information for event `ev67890`.
* Can you fetch the event `ev99999` by its ID?

**/payment**

* Generate a payment link for event `ev12345`.
* I want to pay for event `ev67890`.
* Show me the payment link for event `ev99999`.

**/canister-address**

* What is the ICP canister address for events?
* Give me the canister address.
* Show me the address of this event management canister.


---

## License

MIT License



