import { supabaseServer } from '../supabase/server';

export async function runCPRAgent(emergencyId: string) {
  try {
    console.log(`[CPRAgent] Starting for emergency ${emergencyId}`);

    // 1. Log CPR started
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'cpr',
      event_type: 'cpr_started',
      payload: {
        message: 'Initiating CPR guidance protocol',
      },
    });

    // 2. Generate CPR coach page URL
    const cprPageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/cpr?emergency_id=${emergencyId}`;

    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'cpr',
      event_type: 'cpr_url_generated',
      payload: {
        url: cprPageUrl,
        message: 'CPR coach page ready - scan QR code on phone',
      },
    });

    console.log('[CPRAgent] CPR coach URL generated:', cprPageUrl);

    // 3. Provide initial CPR instructions
    const instructions = [
      'Place hands in center of chest',
      'Push hard and fast - 2 inches deep',
      'Compress at 100-120 beats per minute',
      'Allow chest to fully recoil between compressions',
      'Minimize interruptions',
    ];

    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'cpr',
      event_type: 'cpr_guidance_issued',
      payload: {
        instructions: instructions,
        voice_instruction: 'Place your hands in the center of the chest. Push hard and fast, at least 2 inches deep. Follow the metronome beat.',
      },
    });

    console.log('[CPRAgent] Initial CPR guidance issued');

    // 4. Start metronome at 100 BPM (600ms per beat)
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'cpr',
      event_type: 'cpr_metronome_started',
      payload: {
        bpm: 100,
        interval_ms: 600,
      },
    });

    console.log('[CPRAgent] Metronome started at 100 BPM');

    // 5. Simulate periodic encouragement/feedback
    startCPRFeedbackLoop(emergencyId);
  } catch (error) {
    console.error('[CPRAgent] Error:', error);
  }
}

async function startCPRFeedbackLoop(emergencyId: string) {
  const feedbackMessages = [
    'Good compressions - keep going',
    'Maintain depth and rate',
    'You\'re doing great - don\'t stop',
    'Continue compressions until help arrives',
    'Excellent technique - maintain rhythm',
  ];

  let messageIndex = 0;
  let beatCount = 0;

  // Send metronome beats every 600ms (100 BPM)
  const metronomeInterval = setInterval(async () => {
    beatCount++;

    // Every 30 compressions (~18 seconds), send feedback
    if (beatCount % 30 === 0) {
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'cpr',
        event_type: 'cpr_feedback',
        payload: {
          message: feedbackMessages[messageIndex % feedbackMessages.length],
          compressions_completed: beatCount,
        },
      });

      messageIndex++;
      console.log(`[CPRAgent] Feedback sent: ${beatCount} compressions`);
    }

    // Stop after 5 minutes (500 compressions)
    if (beatCount >= 500) {
      clearInterval(metronomeInterval);

      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'cpr',
        event_type: 'complete',
        payload: {
          total_compressions: beatCount,
          duration_seconds: Math.round((beatCount * 0.6)),
        },
      });

      console.log('[CPRAgent] CPR guidance complete');
    }
  }, 600); // 600ms = 100 BPM
}
