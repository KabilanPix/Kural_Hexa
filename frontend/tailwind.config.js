/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0F172A',
          800: '#1E293B',
          700: '#1E3A5F', // Primary deep blue
          600: '#2A4D7A',
          500: '#3B82F6',
        },
        priority: {
          low: '#3B82F6',       // Blue
          medium: '#F5A623',    // Amber
          high: '#E5484D',      // Red
          critical: '#DC2626',  // Deep Red Pulse
          resolved: '#2ECC71',  // Green
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(59, 130, 246, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.9)' },
        }
      }
    },
  },
  plugins: [],
}
