import 'dotenv/config';
import { supabaseServer } from '../lib/supabase/server';

const UCI_CENTER = { lat: 33.6405, lon: -117.8443 };
const RADIUS_KM = 2;

// Generate random point within radius
function randomPoint(center: typeof UCI_CENTER, radiusKm: number) {
  const radiusInDegrees = radiusKm / 111.32; // rough conversion
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  return {
    lat: center.lat + y,
    lon: center.lon + x,
  };
}

// Generate mock volunteer names
function generateVolunteerName(index: number): string {
  const firstNames = [
    'Alex', 'Sam', 'Jordan', 'Casey', 'Morgan', 'Taylor', 'Jamie', 'Avery',
    'Riley', 'Quinn', 'Skylar', 'Dakota', 'Reese', 'Charlie', 'Peyton',
    'Drew', 'Blake', 'Hayden', 'Cameron', 'Sage'
  ];
  const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
    'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
    'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
  ];
  return `${firstNames[index % firstNames.length]} ${lastNames[Math.floor(index / firstNames.length) % lastNames.length]}`;
}

async function seedVolunteers() {
  console.log('🚑 Seeding volunteers...');

  const volunteers = Array.from({ length: 20 }, (_, i) => {
    const point = randomPoint(UCI_CENTER, RADIUS_KM);
    return {
      name: generateVolunteerName(i),
      lat: point.lat,
      lon: point.lon,
      status: 'idle' as const,
      cpr_certified: Math.random() > 0.2, // 80% certified
      phone: `+1${Math.floor(Math.random() * 9000000000 + 1000000000)}`,
    };
  });

  const { data, error } = await supabaseServer
    .from('volunteers')
    .insert(volunteers)
    .select();

  if (error) {
    console.error('❌ Error seeding volunteers:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} volunteers`);
}

async function seedAEDs() {
  console.log('⚡ Fetching AED locations from Overpass API...');

  const query = `[out:json];node["emergency"="defibrillator"](around:5000,${UCI_CENTER.lat},${UCI_CENTER.lon});out;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      console.log('⚠️  No AEDs found via Overpass API, creating mock AEDs...');
      return seedMockAEDs();
    }

    const aeds = data.elements.slice(0, 50).map((element: any) => ({
      lat: element.lat,
      lon: element.lon,
      address: element.tags?.['addr:full'] || element.tags?.['addr:street'] || null,
      location_name: element.tags?.name || element.tags?.operator || 'Unknown Location',
      available: true,
      hours: element.tags?.opening_hours || '24/7',
    }));

    const { data: inserted, error } = await supabaseServer
      .from('aeds')
      .insert(aeds)
      .select();

    if (error) {
      console.error('❌ Error seeding AEDs:', error);
      throw error;
    }

    console.log(`✅ Created ${inserted.length} AEDs from real data`);
  } catch (error) {
    console.error('❌ Error fetching from Overpass API:', error);
    console.log('⚠️  Falling back to mock AEDs...');
    return seedMockAEDs();
  }
}

async function seedMockAEDs() {
  console.log('🏥 Creating mock AEDs...');

  const mockLocations = [
    'UCI Student Center', 'Anteater Recreation Center', 'UCI Medical Center',
    'Aldrich Park', 'Langson Library', 'Engineering Gateway', 'Social Science Plaza',
    'Bren Events Center', 'Campus Village', 'Mesa Court'
  ];

  const aeds = mockLocations.map((name, i) => {
    const point = randomPoint(UCI_CENTER, 1.5);
    return {
      lat: point.lat,
      lon: point.lon,
      address: null,
      location_name: name,
      available: true,
      hours: i % 3 === 0 ? '6am-10pm' : '24/7',
    };
  });

  const { data, error } = await supabaseServer
    .from('aeds')
    .insert(aeds)
    .select();

  if (error) {
    console.error('❌ Error seeding mock AEDs:', error);
    throw error;
  }

  console.log(`✅ Created ${data.length} mock AEDs`);
}

async function main() {
  console.log('🌱 Starting seed process...\n');

  try {
    await seedVolunteers();
    await seedAEDs();
    console.log('\n🎉 Seed completed successfully!');
  } catch (error) {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  }
}

main();
