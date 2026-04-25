"""Run all CardiacLink agents in a single Bureau process.

For local development and demo. In production, agents would run in separate
processes or on Agentverse.
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Add parent directory to path to import bus modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from uagents import Bureau

from coordinator.agent import create_coordinator_agent
from specialists.voice_agent import create_voice_agent
from specialists.aed_agent import create_aed_agent
from specialists.ems_agent import create_ems_agent
from specialists.handoff_agent import create_handoff_agent
from specialists.optimizer_agent import create_optimizer_agent
from specialists.triage_agent import create_triage_agent
from specialists.drone_agent import create_drone_agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%H:%M:%S",
)

logger = logging.getLogger(__name__)


def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Check required seeds
    required_seeds = [
        "COORDINATOR_SEED",
        "VOICE_SEED",
        "AED_SEED",
        "EMS_SEED",
        "HANDOFF_SEED",
        "OPTIMIZER_SEED",
        "TRIAGE_SEED",
        "DRONE_SEED",
    ]

    missing = [s for s in required_seeds if not os.getenv(s)]
    if missing:
        logger.error(f"Missing required environment variables: {', '.join(missing)}")
        logger.error("Please copy .env.example to .env and fill in all seeds")
        sys.exit(1)

    # Create all agents
    logger.info("Creating agents...")

    coordinator = create_coordinator_agent(os.getenv("COORDINATOR_SEED"))
    voice = create_voice_agent(os.getenv("VOICE_SEED"))
    aed = create_aed_agent(os.getenv("AED_SEED"))
    ems = create_ems_agent(os.getenv("EMS_SEED"))
    handoff = create_handoff_agent(os.getenv("HANDOFF_SEED"))
    optimizer = create_optimizer_agent(os.getenv("OPTIMIZER_SEED"))
    triage = create_triage_agent(os.getenv("TRIAGE_SEED"))
    drone = create_drone_agent(os.getenv("DRONE_SEED"))

    # Create Bureau
    bureau = Bureau()
    bureau.add(coordinator)
    bureau.add(voice)
    bureau.add(aed)
    bureau.add(ems)
    bureau.add(handoff)
    bureau.add(optimizer)
    bureau.add(triage)
    bureau.add(drone)

    # Print startup banner
    print("=" * 80)
    print("CardiacLink agents up. Register these on agentverse.ai:")
    print("-" * 80)
    print(f"Coordinator   {coordinator.address}   \"Cardiac emergency dispatch orchestrator\"")
    print(f"Voice         {voice.address}   \"ElevenLabs CPR voice narration\"")
    print(f"AED           {aed.address}   \"AED locator (UCLA + OpenAEDMap, H3-ranked)\"")
    print(f"EMS           {ems.address}   \"911 / EMS dispatch handoff\"")
    print(f"Handoff       {handoff.address}   \"Hospital handoff + FHIR audit log\"")
    print(f"Optimizer     {optimizer.address}   \"AED placement optimizer (Buter 2024 / GRASP)\"")
    print(f"Triage        {triage.address}   \"MDAgents complexity classifier\"")
    print(f"Drone         {drone.address}   \"UAV-AED delivery (Schierbeck 2023)\"")
    print("=" * 80)
    print()
    print("Press Ctrl+C to stop.")
    print()

    # Run the bureau
    try:
        bureau.run()
    except KeyboardInterrupt:
        logger.info("Shutting down...")


if __name__ == "__main__":
    main()
