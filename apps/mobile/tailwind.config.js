const { hairlineWidth } = require('nativewind/theme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Class-based dark mode. The app applies the `dark` class from the
  // MMKV-backed theme store so the persisted scheme is correct on first paint
  // (see app/providers/ThemeProvider.tsx).
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        // Outfit is registered under these exact names by shared/lib/fonts.ts.
        sans: ['Outfit'],
        medium: ['Outfit-Medium'],
        semibold: ['Outfit-SemiBold'],
        bold: ['Outfit-Bold'],
      },
      colors: {
        // Raw `var(--x)` (rgba values) instead of the shadcn `hsl(var(--x))`
        // convention, so the palette stays the product palette. See global.css.
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Product vocabulary.
        surface: {
          DEFAULT: 'var(--surface)',
          foreground: 'var(--surface-foreground)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          foreground: 'var(--ink-foreground)',
        },
        // shadcn / react-native-reusables aliases (same rgba values).
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        chart: {
          1: 'var(--chart-1)',
          2: 'var(--chart-2)',
          3: 'var(--chart-3)',
          4: 'var(--chart-4)',
          5: 'var(--chart-5)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderWidth: {
        hairline: hairlineWidth(),
      },
    },
    future: {
      hoverOnlyWhenSupported: true,
    },
    plugins: [require('tailwindcss-animate')],
  },
}
