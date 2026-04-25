// pressure_sensor_rps40st.ino
// RP-S40-ST + Arduino Nano Every
// Wiring:
// 5V ---- sensor ---- A0 ---- 10kΩ ---- GND
//
// Meaning:
// 1. One sensor leg -> 5V
// 2. Other sensor leg -> A0
// 3. From A0, add a 10kΩ resistor to GND
//
// CPR success rule:
// - Count exactly one successful compression when voltage rises to >= 4.0V
// - Do not count again until the sensor is released below RELEASE_VOLTAGE
//
// Serial output:
// - One JSON line per loop so a JavaScript frontend can read it over Web Serial.
// - Example:
//   {"raw":827,"voltage":4.013,"pressed":true,"success":true,"count":12}

const int SENSOR_PIN = A0;
const int LED_PIN = LED_BUILTIN;

// Do NOT name this VREF.
// On Arduino Nano Every / megaAVR, VREF conflicts with an internal register/type.
const float ADC_REFERENCE_VOLTAGE = 5.0;
const float ADC_MAX_READING = 1023.0;

const float PEAK_VOLTAGE = 4.0;
const float RELEASE_VOLTAGE = 3.7;
const unsigned long LOOP_DELAY_MS = 20;  // 50 Hz updates

bool pressLatched = false;
unsigned long successCount = 0;

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);

  // On boards with native USB, this helps serial attach during debugging.
  unsigned long start = millis();
  while (!Serial && (millis() - start) < 2000) {
    ;
  }

  Serial.println("{\"status\":\"ready\",\"sensor\":\"RP-S40-ST\",\"thresholdVoltage\":4.0,\"releaseVoltage\":3.7}");
}

void loop() {
  const int rawValue = analogRead(SENSOR_PIN);
  const float voltage = rawValue * (ADC_REFERENCE_VOLTAGE / ADC_MAX_READING);

  bool success = false;

  if (!pressLatched && voltage >= PEAK_VOLTAGE) {
    successCount++;
    pressLatched = true;
    success = true;
  }

  if (pressLatched && voltage < RELEASE_VOLTAGE) {
    pressLatched = false;
  }

  digitalWrite(LED_PIN, pressLatched ? HIGH : LOW);

  Serial.print("{\"raw\":");
  Serial.print(rawValue);
  Serial.print(",\"voltage\":");
  Serial.print(voltage, 3);
  Serial.print(",\"pressed\":");
  Serial.print(pressLatched ? "true" : "false");
  Serial.print(",\"success\":");
  Serial.print(success ? "true" : "false");
  Serial.print(",\"count\":");
  Serial.print(successCount);
  Serial.println("}");

  delay(LOOP_DELAY_MS);
}