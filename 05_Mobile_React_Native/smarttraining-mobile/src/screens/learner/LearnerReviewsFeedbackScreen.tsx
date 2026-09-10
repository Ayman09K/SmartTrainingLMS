import { SymbolView } from "expo-symbols";
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
import {
  createMyFeedback,
  createOrUpdateMyReview,
  getMyFeedbacks,
  getMyReviews,
} from "../../features/analytics/learnerFeedbackService";
import { getMyLearnerTrainings } from "../../features/trainings/learnerTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerDifficultyLevel,
  LearnerFeedbackResponse,
  LearnerReviewResponse,
} from "../../types/learnerFeedback";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onBackHome: () => void;
};

type ComposerTab = "REVIEW" | "FEEDBACK";

const PAGE_SIZE = 3;
const TRAINING_PAGE_SIZE = 4;

const difficulties: { value: LearnerDifficultyLevel; label: string }[] = [
  { value: "VERY_EASY", label: "Très facile" },
  { value: "EASY", label: "Facile" },
  { value: "NORMAL", label: "Normal" },
  { value: "HARD", label: "Difficile" },
  { value: "VERY_HARD", label: "Très difficile" },
];

function formatDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

function feedbackStatusLabel(value: string): string {
  if (value === "OPEN") return "Envoyée";
  if (value === "IN_PROGRESS") return "En cours";
  if (value === "RESOLVED") return "Traitée";
  if (value === "CLOSED") return "Clôturée";
  return "Envoyée";
}

function reviewStatusLabel(value: string): string {
  return value === "HIDDEN" ? "Masqué par la modération" : "Publié";
}

function difficultyLabel(value: LearnerDifficultyLevel): string {
  return difficulties.find((item) => item.value === value)?.label ?? "Normal";
}

function feedbackTone(value: string): { tint: string; soft: string } {
  if (value === "RESOLVED" || value === "CLOSED") {
    return { tint: "#059669", soft: "#ECFDF5" };
  }
  if (value === "IN_PROGRESS") {
    return { tint: "#D97706", soft: "#FFF7ED" };
  }
  return { tint: "#7C3AED", soft: "#F3E8FF" };
}

function pageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  return Array.from({ length: 5 }, (_, index) => start + index);
}

function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <View className="mt-3 flex-row items-center justify-center gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Page précédente"
        disabled={page <= 1}
        onPress={() => onChange(Math.max(1, page - 1))}
        className="h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-white"
        style={{ opacity: page <= 1 ? 0.35 : 1 }}
      >
        <SymbolView
          name={{ ios: "chevron.left", android: "chevron_left", web: "chevron_left" }}
          size={17}
          tintColor="#475569"
          weight="bold"
        />
      </Pressable>

      <View className="flex-row items-center gap-1.5">
        {pageNumbers(page, totalPages).map((item) => {
          const selected = item === page;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Page ${item}`}
              accessibilityState={{ selected }}
              onPress={() => onChange(item)}
              className="h-9 min-w-9 items-center justify-center rounded-[12px] border px-2"
              style={{
                backgroundColor: selected ? "#7C3AED" : "#FFFFFF",
                borderColor: selected ? "#7C3AED" : "#E2E8F0",
              }}
            >
              <Text
                allowFontScaling={false}
                className="text-[12px] font-black"
                style={{ color: selected ? "#FFFFFF" : "#64748B" }}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Page suivante"
        disabled={page >= totalPages}
        onPress={() => onChange(Math.min(totalPages, page + 1))}
        className="h-9 w-9 items-center justify-center rounded-[12px] border border-slate-200 bg-white"
        style={{ opacity: page >= totalPages ? 0.35 : 1 }}
      >
        <SymbolView
          name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
          size={17}
          tintColor="#475569"
          weight="bold"
        />
      </Pressable>
    </View>
  );
}

export default function LearnerReviewsFeedbackScreen({ onBackHome }: Props) {
  void onBackHome;
  const { theme } = useSmartTrainingTheme();
  const [trainings, setTrainings] = useState<LearnerMyTraining[]>([]);
  const [feedbacks, setFeedbacks] = useState<LearnerFeedbackResponse[]>([]);
  const [reviews, setReviews] = useState<LearnerReviewResponse[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<LearnerDifficultyLevel>("NORMAL");
  const [needHelp, setNeedHelp] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [composerTab, setComposerTab] = useState<ComposerTab>("REVIEW");
  const [trainingSelectorOpen, setTrainingSelectorOpen] = useState(false);
  const [trainingPage, setTrainingPage] = useState(1);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [reviewPage, setReviewPage] = useState(1);

  async function load() {
    const [trainingData, feedbackData, reviewData] = await Promise.all([
      getMyLearnerTrainings(),
      getMyFeedbacks(),
      getMyReviews(),
    ]);

    setTrainings(trainingData);
    setFeedbacks(feedbackData);
    setReviews(reviewData);

    if (selectedTrainingId === null && trainingData.length > 0) {
      setSelectedTrainingId(trainingData[0].id);
    }
  }

  useEffect(() => {
    let active = true;

    void Promise.all([getMyLearnerTrainings(), getMyFeedbacks(), getMyReviews()])
      .then(([trainingData, feedbackData, reviewData]) => {
        if (!active) return;
        setTrainings(trainingData);
        setFeedbacks(feedbackData);
        setReviews(reviewData);

        const initialTrainingId = trainingData[0]?.id ?? null;
        const initialReview = reviewData.find(
          (item) => item.trainingId === initialTrainingId,
        );
        setSelectedTrainingId(initialTrainingId);
        setRating(initialReview?.rating ?? 5);
        setReviewComment(initialReview?.comment ?? "");
        setError("");
      })
      .catch(() => {
        if (active) setError("Impossible de charger tes avis et tes demandes.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const trainingTitles = useMemo(
    () => new Map(trainings.map((training) => [training.id, training.title])),
    [trainings],
  );

  const currentReview = useMemo(
    () => reviews.find((item) => item.trainingId === selectedTrainingId),
    [reviews, selectedTrainingId],
  );

  const openFeedbackCount = useMemo(
    () =>
      feedbacks.filter(
        (item) => item.status === "OPEN" || item.status === "IN_PROGRESS",
      ).length,
    [feedbacks],
  );

  const selectedTraining = useMemo(
    () => trainings.find((item) => item.id === selectedTrainingId) ?? null,
    [trainings, selectedTrainingId],
  );

  const trainingPages = Math.max(
    1,
    Math.ceil(trainings.length / TRAINING_PAGE_SIZE),
  );
  const safeTrainingPage = Math.min(trainingPage, trainingPages);
  const visibleTrainings = useMemo(
    () =>
      trainings.slice(
        (safeTrainingPage - 1) * TRAINING_PAGE_SIZE,
        safeTrainingPage * TRAINING_PAGE_SIZE,
      ),
    [trainings, safeTrainingPage],
  );

  const sortedFeedbacks = useMemo(
    () =>
      [...feedbacks].sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime(),
      ),
    [feedbacks],
  );

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort(
        (a, b) =>
          new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
          new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
      ),
    [reviews],
  );

  const feedbackPages = Math.max(1, Math.ceil(sortedFeedbacks.length / PAGE_SIZE));
  const reviewPages = Math.max(1, Math.ceil(sortedReviews.length / PAGE_SIZE));
  const safeFeedbackPage = Math.min(feedbackPage, feedbackPages);
  const safeReviewPage = Math.min(reviewPage, reviewPages);

  const visibleFeedbacks = useMemo(
    () =>
      sortedFeedbacks.slice(
        (safeFeedbackPage - 1) * PAGE_SIZE,
        safeFeedbackPage * PAGE_SIZE,
      ),
    [sortedFeedbacks, safeFeedbackPage],
  );

  const visibleReviews = useMemo(
    () =>
      sortedReviews.slice(
        (safeReviewPage - 1) * PAGE_SIZE,
        safeReviewPage * PAGE_SIZE,
      ),
    [sortedReviews, safeReviewPage],
  );

  function selectTraining(trainingId: number) {
    const existingReview = reviews.find((item) => item.trainingId === trainingId);
    setSelectedTrainingId(trainingId);
    setRating(existingReview?.rating ?? 5);
    setReviewComment(existingReview?.comment ?? "");
    setTrainingSelectorOpen(false);
    setError("");
    setSuccess("");
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      setTrainingPage(1);
      setTrainingSelectorOpen(false);
      setFeedbackPage(1);
      setReviewPage(1);
      setError("");
    } catch {
      setError("Impossible d’actualiser tes avis et tes demandes.");
    } finally {
      setRefreshing(false);
    }
  }

  async function submitFeedback() {
    if (selectedTrainingId === null) {
      setError("Choisis d’abord une formation.");
      return;
    }

    const cleanMessage = feedbackMessage.trim();
    if (!cleanMessage) {
      setError("Décris brièvement ton retour ou ton besoin d’aide.");
      return;
    }

    setSavingFeedback(true);
    setError("");
    setSuccess("");

    try {
      const created = await createMyFeedback({
        trainingId: selectedTrainingId,
        difficultyLevel: difficulty,
        needHelp,
        message: cleanMessage,
      });

      setFeedbacks((current) => [created, ...current]);
      setFeedbackMessage("");
      setDifficulty("NORMAL");
      setNeedHelp(false);
      setFeedbackPage(1);
      setSuccess(
        needHelp
          ? "Ta demande d’aide a été envoyée au formateur."
          : "Ton retour pédagogique a été envoyé.",
      );
    } catch {
      setError("Ton retour n’a pas pu être envoyé. Réessaie dans quelques instants.");
    } finally {
      setSavingFeedback(false);
    }
  }

  async function submitReview() {
    if (selectedTrainingId === null) {
      setError("Choisis d’abord une formation.");
      return;
    }

    setSavingReview(true);
    setError("");
    setSuccess("");

    try {
      const saved = await createOrUpdateMyReview({
        trainingId: selectedTrainingId,
        rating,
        comment: reviewComment.trim(),
      });

      setReviews((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      setReviewPage(1);
      setSuccess(currentReview ? "Ton avis a été mis à jour." : "Ton avis a été publié.");
    } catch {
      setError("Ton avis n’a pas pu être enregistré. Réessaie dans quelques instants.");
    } finally {
      setSavingReview(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de tes avis et retours..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[14px] pb-6 pt-3"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full self-center" style={{ maxWidth: 760 }}>
        <View
          className="overflow-hidden rounded-[24px] border px-4 py-3.5"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: "#0F172A",
            shadowOpacity: 0.055,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 2,
          }}
        >
          <View className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-emerald-50" />

          <View className="flex-row items-start gap-3">
            <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[16px] bg-violet-50">
              <SymbolView
                name={{ ios: "star.bubble.fill", android: "reviews", web: "reviews" }}
                size={23}
                tintColor="#7C3AED"
              />
            </View>

            <View className="min-w-0 flex-1 pt-0.5">
              <Text className="text-[10px] font-black uppercase tracking-[1.1px] text-violet-600">
                Avis & feedback
              </Text>
              <Text
                className="mt-1 text-[21px] font-black leading-[26px]"
                style={{ color: theme.colors.foreground }}
              >
                Ton expérience compte
              </Text>
              <Text
                className="mt-1.5 text-[13px] leading-[19px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Évalue tes formations, partage tes difficultés et retrouve les réponses du formateur.
              </Text>
            </View>

            <View className="h-11 w-11 shrink-0 -rotate-6 items-center justify-center rounded-[15px] bg-emerald-500">
              <SymbolView
                name={{ ios: "bubble.left.and.bubble.right.fill", android: "forum", web: "forum" }}
                size={21}
                tintColor="#FFFFFF"
              />
            </View>
          </View>

          <View className="mt-3.5 flex-row gap-2">
            <View className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5">
              <Text allowFontScaling={false} className="text-[20px] font-black text-violet-600">
                {reviews.length}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[10px] font-bold text-slate-500">
                Avis
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5">
              <Text allowFontScaling={false} className="text-[20px] font-black text-amber-600">
                {openFeedbackCount}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[10px] font-bold text-slate-500">
                En suivi
              </Text>
            </View>
            <View className="min-w-0 flex-1 rounded-[16px] border border-slate-200 bg-white px-3 py-2.5">
              <Text allowFontScaling={false} className="text-[20px] font-black text-emerald-600">
                {feedbacks.length}
              </Text>
              <Text allowFontScaling={false} className="mt-0.5 text-[10px] font-bold text-slate-500">
                Retours
              </Text>
            </View>
          </View>
        </View>

        {success ? (
          <View className="mt-4 flex-row gap-3 rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
            <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-white">
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                size={20}
                tintColor="#059669"
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[13px] font-black text-emerald-700">C’est enregistré</Text>
              <Text className="mt-1 text-[13px] leading-[19px] text-emerald-700/80">{success}</Text>
            </View>
          </View>
        ) : null}

        {error ? <View className="mt-4"><ErrorMessage message={error} /></View> : null}

        <View className="mt-5">
          <View
            className="rounded-[22px] border p-3.5"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-violet-50">
                <SymbolView
                  name={{
                    ios: "book.closed.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  size={20}
                  tintColor="#7C3AED"
                  weight="bold"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Formation concernée
                </Text>
                <Text
                  className="mt-0.5 text-[12px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Choisis la formation liée à ton avis ou à ta demande.
                </Text>
              </View>
              <View className="h-9 min-w-9 items-center justify-center rounded-[12px] bg-violet-50 px-3">
                <Text
                  allowFontScaling={false}
                  className="text-[12px] font-black text-violet-700"
                >
                  {trainings.length}
                </Text>
              </View>
            </View>
          </View>

          {trainings.length ? (
            <View className="mt-3">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choisir une formation"
                accessibilityState={{ expanded: trainingSelectorOpen }}
                onPress={() => setTrainingSelectorOpen((value) => !value)}
                className="min-h-[68px] flex-row items-center gap-3 rounded-[18px] border px-3.5 py-3"
                style={{
                  borderColor: trainingSelectorOpen
                    ? theme.colors.accent
                    : theme.colors.border,
                  backgroundColor: theme.colors.surface,
                }}
              >
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-violet-50">
                  <SymbolView
                    name={{
                      ios: "book.closed.fill",
                      android: "menu_book",
                      web: "menu_book",
                    }}
                    size={20}
                    tintColor="#7C3AED"
                    weight="bold"
                  />
                </View>

                <View className="min-w-0 flex-1">
                  <Text
                    allowFontScaling={false}
                    className="text-[9px] font-black uppercase tracking-[0.9px] text-violet-600"
                  >
                    Formation sélectionnée
                  </Text>
                  <Text
                    className="mt-1 text-[14px] font-black leading-[18px]"
                    numberOfLines={2}
                    style={{ color: theme.colors.foreground }}
                  >
                    {selectedTraining?.title ?? "Choisir une formation"}
                  </Text>
                </View>

                <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-slate-50">
                  <SymbolView
                    name={{
                      ios: trainingSelectorOpen ? "chevron.up" : "chevron.down",
                      android: trainingSelectorOpen ? "expand_less" : "expand_more",
                      web: trainingSelectorOpen ? "expand_less" : "expand_more",
                    }}
                    size={18}
                    tintColor="#64748B"
                    weight="bold"
                  />
                </View>
              </Pressable>

              {trainingSelectorOpen ? (
                <View
                  className="mt-2 rounded-[18px] border p-2"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  {visibleTrainings.map((training) => {
                    const selected = training.id === selectedTrainingId;

                    return (
                      <Pressable
                        key={training.id}
                        accessibilityRole="radio"
                        accessibilityLabel={training.title}
                        accessibilityState={{ selected }}
                        onPress={() => selectTraining(training.id)}
                        className="mb-1.5 min-h-[52px] flex-row items-center gap-3 rounded-[14px] px-3 py-2.5 last:mb-0"
                        style={{
                          backgroundColor: selected ? "#F5F3FF" : "transparent",
                        }}
                      >
                        <View
                          className="h-8 w-8 shrink-0 items-center justify-center rounded-full border"
                          style={{
                            borderColor: selected ? theme.colors.accent : theme.colors.border,
                            backgroundColor: selected ? theme.colors.accent : "transparent",
                          }}
                        >
                          {selected ? (
                            <SymbolView
                              name={{ ios: "checkmark", android: "check", web: "check" }}
                              size={15}
                              tintColor="#FFFFFF"
                              weight="bold"
                            />
                          ) : null}
                        </View>
                        <Text
                          className="min-w-0 flex-1 text-[13px] font-bold leading-[18px]"
                          numberOfLines={2}
                          style={{
                            color: selected
                              ? theme.colors.accent
                              : theme.colors.foreground,
                          }}
                        >
                          {training.title}
                        </Text>
                      </Pressable>
                    );
                  })}

                  <Pagination
                    page={safeTrainingPage}
                    totalPages={trainingPages}
                    onChange={setTrainingPage}
                  />
                </View>
              ) : null}
            </View>
          ) : (
            <View
              className="mt-3 rounded-[18px] border p-4"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <Text
                className="text-[13px] font-bold"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucune formation inscrite n’est disponible.
              </Text>
            </View>
          )}
        </View>

        <View
          className="mt-4 rounded-[22px] border px-4 py-3.5"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <View className="flex-row rounded-[16px] bg-slate-100 p-1">
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: composerTab === "REVIEW" }}
              onPress={() => setComposerTab("REVIEW")}
              className="min-h-[42px] flex-1 flex-row items-center justify-center gap-2 rounded-[13px] px-3"
              style={{ backgroundColor: composerTab === "REVIEW" ? "#FFFFFF" : "transparent" }}
            >
              <SymbolView
                name={{ ios: "star.fill", android: "star", web: "star" }}
                size={16}
                tintColor={composerTab === "REVIEW" ? "#7C3AED" : "#64748B"}
              />
              <Text
                allowFontScaling={false}
                className="text-[12px] font-black"
                style={{ color: composerTab === "REVIEW" ? "#7C3AED" : "#64748B" }}
              >
                Mon avis
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: composerTab === "FEEDBACK" }}
              onPress={() => setComposerTab("FEEDBACK")}
              className="min-h-[42px] flex-1 flex-row items-center justify-center gap-2 rounded-[13px] px-3"
              style={{ backgroundColor: composerTab === "FEEDBACK" ? "#FFFFFF" : "transparent" }}
            >
              <SymbolView
                name={{ ios: "bubble.left.fill", android: "chat", web: "chat" }}
                size={16}
                tintColor={composerTab === "FEEDBACK" ? "#059669" : "#64748B"}
              />
              <Text
                allowFontScaling={false}
                className="text-[12px] font-black"
                style={{ color: composerTab === "FEEDBACK" ? "#059669" : "#64748B" }}
              >
                Feedback / aide
              </Text>
            </Pressable>
          </View>

          {composerTab === "REVIEW" ? (
            <View className="pt-5">
              <Text className="text-[20px] font-black" style={{ color: theme.colors.foreground }}>
                Donner mon avis
              </Text>
              <Text className="mt-1.5 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                Note la formation de 1 à 5 étoiles et ajoute un commentaire si tu le souhaites.
              </Text>

              <View className="mt-5 flex-row items-center justify-between rounded-[18px] bg-amber-50 px-2.5 py-2.5">
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="radio"
                      accessibilityLabel={`${value} ${value === 1 ? "étoile" : "étoiles"} sur 5`}
                      accessibilityState={{ selected: rating === value }}
                      onPress={() => setRating(value)}
                      className="h-10 w-10 items-center justify-center rounded-[13px]"
                      style={{ backgroundColor: rating === value ? "#FFFFFF" : "transparent" }}
                    >
                      <Text
                        allowFontScaling={false}
                        className="text-[28px] font-black leading-[30px]"
                        style={{ color: active ? "#F59E0B" : "#CBD5E1" }}
                      >
                        {active ? "★" : "☆"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                value={reviewComment}
                accessibilityLabel="Commentaire de mon avis"
                onChangeText={setReviewComment}
                placeholder="Mon avis sur cette formation..."
                placeholderTextColor={theme.colors.foregroundSubtle}
                multiline
                textAlignVertical="top"
                className="mt-4 min-h-[110px] rounded-[18px] border px-4 py-3.5 text-[14px]"
                style={{
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                }}
              />

              {currentReview ? (
                <View className="mt-3 flex-row items-center gap-2 rounded-[14px] bg-violet-50 px-3 py-2.5">
                  <SymbolView
                    name={{ ios: "checkmark.seal.fill", android: "verified", web: "verified" }}
                    size={15}
                    tintColor="#7C3AED"
                  />
                  <Text allowFontScaling={false} className="text-[11px] font-bold text-violet-700">
                    Avis actuel : {currentReview.rating}/5 · {reviewStatusLabel(currentReview.status)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                disabled={selectedTrainingId === null || savingReview}
                onPress={() => void submitReview()}
                className="mt-4 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px] px-4"
                style={{
                  backgroundColor: theme.colors.accent,
                  opacity: selectedTrainingId === null || savingReview ? 0.55 : 1,
                }}
              >
                <SymbolView
                  name={{ ios: "paperplane.fill", android: "send", web: "send" }}
                  size={17}
                  tintColor={theme.colors.accentForeground}
                />
                <Text className="text-[14px] font-black" style={{ color: theme.colors.accentForeground }}>
                  {savingReview
                    ? "Enregistrement..."
                    : currentReview
                      ? "Mettre à jour mon avis"
                      : "Publier mon avis"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="pt-5">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-emerald-50">
                  <SymbolView
                    name={{ ios: "lifepreserver.fill", android: "support_agent", web: "support_agent" }}
                    size={21}
                    tintColor="#059669"
                    weight="bold"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[20px] font-black leading-[25px]" style={{ color: theme.colors.foreground }}>
                    Feedback & accompagnement
                  </Text>
                  <Text className="mt-1 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                    Partage ton ressenti ou signale un blocage. Ton formateur pourra suivre ta demande.
                  </Text>
                </View>
              </View>

              <View
                className="mt-5 overflow-hidden rounded-[20px] border"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                }}
              >
                <View className="flex-row items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
                  <View className="min-w-0 flex-1">
                    <Text
                      allowFontScaling={false}
                      className="text-[11px] font-black uppercase tracking-[0.8px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Niveau de difficulté
                    </Text>
                    <Text
                      allowFontScaling={false}
                      className="mt-1 text-[12px] font-semibold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Positionne ton ressenti sur l’échelle.
                    </Text>
                  </View>
                  <View className="rounded-full bg-emerald-50 px-3 py-1.5">
                    <Text
                      allowFontScaling={false}
                      className="text-[10px] font-black text-emerald-700"
                    >
                      {difficultyLabel(difficulty)}
                    </Text>
                  </View>
                </View>

                <View className="px-3.5 pb-4 pt-4">
                  <View className="relative">
                    <View className="absolute left-[8%] right-[8%] top-5 h-[2px] rounded-full bg-slate-200" />

                    <View className="flex-row items-start">
                      {difficulties.map((item, index) => {
                        const selectedIndex = difficulties.findIndex(
                          (candidate) => candidate.value === difficulty,
                        );
                        const selected = item.value === difficulty;
                        const reached = index <= selectedIndex;

                        return (
                          <Pressable
                            key={item.value}
                            accessibilityRole="radio"
                            accessibilityLabel={item.label}
                            accessibilityState={{ selected }}
                            onPress={() => setDifficulty(item.value)}
                            className="flex-1 items-center px-0.5"
                          >
                            <View
                              className="h-10 w-10 items-center justify-center rounded-full border-[2px]"
                              style={{
                                borderColor: selected
                                  ? "#059669"
                                  : reached
                                    ? "#A7F3D0"
                                    : "#E2E8F0",
                                backgroundColor: selected
                                  ? "#059669"
                                  : reached
                                    ? "#ECFDF5"
                                    : "#FFFFFF",
                                shadowColor: selected ? "#059669" : "transparent",
                                shadowOpacity: selected ? 0.18 : 0,
                                shadowRadius: selected ? 6 : 0,
                                shadowOffset: { width: 0, height: 3 },
                                elevation: selected ? 2 : 0,
                              }}
                            >
                              <Text
                                allowFontScaling={false}
                                className="text-[12px] font-black"
                                style={{
                                  color: selected
                                    ? "#FFFFFF"
                                    : reached
                                      ? "#047857"
                                      : "#94A3B8",
                                }}
                              >
                                {index + 1}
                              </Text>
                            </View>
                            <Text
                              allowFontScaling={false}
                              numberOfLines={2}
                              className="mt-2 min-h-[28px] text-center text-[9px] font-black leading-[12px]"
                              style={{
                                color: selected
                                  ? "#047857"
                                  : theme.colors.foregroundMuted,
                              }}
                            >
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>

              <Pressable
                accessibilityRole="switch"
                accessibilityLabel="J’ai besoin d’aide"
                accessibilityState={{ checked: needHelp }}
                onPress={() => setNeedHelp((value) => !value)}
                className="mt-3.5 flex-row items-center gap-3 rounded-[18px] border p-3.5"
                style={{
                  borderColor: needHelp ? "#A78BFA" : theme.colors.border,
                  backgroundColor: needHelp ? "#F5F3FF" : theme.colors.surface,
                }}
              >
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ backgroundColor: needHelp ? "#7C3AED" : "#F1F5F9" }}>
                  <SymbolView
                    name={{ ios: "hand.raised.fill", android: "pan_tool", web: "pan_tool" }}
                    size={18}
                    tintColor={needHelp ? "#FFFFFF" : "#7C3AED"}
                    weight="bold"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[13px] font-black" style={{ color: theme.colors.foreground }}>
                    Besoin d’un accompagnement
                  </Text>
                  <Text className="mt-0.5 text-[11px] leading-[16px]" style={{ color: theme.colors.foregroundMuted }}>
                    Active cette option pour signaler que tu attends une aide du formateur.
                  </Text>
                </View>
                <View
                  className="h-[26px] w-[46px] shrink-0 justify-center rounded-full px-[3px]"
                  style={{ backgroundColor: needHelp ? "#7C3AED" : "#CBD5E1" }}
                >
                  <View
                    className="h-5 w-5 rounded-full bg-white"
                    style={{ alignSelf: needHelp ? "flex-end" : "flex-start" }}
                  />
                </View>
              </Pressable>

              <View className="mt-3.5 overflow-hidden rounded-[18px] border" style={{ backgroundColor: theme.colors.surfaceSoft, borderColor: theme.colors.border }}>
                <View className="flex-row items-center gap-2 border-b px-4 py-3" style={{ borderBottomColor: theme.colors.border }}>
                  <SymbolView
                    name={{ ios: "square.and.pencil", android: "edit_note", web: "edit_note" }}
                    size={17}
                    tintColor="#059669"
                  />
                  <Text allowFontScaling={false} className="text-[12px] font-black" style={{ color: theme.colors.foreground }}>
                    Ton message
                  </Text>
                </View>
                <TextInput
                  value={feedbackMessage}
                  accessibilityLabel="Message de feedback ou demande d’aide"
                  onChangeText={setFeedbackMessage}
                  placeholder="Explique ce qui t’a aidé, ce qui bloque ou ce dont tu as besoin…"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  multiline
                  textAlignVertical="top"
                  className="min-h-[128px] px-4 py-3.5 text-[14px] leading-[20px]"
                  style={{ color: theme.colors.foreground }}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={selectedTrainingId === null || savingFeedback}
                onPress={() => void submitFeedback()}
                className="mt-4 min-h-[50px] flex-row items-center justify-center gap-2 rounded-[16px] px-4"
                style={{
                  backgroundColor: needHelp ? "#7C3AED" : "#059669",
                  opacity: selectedTrainingId === null || savingFeedback ? 0.55 : 1,
                  shadowColor: needHelp ? "#7C3AED" : "#059669",
                  shadowOpacity: 0.16,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 2,
                }}
              >
                <SymbolView
                  name={{ ios: "paperplane.fill", android: "send", web: "send" }}
                  size={17}
                  tintColor="#FFFFFF"
                />
                <Text className="text-[14px] font-black text-white">
                  {savingFeedback
                    ? "Envoi…"
                    : needHelp
                      ? "Envoyer ma demande d’aide"
                      : "Envoyer mon feedback"}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View className="mt-6">
          <View
            className="rounded-[22px] border p-3.5"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-emerald-50">
                <SymbolView
                  name={{
                    ios: "clock.arrow.circlepath",
                    android: "history",
                    web: "history",
                  }}
                  size={20}
                  tintColor="#059669"
                  weight="bold"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Suivi de mes demandes
                </Text>
                <Text
                  className="mt-0.5 text-[12px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Tes retours, leur statut et les réponses du formateur.
                </Text>
              </View>
              <View className="h-9 min-w-9 items-center justify-center rounded-[12px] bg-emerald-50 px-3">
                <Text
                  allowFontScaling={false}
                  className="text-[12px] font-black text-emerald-700"
                >
                  {feedbacks.length}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-3.5">
            {feedbacks.length === 0 ? (
              <View className="rounded-[22px] border p-5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-emerald-50">
                  <SymbolView name={{ ios: "tray.fill", android: "inbox", web: "inbox" }} size={20} tintColor="#059669" />
                </View>
                <Text className="mt-3 text-[16px] font-black" style={{ color: theme.colors.foreground }}>Aucun retour envoyé</Text>
                <Text className="mt-1 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                  Tes demandes apparaîtront ici avec leur statut et la réponse du formateur.
                </Text>
              </View>
            ) : (
              visibleFeedbacks.map((feedback) => {
                const tone = feedbackTone(feedback.status);
                return (
                  <View
                    key={feedback.id}
                    className="relative mb-3 overflow-hidden rounded-[22px] border"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      shadowColor: "#0F172A",
                      shadowOpacity: 0.04,
                      shadowRadius: 10,
                      shadowOffset: { width: 0, height: 4 },
                      elevation: 1,
                    }}
                  >
                    <View className="absolute bottom-0 left-0 top-0 w-1" style={{ backgroundColor: tone.tint }} />
                    <View className="p-4 pl-5">
                      <View className="flex-row items-start gap-3">
                        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[13px]" style={{ backgroundColor: tone.soft }}>
                          <SymbolView
                            name={{
                              ios: feedback.status === "RESOLVED" || feedback.status === "CLOSED" ? "checkmark.circle.fill" : "bubble.left.fill",
                              android: feedback.status === "RESOLVED" || feedback.status === "CLOSED" ? "check_circle" : "chat",
                              web: feedback.status === "RESOLVED" || feedback.status === "CLOSED" ? "check_circle" : "chat",
                            }}
                            size={18}
                            tintColor={tone.tint}
                          />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text className="text-[15px] font-black leading-[20px]" style={{ color: theme.colors.foreground }}>
                            {trainingTitles.get(feedback.trainingId) ?? "Formation associée"}
                          </Text>
                          <View className="mt-2 flex-row flex-wrap gap-1.5">
                            <View className="rounded-full bg-slate-100 px-2.5 py-1">
                              <Text allowFontScaling={false} className="text-[9px] font-black text-slate-600">
                                {difficultyLabel(feedback.difficultyLevel)}
                              </Text>
                            </View>
                            {feedback.needHelp ? (
                              <View className="rounded-full bg-violet-50 px-2.5 py-1">
                                <Text allowFontScaling={false} className="text-[9px] font-black text-violet-700">Aide demandée</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <View className="shrink-0 rounded-full px-2.5 py-1.5" style={{ backgroundColor: tone.soft }}>
                          <Text allowFontScaling={false} className="text-[9px] font-black" style={{ color: tone.tint }}>
                            {feedbackStatusLabel(feedback.status)}
                          </Text>
                        </View>
                      </View>

                      {feedback.message ? (
                        <View className="mt-3 rounded-[15px] bg-slate-50 px-3.5 py-3">
                          <Text className="text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                            {feedback.message}
                          </Text>
                        </View>
                      ) : null}

                      {feedback.trainerResponse ? (
                        <View className="mt-3 rounded-[16px] border border-violet-100 bg-violet-50 p-3.5">
                          <View className="flex-row items-center gap-2">
                            <View className="h-7 w-7 items-center justify-center rounded-[9px] bg-white">
                              <SymbolView name={{ ios: "person.crop.circle.fill.badge.checkmark", android: "support_agent", web: "support_agent" }} size={15} tintColor="#7C3AED" />
                            </View>
                            <Text className="text-[12px] font-black text-violet-700">Réponse du formateur</Text>
                          </View>
                          <Text className="mt-2 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                            {feedback.trainerResponse}
                          </Text>
                        </View>
                      ) : (
                        <View className="mt-3 flex-row items-center gap-2 rounded-[13px] bg-slate-50 px-3 py-2.5">
                          <SymbolView name={{ ios: "hourglass", android: "hourglass_empty", web: "hourglass_empty" }} size={14} tintColor="#94A3B8" />
                          <Text allowFontScaling={false} className="text-[10px] font-bold text-slate-500">En attente d’une réponse si nécessaire</Text>
                        </View>
                      )}

                      {feedback.createdAt ? (
                        <View className="mt-3 flex-row items-center gap-1.5">
                          <SymbolView name={{ ios: "calendar", android: "event", web: "event" }} size={12} tintColor="#94A3B8" />
                          <Text allowFontScaling={false} className="text-[10px] font-bold text-slate-400">
                            Envoyé le {formatDate(feedback.createdAt)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
            <Pagination page={safeFeedbackPage} totalPages={feedbackPages} onChange={setFeedbackPage} />
          </View>
        </View>

        <View className="mt-6">
          <View
            className="rounded-[22px] border p-3.5"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-amber-50">
                <SymbolView
                  name={{ ios: "star.fill", android: "star", web: "star" }}
                  size={20}
                  tintColor="#F59E0B"
                />
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Mes avis publiés
                </Text>
                <Text
                  className="mt-0.5 text-[12px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Tes notes et commentaires enregistrés sur les formations.
                </Text>
              </View>
              <View className="h-9 min-w-9 items-center justify-center rounded-[12px] bg-amber-50 px-3">
                <Text
                  allowFontScaling={false}
                  className="text-[12px] font-black text-amber-700"
                >
                  {reviews.length}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-3.5">
            {reviews.length === 0 ? (
              <View className="rounded-[22px] border p-5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
                <Text className="text-[16px] font-black" style={{ color: theme.colors.foreground }}>Aucun avis publié</Text>
                <Text className="mt-1 text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                  Tu peux évaluer une formation depuis l’onglet « Mon avis ».
                </Text>
              </View>
            ) : (
              visibleReviews.map((review) => (
                <View
                  key={review.id}
                  className="mb-3 overflow-hidden rounded-[22px] border"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    shadowColor: "#0F172A",
                    shadowOpacity: 0.035,
                    shadowRadius: 9,
                    shadowOffset: { width: 0, height: 4 },
                    elevation: 1,
                  }}
                >
                  <View className="p-4">
                    <View className="flex-row items-start gap-3">
                      <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-amber-50">
                        <Text allowFontScaling={false} className="text-[18px] font-black text-amber-500">★</Text>
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text className="text-[15px] font-black leading-[20px]" style={{ color: theme.colors.foreground }}>
                          {trainingTitles.get(review.trainingId) ?? "Formation associée"}
                        </Text>
                        <Text allowFontScaling={false} className="mt-1 text-[10px] font-bold" style={{ color: review.status === "HIDDEN" ? "#DC2626" : "#059669" }}>
                          {reviewStatusLabel(review.status)}
                        </Text>
                      </View>
                      <View className="shrink-0 rounded-[13px] bg-amber-50 px-3 py-2">
                        <View className="flex-row items-center gap-1">
                          <Text allowFontScaling={false} className="text-[17px] font-black text-amber-600">{review.rating}</Text>
                          <Text allowFontScaling={false} className="text-[10px] font-black text-amber-700">/5</Text>
                        </View>
                      </View>
                    </View>

                    <View className="mt-3 flex-row gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Text key={star} allowFontScaling={false} className="text-[15px]" style={{ color: star <= review.rating ? "#F59E0B" : "#E2E8F0" }}>★</Text>
                      ))}
                    </View>

                    {review.comment ? (
                      <View className="mt-3 rounded-[15px] bg-slate-50 px-3.5 py-3">
                        <Text className="text-[13px] leading-[19px]" style={{ color: theme.colors.foregroundMuted }}>
                          “{review.comment}”
                        </Text>
                      </View>
                    ) : null}

                    {review.updatedAt || review.createdAt ? (
                      <View className="mt-3 flex-row items-center gap-1.5">
                        <SymbolView name={{ ios: "clock", android: "schedule", web: "schedule" }} size={12} tintColor="#94A3B8" />
                        <Text allowFontScaling={false} className="text-[10px] font-bold text-slate-400">
                          Mis à jour le {formatDate(review.updatedAt ?? review.createdAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))
            )}
            <Pagination page={safeReviewPage} totalPages={reviewPages} onChange={setReviewPage} />
          </View>
        </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
