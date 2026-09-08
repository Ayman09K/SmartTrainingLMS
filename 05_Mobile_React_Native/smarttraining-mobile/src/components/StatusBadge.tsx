import {
  StyleSheet,
  Text,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

type StatusBadgeProps = {
  label: string;
  variant?: "success" | "warning" | "info";
};

export default function StatusBadge({
  label,
  variant = "info",
}: StatusBadgeProps) {
  const { theme } = useSmartTrainingTheme();

  const statusColor =
    variant === "success"
      ? theme.colors.success
      : variant === "warning"
        ? theme.colors.warning
        : theme.colors.info;

  return (
    <Text
      style={[
        styles.badge,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: statusColor,
          borderWidth: Math.max(1, theme.shape.borderWidth),
          color: statusColor,
        },
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "800",
  },
});