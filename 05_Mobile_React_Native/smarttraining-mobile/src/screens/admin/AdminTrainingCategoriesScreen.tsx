import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  createAdminTrainingCategory,
  getAdminTrainingCategories,
  updateAdminTrainingCategory,
} from "../../features/admin/adminTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { MobileTrainingCategory } from "../../types/trainerAuthoringMobile";

type Draft = {
  id?: number;
  name: string;
  active: boolean;
  sortOrder: string;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 6;

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

function buildPagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}

export default function AdminTrainingCategoriesScreen() {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const listTopRef = useRef(0);
  const searchTopRef = useRef(0);
  const searchFocusedRef = useRef(false);
  const toggleInFlightRef = useRef<Set<number>>(new Set());

  const [items, setItems] = useState<MobileTrainingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [savingEditor, setSavingEditor] = useState(false);
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<number>>(
    () => new Set(),
  );

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  async function load() {
    const loaded = await getAdminTrainingCategories();
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getAdminTrainingCategories()
      .then((loaded) => {
        if (!active) {
          return;
        }

        setItems(loaded);
        setError("");
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

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    function keepSearchVisible() {
      if (!searchFocusedRef.current) {
        return;
      }

      scrollRef.current?.scrollTo({
        y: Math.max(0, searchTopRef.current - 150),
        animated: true,
      });
    }

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);

      setTimeout(keepSearchVisible, 80);
      setTimeout(keepSearchVisible, 260);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function refresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      await load();
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return [...items]
      .sort(
        (left, right) =>
          (left.sortOrder ?? left.id) - (right.sortOrder ?? right.id),
      )
      .filter((item) =>
        !normalized
          ? true
          : item.name.toLocaleLowerCase("fr").includes(normalized),
      );
  }, [items, query]);

  const activeCount = useMemo(
    () => items.filter((item) => item.active !== false).length,
    [items],
  );

  const inactiveCount = items.length - activeCount;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  function setCategoryPending(categoryId: number, pending: boolean) {
    setPendingToggleIds((current) => {
      const next = new Set(current);

      if (pending) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }

      return next;
    });
  }

  function updateQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    const normalizedPage = Math.min(Math.max(nextPage, 1), totalPages);

    if (normalizedPage === currentPage) {
      return;
    }

    setPage(normalizedPage);

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, listTopRef.current - 12),
        animated: true,
      });
    });
  }

  function openCreate() {
    const nextOrder =
      items.length === 0
        ? 0
        : Math.max(...items.map((item) => item.sortOrder ?? 0)) + 1;

    setDraft({
      name: "",
      active: true,
      sortOrder: String(nextOrder),
    });
    setEditorError("");
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  function openEdit(category: MobileTrainingCategory) {
    setDraft({
      id: category.id,
      name: category.name,
      active: category.active !== false,
      sortOrder: String(category.sortOrder ?? 0),
    });
    setEditorError("");
    setError("");
    setNotice("");
    setEditorOpen(true);
  }

  async function save() {
    if (savingEditor) {
      return;
    }

    const name = draft.name.trim();
    const sortOrder = Number(draft.sortOrder);

    if (!name) {
      setEditorError("Le nom de la catégorie est obligatoire.");
      return;
    }

    if (!Number.isInteger(sortOrder) || sortOrder < 0) {
      setEditorError("L’ordre doit être un entier positif ou nul.");
      return;
    }

    setSavingEditor(true);
    setEditorError("");
    setError("");
    setNotice("");

    try {
      const request = {
        name,
        active: draft.active,
        sortOrder,
      };

      if (draft.id !== undefined) {
        const updated = await updateAdminTrainingCategory(draft.id, request);

        setItems((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
        setNotice("Catégorie mise à jour.");
      } else {
        const created = await createAdminTrainingCategory(request);
        setItems((current) => [...current, created]);
        setNotice("Catégorie créée.");
      }

      setEditorOpen(false);
    } catch (caught) {
      setEditorError(errorText(caught));
    } finally {
      setSavingEditor(false);
    }
  }

  async function toggleActive(category: MobileTrainingCategory) {
    if (toggleInFlightRef.current.has(category.id)) {
      return;
    }

    const previousActive = category.active !== false;
    const nextActive = !previousActive;

    toggleInFlightRef.current.add(category.id);
    setCategoryPending(category.id, true);
    setError("");
    setNotice("");

    // Mise à jour optimiste UNIQUEMENT de la catégorie touchée.
    // On ne recharge pas toute la liste : cela évite l'effet où tous les
    // interrupteurs semblent se désactiver/réactiver en même temps.
    setItems((current) =>
      current.map((item) =>
        item.id === category.id ? { ...item, active: nextActive } : item,
      ),
    );

    try {
      const updated = await updateAdminTrainingCategory(category.id, {
        name: category.name,
        active: nextActive,
        sortOrder: category.sortOrder ?? 0,
      });

      setItems((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setNotice(
        nextActive ? "Catégorie activée." : "Catégorie désactivée.",
      );
    } catch (caught) {
      // En cas d'échec, on restaure uniquement la catégorie concernée.
      setItems((current) =>
        current.map((item) =>
          item.id === category.id ? { ...item, active: previousActive } : item,
        ),
      );
      setError(errorText(caught));
    } finally {
      toggleInFlightRef.current.delete(category.id);
      setCategoryPending(category.id, false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des catégories..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "android" && keyboardHeight > 0
                ? keyboardHeight + 24
                : 14,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          {/* HERO PREMIUM */}
          <View
            className="mb-3 mt-4 overflow-hidden rounded-[24px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.05,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <View className="h-1.5 w-full bg-[#7C3AED]" />

            <View className="relative overflow-hidden px-4 py-4">
              <View
                pointerEvents="none"
                className="absolute -right-9 -top-12 h-[138px] w-[138px] rounded-full bg-[#F3EEFF]"
              />
              <View
                pointerEvents="none"
                className="absolute right-9 top-12 h-11 w-11 rotate-12 rounded-[15px] bg-[#EAFBF3]"
              />

              <View className="flex-row items-start">
                <View className="h-[52px] w-[52px] items-center justify-center rounded-[17px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{ ios: "tag.fill", android: "sell", web: "sell" }}
                    tintColor="#7C3AED"
                    size={21}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1 pr-7">
                  <View className="self-start rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                      Référentiel pédagogique
                    </Text>
                  </View>

                  <Text
                    accessibilityRole="header"
                    className="mt-2 text-[26px] font-black leading-[30px] tracking-[-0.6px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Catégories de formation
                  </Text>

                  <Text
                    className="mt-1.5 max-w-[520px] text-[13px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Organisez le catalogue et contrôlez les catégories proposées
                    lors de la création des formations.
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row flex-wrap gap-2">
                <View className="flex-row items-center rounded-full bg-[#F8F5FA] px-2.5 py-1.5">
                  <View className="h-2 w-2 rounded-full bg-[#7C3AED]" />
                  <Text
                    className="ml-1.5 text-[10px] font-bold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Catalogue administrateur
                  </Text>
                </View>

                <View className="flex-row items-center rounded-full bg-[#EFFAF5] px-2.5 py-1.5">
                  <SymbolView
                    name={{
                      ios: "checkmark.seal.fill",
                      android: "verified",
                      web: "verified",
                    }}
                    tintColor="#16845A"
                    size={10}
                    weight="bold"
                  />
                  <Text className="ml-1.5 text-[10px] font-bold text-[#16845A]">
                    Référentiel contrôlé
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* KPI PREMIUM */}
          <View className="mb-3 flex-row justify-between">
            <MetricCard
              label="Total"
              helper="Catégories"
              value={items.length}
              color="#7C3AED"
              soft="#F3EEFF"
              icon={{ ios: "tag.fill", android: "sell", web: "sell" }}
            />

            <MetricCard
              label="Actives"
              helper="Disponibles"
              value={activeCount}
              color="#16845A"
              soft="#EAFBF3"
              icon={{
                ios: "checkmark.circle.fill",
                android: "check_circle",
                web: "check_circle",
              }}
            />

            <MetricCard
              label="Inactives"
              helper="Masquées"
              value={inactiveCount}
              color="#B45309"
              soft="#FFF4E5"
              icon={{
                ios: "pause.circle.fill",
                android: "pause_circle",
                web: "pause_circle",
              }}
            />
          </View>

          {/* INFORMATION */}
          <View
            className="mb-3 flex-row items-start rounded-[18px] border bg-[#F8F4FF] px-3 py-3"
            style={{ borderColor: "#E9DDFC" }}
          >
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-[#E9DEFB]">
              <SymbolView
                name={{ ios: "info.circle.fill", android: "info", web: "info" }}
                tintColor="#7C3AED"
                size={15}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                className="text-[12px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Fonctionnement du référentiel
              </Text>
              <Text
                className="mt-1 text-[11px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Une catégorie désactivée n’est plus proposée pour les nouvelles
                formations. Elle reste néanmoins conservée dans le référentiel.
              </Text>
            </View>
          </View>

          {/* RECHERCHE */}
          <View
            className="mb-2 flex-row items-center rounded-[16px] border bg-white px-3"
            style={{ borderColor: "#E5DFE8" }}
            onLayout={(event) => {
              searchTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <SymbolView
              name={{ ios: "magnifyingglass", android: "search", web: "search" }}
              tintColor={theme.colors.foregroundSubtle}
              size={17}
            />

            <TextInput
              accessibilityLabel="Rechercher une catégorie"
              value={query}
              onChangeText={updateQuery}
              onFocus={() => {
                searchFocusedRef.current = true;

                setTimeout(() => {
                  scrollRef.current?.scrollTo({
                    y: Math.max(0, searchTopRef.current - 150),
                    animated: true,
                  });
                }, 50);
              }}
              onBlur={() => {
                searchFocusedRef.current = false;
              }}
              placeholder="Rechercher une catégorie..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              className="ml-2 min-h-[48px] min-w-0 flex-1 text-[14px]"
              style={{ color: theme.colors.foreground }}
            />

            {query.trim() ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => updateQuery("")}
                android_ripple={{ color: "transparent" }}
                className="h-8 w-8 items-center justify-center rounded-full"
              >
                <SymbolView
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={15}
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Créer une nouvelle catégorie"
            onPress={openCreate}
            android_ripple={{ color: "transparent" }}
            className="mb-4 min-h-[46px] flex-row items-center justify-center rounded-[15px] bg-[#7C3AED] px-4"
            style={{
              shadowColor: "#7C3AED",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.12,
              shadowRadius: 7,
              elevation: 2,
            }}
          >
            <SymbolView
              name={{ ios: "plus.circle.fill", android: "add_circle", web: "add_circle" }}
              tintColor="#FFFFFF"
              size={16}
              weight="bold"
            />
            <Text className="ml-2 text-[12px] font-black text-white">
              Nouvelle catégorie
            </Text>
          </Pressable>

          {error ? (
            <View className="mb-3">
              <ErrorMessage message={error} onRetry={() => void refresh()} />
            </View>
          ) : null}

          {notice ? (
            <View
              className="mb-3 flex-row items-center rounded-[15px] border bg-[#EAFBF3] px-3 py-2.5"
              style={{ borderColor: "#CFEBDD" }}
            >
              <SymbolView
                name={{
                  ios: "checkmark.circle.fill",
                  android: "check_circle",
                  web: "check_circle",
                }}
                tintColor="#16845A"
                size={15}
                weight="bold"
              />
              <Text
                className="ml-2 min-w-0 flex-1 text-[11px] font-bold"
                style={{ color: theme.colors.foreground }}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          {/* TITRE DE LISTE PREMIUM */}
          <View
            className="mb-3 overflow-hidden rounded-[20px] border bg-white"
            style={{
              borderColor: "#E5DFE8",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.035,
              shadowRadius: 7,
              elevation: 1,
            }}
            onLayout={(event) => {
              listTopRef.current = event.nativeEvent.layout.y;
            }}
          >
            <View className="h-1 bg-[#7C3AED]" />

            <View className="flex-row items-center px-3.5 py-3.5">
              <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F1E9FF]">
                <SymbolView
                  name={{
                    ios: "square.grid.2x2.fill",
                    android: "grid_view",
                    web: "grid_view",
                  }}
                  tintColor="#7C3AED"
                  size={16}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[10px] font-black uppercase tracking-[0.65px] text-[#7C3AED]">
                  Catalogue
                </Text>
                <Text
                  className="mt-0.5 text-[20px] font-black tracking-[-0.3px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Référentiel des catégories
                </Text>
                <Text
                  className="mt-1 text-[12px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Activez, désactivez ou modifiez chaque catégorie indépendamment.
                </Text>
              </View>

              <View className="ml-2 rounded-full bg-[#F3EEFF] px-2.5 py-1.5">
                <Text className="text-[10px] font-black text-[#7C3AED]">
                  {filtered.length}
                </Text>
              </View>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View
              className="items-center rounded-[22px] border bg-white px-5 py-8"
              style={{ borderColor: "#E5DFE8" }}
            >
              <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-[#F1E9FF]">
                <SymbolView
                  name={{ ios: "tag.slash.fill", android: "label_off", web: "label_off" }}
                  tintColor="#7C3AED"
                  size={22}
                  weight="bold"
                />
              </View>
              <Text
                className="mt-4 text-[16px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucune catégorie
              </Text>
              <Text
                className="mt-1.5 text-center text-[12px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Modifiez votre recherche ou créez une nouvelle catégorie.
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-2">
                {paginatedItems.map((category) => (
                  <CategoryCard key={category.id} category={category} />
                ))}
              </View>

              {totalPages > 1 ? (
                <View
                  className="mb-4 mt-4 rounded-[20px] border bg-white px-3 py-3"
                  style={{ borderColor: "#E5DFE8" }}
                >
                  <View className="mb-3 flex-row items-center justify-between">
                    <Text
                      className="text-[11px] font-bold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {filtered.length} catégorie{filtered.length > 1 ? "s" : ""}
                    </Text>

                    <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                      <Text className="text-[10px] font-black text-[#7C3AED]">
                        Page {currentPage} / {totalPages}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-center gap-1.5">
                    <PaginationArrow
                      direction="previous"
                      disabled={currentPage === 1}
                      onPress={() => changePage(currentPage - 1)}
                    />

                    {paginationItems.map((item, index) => {
                      if (item === "ellipsis") {
                        return (
                          <View
                            key={`ellipsis-${index}`}
                            className="h-9 w-6 items-center justify-center"
                          >
                            <Text
                              className="text-[14px] font-bold"
                              style={{ color: theme.colors.foregroundSubtle }}
                            >
                              …
                            </Text>
                          </View>
                        );
                      }

                      const selected = item === currentPage;

                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityLabel={`Page ${item}`}
                          accessibilityState={{ selected }}
                          onPress={() => changePage(item)}
                          android_ripple={{ color: "transparent" }}
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          style={{
                            backgroundColor: selected
                              ? theme.colors.accent
                              : theme.colors.surface,
                            borderColor: selected
                              ? theme.colors.accent
                              : theme.colors.border,
                          }}
                        >
                          <Text
                            className="text-[12px] font-black"
                            style={{
                              color: selected
                                ? theme.colors.accentForeground
                                : theme.colors.foregroundMuted,
                            }}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}

                    <PaginationArrow
                      direction="next"
                      disabled={currentPage === totalPages}
                      onPress={() => changePage(currentPage + 1)}
                    />
                  </View>
                </View>
              ) : null}
            </>
          )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* MODAL CRÉATION / MODIFICATION */}
      <Modal
        visible={editorOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!savingEditor) {
            setEditorOpen(false);
          }
        }}
      >
        <View className="flex-1 bg-black/50 px-4">
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={16}
          >
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: "center",
                paddingVertical: 18,
              }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
            >
              <View
                className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[24px] border bg-white"
                style={{
                  borderColor: "#E5DFE8",
                  shadowColor: "#000000",
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.16,
                  shadowRadius: 18,
                  elevation: 8,
                }}
              >
                <View className="h-1.5 bg-[#7C3AED]" />

                <View className="p-4">
                  <View className="flex-row items-start">
                    <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
                      <SymbolView
                        name={{
                          ios: draft.id !== undefined ? "pencil.circle.fill" : "plus.circle.fill",
                          android: draft.id !== undefined ? "edit" : "add_circle",
                          web: draft.id !== undefined ? "edit" : "add_circle",
                        }}
                        tintColor="#7C3AED"
                        size={19}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-[18px] font-black tracking-[-0.3px]"
                        style={{ color: theme.colors.foreground }}
                      >
                        {draft.id !== undefined
                          ? "Modifier la catégorie"
                          : "Nouvelle catégorie"}
                      </Text>
                      <Text
                        className="mt-1 text-[11px] leading-[16px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Renseignez les informations du référentiel puis enregistrez.
                      </Text>
                    </View>
                  </View>

                  {editorError ? (
                    <View className="mt-3">
                      <ErrorMessage
                        message={editorError}
                        onRetry={() => setEditorError("")}
                      />
                    </View>
                  ) : null}

                  <Text
                    className="mb-1.5 mt-4 text-[10px] font-black uppercase tracking-[0.55px]"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    Nom de la catégorie
                  </Text>

                  <View
                    className="flex-row items-center rounded-[15px] border bg-[#FCFBFD] px-3"
                    style={{ borderColor: "#E5DFE8" }}
                  >
                    <SymbolView
                      name={{ ios: "tag.fill", android: "sell", web: "sell" }}
                      tintColor="#7C3AED"
                      size={14}
                    />
                    <TextInput
                      value={draft.name}
                      onChangeText={(value) =>
                        setDraft((current) => ({ ...current, name: value }))
                      }
                      placeholder="Ex. Cybersécurité"
                      placeholderTextColor={theme.colors.foregroundSubtle}
                      className="ml-2 min-h-[48px] min-w-0 flex-1 text-[13px]"
                      style={{ color: theme.colors.foreground }}
                    />
                  </View>

                  <Text
                    className="mb-1.5 mt-3 text-[10px] font-black uppercase tracking-[0.55px]"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    Ordre d’affichage
                  </Text>

                  <View
                    className="flex-row items-center rounded-[15px] border bg-[#FCFBFD] px-3"
                    style={{ borderColor: "#E5DFE8" }}
                  >
                    <SymbolView
                      name={{
                        ios: "arrow.up.arrow.down.circle.fill",
                        android: "swap_vert",
                        web: "swap_vert",
                      }}
                      tintColor="#7C3AED"
                      size={15}
                    />
                    <TextInput
                      value={draft.sortOrder}
                      onChangeText={(value) =>
                        setDraft((current) => ({ ...current, sortOrder: value }))
                      }
                      keyboardType="number-pad"
                      placeholder="0"
                      placeholderTextColor={theme.colors.foregroundSubtle}
                      className="ml-2 min-h-[48px] min-w-0 flex-1 text-[13px]"
                      style={{ color: theme.colors.foreground }}
                    />
                  </View>

                  <View className="mt-2 flex-row items-start">
                    <SymbolView
                      name={{
                        ios: "info.circle",
                        android: "info",
                        web: "info",
                      }}
                      tintColor={theme.colors.foregroundSubtle}
                      size={11}
                    />
                    <Text
                      className="ml-1.5 min-w-0 flex-1 text-[10px] leading-[14px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      L’ordre détermine la position dans les listes : plus le nombre est petit,
                      plus la catégorie apparaît tôt. Les écarts sont autorisés.
                    </Text>
                  </View>

                  <View
                    className="mt-3 flex-row items-center rounded-[16px] border px-3 py-3"
                    style={{
                      backgroundColor: draft.active ? "#F0FBF6" : "#FFF8EE",
                      borderColor: draft.active ? "#CFEBDD" : "#F3DFC0",
                    }}
                  >
                    <View
                      className="h-9 w-9 items-center justify-center rounded-[11px]"
                      style={{
                        backgroundColor: draft.active ? "#E1F7EC" : "#FFF0D9",
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: draft.active
                            ? "checkmark.circle.fill"
                            : "pause.circle.fill",
                          android: draft.active ? "check_circle" : "pause_circle",
                          web: draft.active ? "check_circle" : "pause_circle",
                        }}
                        tintColor={draft.active ? "#16845A" : "#B45309"}
                        size={16}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-2.5 min-w-0 flex-1">
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Catégorie {draft.active ? "active" : "inactive"}
                      </Text>
                      <Text
                        className="mt-0.5 text-[10px] leading-[14px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {draft.active
                          ? "Disponible dans les sélecteurs de création."
                          : "Masquée pour les nouvelles formations."}
                      </Text>
                    </View>

                    <Switch
                      value={draft.active}
                      onValueChange={(value) =>
                        setDraft((current) => ({ ...current, active: value }))
                      }
                      trackColor={{ false: "#E7D7BF", true: "#BFE8D4" }}
                      thumbColor={draft.active ? "#16845A" : "#B45309"}
                      ios_backgroundColor="#E7D7BF"
                    />
                  </View>

                  <View className="mt-4 flex-row gap-2">
                    <Pressable
                      accessibilityRole="button"
                      disabled={savingEditor}
                      onPress={() => setEditorOpen(false)}
                      android_ripple={{ color: "transparent" }}
                      className="min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-[14px] border bg-white px-3"
                      style={{
                        borderColor: "#E5DFE8",
                        opacity: savingEditor ? 0.55 : 1,
                      }}
                    >
                      <Text
                        className="text-[11px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Annuler
                      </Text>
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={savingEditor}
                      onPress={() => void save()}
                      android_ripple={{ color: "transparent" }}
                      className="min-h-[44px] min-w-0 flex-1 flex-row items-center justify-center rounded-[14px] bg-[#7C3AED] px-3"
                      style={{ opacity: savingEditor ? 0.65 : 1 }}
                    >
                      <SymbolView
                        name={{
                          ios: "checkmark.circle.fill",
                          android: "check_circle",
                          web: "check_circle",
                        }}
                        tintColor="#FFFFFF"
                        size={14}
                        weight="bold"
                      />
                      <Text className="ml-1.5 text-[11px] font-black text-white">
                        {savingEditor
                          ? "Enregistrement..."
                          : draft.id !== undefined
                            ? "Enregistrer"
                            : "Créer"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenContainer>
  );

  function MetricCard({
    label,
    helper,
    value,
    color,
    soft,
    icon,
  }: {
    label: string;
    helper: string;
    value: number;
    color: string;
    soft: string;
    icon: SymbolName;
  }) {
    return (
      <View
        className="relative w-[31.7%] overflow-hidden rounded-[20px] border bg-white px-3 py-3"
        style={{
          minHeight: 112,
          borderColor: "#E5DFE8",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.035,
          shadowRadius: 7,
          elevation: 1,
        }}
      >
        <View
          pointerEvents="none"
          className="absolute -right-5 -top-5 h-16 w-16 rounded-full"
          style={{ backgroundColor: soft, opacity: 0.85 }}
        />

        <View className="flex-row items-center justify-between">
          <View
            className="h-9 w-9 items-center justify-center rounded-[12px]"
            style={{ backgroundColor: soft }}
          >
            <SymbolView name={icon} tintColor={color} size={15} weight="bold" />
          </View>
          <Text
            className="ml-1 text-[22px] font-black leading-[26px] tracking-[-0.5px]"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          className="mt-2.5 text-[11px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {label}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-0.5 text-[9px] font-semibold"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {helper}
        </Text>

        <View
          className="mt-2.5 h-1 w-8 rounded-full"
          style={{ backgroundColor: color }}
        />
      </View>
    );
  }

  function CategoryCard({ category }: { category: MobileTrainingCategory }) {
    const active = category.active !== false;
    const pending = pendingToggleIds.has(category.id);

    const tone = active
      ? {
          color: "#16845A",
          soft: "#EAFBF3",
        }
      : {
          color: "#B45309",
          soft: "#FFF4E5",
        };

    return (
      <View
        className="relative overflow-hidden rounded-[16px] border bg-white"
        style={{
          borderColor: pending ? tone.color : "#E5DFE8",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.025,
          shadowRadius: 4,
          elevation: 1,
        }}
      >
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 top-0 w-1"
          style={{ backgroundColor: tone.color }}
        />

        <View className="flex-row items-center py-2.5 pl-3 pr-2.5">
          <View
            className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
            style={{ backgroundColor: tone.soft }}
          >
            <SymbolView
              name={{
                ios: "tag.fill",
                android: "sell",
                web: "sell",
              }}
              tintColor={tone.color}
              size={14}
              weight="bold"
            />
          </View>

          <View className="ml-2.5 min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="text-[13px] font-black leading-[16px]"
              style={{ color: theme.colors.foreground }}
            >
              {category.name}
            </Text>

            <View className="mt-1 flex-row items-center">
              <View
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: tone.color }}
              />
              <Text
                className="ml-1 text-[9px] font-black"
                style={{ color: tone.color }}
              >
                {pending ? "Mise à jour..." : active ? "Active" : "Inactive"}
              </Text>

              <Text
                className="mx-1.5 text-[9px]"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                •
              </Text>

              <SymbolView
                name={{
                  ios: "arrow.up.arrow.down",
                  android: "swap_vert",
                  web: "swap_vert",
                }}
                tintColor={theme.colors.foregroundSubtle}
                size={9}
                weight="bold"
              />
              <Text
                className="ml-1 text-[9px] font-bold"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Position {category.sortOrder ?? 0}
              </Text>
            </View>
          </View>

          <View className="ml-2 flex-row items-center">
            <Switch
              accessibilityLabel={`${active ? "Désactiver" : "Activer"} ${category.name}`}
              value={active}
              disabled={pending}
              onValueChange={() => void toggleActive(category)}
              trackColor={{ false: "#E7D7BF", true: "#BFE8D4" }}
              thumbColor={active ? "#16845A" : "#B45309"}
              ios_backgroundColor="#E7D7BF"
              style={{ transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] }}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Modifier ${category.name}`}
              disabled={pending || savingEditor}
              onPress={() => openEdit(category)}
              android_ripple={{ color: "transparent" }}
              className="ml-1 h-8 w-8 items-center justify-center rounded-[10px] bg-[#F3EEFF]"
              style={{ opacity: pending || savingEditor ? 0.5 : 1 }}
            >
              <SymbolView
                name={{
                  ios: "pencil",
                  android: "edit",
                  web: "edit",
                }}
                tintColor="#7C3AED"
                size={11}
                weight="bold"
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction: "previous" | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const previous = direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previous ? "Page précédente" : "Page suivante"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-9 w-9 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: disabled ? "#F8F6F3" : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.42 : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous ? "chevron.left" : "chevron.right",
            android: previous ? "chevron_left" : "chevron_right",
            web: previous ? "chevron_left" : "chevron_right",
          }}
          tintColor={
            disabled ? theme.colors.foregroundSubtle : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}
