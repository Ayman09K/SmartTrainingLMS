import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SectionHeader from "../../components/SectionHeader";
import CatalogLearningPathCard from "../../components/learner/CatalogLearningPathCard";
import CatalogTrainingCard from "../../components/learner/CatalogTrainingCard";
import {
  getLearningPathCatalog,
} from "../../features/learningPaths/learningPathService";
import {
  enrollWithAccessCode,
  getLearnerAccessRequests,
  getLearnerCatalog,
  getLearnerEnrollments,
  requestTrainingAccess,
  selfEnroll,
} from "../../features/trainings/catalogService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearningPathCatalog } from "../../types/learningPath";
import {
  LearnerAccessRequest,
  LearnerCatalogTraining,
  LearnerEnrollment,
} from "../../types/learnerCatalog";

type TrainingCatalogScreenProps = {
  learnerId: number;
  onOpenTraining: (trainingId: number) => void;
  onOpenLearningPath: (pathId: number) => void;
};

function apiErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const candidate = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
        };
      };
    };

    const backendMessage =
      candidate.response?.data?.message ||
      candidate.response?.data?.error;

    if (backendMessage) {
      return backendMessage;
    }
  }

  return "L\u2019action n\u2019a pas pu \u00EAtre r\u00E9alis\u00E9e. R\u00E9essaie dans quelques instants.";
}

export default function TrainingCatalogScreen({
  learnerId,
  onOpenTraining,
  onOpenLearningPath,
}: TrainingCatalogScreenProps) {
  const { theme } = useSmartTrainingTheme();

  const [trainings, setTrainings] = useState<LearnerCatalogTraining[]>([]);
  const [learningPaths, setLearningPaths] =
    useState<LearningPathCatalog[]>([]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [enrollments, setEnrollments] = useState<LearnerEnrollment[]>([]);
  const [requests, setRequests] = useState<LearnerAccessRequest[]>([]);
  const [accessCodes, setAccessCodes] = useState<Record<number, string>>({});
  const [accessMessages, setAccessMessages] =
    useState<Record<number, string>>({});
  const [busyTrainingId, setBusyTrainingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    void Promise.all([
      getLearnerCatalog(),
      getLearningPathCatalog(),
      getLearnerEnrollments(learnerId),
      getLearnerAccessRequests(learnerId),
    ])
      .then(
        ([
          catalog,
          pathCatalog,
          learnerEnrollments,
          learnerRequests,
        ]) => {
        if (!active) return;

        setTrainings(catalog);
        setLearningPaths(pathCatalog);
        setEnrollments(learnerEnrollments);
        setRequests(learnerRequests);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMessage(apiErrorMessage(error));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [learnerId]);

  const enrolledTrainingIds = useMemo(
    () =>
      new Set(
        enrollments
          .filter((enrollment) => enrollment.status !== "CANCELLED")
          .map((enrollment) => enrollment.trainingId),
      ),
    [enrollments],
  );

  const pendingRequestTrainingIds = useMemo(
    () =>
      new Set(
        requests
          .filter((request) => request.status === "PENDING")
          .map((request) => request.trainingId),
      ),
    [requests],
  );


  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.category?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const levels = useMemo(
    () =>
      Array.from(
        new Set(
          trainings
            .map((training) => training.level?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [trainings],
  );

  const visibleTrainings = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    return trainings.filter((training) => {
      const queryMatches =
        !normalized ||
        [
          training.title,
          training.shortDescription,
          training.description,
          training.category,
          training.level,
        ]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(normalized);

      const categoryMatches =
        categoryFilter === "ALL" ||
        training.category === categoryFilter;
      const levelMatches =
        levelFilter === "ALL" ||
        training.level === levelFilter;

      return queryMatches && categoryMatches && levelMatches;
    });
  }, [
    categoryFilter,
    levelFilter,
    query,
    trainings,
  ]);

  const visibleLearningPaths = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");

    if (!normalized) {
      return learningPaths;
    }

    return learningPaths.filter((path) =>
      [
        path.title,
        path.shortDescription,
        path.description,
        path.objectives,
        ...path.trainings.map(
          (training) => training.trainingTitle,
        ),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("fr")
        .includes(normalized),
    );
  }, [learningPaths, query]);

  async function refreshCatalog() {
    try {
      setRefreshing(true);
      setErrorMessage("");

      const [
        catalog,
        pathCatalog,
        learnerEnrollments,
        learnerRequests,
      ] = await Promise.all([
        getLearnerCatalog(),
        getLearningPathCatalog(),
        getLearnerEnrollments(learnerId),
        getLearnerAccessRequests(learnerId),
      ]);

      setTrainings(catalog);
      setLearningPaths(pathCatalog);
      setEnrollments(learnerEnrollments);
      setRequests(learnerRequests);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSelfEnroll(training: LearnerCatalogTraining) {
    try {
      setBusyTrainingId(training.id);
      setErrorMessage("");
      setSuccessMessage("");

      const enrollment = await selfEnroll(training.id);

      setEnrollments((current) => [
        ...current.filter((item) => item.trainingId !== training.id),
        enrollment,
      ]);

      setSuccessMessage(
        `Inscription confirm\u00E9e : ${training.title} est maintenant disponible dans tes formations.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyTrainingId(null);
    }
  }

  async function handleAccessCodeEnroll(
    training: LearnerCatalogTraining,
  ) {
    const accessCode = accessCodes[training.id]?.trim() || "";

    if (!accessCode) {
      setErrorMessage(
        "Saisis le code d\u2019acc\u00E8s de la formation.",
      );
      return;
    }

    try {
      setBusyTrainingId(training.id);
      setErrorMessage("");
      setSuccessMessage("");

      const enrollment = await enrollWithAccessCode(
        training.id,
        accessCode,
      );

      setEnrollments((current) => [
        ...current.filter((item) => item.trainingId !== training.id),
        enrollment,
      ]);

      setAccessCodes((current) => ({
        ...current,
        [training.id]: "",
      }));

      setSuccessMessage(
        `Code valid\u00E9 : ${training.title} est maintenant disponible dans tes formations.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyTrainingId(null);
    }
  }

  async function handleRequestAccess(
    training: LearnerCatalogTraining,
  ) {
    try {
      setBusyTrainingId(training.id);
      setErrorMessage("");
      setSuccessMessage("");

      const request = await requestTrainingAccess(
        training.id,
        accessMessages[training.id],
      );

      setRequests((current) => [
        ...current.filter((item) => item.trainingId !== training.id),
        request,
      ]);

      setAccessMessages((current) => ({
        ...current,
        [training.id]: "",
      }));

      setSuccessMessage(
        `Demande envoy\u00E9e pour ${training.title}.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyTrainingId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement du catalogue..." />;
  }

  return (
    <ScrollView
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      contentContainerStyle={[
        styles.content,
        {
          padding: theme.shape.cardPadding,
          paddingBottom: theme.shape.cardPadding * 2,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void refreshCatalog()}
          tintColor={theme.colors.accent}
        />
      }
    >
      <View style={styles.page}>
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
            title="Catalogue"
            subtitle={
              "D\u00E9couvre les formations et les parcours disponibles dans ton catalogue."
            }
          />

          <View
            style={[
              styles.catalogSummary,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.controlRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.catalogSummaryValue,
                {
                  color: theme.colors.accent,
                },
              ]}
            >
              {trainings.length + learningPaths.length}
            </Text>
            <Text
              style={[
                styles.catalogSummaryText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              contenus disponibles
            </Text>
          </View>
        </View>


        {trainings.length ? (
          <View
            style={[
              styles.filterPanel,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <TextInput
              accessibilityLabel="Rechercher une formation ou un parcours"
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une formation ou un parcours..."
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[
                styles.searchInput,
                {
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.controlRadius,
                },
              ]}
            />

            <View style={styles.filterToolbar}>
              <View style={styles.filterToolbarCopy}>
                <Text
                  style={[
                    styles.filterToolbarTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Filtres
                </Text>
                <Text
                  style={[
                    styles.filterToolbarHint,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Catégorie et niveau
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  filtersExpanded ? "Masquer les filtres" : "Afficher les filtres"
                }
                accessibilityState={{ expanded: filtersExpanded }}
                onPress={() => setFiltersExpanded((current) => !current)}
                style={({ pressed }) => [
                  styles.filterToggle,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                  pressed ? styles.filterChipPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.filterToggleText,
                    { color: theme.colors.accent },
                  ]}
                >
                  {filtersExpanded ? "Masquer" : "Afficher"}
                </Text>
              </Pressable>
            </View>

            {!filtersExpanded &&
            (categoryFilter !== "ALL" || levelFilter !== "ALL") ? (
              <Text
                numberOfLines={2}
                style={[
                  styles.activeFilterSummary,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {`Filtres actifs : ${
                  categoryFilter === "ALL" ? "toutes catégories" : categoryFilter
                } · ${
                  levelFilter === "ALL" ? "tous niveaux" : levelFilter
                }`}
              </Text>
            ) : null}

            {filtersExpanded ? (
              <>
                <Text
                  style={[
                    styles.filterLabel,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Catégorie
                </Text>

                <View style={styles.filterChips}>
                  {["ALL", ...categories].map((value) => {
                    const selected = categoryFilter === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        onPress={() => setCategoryFilter(value)}
                        style={({ pressed }) => [
                          styles.filterChip,
                          {
                            backgroundColor: selected
                              ? theme.colors.accent
                              : theme.colors.surfaceSoft,
                            borderColor: selected
                              ? theme.colors.accent
                              : theme.colors.border,
                          },
                          pressed ? styles.filterChipPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            {
                              color: selected
                                ? theme.colors.accentForeground
                                : theme.colors.foreground,
                            },
                          ]}
                        >
                          {value === "ALL" ? "Toutes" : value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text
                  style={[
                    styles.filterLabel,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Niveau
                </Text>

                <View style={styles.filterChips}>
                  {["ALL", ...levels].map((value) => {
                    const selected = levelFilter === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        onPress={() => setLevelFilter(value)}
                        style={({ pressed }) => [
                          styles.filterChip,
                          {
                            backgroundColor: selected
                              ? theme.colors.accent
                              : theme.colors.surfaceSoft,
                            borderColor: selected
                              ? theme.colors.accent
                              : theme.colors.border,
                          },
                          pressed ? styles.filterChipPressed : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            {
                              color: selected
                                ? theme.colors.accentForeground
                                : theme.colors.foreground,
                            },
                          ]}
                        >
                          {value === "ALL" ? "Tous" : value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={[styles.resultCount, { color: theme.colors.foregroundMuted }]}>
              {visibleTrainings.length} formation
              {visibleTrainings.length > 1 ? "s" : ""} affichée
              {visibleTrainings.length > 1 ? "s" : ""}
            </Text>
          </View>
        ) : null}

        {successMessage ? (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.success,
                borderRadius: theme.shape.controlRadius,
                borderWidth: Math.max(
                  1,
                  theme.shape.borderWidth,
                ),
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.feedbackTitle,
                {
                  color: theme.colors.success,
                },
              ]}
            >
              {"C\u2019est fait"}
            </Text>
            <Text
              style={[
                styles.feedbackText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {successMessage}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <ErrorMessage
            title="Action impossible"
            message={errorMessage}
            onRetry={() => void refreshCatalog()}
          />
        ) : null}


        {trainings.length > 0 && visibleTrainings.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
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
              Aucune formation correspondante
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.foregroundMuted }]}>
              Modifie la recherche, la catégorie ou le niveau.
            </Text>
          </View>
        ) : null}

        {trainings.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.emptyTitle,
                {
                  color: theme.colors.foreground,
                },
              ]}
            >
              Aucune formation disponible
            </Text>
            <Text
              style={[
                styles.emptyText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {
                "Le catalogue ne contient actuellement aucune formation publique publi\u00E9e."
              }
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {visibleTrainings.map((training) => (
              <CatalogTrainingCard
                key={training.id}
                training={training}
                enrolled={enrolledTrainingIds.has(training.id)}
                pendingRequest={pendingRequestTrainingIds.has(
                  training.id,
                )}
                busy={busyTrainingId === training.id}
                accessCode={accessCodes[training.id] || ""}
                accessMessage={
                  accessMessages[training.id] || ""
                }
                onAccessCodeChange={(value) =>
                  setAccessCodes((current) => ({
                    ...current,
                    [training.id]: value,
                  }))
                }
                onAccessMessageChange={(value) =>
                  setAccessMessages((current) => ({
                    ...current,
                    [training.id]: value,
                  }))
                }
                onSelfEnroll={() =>
                  void handleSelfEnroll(training)
                }
                onAccessCodeEnroll={() =>
                  void handleAccessCodeEnroll(training)
                }
                onRequestAccess={() =>
                  void handleRequestAccess(training)
                }
                onOpenTraining={() => onOpenTraining(training.id)}
              />
            ))}
          </View>
        )}

        <View style={styles.pathSection}>
          <SectionHeader
            title="Parcours"
            subtitle={
              "Des s\u00E9quences de formations organis\u00E9es par ton \u00E9quipe p\u00E9dagogique."
            }
          />

          {learningPaths.length > 0 &&
          visibleLearningPaths.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun parcours correspondant
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Modifie la recherche pour afficher d\u2019autres parcours.
              </Text>
            </View>
          ) : learningPaths.length === 0 ? (
            <View
              style={[
                styles.emptyBox,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun parcours disponible
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Les parcours publics ou qui te sont affect\u00E9s
                appara\u00EEtront ici.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {visibleLearningPaths.map((path) => (
                <CatalogLearningPathCard
                  key={path.id}
                  path={path}
                  onOpen={() =>
                    onOpenLearningPath(path.id)
                  }
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  introPanel: {
    marginBottom: 22,
  },
  catalogSummary: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  catalogSummaryValue: {
    fontSize: 21,
    fontWeight: "900",
  },
  catalogSummaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  feedbackBox: {
    marginBottom: 18,
  },
  feedbackTitle: {
    fontWeight: "900",
    marginBottom: 5,
  },
  feedbackText: {
    lineHeight: 20,
  },

  filterPanel: {
    marginBottom: 14,
  },
  searchInput: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  filterToolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  filterToolbarCopy: {
    flex: 1,
    minWidth: 0,
  },
  filterToolbarTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  filterToolbarHint: {
    fontSize: 10,
    marginTop: 1,
  },
  filterToggle: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterToggleText: {
    fontSize: 11,
    fontWeight: "900",
  },
  activeFilterSummary: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  filterLabel: {
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
    marginTop: 10,
  },
  filterChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 7,
  },
  filterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  filterChipPressed: {
    opacity: 0.8,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: "800",
  },
  resultCount: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 8,
  },
  list: {
    width: "100%",
  },
  pathSection: {
    marginTop: 28,
  },
  emptyBox: {
    width: "100%",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    lineHeight: 21,
  },
});