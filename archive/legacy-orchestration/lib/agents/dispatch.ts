import { supabaseServer as _supabaseServer } from '../supabase/server';
import Anthropic from '@anthropic-ai/sdk';

// Cast to any — Supabase Database type has no table definitions;
// this file is legacy (not on demo critical path) and will be migrated later.
const supabaseServer = _supabaseServer as any;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runDispatchAgent(emergencyId: string) {
  try {
    console.log(`[DispatchAgent] Starting for emergency ${emergencyId}`);

    // 1. Get emergency details
    const { data: emergency, error: emergencyError } = await supabaseServer
      .from('emergencies')
      .select('*')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      console.error('[DispatchAgent] Failed to get emergency:', emergencyError);
      return;
    }

    // 2. Get location details from agent events
    const { data: locationEvents } = await supabaseServer
      .from('agent_events')
      .select('*')
      .eq('emergency_id', emergencyId)
      .eq('agent_name', 'location')
      .eq('event_type', 'address_resolved')
      .limit(1)
      .single();

    const address = locationEvents?.payload?.address || 'Location unavailable';

    // 3. Log dispatch connection
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'dispatch',
      event_type: 'dispatch_connected',
      payload: {
        message: 'Connecting to 911 dispatch...',
      },
    });

    console.log('[DispatchAgent] Connected to dispatch');

    // 4. Generate realistic dispatcher dialogue using Claude
    const prompt = `You are a 911 dispatcher receiving a cardiac arrest emergency call. Generate a realistic, professional dialogue exchange between dispatcher and the CardiacLink AI system reporting the emergency.

Emergency Details:
- Type: Cardiac arrest
- Location: ${address}
- Coordinates: ${emergency.patient_lat.toFixed(4)}, ${emergency.patient_lon.toFixed(4)}
- Volunteers: Already dispatched to scene
- AED: Being retrieved
- CPR: In progress

Generate 4-6 brief, realistic dispatcher messages that would be sent in sequence. Keep each message under 20 words. Include:
1. Initial acknowledgment
2. Confirmation of location
3. Status update on ambulance dispatch
4. Instructions/reassurance
5. ETA update

Return ONLY a JSON array of messages, nothing else:
["message1", "message2", ...]`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        // Parse the JSON array of messages
        const messages = JSON.parse(content.text);

        // Send each message with a delay to simulate real conversation
        for (let i = 0; i < messages.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, i * 3000)); // 3s delay between messages

          await supabaseServer.from('agent_events').insert({
            emergency_id: emergencyId,
            agent_name: 'dispatch',
            event_type: 'dispatcher_message',
            payload: {
              message: messages[i],
              sequence: i + 1,
            },
          });

          console.log(`[DispatchAgent] Dispatcher: ${messages[i]}`);
        }

        // Calculate simulated ambulance ETA (3-8 minutes)
        const eta = Math.floor(Math.random() * 6) + 3;

        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'dispatch',
          event_type: 'ambulance_dispatched',
          payload: {
            eta_minutes: eta,
            unit_id: `A-${Math.floor(Math.random() * 900) + 100}`,
          },
        });

        console.log(`[DispatchAgent] Ambulance dispatched, ETA ${eta} minutes`);

        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'dispatch',
          event_type: 'complete',
          payload: {},
        });

        console.log('[DispatchAgent] Complete');
      }
    } catch (claudeError) {
      console.error('[DispatchAgent] Claude API error:', claudeError);

      // Fallback to hardcoded messages if Claude fails
      const fallbackMessages = [
        '911, what is your emergency?',
        'Cardiac arrest confirmed. Location received.',
        'Dispatching nearest ambulance unit now.',
        'ETA 5 minutes. Continue CPR until paramedics arrive.',
        'Help is on the way. Stay on the line.',
      ];

      for (let i = 0; i < fallbackMessages.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, i * 2000));

        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'dispatch',
          event_type: 'dispatcher_message',
          payload: {
            message: fallbackMessages[i],
            sequence: i + 1,
          },
        });
      }

      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'dispatch',
        event_type: 'ambulance_dispatched',
        payload: {
          eta_minutes: 5,
          unit_id: 'A-101',
        },
      });

      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'dispatch',
        event_type: 'complete',
        payload: {},
      });
    }
  } catch (error) {
    console.error('[DispatchAgent] Error:', error);
  }
}
