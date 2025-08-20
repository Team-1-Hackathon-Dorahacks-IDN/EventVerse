# agent_payment.py
import os, json, requests
from uagents import Agent, Context,Model, Protocol
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec, ChatMessage, TextContent,ChatAcknowledgement
)
from datetime import datetime, timezone
from uuid import uuid4
from dotenv import load_dotenv

load_dotenv()
BASE_URL = "http://127.0.0.1:4943"
CANISTER_ID = "w7lou-c7777-77774-qaamq-cai"
class Message(Model):
    message: str
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
tools=[
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
payment_agent = Agent(name="PaymentAgent", port=8003,endpoint = ['http://localhost:8003/submit'], mailbox=True)
chat_proto = Protocol(spec=chat_protocol_spec)

async def call_payment_endpoint(func_name: str, args: dict):
    if func_name == "payment":
        event_id = args.get("eventId")
        url = f"{BASE_URL}/payment/{event_id}"
        resp = requests.get(url, headers=HEADERS, json={})
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
            return "I couldn't figure out which payment info you need."

        # Step 2: Execute tool calls
        for tool_call in tool_calls:
            func_name = tool_call["function"]["name"]
            arguments = json.loads(tool_call["function"]["arguments"])
            tool_call_id = tool_call["id"]

            result = await call_payment_endpoint(func_name, arguments)

            if func_name == "payment":
                    content_to_send = f"💳 Payment link for event {arguments.get('eventId')}: {result.get('paymentLink')}"
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
@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Ack from {sender} for {msg.acknowledged_msg_id}")

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
@payment_agent.on_message(model=Message)
async def handle_message(ctx: Context, sender: str, msg: Message):
    ctx.logger.info(f"Received message from {sender}: {msg.message}")
    
    # langsung kirim ke query processor
    reply = await process_event_query(msg.message, ctx)
    
    await ctx.send(sender, Message(message=reply))
payment_agent.include(chat_proto)

if __name__ == "__main__":
    payment_agent.run()
