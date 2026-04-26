"""
Event bus for publishing and subscribing to CardiacLink agent events.
Supports both in-memory queues (for local dev) and Redis pub/sub (for production).
"""
import asyncio
import json
import os
from collections import defaultdict
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, Optional

# Try to import redis; gracefully degrade if not available
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class EventBus:
    """
    Singleton event bus for agent lifecycle events.
    """
    _instance: Optional['EventBus'] = None
    _lock = asyncio.Lock()

    def __init__(self):
        self.redis_url = os.getenv('BUS_REDIS_URL', '')
        self.use_redis = bool(self.redis_url) and REDIS_AVAILABLE

        # In-memory queues: emergency_id -> list of asyncio.Queue
        self._subscribers: Dict[str, list[asyncio.Queue]] = defaultdict(list)

        # Redis client (if enabled)
        self._redis_client: Optional[redis.Redis] = None
        self._redis_pubsub: Optional[redis.client.PubSub] = None

    @classmethod
    async def get_instance(cls) -> 'EventBus':
        """Get or create the singleton instance."""
        if cls._instance is None:
            async with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
                    if cls._instance.use_redis:
                        await cls._instance._init_redis()
        return cls._instance

    async def _init_redis(self):
        """Initialize Redis connection."""
        if not self.use_redis:
            return

        try:
            self._redis_client = redis.from_url(
                self.redis_url,
                encoding='utf-8',
                decode_responses=True
            )
            await self._redis_client.ping()
            print(f"[EventBus] Connected to Redis at {self.redis_url}")
        except Exception as e:
            print(f"[EventBus] Failed to connect to Redis: {e}. Falling back to in-memory queues.")
            self.use_redis = False
            self._redis_client = None

    def _channel_name(self, emergency_id: str) -> str:
        """Get Redis channel name for an emergency."""
        return f"cardiaclink:emergency:{emergency_id}"

    async def publish(
        self,
        emergency_id: str,
        agent: str,
        capability: str,
        phase: str,
        summary: str,
        data: Optional[Dict[str, Any]] = None
    ):
        """
        Publish an event to all subscribers of this emergency.

        Args:
            emergency_id: The emergency ID
            agent: Agent name (e.g., "coordinator", "voice", "aed")
            capability: Agent capability (e.g., "dispatch", "cpr", "aed-location")
            phase: Event phase ("request", "result", "error", "heartbeat")
            summary: Human-readable summary
            data: Additional event data (optional)
        """
        event = {
            'ts': datetime.utcnow().isoformat() + 'Z',
            'emergency_id': emergency_id,
            'agent': agent,
            'capability': capability,
            'phase': phase,
            'summary': summary,
            'data': data or {}
        }

        # Publish to Redis if enabled
        if self.use_redis and self._redis_client:
            try:
                await self._redis_client.publish(
                    self._channel_name(emergency_id),
                    json.dumps(event)
                )
            except Exception as e:
                print(f"[EventBus] Redis publish error: {e}")

        # Publish to in-memory subscribers
        if emergency_id in self._subscribers:
            # Create a copy of the subscriber list to avoid modification during iteration
            subscribers = list(self._subscribers[emergency_id])
            for queue in subscribers:
                try:
                    await queue.put(event)
                except Exception as e:
                    print(f"[EventBus] In-memory publish error: {e}")

    async def subscribe(self, emergency_id: str) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Subscribe to events for a specific emergency.
        Yields events as they arrive.

        Args:
            emergency_id: The emergency ID to subscribe to

        Yields:
            Event dictionaries
        """
        if self.use_redis and self._redis_client:
            # Redis subscription
            pubsub = self._redis_client.pubsub()
            try:
                await pubsub.subscribe(self._channel_name(emergency_id))
                async for message in pubsub.listen():
                    if message['type'] == 'message':
                        try:
                            event = json.loads(message['data'])
                            yield event
                        except json.JSONDecodeError:
                            continue
            finally:
                await pubsub.unsubscribe(self._channel_name(emergency_id))
                await pubsub.close()
        else:
            # In-memory subscription
            queue: asyncio.Queue = asyncio.Queue()
            self._subscribers[emergency_id].append(queue)

            try:
                while True:
                    event = await queue.get()
                    yield event
            finally:
                # Clean up: remove queue from subscribers
                if emergency_id in self._subscribers:
                    try:
                        self._subscribers[emergency_id].remove(queue)
                        if not self._subscribers[emergency_id]:
                            del self._subscribers[emergency_id]
                    except (ValueError, KeyError):
                        pass


# Global convenience functions
async def publish(
    emergency_id: str,
    agent: str,
    capability: str,
    phase: str,
    summary: str,
    data: Optional[Dict[str, Any]] = None
):
    """Publish an event to the bus."""
    bus = await EventBus.get_instance()
    await bus.publish(emergency_id, agent, capability, phase, summary, data)


async def subscribe(emergency_id: str) -> AsyncGenerator[Dict[str, Any], None]:
    """Subscribe to events for an emergency."""
    bus = await EventBus.get_instance()
    async for event in bus.subscribe(emergency_id):
        yield event
