import { SymbolView } from "expo-symbols";
import {
  Href,
  router,
} from "expo-router";
import {
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
} from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { AppEmptyState } from "../../components/ux/AppStates";
import { TrainingCover } from "../../components/ux/RichPrimitives";
import {
  ADMIN_TRAINING_FILTER_STATUSES,
  AdminTrainingLifecycleTarget,
  getAdminFullTraining,
  getAdminTrainings,
  updateAdminTrainingLifecycle,
} from "../../features/admin/adminTrainingService";
import {
  getAdminUsers,
} from "../../features/admin/adminUserService";
import { buildLearnerMediaUrl } from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  AdminTrainingStatus,
  AdminTrainingSummary,
  AdminUserSummary,
} from "../../types/admin";

type StatusFilter =
  | "ALL"
  | AdminTrainingStatus;

type PendingLifecycle = {
  training: AdminTrainingSummary;
  target: AdminTrainingLifecycleTarget;
};

type AdminTrainingVisual = {
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
};

type PaginationItem = number | "ellipsis";
type SymbolName = ComponentProps<typeof SymbolView>["name"];

const PAGE_SIZE = 4;

async function loadAdminTrainingData(): Promise<{
  trainings: AdminTrainingSummary[];
  users: AdminUserSummary[];
  visuals: Record<number, AdminTrainingVisual>;
}> {
  const [trainings, users] = await Promise.all([
    getAdminTrainings(),
    getAdminUsers(),
  ]);

  const visuals: Record<number, AdminTrainingVisual> = {};

  for (let index = 0; index < trainings.length; index += 8) {
    const batch = trainings.slice(index, index + 8);
    const details = await Promise.allSettled(
      batch.map((training) =>
        getAdminFullTraining(training.id),
      ),
    );

    details.forEach((result, batchIndex) => {
      const training = batch[batchIndex];

      if (!training || result.status !== "fulfilled") {
        return;
      }

      visuals[training.id] = {
        coverImageUrl: result.value.coverImageUrl,
        coverImagePath: result.value.coverImagePath,
      };
    });
  }

  return { trainings, users, visuals };
}

function statusLabel(status: string) {
  if (status === "DRAFT") return "Brouillon";
  if (status === "PUBLISHED") return "Publiée";
  if (status === "ARCHIVED") return "Archivée";
  if (status === "INACTIVE") return "Inactive";
  return status;
}

function userLabel(
  user?: AdminUserSummary,
): string {
  if (!user) return "Formateur non résolu";

  const name =
    user.fullName?.trim() ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name
    ? `${name} — ${user.email}`
    : user.email;
}

function buildPagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [
      1,
      "ellipsis",
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage,
    "ellipsis",
    totalPages,
  ];
}

function statusTone(status: string) {
  if (status === "PUBLISHED") {
    return {
      background: "#EAFBF3",
      foreground: "#16845A",
      accent: "#10B981",
    };
  }

  if (status === "DRAFT") {
    return {
      background: "#F3EEFF",
      foreground: "#7C3AED",
      accent: "#8B5CF6",
    };
  }

  if (status === "ARCHIVED") {
    return {
      background: "#F2F4F7",
      foreground: "#667085",
      accent: "#98A2B3",
    };
  }

  return {
    background: "#FFF4E5",
    foreground: "#B45309",
    accent: "#F59E0B",
  };
}

export default function AdminTrainingsScreen() {
  const { theme } = useSmartTrainingTheme();

  const [items, setItems] =
    useState<AdminTrainingSummary[]>([]);
  const [users, setUsers] =
    useState<AdminUserSummary[]>([]);
  const [visualById, setVisualById] =
    useState<Record<number, AdminTrainingVisual>>({});
  const [loading, setLoading] =
    useState(true);
  const [working, setWorking] =
    useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<StatusFilter>("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] =
    useState<PendingLifecycle | null>(null);
  const [expandedTrainingId, setExpandedTrainingId] =
    useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  async function load() {
    const loaded = await loadAdminTrainingData();
    setItems(loaded.trainings);
    setUsers(loaded.users);
    setVisualById(loaded.visuals);
  }

  useEffect(() => {
    let active = true;

    void loadAdminTrainingData()
      .then((loaded) => {
        if (!active) return;

        setItems(loaded.trainings);
        setUsers(loaded.users);
        setVisualById(loaded.visuals);
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger le catalogue administrateur.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const userById = useMemo(
    () =>
      new Map(
        users.map((user) => [
          user.id,
          user,
        ]),
      ),
    [users],
  );

  const stats = useMemo(
    () => ({
      total: items.length,
      published: items.filter(
        (item) => item.status === "PUBLISHED",
      ).length,
      drafts: items.filter(
        (item) => item.status === "DRAFT",
      ).length,
      archived: items.filter(
        (item) => item.status === "ARCHIVED",
      ).length,
    }),
    [items],
  );

  const normalizedQuery =
    query.trim().toLowerCase();

  function matchesQuery(
    item: AdminTrainingSummary,
  ): boolean {
    if (!normalizedQuery) return true;

    const trainer =
      item.trainerId
        ? userById.get(item.trainerId)
        : undefined;

    return [
      item.title,
      item.shortDescription || "",
      item.category || "",
      item.level || "",
      statusLabel(item.status),
      trainer ? userLabel(trainer) : "",
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  }

  const searchBase = useMemo(
    () =>
      items.filter((item) =>
        matchesQuery(item),
      ),
    [items, normalizedQuery, userById],
  );

  const statusCounts = useMemo(
    () => {
      const counts: Record<string, number> = {
        ALL: searchBase.length,
      };

      ADMIN_TRAINING_FILTER_STATUSES.forEach(
        (value) => {
          counts[value] = searchBase.filter(
            (item) => item.status === value,
          ).length;
        },
      );

      return counts;
    },
    [searchBase],
  );

  const filtered = useMemo(
    () =>
      searchBase.filter((item) => {
        if (
          status !== "ALL" &&
          item.status !== status
        ) {
          return false;
        }

        return true;
      }),
    [searchBase, status],
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE),
  );

  const paginationItems = useMemo(
    () =>
      buildPagination(
        currentPage,
        totalPages,
      ),
    [currentPage, totalPages],
  );

  const visibleItems = useMemo(
    () =>
      filtered.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE,
      ),
    [currentPage, filtered],
  );

  useEffect(() => {
    setCurrentPage(1);
    setExpandedTrainingId(null);
  }, [query, status]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function confirmLifecycle() {
    if (!pending || working) return;

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const updated =
        await updateAdminTrainingLifecycle(
          pending.training.id,
          pending.target,
        );

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      setNotice(
        `Formation « ${updated.title} » : ${statusLabel(
          updated.status,
        )}.`,
      );

      setPending(null);
    } catch {
      setError(
        "Le changement de statut n’a pas pu être enregistré.",
      );
    } finally {
      setWorking(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatus("ALL");
  }

  function changePage(page: number) {
    setCurrentPage(
      Math.min(
        Math.max(page, 1),
        totalPages,
      ),
    );
    setExpandedTrainingId(null);
  }

  if (loading) {
    return (
      <LoadingState message="Chargement des formations..." />
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right"]}
      style={{ paddingBottom: 0 }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : "height"
        }
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-1"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[980px]">
            <View
              className="mb-4 overflow-hidden rounded-[22px] border bg-white"
              style={{
                borderColor: theme.colors.border,
              }}
            >
              <View className="h-1 bg-[#7C3AED]" />

              <View className="p-4">
                <View className="flex-row items-start">
                  <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "rectangle.stack.fill",
                        android: "library_books",
                        web: "library_books",
                      }}
                      tintColor="#7C3AED"
                      size={20}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.9px] text-[#7C3AED]">
                      Catalogue admin
                    </Text>

                    <Text
                      className="mt-1 text-[23px] font-black leading-[28px]"
                      style={{
                        color:
                          theme.colors.foreground,
                      }}
                    >
                      Formations
                    </Text>

                    <Text
                      className="mt-1.5 text-[11px] leading-[17px]"
                      style={{
                        color:
                          theme.colors
                            .foregroundMuted,
                      }}
                    >
                      Créez, organisez et pilotez le catalogue depuis le mobile.
                    </Text>
                  </View>
                </View>

                <View className="mt-3 flex-row gap-2">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Nouvelle formation"
                    onPress={() =>
                      router.push(
                        "/admin/training-new" as Href,
                      )
                    }
                    android_ripple={{
                      color: "transparent",
                    }}
                    className="h-[46px] min-w-0 flex-1 flex-row items-center justify-center rounded-[13px] bg-[#7C3AED] px-3"
                  >
                    <SymbolView
                      name={{
                        ios: "plus",
                        android: "add",
                        web: "add",
                      }}
                      tintColor="#FFFFFF"
                      size={13}
                      weight="bold"
                    />
                    <Text className="ml-2 text-[10px] font-black text-white">
                      Nouvelle formation
                    </Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Catégories"
                    onPress={() =>
                      router.push(
                        "/admin/training-categories" as Href,
                      )
                    }
                    android_ripple={{
                      color: "transparent",
                    }}
                    className="h-[46px] min-w-[110px] flex-row items-center justify-center rounded-[13px] border bg-white px-3"
                    style={{
                      borderColor:
                        theme.colors.border,
                    }}
                  >
                    <SymbolView
                      name={{
                        ios: "tag.fill",
                        android: "category",
                        web: "category",
                      }}
                      tintColor="#7C3AED"
                      size={12}
                      weight="bold"
                    />
                    <Text
                      className="ml-2 text-[10px] font-black"
                      style={{
                        color:
                          theme.colors
                            .foreground,
                      }}
                    >
                      Catégories
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="mb-4 gap-2.5">
              <View className="flex-row gap-2.5">
                <MetricCard
                  label="Total"
                  value={stats.total}
                  icon={{
                    ios: "rectangle.stack.fill",
                    android: "library_books",
                    web: "library_books",
                  }}
                  background="#F3EEFF"
                  foreground="#7C3AED"
                  accent="#7C3AED"
                />

                <MetricCard
                  label="Publiées"
                  value={stats.published}
                  icon={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  background="#EAFBF3"
                  foreground="#16845A"
                  accent="#10B981"
                />
              </View>

              <View className="flex-row gap-2.5">
                <MetricCard
                  label="Brouillons"
                  value={stats.drafts}
                  icon={{
                    ios: "pencil.circle.fill",
                    android: "edit_note",
                    web: "edit_note",
                  }}
                  background="#F3EEFF"
                  foreground="#7C3AED"
                  accent="#8B5CF6"
                />

                <MetricCard
                  label="Archivées"
                  value={stats.archived}
                  icon={{
                    ios: "archivebox.fill",
                    android: "inventory_2",
                    web: "inventory_2",
                  }}
                  background="#F2F4F7"
                  foreground="#667085"
                  accent="#98A2B3"
                />
              </View>
            </View>

            <View
              className="mb-4 rounded-[22px] border bg-white p-4"
              style={{
                borderColor: theme.colors.border,
              }}
            >
              <View className="mb-2.5 flex-row items-end justify-between">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[17px] font-black"
                    style={{
                      color:
                        theme.colors.foreground,
                    }}
                  >
                    Rechercher et filtrer
                  </Text>

                  <Text
                    className="mt-1 text-[10px]"
                    style={{
                      color:
                        theme.colors
                          .foregroundMuted,
                    }}
                  >
                    Formation, catégorie, niveau ou formateur
                  </Text>
                </View>

                {query.trim() ||
                status !== "ALL" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Réinitialiser les filtres"
                    onPress={resetFilters}
                    className="rounded-full bg-[#F3EEFF] px-2.5 py-1.5"
                  >
                    <Text className="text-[8px] font-black text-[#7C3AED]">
                      Réinitialiser
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View
                className="flex-row items-center rounded-[14px] border bg-[#FCFBFD] px-3"
                style={{
                  borderColor:
                    theme.colors.border,
                }}
              >
                <SymbolView
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  tintColor={
                    theme.colors
                      .foregroundSubtle
                  }
                  size={15}
                />

                <TextInput
                  accessibilityLabel="Rechercher une formation"
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Rechercher une formation ou un formateur..."
                  placeholderTextColor={
                    theme.colors
                      .foregroundSubtle
                  }
                  className="ml-2 h-[50px] min-w-0 flex-1 text-[13px]"
                  style={{
                    color:
                      theme.colors.foreground,
                  }}
                />
              </View>

              <View className="mt-3">
                <Text
                  className="text-[12px] font-black"
                  style={{
                    color:
                      theme.colors.foreground,
                  }}
                >
                  Statut
                </Text>

                <Text
                  className="mt-0.5 text-[9px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Filtrer le catalogue
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="mt-2"
                  contentContainerStyle={{
                    gap: 7,
                    paddingRight: 4,
                  }}
                >
                  <FilterChip
                    label="Toutes"
                    count={
                      statusCounts.ALL ?? 0
                    }
                    selected={
                      status === "ALL"
                    }
                    onPress={() =>
                      setStatus("ALL")
                    }
                  />

                  {ADMIN_TRAINING_FILTER_STATUSES.map(
                    (value) => (
                      <FilterChip
                        key={value}
                        label={statusLabel(
                          value,
                        )}
                        count={
                          statusCounts[
                            value
                          ] ?? 0
                        }
                        selected={
                          status === value
                        }
                        onPress={() =>
                          setStatus(value)
                        }
                      />
                    ),
                  )}
                </ScrollView>
              </View>
            </View>

            {error ? (
              <AlertCard
                kind="error"
                title="Catalogue indisponible"
                message={error}
                actionLabel="Réessayer"
                onAction={() => {
                  setError("");
                  void load().catch(() =>
                    setError(
                      "Impossible d’actualiser le catalogue.",
                    ),
                  );
                }}
              />
            ) : null}

            {notice ? (
              <AlertCard
                kind="success"
                title="Formation mise à jour"
                message={notice}
              />
            ) : null}

            <View className="mb-2.5 flex-row items-end justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{
                    color:
                      theme.colors.foreground,
                  }}
                >
                  Catalogue
                </Text>

                <Text
                  className="mt-1 text-[10px]"
                  style={{
                    color:
                      theme.colors
                        .foregroundMuted,
                  }}
                >
                  Ouvrez une formation pour afficher ses actions.
                </Text>
              </View>

              <View className="rounded-full bg-[#F3EEFF] px-3 py-1.5">
                <Text className="text-[9px] font-black text-[#7C3AED]">
                  {filtered.length} formation
                  {filtered.length > 1
                    ? "s"
                    : ""}
                </Text>
              </View>
            </View>

            {filtered.length === 0 ? (
              <AppEmptyState
                title={
                  items.length === 0
                    ? "Aucune formation"
                    : "Aucun résultat"
                }
                description={
                  items.length === 0
                    ? "Créez une première formation pour commencer à piloter le catalogue."
                    : "Aucune formation ne correspond à votre recherche ou aux filtres sélectionnés."
                }
                actionLabel={
                  items.length === 0
                    ? "Créer une formation"
                    : "Réinitialiser les filtres"
                }
                onAction={() => {
                  if (items.length === 0) {
                    router.push(
                      "/admin/training-new" as Href,
                    );
                    return;
                  }

                  resetFilters();
                }}
              />
            ) : (
              <View className="gap-3">
                {visibleItems.map((item) => {
                  const trainer =
                    item.trainerId
                      ? userById.get(
                          item.trainerId,
                        )
                      : undefined;
                  const expanded =
                    expandedTrainingId ===
                    item.id;
                  const tone =
                    statusTone(
                      item.status,
                    );

                  return (
                    <View
                      key={item.id}
                      className="overflow-hidden rounded-[20px] border bg-white"
                      style={{
                        borderColor:
                          theme.colors.border,
                      }}
                    >
                      <View className="h-[132px] overflow-hidden">
                        <TrainingCover
                          title={item.title}
                          coverUrl={buildLearnerMediaUrl(
                            visualById[item.id]
                              ?.coverImageUrl ||
                              visualById[item.id]
                                ?.coverImagePath,
                          )}
                        />
                      </View>

                      <View className="p-3.5">
                        <View className="flex-row items-center">
                          <View
                            className="rounded-full px-2.5 py-1"
                            style={{
                              backgroundColor:
                                tone.background,
                            }}
                          >
                            <Text
                              className="text-[8px] font-black uppercase"
                              style={{
                                color:
                                  tone.foreground,
                              }}
                            >
                              {statusLabel(
                                item.status,
                              )}
                            </Text>
                          </View>

                          <Text
                            numberOfLines={1}
                            className="ml-2 min-w-0 flex-1 text-[9px] font-bold"
                            style={{
                              color:
                                theme.colors
                                  .foregroundSubtle,
                            }}
                          >
                            {item.category ||
                              "Sans catégorie"}
                          </Text>
                        </View>

                        <Text
                          numberOfLines={2}
                          className="mt-2 text-[15px] font-black leading-[20px]"
                          style={{
                            color:
                              theme.colors
                                .foreground,
                          }}
                        >
                          {item.title}
                        </Text>

                        <View className="mt-1.5 flex-row items-start">
                          <SymbolView
                            name={{
                              ios: "person.fill",
                              android: "person",
                              web: "person",
                            }}
                            tintColor={
                              theme.colors
                                .foregroundSubtle
                            }
                            size={10}
                          />

                          <Text
                            numberOfLines={1}
                            className="ml-1.5 min-w-0 flex-1 text-[9px]"
                            style={{
                              color:
                                theme.colors
                                  .foregroundMuted,
                            }}
                          >
                            {userLabel(
                              trainer,
                            )}
                          </Text>
                        </View>

                        {item.shortDescription ? (
                          <Text
                            numberOfLines={2}
                            className="mt-2 text-[10px] leading-[15px]"
                            style={{
                              color:
                                theme.colors
                                  .foregroundMuted,
                            }}
                          >
                            {
                              item.shortDescription
                            }
                          </Text>
                        ) : null}

                        <View className="mt-3 flex-row items-center justify-between border-t border-[#EEE9F0] pt-2.5">
                          <View className="rounded-full bg-[#F8F6F3] px-2.5 py-1.5">
                            <Text
                              className="text-[8px] font-black uppercase"
                              style={{
                                color:
                                  theme.colors
                                    .foregroundMuted,
                              }}
                            >
                              {item.level ||
                                "Niveau non renseigné"}
                            </Text>
                          </View>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Gérer ${item.title}`}
                            accessibilityState={{
                              expanded,
                            }}
                            onPress={() =>
                              setExpandedTrainingId(
                                (current) =>
                                  current ===
                                  item.id
                                    ? null
                                    : item.id,
                              )
                            }
                            android_ripple={{
                              color:
                                "transparent",
                            }}
                            className="flex-row items-center rounded-[12px] bg-[#F3EEFF] px-3 py-2"
                          >
                            <SymbolView
                              name={{
                                ios: "slider.horizontal.3",
                                android: "tune",
                                web: "tune",
                              }}
                              tintColor="#7C3AED"
                              size={10}
                              weight="bold"
                            />

                            <Text className="ml-1.5 text-[9px] font-black text-[#7C3AED]">
                              {expanded
                                ? "Masquer"
                                : "Gérer"}
                            </Text>

                            <SymbolView
                              name={{
                                ios: expanded
                                  ? "chevron.up"
                                  : "chevron.right",
                                android: expanded
                                  ? "keyboard_arrow_up"
                                  : "chevron_right",
                                web: expanded
                                  ? "keyboard_arrow_up"
                                  : "chevron_right",
                              }}
                              tintColor="#7C3AED"
                              size={10}
                              weight="bold"
                            />
                          </Pressable>
                        </View>
                      </View>

                      {expanded ? (
                        <View className="border-t border-[#EEE9F0] bg-[#FCFBFD] p-3">
                          <View className="flex-row flex-wrap gap-2">
                            {item.status ===
                            "DRAFT" ? (
                              <ActionButton
                                label="Modifier"
                                icon={{
                                  ios: "pencil",
                                  android: "edit",
                                  web: "edit",
                                }}
                                onPress={() =>
                                  router.push(
                                    `/admin/training-edit/${item.id}` as Href,
                                  )
                                }
                              />
                            ) : null}

                            <ActionButton
                              label="Quiz Builder"
                              icon={{
                                ios: "checklist",
                                android: "quiz",
                                web: "quiz",
                              }}
                              onPress={() =>
                                router.push(
                                  `/admin/training-quizzes/${item.id}` as Href,
                                )
                              }
                            />

                            {item.status !==
                            "PUBLISHED" ? (
                              <ActionButton
                                label="Publier"
                                icon={{
                                  ios: "paperplane.fill",
                                  android: "publish",
                                  web: "publish",
                                }}
                                tone="success"
                                onPress={() =>
                                  setPending({
                                    training:
                                      item,
                                    target:
                                      "PUBLISHED",
                                  })
                                }
                              />
                            ) : null}

                            {item.status !==
                            "DRAFT" ? (
                              <ActionButton
                                label="Brouillon"
                                icon={{
                                  ios: "pencil.circle",
                                  android: "edit_note",
                                  web: "edit_note",
                                }}
                                onPress={() =>
                                  setPending({
                                    training:
                                      item,
                                    target:
                                      "DRAFT",
                                  })
                                }
                              />
                            ) : null}

                            {item.status !==
                            "ARCHIVED" ? (
                              <ActionButton
                                label="Archiver"
                                icon={{
                                  ios: "archivebox",
                                  android:
                                    "inventory_2",
                                  web: "inventory_2",
                                }}
                                tone="warning"
                                onPress={() =>
                                  setPending({
                                    training:
                                      item,
                                    target:
                                      "ARCHIVED",
                                  })
                                }
                              />
                            ) : null}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {filtered.length > 0 ? (
              <View
                className="mb-1 mt-4 rounded-[22px] border bg-white px-3 py-3"
                style={{
                  borderColor:
                    theme.colors.border,
                }}
              >
                <View className="mb-3 flex-row items-center justify-between">
                  <Text
                    className="text-[13px] font-bold"
                    style={{
                      color:
                        theme.colors
                          .foregroundMuted,
                    }}
                  >
                    {filtered.length} formation
                    {filtered.length > 1
                      ? "s"
                      : ""}
                  </Text>

                  <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text className="text-[12px] font-black text-[#7C3AED]">
                      Page {currentPage} /{" "}
                      {totalPages}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-center gap-1.5">
                  <PaginationArrow
                    direction="previous"
                    disabled={
                      currentPage === 1
                    }
                    onPress={() =>
                      changePage(
                        currentPage - 1,
                      )
                    }
                  />

                  {paginationItems.map(
                    (item, index) => {
                      if (
                        item ===
                        "ellipsis"
                      ) {
                        return (
                          <View
                            key={`ellipsis-${index}`}
                            className="h-9 w-6 items-center justify-center"
                          >
                            <Text
                              className="text-[15px] font-bold"
                              style={{
                                color:
                                  theme
                                    .colors
                                    .foregroundSubtle,
                              }}
                            >
                              …
                            </Text>
                          </View>
                        );
                      }

                      const active =
                        item ===
                        currentPage;

                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityLabel={`Page ${item}`}
                          accessibilityState={{
                            selected:
                              active,
                          }}
                          onPress={() =>
                            changePage(
                              item,
                            )
                          }
                          android_ripple={{
                            color:
                              "transparent",
                          }}
                          className="h-9 w-9 items-center justify-center rounded-xl border"
                          style={{
                            backgroundColor:
                              active
                                ? theme
                                    .colors
                                    .accent
                                : theme
                                    .colors
                                    .surface,
                            borderColor:
                              active
                                ? theme
                                    .colors
                                    .accent
                                : theme
                                    .colors
                                    .border,
                          }}
                        >
                          <Text
                            className="text-[13px] font-black"
                            style={{
                              color:
                                active
                                  ? theme
                                      .colors
                                      .accentForeground
                                  : theme
                                      .colors
                                      .foregroundMuted,
                            }}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}

                  <PaginationArrow
                    direction="next"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onPress={() =>
                      changePage(
                        currentPage + 1,
                      )
                    }
                  />
                </View>
              </View>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={pending !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (!working) {
            setPending(null);
          }
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/55 px-5 py-8">
          {pending ? (
            <LifecycleModal
              pending={pending}
            />
          ) : null}
        </View>
      </Modal>
    </ScreenContainer>
  );

  function MetricCard({
    label,
    value,
    icon,
    background,
    foreground,
    accent,
  }: {
    label: string;
    value: number;
    icon: SymbolName;
    background: string;
    foreground: string;
    accent: string;
  }) {
    return (
      <View
        className="min-h-[104px] flex-1 overflow-hidden rounded-[20px] border bg-white"
        style={{
          borderColor:
            theme.colors.border,
        }}
      >
        <View
          className="h-[3px]"
          style={{
            backgroundColor: accent,
          }}
        />

        <View className="px-4 py-3.5">
          <View className="flex-row items-center justify-between">
            <View
              className="h-11 w-11 items-center justify-center rounded-[13px]"
              style={{
                backgroundColor:
                  background,
              }}
            >
              <SymbolView
                name={icon}
                tintColor={foreground}
                size={17}
                weight="bold"
              />
            </View>

            <Text
              className="text-[26px] font-black"
              style={{
                color:
                  theme.colors
                    .foreground,
              }}
            >
              {value}
            </Text>
          </View>

          <Text
            className="mt-2.5 text-[11px] font-black"
            style={{
              color:
                theme.colors
                  .foregroundMuted,
            }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }

  function FilterChip({
    label,
    count,
    selected,
    onPress,
  }: {
    label: string;
    count: number;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{
          selected,
        }}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="h-[42px] flex-row items-center rounded-[12px] border px-3"
        style={{
          backgroundColor: selected
            ? "#7C3AED"
            : "#FFFFFF",
          borderColor: selected
            ? "#7C3AED"
            : theme.colors.border,
        }}
      >
        <Text
          className="text-[10px] font-black"
          style={{
            color: selected
              ? "#FFFFFF"
              : theme.colors
                  .foregroundMuted,
          }}
        >
          {label}
        </Text>

        <View
          className="ml-2 min-w-[22px] items-center rounded-full px-1.5 py-1"
          style={{
            backgroundColor: selected
              ? "rgba(255,255,255,0.18)"
              : "#F3EEFF",
          }}
        >
          <Text
            className="text-[8px] font-black"
            style={{
              color: selected
                ? "#FFFFFF"
                : "#7C3AED",
            }}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    );
  }

  function ActionButton({
    label,
    icon,
    tone = "default",
    onPress,
  }: {
    label: string;
    icon: SymbolName;
    tone?: "default" | "success" | "warning";
    onPress: () => void;
  }) {
    const foreground =
      tone === "success"
        ? "#16845A"
        : tone === "warning"
          ? "#B45309"
          : "#7C3AED";

    const background =
      tone === "success"
        ? "#EAFBF3"
        : tone === "warning"
          ? "#FFF4E5"
          : "#F3EEFF";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={working}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="h-[42px] min-w-[46%] flex-1 flex-row items-center justify-center rounded-[12px] px-3"
        style={{
          backgroundColor:
            background,
          opacity: working
            ? 0.55
            : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={foreground}
          size={11}
          weight="bold"
        />

        <Text
          className="ml-1.5 text-[9px] font-black"
          style={{ color: foreground }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction:
      | "previous"
      | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const previous =
      direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          previous
            ? "Page précédente"
            : "Page suivante"
        }
        accessibilityState={{
          disabled,
        }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="h-9 w-9 items-center justify-center rounded-xl border"
        style={{
          backgroundColor: disabled
            ? "#F8F6F3"
            : theme.colors.surface,
          borderColor:
            theme.colors.border,
          opacity: disabled
            ? 0.45
            : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous
              ? "chevron.left"
              : "chevron.right",
            android: previous
              ? "chevron_left"
              : "chevron_right",
            web: previous
              ? "chevron_left"
              : "chevron_right",
          }}
          tintColor={
            disabled
              ? theme.colors
                  .foregroundSubtle
              : theme.colors
                  .foregroundMuted
          }
          size={13}
          weight="bold"
        />
      </Pressable>
    );
  }

  function AlertCard({
    kind,
    title,
    message,
    actionLabel,
    onAction,
  }: {
    kind: "error" | "success";
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
  }) {
    const isError =
      kind === "error";

    return (
      <View
        className="mb-3 flex-row items-start rounded-[15px] border px-3 py-3"
        style={{
          backgroundColor:
            isError
              ? "#FFF4F2"
              : "#EAFBF3",
          borderColor:
            isError
              ? "#F2C6C3"
              : "#BFECD7",
        }}
      >
        <SymbolView
          name={{
            ios: isError
              ? "exclamationmark.triangle.fill"
              : "checkmark.circle.fill",
            android: isError
              ? "error"
              : "check_circle",
            web: isError
              ? "error"
              : "check_circle",
          }}
          tintColor={
            isError
              ? "#C2413D"
              : "#16845A"
          }
          size={13}
          weight="bold"
        />

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[9px] font-black"
            style={{
              color: isError
                ? "#C2413D"
                : "#16845A",
            }}
          >
            {title}
          </Text>

          <Text
            className="mt-0.5 text-[8px] leading-[13px]"
            style={{
              color:
                theme.colors
                  .foregroundMuted,
            }}
          >
            {message}
          </Text>
        </View>

        {actionLabel &&
        onAction ? (
          <Pressable
            onPress={onAction}
            className="ml-2 rounded-full bg-white px-2 py-1"
          >
            <Text
              className="text-[8px] font-black"
              style={{
                color: isError
                  ? "#C2413D"
                  : "#16845A",
              }}
            >
              {actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function LifecycleModal({
    pending,
  }: {
    pending: PendingLifecycle;
  }) {
    const target =
      pending.target;
    const current =
      pending.training.status;

    const isPublish =
      target === "PUBLISHED";
    const isDraft =
      target === "DRAFT";

    const accent = isPublish
      ? "#16845A"
      : isDraft
        ? "#7C3AED"
        : "#B45309";

    const accentSoft = isPublish
      ? "#EAFBF3"
      : isDraft
        ? "#F3EEFF"
        : "#FFF4E5";

    const accentBorder = isPublish
      ? "#BFECD7"
      : isDraft
        ? "#DDD1F5"
        : "#F1D7B5";

    const title = isPublish
      ? "Publier cette formation ?"
      : isDraft
        ? "Remettre en brouillon ?"
        : "Archiver cette formation ?";

    const actionLabel =
      isPublish
        ? "Publier"
        : isDraft
          ? "Passer en brouillon"
          : "Archiver";

    const impact = isPublish
      ? "La formation passera au statut publié et sera disponible selon ses paramètres d’accès."
      : isDraft
        ? "La formation repassera en brouillon afin de permettre les modifications prévues par l’éditeur."
        : "La formation sera retirée du catalogue actif tout en restant conservée dans l’administration.";

    return (
      <View
        className="w-full max-w-[500px] overflow-hidden rounded-[26px] border bg-white"
        style={{
          borderColor:
            accentBorder,
        }}
      >
        <View
          className="h-1.5"
          style={{
            backgroundColor:
              accent,
          }}
        />

        <View className="p-4">
          <View className="flex-row items-start justify-between">
            <View
              className="h-12 w-12 items-center justify-center rounded-[15px]"
              style={{
                backgroundColor:
                  accentSoft,
              }}
            >
              <SymbolView
                name={{
                  ios: isPublish
                    ? "paperplane.fill"
                    : isDraft
                      ? "pencil.circle.fill"
                      : "archivebox.fill",
                  android: isPublish
                    ? "publish"
                    : isDraft
                      ? "edit_note"
                      : "inventory_2",
                  web: isPublish
                    ? "publish"
                    : isDraft
                      ? "edit_note"
                      : "inventory_2",
                }}
                tintColor={accent}
                size={20}
                weight="bold"
              />
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              disabled={working}
              onPress={() =>
                setPending(null)
              }
              className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F7F5F8]"
              style={{
                opacity: working
                  ? 0.45
                  : 1,
              }}
            >
              <SymbolView
                name={{
                  ios: "xmark",
                  android: "close",
                  web: "close",
                }}
                tintColor={
                  theme.colors
                    .foregroundMuted
                }
                size={12}
                weight="bold"
              />
            </Pressable>
          </View>

          <Text
            className="mt-3 text-[9px] font-black uppercase tracking-[0.7px]"
            style={{
              color: accent,
            }}
          >
            Changement de statut
          </Text>

          <Text
            className="mt-1 text-[20px] font-black leading-[25px]"
            style={{
              color:
                theme.colors
                  .foreground,
            }}
          >
            {title}
          </Text>

          <View
            className="mt-4 rounded-[16px] border bg-[#FCFBFD] p-3"
            style={{
              borderColor:
                "#E9E3EC",
            }}
          >
            <Text
              numberOfLines={2}
              className="text-[12px] font-black leading-[17px]"
              style={{
                color:
                  theme.colors
                    .foreground,
              }}
            >
              {pending.training.title}
            </Text>

            <Text
              numberOfLines={1}
              className="mt-1 text-[9px]"
              style={{
                color:
                  theme.colors
                    .foregroundMuted,
              }}
            >
              {pending.training.category ||
                "Sans catégorie"}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center gap-2">
            <StateBox
              label="Actuellement"
              value={statusLabel(
                current,
              )}
            />

            <View className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3EEFF]">
              <SymbolView
                name={{
                  ios: "arrow.right",
                  android:
                    "arrow_forward",
                  web: "arrow_forward",
                }}
                tintColor="#7C3AED"
                size={11}
                weight="bold"
              />
            </View>

            <StateBox
              label="Après confirmation"
              value={statusLabel(
                target,
              )}
              background={
                accentSoft
              }
              border={
                accentBorder
              }
              foreground={accent}
            />
          </View>

          <View
            className="mt-3 flex-row items-start rounded-[14px] px-3 py-3"
            style={{
              backgroundColor:
                accentSoft,
            }}
          >
            <SymbolView
              name={{
                ios: "info.circle.fill",
                android: "info",
                web: "info",
              }}
              tintColor={accent}
              size={13}
            />

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                className="text-[9px] font-black"
                style={{
                  color: accent,
                }}
              >
                Ce qui va changer
              </Text>

              <Text
                className="mt-0.5 text-[9px] leading-[14px]"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                {impact}
              </Text>
            </View>
          </View>

          <View className="mt-4 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() =>
                setPending(null)
              }
              className="h-[46px] flex-1 items-center justify-center rounded-[13px] border bg-white"
              style={{
                borderColor:
                  theme.colors.border,
                opacity: working
                  ? 0.5
                  : 1,
              }}
            >
              <Text
                className="text-[11px] font-black"
                style={{
                  color:
                    theme.colors
                      .foreground,
                }}
              >
                Annuler
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={working}
              onPress={() =>
                void confirmLifecycle()
              }
              className="h-[46px] flex-1 flex-row items-center justify-center rounded-[13px]"
              style={{
                backgroundColor:
                  accent,
                opacity: working
                  ? 0.65
                  : 1,
              }}
            >
              <Text className="text-[10px] font-black text-white">
                {working
                  ? "Enregistrement..."
                  : actionLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  function StateBox({
    label,
    value,
    background = "#FAF9FB",
    border = "#E9E3EC",
    foreground = theme.colors.foreground,
  }: {
    label: string;
    value: string;
    background?: string;
    border?: string;
    foreground?: string;
  }) {
    return (
      <View
        className="min-w-0 flex-1 rounded-[14px] border px-3 py-2.5"
        style={{
          backgroundColor:
            background,
          borderColor: border,
        }}
      >
        <Text
          className="text-[8px] font-black uppercase tracking-[0.5px]"
          style={{
            color:
              theme.colors
                .foregroundSubtle,
          }}
        >
          {label}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-1 text-[11px] font-black"
          style={{
            color: foreground,
          }}
        >
          {value}
        </Text>
      </View>
    );
  }
}
