import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { AssistantConversationSummary } from "../../features/assistant/assistantService";
import {
  uxSpacing,
  uxTypography,
} from "../../theme/design-system/uxSemanticTokens";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";

type Props = {
  visible: boolean;
  conversations: AssistantConversationSummary[];
  loading: boolean;
  error: string;
  openingId: number | null;
  deletingId: number | null;
  pendingDeleteId: number | null;
  onClose: () => void;
  onSelect: (conversationId: number) => void;
  onAskDelete: (conversationId: number) => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "Date indisponible";
  }

  return parsed.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AssistantHistoryModal({
  visible,
  conversations,
  loading,
  error,
  openingId,
  deletingId,
  pendingDeleteId,
  onClose,
  onSelect,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: theme.shape.borderWidth,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text
                style={[
                  styles.title,
                  { color: theme.colors.foreground },
                ]}
              >
                Historique
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Retrouvez vos conversations sur tous vos appareils.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer l’historique"
              hitSlop={8}
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.closeLabel,
                  { color: theme.colors.accent },
                ]}
              >
                Fermer
              </Text>
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="small"
                color={theme.colors.accent}
              />
              <Text
                style={[
                  styles.loadingText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Chargement des conversations…
              </Text>
            </View>
          ) : conversations.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun historique
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Votre première conversation apparaîtra ici.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {conversations.map((conversation) => {
                const opening = openingId === conversation.id;
                const deleting = deletingId === conversation.id;
                const confirming = pendingDeleteId === conversation.id;

                return (
                  <View
                    key={conversation.id}
                    style={[
                      styles.item,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderColor: theme.colors.border,
                        borderWidth: theme.shape.borderWidth,
                      },
                    ]}
                  >
                    <View style={styles.itemRow}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ouvrir la conversation ${conversation.title}`}
                        disabled={opening || deleting}
                        onPress={() => onSelect(conversation.id)}
                        style={({ pressed }) => [
                          styles.openArea,
                          pressed ? styles.pressed : null,
                        ]}
                      >
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.itemTitle,
                            { color: theme.colors.foreground },
                          ]}
                        >
                          {conversation.title}
                        </Text>
                        <Text
                          style={[
                            styles.itemDate,
                            { color: theme.colors.foregroundMuted },
                          ]}
                        >
                          {formatDate(conversation.updatedAt)}
                        </Text>
                      </Pressable>

                      <View style={styles.itemAction}>
                        {opening ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.accent}
                          />
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Supprimer la conversation ${conversation.title}`}
                            disabled={deleting}
                            onPress={() => onAskDelete(conversation.id)}
                            style={({ pressed }) => [
                              styles.deleteButton,
                              pressed ? styles.pressed : null,
                            ]}
                          >
                            {deleting ? (
                              <ActivityIndicator
                                size="small"
                                color={theme.colors.accent}
                              />
                            ) : (
                              <Text
                                style={[
                                  styles.deleteLabel,
                                  { color: theme.colors.accent },
                                ]}
                              >
                                Supprimer
                              </Text>
                            )}
                          </Pressable>
                        )}
                      </View>
                    </View>

                    {confirming ? (
                      <View
                        style={[
                          styles.confirmBox,
                          { borderTopColor: theme.colors.border },
                        ]}
                      >
                        <Text
                          style={[
                            styles.confirmText,
                            { color: theme.colors.foreground },
                          ]}
                        >
                          Supprimer définitivement cette conversation ?
                        </Text>

                        <View style={styles.confirmActions}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Annuler la suppression"
                            onPress={onCancelDelete}
                            style={({ pressed }) => [
                              styles.confirmButton,
                              {
                                borderColor: theme.colors.border,
                                borderWidth: theme.shape.borderWidth,
                              },
                              pressed ? styles.pressed : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.confirmLabel,
                                { color: theme.colors.foreground },
                              ]}
                            >
                              Annuler
                            </Text>
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Confirmer la suppression"
                            onPress={onConfirmDelete}
                            style={({ pressed }) => [
                              styles.confirmButton,
                              { backgroundColor: theme.colors.accent },
                              pressed ? styles.pressed : null,
                            ]}
                          >
                            <Text
                              style={[
                                styles.confirmLabel,
                                { color: theme.colors.accentForeground },
                              ]}
                            >
                              Supprimer
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {error ? (
            <Text
              style={[
                styles.errorText,
                { color: theme.colors.foreground },
              ]}
            >
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    padding: uxSpacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    maxHeight: "82%",
    borderRadius: 18,
    padding: uxSpacing.lg,
    gap: uxSpacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: uxSpacing.md,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: uxTypography.caption,
    lineHeight: 18,
  },
  closeButton: {
    minHeight: 36,
    paddingHorizontal: uxSpacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  closeLabel: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  loadingBox: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: uxSpacing.sm,
  },
  loadingText: {
    fontSize: uxTypography.caption,
  },
  emptyBox: {
    padding: uxSpacing.lg,
    borderRadius: 14,
    gap: uxSpacing.xs,
  },
  emptyTitle: {
    fontSize: uxTypography.body,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: uxTypography.caption,
    lineHeight: 18,
  },
  list: {
    minHeight: 0,
  },
  listContent: {
    gap: uxSpacing.sm,
    paddingBottom: uxSpacing.xs,
  },
  item: {
    borderRadius: 14,
    overflow: "hidden",
  },
  itemRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
  },
  openArea: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: uxSpacing.md,
    paddingVertical: uxSpacing.sm,
    gap: 4,
  },
  itemTitle: {
    fontSize: uxTypography.body,
    lineHeight: 20,
    fontWeight: "800",
  },
  itemDate: {
    fontSize: uxTypography.caption,
  },
  itemAction: {
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    paddingRight: uxSpacing.sm,
  },
  deleteButton: {
    minHeight: 38,
    paddingHorizontal: uxSpacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteLabel: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  confirmBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: uxSpacing.md,
    gap: uxSpacing.sm,
  },
  confirmText: {
    fontSize: uxTypography.caption,
    lineHeight: 18,
    fontWeight: "700",
  },
  confirmActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: uxSpacing.sm,
  },
  confirmButton: {
    minHeight: 38,
    paddingHorizontal: uxSpacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  confirmLabel: {
    fontSize: uxTypography.caption,
    fontWeight: "900",
  },
  errorText: {
    fontSize: uxTypography.caption,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
