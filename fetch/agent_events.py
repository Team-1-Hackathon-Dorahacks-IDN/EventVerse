# agent_events.py
import os, json, requests
from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec, ChatMessage, ChatAcknowledgement, TextContent
)
from datetime import datetime, timezone
from uuid import uuid4
from dotenv import load_dotenv

load_dotenv()

# ================= ICP BASE CONFIG =================
BASE_URL = "http://127.0.0.1:4943"
CANISTER_ID = "w7lou-c7777-77774-qaamq-cai"

HEADERS = {
    "Host": f"{CANISTER_ID}.localhost",
    "Content-Type": "application/json",
    "X-Ic-Force-Update": "true"
}

# ================= ASI1 CONFIG =================
ASI1_API_KEY = os.getenv("ASI1_API_KEY")
ASI1_BASE_URL = "https://api.asi1.ai/v1"
ASI1_HEADERS = {
    "Authorization": f"Bearer {ASI1_API_KEY}",
    "Content-Type": "application/json"
}

# ================= EVENT AGENT =================
event_agent = Agent(
    name="EventAgent",
    port=8002,
    endpoint=['http://localhost:8002/submit'],
    mailbox=True
)
chat_proto = Protocol(spec=chat_protocol_spec)
class Message(Model):
    message: str
# Only include EVENT-related tools
tools = [
    {
        "type": "function",
        "function": {
            "name": "create_event",
            "description": "Create a new event in the ICP canister",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "date": {"type": "string"},
                    "location": {"type": "string"},
                    "price": {"type": "string"},
                    "capacity": {"type": "number"},
                    "min_age": {"type": "number"}
                },
                "required": ["name", "date", "location", "price","capacity"],
                "additionalProperties": False
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_events",
            "description": "Get the list of events from the ICP canister",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "number"},
                    "offset": {"type": "number"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_event_by_id",
            "description": "Get details of a specific event by its ID",
            "parameters": {
                "type": "object",
                "properties": {"eventId": {"type": "string"}},
                "required": ["eventId"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "canister_address",
            "description": "Returns the address of this canister",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

# Call ICP endpoints for event functions
async def call_event_endpoint(func_name: str, args: dict):
    if func_name == "get_event_by_id":
        url = f"{BASE_URL}/events/{args['eventId']}"
        resp = requests.get(url, headers=HEADERS)
    elif func_name == "get_events":
        url = f"{BASE_URL}/events"
        resp = requests.get(url, headers=HEADERS, params=args)
    elif func_name == "create_event":
        url = f"{BASE_URL}/events"
        resp = requests.post(url, headers=HEADERS, json=args)
    elif func_name == "canister_address":
        url = f"{BASE_URL}/canister-address"
        resp = requests.get(url, headers=HEADERS)
    else:
        raise ValueError("Unknown function")
    resp.raise_for_status()
    return resp.json()

# Main processor using ASI1 + tools
async def process_event_query(query: str, ctx: Context) -> str:
    try:
        # Step 1: Ask ASI1
        payload = {
            "model": "asi1-mini",
            "messages": [{"role": "user", "content": query}],
            "tools": tools,
            "temperature": 0.7
        }
        response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=payload
        )
        response.raise_for_status()
        response_json = response.json()

        tool_calls = response_json["choices"][0]["message"].get("tool_calls", [])
        messages_history = [payload["messages"][0], response_json["choices"][0]["message"]]

        if not tool_calls:
            return "I couldn't figure out which event info you need."

        # Step 2: Execute tool calls
        for tool_call in tool_calls:
            func_name = tool_call["function"]["name"]
            arguments = json.loads(tool_call["function"]["arguments"])
            tool_call_id = tool_call["id"]

            result = await call_event_endpoint(func_name, arguments)

            if func_name == "get_events":
                formatted = "\n".join([
                    f"- {e.get('name')} | {e.get('date')} | {e.get('location')} | {e.get('price')} ETH"
                    for e in result.get("events", [])
                ])
                content_to_send = formatted or "No events found."
            elif func_name == "get_event_by_id":
                e = result
                content_to_send = (
                    f"Event: {e.get('name')}\nDate: {e.get('date')}\n"
                    f"Location: {e.get('location')}\nPrice: {e.get('price')} ETH"
                )
            elif func_name == "create_event":
                content_to_send = f"✅ Event created: {result.get('name')} on {result.get('date')}"
            elif func_name == "canister_address":
                content_to_send = f"📦 Canister address: {result.get('address')}"
            else:
                content_to_send = json.dumps(result)

            tool_result_message = {
                "role": "tool",
                "tool_call_id": tool_call_id,
                "content": content_to_send
            }
            messages_history.append(tool_result_message)

        # Step 3: Send back to ASI1 for final user-friendly reply
        final_payload = {
            "model": "asi1-mini",
            "messages": messages_history
        }
        final_response = requests.post(
            f"{ASI1_BASE_URL}/chat/completions",
            headers=ASI1_HEADERS,
            json=final_payload
        )
        final_response.raise_for_status()
        return final_response.json()["choices"][0]["message"]["content"]

    except Exception as e:
        ctx.logger.error(f"Error processing event query: {str(e)}")
        return f"❌ Error: {str(e)}"

# ============== CHAT HANDLER ==============
@chat_proto.on_message(model=ChatMessage)
async def handle_event_msg(ctx: Context, sender: str, msg: ChatMessage):
    for item in msg.content:
        if isinstance(item, TextContent):
            query = item.text
            ctx.logger.info(f"[EventAgent] Processing query: {query}")
            reply = await process_event_query(query, ctx)
            response = ChatMessage(
                timestamp=datetime.now(timezone.utc),
                msg_id=uuid4(),
                content=[TextContent(type="text", text=reply)]
            )
            await ctx.send(sender, response)

@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Ack from {sender} for {msg.acknowledged_msg_id}")

@event_agent.on_message(model=Message)
async def handle_message(ctx: Context, sender: str, msg: Message):
    ctx.logger.info(f"Received message from {sender}: {msg.message}")
    
    # langsung kirim ke query processor
    reply = await process_event_query(msg.message, ctx)
    
    await ctx.send(sender, Message(message=reply))

event_agent.include(chat_proto)

if __name__ == "__main__":
    event_agent.run()
