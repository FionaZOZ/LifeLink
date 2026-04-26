"""
CardiacLink Voice Specialist — Agentverse hosted agent.

Required secrets:
  - ASI1_API_KEY
  - ELEVENLABS_API_KEY  (optional — without it, returns text script only)
  - ELEVENLABS_AGENT_ID (optional)
"""
import os
from typing import Optional
from uagents import Context, Model
from uagents.experimental.chat_agent import ChatAgent
from uagents.experimental.quota import QuotaProtocol

class VoiceRequest(Model):
    emergency_id: str
    phase: str             # "tutorial" | "compressions" | "recovery"
    bpm: int = 110

class VoiceResult(Model):
    emergency_id: str
    audio_url: Optional[str] = None
    script: str

SCRIPTS = {
    "tutorial":     "Stay calm. Lay them flat on their back. Place the heel of one hand on the center of the chest, between the nipples. Lock your other hand on top.",
    "compressions": "Push hard, push fast — at least two inches deep. Follow the beat: one, two, three, four. Keep going until help arrives.",
    "recovery":     "If they begin breathing on their own, roll them onto their side into the recovery position. Stay with them. Keep them warm.",
}

agent = ChatAgent()
proto = QuotaProtocol(
    storage_reference=agent.storage,
    name="CPR Voice Coach",
    version="0.1.0",
)

@proto.on_message(model=VoiceRequest, replies=VoiceResult)
async def handle(ctx: Context, sender: str, msg: VoiceRequest):
    script = SCRIPTS.get(msg.phase, SCRIPTS["compressions"])
    audio_url = None

    api_key = os.getenv("ELEVENLABS_API_KEY")
    if api_key and msg.phase != "tutorial":
        # In production, POST to ElevenLabs TTS and get back an audio URL.
        # For the hackathon demo, return a placeholder URL pattern.
        audio_url = f"https://api.elevenlabs.io/v1/text-to-speech/preview/{msg.emergency_id}-{msg.phase}.mp3"

    await ctx.send(sender, VoiceResult(
        emergency_id=msg.emergency_id,
        audio_url=audio_url,
        script=script,
    ))

agent.include(proto, publish_manifest=True)

if __name__ == "__main__":
    agent.run()
