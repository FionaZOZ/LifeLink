import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        emergency: '#DC2626',
        'emergency-dark': '#991B1B',
        medical: '#1A56DB',
        success: '#10B981',
      },
      animation: {
        'pulse-slow': 'pulse 2s ease-in-out infinite',
        'metronome': 'metronome 545ms ease-in-out infinite',
      },
      keyframes: {
        metronome: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
