"""Chat Protocol helper for CardiacLink agents.

Makes any agent discoverable via ASI:One by implementing the canonical
Fetch.ai Chat Protocol.
"""
from typing import Callable, Awaitable
from uagents import Agent, Context, Protocol
from uagents_core.contrib.protocols.chat import (
    chat_protocol_spec,
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    EndSessionContent,
)


def enable_chat(
    agent: Agent,
    handler: Callable[[Context, str, ChatMessage], Awaitable[str]],
) -> Protocol:
    """Attach Chat Protocol to an agent with a custom message handler.

    Args:
        agent: The uAgent to enable chat on
        handler: Async function (ctx, sender, msg) -> response_text

    Returns:
        The chat protocol instance (caller should include it)

    Usage:
        chat_proto = enable_chat(agent, my_handler)
        agent.include(chat_proto, publish_manifest=True)
    """
    chat_proto = Protocol(name="chat", version="1.0.0")

    @chat_proto.on_message(model=ChatMessage, replies={ChatAcknowledgement, ChatMessage})
    async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
        """Handle incoming chat messages via ASI:One."""
        # Send acknowledgement immediately
        await ctx.send(
            sender,
            ChatAcknowledgement(
                message_id=msg.message_id,
                agent_address=agent.address,
            ),
        )

        # Process the message through the custom handler
        try:
            response_text = await handler(ctx, sender, msg)

            # Send the response back
            await ctx.send(
                sender,
                ChatMessage(
                    message_id=f"{msg.message_id}-response",
                    text=[TextContent(type="text", text=response_text)],
                ),
            )
        except Exception as e:
            # Send error response
            await ctx.send(
                sender,
                ChatMessage(
                    message_id=f"{msg.message_id}-error",
                    text=[TextContent(
                        type="text",
                        text=f"Error processing request: {str(e)}"
                    )],
                ),
            )

    return chat_proto


def extract_text(msg: ChatMessage) -> str:
    """Extract plain text from a ChatMessage's content list."""
    parts = []
    for content in msg.text:
        if isinstance(content, TextContent):
            parts.append(content.text)
    return " ".join(parts).strip()
