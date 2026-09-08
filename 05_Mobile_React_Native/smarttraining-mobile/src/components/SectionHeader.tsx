import {
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../theme/provider/SmartTrainingThemeProvider";

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
};

export default function SectionHeader({
  title,
  subtitle,
}: SectionHeaderProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.container,
        {
          marginBottom: theme.shape.sectionGap,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.foreground,
            fontSize: theme.name === "ACCESSIBLE" ? 28 : 26,
          },
        ]}
      >
        {title}
      </Text>

      {subtitle ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: theme.colors.foregroundMuted,
            },
          ]}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  title: {
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
  },
});