import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      statusBarTranslucent
      navigationBarTranslucent={false}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer l’historique"
          onPress={onClose}
          android_ripple={{ color: "transparent" }}
          style={StyleSheet.absoluteFill}
        />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <SymbolView
                name={{
                  ios: "clock.arrow.circlepath",
                  android: "history",
                  web: "history",
                }}
                tintColor="#7C3AED"
                size={18}
                weight="bold"
              />
            </View>

            <View style={styles.headerCopy}>
              <Text
                maxFontSizeMultiplier={1.15}
                style={styles.title}
              >
                Historique
              </Text>
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.15}
                style={styles.subtitle}
              >
                Retrouvez et reprenez vos conversations.
              </Text>
            </View>

            <View style={styles.closeVisual}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer l’historique"
                onPress={onClose}
                android_ripple={{ color: "transparent" }}
                style={styles.closePressable}
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor="#667085"
                  size={13}
                  weight="bold"
                />
              </Pressable>
            </View>
          </View>

          {loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="small" color="#7C3AED" />
              <Text
                maxFontSizeMultiplier={1.15}
                style={styles.stateText}
              >
                Chargement des conversations…
              </Text>
            </View>
          ) : conversations.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <SymbolView
                  name={{
                    ios: "bubble.left.and.bubble.right",
                    android: "forum",
                    web: "forum",
                  }}
                  tintColor="#7C3AED"
                  size={18}
                  weight="bold"
                />
              </View>

              <Text
                maxFontSizeMultiplier={1.15}
                style={styles.emptyTitle}
              >
                Aucun historique
              </Text>
              <Text
                maxFontSizeMultiplier={1.15}
                style={styles.emptyText}
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
                      confirming ? styles.itemConfirming : null,
                    ]}
                  >
                    <View style={styles.itemMainRow}>
                      <View style={styles.conversationIcon}>
                        <SymbolView
                          name={{
                            ios: "bubble.left.fill",
                            android: "chat_bubble",
                            web: "chat_bubble",
                          }}
                          tintColor="#7C3AED"
                          size={14}
                          weight="bold"
                        />
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Ouvrir la conversation ${conversation.title}`}
                        disabled={opening || deleting}
                        onPress={() => onSelect(conversation.id)}
                        android_ripple={{ color: "transparent" }}
                        style={styles.openArea}
                      >
                        <Text
                          numberOfLines={2}
                          maxFontSizeMultiplier={1.15}
                          style={styles.itemTitle}
                        >
                          {conversation.title}
                        </Text>

                        <View style={styles.itemMeta}>
                          <SymbolView
                            name={{
                              ios: "clock",
                              android: "schedule",
                              web: "schedule",
                            }}
                            tintColor="#98A2B3"
                            size={10}
                            weight="regular"
                          />
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}
                            style={styles.itemDate}
                          >
                            {formatDate(conversation.updatedAt)}
                          </Text>
                        </View>
                      </Pressable>

                      <View style={styles.itemActions}>
                        {opening ? (
                          <ActivityIndicator size="small" color="#7C3AED" />
                        ) : (
                          <>
                            <View style={styles.openVisual}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Ouvrir la conversation ${conversation.title}`}
                                disabled={deleting}
                                onPress={() => onSelect(conversation.id)}
                                android_ripple={{ color: "transparent" }}
                                style={styles.iconPressable}
                              >
                                <SymbolView
                                  name={{
                                    ios: "chevron.right",
                                    android: "chevron_right",
                                    web: "chevron_right",
                                  }}
                                  tintColor="#7C3AED"
                                  size={11}
                                  weight="bold"
                                />
                              </Pressable>
                            </View>

                            <View style={styles.deleteVisual}>
                              <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Supprimer la conversation ${conversation.title}`}
                                disabled={deleting}
                                onPress={() => onAskDelete(conversation.id)}
                                android_ripple={{ color: "transparent" }}
                                style={styles.iconPressable}
                              >
                                {deleting ? (
                                  <ActivityIndicator
                                    size="small"
                                    color="#DC2626"
                                  />
                                ) : (
                                  <SymbolView
                                    name={{
                                      ios: "trash",
                                      android: "delete",
                                      web: "delete",
                                    }}
                                    tintColor="#DC2626"
                                    size={12}
                                    weight="bold"
                                  />
                                )}
                              </Pressable>
                            </View>
                          </>
                        )}
                      </View>
                    </View>

                    {confirming ? (
                      <View style={styles.confirmBox}>
                        <Text
                          maxFontSizeMultiplier={1.15}
                          style={styles.confirmText}
                        >
                          Supprimer définitivement cette conversation ?
                        </Text>

                        <View style={styles.confirmActions}>
                          <View style={styles.cancelVisual}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Annuler la suppression"
                              onPress={onCancelDelete}
                              android_ripple={{ color: "transparent" }}
                              style={styles.confirmPressable}
                            >
                              <Text
                                maxFontSizeMultiplier={1.15}
                                style={styles.cancelLabel}
                              >
                                Annuler
                              </Text>
                            </Pressable>
                          </View>

                          <View style={styles.confirmDeleteVisual}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Confirmer la suppression"
                              onPress={onConfirmDelete}
                              android_ripple={{ color: "transparent" }}
                              style={styles.confirmPressable}
                            >
                              <SymbolView
                                name={{
                                  ios: "trash.fill",
                                  android: "delete",
                                  web: "delete",
                                }}
                                tintColor="#FFFFFF"
                                size={11}
                                weight="bold"
                              />
                              <Text
                                maxFontSizeMultiplier={1.15}
                                style={styles.confirmDeleteLabel}
                              >
                                Supprimer
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
          )}

          {error ? (
            <View style={styles.errorCard}>
              <SymbolView
                name={{
                  ios: "exclamationmark.triangle.fill",
                  android: "warning",
                  web: "warning",
                }}
                tintColor="#DC2626"
                size={13}
                weight="bold"
              />
              <Text
                maxFontSizeMultiplier={1.15}
                style={styles.errorText}
              >
                {error}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.52)",
  },
  sheet: {
    width: "100%",
    maxHeight: "72%",
    paddingHorizontal: 14,
    paddingTop: 8,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#F8F6F3",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 14,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 10,
    backgroundColor: "#D0CBD5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    marginRight: 10,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#111827",
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  subtitle: {
    marginTop: 1,
    color: "#667085",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
  },
  closeVisual: {
    width: 36,
    height: 36,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4DFE8",
  },
  closePressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  centerState: {
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stateText: {
    color: "#667085",
    fontSize: 11,
    fontWeight: "700",
  },

  emptyCard: {
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  emptyIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    marginBottom: 9,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  emptyText: {
    marginTop: 3,
    color: "#667085",
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },

  list: {
    minHeight: 0,
  },
  listContent: {
    gap: 8,
    paddingBottom: 12,
  },
  item: {
    overflow: "hidden",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
  },
  itemConfirming: {
    borderColor: "#F2C8C8",
  },
  itemMainRow: {
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  conversationIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    marginRight: 9,
    backgroundColor: "#F1E9FF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  openArea: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 2,
  },
  itemTitle: {
    color: "#111827",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
  },
  itemMeta: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  itemDate: {
    color: "#98A2B3",
    fontSize: 9,
    fontWeight: "600",
  },
  itemActions: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  openVisual: {
    width: 32,
    height: 32,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F3EEFF",
  },
  deleteVisual: {
    width: 32,
    height: 32,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#FFF0F0",
  },
  iconPressable: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  confirmBox: {
    padding: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#F0D8D8",
    backgroundColor: "#FFF9F9",
  },
  confirmText: {
    color: "#7A2929",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  confirmActions: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 7,
  },
  cancelVisual: {
    minWidth: 82,
    minHeight: 36,
    borderRadius: 11,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E4DFE8",
    backgroundColor: "#FFFFFF",
  },
  confirmDeleteVisual: {
    minWidth: 100,
    minHeight: 36,
    borderRadius: 11,
    overflow: "hidden",
    backgroundColor: "#DC2626",
  },
  confirmPressable: {
    minHeight: 36,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  cancelLabel: {
    color: "#475467",
    fontSize: 10,
    fontWeight: "900",
  },
  confirmDeleteLabel: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  errorCard: {
    marginTop: 8,
    minHeight: 42,
    paddingHorizontal: 10,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#F0CCCC",
    backgroundColor: "#FFF5F5",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  errorText: {
    flex: 1,
    minWidth: 0,
    color: "#8E2525",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
  },
});
