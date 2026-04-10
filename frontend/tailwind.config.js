/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      screens: {
        xs: "400px",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.25rem" }],
        sm: ["0.9375rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
      },
      spacing: {
        "safe-t": "env(safe-area-inset-top)",
        "safe-b": "env(safe-area-inset-bottom)",
        "tab-bar": "64px",
        "top-bar": "56px",
      },
      colors: {
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        accent: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
        },
        surface: {
          0: "#ffffff",
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
        },
        dark: {
          50: "#1e1b2e",
          100: "#1a1726",
          200: "#16131f",
          300: "#110f19",
          400: "#0d0b13",
          500: "#09080e",
        },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(99, 102, 241, 0.35)",
        "glow-lg": "0 0 80px -12px rgba(99, 102, 241, 0.45)",
        "glow-accent": "0 0 40px -8px rgba(249, 115, 22, 0.25)",
        "glow-sm": "0 0 20px -4px rgba(99, 102, 241, 0.2)",
        soft: "0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px -2px rgba(0, 0, 0, 0.03)",
        card: "0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px -2px rgba(0, 0, 0, 0.04)",
        elevated: "0 8px 28px -8px rgba(0, 0, 0, 0.12)",
        floating: "0 20px 50px -12px rgba(0, 0, 0, 0.18)",
        "elevated-lg": "0 20px 60px -15px rgba(0, 0, 0, 0.15), 0 8px 24px -8px rgba(0, 0, 0, 0.06)",
        "inner-glow": "inset 0 1px 0 rgba(255, 255, 255, 0.05)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-mesh":
          "radial-gradient(at 27% 37%, #eef2ff 0px, transparent 50%), radial-gradient(at 97% 21%, #fff7ed 0px, transparent 50%), radial-gradient(at 52% 99%, #e0e7ff 0px, transparent 50%), radial-gradient(at 10% 29%, #ffedd5 0px, transparent 50%)",
        "sidebar-gradient": "linear-gradient(180deg, #1a1726 0%, #110f19 100%)",
        "nav-glow": "linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.04) 100%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "fade-up": "fadeUp 0.6s ease-out forwards",
        "slide-in": "slideIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        float: "float 6s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
        "wave-bar": "waveBar 1.2s ease-in-out infinite",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-10px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        waveBar: {
          "0%, 100%": { height: "20%" },
          "50%": { height: "100%" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
