import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import QuizCard from "../../components/evaluation/QuizCard";
import {
  getPublishedQuizzesByTraining,
  getQuizFullDetails,
} from "../../features/evaluation/evaluationService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { Quiz } from "../../types/evaluation";

const PAGE_SIZE = 3;

type StatTileProps = {
  icon: React.ComponentProps<typeof SymbolView>["name"];
  value: string | number;
  label: string;
  tint: string;
};

function StatTile({ icon, value, label, tint }: StatTileProps) {
  return (
    <View className="min-w-0 flex-1 rounded-[18px] bg-white/10 px-2 py-2.5">
      <View className="items-center">
        <SymbolView name={icon} size={15} tintColor={tint} weight="semibold" />
        <Text
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          className="mt-1.5 text-center text-[16px] font-black leading-[18px]"
          style={{ color: "#FFFFFF" }}
        >
          {value}
        </Text>
        <Text
          maxFontSizeMultiplier={1}
          numberOfLines={1}
          className="mt-0.5 text-center text-[9px] font-bold leading-[12px]"
          style={{ color: "rgba(255,255,255,0.70)" }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
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
  const { theme } = useSmartTrainingTheme();

  if (totalPages <= 1) return null;

  return (
    <View
      className="mt-4 flex-row items-center justify-between rounded-[20px] border px-3 py-2.5"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Page précédente"
        disabled={page <= 1}
        onPress={() => onChange(Math.max(1, page - 1))}
        className="h-10 w-10 items-center justify-center rounded-[13px] active:opacity-70 disabled:opacity-30"
        style={{ backgroundColor: theme.colors.surfaceSoft }}
      >
        <SymbolView
          name="chevron.left"
          size={15}
          weight="bold"
          tintColor={theme.colors.foreground}
        />
      </Pressable>

      <View className="flex-row items-center gap-2">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (candidate) => {
            const selected = candidate === page;
            return (
              <Pressable
                key={candidate}
                accessibilityRole="button"
                accessibilityLabel={`Page ${candidate}`}
                accessibilityState={{ selected }}
                onPress={() => onChange(candidate)}
                className="h-10 min-w-10 items-center justify-center rounded-[13px] px-3 active:opacity-75"
                style={{
                  backgroundColor: selected
                    ? theme.colors.accent
                    : theme.colors.surfaceSoft,
                }}
              >
                <Text
                  maxFontSizeMultiplier={1}
                  className="text-[13px] font-black"
                  style={{
                    color: selected
                      ? theme.colors.accentForeground
                      : theme.colors.foregroundMuted,
                  }}
                >
                  {candidate}
                </Text>
              </Pressable>
            );
          },
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Page suivante"
        disabled={page >= totalPages}
        onPress={() => onChange(Math.min(totalPages, page + 1))}
        className="h-10 w-10 items-center justify-center rounded-[13px] active:opacity-70 disabled:opacity-30"
        style={{ backgroundColor: theme.colors.surfaceSoft }}
      >
        <SymbolView
          name="chevron.right"
          size={15}
          weight="bold"
          tintColor={theme.colors.foreground}
        />
      </Pressable>
    </View>
  );
}

export default function QuizListScreen({
  trainingId,
  onOpenQuiz,
}: {
  trainingId: number;
  onOpenQuiz: (id: number) => void;
  onBack: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<number, number | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);

  const loadRealQuizData = useCallback(async (): Promise<{
    quizzes: Quiz[];
    questionCounts: Record<number, number | null>;
  }> => {
    const published = await getPublishedQuizzesByTraining(trainingId);

    const detailResults = await Promise.allSettled(
      published.map((quiz) => getQuizFullDetails(quiz.id)),
    );

    const counts: Record<number, number | null> = {};
    const hydrated = published.map((quiz, index) => {
      const detailResult = detailResults[index];

      if (detailResult.status === "fulfilled") {
        const fullQuiz = detailResult.value;
        counts[quiz.id] = fullQuiz.questions.length;
        return { ...quiz, ...fullQuiz };
      }

      // Never invent a 0 when the detail endpoint could not be read.
      counts[quiz.id] = null;
      return quiz;
    });

    return { quizzes: hydrated, questionCounts: counts };
  }, [trainingId]);

  useEffect(() => {
    let active = true;

    void loadRealQuizData()
      .then((data) => {
        if (active) {
          setQuizzes(data.quizzes);
          setQuestionCounts(data.questionCounts);
          setPage(1);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les quiz de cette formation.");
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
  }, [loadRealQuizData]);

  async function refresh(): Promise<void> {
    try {
      setRefreshing(true);
      setError("");
      const data = await loadRealQuizData();
      setQuizzes(data.quizzes);
      setQuestionCounts(data.questionCounts);
      setPage(1);
    } catch {
      setError("Impossible d’actualiser les quiz.");
    } finally {
      setRefreshing(false);
    }
  }

  const averageDuration = useMemo(() => {
    if (quizzes.length === 0) return 0;
    return Math.round(
      quizzes.reduce((sum, quiz) => sum + quiz.timeLimitMinutes, 0) /
        quizzes.length,
    );
  }, [quizzes]);

  const averagePassingScore = useMemo(() => {
    if (quizzes.length === 0) return 0;
    return Math.round(
      quizzes.reduce((sum, quiz) => sum + quiz.passingScore, 0) /
        quizzes.length,
    );
  }, [quizzes]);

  const totalPages = Math.max(1, Math.ceil(quizzes.length / PAGE_SIZE));
  const visibleQuizzes = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return quizzes.slice(start, start + PAGE_SIZE);
  }, [page, quizzes]);

  if (loading) {
    return <LoadingState message="Chargement des quiz..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: theme.colors.background }}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[14px] pb-8 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[760px] self-center">
          <View
            className="relative mb-5 overflow-hidden rounded-[26px] px-5 pb-4 pt-5"
            style={{
              minHeight: 218,
              backgroundColor: "#172554",
              shadowColor: "#0F172A",
              shadowOpacity: 0.16,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 10 },
              elevation: 5,
            }}
          >
            <View className="absolute -right-14 -top-14 h-48 w-48 rounded-full bg-violet-500/20" />
            <View className="absolute right-14 top-20 h-24 w-24 rounded-full bg-blue-400/10" />
            <View className="absolute -left-10 bottom-2 h-32 w-32 rounded-full bg-indigo-300/10" />

            <View className="flex-row items-start">
              <View className="min-w-0 flex-1 pr-1">
                <Text
                  maxFontSizeMultiplier={1}
                  className="text-[11px] font-black uppercase tracking-[2px]"
                  style={{ color: "#C7D2FE" }}
                >
                  Évaluation
                </Text>
                <Text
                  className="mt-2 text-[27px] font-black leading-[32px]"
                  style={{ color: "#FFFFFF" }}
                >
                  Quiz de la formation
                </Text>
                <Text
                  className="mt-2 max-w-[250px] text-[14px] leading-[21px]"
                  style={{ color: "rgba(255,255,255,0.74)" }}
                >
                  Teste tes connaissances, valide tes acquis et mesure ta progression.
                </Text>
              </View>

              <Image
                source={require("../../../assets/images/quiz-learner.png")}
                resizeMode="contain"
                style={{ width: 108, height: 132, marginRight: -10, marginTop: -4 }}
              />
            </View>

            <View className="mt-3 flex-row gap-2.5">
              <StatTile
                icon="square.stack.3d.up.fill"
                value={quizzes.length}
                label="Quiz"
                tint="#C7D2FE"
              />
              <StatTile
                icon="clock.fill"
                value={`${averageDuration} min`}
                label="Durée moy."
                tint="#FBBF24"
              />
              <StatTile
                icon="scope"
                value={`${averagePassingScore}%`}
                label="Score cible"
                tint="#67E8F9"
              />
            </View>
          </View>

          <View className="mb-3 flex-row items-end justify-between gap-3">
            <View className="min-w-0 flex-1">
              <Text
                className="text-[24px] font-black leading-[29px]"
                style={{ color: theme.colors.foreground }}
              >
                Tes quiz disponibles
              </Text>
              <Text
                className="mt-1 text-[14px] leading-[21px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Choisis une évaluation pour commencer.
              </Text>
            </View>

            <View
              className="h-10 min-w-10 items-center justify-center rounded-full px-3"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <Text
                maxFontSizeMultiplier={1}
                className="text-[15px] font-black"
                style={{ color: theme.colors.accent }}
              >
                {quizzes.length}
              </Text>
            </View>
          </View>

          {error ? (
            <View className="mb-4">
              <ErrorMessage message={error} onRetry={refresh} />
            </View>
          ) : null}

          {quizzes.length === 0 ? (
            <View
              className="rounded-[24px] border p-5"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <View
                className="mb-4 h-14 w-14 items-center justify-center rounded-[18px]"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name="doc.text.magnifyingglass"
                  size={23}
                  weight="semibold"
                  tintColor={theme.colors.accent}
                />
              </View>
              <Text
                className="text-[19px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucun quiz disponible
              </Text>
              <Text
                className="mt-2 text-[14px] leading-[21px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucun quiz publié n’est actuellement accessible pour cette formation.
              </Text>
            </View>
          ) : (
            <View className="gap-3.5">
              {visibleQuizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  quiz={quiz}
                  questionCount={questionCounts[quiz.id] ?? null}
                  onPress={() => onOpenQuiz(quiz.id)}
                />
              ))}
            </View>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
