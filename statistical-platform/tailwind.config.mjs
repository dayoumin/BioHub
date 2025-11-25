/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-in-from-bottom": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out",
        "slide-in": "slide-in-from-bottom 0.5s ease-out"
      },
      colors: {
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
          bg: 'var(--success-bg)',
          border: 'var(--success-border)',
          muted: 'var(--success-muted)',
        },
        error: {
          DEFAULT: 'var(--error)',
          foreground: 'var(--error-foreground)',
          bg: 'var(--error-bg)',
          border: 'var(--error-border)',
          muted: 'var(--error-muted)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
          bg: 'var(--warning-bg)',
          border: 'var(--warning-border)',
          muted: 'var(--warning-muted)',
        },
      highlight: {
          DEFAULT: 'var(--highlight)',
          foreground: 'var(--highlight-foreground)',
          bg: 'var(--highlight-bg)',
          border: 'var(--highlight-border)',
        },
        correlation: {
          'strong-pos': 'var(--correlation-strong-pos)',
          'medium-pos': 'var(--correlation-medium-pos)',
          'weak': 'var(--correlation-weak)',
          'medium-neg': 'var(--correlation-medium-neg)',
          'strong-neg': 'var(--correlation-strong-neg)',
        },
        info: {
          DEFAULT: 'var(--info)',
          foreground: 'var(--info-foreground)',
          bg: 'var(--info-bg)',
          border: 'var(--info-border)',
          muted: 'var(--info-muted)',
        },
      },
    },
  },
  safelist: [
    // highlight colors
    "bg-highlight-bg",
    "border-highlight-border",
    "text-highlight",
    // correlation colors
    "bg-correlation-strong-pos",
    "bg-correlation-medium-pos",
    "bg-correlation-weak",
    "bg-correlation-medium-neg",
    "bg-correlation-strong-neg",
    // info colors
    "bg-info-bg",
    "border-info-border",
    "text-info",
    "text-info-muted",
    // text-*-600
    "text-blue-600",
    "text-green-600",
    "text-purple-600",
    "text-orange-600",
    "text-pink-600",
    "text-indigo-600",
    "text-teal-600",
    "text-red-600",
    // dark:text-*-400
    "dark:text-blue-400",
    "dark:text-green-400",
    "dark:text-purple-400",
    "dark:text-orange-400",
    "dark:text-pink-400",
    "dark:text-indigo-400",
    "dark:text-teal-400",
    "dark:text-red-400",
    // bg-*-50
    "bg-blue-50",
    "bg-green-50",
    "bg-purple-50",
    "bg-orange-50",
    "bg-pink-50",
    "bg-indigo-50",
    "bg-teal-50",
    "bg-red-50",
    // dark:bg-*-950/30
    "dark:bg-blue-950/30",
    "dark:bg-green-950/30",
    "dark:bg-purple-950/30",
    "dark:bg-orange-950/30",
    "dark:bg-pink-950/30",
    "dark:bg-indigo-950/30",
    "dark:bg-teal-950/30",
    "dark:bg-red-950/30",
  ],
}


