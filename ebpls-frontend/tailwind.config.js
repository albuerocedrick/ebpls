/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Enforcing the 60-30-10 Rule from frontend-developer.md
        surface: "hsl(var(--color-surface))",
        "surface-tint": "hsl(var(--color-surface-tint))",
        accent: "hsl(var(--color-accent))",
        border: "hsl(var(--color-border))",
      },
      boxShadow: {
        // Subtle Shadows Policy
        sm: "var(--shadow-base)",
        md: "var(--shadow-hover)",
      },
      borderRadius: {
        // Radius Nesting Rule
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      }
    },
  },
  plugins: [],
}
