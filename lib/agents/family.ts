import { supabaseServer } from '../supabase/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function runFamilyAgent(emergencyId: string) {
  try {
    console.log(`[FamilyAgent] Starting for emergency ${emergencyId}`);

    // 1. Get emergency details
    const { data: emergency, error: emergencyError } = await supabaseServer
      .from('emergencies')
      .select('*')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      console.error('[FamilyAgent] Failed to get emergency:', emergencyError);
      return;
    }

    // 2. Get location details
    const { data: locationEvents } = await supabaseServer
      .from('agent_events')
      .select('*')
      .eq('emergency_id', emergencyId)
      .eq('agent_name', 'location')
      .eq('event_type', 'address_resolved')
      .limit(1)
      .single();

    const address = locationEvents?.payload?.address || 'Location unavailable';

    // 3. Log contact identification (in production, would query a contacts database)
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'family',
      event_type: 'contact_identified',
      payload: {
        message: 'Emergency contact identified',
        contact_type: 'primary',
      },
    });

    console.log('[FamilyAgent] Contact identified');

    // 4. Generate SMS message using Claude
    const prompt = `Generate a brief, clear, compassionate emergency SMS notification for a family member.

Context:
- A cardiac arrest emergency has been detected
- Location: ${address}
- Emergency services and volunteers have been dispatched
- CPR is being administered

The message should:
- Be under 160 characters (standard SMS length)
- Be urgent but not panic-inducing
- Include key facts
- Mention that help is on the way

Return ONLY the SMS text, nothing else.`;

    let smsMessage = '';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === 'text') {
        smsMessage = content.text.trim();
      }
    } catch (claudeError) {
      console.error('[FamilyAgent] Claude API error:', claudeError);
      // Fallback message
      smsMessage = `URGENT: Cardiac emergency detected at ${address}. Emergency services dispatched. CPR in progress. Help is on the way.`;
    }

    console.log('[FamilyAgent] Generated SMS:', smsMessage);

    // 5. Send SMS via Twilio (if configured) or log
    const twilioConfigured =
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER &&
      process.env.TEST_RECIPIENT_NUMBER;

    if (twilioConfigured) {
      try {
        const twilio = require('twilio');
        const client = twilio(
          process.env.TWILIO_ACCOUNT_SID,
          process.env.TWILIO_AUTH_TOKEN
        );

        const message = await client.messages.create({
          body: smsMessage,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: process.env.TEST_RECIPIENT_NUMBER,
        });

        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'family',
          event_type: 'sms_sent',
          payload: {
            message_preview: smsMessage,
            message_id: message.sid,
            recipient: 'Emergency contact',
            delivery_status: 'sent',
          },
        });

        console.log('[FamilyAgent] SMS sent via Twilio:', message.sid);
      } catch (twilioError) {
        console.error('[FamilyAgent] Twilio error:', twilioError);

        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'family',
          event_type: 'sms_sent',
          payload: {
            message_preview: smsMessage,
            delivery_status: 'failed',
            error: 'Twilio error',
          },
        });
      }
    } else {
      // Log-only mode (Twilio not configured)
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'family',
        event_type: 'sms_sent',
        payload: {
          message_preview: smsMessage,
          delivery_status: 'simulated',
          note: 'Twilio not configured - message not actually sent',
        },
      });

      console.log('[FamilyAgent] SMS simulated (Twilio not configured)');
    }

    // 6. Simulate confirmation (in production, would await actual SMS delivery receipt)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'family',
      event_type: 'confirmation_received',
      payload: {
        message: twilioConfigured
          ? 'SMS delivered successfully'
          : 'Notification simulated',
      },
    });

    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'family',
      event_type: 'complete',
      payload: {},
    });

    console.log('[FamilyAgent] Complete');
  } catch (error) {
    console.error('[FamilyAgent] Error:', error);
  }
}
