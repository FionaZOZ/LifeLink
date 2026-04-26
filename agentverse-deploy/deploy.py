"""
Programmatic Agentverse deployment for CardiacLink.

Reads agents.toml, posts each agent's code + secrets through the Agentverse
REST API, and prints the resulting addresses. Run once when you stand the
project up; re-run whenever you change a *.py file.

Usage:
    export AGENTVERSE_API_KEY=sk_...
    export ASI1_API_KEY=...           # plus any other per-agent secrets
    export ANTHROPIC_API_KEY=...
    export MONGODB_URI=mongodb+srv://...
    export MONGODB_DB=cardiaclink
    python agentverse-deploy/deploy.py

Notes:
- Agentverse's hosted-agent REST API has shifted shape over the past year.
  The endpoints below match the v1 surface as of early 2026; if a request
  comes back 404 or 401, open https://docs.agentverse.ai → "Hosting API"
  and update the constants at the top of this file. The script is structured
  so you only need to change URLs, not flow.
- If your account doesn't expose the hosting API yet, fall back to the manual
  paste-into-the-web-IDE flow. Each *.py file in this folder is self-contained
  and ready to paste.
"""
from __future__ import annotations
import os
import sys
import json
import time
import urllib.parse
from pathlib import Path

try:
    import tomllib                # Python 3.11+
except ModuleNotFoundError:
    import tomli as tomllib        # type: ignore

try:
    import httpx
except ModuleNotFoundError:
    sys.exit("pip install httpx tomli  (you're missing httpx)")

# ── Configuration ───────────────────────────────────────────────────────────

AGENTVERSE_BASE = os.getenv("AGENTVERSE_BASE", "https://agentverse.ai")

# These paths are the *most likely to drift*. If anything 404s, fix here.
# NOTE: post-create operations are addressed by the agent's bech32 address
# (agent1q...) — Agentverse uses that as the canonical owner-scoped identifier,
# not the human-readable name. Names get URL-decoded ambiguously.
ENDPOINTS = {
    "create":       "/v1/hosting/agents",                       # POST  body: {"name": "..."}
    "list":         "/v1/hosting/agents",                       # GET
    "get":          "/v1/hosting/agents/{ident}",               # GET   ident = name or address
    "put_code":     "/v1/hosting/agents/{address}/code",        # PUT   body: {"code": "..."}
    "put_secret":   "/v1/hosting/agents/{address}/secrets",     # POST  body: {"name": ..., "value": ...}
    "start":        "/v1/hosting/agents/{address}/start",       # POST
    "stop":         "/v1/hosting/agents/{address}/stop",        # POST
}

def _enc(s: str) -> str:
    """URL-encode an identifier so spaces / special chars don't break the path."""
    return urllib.parse.quote(s, safe="")

THIS_DIR = Path(__file__).resolve().parent
MANIFEST = THIS_DIR / "agents.toml"
CACHE    = THIS_DIR / ".deployed.json"   # local-only address cache (gitignored)

# ── Helpers ────────────────────────────────────────────────────────────────

def auth_headers() -> dict:
    key = os.getenv("AGENTVERSE_API_KEY")
    if not key:
        sys.exit("AGENTVERSE_API_KEY is not set. Get one from https://agentverse.ai → Profile → API Keys.")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }

def req(method: str, path: str, *, json_body=None) -> dict:
    """json_body can be a dict, list, or bare string — httpx serializes any of them."""
    url = f"{AGENTVERSE_BASE}{path}"
    r = httpx.request(method, url, headers=auth_headers(), json=json_body, timeout=30.0)
    if r.status_code == 404:
        sys.exit(f"404 from {method} {url}\n"
                 f"  → Agentverse may have moved this endpoint. Edit ENDPOINTS at the top of deploy.py.")
    if r.status_code == 401:
        sys.exit("401 unauthorized — check your AGENTVERSE_API_KEY.")
    if r.status_code >= 400:
        sys.exit(f"{r.status_code} from {method} {url}\n  body: {r.text[:500]}")
    return r.json() if r.content else {}

def req_try(method: str, path: str, *, json_body=None):
    """Like req() but returns (status_code, body_text) instead of exiting on 4xx.
    Used to probe multiple body formats when the API shape is unknown."""
    url = f"{AGENTVERSE_BASE}{path}"
    r = httpx.request(method, url, headers=auth_headers(), json=json_body, timeout=30.0)
    return r.status_code, r.text

def list_agents() -> list[str]:
    """Return a list of agent NAMES. Handles multiple Agentverse response shapes."""
    data = req("GET", ENDPOINTS["list"])

    # Some Agentverse versions wrap the list under a key.
    if isinstance(data, dict):
        for key in ("agents", "items", "results", "data"):
            if key in data and isinstance(data[key], list):
                data = data[key]
                break

    if not isinstance(data, list):
        sys.exit(f"unexpected list-agents response: {type(data).__name__}: {repr(data)[:300]}")

    names: list[str] = []
    for item in data:
        if isinstance(item, str):
            names.append(item)
        elif isinstance(item, dict):
            n = item.get("name") or item.get("agent_name") or item.get("id")
            if n:
                names.append(n)
    return names

def get_agent(ident: str) -> dict:
    """Fetch full details for one agent (by name or address)."""
    data = req("GET", ENDPOINTS["get"].format(ident=_enc(ident)))
    if not isinstance(data, dict):
        sys.exit(f"unexpected get-agent response for {ident}: {repr(data)[:300]}")
    return data

def load_cache() -> dict:
    if CACHE.exists():
        return json.loads(CACHE.read_text())
    return {}

def save_cache(cache: dict):
    CACHE.write_text(json.dumps(cache, indent=2))

def find_or_create(name: str, cache: dict) -> dict:
    """Cache-first lookup. The Agentverse GET /agents/{name} endpoint 404s in
    practice, so we never query for existing agents by name. The cache is the
    source of truth; on miss we POST create and remember the address."""
    if name in cache:
        addr = cache[name]
        print(f"  ✓ cached address: {addr[:18]}…")
        return {"name": name, "address": addr}

    print(f"  + creating new agent: {name}")
    created = req("POST", ENDPOINTS["create"], json_body={"name": name})
    if not isinstance(created, dict) or "address" not in created:
        sys.exit(f"create response missing address: {repr(created)[:300]}")

    cache[name] = created["address"]
    save_cache(cache)
    return created

# Each hosted agent gets these dependencies installed before launch.
REQ_TXT = "uagents\nuagents-core\nopenai\nanthropic\npymongo[srv]\nhttpx\npython-dotenv\n"

# Injected at the top of every agent.py so os.getenv() picks up values from .env.
DOTENV_PREAMBLE = (
    "# Auto-injected by deploy.py: load secrets from .env into os.environ\n"
    "try:\n"
    "    from dotenv import load_dotenv\n"
    "    load_dotenv()\n"
    "except ImportError:\n"
    "    pass\n\n"
)

def build_env_file(secrets: dict[str, str]) -> str:
    """Quote-escape values defensively so an = or # in a token won't break parsing."""
    lines = []
    for k, v in secrets.items():
        if not v:
            continue
        # Wrap in double quotes; escape inner " and \
        esc = v.replace("\\", "\\\\").replace('"', '\\"')
        lines.append(f'{k}="{esc}"')
    return "\n".join(lines) + "\n"

def upload_code(address: str, code: str, secrets: dict[str, str] | None = None):
    """Upload agent.py + requirements.txt + .env (with secrets) as one bundle.

    Confirmed working body shape:
        {"code": json.dumps([{"name": "...", "contents": "..."}, ...])}
    """
    enc = _enc(address)
    secrets = secrets or {}
    sized = f"{len(code)} chars + {len(secrets)} secrets via .env"
    print(f"  ↑ uploading code ({sized})")

    files = [
        {"name": "agent.py",         "contents": DOTENV_PREAMBLE + code},
        {"name": "requirements.txt", "contents": REQ_TXT},
    ]
    if secrets:
        files.append({"name": ".env", "contents": build_env_file(secrets)})

    body = {"code": json.dumps(files)}
    url_path = ENDPOINTS["put_code"].format(address=enc)
    status, text = req_try("PUT", url_path, json_body=body)
    if 200 <= status < 300:
        print(f"  ✓ uploaded {len(files)} file(s)")
        return
    sys.exit(f"upload failed: {status} {text[:300]}")

_secret_method = None  # cached (method, sub_path, body_builder) after first success

def set_secret(address: str, key: str, value: str):
    """Probe-based secret upload. Agentverse's secrets path varies — try common
    sub-paths × body shapes until one returns 2xx, then cache for the rest."""
    global _secret_method
    print(f"  🔑 setting secret {key}={'*' * min(len(value), 8)}")
    enc = _enc(address)

    attempts = [
        # (method, path-template, body-builder)
        ("POST", "/secrets",     lambda k, v: {"name": k, "value": v}),
        ("POST", "/secret",      lambda k, v: {"name": k, "value": v}),
        ("POST", "/env",         lambda k, v: {"name": k, "value": v}),
        ("POST", "/envvars",     lambda k, v: {"name": k, "value": v}),
        ("POST", "/variables",   lambda k, v: {"name": k, "value": v}),
        ("PUT",  "/secrets",     lambda k, v: {"name": k, "value": v}),
        ("PUT",  "/secret",      lambda k, v: {"name": k, "value": v}),
        ("PUT",  "/env",         lambda k, v: {"name": k, "value": v}),
        # Direct key-value shapes
        ("POST", "/secrets",     lambda k, v: {k: v}),
        ("PUT",  "/secrets",     lambda k, v: {k: v}),
        ("POST", "/env",         lambda k, v: {k: v}),
        # JSON-stringified array (mirrors the code-upload pattern)
        ("POST", "/secrets",
            lambda k, v: {"secrets": json.dumps([{"name": k, "value": v}])}),
        ("PUT",  "/secrets",
            lambda k, v: {"secrets": json.dumps([{"name": k, "value": v}])}),
    ]

    def call(method, sub_path, builder):
        url_path = f"/v1/hosting/agents/{enc}{sub_path}"
        return req_try(method, url_path, json_body=builder(key, value))

    if _secret_method is not None:
        method, sub_path, builder = _secret_method
        status, text = call(method, sub_path, builder)
        if 200 <= status < 300:
            return
        print(f"  · cached secret format failed → {status}: {text[:120]}, re-probing…")

    last_err = None
    for method, sub_path, builder in attempts:
        status, text = call(method, sub_path, builder)
        if 200 <= status < 300:
            _secret_method = (method, sub_path, builder)
            print(f"  ✓ secret format works: {method} {sub_path} body={builder('K','V')}")
            return
        last_err = (method, sub_path, status, text)
        # Only print non-404s — 404 means "wrong path", lots of those, noise
        if status != 404:
            print(f"  · {method} {sub_path} → {status}: {text[:120]}")

    sys.exit(f"\nall {len(attempts)} secret formats rejected. Last: {last_err}\n"
             f"NOTE: maybe Agentverse stores secrets via a different parent path, "
             f"like /v1/hosting/secrets/{address[:18]}… — check docs.agentverse.ai")

def start(address: str):
    print(f"  ▶ starting agent {address[:18]}…")
    req("POST", ENDPOINTS["start"].format(address=_enc(address)))

def stop(address: str):
    try:
        req("POST", ENDPOINTS["stop"].format(address=_enc(address)))
    except SystemExit:
        pass  # not running yet

# ── Main ───────────────────────────────────────────────────────────────────

def main():
    if not MANIFEST.exists():
        sys.exit(f"missing {MANIFEST}")

    with MANIFEST.open("rb") as f:
        manifest = tomllib.load(f)

    deployed: list[tuple[str, str]] = []  # (name, address)

    # Pass 1 — create or find every agent first, so the Coordinator's
    # AED_AGENT_ADDRESS / EMS_AGENT_ADDRESS / HANDOFF_AGENT_ADDRESS secrets
    # can be set after pass 1 finishes.
    cache = load_cache()
    address_by_name: dict[str, str] = {}
    for entry in manifest["agent"]:
        name = entry["name"]
        print(f"\n=== {name} ===")
        agent = find_or_create(name, cache)
        addr = agent.get("address", "")
        if not addr:
            sys.exit(f"  ⚠ no address for {name} — check Agentverse manually")
        print(f"  📮 address: {addr}")
        address_by_name[name] = addr

    # Auto-fill specialist addresses for the Coordinator.
    role_map = {
        "AED_AGENT_ADDRESS":     "UCLA AED Locator + Route Optimizer",
        "EMS_AGENT_ADDRESS":     "LAFD EMS + AED Drone Dispatch",
        "HANDOFF_AGENT_ADDRESS": "FHIR R4 Hospital Handoff",
    }
    for env_key, agent_name in role_map.items():
        if address_by_name.get(agent_name):
            os.environ[env_key] = address_by_name[agent_name]

    # Pass 2 — collect secrets, bundle code + secrets into one upload, start.
    for entry in manifest["agent"]:
        name = entry["name"]
        addr = address_by_name.get(name, "")
        if not addr:
            sys.exit(f"no address for {name} — pass 1 didn't return one")
        path = THIS_DIR / entry["file"]
        if not path.exists():
            sys.exit(f"missing file: {path}")

        # Collect secrets from env vars listed in agents.toml
        secrets: dict[str, str] = {}
        for sk in entry.get("secrets", []):
            optional = sk.endswith("?")
            key = sk.rstrip("?")
            val = os.environ.get(key, "")
            if not val:
                if optional:
                    print(f"  · skipping optional {key}")
                    continue
                sys.exit(f"required secret {key} is not in env")
            secrets[key] = val

        print(f"\n--- deploying {name} ({addr[:18]}…) ---")
        stop(addr)  # idempotent
        upload_code(addr, path.read_text(), secrets=secrets)
        start(addr)
        deployed.append((name, addr))

    # Summary
    print("\n" + "═" * 60)
    print(" DEPLOYMENT SUMMARY")
    print("═" * 60)
    for name, addr in deployed:
        print(f"  {name}")
        print(f"    {addr}")
    print()
    print("Copy these into agentverse-deploy/README.md and into .env.local:")
    print()
    print(f"  COORDINATOR_AGENT_ADDRESS={address_by_name.get('CardiacLink Emergency Coordinator', '')}")
    print(f"  AED_AGENT_ADDRESS={address_by_name.get('UCLA AED Locator + Route Optimizer', '')}")
    print(f"  EMS_AGENT_ADDRESS={address_by_name.get('LAFD EMS + AED Drone Dispatch', '')}")
    print(f"  HANDOFF_AGENT_ADDRESS={address_by_name.get('FHIR R4 Hospital Handoff', '')}")
    print()

if __name__ == "__main__":
    main()
