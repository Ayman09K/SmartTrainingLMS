import { Href, router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import LearnerMyLearningPathCard from "../../components/learner/LearnerMyLearningPathCard";
import LearnerMyTrainingCard from "../../components/learner/LearnerMyTrainingCard";
import {
  getLearningPathCatalog,
  getMyAssignedLearningPaths,
} from "../../features/learningPaths/learningPathService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearningPathCatalog,
  LearningPathProgress,
} from "../../types/learningPath";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onOpenTraining: (trainingId: number) => void;
  onBackHome: () => void;
  onOpenCertificates: () => void;
};

export default function LearnerMyTrainingsScreen({
  onOpenTraining,
  onBackHome,
  onOpenCertificates,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [trainings, setTrainings] = useState<LearnerMyTraining[]>([]);
  const [paths, setPaths] = useState<LearningPathProgress[]>([]);
  const [catalog, setCatalog] = useState<LearningPathCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trainingError, setTrainingError] = useState("");
  // LEARNER_MY_TRAININGS_SEARCH_PARITY_V1
  const [trainingSearch, setTrainingSearch] = useState("");
  const [pathError, setPathError] = useState("");

  const catalogById = useMemo(
    () => new Map(catalog.map((item) => [item.id, item])),
    [catalog],
  );

  async function loadAll() {
    const [trainingResult, pathResult, catalogResult] =
      await Promise.allSettled([
        getMyLearnerTrainings(),
        getMyAssignedLearningPaths(),
        getLearningPathCatalog(),
      ]);

    if (trainingResult.status === "fulfilled") {
      setTrainings(trainingResult.value);
      setTrainingError("");
    } else {
      setTrainings([]);
      setTrainingError(
        "Impossible de charger tes formations. Réessaie dans quelques instants.",
      );
    }

    if (pathResult.status === "fulfilled") {
      setPaths(pathResult.value);
      setPathError("");
    } else {
      setPaths([]);
      setPathError(
        "Impossible de charger tes parcours affectés. Réessaie dans quelques instants.",
      );
    }

    if (catalogResult.status === "fulfilled") {
      setCatalog(catalogResult.value);
    } else {
      setCatalog([]);
    }
  }

  useFocusEffect(
    useCallback(() => {
    let active = true;

    void Promise.allSettled([
      getMyLearnerTrainings(),
      getMyAssignedLearningPaths(),
      getLearningPathCatalog(),
    ]).then(([trainingResult, pathResult, catalogResult]) => {
      if (!active) return;

      if (trainingResult.status === "fulfilled") {
        setTrainings(trainingResult.value);
        setTrainingError("");
      } else {
        setTrainings([]);
        setTrainingError(
          "Impossible de charger tes formations. Réessaie dans quelques instants.",
        );
      }

      if (pathResult.status === "fulfilled") {
        setPaths(pathResult.value);
        setPathError("");
      } else {
        setPaths([]);
        setPathError(
          "Impossible de charger tes parcours affectés. Réessaie dans quelques instants.",
        );
      }

      if (catalogResult.status === "fulfilled") {
        setCatalog(catalogResult.value);
      } else {
        setCatalog([]);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
    }, []),
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }

  function openLearningPath(pathId: number) {
    router.push(
      `/learner/learning-path-detail?pathId=${pathId}` as Href,
    );
  }


  const filteredTrainings = useMemo(() => {
    const normalized = trainingSearch.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return trainings;
    }

    return trainings.filter((training) =>
      [training.title, training.shortDescription, training.category]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("fr")
            .includes(normalized),
        ),
    );
  }, [trainingSearch, trainings]);

  // LEARNER_MY_LEARNING_GLOBAL_SEARCH_PARITY_V2
  const filteredPaths = useMemo(() => {
    const normalized = trainingSearch.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return paths;
    }

    return paths.filter((path) => {
      const pathCatalogItem = catalogById.get(path.pathId);
      const values = [
        path.pathTitle,
        pathCatalogItem?.shortDescription,
        pathCatalogItem?.description,
        ...path.trainings.map((item) => item.trainingTitle),
      ];

      return values
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLocaleLowerCase("fr")
            .includes(normalized),
        );
    });
  }, [catalogById, paths, trainingSearch]);
  if (loading) {
    return <LoadingState message="Chargement de ton apprentissage..." />;
  }

  return (
    <ScreenContainer>
      <FlatList
        style={styles.scrollArea}
        data={filteredTrainings}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        ListHeaderComponent={
          <View style={styles.pageHeader}>
            <View style={styles.topActions}>
              <AppButton
                title="Retour à l’accueil"
                onPress={onBackHome}
                variant="secondary"
                style={styles.homeButton}
              />
              <AppButton
                title="Mes certificats"
                onPress={onOpenCertificates}
                variant="secondary"
                style={styles.homeButton}
              />
            </View>

            <View
              style={[
                styles.introPanel,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <SectionHeader
                title="Mon apprentissage"
                subtitle="Retrouve tes parcours affectés et tes formations, suis ta progression et reprends là où tu t’es arrêté."
              />

              <View style={styles.summaryRow}>
                <View
                  style={[
                    styles.summary,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderRadius: theme.shape.controlRadius,
                    },
                  ]}
                >
                  <Text style={[styles.summaryValue, { color: theme.colors.accent }]}>
                    {paths.length}
                  </Text>
                  <Text style={[styles.summaryText, { color: theme.colors.foregroundMuted }]}>
                    {paths.length > 1 ? "parcours affectés" : "parcours affecté"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.summary,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderRadius: theme.shape.controlRadius,
                    },
                  ]}
                >
                  <Text style={[styles.summaryValue, { color: theme.colors.accent }]}>
                    {trainings.length}
                  </Text>
                  <Text style={[styles.summaryText, { color: theme.colors.foregroundMuted }]}>
                    {trainings.length > 1 ? "formations" : "formation"}
                  </Text>
                </View>
              </View>
            </View>

            <TextInput
              value={trainingSearch}
              onChangeText={setTrainingSearch}
              placeholder="Rechercher un parcours ou une formation"
              placeholderTextColor={theme.colors.foregroundSubtle}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Rechercher dans mon apprentissage"
              style={[
                styles.trainingSearch,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: theme.shape.borderWidth,
                  color: theme.colors.foreground,
                },
              ]}
            />
            {pathError ? (
              <ErrorMessage message={pathError} onRetry={() => void refresh()} />
            ) : null}

            <View style={styles.section}>
              <SectionHeader
                title="Mes parcours"
                subtitle="Tes parcours structurés, avec leur progression globale, leur échéance et la prochaine étape."
              />

              {filteredPaths.length === 0 ? (
                <View
                  style={[
                    styles.empty,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderRadius: theme.shape.cardRadius,
                      borderWidth: theme.shape.borderWidth,
                      padding: theme.shape.cardPadding,
                    },
                  ]}
                >
                  <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
                    {trainingSearch.trim() ? "Aucun parcours correspondant" : "Aucun parcours affecté"}
                  </Text>
                  <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>
un’un formateur ou un administrateur t’en affectera un.
                  </Text>
                </View>
              ) : (
                <View style={styles.pathList}>
                  {filteredPaths.map((path) => (
                    <LearnerMyLearningPathCard
                      key={path.pathId}
                      progress={path}
                      catalog={catalogById.get(path.pathId)}
                      onOpen={() => openLearningPath(path.pathId)}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <SectionHeader
                title="Mes formations"
                subtitle="Tes formations individuelles et celles rendues accessibles par tes affectations."
              />


              {trainingError ? (
                <ErrorMessage message={trainingError} onRetry={() => void refresh()} />
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View
            style={[
              styles.empty,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.colors.foreground }]}>
              {trainingSearch.trim() ? "Aucune formation correspondante" : "Aucune formation disponible"}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>
              Tes formations apparaîtront ici après une inscription, une affectation ou l’acceptation d’une invitation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <LearnerMyTrainingCard
            training={item}
            onOpen={() => onOpenTraining(item.id)}
          />
        )}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: theme.shape.cardPadding * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollArea: { flex: 1, minHeight: 0 },
  content: { width: "100%", maxWidth: 980, alignSelf: "center" },
  pageHeader: { width: "100%" },
  topActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  homeButton: { alignSelf: "flex-start" },
  introPanel: { marginBottom: 20 },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summary: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryValue: { fontSize: 21, fontWeight: "900" },
  summaryText: { fontSize: 14, fontWeight: "700" },
  trainingSearch: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    marginBottom: 4,
  },
  section: { marginBottom: 24 },
  pathList: { width: "100%" },
  empty: { marginBottom: 16 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 6,
  },
  emptyText: { fontSize: 14, lineHeight: 20 },
});
