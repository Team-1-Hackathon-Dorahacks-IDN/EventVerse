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
                "price": {"type": "string", "description": "Price of the event but dont add any currency"},
                "capacity": { "type": "number", "description": "Optional capacity of the event, default value used if omitted" },
                "min_age": { "type": "number", "description": "Optional minimum age for the event" }
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

   
   
]

async def call_icp_endpoint(func_name: str, args: dict):
    if func_name == "get_event_by_id":
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

                # Customize response formatting based on the tool
                if func_name == "get_events":
                    formatted = "\n".join([
                        f"- {e.get('name')} | Date: {e.get('date')} | Location: {e.get('location')} | Price: {e.get('price')} ETH"
                        for e in result.get("events", [])
                    ])
                    content_to_send = formatted or "No events found."

                elif func_name == "get_event_by_id":
                    e = result
                    content_to_send = (
                        f"Event: {e.get('name')}\n"
                        f"Date: {e.get('date')}\n"
                        f"Location: {e.get('location')}\n"
                        f"Price: {e.get('price')} ETH\n"
                        f"Capacity: {e.get('capacity', 'N/A')}\n"
                        f"Description: {e.get('description', 'No description')}"
                    )

                elif func_name == "create_event":
                    content_to_send = (
                        f"✅ Event created successfully!\n"
                        f"Event ID: {result.get('id')}\n"
                        f"Name: {result.get('name')}\n"
                        f"Date: {result.get('date')}\n"
                        f"Location: {result.get('location')}\n"
                        f"Price: {result.get('price')}"
                    )

                elif func_name == "payment":
                    content_to_send = f"💳 Payment link for event {arguments.get('eventId')}: {result.get('paymentLink')}"

                elif func_name == "canister_address":
                    content_to_send = f"📦 Canister address: {result.get('address')}"

                else:
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
    name='EventVerse',
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
🧾 Queries for /get-events
List all events available.
Show me the upcoming events.
Can I get the events list with limit 5?

🧾 Queries for /get-event-by-id
Get details of event with ID ev12345.
Show me information for event ev67890.
Can you fetch the event ev99999 by its ID?

🧾 Queries for /payment
Generate a payment link for event ev12345.
I want to pay for event ev67890.
Show me the payment link for event ev99999.

🧾 Queries for /canister-address
What is the ICP canister address for events?
Give me the canister address.
Show me the address of this event management canister.
"""
