import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  uxSpacing,
  uxTouch,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function TrainingCover({
  title,
  coverUrl,
  spacingAfter = false,
  resizeMode = "cover",
}: {
  title: string;
  coverUrl?: string | null;
  spacingAfter?: boolean;
  resizeMode?: "cover" | "contain";
}) {
  const { theme } = useSmartTrainingTheme();

  return coverUrl ? (
    <Image
      source={{ uri: coverUrl }}
      accessibilityLabel={`Couverture de ${title}`}
      resizeMode={resizeMode}
      style={[
        styles.cover,
        {
          borderRadius: theme.shape.controlRadius,
          marginBottom: spacingAfter ? uxSpacing.md : 0,
        },
      ]}
    />
  ) : (
    <View
      accessibilityRole="image"
      accessibilityLabel={`Aucune couverture disponible pour ${title}`}
      style={[
        styles.coverPlaceholder,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderRadius: theme.shape.controlRadius,
          marginBottom: spacingAfter ? uxSpacing.md : 0,
        },
      ]}
    >
      <Text style={[styles.caption, { color: theme.colors.foregroundMuted }]}>
        Couverture à ajouter
      </Text>
    </View>
  );
}

export function TrainingTile({
  title,
  description,
  coverUrl,
  meta,
  progress,
  disabled = false,
  onPress,
}: {
  title: string;
  description?: string;
  coverUrl?: string | null;
  meta?: string;
  progress?: number | null;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const normalized = typeof progress === "number" ? clamp(progress) : null;

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
      ]}
    >
      <TrainingCover title={title} coverUrl={coverUrl} />

      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          {title}
        </Text>
        {description ? (
          <Text numberOfLines={4} style={[styles.body, { color: theme.colors.foregroundMuted }]}>
            {description}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[styles.caption, { color: theme.colors.foregroundSubtle }]}>
            {meta}
          </Text>
        ) : null}

        {normalized !== null ? (
          <View style={styles.progressArea}>
            <View style={styles.progressHeader}>
              <Text style={[styles.caption, { color: theme.colors.foregroundMuted }]}>
                Progression
              </Text>
              <Text style={[styles.label, { color: theme.colors.foreground }]}>
                {Math.round(normalized)} %
              </Text>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(normalized) }}
              style={[styles.track, { backgroundColor: theme.colors.surfaceSoft }]}
            >
              <View
                style={[
                  styles.fill,
                  { backgroundColor: theme.colors.accent, width: `${normalized}%` },
                ]}
              />
            </View>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export function LearnerListItem({
  name,
  email,
  subtitle,
  avatarUrl,
  disabled = false,
  onPress,
}: {
  name: string;
  email?: string;
  subtitle?: string;
  avatarUrl?: string | null;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={name}
      disabled={disabled || !onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          opacity: disabled ? 0.55 : pressed ? 0.82 : 1,
        },
      ]}
    >
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} accessibilityLabel={`Photo de ${name}`} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: theme.colors.surfaceSoft }]}>
          <Text style={[styles.avatarText, { color: theme.colors.foreground }]}>
            {name.trim().slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.flexContent}>
        <Text numberOfLines={1} style={[styles.label, { color: theme.colors.foreground }]}>
          {name}
        </Text>
        {email ? (
          <Text numberOfLines={1} style={[styles.body, { color: theme.colors.foregroundMuted }]}>
            {email}
          </Text>
        ) : null}
        {subtitle ? (
          <Text style={[styles.caption, { color: theme.colors.foregroundSubtle }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function ActivityItem({
  title,
  description,
  timestamp,
}: {
  title: string;
  description?: string;
  timestamp?: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View style={styles.activityRow}>
      <View style={[styles.marker, { backgroundColor: theme.colors.accent }]} />
      <View style={styles.flexContent}>
        <Text style={[styles.label, { color: theme.colors.foreground }]}>{title}</Text>
        {description ? (
          <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>{description}</Text>
        ) : null}
        {timestamp ? (
          <Text style={[styles.caption, { color: theme.colors.foregroundSubtle }]}>{timestamp}</Text>
        ) : null}
      </View>
    </View>
  );
}

export type PriorityItemSeverity = "info" | "success" | "warning" | "error";

export function PriorityItem({
  title,
  description,
  severity = "info",
}: {
  title: string;
  description?: string;
  severity?: PriorityItemSeverity;
}) {
  const { theme } = useSmartTrainingTheme();

  const severityColor =
    severity === "error"
      ? theme.colors.danger
      : severity === "warning"
        ? theme.colors.warning
        : severity === "success"
          ? theme.colors.success
          : theme.colors.info;

  return (
    <View
      style={[
        styles.priority,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderLeftColor: severityColor,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>{description}</Text>
      ) : null}
    </View>
  );
}

export function ProgressBlock({
  title,
  value,
  helper,
}: {
  title: string;
  value: number;
  helper?: string;
}) {
  const { theme } = useSmartTrainingTheme();
  const normalized = clamp(value);

  return (
    <View
      style={[
        styles.block,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <View style={styles.progressHeader}>
        <Text style={[styles.label, { color: theme.colors.foreground }]}>{title}</Text>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>
          {Math.round(normalized)} %
        </Text>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(normalized) }}
        style={[styles.track, { backgroundColor: theme.colors.surfaceSoft }]}
      >
        <View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.accent, width: `${normalized}%` },
          ]}
        />
      </View>
      {helper ? (
        <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>{helper}</Text>
      ) : null}
    </View>
  );
}

export function DeadlineItem({
  title,
  deadlineLabel,
  status,
  actionHint,
  overdue = false,
}: {
  title: string;
  deadlineLabel: string;
  status?: string;
  actionHint?: string;
  overdue?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.row,
        styles.deadlineRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: overdue ? theme.colors.accent : theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <View style={styles.flexContent}>
        <Text style={[styles.label, { color: theme.colors.foreground }]}>{title}</Text>
        <Text
          style={[
            styles.body,
            { color: overdue ? theme.colors.accent : theme.colors.foregroundMuted },
          ]}
        >
          {deadlineLabel}
        </Text>
      </View>
      {status ? (
        <Text
          numberOfLines={2}
          style={[
            styles.caption,
            styles.deadlineStatus,
            { color: overdue ? theme.colors.accent : theme.colors.foregroundMuted },
          ]}
        >
          {status}
        </Text>
      ) : null}
      {actionHint ? (
        <View style={styles.deadlineActionHint}>
          <Text
            style={[
              styles.deadlineActionText,
              { color: theme.colors.accent },
            ]}
          >
            {actionHint}
          </Text>
          <Text
            style={[
              styles.deadlineActionChevron,
              { color: theme.colors.accent },
            ]}
          >
            ›
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export function GroupTile({
  name,
  memberCount,
  description,
  onPress,
}: {
  name: string;
  memberCount: number;
  description?: string;
  onPress?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={`${name}, ${memberCount} membres`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.foreground }]}>{name}</Text>
      <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
        {memberCount} membre{memberCount > 1 ? "s" : ""}
      </Text>
      {description ? (
        <Text style={[styles.caption, { color: theme.colors.foregroundSubtle }]}>
          {description}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function CertificateTile({
  title,
  issuedAt,
  verificationLabel,
  onPress,
}: {
  title: string;
  issuedAt?: string;
  verificationLabel?: string;
  onPress?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityLabel={title}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
      {issuedAt ? (
        <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
          Délivré le {issuedAt}
        </Text>
      ) : null}
      {verificationLabel ? (
        <Text style={[styles.caption, { color: theme.colors.foregroundSubtle }]}>
          {verificationLabel}
        </Text>
      ) : null}
    </Pressable>
  );
}

export function MetricChip({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.metric,
        {
          backgroundColor: theme.colors.surfaceSoft,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.controlRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <Text style={[styles.caption, { color: theme.colors.foregroundMuted }]}>{label}</Text>
      <Text style={[styles.title, { color: theme.colors.foreground }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: uxTouch.minHeight,
    overflow: "hidden",
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  coverPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignItems: "center",
    justifyContent: "center",
    padding: uxSpacing.lg,
  },
  content: {
    padding: uxSpacing.lg,
    gap: uxSpacing.sm,
  },
  row: {
    minHeight: uxTouch.minHeight,
    padding: uxSpacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: uxSpacing.md,
  },
  deadlineRow: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: uxSpacing.sm,
  },
  deadlineStatus: {
    width: "100%",
    flexShrink: 1,
  },
  deadlineActionHint: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: uxSpacing.xs,
  },
  deadlineActionText: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  deadlineActionChevron: {
    fontSize: uxTypography.body,
    fontWeight: "900",
    lineHeight: 18,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: uxSpacing.md,
  },
  priority: {
    borderLeftWidth: 4,
    padding: uxSpacing.lg,
    gap: uxSpacing.sm,
  },
  block: {
    minHeight: uxTouch.minHeight,
    padding: uxSpacing.lg,
    gap: uxSpacing.sm,
  },
  metric: {
    paddingHorizontal: uxSpacing.md,
    paddingVertical: uxSpacing.sm,
    gap: uxSpacing.xs,
  },
  flexContent: {
    flex: 1,
    minWidth: 0,
    gap: uxSpacing.xs,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: uxTypography.title,
    fontWeight: "700",
  },
  marker: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: uxSpacing.xs,
  },
  title: {
    fontSize: uxTypography.title,
    fontWeight: "700",
  },
  label: {
    fontSize: uxTypography.label,
    fontWeight: "700",
  },
  body: {
    fontSize: uxTypography.body,
    lineHeight: 20,
  },
  caption: {
    fontSize: uxTypography.caption,
  },
  progressArea: {
    gap: uxSpacing.xs,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: uxSpacing.md,
  },
  track: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 999,
  },
});
