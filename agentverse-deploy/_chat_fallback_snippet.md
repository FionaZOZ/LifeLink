# Free-form chat fallback snippet — paste into each specialist before `if __name__`

Each specialist needs a `ChatMessage` handler so judges typing natural language at it on ASI:One get a sensible response (instead of being told the message format is wrong). The AED agent and Coordinator already have it — copy the pattern below into the other 5 specialists and customize the response.

```python
from uagents_core.contrib.protocols.chat import (
    ChatMessage, ChatAcknowledgement, TextContent, chat_protocol_spec,
)
from uagents import Protocol
from datetime import datetime, timezone
from uuid import uuid4

chat_proto = Protocol(spec=chat_protocol_spec)

@chat_proto.on_message(ChatMessage)
async def handle_chat(ctx: Context, sender: str, msg: ChatMessage):
    text = " ".join(c.text for c in msg.content if isinstance(c, TextContent))

    # >>> AGENT-SPECIFIC RESPONSE — customize this block <<<
    response = (
        "Hi, I'm the [AGENT NAME] for CardiacLink emergency response.\n"
        "I [WHAT YOU DO] when triggered by the Coordinator agent.\n\n"
        "Example you might ask: '[EXAMPLE]'\n"
        "I'm part of an 8-agent system on Agentverse — try the Coordinator at\n"
        "agent address [COORDINATOR_ADDRESS] to see the full orchestration."
    )
    # <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

    await ctx.send(sender, ChatMessage(
        timestamp=datetime.now(timezone.utc),
        msg_id=uuid4(),
        content=[TextContent(type="text", text=response)],
    ))
    await ctx.send(sender, ChatAcknowledgement(
        timestamp=datetime.now(timezone.utc),
        acknowledged_msg_id=msg.msg_id,
    ))

@chat_proto.on_message(ChatAcknowledgement)
async def handle_ack(ctx: Context, sender: str, msg: ChatAcknowledgement):
    pass

agent.include(chat_proto, publish_manifest=True)
```

## Suggested per-agent responses

**ems_agent.py**
> "I'm the LAFD EMS Dispatch agent. Given a UCLA-area location, I find the nearest LAFD ALS rescue unit and an estimated ETA, plus a What3Words address for the dispatcher. Try asking: 'EMS to Pauley Pavilion'."

**voice_agent.py**
> "I'm the CPR Voice Coach. I generate cadence-matched verbal CPR instructions at 110 BPM (the AHA recommended rate). I can produce scripts for the tutorial, active compressions, or recovery position phases. Powered by ElevenLabs when an API key is configured."

**triage_agent.py**
> "I'm the Cardiac Arrest Triage agent. I use Anthropic Claude Sonnet 4.5 to classify a presentation as STEMI, presumptive cardiac arrest, or stable, and return a one-line clinical note for the receiving hospital. Try: 'Patient collapsed during a lecture, no pulse'."

**handoff_agent.py**
> "I'm the FHIR R4 Hospital Handoff agent. I assemble a complete FHIR Bundle (Patient + Encounter + Observation + Procedure resources) for an emergency and persist it to MongoDB Atlas. Hospital EHR systems can pull the bundle by ID. Try: 'Build a handoff bundle for emergency abc-123'."

**optimizer_agent.py**
> "I'm the Emergency Response Route Optimizer. Given a helper's location and an AED location, I return distance, ETA, and a turn-by-turn cardinal-direction instruction. Used by the Coordinator after the AED agent identifies a target device."

**drone_agent.py**
> "I'm the AED Drone Dispatcher. I find the nearest drone staging pad on the UCLA campus and dispatch an AED-payload drone to a patient location. Returns drone ID and ETA. Try: 'Launch a drone to Royce Hall'."
