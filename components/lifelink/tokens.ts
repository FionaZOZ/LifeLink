// LifeLink design tokens — match screens-v2.jsx exactly
export const X = {
  BG: '#FAFAF7',
  PAPER: '#fff',
  INK: '#0E0F12',
  INK2: '#5A5E66',
  INK3: '#9095A0',
  LINE: '#E5E4DE',
  LINE2: '#EFEDE6',
  RED: '#E11D2E',
  RED_DEEP: '#A50F1E',
  RED_BG: '#FBE9EC',
  GREEN: '#1F8A4D',
  GREEN_BG: '#E8F5EC',
  AMBER: '#E8852C',
  AMBER_BG: '#FDF1E0',
  BLUE: '#2C66E8',
  BLUE_BG: '#E6EEFD',
  DARK: '#0B1018',
} as const;

// Font stacks: Latin chars resolve through the first family (Space Grotesk /
// Inter / JetBrains Mono); CJK chars fall through to Noto Sans SC (loaded via
// Google Fonts in globals.css), then to system Chinese fonts (PingFang SC on
// Apple, Microsoft YaHei on Windows, Hiragino Sans GB on older macOS).
export const FONT = {
  display: '"Space Grotesk", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", -apple-system, system-ui, sans-serif',
  mono:    '"JetBrains Mono", "PingFang SC", "Microsoft YaHei", ui-monospace, monospace',
  body:    'Inter, "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", -apple-system, "SF Pro Text", system-ui, sans-serif',
} as const;
