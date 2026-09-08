import { radius } from "../radius";
import { spacing } from "../spacing";

export const smartTrainingTokens = {
  spacing,
  radius,
  typography: {
    caption: 12,
    footnote: 13,
    body: 16,
    heading: 18,
    title: 24,
    display: 32,
  },
  touchTarget: {
    standard: 44,
    accessible: 48,
  },
  content: {
    mobileMaxWidth: 760,
    readableTextMaxWidth: 680,
  },
} as const;