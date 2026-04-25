// pressure_sensor_rps40st.ino
// RP-S40-ST + Arduino Nano Every
// 接线方式：
// 5V ---- 传感器 ---- A0 ---- 10kΩ ---- GND
//
// 更准确地说：
// 1. 传感器一个脚接 5V
// 2. 传感器另一个脚接 A0
// 3. 同时从 A0 接一个 10kΩ 电阻到 GND

const int SENSOR_PIN = A0;

// 你可以根据实际情况自己调整这个阈值
const int PRESS_THRESHOLD = 100;

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    ; // 等待串口初始化（Nano Every 可保留）
  }

  Serial.println("RP-S40-ST pressure sensor test");
  Serial.println("Start reading...");
}

void loop() {
  int rawValue = analogRead(SENSOR_PIN);          // 0 ~ 1023
  float voltage = rawValue * (5.0 / 1023.0);      // 转成电压值

  Serial.print("Raw: ");
  Serial.print(rawValue);
  Serial.print("    Voltage: ");
  Serial.print(voltage, 3);
  Serial.print(" V");

  if (rawValue > PRESS_THRESHOLD) {
    Serial.print("    Status: PRESSED");
  } else {
    Serial.print("    Status: NOT PRESSED");
  }

  Serial.println();

  delay(100);
}