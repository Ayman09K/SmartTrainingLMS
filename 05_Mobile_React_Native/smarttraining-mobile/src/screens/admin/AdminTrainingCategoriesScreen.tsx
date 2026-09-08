import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  createAdminTrainingCategory,
  getAdminTrainingCategories,
  updateAdminTrainingCategory,
} from "../../features/admin/adminTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  MobileTrainingCategory,
} from "../../types/trainerAuthoringMobile";

type Draft = {
  id?: number;
  name: string;
  active: boolean;
  sortOrder: string;
};

const emptyDraft: Draft = {
  name: "",
  active: true,
  sortOrder: "0",
};

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "L’opération n’a pas pu être réalisée.";
}

export default function AdminTrainingCategoriesScreen() {
  const { theme } = useSmartTrainingTheme();

  const [items, setItems] =
    useState<MobileTrainingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] =
    useState<Draft>(emptyDraft);

  async function load() {
    const loaded =
      await getAdminTrainingCategories();

    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getAdminTrainingCategories()
      .then((loaded) => {
        if (active) {
          setItems(loaded);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(errorText(caught));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized =
      query.trim().toLocaleLowerCase("fr");

    return [...items]
      .sort(
        (left, right) =>
          (left.sortOrder ?? left.id) -
          (right.sortOrder ?? right.id),
      )
      .filter((item) =>
        !normalized
          ? true
          : item.name
              .toLocaleLowerCase("fr")
              .includes(normalized),
      );
  }, [items, query]);

  function openCreate() {
    const nextOrder =
      items.length === 0
        ? 0
        : Math.max(
            ...items.map(
              (item) => item.sortOrder ?? 0,
            ),
          ) + 1;

    setDraft({
      name: "",
      active: true,
      sortOrder: String(nextOrder),
    });
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function openEdit(
    category: MobileTrainingCategory,
  ) {
    setDraft({
      id: category.id,
      name: category.name,
      active: category.active !== false,
      sortOrder: String(
        category.sortOrder ?? 0,
      ),
    });
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  async function save() {
    if (working) {
      return;
    }

    const name = draft.name.trim();
    const sortOrder = Number(draft.sortOrder);

    if (!name) {
      setError(
        "Le nom de la catégorie est obligatoire.",
      );
      return;
    }

    if (
      !Number.isInteger(sortOrder) ||
      sortOrder < 0
    ) {
      setError(
        "L’ordre doit être un entier positif ou nul.",
      );
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const request = {
        name,
        active: draft.active,
        sortOrder,
      };

      if (draft.id) {
        await updateAdminTrainingCategory(
          draft.id,
          request,
        );
        setNotice("Catégorie mise à jour.");
      } else {
        await createAdminTrainingCategory(
          request,
        );
        setNotice("Catégorie créée.");
      }

      setEditorOpen(false);
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  async function toggleActive(
    category: MobileTrainingCategory,
  ) {
    if (working) {
      return;
    }

    setWorking(true);
    setError("");
    setNotice("");

    try {
      await updateAdminTrainingCategory(
        category.id,
        {
          name: category.name,
          active: category.active === false,
          sortOrder: category.sortOrder ?? 0,
        },
      );

      setNotice(
        category.active === false
          ? "Catégorie activée."
          : "Catégorie désactivée.",
      );

      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement des catégories..." />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <SectionHeader
            title="Gestion des catégories"
            subtitle="Référentiel utilisé lors de la création des formations."
          />

          <View
            style={[
              styles.infoCard,
              {
                backgroundColor:
                  theme.colors.surfaceSoft,
                borderColor:
                  theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.infoTitle,
                {
                  color:
                    theme.colors.foreground,
                },
              ]}
            >
              Référentiel des formations
            </Text>

            <Text
              style={[
                styles.infoText,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              Une catégorie désactivée n’est plus proposée
              pour les nouvelles formations. Les règles de
              renommage et d’utilisation restent contrôlées
              par le backend.
            </Text>
          </View>

          <View style={styles.toolbar}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une catégorie..."
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              style={[
                styles.search,
                {
                  color:
                    theme.colors.foreground,
                  backgroundColor:
                    theme.colors.surface,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            />

            <AppButton
              title="Nouvelle catégorie"
              onPress={openCreate}
              style={styles.newButton}
            />
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => setError("")}
            />
          ) : null}

          {notice ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.noticeText,
                  {
                    color:
                      theme.colors.foreground,
                  },
                ]}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.count,
              {
                color:
                  theme.colors.foregroundMuted,
              },
            ]}
          >
            {filtered.length} catégorie
            {filtered.length > 1 ? "s" : ""}
          </Text>

          {filtered.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor:
                    theme.colors.surface,
                  borderColor:
                    theme.colors.border,
                  borderRadius:
                    theme.shape.cardRadius,
                  borderWidth:
                    theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  {
                    color:
                      theme.colors.foreground,
                  },
                ]}
              >
                Aucune catégorie
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.colors
                        .foregroundMuted,
                  },
                ]}
              >
                Modifiez la recherche ou créez une catégorie.
              </Text>
            </View>
          ) : (
            filtered.map((category) => (
              <View
                key={category.id}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      theme.colors.surface,
                    borderColor:
                      theme.colors.border,
                    borderRadius:
                      theme.shape.cardRadius,
                    borderWidth:
                      theme.shape.borderWidth,
                  },
                ]}
              >
                <View style={styles.cardMain}>
                  <View
                    style={[
                      styles.orderBadge,
                      {
                        backgroundColor:
                          theme.colors.surfaceSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.orderText,
                        {
                          color:
                            theme.colors.accent,
                        },
                      ]}
                    >
                      {category.sortOrder ?? 0}
                    </Text>
                  </View>

                  <View style={styles.cardText}>
                    <Text
                      style={[
                        styles.categoryName,
                        {
                          color:
                            theme.colors
                              .foreground,
                        },
                      ]}
                    >
                      {category.name}
                    </Text>

                    <Text
                      style={[
                        styles.categoryMeta,
                        {
                          color:
                            theme.colors
                              .foregroundMuted,
                        },
                      ]}
                    >
                      {category.active === false
                        ? "Inactive"
                        : "Active"}
                    </Text>
                  </View>

                  <Switch
                    value={
                      category.active !== false
                    }
                    disabled={working}
                    onValueChange={() =>
                      void toggleActive(category)
                    }
                  />
                </View>

                <View style={styles.actions}>
                  <AppButton
                    title="Modifier"
                    variant="secondary"
                    disabled={working}
                    onPress={() =>
                      openEdit(category)
                    }
                    style={styles.actionButton}
                  />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={editorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!working) {
            setEditorOpen(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          {/* PATCH20_A3_MODAL_KEYBOARD_SAFE */}
          <KeyboardAvoidingView
            style={{ flex: 1, width: "100%" }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={16}
          >
            <ScrollView
              style={{ width: "100%" }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                paddingVertical: 12,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
            >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.colors.surfaceElevated,
                borderColor:
                  theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.colors.foreground,
                },
              ]}
            >
              {draft.id
                ? "Modifier la catégorie"
                : "Nouvelle catégorie"}
            </Text>

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              Nom
            </Text>

            <TextInput
              value={draft.name}
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  name: value,
                }))
              }
              placeholder="Ex. Cybersécurité"
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              style={[
                styles.input,
                {
                  color:
                    theme.colors.foreground,
                  backgroundColor:
                    theme.colors.background,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            />

            <Text
              style={[
                styles.label,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              Ordre
            </Text>

            <TextInput
              value={draft.sortOrder}
              onChangeText={(value) =>
                setDraft((current) => ({
                  ...current,
                  sortOrder: value,
                }))
              }
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              style={[
                styles.input,
                {
                  color:
                    theme.colors.foreground,
                  backgroundColor:
                    theme.colors.background,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            />

            <View
              style={[
                styles.activeRow,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            >
              <View style={styles.activeText}>
                <Text
                  style={[
                    styles.activeTitle,
                    {
                      color:
                        theme.colors.foreground,
                    },
                  ]}
                >
                  Catégorie active
                </Text>
                <Text
                  style={[
                    styles.activeHelp,
                    {
                      color:
                        theme.colors
                          .foregroundMuted,
                    },
                  ]}
                >
                  Visible dans les sélecteurs de création.
                </Text>
              </View>

              <Switch
                value={draft.active}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    active: value,
                  }))
                }
              />
            </View>

            <View style={styles.modalActions}>
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={working}
                onPress={() =>
                  setEditorOpen(false)
                }
              />

              <AppButton
                title={
                  working
                    ? "Enregistrement..."
                    : draft.id
                      ? "Enregistrer"
                      : "Créer"
                }
                loading={working}
                onPress={() => void save()}
              />
            </View>
          </View>
                    </ScrollView>
          </KeyboardAvoidingView></View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  page: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  infoText: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 13,
  },
  search: {
    flexGrow: 1,
    flexBasis: 260,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
  },
  newButton: {
    minWidth: 160,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  count: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
  },
  emptyCard: {
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  card: {
    padding: 15,
    marginBottom: 10,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  orderBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orderText: {
    fontSize: 14,
    fontWeight: "900",
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "900",
  },
  categoryMeta: {
    fontSize: 11,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    minWidth: 110,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 14,
  },
  activeRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  activeText: {
    flex: 1,
  },
  activeTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  activeHelp: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 3,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 18,
  },
});