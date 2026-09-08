import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from "@mui/material";
import { Brain, Sparkles, TrendingUp } from "lucide-react";
import { getMyTrainings } from "../../api/trainingApi";
import {
  completeRecommendation,
  dismissRecommendation,
  getLearnerAiRiskPrediction,
  getLearnerAnalyticsSummary,
  getMyProgress,
  getMyRecommendations,
  getMyRiskIndicator,
} from "../../api/analyticsApi";
import { AnalyticsSummaryCards } from "../../components/analytics/AnalyticsSummaryCards";
import { ProgressTable } from "../../components/analytics/ProgressTable";
import { RecommendationWebCard } from "../../components/analytics/RecommendationWebCard";
import { RiskAiPanel } from "../../components/analytics/RiskAiPanel";
import { SmartPageHeader, SmartSectionCard } from "../../components/ui";
import { useAuth } from "../../features/auth/AuthContext";
import type {
  AiRiskPredictionResponse,
  LearnerAnalyticsSummaryResponse,
  LearnerProgressResponse,
  RecommendationResponse,
  RiskIndicatorResponse,
} from "../../types/analytics";
export function LearnerProgressPage() {
  const { user } = useAuth();
  const [summary, setSummary] =
    useState<LearnerAnalyticsSummaryResponse | null>(null);
  const [risk, setRisk] = useState<RiskIndicatorResponse | null>(null);
  const [ai, setAi] = useState<AiRiskPredictionResponse | null>(null);
  const [progress, setProgress] = useState<LearnerProgressResponse[]>([]);
  const [trainingTitles, setTrainingTitles] = useState<Map<number, string>>(
    new Map(),
  );
  const [recommendations, setRecommendations] = useState<
    RecommendationResponse[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [aiUnavailable, setAiUnavailable] = useState(false);

  async function load() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      setAiUnavailable(false);

      const [loadedProgress, loadedSummary, loadedRisk, loadedRecommendations] =
        await Promise.all([
          getMyProgress(),
          getLearnerAnalyticsSummary(user.id),
          getMyRiskIndicator(),
          getMyRecommendations(),
        ]);

      setProgress(loadedProgress);
      setSummary(loadedSummary);
      setRisk(loadedRisk);
      setRecommendations(loadedRecommendations);

      try {
        const loadedTrainings = await getMyTrainings();
        setTrainingTitles(
          new Map(
            loadedTrainings.map((training) => [training.id, training.title]),
          ),
        );
      } catch {
        setTrainingTitles(new Map());
      }

      if (loadedProgress.length > 0) {
        try {
          const prediction = await getLearnerAiRiskPrediction(
            user.id,
            loadedProgress[0].trainingId,
          );
          setAi(prediction);
        } catch {
          setAi(null);
          setAiUnavailable(true);
        }
      } else {
        setAi(null);
      }
    } catch {
      setError(
        "Impossible de charger la progression et les recommandations.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [user]);

  async function complete(id: number) {
    try {
      await completeRecommendation(id);
      await load();
    } catch {
      setError("Impossible de terminer la recommandation.");
    }
  }

  async function dismiss(id: number) {
    try {
      await dismissRecommendation(id);
      await load();
    } catch {
      setError("Impossible d’ignorer la recommandation.");
    }
  }

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: 320,
          display: "grid",
          placeItems: "center",
        }}
      >
        <Stack spacing={1.5} sx={{ alignItems: "center" }}>
          <CircularProgress size={30} />
          <Typography color="text.secondary">
            {"Chargement de votre progression..."}
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <SmartPageHeader
        eyebrow={"Mon apprentissage"}
        title={"Progression et recommandations"}
        description={
          "Suivez vos indicateurs p\u00e9dagogiques, votre niveau d'accompagnement et les actions propos\u00e9es pour poursuivre votre parcours."
        }
        actions={
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
            <Chip
              icon={<TrendingUp size={15} />}
              label={`${progress.length} formation${progress.length > 1 ? "s" : ""} suivie${progress.length > 1 ? "s" : ""}`}
              variant="outlined"
            />
            <Chip
              icon={<Sparkles size={15} />}
              label={`${recommendations.length} recommandation${recommendations.length > 1 ? "s" : ""}`}
              variant="outlined"
            />
          </Stack>
        }
      />

      {error ? <Alert severity="error">{error}</Alert> : null}

      {aiUnavailable ? (
        <Alert severity="info" icon={<Brain size={18} />}>
          {
            "L'analyse intelligente n'est pas disponible pour le moment. Vos autres indicateurs de progression restent accessibles."
          }
        </Alert>
      ) : null}

      {summary ? (
        <SmartSectionCard
          title={"Vue d'ensemble"}
          description={
            "Retrouvez les principaux indicateurs de votre activit\u00e9 d'apprentissage."
          }
        >
          <AnalyticsSummaryCards summary={summary} />
        </SmartSectionCard>
      ) : null}

      <SmartSectionCard
        title={"Accompagnement recommand\u00e9"}
        description={
          "Les signaux disponibles sont pr\u00e9sent\u00e9s comme des rep\u00e8res pour vous aider \u00e0 avancer dans votre parcours."
        }
      >
        <RiskAiPanel risk={risk} aiPrediction={ai} />
      </SmartSectionCard>

      <SmartSectionCard
        title={"Progression par formation"}
        description={
          "Consultez l'avancement enregistr\u00e9 pour chacun de vos parcours."
        }
      >
        <ProgressTable
          progressList={progress}
          trainingTitles={trainingTitles}
        />
      </SmartSectionCard>

      <SmartSectionCard
        title={"Mes recommandations"}
        description={
          "Ces actions transforment les indicateurs disponibles en prochaines \u00e9tapes concr\u00e8tes."
        }
      >
        {recommendations.length ? (
          <Stack spacing={1.5}>
            {recommendations.map((recommendation) => (
              <RecommendationWebCard
                key={recommendation.id}
                recommendation={recommendation}
                onComplete={complete}
                onDismiss={dismiss}
              />
            ))}
          </Stack>
        ) : (
          <Alert severity="info">
            {
              "Aucune recommandation n'est disponible pour le moment. Continuez votre parcours \u00e0 votre rythme."
            }
          </Alert>
        )}
      </SmartSectionCard>
    </Stack>
  );
}