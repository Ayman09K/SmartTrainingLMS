import { cva, type VariantProps } from "class-variance-authority";
import { cssInterop } from "nativewind";
import * as React from "react";
import { UITextView } from "react-native-uitextview";
import { cn } from "@/lib/cn";
import { useSmartTrainingTheme } from "@/theme/provider/SmartTrainingThemeProvider";

cssInterop(UITextView, { className: "style" });

const textVariants = cva("", {
  variants: {
    variant: { largeTitle: "text-4xl font-bold", title1: "text-2xl font-semibold", title2: "text-[22px] leading-7 font-semibold", title3: "text-xl font-semibold", heading: "text-[17px] leading-6 font-semibold", body: "text-[17px] leading-6", callout: "text-base", subhead: "text-[15px] leading-6", footnote: "text-[13px] leading-5", caption1: "text-xs", caption2: "text-[11px] leading-4" },
    color: { primary: "", secondary: "", tertiary: "", quaternary: "", accentForeground: "", statusForeground: "" },
  },
  defaultVariants: { variant: "body", color: "primary" },
});

type TextProps = React.ComponentProps<typeof UITextView> & VariantProps<typeof textVariants>;
const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({ className, variant, color, style, ...props }: TextProps) {
  const inheritedClassName = React.useContext(TextClassContext);
  const { theme } = useSmartTrainingTheme();
  const resolvedColor = color === "secondary" ? theme.colors.foregroundMuted : color === "tertiary" || color === "quaternary" ? theme.colors.foregroundSubtle : color === "accentForeground" ? theme.colors.accentForeground : color === "statusForeground" ? theme.colors.statusForeground : theme.colors.foreground;
  return <UITextView className={cn(textVariants({ variant, color }), inheritedClassName, className)} style={[{ color: resolvedColor }, style]} {...props} />;
}

export { Text, TextClassContext, textVariants };