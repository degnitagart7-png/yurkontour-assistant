/** @type {import('tailwindcss').Config} */
export default {
  content: ["./sidepanel/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      colors: {
        risk: {
          low: "#22c55e",
          medium: "#f59e0b",
          high: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
