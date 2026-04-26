"""Helper script to add event publishing to specialist agents.
Adds import and heartbeat to remaining agents.
"""
import os
import sys

# Add imports and heartbeat to each specialist
SPECIALISTS = [
    {
        "file": "bus/specialists/ems_agent.py",
        "agent_name": "ems",
        "capability": "ems-dispatch"
    },
    {
        "file": "bus/specialists/drone_agent.py",
        "agent_name": "drone",
        "capability": "drone-delivery"
    },
    {
        "file": "bus/specialists/handoff_agent.py",
        "agent_name": "handoff",
        "capability": "hospital-handoff"
    },
    {
        "file": "bus/specialists/triage_agent.py",
        "agent_name": "triage",
        "capability": "medical-triage"
    },
    {
        "file": "bus/specialists/optimizer_agent.py",
        "agent_name": "optimizer",
        "capability": "aed-optimization"
    },
]

def add_event_bus_import(content: str) -> str:
    """Add event_bus import if not present."""
    if "from shared.event_bus import publish" in content:
        return content

    # Find the last import line from shared
    lines = content.split('\n')
    insert_index = None
    for i, line in enumerate(lines):
        if line.startswith('from shared.'):
            insert_index = i + 1

    if insert_index:
        lines.insert(insert_index, "from shared.event_bus import publish")
        return '\n'.join(lines)
    return content

def add_heartbeat(content: str, agent_name: str, capability: str) -> str:
    """Add heartbeat function and interval setup."""
    if "async def heartbeat" in content:
        return content  # Already has heartbeat

    lines = content.split('\n')

    # Find startup function and add interval
    for i, line in enumerate(lines):
        if '@agent.on_event("startup")' in line:
            # Find the end of the startup function
            indent_level = None
            for j in range(i+1, len(lines)):
                if lines[j].strip() and indent_level is None:
                    # First non-empty line determines indent
                    indent_level = len(lines[j]) - len(lines[j].lstrip())

                if indent_level and lines[j].strip() and not lines[j].startswith(' ' * indent_level):
                    # End of function
                    # Add heartbeat interval before end
                    insert_lines = [
                        '',
                        ' ' * indent_level + '# Schedule heartbeat every 5 seconds',
                        ' ' * indent_level + 'agent.on_interval(period=5.0)(heartbeat)',
                    ]
                    lines[j-1:j-1] = insert_lines
                    break
            break

    # Add heartbeat function after startup
    for i, line in enumerate(lines):
        if '@agent.on_event("startup")' in line:
            # Find end of startup function
            for j in range(i+1, len(lines)):
                if lines[j].strip() and not lines[j].startswith('    ') and not lines[j].startswith('\t'):
                    # Insert heartbeat function here
                    heartbeat_code = f'''
    async def heartbeat(ctx: Context):
        """Publish periodic heartbeat to event bus."""
        await publish(
            emergency_id="heartbeat",
            agent="{agent_name}",
            capability="{capability}",
            phase="heartbeat",
            summary="{agent_name.title()} agent active",
            data={{"address": str(agent.address)}}
        )
'''
                    lines.insert(j, heartbeat_code)
                    break
            break

    return '\n'.join(lines)

def main():
    root = os.path.dirname(os.path.dirname(__file__))

    for spec in SPECIALISTS:
        path = os.path.join(root, '..', spec['file'])
        print(f"Processing {spec['file']}...")

        with open(path, 'r') as f:
            content = f.read()

        # Add import
        content = add_event_bus_import(content)

        # Add heartbeat
        content = add_heartbeat(content, spec['agent_name'], spec['capability'])

        with open(path, 'w') as f:
            f.write(content)

        print(f"  ✓ Updated {spec['file']}")

if __name__ == "__main__":
    main()
