/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Mobile-first responsive breakpoints
    screens: {
      xs: '320px',  // iPhone SE baseline
      sm: '640px',  // Tablet small
      md: '768px',  // Tablet
      lg: '1024px', // Desktop
      xl: '1280px', // Large desktop
      '2xl': '1536px', // Ultra-wide
    },
    extend: {
      colors: {
        // Royal Equips quantum color system
        'quantum': {
          primary: '#05f4ff',    // Cyan
          secondary: '#ff1fbf',  // Magenta
          accent: '#21ff7a',     // Green
          warning: '#ffd700',    // Gold
          danger: '#ff4444',     // Red
        },
        // Existing Royal Equips colors
        'royal-blue': '#0052CC',
        'royal-gold': '#FFD700',
        'hologram': '#00FFFF',
        
        // Dark theme base colors
        'bg': {
          DEFAULT: '#020409',
          alt: '#070c14',
          surface: '#0e1824',
        },
        'text': {
          primary: '#d6ecff',
          secondary: '#7ba0b8',
          dim: '#4a5568',
        },
        
        // v0.dev theme colors (preserved for compatibility)
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        }
      },
      
      // Fluid typography using clamp() for responsive scaling
      fontSize: {
        'xs': 'clamp(0.75rem, 2vw, 0.875rem)',
        'sm': 'clamp(0.875rem, 2.5vw, 1rem)',
        'base': 'clamp(1rem, 3vw, 1.125rem)',
        'lg': 'clamp(1.125rem, 3.5vw, 1.25rem)',
        'xl': 'clamp(1.25rem, 4vw, 1.5rem)',
        '2xl': 'clamp(1.5rem, 5vw, 2rem)',
        '3xl': 'clamp(1.875rem, 6vw, 2.25rem)',
        '4xl': 'clamp(2.25rem, 7vw, 3rem)',
        '5xl': 'clamp(3rem, 8vw, 4rem)',
        'display': 'clamp(1.75rem, 6vw, 3.25rem)',
      },
      
      // Fluid spacing system
      spacing: {
        'xs': 'clamp(0.25rem, 1vw, 0.5rem)',
        'sm': 'clamp(0.5rem, 2vw, 0.75rem)',
        'md': 'clamp(0.75rem, 3vw, 1rem)',
        'lg': 'clamp(1rem, 4vw, 1.5rem)',
        'xl': 'clamp(1.5rem, 5vw, 2rem)',
        '2xl': 'clamp(2rem, 6vw, 3rem)',
      },
      
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      
      animation: {
        'pulse-hologram': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'quantum-glow': 'quantum-glow 2s ease-in-out infinite alternate',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
      },
      
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'quantum-glow': {
          '0%': { boxShadow: '0 0 20px rgba(5, 244, 255, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(5, 244, 255, 0.6), 0 0 60px rgba(255, 31, 191, 0.4)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      },
      
      // Enhanced transitions for mobile performance
      transitionTimingFunction: {
        'quantum': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      // Safe area utilities for mobile devices
      padding: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/scrollbar-hide'),
    // Custom utilities for scroll-snap and touch optimization
    function({ addUtilities }) {
      addUtilities({
        '.scroll-snap-x': {
          'scroll-snap-type': 'x mandatory',
        },
        '.scroll-snap-center': {
          'scroll-snap-align': 'center',
        },
        '.touch-pan-x': {
          'touch-action': 'pan-x',
        },
        '.will-change-transform': {
          'will-change': 'transform',
        },
      })
    }
  ],
}