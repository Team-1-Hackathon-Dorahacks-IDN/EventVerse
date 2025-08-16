import os
import requests
import json
from dotenv import load_dotenv
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec,
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    StartSessionContent,
)
from uagents import Agent, Context, Protocol, Model
from datetime import datetime, timezone, timedelta
from uuid import uuid4
load_dotenv()
# ASI1 API settings
ASI1_API_KEY = os.getenv("ASI1_API_KEY") # Replace with your ASI1 key
ASI1_BASE_URL = "https://api.asi1.ai/v1"
ASI1_HEADERS = {
    "Authorization": f"Bearer {ASI1_API_KEY}",
    "Content-Type": "application/json"
}

CANISTER_ID = "w7lou-c7777-77774-qaamq-cai"
BASE_URL = "http://127.0.0.1:4943"

HEADERS = {
    "Host": f"{CANISTER_ID}.localhost",
    "Content-Type": "application/json"
}

HEADERSUPDATE = {
    "Host": f"{CANISTER_ID}.localhost",
    "Content-Type": "application/json",
    'X-Ic-Force-Update': 'true'
}

# Function definitions for ASI1 function calling
tools = [
    {
    "type": "function",
    "function": {
        "name": "create_event",
        "description": "Create a new event in the ICP canister",
        "parameters": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Name of the event"},
                "date": {"type": "string", "description": "Date of the event"},
                "location": {"type": "string", "description": "Location of the event"},
                "price": {"type": "string", "description": "Price of the event but dont add any currency"}
            },
            "required": ["name", "date", "location", "price"],
            "additionalProperties": False
        },
        "strict": True
    }
},
     {
        "type": "function",
        "function": {
            "name": "get_events",
            "description": "Get the list of events from the ICP canister please always use ETH for event's price",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "number",
                        "description": "Limit the number of events returned"
                    },
                    "offset": {
                        "type": "number",
                        "description": "Skip this many events from the start"
                    }
                },
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
 {
    "type": "function",
    "function": {
        "name": "get_event_by_id",
        "description": "Get details of a specific event by its ID",
        "parameters": {
            "type": "object",
            "properties": {
                "eventId": {"type": "string", "description": "ID of the event"}
            },
            "required": ["eventId"],
            "additionalProperties": False
        },
        "strict": True
    }
},

      {
        "type": "function",
        "function": {
            "name": "canister_address",
            "description": "Returns the address of this canister",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
     {
    "type": "function",
    "function": {
        "name": "payment",
        "description": "Returns the payment link for a given event",
        "parameters": {
            "type": "object",
            "properties": {
                "eventId": {
                    "type": "string",
                    "description": "ID of the event to pay for"
                }
            },
            "required": ["eventId"],
            "additionalProperties": False
        },
        "strict": True
    }
}
,
    {
        "type": "function",
        "function": {
            "name": "get_current_fee_percentiles",
            "description": "Gets the 100 fee percentiles measured in millisatoshi/byte.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_balance",
            "description": "Returns the balance of a given Bitcoin address.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {
                        "type": "string",
                        "description": "The Bitcoin address to check."
                    }
                },
                "required": ["address"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_utxos",
            "description": "Returns the UTXOs of a given Bitcoin address.",
            "parameters": {
                "type": "object",
                "properties": {
                    "address": {
                        "type": "string",
                        "description": "The Bitcoin address to fetch UTXOs for."
                    }
                },
                "required": ["address"],
                "additionalProperties": False
            },
            "strict": True
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send",
            "description": "Sends satoshis from this canister to a specified address.",
            "parameters": {
                "type": "object",
                "properties": {
                    "destinationAddress": {
                        "type": "string",
                        "description": "The destination Bitcoin address."
                    },
                    "amountInSatoshi": {
                        "type": "number",
                        "description": "Amount to send in satoshis."
                    }
                },
                "required": ["destinationAddress", "amountInSatoshi"],
                "additionalProperties": False
            },
            "strict": True
        }
    }
]

async def call_icp_endpoint(func_name: str, args: dict):
    if func_name == "get_current_fee_percentiles":
        url = f"{BASE_URL}/get-current-fee-percentiles"
        response = requests.post(url, headers=HEADERS, json={})
    elif func_name == "get_event_by_id":
        event_id = args.get("eventId")
        url = f"{BASE_URL}/events/{event_id}"
        response = requests.get(url, headers=HEADERSUPDATE, json={})

    elif func_name == "get_events":
        url = f"{BASE_URL}/events"
        response = requests.get(url, headers=HEADERSUPDATE, json={}, params=args)
    elif func_name == "payment":
        event_id = args.get("eventId")
        url = f"{BASE_URL}/payment/{event_id}"
        response = requests.get(url, headers=HEADERSUPDATE, json={})
    elif func_name == "create_event":
        url = f"{BASE_URL}/events"
        response = requests.post(url, headers=HEADERSUPDATE, json=args)

    elif func_name == "canister_address":
        url = f"{BASE_URL}/canister-address"
        response = requests.get(url, headers=HEADERSUPDATE, json={})
    elif func_name == "get_balance":
        url = f"{BASE_URL}/get-balance"
        response = requests.post(url, headers=HEADERS, json={"address": args["address"]})
    elif func_name == "get_utxos":
        url = f"{BASE_URL}/get-utxos"
        response = requests.post(url, headers=HEADERS, json={"address": args["address"]})
    elif func_name == "send":
        url = f"{BASE_URL}/send"
        response = requests.post(url, headers=HEADERS, json=args)
    else:
        raise ValueError(f"Unsupported function call: {func_name}")
    response.raise_for_status()
    return response.json()

async def process_query(query: str, ctx: Context) -> str:
    try:
        # Step 1: Initial call to ASI1 with user query and tools
        initial_message = {
            "role": "user",
            "content": query
        }
        payload = {
            "model": "asi1-mini",
            "messages": [initial_message],
            "tools": tools,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=payload
        )
        response.raise_for_status()
        response_json = response.json()

        # Step 2: Parse tool calls from response
        tool_calls = response_json["choices"][0]["message"].get("tool_calls", [])
        messages_history = [initial_message, response_json["choices"][0]["message"]]

        if not tool_calls:
            return "I couldn't determine what Event information you're looking for. Please try rephrasing your question."

        # Step 3: Execute tools and format results
        for tool_call in tool_calls:
            func_name = tool_call["function"]["name"]
            arguments = json.loads(tool_call["function"]["arguments"])
            tool_call_id = tool_call["id"]

            ctx.logger.info(f"Executing {func_name} with arguments: {arguments}")

            try:
                result = await call_icp_endpoint(func_name, arguments)
                content_to_send = json.dumps(result)
            except Exception as e:
                error_content = {
                    "error": f"Tool execution failed: {str(e)}",
                    "status": "failed"
                }
                content_to_send = json.dumps(error_content)

            tool_result_message = {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": content_to_send
            }
            messages_history.append(tool_result_message)

        # Step 4: Send results back to ASI1 for final answer
        final_payload = {
            "model": "asi1-mini",
            "messages": messages_history,
            "temperature": 0.7,
            "max_tokens": 1024
        }
        final_response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=final_payload
        )
        final_response.raise_for_status()
        final_response_json = final_response.json()

        # Step 5: Return the model's final answer
        return final_response_json["choices"][0]["message"]["content"]

    except Exception as e:
        ctx.logger.error(f"Error processing query: {str(e)}")
        return f"An error occurred while processing your request: {str(e)}"

agent = Agent(
    name='test-ICP-agent',
    port=8001,
    mailbox=True
)
class Request(Model):
    message: str

class Response(Model):
    status: str
    message: str

@agent.on_rest_post('/chat',Request,Response)
async def handle_chat_message(ctx: Context, request):
    # Extract the message from the request body
    
    received_message =request.message

    # Log the received message
    ctx.logger.info(f"Received message: {received_message}")

    # Prepare the chat message to send
    response_text = await process_query(received_message, ctx)


    # Return a response to the REST call
    return Response(status="success", message=response_text)

chat_proto = Protocol(spec=chat_protocol_spec)

@chat_proto.on_message(model=ChatMessage)
async def handle_chat_message(ctx: Context, sender: str, msg: ChatMessage):
    try:
        ack = ChatAcknowledgement(
            timestamp=datetime.now(timezone.utc),
            acknowledged_msg_id=msg.msg_id
        )
        await ctx.send(sender, ack)

        for item in msg.content:
            if isinstance(item, StartSessionContent):
                ctx.logger.info(f"Got a start session message from {sender}")
                continue
            elif isinstance(item, TextContent):
                ctx.logger.info(f"Got a message from {sender}: {item.text}")
                response_text = await process_query(item.text, ctx)
                ctx.logger.info(f"Response text: {response_text}")
                response = ChatMessage(
                    timestamp=datetime.now(timezone.utc),
                    msg_id=uuid4(),
                    content=[TextContent(type="text", text=response_text)]
                )
                await ctx.send(sender, response)
            else:
                ctx.logger.info(f"Got unexpected content from {sender}")
    except Exception as e:
        ctx.logger.error(f"Error handling chat message: {str(e)}")
        error_response = ChatMessage(
            timestamp=datetime.now(timezone.utc),
            msg_id=uuid4(),
            content=[TextContent(type="text", text=f"An error occurred: {str(e)}")]
        )
        await ctx.send(sender, error_response)

@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_chat_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Received acknowledgement from {sender} for message {msg.acknowledged_msg_id}")
    if msg.metadata:
        ctx.logger.info(f"Metadata: {msg.metadata}")

agent.include(chat_proto)

if __name__ == "__main__":
    agent.run()


"""
Queries for /get-balance
What's the balance of address tb1qexample1234567890?

Can you check how many bitcoins are in tb1qabcde000001234567?

Show me the balance of this Bitcoin wallet: tb1qtestwalletxyz.

🧾 Queries for /get-utxos
What UTXOs are available for address tb1qexampleutxo0001?

List unspent outputs for tb1qunspentoutputs111.

Do I have any unspent transactions for tb1qutxotest9999?

🧾 Queries for /get-current-fee-percentiles
What are the current Bitcoin fee percentiles?

Show me the latest fee percentile distribution.

How much are the Bitcoin network fees right now?

🧾 Queries for /get-p2pkh-address
What is my canister's P2PKH address?

Generate a Bitcoin address for me.

Give me a Bitcoin address I can use to receive coins.

🧾 Queries for /send
Send 10,000 satoshis to tb1qreceiver000111.

Transfer 50000 sats to tb1qsimplewalletabc.

I want to send 120000 satoshis to tb1qdonationaddress001.

🧾 General/Dummy Test
Run the dummy test endpoint.

Can I see a test response?

Hit the dummy-test route to make sure it works.
"""