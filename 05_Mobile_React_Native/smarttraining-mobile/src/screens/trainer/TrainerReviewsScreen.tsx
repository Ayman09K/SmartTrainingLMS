import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { getTrainerReviews } from "../../features/trainer/trainerFeedbackReviewService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { TrainerReviewListItem } from "../../types/trainerFeedbackReviewMobile";

type Props = {
  trainerId: number;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PageItem = number | "ellipsis";

const PAGE_SIZE = 4;

function searchText(item: TrainerReviewListItem): string {
  const learner = item.learner;
  const learnerText = learner
    ? [
        learner.fullName,
        learner.firstName,
        learner.lastName,
        learner.email,
      ]
        .filter(Boolean)
        .join(" ")
    : "";

  return [
    learnerText,
    item.training?.title,
    item.review.comment,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("fr");
}

function learnerName(item: TrainerReviewListItem): string {
  const learner = item.learner;

  if (!learner) {
    return "Apprenant";
  }

  return (
    learner.fullName ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    learner.email
  );
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "AP";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function statusLabel(value?: string | null): string {
  return value === "HIDDEN" ? "Masqué" : "Publié";
}

function statusTone(value?: string | null): {
  color: string;
  background: string;
} {
  if (value === "HIDDEN") {
    return {
      color: "#667085",
      background: "#F2F4F7",
    };
  }

  return {
    color: "#16845A",
    background: "#EAFBF3",
  };
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Date non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(parsed);
}

function buildPagination(currentPage: number, totalPages: number): PageItem[] {
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

export default function TrainerReviewsScreen({
  trainerId,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [items, setItems] = useState<TrainerReviewListItem[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const loaded = await getTrainerReviews(trainerId);
    setItems(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerReviews(trainerId)
      .then((loaded) => {
        if (active) {
          setItems(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les avis de vos formations.");
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
  }, [trainerId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser les avis.");
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return items;
    }

    return items.filter((item) => searchText(item).includes(normalized));
  }, [items, query]);

  const published = useMemo(
    () => items.filter((item) => item.review.status !== "HIDDEN"),
    [items],
  );

  const average =
    published.length > 0
      ? published.reduce((sum, item) => sum + item.review.rating, 0) /
        published.length
      : null;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [currentPage, filtered]);

  const pagination = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const firstVisible =
    filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(currentPage * PAGE_SIZE, filtered.length);

  function changeQuery(value: string) {
    setQuery(value);
    setPage(1);
  }

  if (loading) {
    return <LoadingState message="Chargement des avis..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          <View className="pb-3 pt-4">
            <View
              className="self-start rounded-full px-2.5 py-1"
              style={{ backgroundColor: "#F3EEFF" }}
            >
              <Text
                className="text-[9px] font-black uppercase tracking-[0.7px]"
                style={{ color: theme.colors.accent }}
              >
                Expérience apprenant
              </Text>
            </View>

            <Text
              className="mt-2 text-[16px] font-black leading-[21px]"
              style={{ color: theme.colors.foreground }}
            >
              Retours et satisfaction
            </Text>

            <Text
              className="mt-1 text-[10px] leading-[15px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Consultez les notes et commentaires laissés par vos apprenants.
            </Text>
          </View>

          <View className="mb-3 flex-row gap-2">
            <MetricCard
              icon={{
                ios: "star.fill",
                android: "star",
                web: "star",
              }}
              value={average === null ? "—" : average.toFixed(1)}
              label="Note moyenne publiée"
            />

            <MetricCard
              icon={{
                ios: "text.bubble.fill",
                android: "reviews",
                web: "reviews",
              }}
              value={String(published.length)}
              label="Avis publiés"
            />
          </View>

          <View
            className="mb-3 flex-row items-start rounded-[16px] border px-3 py-3"
            style={{
              backgroundColor: "#F7F2FF",
              borderColor: "#E3D6FA",
            }}
          >
            <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white">
              <SymbolView
                name={{
                  ios: "eye.fill",
                  android: "visibility",
                  web: "visibility",
                }}
                tintColor="#7C3AED"
                size={14}
                weight="bold"
              />
            </View>

            <View className="ml-3 min-w-0 flex-1">
              <Text
                className="text-[10px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Consultation mobile
              </Text>
              <Text
                className="mt-1 text-[9px] leading-[14px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                La modération et les actions de publication restent gérées dans les espaces prévus à cet effet.
              </Text>
            </View>
          </View>

          <View
            className="mb-4 flex-row items-center rounded-[15px] border bg-white px-3"
            style={{ borderColor: theme.colors.border }}
          >
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              tintColor={theme.colors.foregroundSubtle}
              size={15}
            />

            <TextInput
              value={query}
              onChangeText={changeQuery}
              placeholder="Formation, apprenant, commentaire..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              className="ml-2 h-[48px] min-w-0 flex-1 text-[12px]"
              style={{ color: theme.colors.foreground }}
              returnKeyType="search"
            />

            {query ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Effacer la recherche"
                onPress={() => changeQuery("")}
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

          {error ? (
            <View className="mb-3">
              <ErrorMessage
                message={error}
                onRetry={() => void refresh()}
              />
            </View>
          ) : null}

          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text
                className="text-[18px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Avis reçus
              </Text>
              <Text
                className="mt-0.5 text-[10px] font-semibold"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {filtered.length === 0
                  ? "Aucun résultat"
                  : `${firstVisible}–${lastVisible} sur ${filtered.length}`}
              </Text>
            </View>
          </View>

          {filtered.length === 0 ? (
            <View
              className="items-center rounded-[22px] border bg-white px-5 py-8"
              style={{ borderColor: "#E5DFE8" }}
            >
              <View className="h-[58px] w-[58px] items-center justify-center rounded-full bg-[#F1E9FF]">
                <SymbolView
                  name={{
                    ios: "star.bubble.fill",
                    android: "reviews",
                    web: "reviews",
                  }}
                  tintColor="#7C3AED"
                  size={22}
                  weight="bold"
                />
              </View>

              <Text
                className="mt-4 text-[15px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucun avis à afficher
              </Text>
              <Text
                className="mt-1.5 text-center text-[10px] leading-[15px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucun avis ne correspond à votre recherche.
              </Text>
            </View>
          ) : (
            <>
              <View className="gap-3">
                {visibleItems.map((item) => {
                  const name = learnerName(item);
                  const tone = statusTone(item.review.status);
                  const rating = Math.max(
                    1,
                    Math.min(5, Math.round(item.review.rating)),
                  );

                  return (
                    <View
                      key={item.review.id}
                      className="overflow-hidden rounded-[20px] border bg-white"
                      style={{
                        borderColor: "#E5DFE8",
                        shadowColor: "#0F172A",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.035,
                        shadowRadius: 7,
                        elevation: 1,
                      }}
                    >
                      <View className="p-3.5">
                        <View className="flex-row items-start">
                          <View className="h-11 w-11 items-center justify-center rounded-full bg-[#F1E9FF]">
                            <Text className="text-[10px] font-black text-[#7C3AED]">
                              {initials(name)}
                            </Text>
                          </View>

                          <View className="ml-3 min-w-0 flex-1">
                            <View className="flex-row items-start justify-between gap-2">
                              <View className="min-w-0 flex-1">
                                <Text
                                  numberOfLines={1}
                                  className="text-[12px] font-black"
                                  style={{ color: theme.colors.foreground }}
                                >
                                  {name}
                                </Text>

                                <Text
                                  numberOfLines={1}
                                  className="mt-0.5 text-[9px]"
                                  style={{ color: theme.colors.foregroundMuted }}
                                >
                                  {item.training?.title || "Formation suivie"}
                                </Text>
                              </View>

                              <View
                                className="rounded-full px-2.5 py-1"
                                style={{ backgroundColor: tone.background }}
                              >
                                <Text
                                  className="text-[8px] font-black"
                                  style={{ color: tone.color }}
                                >
                                  {statusLabel(item.review.status)}
                                </Text>
                              </View>
                            </View>

                            <View className="mt-2 flex-row items-center">
                              {Array.from({ length: 5 }, (_, index) => (
                                <SymbolView
                                  key={index}
                                  name={{
                                    ios: index < rating ? "star.fill" : "star",
                                    android: index < rating ? "star" : "star_border",
                                    web: index < rating ? "star" : "star_border",
                                  }}
                                  tintColor={index < rating ? "#E5A11A" : "#C9C5CD"}
                                  size={13}
                                  weight="bold"
                                />
                              ))}

                              <Text
                                className="ml-2 text-[10px] font-black"
                                style={{ color: theme.colors.foreground }}
                              >
                                {item.review.rating}/5
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View className="mt-3 rounded-[14px] bg-[#F8F6F9] px-3 py-3">
                          <Text
                            className="text-[11px] leading-[17px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {item.review.comment || "Aucun commentaire."}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center border-t border-[#EEE9F0] bg-[#FCFBFD] px-3.5 py-2.5">
                        <SymbolView
                          name={{
                            ios: "calendar",
                            android: "calendar_month",
                            web: "calendar_month",
                          }}
                          tintColor={theme.colors.foregroundSubtle}
                          size={11}
                        />
                        <Text
                          className="ml-1.5 text-[8px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {formatDate(item.review.updatedAt || item.review.createdAt)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {totalPages > 1 ? (
                <View
                  className="mb-1 mt-4 rounded-[18px] border bg-white px-3 py-2.5"
                  style={{ borderColor: theme.colors.border }}
                >
                  <View className="mb-2.5 flex-row items-center justify-between">
                    <Text
                      className="text-[10px] font-bold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {firstVisible}–{lastVisible} sur {filtered.length}
                    </Text>

                    <Text
                      className="text-[9px] font-black"
                      style={{ color: theme.colors.accent }}
                    >
                      Page {currentPage} / {totalPages}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-center gap-1.5">
                    <PageArrow
                      previous
                      disabled={currentPage === 1}
                      onPress={() => setPage(currentPage - 1)}
                    />

                    {pagination.map((entry, index) =>
                      entry === "ellipsis" ? (
                        <Text
                          key={`ellipsis-${index}`}
                          className="w-5 text-center text-[14px]"
                          style={{ color: theme.colors.foregroundSubtle }}
                        >
                          …
                        </Text>
                      ) : (
                        <Pressable
                          key={entry}
                          accessibilityRole="button"
                          accessibilityLabel={`Page ${entry}`}
                          accessibilityState={{ selected: entry === currentPage }}
                          onPress={() => setPage(entry)}
                          android_ripple={{ color: "transparent" }}
                          className="h-8 w-8 items-center justify-center rounded-[10px] border"
                          style={{
                            backgroundColor:
                              entry === currentPage
                                ? theme.colors.accent
                                : theme.colors.surface,
                            borderColor:
                              entry === currentPage
                                ? theme.colors.accent
                                : theme.colors.border,
                          }}
                        >
                          <Text
                            className="text-[10px] font-black"
                            style={{
                              color:
                                entry === currentPage
                                  ? "#FFFFFF"
                                  : theme.colors.foregroundMuted,
                            }}
                          >
                            {entry}
                          </Text>
                        </Pressable>
                      ),
                    )}

                    <PageArrow
                      disabled={currentPage === totalPages}
                      onPress={() => setPage(currentPage + 1)}
                    />
                  </View>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function MetricCard({
    icon,
    value,
    label,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
  }) {
    return (
      <View
        className="min-w-0 flex-1 rounded-[17px] border bg-white px-3 py-3"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="flex-row items-center">
          <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
            <SymbolView
              name={icon}
              tintColor="#7C3AED"
              size={13}
              weight="bold"
            />
          </View>

          <Text
            className="ml-2 text-[17px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
        </View>

        <Text
          className="mt-1.5 text-[9px] font-bold leading-[13px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function PageArrow({
    previous = false,
    disabled,
    onPress,
  }: {
    previous?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={previous ? "Page précédente" : "Page suivante"}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-8 w-8 items-center justify-center rounded-[10px] border"
        style={{
          backgroundColor: disabled ? "#F8F6F3" : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous ? "chevron.left" : "chevron.right",
            android: previous ? "chevron_left" : "chevron_right",
            web: previous ? "chevron_left" : "chevron_right",
          }}
          tintColor={
            disabled
              ? theme.colors.foregroundSubtle
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}
