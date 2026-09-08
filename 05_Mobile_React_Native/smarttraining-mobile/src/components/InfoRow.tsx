import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

type InfoRowProps = {
  label: string;
  value: string;
};

export default function InfoRow({
  label,
  value,
}: InfoRowProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginBottom: Math.max(
            8,
            Math.floor(theme.shape.sectionGap / 2),
          ),
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          {
            color: theme.colors.foregroundMuted,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.value,
          {
            color: theme.colors.foreground,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    fontWeight: "700",
  },
});