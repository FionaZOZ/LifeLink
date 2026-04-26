"""Voice agent - ElevenLabs CPR narration wrapper.

Wraps ElevenLabs Conversational AI for synchronized CPR voice guidance.
"""
import os
import logging
from uagents import Agent, Context
from shared.protocols import VoiceSyncRequest, VoiceSyncAck
from shared.chat import enable_chat, extract_text
from shared.discovery import register_capability_tags
from shared.event_bus import publish

logger = logging.getLogger(__name__)

VOICE_SYSTEM_PROMPT = """You are a calm, professional emergency response coach guiding a bystander through hands-only CPR. Your role is to narrate only what is currently happening -- never read ahead, never lag behind.

The user is following a mobile app that shows visual cues. You reinforce those cues with voice narration.

STEPS:
- consent: Confirm they understand this is emergency guidance
- responsive: Guide them to tap and shout at the victim
- breathing: Guide them to look, listen, feel for breathing (~10 seconds)
- handPlacement: Explain center of chest, lower half of sternum
- handPosing: Explain interlaced fingers, straight arms, shoulders over hands
- compressions: The app metronome is running at 110 BPM. Encourage them to stay with the beat.
- breathWindow: After every 30 compressions, 2-second pause for optional rescue breaths
- aed: AED pad placement and shock-advised guidance
- summary: Session complete, summarize what they did

TONE: Calm but slightly urgent. Field responder, not medical lecture.
DO NOT: Count compressions aloud (the app does that). Do not give medical advice beyond CPR steps.

When you receive [CPR_APP] prefixed messages, switch to that step immediately."""


def create_voice_agent(seed: str) -> Agent:
    """Create the Voice specialist agent."""
    agent = Agent(
        name="voice",
        seed=seed,
        mailbox=True,
    )

    register_capability_tags(agent, [
        "cardiaclink-voice",
        "cardiaclink",
        "cpr",
        "voice",
        "emergency",
    ])

    @agent.on_event("startup")
    async def startup(ctx: Context):
        ctx.logger.info(f"Voice agent started: {agent.address}")
        if not os.getenv("ELEVENLABS_API_KEY"):
            ctx.logger.warning("ELEVENLABS_API_KEY not set -- running in stub mode")
        else:
            ctx.logger.info("ElevenLabs API key detected")

        # Schedule heartbeat every 5 seconds
        agent.on_interval(period=5.0)(heartbeat)

    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="voice",
            capability="cpr-narration",
            phase="heartbeat",
            summary="Voice agent active",
            data={"address": str(agent.address)}
        )

    @agent.on_message(model=VoiceSyncRequest, replies={VoiceSyncAck})
    async def handle_sync(ctx: Context, sender: str, msg: VoiceSyncRequest):
        """Handle voice sync requests from Coordinator."""
        ctx.logger.info(f"Voice sync request: step={msg.step}, context={msg.context[:50]}")

        # Publish request event
        emergency_id = getattr(msg, 'emergency_id', 'unknown')
        await publish(
            emergency_id=emergency_id,
            agent="voice",
            capability="cpr-narration",
            phase="request",
            summary=f"Voice sync requested for step: {msg.step}",
            data={"step": msg.step, "context": msg.context[:100]}
        )

        session_id = f"voice-{ctx.session}"

        await ctx.send(
            sender,
            VoiceSyncAck(
                session_id=session_id,
                state="speaking" if os.getenv("ELEVENLABS_API_KEY") else "idle",
            ),
        )

        # Publish result event
        await publish(
            emergency_id=emergency_id,
            agent="voice",
            capability="cpr-narration",
            phase="result",
            summary=f"Voice sync acknowledged: {session_id}",
            data={"session_id": session_id}
        )

    async def chat_handler(ctx: Context, sender: str, msg):
        """Handle chat messages from ASI:One."""
        text = extract_text(msg)
        ctx.logger.info(f"Voice agent chat request: {text}")

        if "consent" in text.lower() or "start" in text.lower():
            return ("Voice guidance ready. Confirming: this is emergency CPR guidance, "
                   "not a substitute for professional medical care. Let's begin.")
        elif "compress" in text.lower():
            return ("Stay with the beat. Push hard and fast, at least 2 inches deep. "
                   "Let the chest recoil fully between compressions. You're doing great.")
        elif "breath" in text.lower():
            return ("Breath window. If trained, give 2 rescue breaths now. "
                   "If not trained, skip breaths and continue compressions.")
        elif "aed" in text.lower():
            return ("AED pad placement: one pad on upper right chest, "
                   "one pad on lower left side. Follow AED voice prompts for shock.")
        else:
            return (f"Voice agent ready. I provide CPR narration for steps: "
                   f"consent, responsive, breathing, hand placement, compressions, "
                   f"breath windows, and AED guidance. Current mode: "
                   f"{'live' if os.getenv('ELEVENLABS_API_KEY') else 'stub'}.")

    chat_proto = enable_chat(agent, chat_handler)
    agent.include(chat_proto, publish_manifest=True)

    return agent
