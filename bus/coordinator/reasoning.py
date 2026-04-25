"""Claude tool-use reasoning loop with parallel specialist dispatch.

Implements the Caputo et al. principle: parallel, never sequential alerting.
"""
import os
import json
import logging
import asyncio
from typing import Any
from anthropic import Anthropic
from uagents import Context
from shared.protocols import (
    TriageRequest, TriageResult,
    VoiceSyncRequest, VoiceSyncAck,
    AedQuery, AedResult,
    EmsDispatchRequest, EmsDispatchResult,
    DroneDispatchRequest, DroneDispatchResult,
    HandoffSummary, HandoffAck,
    OptimizerRequest, OptimizerResult,
)
from coordinator.prompts import COORDINATOR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 5


def build_tools() -> list[dict]:
    """Build Claude tool definitions for all seven specialists."""
    return [
        {
            "name": "triage",
            "description": "Classify emergency complexity as Low/Moderate/High using MDAgents-inspired LLM classifier",
            "input_schema": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "Natural language emergency description"},
                },
                "required": ["text"],
            },
        },
        {
            "name": "start_voice_guidance",
            "description": "Start ElevenLabs voice narration for a CPR step",
            "input_schema": {
                "type": "object",
                "properties": {
                    "step": {"type": "string", "description": "CPR step: consent, responsive, breathing, handPlacement, handPosing, compressions, breathWindow, aed, summary"},
                    "context": {"type": "string", "description": "Additional context for the step"},
                },
                "required": ["step"],
            },
        },
        {
            "name": "find_aeds",
            "description": "Find nearby AEDs using H3 geospatial indexing and Buter 2024 coverage decay ranking",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Address or 'lat,lon'"},
                    "radius_m": {"type": "integer", "description": "Search radius in meters", "default": 1000},
                    "transport_mode": {"type": "string", "enum": ["walking", "bicycle", "car"], "default": "walking"},
                },
                "required": ["location"],
            },
        },
        {
            "name": "dispatch_ems",
            "description": "Dispatch EMS with LA County benchmark ETA and What3Words location encoding",
            "input_schema": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "Address or 'lat,lon'"},
                    "status": {"type": "string", "description": "Victim status summary"},
                    "callback": {"type": "string", "description": "Callback number (optional)"},
                },
                "required": ["location", "status"],
            },
        },
        {
            "name": "dispatch_drone",
            "description": "Dispatch drone-delivered AED (Schierbeck Lancet 2023 inspired, ~3min ETA)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "target_lat": {"type": "number", "description": "Target latitude"},
                    "target_lon": {"type": "number", "description": "Target longitude"},
                },
                "required": ["target_lat", "target_lon"],
            },
        },
        {
            "name": "record_handoff",
            "description": "Record CPR session summary for hospital handoff with FHIR R4 audit trail",
            "input_schema": {
                "type": "object",
                "properties": {
                    "compressions_total": {"type": "integer"},
                    "sets_completed": {"type": "integer"},
                    "aed_used": {"type": "boolean"},
                    "rosc": {"type": "boolean", "description": "Return of spontaneous circulation"},
                    "exit_step": {"type": "string"},
                    "gps_lat": {"type": "number"},
                    "gps_lon": {"type": "number"},
                    "duration_seconds": {"type": "integer"},
                },
                "required": ["compressions_total", "sets_completed", "aed_used", "rosc", "exit_step", "gps_lat", "gps_lon", "duration_seconds"],
            },
        },
        {
            "name": "propose_aed_placements",
            "description": "Propose optimal AED placements using MCLP/GRASP heuristic (Buter 2024)",
            "input_schema": {
                "type": "object",
                "properties": {
                    "region": {"type": "string", "description": "Region name, e.g. 'UCLA campus'"},
                    "n_new_aeds": {"type": "integer", "description": "Number of new AEDs to place", "default": 3},
                    "transport_mode": {"type": "string", "enum": ["walking", "bicycle", "car"], "default": "walking"},
                },
                "required": ["region"],
            },
        },
    ]


async def dispatch_one(ctx: Context, tool_name: str, tool_input: dict, routing_table: dict) -> Any:
    """
    Dispatch a single tool call to the appropriate specialist agent.

    Implements parallel dispatch as required by the Caputo et al. Swiss Canton
    of Fribourg study showing sequential alerting causes delayed responder arrival.
    """
    try:
        if tool_name == "triage":
            addr = routing_table.get("triage")
            if not addr:
                return {"error": "Triage agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                TriageRequest(text=tool_input["text"]),
                response_type=TriageResult,
                timeout=5.0,
            )
            return response.dict()

        elif tool_name == "start_voice_guidance":
            addr = routing_table.get("voice")
            if not addr:
                return {"error": "Voice agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                VoiceSyncRequest(
                    step=tool_input["step"],
                    context=tool_input.get("context", ""),
                ),
                response_type=VoiceSyncAck,
                timeout=5.0,
            )
            return response.dict()

        elif tool_name == "find_aeds":
            addr = routing_table.get("aed")
            if not addr:
                return {"error": "AED agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                AedQuery(
                    location=tool_input["location"],
                    radius_m=tool_input.get("radius_m", 1000),
                    transport_mode=tool_input.get("transport_mode", "walking"),
                ),
                response_type=AedResult,
                timeout=5.0,
            )
            return response.dict()

        elif tool_name == "dispatch_ems":
            addr = routing_table.get("ems")
            if not addr:
                return {"error": "EMS agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                EmsDispatchRequest(
                    location=tool_input["location"],
                    status=tool_input["status"],
                    callback=tool_input.get("callback"),
                ),
                response_type=EmsDispatchResult,
                timeout=5.0,
            )
            return response.dict()

        elif tool_name == "dispatch_drone":
            addr = routing_table.get("drone")
            if not addr:
                return {"error": "Drone agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                DroneDispatchRequest(
                    target_lat=tool_input["target_lat"],
                    target_lon=tool_input["target_lon"],
                ),
                response_type=DroneDispatchResult,
                timeout=5.0,
            )
            return response.dict()

        elif tool_name == "record_handoff":
            addr = routing_table.get("handoff")
            if not addr:
                return {"error": "Handoff agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                HandoffSummary(**tool_input),
                response_type=HandoffAck,
                timeout=5.0,
            )
            return response.dict()

        elif tool_name == "propose_aed_placements":
            addr = routing_table.get("optimizer")
            if not addr:
                return {"error": "Optimizer agent not discovered"}
            response = await ctx.send_and_receive(
                addr,
                OptimizerRequest(
                    region=tool_input["region"],
                    n_new_aeds=tool_input.get("n_new_aeds", 3),
                    transport_mode=tool_input.get("transport_mode", "walking"),
                ),
                response_type=OptimizerResult,
                timeout=5.0,
            )
            return response.dict()

        else:
            return {"error": f"Unknown tool: {tool_name}"}

    except asyncio.TimeoutError:
        return {"error": f"{tool_name} agent timeout"}
    except Exception as e:
        logger.error(f"Tool dispatch error ({tool_name}): {e}")
        return {"error": str(e)}


async def execute_tool_calls(ctx: Context, tool_uses: list, routing_table: dict) -> list:
    """
    Execute multiple tool calls in parallel via asyncio.gather.

    This implements the Caputo et al. Swiss Canton of Fribourg study principle:
    parallel alerting significantly reduces time to first responder arrival.
    """
    coros = [dispatch_one(ctx, t["name"], t["input"], routing_table) for t in tool_uses]
    results = await asyncio.gather(*coros, return_exceptions=True)

    tool_results = []
    for tool_use, result in zip(tool_uses, results):
        if isinstance(result, Exception):
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use["id"],
                "content": json.dumps({"error": str(result)}),
            })
        else:
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use["id"],
                "content": json.dumps(result),
            })

    return tool_results


async def run_reasoning_loop(
    ctx: Context,
    user_message: str,
    routing_table: dict,
) -> str:
    """
    Run the Claude tool-use reasoning loop.

    Args:
        ctx: uAgent context
        user_message: Emergency description from the caller
        routing_table: Dict mapping capability names to agent addresses

    Returns:
        Final text response from Claude
    """
    anthropic_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    messages = [{"role": "user", "content": user_message}]
    tools = build_tools()

    for iteration in range(MAX_ITERATIONS):
        logger.info(f"Reasoning loop iteration {iteration + 1}/{MAX_ITERATIONS}")

        response = anthropic_client.messages.create(
            model=model,
            max_tokens=2000,
            system=COORDINATOR_SYSTEM_PROMPT,
            tools=tools,
            messages=messages,
        )

        # Check if Claude returned tool uses
        tool_uses = [block for block in response.content if block.type == "tool_use"]

        if not tool_uses:
            # No tool uses -- Claude returned final text
            text_blocks = [block.text for block in response.content if hasattr(block, "text")]
            return " ".join(text_blocks)

        # Execute tools in parallel
        logger.info(f"Executing {len(tool_uses)} tool calls in parallel")
        tool_results = await execute_tool_calls(ctx, tool_uses, routing_table)

        # Append assistant response + tool results to messages
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

    # Max iterations reached
    text_blocks = [block.text for block in response.content if hasattr(block, "text")]
    final_text = " ".join(text_blocks)
    return final_text + "\n\n(Note: reasoning loop capped at 5 iterations)"
