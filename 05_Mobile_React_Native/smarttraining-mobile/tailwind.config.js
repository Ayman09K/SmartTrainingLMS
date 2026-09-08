const { platformSelect } = require("nativewind/theme");

/** @type {import("tailwindcss").Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: withOpacity("background"),
        surface: withOpacity("surface"),
        "surface-soft": withOpacity("surface-soft"),
        "surface-elevated": withOpacity("surface-elevated"),
        foreground: withOpacity("foreground"),
        secondary: {
          foreground: withOpacity("secondary-foreground"),
        },
        muted: {
          foreground: withOpacity("muted-foreground"),
        },
        border: withOpacity("border"),
        primary: {
          DEFAULT: withOpacity("accent"),
          foreground: withOpacity("accent-foreground"),
        },
        accent: {
          DEFAULT: withOpacity("accent"),
          foreground: withOpacity("accent-foreground"),
        },
        success: withOpacity("success"),
        warning: withOpacity("warning"),
        danger: withOpacity("danger"),
        info: withOpacity("info"),
        "focus-ring": withOpacity("focus-ring"),
      },
    },
  },
  plugins: [],
};

function withOpacity(variableName) {
  return ({ opacityValue }) => {
    if (opacityValue !== undefined) {
      return platformSelect({
        ios: `rgb(var(--${variableName}) / ${opacityValue})`,
        android: `rgb(var(--${variableName}) / ${opacityValue})`,
        web: `rgb(var(--${variableName}) / ${opacityValue})`,
      });
    }

    return platformSelect({
      ios: `rgb(var(--${variableName}))`,
      android: `rgb(var(--${variableName}))`,
      web: `rgb(var(--${variableName}))`,
    });
  };
}