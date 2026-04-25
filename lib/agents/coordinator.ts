import Anthropic from '@anthropic-ai/sdk';
import { runLocationAgent } from './location';
import { runResponderAgent } from './responder';
import { runAEDAgent } from './aed';
import { runCPRAgent } from './cpr';
import { runDispatchAgent } from './dispatch';
import { runFamilyAgent } from './family';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools: Anthropic.Tool[] = [
  {
    name: 'run_location_agent',
    description:
      'Get precise GPS location and address of the patient using reverse geocoding. This determines where the emergency is happening.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_id: {
          type: 'string',
          description: 'The emergency ID',
        },
      },
      required: ['emergency_id'],
    },
  },
  {
    name: 'run_responder_agent',
    description:
      'Find and dispatch nearby CPR-trained volunteers within 500m of the emergency. They will rush to the scene to provide immediate assistance.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_id: {
          type: 'string',
          description: 'The emergency ID',
        },
      },
      required: ['emergency_id'],
    },
  },
  {
    name: 'run_aed_agent',
    description:
      'Locate the nearest AED (Automated External Defibrillator) and assign a volunteer to retrieve it. Critical for cardiac arrest survival.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_id: {
          type: 'string',
          description: 'The emergency ID',
        },
      },
      required: ['emergency_id'],
    },
  },
  {
    name: 'run_cpr_agent',
    description:
      'Start AI-guided CPR instructions with metronome beat at 100 BPM. Provides real-time guidance to bystanders performing compressions.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_id: {
          type: 'string',
          description: 'The emergency ID',
        },
      },
      required: ['emergency_id'],
    },
  },
  {
    name: 'run_dispatch_agent',
    description:
      'Connect to 911 dispatcher and coordinate professional ambulance response. Simulates realistic dispatcher communication.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_id: {
          type: 'string',
          description: 'The emergency ID',
        },
      },
      required: ['emergency_id'],
    },
  },
  {
    name: 'run_family_agent',
    description:
      'Notify emergency contacts of the situation via SMS. Sends compassionate, informative message to family members.',
    input_schema: {
      type: 'object',
      properties: {
        emergency_id: {
          type: 'string',
          description: 'The emergency ID',
        },
      },
      required: ['emergency_id'],
    },
  },
];

const SYSTEM_PROMPT = `You are the Coordinator of CardiacLink, an AI-powered emergency response system. A cardiac arrest has just been reported.

Your mission: Orchestrate a multi-agent response to maximize the patient's survival chances.

CRITICAL FACTS:
- Brain damage starts after 4 minutes without oxygen
- Survival rate drops 10% per minute without CPR
- Every second counts - act decisively
- You can call multiple tools in parallel when appropriate

AVAILABLE AGENTS (as tools):
1. location - Get precise GPS and address
2. responder - Dispatch nearby volunteers
3. aed - Locate and retrieve defibrillator
4. cpr - Guide bystander through CPR
5. dispatch - Connect to 911 and coordinate ambulance
6. family - Notify emergency contacts

STRATEGY:
- Start with location + responder + dispatch in parallel (immediate priorities)
- Then launch aed + cpr + family in parallel
- Think out loud about your decisions - humans are monitoring
- Be aggressive with parallel execution - this is life or death

Your reasoning will be streamed to the emergency operations team in real-time. Make it clear, decisive, and urgent.`;

export async function runCoordinator(
  emergencyId: string,
  onStream?: (text: string) => void
) {
  console.log(`[Coordinator] Starting orchestration for emergency ${emergencyId}`);

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `CARDIAC ARREST EMERGENCY DETECTED

Emergency ID: ${emergencyId}
Status: ACTIVE
Time: ${new Date().toISOString()}

Initiate emergency response protocol NOW.`,
    },
  ];

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2000,
      tools,
      messages,
      system: SYSTEM_PROMPT,
      stream: true,
    });

    let currentText = '';

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          const text = event.delta.text;
          currentText += text;
          if (onStream) {
            onStream(text);
          }
        }
      }

      if (event.type === 'message_delta') {
        if (event.delta.stop_reason === 'tool_use') {
          console.log('[Coordinator] Claude requested tool use');
        }
      }

      if (event.type === 'content_block_stop') {
        // Content block finished
      }

      if (event.type === 'message_stop') {
        // Message complete - process tool calls
        break;
      }
    }

    // Get the final message to extract tool uses
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 2000,
      tools,
      messages,
      system: SYSTEM_PROMPT,
    });

    // Execute tool calls
    const toolCalls = message.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (toolCalls.length > 0) {
      console.log(`[Coordinator] Executing ${toolCalls.length} tool calls...`);

      if (onStream) {
        onStream(`\n\n[Executing ${toolCalls.length} agents in parallel...]\n`);
      }

      // Execute all tool calls in parallel
      const toolPromises = toolCalls.map(async (toolCall) => {
        const { name, input } = toolCall;
        const params = input as { emergency_id: string };

        console.log(`[Coordinator] Calling ${name}`);

        switch (name) {
          case 'run_location_agent':
            return runLocationAgent(params.emergency_id);
          case 'run_responder_agent':
            return runResponderAgent(params.emergency_id);
          case 'run_aed_agent':
            return runAEDAgent(params.emergency_id);
          case 'run_cpr_agent':
            return runCPRAgent(params.emergency_id);
          case 'run_dispatch_agent':
            return runDispatchAgent(params.emergency_id);
          case 'run_family_agent':
            return runFamilyAgent(params.emergency_id);
          default:
            console.warn(`[Coordinator] Unknown tool: ${name}`);
        }
      });

      await Promise.all(toolPromises);

      if (onStream) {
        onStream(`\n[All agents activated successfully]\n`);
      }

      console.log('[Coordinator] All agents launched');
    }

    console.log('[Coordinator] Orchestration complete');
  } catch (error) {
    console.error('[Coordinator] Error:', error);
    throw error;
  }
}
