/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  safelist: [
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


