import {
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../AppButton";
import { TrainingCover } from "../ux/RichPrimitives";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { buildLearnerMediaUrl } from "../../features/trainings/learnerTrainingService";
import {
  LearnerCatalogTraining,
  LearnerEnrollmentMode,
} from "../../types/learnerCatalog";

type CatalogTrainingCardProps = {
  training: LearnerCatalogTraining;
  enrolled: boolean;
  pendingRequest: boolean;
  busy: boolean;
  accessCode: string;
  accessMessage: string;
  onAccessCodeChange: (value: string) => void;
  onAccessMessageChange: (value: string) => void;
  onSelfEnroll: () => void;
  onAccessCodeEnroll: () => void;
  onRequestAccess: () => void;
  onOpenTraining: () => void;
};

function accessLabel(mode?: string | null): string {
  if (mode === "SELF_ENROLLMENT") return "Inscription libre";
  if (mode === "ACCESS_CODE") return "Code d\u2019acc\u00E8s";
  if (mode === "ASSIGNMENT_ONLY") return "Acc\u00E8s sur demande";
  if (mode === "INVITATION") return "Sur invitation";
  return "Acc\u00E8s encadr\u00E9";
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "D\u00E9butant";
  if (level === "INTERMEDIAIRE") return "Interm\u00E9diaire";
  if (level === "AVANCE") return "Avanc\u00E9";
  return level || "Niveau non indiqu\u00E9";
}

function normalizedMode(
  mode?: string | null,
): LearnerEnrollmentMode | null {
  if (
    mode === "SELF_ENROLLMENT" ||
    mode === "ASSIGNMENT_ONLY" ||
    mode === "ACCESS_CODE" ||
    mode === "INVITATION"
  ) {
    return mode;
  }

  return null;
}

export default function CatalogTrainingCard({
  training,
  enrolled,
  pendingRequest,
  busy,
  accessCode,
  accessMessage,
  onAccessCodeChange,
  onAccessMessageChange,
  onSelfEnroll,
  onAccessCodeEnroll,
  onRequestAccess,
  onOpenTraining,
}: CatalogTrainingCardProps) {
  const { theme } = useSmartTrainingTheme();

  const mode = normalizedMode(training.enrollmentMode);
  const description =
    training.shortDescription ||
    training.description ||
    "D\u00E9couvre le contenu et les objectifs de cette formation.";

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          padding: theme.shape.cardPadding,
          shadowColor: theme.colors.foreground,
          shadowOpacity: theme.shape.shadowOpacity,
        },
      ]}
    >
      <View
        style={[
          styles.coverFrame,
          { borderRadius: theme.shape.controlRadius },
        ]}
      >
        <TrainingCover
          title={training.title}
          coverUrl={buildLearnerMediaUrl(training.coverImageUrl)}
        />
      </View>

      <View style={styles.badgeRow}>
        <View
          style={[
            styles.accessBadge,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.accent,
              borderWidth: Math.max(
                1,
                theme.shape.borderWidth,
              ),
            },
          ]}
        >
          <Text
            style={[
              styles.accessBadgeText,
              {
                color: theme.colors.accent,
              },
            ]}
          >
            {accessLabel(training.enrollmentMode)}
          </Text>
        </View>

        {training.category ? (
          <View
            style={[
              styles.neutralBadge,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.neutralBadgeText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {training.category}
            </Text>
          </View>
        ) : null}
      </View>

      <Text
        style={[
          styles.title,
          {
            color: theme.colors.foreground,
          },
        ]}
      >
        {training.title}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.description,
          {
            color: theme.colors.foregroundMuted,
          },
        ]}
      >
        {description}
      </Text>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.metaPill,
            {
              backgroundColor: theme.colors.surfaceSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.meta,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {levelLabel(training.level)}
          </Text>
        </View>

        <View
          style={[
            styles.metaPill,
            {
              backgroundColor: theme.colors.surfaceSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.meta,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {training.estimatedDurationHours
              ? `${training.estimatedDurationHours} h`
              : "Dur\u00E9e non indiqu\u00E9e"}
          </Text>
        </View>

        {typeof training.averageRating === "number" &&
        training.averageRating > 0 ? (
          <View
            style={[
              styles.metaPill,
              {
                backgroundColor: theme.colors.surfaceSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.meta,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {training.averageRating.toFixed(1)} / 5
            </Text>
          </View>
        ) : null}
      </View>

      {enrolled ? (
        <View
          style={[
            styles.stateBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.success,
              borderWidth: Math.max(
                1,
                theme.shape.borderWidth,
              ),
              borderRadius: theme.shape.controlRadius,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.stateTitle,
              {
                color: theme.colors.success,
              },
            ]}
          >
            {"Inscription active"}
          </Text>
          <Text
            style={[
              styles.stateText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            Cette formation est disponible dans ton espace de formation.
          </Text>
          <AppButton
            title="Ouvrir la formation"
            onPress={onOpenTraining}
            variant="secondary"
            style={styles.actionButton}
          />
        </View>
      ) : pendingRequest ? (
        <View
          style={[
            styles.stateBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.warning,
              borderWidth: Math.max(
                1,
                theme.shape.borderWidth,
              ),
              borderRadius: theme.shape.controlRadius,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.stateTitle,
              {
                color: theme.colors.warning,
              },
            ]}
          >
            Demande en attente
          </Text>
          <Text
            style={[
              styles.stateText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Ta demande a bien \u00E9t\u00E9 transmise. Tu verras la formation dans ton parcours d\u00E8s qu\u2019elle sera accept\u00E9e."
            }
          </Text>
        </View>
      ) : mode === "SELF_ENROLLMENT" ? (
        <View
          style={[
            styles.actionArea,
            {
              borderTopColor: theme.colors.border,
              borderTopWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text
            style={[
              styles.actionHelp,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Cette formation est ouverte \u00E0 l\u2019inscription imm\u00E9diate."
            }
          </Text>
          <AppButton
            title={"S\u2019inscrire"}
            onPress={onSelfEnroll}
            loading={busy}
            style={styles.actionButton}
          />
        </View>
      ) : mode === "ACCESS_CODE" ? (
        <View
          style={[
            styles.actionArea,
            {
              borderTopColor: theme.colors.border,
              borderTopWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text
            style={[
              styles.actionHelp,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Saisis le code communiqu\u00E9 par ton formateur ou ton organisation."
            }
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceElevated,
                color: theme.colors.foreground,
                borderRadius: theme.shape.controlRadius,
                borderWidth: theme.shape.borderWidth,
                minHeight: theme.shape.minTouchTarget,
              },
            ]}
            placeholder={"Code d\u2019acc\u00E8s"}
          accessibilityLabel={"Code d\u2019acc\u00E8s"}
            placeholderTextColor={theme.colors.foregroundSubtle}
            value={accessCode}
            onChangeText={onAccessCodeChange}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <AppButton
            title="Valider le code"
            onPress={onAccessCodeEnroll}
            loading={busy}
            disabled={!accessCode.trim()}
            style={styles.actionButton}
          />
        </View>
      ) : mode === "ASSIGNMENT_ONLY" ? (
        <View
          style={[
            styles.actionArea,
            {
              borderTopColor: theme.colors.border,
              borderTopWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text
            style={[
              styles.actionHelp,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {
              "Cette formation n\u00E9cessite l\u2019accord d\u2019un formateur ou d\u2019un administrateur."
            }
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.messageInput,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceElevated,
                color: theme.colors.foreground,
                borderRadius: theme.shape.controlRadius,
                borderWidth: theme.shape.borderWidth,
                minHeight: Math.max(
                  96,
                  theme.shape.minTouchTarget,
                ),
              },
            ]}
            placeholder={
              "Message facultatif pour accompagner ta demande"
            }
          accessibilityLabel={"Message facultatif pour la demande d\u2019acc\u00E8s"}
            placeholderTextColor={theme.colors.foregroundSubtle}
            value={accessMessage}
            onChangeText={onAccessMessageChange}
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <AppButton
            title={"Demander l\u2019acc\u00E8s"}
            onPress={onRequestAccess}
            loading={busy}
            style={styles.actionButton}
          />
        </View>
      ) : (
        <View
          style={[
            styles.stateBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
              borderWidth: theme.shape.borderWidth,
              borderRadius: theme.shape.controlRadius,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <Text
            style={[
              styles.stateTitle,
              {
                color: theme.colors.foreground,
              },
            ]}
          >
            {mode === "INVITATION"
              ? "Acc\u00E8s sur invitation"
              : "Acc\u00E8s encadr\u00E9"}
          </Text>
          <Text
            style={[
              styles.stateText,
              {
                color: theme.colors.foregroundMuted,
              },
            ]}
          >
            {mode === "INVITATION"
              ? "L\u2019inscription sera disponible lorsqu\u2019une invitation t\u2019aura \u00E9t\u00E9 adress\u00E9e."
              : "Le mode d\u2019acc\u00E8s de cette formation ne permet pas une inscription directe depuis le catalogue."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    marginBottom: 12,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },
  coverFrame: {
    height: 112,
    overflow: "hidden",
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  accessBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  accessBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  neutralBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  neutralBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "900",
    marginBottom: 5,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 9,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  meta: {
    fontSize: 11,
    fontWeight: "700",
  },
  actionArea: {
    paddingTop: 12,
  },
  actionHelp: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 9,
  },
  input: {
    width: "100%",
    maxWidth: 560,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  messageInput: {
    paddingTop: 10,
  },
  actionButton: {
    alignSelf: "flex-start",
    minWidth: 160,
  },
  stateBox: {},
  stateTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  stateText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
});