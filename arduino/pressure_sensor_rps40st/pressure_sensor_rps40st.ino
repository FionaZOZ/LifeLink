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
// - Pressure example:
//   {"type":"pressure","raw":827,"voltage":4.013,"pressed":true,"success":true,"count":12}
// - Profile example, sent when JS sends PROFILE\n over Serial:
//   {"type":"profile","name":"John Doe",...}
//
// Supported serial commands from JavaScript:
// - PROFILE      -> print hardcoded patient profile as JSON
// - GET_PROFILE  -> same as PROFILE
// - RESET        -> reset CPR success count

const int SENSOR_PIN = A0;
const int LED_PIN = LED_BUILTIN;

// Do NOT name this VREF.
// On Arduino Nano Every / megaAVR, VREF conflicts with an internal register/type.
const float ADC_REFERENCE_VOLTAGE = 5.0;
const float ADC_MAX_READING = 1023.0;

const float PEAK_VOLTAGE = 4.0;
const float RELEASE_VOLTAGE = 3.7;
const unsigned long LOOP_DELAY_MS = 20;  // 50 Hz updates

// ===== Hardcoded emergency patient profile =====
// Keep this short and medically useful. The frontend can render this JSON into a card/modal.
const char PATIENT_NAME[] = "John Doe";
const char PATIENT_DOB[] = "1999-01-01";
const char PATIENT_BLOOD_TYPE[] = "O+";
const char PATIENT_PHONE[] = "123-456-7890";
const char PATIENT_ADDRESS[] = "123 Example St, Irvine, CA";
const char PATIENT_ALLERGIES[] = "Penicillin";
const char PATIENT_CONDITIONS[] = "Diabetes";
const char PATIENT_MEDICATIONS[] = "Insulin";
const char EMERGENCY_CONTACT_NAME[] = "Jane Doe";
const char EMERGENCY_CONTACT_RELATION[] = "Mother";
const char EMERGENCY_CONTACT_PHONE[] = "123-555-7890";
const char PHYSICIAN_NAME[] = "Dr. Smith";
const char PHYSICIAN_PHONE[] = "123-555-1111";
const char MEDICAL_NOTES[] = "CPR responder: check allergies and current medication first.";

bool pressLatched = false;
unsigned long successCount = 0;
String serialCommand = "";

void sendReadyStatus() {
  Serial.print(F("{\"type\":\"status\",\"status\":\"ready\",\"sensor\":\"RP-S40-ST\",\"thresholdVoltage\":"));
  Serial.print(PEAK_VOLTAGE, 2);
  Serial.print(F(",\"releaseVoltage\":"));
  Serial.print(RELEASE_VOLTAGE, 2);
  Serial.println(F(",\"profileCommand\":\"PROFILE\"}"));
}

void sendPatientProfile() {
  Serial.print(F("{\"type\":\"profile\""));
  Serial.print(F(",\"name\":\""));
  Serial.print(PATIENT_NAME);
  Serial.print(F("\",\"dob\":\""));
  Serial.print(PATIENT_DOB);
  Serial.print(F("\",\"bloodType\":\""));
  Serial.print(PATIENT_BLOOD_TYPE);
  Serial.print(F("\",\"phone\":\""));
  Serial.print(PATIENT_PHONE);
  Serial.print(F("\",\"address\":\""));
  Serial.print(PATIENT_ADDRESS);
  Serial.print(F("\",\"allergies\":\""));
  Serial.print(PATIENT_ALLERGIES);
  Serial.print(F("\",\"conditions\":\""));
  Serial.print(PATIENT_CONDITIONS);
  Serial.print(F("\",\"medications\":\""));
  Serial.print(PATIENT_MEDICATIONS);
  Serial.print(F("\",\"emergencyContact\":{\"name\":\""));
  Serial.print(EMERGENCY_CONTACT_NAME);
  Serial.print(F("\",\"relation\":\""));
  Serial.print(EMERGENCY_CONTACT_RELATION);
  Serial.print(F("\",\"phone\":\""));
  Serial.print(EMERGENCY_CONTACT_PHONE);
  Serial.print(F("\"}"));
  Serial.print(F(",\"physician\":{\"name\":\""));
  Serial.print(PHYSICIAN_NAME);
  Serial.print(F("\",\"phone\":\""));
  Serial.print(PHYSICIAN_PHONE);
  Serial.print(F("\"}"));
  Serial.print(F(",\"notes\":\""));
  Serial.print(MEDICAL_NOTES);
  Serial.println(F("\"}"));
}

void sendResetStatus() {
  Serial.println(F("{\"type\":\"status\",\"status\":\"reset\",\"count\":0}"));
}

void handleSerialCommands() {
  while (Serial.available() > 0) {
    char c = Serial.read();

    if (c == '\n' || c == '\r') {
      serialCommand.trim();
      serialCommand.toUpperCase();

      if (serialCommand == "PROFILE" || serialCommand == "GET_PROFILE") {
        sendPatientProfile();
      } else if (serialCommand == "RESET") {
        successCount = 0;
        pressLatched = false;
        digitalWrite(LED_PIN, LOW);
        sendResetStatus();
      } else if (serialCommand.length() > 0) {
        Serial.print(F("{\"type\":\"error\",\"message\":\"Unknown command: "));
        Serial.print(serialCommand);
        Serial.println(F("\"}"));
      }

      serialCommand = "";
    } else {
      serialCommand += c;

      // Prevent unbounded String growth if the frontend sends malformed input.
      if (serialCommand.length() > 40) {
        serialCommand = "";
        Serial.println(F("{\"type\":\"error\",\"message\":\"Command too long\"}"));
      }
    }
  }
}

void sendPressureData() {
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

  Serial.print(F("{\"type\":\"pressure\",\"raw\":"));
  Serial.print(rawValue);
  Serial.print(F(",\"voltage\":"));
  Serial.print(voltage, 3);
  Serial.print(F(",\"pressed\":"));
  Serial.print(pressLatched ? F("true") : F("false"));
  Serial.print(F(",\"success\":"));
  Serial.print(success ? F("true") : F("false"));
  Serial.print(F(",\"count\":"));
  Serial.print(successCount);
  Serial.println(F("}"));
}

void setup() {
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(115200);

  // On boards with native USB, this helps serial attach during debugging.
  unsigned long start = millis();
  while (!Serial && (millis() - start) < 2000) {
    ;
  }

  sendReadyStatus();
}

void loop() {
  handleSerialCommands();
  sendPressureData();
  delay(LOOP_DELAY_MS);
}
