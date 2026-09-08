import {
  ActivityIndicator,
  Modal,
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

export function AppEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      style={[
        styles.state,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.foreground }]}>{title}</Text>
      {description ? (
        <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[
            styles.action,
            {
              borderColor: theme.colors.accent,
              borderRadius: theme.shape.controlRadius,
              borderWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: theme.colors.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppErrorState({
  title = "Une erreur est survenue",
  description,
  actionLabel,
  onAction,
}: {
  title?: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.state,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.accent,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.accent }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
        {description}
      </Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={[
            styles.action,
            {
              borderColor: theme.colors.accent,
              borderRadius: theme.shape.controlRadius,
              borderWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text style={[styles.actionText, { color: theme.colors.accent }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppLoadingState({
  label = "Chargement…",
}: {
  label?: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.loading}
    >
      <ActivityIndicator color={theme.colors.accent} />
      <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
        {label}
      </Text>
    </View>
  );
}

export function AppConfirmSheet({
  visible,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const actionColor = destructive ? theme.colors.accent : theme.colors.accent;

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={busy ? undefined : onCancel}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer la confirmation"
          disabled={busy}
          onPress={onCancel}
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.colors.background,
              opacity: 0.72,
            },
          ]}
        />

        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderTopLeftRadius: theme.shape.cardRadius,
              borderTopRightRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <Text style={[styles.headline, { color: theme.colors.foreground }]}>
            {title}
          </Text>
          <Text style={[styles.body, { color: theme.colors.foregroundMuted }]}>
            {description}
          </Text>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={onCancel}
              style={[
                styles.button,
                {
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: theme.colors.foreground }]}>
                {cancelLabel}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={onConfirm}
              style={[
                styles.button,
                {
                  borderColor: actionColor,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: theme.shape.borderWidth,
                  opacity: busy ? 0.55 : 1,
                },
              ]}
            >
              <Text style={[styles.actionText, { color: actionColor }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  state: {
    padding: uxSpacing.xl,
    alignItems: "center",
    gap: uxSpacing.md,
  },
  title: {
    fontSize: uxTypography.title,
    fontWeight: "700",
    textAlign: "center",
  },
  headline: {
    fontSize: uxTypography.headline,
    fontWeight: "800",
  },
  body: {
    fontSize: uxTypography.body,
    lineHeight: 20,
    textAlign: "center",
  },
  action: {
    minHeight: uxTouch.minHeight,
    paddingHorizontal: uxSpacing.lg,
    paddingVertical: uxSpacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: {
    fontSize: uxTypography.label,
    fontWeight: "700",
  },
  loading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: uxSpacing.sm,
    padding: uxSpacing.lg,
  },
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    padding: uxSpacing.xl,
    gap: uxSpacing.md,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: uxSpacing.sm,
    marginTop: uxSpacing.sm,
  },
  button: {
    minHeight: uxTouch.minHeight,
    minWidth: 108,
    paddingHorizontal: uxSpacing.lg,
    paddingVertical: uxSpacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
