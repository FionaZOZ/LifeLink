import { supabaseServer } from '../supabase/server';
import { calculateDistance, calculateETA, moveTowards } from '../utils/distance';
import type { Volunteer } from '../supabase/types';

interface VolunteerWithDistance extends Volunteer {
  distance: number;
  eta: number;
}

export async function runResponderAgent(emergencyId: string) {
  try {
    console.log(`[ResponderAgent] Starting for emergency ${emergencyId}`);

    // 1. Get emergency location
    const { data: emergency, error: emergencyError } = await supabaseServer
      .from('emergencies')
      .select('patient_lat, patient_lon')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      console.error('[ResponderAgent] Failed to get emergency:', emergencyError);
      return;
    }

    const { patient_lat, patient_lon } = emergency;

    // 2. Find all idle volunteers
    const { data: volunteers, error: volunteersError } = await supabaseServer
      .from('volunteers')
      .select('*')
      .eq('status', 'idle');

    if (volunteersError) {
      console.error('[ResponderAgent] Failed to get volunteers:', volunteersError);
      return;
    }

    if (!volunteers || volunteers.length === 0) {
      console.log('[ResponderAgent] No volunteers available');
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'responder',
        event_type: 'no_volunteers',
        payload: { message: 'No volunteers available in the area' },
      });
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'responder',
        event_type: 'complete',
        payload: {},
      });
      return;
    }

    // 3. Calculate distances and filter within 500m
    const volunteersWithDistance: VolunteerWithDistance[] = volunteers
      .map((v) => {
        const distance = calculateDistance(v.lat, v.lon, patient_lat, patient_lon);
        return {
          ...v,
          distance,
          eta: calculateETA(distance),
        };
      })
      .filter((v) => v.distance <= 500)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    if (volunteersWithDistance.length === 0) {
      console.log('[ResponderAgent] No volunteers within 500m');
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'responder',
        event_type: 'no_volunteers',
        payload: { message: 'No volunteers within 500m of emergency' },
      });
      await supabaseServer.from('agent_events').insert({
        emergency_id: emergencyId,
        agent_name: 'responder',
        event_type: 'complete',
        payload: {},
      });
      return;
    }

    // 4. Update volunteers to 'responding'
    const volunteerIds = volunteersWithDistance.map((v) => v.id);
    await supabaseServer
      .from('volunteers')
      .update({ status: 'responding' })
      .in('id', volunteerIds);

    // 5. Log volunteers dispatched
    await supabaseServer.from('agent_events').insert({
      emergency_id: emergencyId,
      agent_name: 'responder',
      event_type: 'volunteers_dispatched',
      payload: {
        count: volunteersWithDistance.length,
        volunteers: volunteersWithDistance.map((v) => ({
          id: v.id,
          name: v.name,
          distance: Math.round(v.distance),
          eta: v.eta,
        })),
      },
    });

    console.log(
      `[ResponderAgent] Dispatched ${volunteersWithDistance.length} volunteers`
    );

    // 6. Start movement simulation (async - fire and forget)
    simulateVolunteerMovement(
      emergencyId,
      volunteersWithDistance,
      patient_lat,
      patient_lon
    );
  } catch (error) {
    console.error('[ResponderAgent] Error:', error);
  }
}

async function simulateVolunteerMovement(
  emergencyId: string,
  volunteers: VolunteerWithDistance[],
  targetLat: number,
  targetLon: number
) {
  const interval = 2000; // 2 seconds
  const movePercent = 0.1; // Move 10% closer each step

  // Store initial positions
  const volunteerPositions = new Map(
    volunteers.map((v) => [v.id, { lat: v.lat, lon: v.lon }])
  );

  const arrivedVolunteers = new Set<string>();

  const intervalId = setInterval(async () => {
    try {
      for (const volunteer of volunteers) {
        if (arrivedVolunteers.has(volunteer.id)) continue;

        const currentPos = volunteerPositions.get(volunteer.id)!;
        const distance = calculateDistance(
          currentPos.lat,
          currentPos.lon,
          targetLat,
          targetLon
        );

        // Check if arrived (within 20m)
        if (distance < 20) {
          arrivedVolunteers.add(volunteer.id);

          // Update volunteer status to 'arrived'
          await supabaseServer
            .from('volunteers')
            .update({ status: 'arrived', lat: targetLat, lon: targetLon })
            .eq('id', volunteer.id);

          // Log arrival
          await supabaseServer.from('agent_events').insert({
            emergency_id: emergencyId,
            agent_name: 'responder',
            event_type: 'volunteer_arrived',
            payload: {
              volunteer_id: volunteer.id,
              volunteer_name: volunteer.name,
            },
          });

          console.log(`[ResponderAgent] ${volunteer.name} arrived`);
        } else {
          // Move towards target
          const newPos = moveTowards(
            currentPos.lat,
            currentPos.lon,
            targetLat,
            targetLon,
            movePercent
          );

          volunteerPositions.set(volunteer.id, newPos);

          // Update position in database
          await supabaseServer
            .from('volunteers')
            .update({ lat: newPos.lat, lon: newPos.lon })
            .eq('id', volunteer.id);
        }
      }

      // Check if all arrived
      if (arrivedVolunteers.size === volunteers.length) {
        clearInterval(intervalId);

        // Log completion
        await supabaseServer.from('agent_events').insert({
          emergency_id: emergencyId,
          agent_name: 'responder',
          event_type: 'complete',
          payload: {
            total_volunteers: volunteers.length,
          },
        });

        console.log('[ResponderAgent] All volunteers arrived - Complete');
      }
    } catch (error) {
      console.error('[ResponderAgent] Movement simulation error:', error);
      clearInterval(intervalId);
    }
  }, interval);
}
