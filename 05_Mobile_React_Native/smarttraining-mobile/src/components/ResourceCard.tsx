import { useSmartTrainingTheme } from "../theme/provider/SmartTrainingThemeProvider";
import { Linking, StyleSheet, Text, View } from "react-native";



import { Resource } from "../types/training";
import AppButton from "./AppButton";
import StatusBadge from "./StatusBadge";

type ResourceCardProps = {
  resource: Resource;
};

function getResourceLabel(type: string): string {
  if (type === "VIDEO_URL") {
    return "Vidéo";
  }

  if (type === "PDF_URL") {
    return "PDF";
  }

  if (type === "EXTERNAL_LINK") {
    return "Lien";
  }

  return "Texte";
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  async function handleOpenResource() {
    if (!resource.url) {
      return;
    }

    const canOpen = await Linking.canOpenURL(resource.url);

    if (canOpen) {
      await Linking.openURL(resource.url);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <StatusBadge label={getResourceLabel(resource.type)} variant="info" />
      </View>

      <Text style={styles.title}>{resource.title}</Text>

      {resource.textContent && (
        <Text style={styles.textContent}>{resource.textContent}</Text>
      )}

      {resource.url && (
        <AppButton
          title="Ouvrir la ressource"
          onPress={handleOpenResource}
          variant="secondary"
        />
      )}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    marginBottom: 8,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },
  textContent: {
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
    marginBottom: 14,
  },
});
}
