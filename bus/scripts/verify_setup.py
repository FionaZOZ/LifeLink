"""Verify CardiacLink agent setup before running."""
import os
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def check_imports():
    """Check all required imports."""
    print("Checking imports...")

    try:
        import uagents
        ver = getattr(uagents, "__version__", "installed")
        print(f"  uagents {ver}")
    except ImportError as e:
        print(f"  MISSING uagents: {e}")
        return False

    try:
        import anthropic
        print(f"  anthropic {anthropic.__version__}")
    except ImportError as e:
        print(f"  MISSING anthropic: {e}")
        return False

    try:
        import dotenv
        print(f"  python-dotenv OK")
    except ImportError as e:
        print(f"  MISSING python-dotenv: {e}")
        return False

    try:
        import h3
        print(f"  h3 OK")
    except ImportError as e:
        print(f"  MISSING h3: {e}")
        return False

    return True


def check_env():
    """Check environment configuration."""
    print("\nChecking environment...")

    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / ".env"

    if not env_path.exists():
        print(f"  .env file not found at {env_path}")
        print(f"    Run: cp .env.example .env")
        return False

    load_dotenv(env_path)

    required = [
        "COORDINATOR_SEED",
        "VOICE_SEED",
        "AED_SEED",
        "EMS_SEED",
        "HANDOFF_SEED",
        "OPTIMIZER_SEED",
        "TRIAGE_SEED",
        "DRONE_SEED",
    ]

    missing = []
    for var in required:
        val = os.getenv(var)
        if not val:
            print(f"  MISSING {var}")
            missing.append(var)
        else:
            display = val[:8] + "..." if len(val) > 8 else val
            print(f"  OK {var} = {display}")

    if missing:
        print(f"\n  Missing: {', '.join(missing)}")
        print(f"  Edit .env and fill in the values")
        return False

    return True


def check_modules():
    """Check our own modules import correctly."""
    print("\nChecking CardiacLink modules...")

    try:
        from shared.protocols import AedQuery
        print("  shared.protocols OK")
    except ImportError as e:
        print(f"  shared.protocols FAILED: {e}")
        return False

    try:
        from shared.chat import enable_chat
        print("  shared.chat OK")
    except ImportError as e:
        print(f"  shared.chat FAILED: {e}")
        return False

    try:
        from coordinator.prompts import COORDINATOR_SYSTEM_PROMPT
        print("  coordinator.prompts OK")
    except ImportError as e:
        print(f"  coordinator.prompts FAILED: {e}")
        return False

    try:
        from specialists.voice_agent import create_voice_agent
        print("  specialists.voice_agent OK")
    except ImportError as e:
        print(f"  specialists.voice_agent FAILED: {e}")
        return False

    try:
        from datasets.ucla_aeds import UCLA_AEDS
        print(f"  datasets.ucla_aeds OK ({len(UCLA_AEDS)} AEDs)")
    except ImportError as e:
        print(f"  datasets.ucla_aeds FAILED: {e}")
        return False

    try:
        from datasets.la_stemi_hospitals import LA_STEMI_HOSPITALS
        print(f"  datasets.la_stemi_hospitals OK ({len(LA_STEMI_HOSPITALS)} hospitals)")
    except ImportError as e:
        print(f"  datasets.la_stemi_hospitals FAILED: {e}")
        return False

    return True


def main():
    """Run all checks."""
    print("=" * 60)
    print("CardiacLink Setup Verification")
    print("=" * 60)

    checks = [
        ("Imports", check_imports),
        ("Environment", check_env),
        ("Modules", check_modules),
    ]

    all_pass = True
    for name, check_fn in checks:
        if not check_fn():
            all_pass = False

    print("\n" + "=" * 60)
    if all_pass:
        print("All checks passed! Ready to run:")
        print("   python -m bus.scripts.run_all")
    else:
        print("Some checks failed. Fix the issues above and try again.")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
