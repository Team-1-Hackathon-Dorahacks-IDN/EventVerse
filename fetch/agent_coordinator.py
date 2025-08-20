# agent_coordinator.py
import os, json, requests
from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec, ChatMessage, ChatAcknowledgement,
    TextContent
)
from datetime import datetime, timezone
from uuid import uuid4

class Request(Model):
    message: str

class Response(Model):
    status: str
    message: str
class Message(Model):
    message: str
# Coordinator Agent
coordinator = Agent(
    name="Coordinator",
    port=8001,
    endpoint=['http://localhost:8001/submit'],
    mailbox=True
)
chat_proto = Protocol(spec=chat_protocol_spec)

# Agent addresses (replace with actual addresses once you run Event/Payment agents)
EVENT_AGENT_ADDR = "agent1qg7wm8zll4htp2sj4ktxuhvkktcwermhfx7939ag4av22uvwmrk82qhudsj"
PAYMENT_AGENT_ADDR = "agent1q0kudz082w6ym5pvegfrc8rqkzk44a5seyz4nyul2z45xepz9atvxwv3esr"

@coordinator.on_rest_post("/chat", Request, Response)
async def handle_chat(ctx: Context, request: Request):
    query = request.message.strip()
    ctx.logger.info(f"Incoming user request: {query}")

    # Routing logic
    if "payment" in query.lower() or "pay" in query.lower():
        target = PAYMENT_AGENT_ADDR
    else:
        target = EVENT_AGENT_ADDR

    ctx.logger.info(f"Routing query to {target}")

 

    # Wait for reply from Event/Payment agent
    reply, status = await ctx.send_and_receive(
        target,
        Message(message=query),
        response_type=Message,
    )


    if isinstance(reply, Message):
        return Response(status="success", message=reply.message)
    else:
        return Response(status=status, message="Reply contained no text")


# Handle acknowledgements
@chat_proto.on_message(model=ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Ack from {sender} for {msg.acknowledged_msg_id}")


# Handle responses from Event/Payment agent
@chat_proto.on_message(model=ChatMessage)
async def handle_response(ctx: Context, sender: str, msg: ChatMessage):
    for item in msg.content:
        if isinstance(item, TextContent):
            ctx.logger.info(f"Response from {sender}: {item.text}")

coordinator.include(chat_proto)

if __name__ == "__main__":
    coordinator.run()
