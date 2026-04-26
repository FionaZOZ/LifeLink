# Claude Code prompt — Polish /gemma-demo for unlimited multi-turn conversations

> Paste everything below the `---` line into Claude Code.
> Run from the repo root: `/Users/emilysun/Downloads/CardicLinkNew-master/`.
> Switch to Opus 4.6 first: `/model claude-opus-4-6`.
>
> **Prerequisite:** the basic `/gemma-demo` page from `gemma-demo-prompt.md` must already be merged and working.

---

## CardiacLink Gemma demo — Unlimited multi-turn conversations + UX polish

### Mission

The current `/gemma-demo` page works but has 5 conversation-experience gaps that would surface during a real demo or judge interaction:

1. **Context window will overflow** after 20-30 turns (Gemma 2's 8K limit)
2. **No way to stop a runaway response** mid-generation
3. **No way to regenerate** an unsatisfying answer
4. **Refreshing loses the conversation**
5. **No visibility into context usage** — judges asking "how does it know it has limits" can't see the answer

Fix all 5. **Don't break the existing UI** — add features additively. The demo flow (open page → wait for ready → ask question → see streaming answer → turn off WiFi → ask again) MUST continue to work exactly the same after these changes.

### Scope

**Files to modify:**
- `app/gemma-demo/page.tsx` (main UI)
- `lib/gemma/loader.ts` (add abort + sliding window)

**Files to create:**
- `lib/gemma/conversationStore.ts` — localStorage persistence

**Files NOT to touch:**
- `lib/gemma/systemPrompt.ts` — system prompt is fine
- Anything outside `app/gemma-demo/` and `lib/gemma/`
- Existing CardiacLink production code — `app/emergency/`, `app/cpr/`, `app/demo/`, `components/`, `lib/useEmergencyTelemetry.ts`, etc.

---

### Phase 1 — Sliding window context management (45 min)

**Goal:** the conversation can keep going indefinitely. Old messages drop out gracefully when context fills up.

#### 1a. Token counting helper

Gemma 2 uses SentencePiece tokenizer. Rough estimate: 1 token ≈ 3.5 characters for English. Add a helper to `lib/gemma/loader.ts`:

```typescript
/**
 * Estimate token count for a string. Approximate—real count comes from the
 * pipeline's tokenizer, but for sliding-window decisions we don't need exact.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

/**
 * Estimate total tokens for a chat conversation.
 */
export function estimateConversationTokens(
  systemPrompt: string,
  messages: ChatMessage[],
): number {
  // System prompt overhead + per-message role/structure overhead
  let total = estimateTokens(systemPrompt) + 30;
  for (const m of messages) {
    total += estimateTokens(m.content) + 8; // 8 for role tokens + structure
  }
  return total;
}
```

#### 1b. Sliding window before generation

Modify `generateStream` in `lib/gemma/loader.ts`. Before sending to the pipeline, trim messages so the conversation fits within the model's context window minus reserved space for the response.

```typescript
const MODEL_CONTEXT_TOKENS = 8192;     // Gemma 2 2B
const RESPONSE_RESERVE_TOKENS = 384;   // leave room for the answer
const MAX_PROMPT_TOKENS = MODEL_CONTEXT_TOKENS - RESPONSE_RESERVE_TOKENS;

function applySlidingWindow(
  systemPrompt: string,
  messages: ChatMessage[],
): { messages: ChatMessage[]; dropped: number } {
  // Always keep system prompt + most recent messages
  // Drop oldest pairs (user + assistant) until under the limit
  let dropped = 0;
  let working = [...messages];

  while (estimateConversationTokens(systemPrompt, working) > MAX_PROMPT_TOKENS && working.length > 1) {
    // Drop the oldest pair (user + assistant). If only one msg, drop it.
    if (working.length >= 2 && working[0].role === 'user' && working[1].role === 'assistant') {
      working = working.slice(2);
      dropped += 2;
    } else {
      working = working.slice(1);
      dropped += 1;
    }
  }

  return { messages: working, dropped };
}
```

In `generateStream`, apply the window:

```typescript
const generateStream = async (
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (delta: string, full: string) => void,
  signal?: AbortSignal,    // NEW — see Phase 2
): Promise<{ text: string; droppedMessages: number; tokensUsed: number }> => {
  const pipe = await ensureLoaded();
  if (!pipe) throw new Error('Pipeline failed to load');

  setStatus({ kind: 'generating' });

  const { messages: trimmed, dropped } = applySlidingWindow(systemPrompt, messages);
  const tokensUsed = estimateConversationTokens(systemPrompt, trimmed);

  const formatted = [
    { role: 'system', content: systemPrompt },
    ...trimmed,
  ];

  // ...rest of existing streaming logic, plus signal support (next phase)
  return { text: fullText, droppedMessages: dropped, tokensUsed };
};
```

The page can now show "Dropped 4 oldest messages to fit context" if `dropped > 0`. A subtle UI hint, not an error.

#### Commit

```bash
git add -A
git commit -m "phase 1: sliding window context management for unlimited conversation"
```

---

### Phase 2 — Stop generation mid-stream (30 min)

**Goal:** a "Stop" button that cancels Gemma's current response without breaking the page.

Transformers.js supports stopping by checking an abort signal in the `streamer` callback. Update `generateStream`:

```typescript
const { TextStreamer, InterruptableStoppingCriteria } = await import('@huggingface/transformers');

// Create a stopping criteria controlled by the AbortSignal
const stoppingCriteria = new InterruptableStoppingCriteria();
if (signal) {
  if (signal.aborted) stoppingCriteria.interrupt();
  signal.addEventListener('abort', () => stoppingCriteria.interrupt(), { once: true });
}

const streamer = new TextStreamer(pipe.tokenizer, {
  skip_prompt: true,
  skip_special_tokens: true,
  callback_function: (text: string) => {
    if (signal?.aborted) return; // stop streaming to UI immediately
    fullText += text;
    onChunk(text, fullText);
  },
});

await pipe(formatted, {
  max_new_tokens: 256,
  do_sample: true,
  temperature: 0.7,
  top_p: 0.9,
  streamer,
  stopping_criteria: stoppingCriteria,
});
```

If `InterruptableStoppingCriteria` doesn't exist in your version of `@huggingface/transformers`, fall back to a manual approach: in the streamer's `callback_function`, throw a special error when `signal.aborted` is true, and catch it in `generateStream`:

```typescript
class AbortGenerationError extends Error {}

callback_function: (text: string) => {
  if (signal?.aborted) {
    throw new AbortGenerationError('User aborted');
  }
  fullText += text;
  onChunk(text, fullText);
},

// In the wrapping try/catch:
try {
  await pipe(formatted, { ... });
} catch (e) {
  if (e instanceof AbortGenerationError) {
    // Expected — user clicked Stop. Don't surface as error.
  } else {
    throw e;
  }
}
```

#### Commit

```bash
git add -A
git commit -m "phase 2: stop button — abort signal interrupts generation mid-stream"
```

---

### Phase 3 — Conversation persistence + clear (30 min)

**Goal:** refresh the page, conversation is restored. Also a "Clear" button.

Create `lib/gemma/conversationStore.ts`:

```typescript
'use client';

import type { ChatMessage } from './loader';

const STORAGE_KEY = 'cardiaclink:gemma-demo-conversation';
const MAX_STORED_MESSAGES = 200;  // hard cap so localStorage doesn't bloat

export interface StoredConversation {
  messages: ChatMessage[];
  updatedAt: number;
}

export function loadConversation(): ChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: StoredConversation = JSON.parse(raw);
    // Validate shape
    if (!Array.isArray(parsed.messages)) return [];
    return parsed.messages.filter(m => 
      m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
    );
  } catch {
    return [];
  }
}

export function saveConversation(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    const data: StoredConversation = {
      messages: trimmed,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    // localStorage quota exceeded — drop older messages and retry
    console.warn('[gemma] localStorage save failed:', err);
    try {
      const half = messages.slice(-Math.floor(messages.length / 2));
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages: half, updatedAt: Date.now() }));
    } catch {
      // give up — clearing is the user's responsibility
    }
  }
}

export function clearConversation(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
```

In `app/gemma-demo/page.tsx`:

- On mount: `setMessages(loadConversation())`.
- On every `setMessages` update: also call `saveConversation(newMessages)` (debounce 500ms to avoid excessive writes during streaming).
- Add a Clear button next to the input form.

#### Commit

```bash
git add -A
git commit -m "phase 3: conversation persistence (localStorage) + clear button"
```

---

### Phase 4 — UI polish: token counter, stop button, regenerate (60 min)

**Goal:** show conversation health in the UI and give users control.

Update the page header status bar to include token usage:

```tsx
{status.kind === 'ready' && (
  <div className="flex items-center gap-3 flex-wrap">
    <div className="flex items-center gap-2 text-[11px]">
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      <span className="text-emerald-400">Gemma 2B ready</span>
      <span className="text-zinc-500">·</span>
      <span className="text-zinc-400">running locally on your device</span>
    </div>
    {/* NEW: token counter */}
    {tokensUsed > 0 && (
      <div className="text-[10px] text-zinc-500 font-mono">
        Context: {tokensUsed.toLocaleString()} / 8,192 tokens
        {droppedCount > 0 && (
          <span className="ml-2 text-amber-400">· {droppedCount} oldest msg{droppedCount === 1 ? '' : 's'} dropped</span>
        )}
      </div>
    )}
  </div>
)}
```

State to add:

```tsx
const [tokensUsed, setTokensUsed] = useState(0);
const [droppedCount, setDroppedCount] = useState(0);
const abortControllerRef = useRef<AbortController | null>(null);
```

In `submit`:

```tsx
const submit = async (e: FormEvent) => {
  e.preventDefault();
  if (!input.trim() || status.kind !== 'ready') return;

  const userMsg: ChatMessage = { role: 'user', content: input };
  const newMessages = [...messages, userMsg];
  setMessages(newMessages);
  setInput('');
  setStreamingText('…');

  // Set up abort controller
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const result = await generateStream(
      newMessages,
      CPR_SYSTEM_PROMPT,
      (delta, full) => setStreamingText(full),
      controller.signal,
    );
    setMessages([...newMessages, { role: 'assistant', content: result.text }]);
    setTokensUsed(result.tokensUsed);
    setDroppedCount(result.droppedMessages);
    setStreamingText('');
  } catch (err: any) {
    setMessages([...newMessages, { role: 'assistant', content: `[Error: ${err.message}]` }]);
    setStreamingText('');
  } finally {
    abortControllerRef.current = null;
  }
};
```

Stop / Regenerate / Clear buttons in the input form:

```tsx
<form onSubmit={submit} className="border-t border-zinc-800 pt-4">
  <div className="flex gap-2">
    <input
      value={input}
      onChange={(e) => setInput(e.target.value)}
      placeholder={status.kind === 'ready' ? 'Ask anything—conversation continues unlimited' : 'Loading model…'}
      disabled={status.kind !== 'ready'}
      className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-cyan-500 text-sm disabled:opacity-50"
    />
    {status.kind === 'generating' ? (
      <button
        type="button"
        onClick={() => abortControllerRef.current?.abort()}
        className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-medium"
      >
        Stop
      </button>
    ) : (
      <button
        type="submit"
        disabled={status.kind !== 'ready' || !input.trim()}
        className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-sm font-medium transition-colors"
      >
        Send
      </button>
    )}
  </div>
  <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-500">
    <button
      type="button"
      onClick={handleClear}
      disabled={messages.length === 0}
      className="hover:text-zinc-300 disabled:opacity-30"
    >
      Clear conversation
    </button>
    {messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
      <>
        <span>·</span>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={status.kind !== 'ready'}
          className="hover:text-zinc-300 disabled:opacity-30"
        >
          Regenerate last response
        </button>
      </>
    )}
    <span>·</span>
    <span>{messages.length} message{messages.length === 1 ? '' : 's'}</span>
  </div>
</form>
```

Handlers:

```tsx
const handleClear = () => {
  setMessages([]);
  setTokensUsed(0);
  setDroppedCount(0);
  clearConversation();
};

const handleRegenerate = async () => {
  if (status.kind !== 'ready' || messages.length === 0) return;
  const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user');
  if (lastUserIdx < 0) return;
  const cutAt = messages.length - 1 - lastUserIdx;
  const trimmed = messages.slice(0, cutAt + 1); // keep up through last user message

  setMessages(trimmed);
  setStreamingText('…');

  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const result = await generateStream(trimmed, CPR_SYSTEM_PROMPT, (d, f) => setStreamingText(f), controller.signal);
    setMessages([...trimmed, { role: 'assistant', content: result.text }]);
    setTokensUsed(result.tokensUsed);
    setDroppedCount(result.droppedMessages);
    setStreamingText('');
  } catch (err: any) {
    setStreamingText('');
  } finally {
    abortControllerRef.current = null;
  }
};
```

#### Commit

```bash
git add -A
git commit -m "phase 4: stop / regenerate / clear buttons + token counter UI"
```

---

### Phase 5 — Verify (30 min)

Manual test in `http://localhost:3000/gemma-demo` (Chrome on M-series Mac):

1. **Existing flow still works**: page loads, model downloads (or loads from cache if previously visited), status flips to "Ready", asking a question streams a response.
2. **Persistence**: ask a question. Refresh the page. Conversation reappears.
3. **Stop button**: ask a long question (e.g. "Explain CPR in detail with all the steps"). Mid-stream, click Stop. Generation halts, the partial response stays visible.
4. **Regenerate**: click Regenerate after a response. Last assistant message is removed and a new one streams in.
5. **Clear**: click Clear. Conversation empties, localStorage cleared.
6. **Sliding window**: send 20+ short messages. Check the token counter. After ~20 turns, "X oldest msgs dropped" should appear in amber. Conversation continues working.
7. **Offline still works**: turn off network. Ask 5 more questions. All work.
8. **Token counter accuracy**: counter should grow with each turn. After 5 turns it might be ~800 tokens; after 20 turns ~3000-4000.
9. **No console errors** during any of the above.
10. **Build check**: `npm run build` succeeds.

If any step fails, fix before committing the phase.

#### Commit

```bash
git add -A
git commit -m "phase 5: verified unlimited conversation flow end-to-end"
```

---

### What NOT to do

- Don't add multimodal (vision) support. Out of scope for this round.
- Don't add voice input/output. Out of scope.
- Don't try to extend Gemma's context window beyond 8K. The model architecturally caps there. Sliding window is the right answer.
- Don't add automatic summarization of dropped context. Sliding window is sufficient. Summarization adds latency and complexity for marginal gain.
- Don't switch to a different model (Gemma 9B, Llama, etc.). Keep Gemma 2B.
- Don't introduce new dependencies. `@huggingface/transformers` is already installed.
- Don't modify any other CardiacLink page. Standalone demo page only.
- Don't store API keys or PII in localStorage.
- Don't rate-limit the input. Let the user spam questions if they want — that's part of "unlimited."
- Don't auto-clear the conversation on page leave. User decides when to clear.
- Don't change `lib/gemma/systemPrompt.ts` — it's already AHA-grounded and works.

### Acceptance criteria

You're done when ALL hold:

1. Conversation works for ≥30 turns without crashing.
2. Token counter visible and accurate (within ±10% of real count).
3. Stop button halts generation mid-stream within 1 second of clicking.
4. Regenerate replaces the last assistant response with a new one based on the same user prompt.
5. Clear button empties the conversation and localStorage.
6. Refreshing the page restores the conversation from localStorage.
7. Sliding window kicks in after ~20-30 messages (depending on length); "X oldest msgs dropped" indicator appears.
8. Offline mode (WiFi off) continues to work for new turns AND restores conversation from localStorage on refresh.
9. `npm run build` succeeds.
10. No file outside `app/gemma-demo/` and `lib/gemma/` is modified.
11. The basic demo flow (open page → ready → ask → answer) is unchanged.

### Final deliverable

Return:

- Files modified with line-count delta.
- Confirmation that 30+ turn conversation works without crashing on the test machine.
- Approximate tokens-per-second after 20 turns (should still be ~12-20 on M-series — sliding window keeps prompt size bounded).
- A brief demo update narrative — what to add to the script when showing this off:

  > "I can keep this conversation going forever. The model has an 8K context window, so when we get close to filling it, the oldest messages slide out automatically. Watch the counter at the top — currently 4,200 tokens used. Let me ask 10 more questions… [does so] now we're at 7,800 tokens, and you can see 'X oldest messages dropped' in amber. The conversation continues; the model just gracefully forgets the earliest exchanges. Same as how a human would in a long stressful conversation."

- Confirmation: "Existing CardiacLink production code untouched. Only /gemma-demo and /lib/gemma/ files changed."
