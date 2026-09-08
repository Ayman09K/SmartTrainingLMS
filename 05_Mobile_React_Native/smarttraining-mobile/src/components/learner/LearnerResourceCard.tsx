import {
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import LearnerInlineMedia from "./LearnerInlineMedia";
import {
  normalizeLearnerResourceType,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerTrainingResource,
} from "../../types/learnerTraining";

type Props = {
  resource: LearnerTrainingResource;
  busy: boolean;
  onOpen: () => void;
  onVideoCompleted: () => void;
  videoCompleted?: boolean;
};

function resourceLabel(type?: string | null): string {
  const normalized = normalizeLearnerResourceType(type);

  if (normalized === "TEXT") return "Texte";
  if (normalized === "IMAGE") return "Image";
  if (normalized === "VIDEO") return "Vid\u00E9o";
  if (normalized === "PDF") return "PDF";
  if (normalized === "DOCUMENT") return "Document";
  if (normalized === "EXTERNAL_LINK") return "Lien externe";
  if (normalized === "SCORM") return "Module SCORM";

  return "Ressource";
}

function durationLabel(seconds?: number | null): string {
  if (!seconds || seconds <= 0) {
    return "";
  }

  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

export default function LearnerResourceCard({
  resource,
  busy,
  onOpen,
  onVideoCompleted,
  videoCompleted = false,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const type = normalizeLearnerResourceType(resource.type);
  const hasOpenableUrl = Boolean(resource.publicUrl || resource.url);
  const duration = durationLabel(resource.durationSeconds);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.controlRadius,
          borderWidth: theme.shape.borderWidth,
          padding: Math.max(
            14,
            theme.shape.cardPadding - 6,
          ),
        },
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.typeBadge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderRadius: 999,
            },
          ]}
        >
          <Text
            style={[
              styles.typeText,
              { color: theme.colors.accent },
            ]}
          >
            {resourceLabel(resource.type)}
          </Text>
        </View>

        {duration ? (
          <Text
            style={[
              styles.duration,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {duration}
          </Text>
        ) : null}
      </View>

      <Text
        style={[
          styles.title,
          { color: theme.colors.foreground },
        ]}
      >
        {resource.title}
      </Text>

      {resource.description ? (
        <Text
          style={[
            styles.description,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {resource.description}
        </Text>
      ) : null}

      {type === "TEXT" && resource.textContent ? (
        <View
          style={[
            styles.textBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderRadius: theme.shape.controlRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.textContent,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {resource.textContent}
          </Text>
        </View>
      ) : null}

      {(type === "IMAGE" ||
        type === "VIDEO" ||
        type === "PDF") &&
      hasOpenableUrl ? (
        <LearnerInlineMedia
          resource={resource}
          onVideoEnded={onVideoCompleted}
        />
      ) : null}

      {type === "SCORM" ? (
        <AppButton
          title="Ouvrir le contenu"
          onPress={onOpen}
          loading={busy}
          style={styles.button}
        />
      ) : null}

      {(type === "DOCUMENT" || type === "EXTERNAL_LINK") &&
      hasOpenableUrl ? (
        <AppButton
          title="Ouvrir la ressource"
          onPress={onOpen}
          disabled={busy}
          variant="secondary"
          style={styles.button}
        />
      ) : null}

      {type === "VIDEO" && Platform.OS !== "web" ? (
        <AppButton
          title={videoCompleted ? "Vidéo terminée" : "J’ai terminé la vidéo"}
          onPress={onVideoCompleted}
          loading={busy}
          disabled={busy || videoCompleted}
          variant="secondary"
          style={styles.button}
        />
      ) : null}

      {type === "SCORM" ? (
        <View
          style={[
            styles.scormHintBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderRadius: theme.shape.controlRadius,
            },
          ]}
        >
          <Text
            style={[
              styles.scormHint,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            Terminez le module interactif pour mettre à jour votre progression.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
  },
  header: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 9,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  typeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  duration: {
    fontSize: 12,
    fontWeight: "700",
  },
  title: {
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
  },
  description: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 5,
  },
  textBox: {
    padding: 14,
    marginTop: 12,
  },
  textContent: {
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    alignSelf: "flex-start",
    marginTop: 12,
  },
  scormHintBox: {
    marginTop: 10,
    padding: 12,
  },
  scormHint: {
    fontSize: 12,
    lineHeight: 18,
  },
});
