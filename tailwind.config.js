export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Admin Panel Original Brand Palette (Preserved - Do Not Change Admin) ──
        brand: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#38a9f8',
          500: '#3978F6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#101A2B',
          950: '#080D18',
        },

        // ── Website Design Theme (Cetacean Blue + Lavender + Ghost White) ────────
        cetacean: {
          DEFAULT: '#150A35',
          deep:    '#0D0620',
          mid:     '#1E1050',
          surface: '#271466',
          950:     '#0D0620',
          900:     '#150A35',
          800:     '#1E1050',
          700:     '#271466',
        },
        lavender: {
          DEFAULT: '#A577FF',
          hover:   '#8A5EFF',
          light:   '#C4A3FF',
          soft:    '#E8DEFF',
          subtle:  '#F5F0FF',
          glow:    '#BF9FFF',
          deep:    '#7040F0',
        },
        ghost: {
          DEFAULT: '#F5F7FC',
          white:   '#F5F7FC',
          50:      '#FAFBFD',
          100:     '#EEF1F8',
          200:     '#DDE3F0',
        },

        // ── Website Semantic Tokens (Mapped to Purple/Lavender Theme) ────────────
        electric: {
          DEFAULT: '#A577FF',
          hover:   '#8A5EFF',
          blue:    '#A577FF',
          cyan:    '#C4A3FF',
          deep:    '#7040F0',
        },
        'cyan-glow': {
          DEFAULT: '#C4A3FF',
        },
        surface: {
          DEFAULT:   '#FFFFFF',
          white:     '#FFFFFF',
          editorial: '#F5F7FC',
          soft:      '#F5F7FC',
          neutral:   '#EEF1F8',
          subtle:    '#EEF1F8',
          border:    '#E2E6F0',
        },
        ink: {
          DEFAULT:   '#150A35',
          primary:   '#150A35',
          secondary: '#4E4668',
          muted:     '#6B6480',
          light:     '#F5F7FC',
          mutedDark: '#A577FF99',
        },
        midnight: {
          DEFAULT: '#150A35',
          surface: '#1E1050',
          card:    '#271466',
          950:     '#0D0620',
          900:     '#150A35',
          800:     '#1E1050',
          700:     '#271466',
        },
      },
      fontFamily: {
        sans:  ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'Cambria', 'serif'],
        mono:  ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-lavender': '0 0 60px -15px rgba(165, 119, 255, 0.45)',
        'glow-blue':     '0 0 60px -15px rgba(165, 119, 255, 0.45)',
        'glow-deep':     '0 0 70px -15px rgba(21,  10,  53,  0.5)',
        'editorial':     '0 1px 3px rgba(21, 10, 53, 0.04), 0 6px 24px -4px rgba(21, 10, 53, 0.06)',
        'card-dark':     '0 12px 36px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(165, 119, 255, 0.12)',
        'card-glow':     '0 0 0 1px rgba(165, 119, 255, 0.25), 0 8px 32px -8px rgba(165, 119, 255, 0.3)',
      },
    },
  },
  plugins: [],
}
