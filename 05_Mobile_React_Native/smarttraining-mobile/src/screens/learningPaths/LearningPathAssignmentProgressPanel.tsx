import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import StatusBadge from "../../components/StatusBadge";
import {
  getAdminGroups,
} from "../../features/admin/adminGroupService";
import {
  assignLearningPathToGroup,
  assignLearningPathToLearners,
  getLearningPathGroupAssignments,
  getLearningPathLearnerAssignments,
  getManagedLearningPathProgress,
  resolveLearningPathLearners,
  searchLearningPathLearners,
} from "../../features/learningPaths/learningPathService";
import {
  getTrainerGroups,
} from "../../features/trainer/trainerGroupService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearningPathAssignmentResult,
  LearningPathGroupAssignmentRecord,
  LearningPathLearnerAssignmentRecord,
  LearningPathLearnerIdentity,
  LearningPathProgress,
  LearningPathStatus,
} from "../../types/learningPath";

type Role = "FORMATEUR" | "ADMIN";

type Props = {
  role: Role;
  pathId: number;
  pathStatus: LearningPathStatus;
};

type GroupChoice = {
  id: number;
  name: string;
  memberCount: number;
};

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function learnerDisplayName(
  learner?: LearningPathLearnerIdentity,
): string {
  if (!learner) {
    return "Apprenant";
  }

  const name =
    learner.fullName ||
    learner.name ||
    [learner.firstName, learner.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name || learner.email || "Apprenant";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function dueAtForApi(
  value: string,
): { dueAt?: string; error?: string } {
  const trimmed = value.trim();

  if (!trimmed) {
    return {};
  }

  const normalized =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
      ? `${trimmed}:00`
      : trimmed;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return {
      error:
        "Échéance invalide. Format attendu : AAAA-MM-JJTHH:mm",
    };
  }

  if (date.getTime() <= Date.now()) {
    return {
      error: "L’échéance doit être dans le futur.",
    };
  }

  return { dueAt: normalized };
}

function sourceLabel(value?: string | null): string {
  if (value === "DIRECT") {
    return "Affectation directe";
  }

  if (value === "GROUP") {
    return "Groupe / cohorte";
  }

  return value || "Affectation";
}

function assignmentSummary(
  result: LearningPathAssignmentResult,
): string {
  return [
    `${result.totalLearners} apprenant(s) traité(s)`,
    `${result.pathAssignmentsCreated} affectation(s) Parcours créée(s)`,
    `${result.newEnrollments} nouvelle(s) inscription(s) Formation`,
    `${result.alreadyEnrolled} déjà inscrit(s)`,
  ].join(" · ");
}

export default function LearningPathAssignmentProgressPanel({
  role,
  pathId,
  pathStatus,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [groups, setGroups] = useState<GroupChoice[]>([]);
  const [selectedGroupId, setSelectedGroupId] =
    useState<number | null>(null);
  const [groupDueAt, setGroupDueAt] = useState("");

  const [learnerQuery, setLearnerQuery] = useState("");
  const [searchResults, setSearchResults] =
    useState<LearningPathLearnerIdentity[]>([]);
  const [selectedLearnerIds, setSelectedLearnerIds] =
    useState<number[]>([]);
  const [learnerDueAt, setLearnerDueAt] = useState("");

  const [learnerAssignments, setLearnerAssignments] =
    useState<LearningPathLearnerAssignmentRecord[]>([]);
  const [groupAssignments, setGroupAssignments] =
    useState<LearningPathGroupAssignmentRecord[]>([]);
  const [progressItems, setProgressItems] =
    useState<LearningPathProgress[]>([]);
  const [identities, setIdentities] =
    useState<LearningPathLearnerIdentity[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(false);
  const [searching, setSearching] = useState(false);
  const [assigningLearners, setAssigningLearners] =
    useState(false);
  const [assigningGroup, setAssigningGroup] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const enabled = pathStatus === "PUBLISHED";

  const identityById = useMemo(
    () =>
      new Map(
        identities.map((identity) => [
          identity.id,
          identity,
        ]),
      ),
    [identities],
  );

  const groupById = useMemo(
    () =>
      new Map(
        groups.map((group) => [group.id, group]),
      ),
    [groups],
  );

  const loadGroups = useCallback(async () => {
    const loaded =
      role === "ADMIN"
        ? await getAdminGroups()
        : await getTrainerGroups();

    return loaded.map((group) => ({
      id: group.id,
      name: group.name,
      memberCount: group.memberCount,
    }));
  }, [role]);

  const loadOverview = useCallback(async () => {
    if (pathStatus === "DRAFT") {
      setGroups([]);
      setLearnerAssignments([]);
      setGroupAssignments([]);
      setProgressItems([]);
      setIdentities([]);
      return;
    }

    setLoadingOverview(true);

    try {
      const [
        loadedGroups,
        loadedLearnerAssignments,
        loadedGroupAssignments,
        loadedProgress,
      ] = await Promise.all([
        loadGroups(),
        getLearningPathLearnerAssignments(pathId),
        getLearningPathGroupAssignments(pathId),
        getManagedLearningPathProgress(pathId),
      ]);

      const learnerIds = Array.from(
        new Set([
          ...loadedLearnerAssignments.map(
            (item) => item.learnerId,
          ),
          ...loadedProgress.map(
            (item) => item.learnerId,
          ),
        ]),
      );

      const loadedIdentities =
        await resolveLearningPathLearners(learnerIds);

      setGroups(loadedGroups);
      setLearnerAssignments(loadedLearnerAssignments);
      setGroupAssignments(loadedGroupAssignments);
      setProgressItems(loadedProgress);
      setIdentities(loadedIdentities);
      setError("");
    } catch {
      setError(
        "Impossible de charger les affectations ou la progression du parcours.",
      );
    } finally {
      setLoadingOverview(false);
    }
  }, [loadGroups, pathId, pathStatus]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  function toggleLearner(
    learner: LearningPathLearnerIdentity,
  ) {
    setSuccess("");

    setSelectedLearnerIds((current) => {
      if (current.includes(learner.id)) {
        return current.filter(
          (learnerId) => learnerId !== learner.id,
        );
      }

      return [...current, learner.id];
    });
  }

  async function searchLearners() {
    const query = learnerQuery.trim();

    if (!query) {
      setSearchResults([]);
      setError("Saisissez un nom ou une adresse e-mail.");
      return;
    }

    setSearching(true);
    setError("");
    setSuccess("");

    try {
      const loaded = await searchLearningPathLearners(
        query,
        20,
      );

      setSearchResults(loaded);
    } catch {
      setError("Impossible de rechercher les apprenants.");
    } finally {
      setSearching(false);
    }
  }

  async function assignLearners() {
    if (!enabled) {
      setError(
        "Le parcours doit être publié avant une affectation.",
      );
      return;
    }

    if (selectedLearnerIds.length === 0) {
      setError("Sélectionnez au moins un apprenant.");
      return;
    }

    const due = dueAtForApi(learnerDueAt);

    if (due.error) {
      setError(due.error);
      return;
    }

    setAssigningLearners(true);
    setError("");
    setSuccess("");

    try {
      const result = await assignLearningPathToLearners(
        pathId,
        {
          learnerIds: selectedLearnerIds,
          dueAt: due.dueAt,
        },
      );

      setSuccess(assignmentSummary(result));
      setSelectedLearnerIds([]);
      setSearchResults([]);
      setLearnerQuery("");
      await loadOverview();
    } catch {
      setError(
        "Impossible d’affecter le parcours aux apprenants sélectionnés.",
      );
    } finally {
      setAssigningLearners(false);
    }
  }

  async function assignGroup() {
    if (!enabled) {
      setError(
        "Le parcours doit être publié avant une affectation.",
      );
      return;
    }

    if (!selectedGroupId) {
      setError("Sélectionnez un groupe.");
      return;
    }

    const due = dueAtForApi(groupDueAt);

    if (due.error) {
      setError(due.error);
      return;
    }

    setAssigningGroup(true);
    setError("");
    setSuccess("");

    try {
      const result = await assignLearningPathToGroup(
        pathId,
        selectedGroupId,
        {
          dueAt: due.dueAt,
        },
      );

      setSuccess(assignmentSummary(result));
      await loadOverview();
    } catch {
      setError(
        "Impossible d’affecter le parcours au groupe sélectionné.",
      );
    } finally {
      setAssigningGroup(false);
    }
  }

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.shape.cardRadius,
          },
        ]}
      >
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Affectations
            </Text>

            <Text
              style={[
                styles.helpText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Affectez ce parcours par nom/e-mail ou via un groupe existant. Aucun identifiant apprenant manuel n’est demandé.
            </Text>
          </View>

          <StatusBadge
            label={enabled ? "Publié" : pathStatus === "ARCHIVED" ? "Archivé" : "Brouillon"}
            variant={
              enabled
                ? "success"
                : pathStatus === "ARCHIVED"
                  ? "info"
                  : "warning"
            }
          />
        </View>

        {pathStatus === "DRAFT" ? (
          <View
            style={[
              styles.notice,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Publiez le parcours avant de l’affecter. Les formations et le cycle de vie restent gérés par les règles P1/P2 existantes.
            </Text>
          </View>
        ) : (
          <>
            {error ? <ErrorMessage message={error} /> : null}

            {success ? (
              <View
                style={[
                  styles.successBox,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.success,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.successTitle,
                    { color: theme.colors.success },
                  ]}
                >
                  Affectation terminée
                </Text>
                <Text
                  style={[
                    styles.successText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {success}
                </Text>
              </View>
            ) : null}

            {enabled ? (
              <>
                <View style={styles.subSection}>
                  <Text
                    style={[
                      styles.subTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Apprenants
                  </Text>

                  <TextInput
                    value={learnerQuery}
                    onChangeText={setLearnerQuery}
                    placeholder="Nom ou e-mail"
                    placeholderTextColor={
                      theme.colors.foregroundSubtle
                    }
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        color: theme.colors.foreground,
                        backgroundColor:
                          theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  />

                  <AppButton
                    title={
                      searching
                        ? "Recherche..."
                        : "Rechercher"
                    }
                    loading={searching}
                    onPress={() => void searchLearners()}
                    variant="secondary"
                    style={styles.searchButton}
                  />

                  {searchResults.length ? (
                    <View style={styles.choiceList}>
                      {searchResults.map((learner) => {
                        const selected =
                          selectedLearnerIds.includes(
                            learner.id,
                          );

                        return (
                          <Pressable
                            key={learner.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() =>
                              toggleLearner(learner)
                            }
                            style={[
                              styles.choiceCard,
                              {
                                backgroundColor: selected
                                  ? theme.colors.surfaceElevated
                                  : theme.colors.background,
                                borderColor: selected
                                  ? theme.colors.accent
                                  : theme.colors.border,
                              },
                            ]}
                          >
                            <View style={styles.choiceCopy}>
                              <Text
                                style={[
                                  styles.choiceTitle,
                                  {
                                    color:
                                      theme.colors.foreground,
                                  },
                                ]}
                              >
                                {learnerDisplayName(learner)}
                              </Text>
                              <Text
                                style={[
                                  styles.choiceMeta,
                                  {
                                    color:
                                      theme.colors.foregroundMuted,
                                  },
                                ]}
                              >
                                {learner.email || "E-mail indisponible"}
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.selectedLabel,
                                {
                                  color: selected
                                    ? theme.colors.accent
                                    : theme.colors.foregroundSubtle,
                                },
                              ]}
                            >
                              {selected
                                ? "Sélectionné"
                                : "Sélectionner"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : null}

                  <TextInput
                    value={learnerDueAt}
                    onChangeText={setLearnerDueAt}
                    placeholder="Échéance optionnelle : AAAA-MM-JJTHH:mm"
                    placeholderTextColor={
                      theme.colors.foregroundSubtle
                    }
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        color: theme.colors.foreground,
                        backgroundColor:
                          theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  />

                  <Text
                    style={[
                      styles.miniHelp,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    Exemple : 2026-09-15T18:00. L’échéance est transmise aux inscriptions Formation créées par P3.
                  </Text>

                  <AppButton
                    title={`Affecter ${selectedLearnerIds.length || ""} apprenant${selectedLearnerIds.length > 1 ? "s" : ""}`.trim()}
                    loading={assigningLearners}
                    disabled={
                      selectedLearnerIds.length === 0
                    }
                    onPress={() => void assignLearners()}
                  />
                </View>

                <View style={styles.divider} />

                <View style={styles.subSection}>
                  <Text
                    style={[
                      styles.subTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Groupe / cohorte
                  </Text>

                  {groups.length === 0 ? (
                    <Text
                      style={[
                        styles.emptyText,
                        {
                          color:
                            theme.colors.foregroundMuted,
                        },
                      ]}
                    >
                      Aucun groupe disponible.
                    </Text>
                  ) : (
                    <View style={styles.choiceList}>
                      {groups.map((group) => {
                        const selected =
                          selectedGroupId === group.id;

                        return (
                          <Pressable
                            key={group.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() =>
                              setSelectedGroupId(
                                selected
                                  ? null
                                  : group.id,
                              )
                            }
                            style={[
                              styles.choiceCard,
                              {
                                backgroundColor: selected
                                  ? theme.colors.surfaceElevated
                                  : theme.colors.background,
                                borderColor: selected
                                  ? theme.colors.accent
                                  : theme.colors.border,
                              },
                            ]}
                          >
                            <View style={styles.choiceCopy}>
                              <Text
                                style={[
                                  styles.choiceTitle,
                                  {
                                    color:
                                      theme.colors.foreground,
                                  },
                                ]}
                              >
                                {group.name}
                              </Text>
                              <Text
                                style={[
                                  styles.choiceMeta,
                                  {
                                    color:
                                      theme.colors.foregroundMuted,
                                  },
                                ]}
                              >
                                {group.memberCount} membre(s)
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.selectedLabel,
                                {
                                  color: selected
                                    ? theme.colors.accent
                                    : theme.colors.foregroundSubtle,
                                },
                              ]}
                            >
                              {selected
                                ? "Sélectionné"
                                : "Sélectionner"}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <TextInput
                    value={groupDueAt}
                    onChangeText={setGroupDueAt}
                    placeholder="Échéance optionnelle : AAAA-MM-JJTHH:mm"
                    placeholderTextColor={
                      theme.colors.foregroundSubtle
                    }
                    autoCapitalize="none"
                    style={[
                      styles.input,
                      {
                        color: theme.colors.foreground,
                        backgroundColor:
                          theme.colors.background,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  />

                  <AppButton
                    title="Affecter au groupe"
                    loading={assigningGroup}
                    disabled={!selectedGroupId}
                    onPress={() => void assignGroup()}
                  />
                </View>
              </>
            ) : (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor:
                      theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.noticeText,
                    {
                      color:
                        theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  Le parcours est archivé : les affectations existantes et la progression restent consultables, mais aucune nouvelle affectation n’est proposée.
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.subSection}>
              <View style={styles.subHeadingRow}>
                <Text
                  style={[
                    styles.subTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Affectations existantes
                </Text>

                <AppButton
                  title="Actualiser"
                  variant="secondary"
                  loading={loadingOverview}
                  onPress={() => void loadOverview()}
                  style={styles.refreshButton}
                />
              </View>

              {learnerAssignments.length === 0 &&
              groupAssignments.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Aucune affectation enregistrée.
                </Text>
              ) : (
                <View style={styles.assignmentList}>
                  {learnerAssignments.map((assignment) => {
                    const learner =
                      identityById.get(
                        assignment.learnerId,
                      );
                    const group = assignment.groupId
                      ? groupById.get(assignment.groupId)
                      : undefined;

                    return (
                      <View
                        key={`learner-${assignment.id}`}
                        style={[
                          styles.assignmentCard,
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
                            styles.assignmentTitle,
                            {
                              color:
                                theme.colors.foreground,
                            },
                          ]}
                        >
                          {learnerDisplayName(learner)}
                        </Text>
                        <Text
                          style={[
                            styles.assignmentMeta,
                            {
                              color:
                                theme.colors.foregroundMuted,
                            },
                          ]}
                        >
                          {sourceLabel(assignment.source)}
                          {group
                            ? ` · ${group.name}`
                            : ""}
                        </Text>
                        <Text
                          style={[
                            styles.assignmentMeta,
                            {
                              color:
                                theme.colors.foregroundSubtle,
                            },
                          ]}
                        >
                          Affecté : {formatDate(
                            assignment.assignedAt,
                          )} · Échéance : {formatDate(
                            assignment.dueAt,
                          )}
                        </Text>
                      </View>
                    );
                  })}

                  {groupAssignments.map((assignment) => {
                    const group =
                      groupById.get(
                        assignment.groupId,
                      );

                    return (
                      <View
                        key={`group-${assignment.id}`}
                        style={[
                          styles.assignmentCard,
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
                            styles.assignmentTitle,
                            {
                              color:
                                theme.colors.foreground,
                            },
                          ]}
                        >
                          Groupe : {group?.name ||
                            `#${assignment.groupId}`}
                        </Text>
                        <Text
                          style={[
                            styles.assignmentMeta,
                            {
                              color:
                                theme.colors.foregroundMuted,
                            },
                          ]}
                        >
                          {group
                            ? `${group.memberCount} membre(s)`
                            : "Groupe existant"}
                        </Text>
                        <Text
                          style={[
                            styles.assignmentMeta,
                            {
                              color:
                                theme.colors.foregroundSubtle,
                            },
                          ]}
                        >
                          Affecté : {formatDate(
                            assignment.assignedAt,
                          )} · Échéance : {formatDate(
                            assignment.dueAt,
                          )}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </View>

      {pathStatus !== "DRAFT" ? (
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
            },
          ]}
        >
          <View style={styles.subHeadingRow}>
            <View style={styles.headingCopy}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Progression des apprenants
              </Text>

              <Text
                style={[
                  styles.helpText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Calcul P4 à partir des inscriptions Formation existantes : aucun second moteur de progression.
              </Text>
            </View>

            <StatusBadge
              label={`${progressItems.length} apprenant(s)`}
              variant="info"
            />
          </View>

          {loadingOverview && progressItems.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Chargement de la progression...
            </Text>
          ) : progressItems.length === 0 ? (
            <Text
              style={[
                styles.emptyText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Aucune progression à afficher tant que le parcours n’est pas affecté.
            </Text>
          ) : (
            <View style={styles.progressList}>
              {progressItems.map((progress) => {
                const learner =
                  identityById.get(progress.learnerId);
                const overall = clampPercentage(
                  progress.overallProgressPercentage,
                );
                const completion = clampPercentage(
                  progress.completionProgressPercentage,
                );

                return (
                  <View
                    key={progress.learnerId}
                    style={[
                      styles.progressCard,
                      {
                        backgroundColor:
                          theme.colors.surfaceSoft,
                        borderColor:
                          theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.progressHeading}>
                      <View style={styles.headingCopy}>
                        <Text
                          style={[
                            styles.progressName,
                            {
                              color:
                                theme.colors.foreground,
                            },
                          ]}
                        >
                          {learnerDisplayName(learner)}
                        </Text>

                        <Text
                          style={[
                            styles.progressMeta,
                            {
                              color:
                                theme.colors.foregroundMuted,
                            },
                          ]}
                        >
                          {sourceLabel(
                            progress.assignmentSource,
                          )} · Échéance :{" "}
                          {formatDate(progress.pathDueAt)}
                        </Text>
                      </View>

                      <StatusBadge
                        label={
                          progress.completed
                            ? "Terminé"
                            : `${overall} %`
                        }
                        variant={
                          progress.completed
                            ? "success"
                            : overall > 0
                              ? "info"
                              : "warning"
                        }
                      />
                    </View>

                    <View style={styles.progressMetrics}>
                      <Metric
                        label="Progression globale"
                        value={`${overall} %`}
                      />
                      <Metric
                        label="Completion obligatoire"
                        value={`${completion} %`}
                      />
                      <Metric
                        label="Formations terminées"
                        value={`${progress.completedSteps} / ${progress.totalSteps}`}
                      />
                      <Metric
                        label="Obligatoires terminées"
                        value={`${progress.completedRequiredSteps} / ${progress.requiredSteps}`}
                      />
                    </View>

                    <View
                      style={[
                        styles.progressTrack,
                        {
                          backgroundColor:
                            theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${overall}%`,
                            backgroundColor:
                              progress.completed
                                ? theme.colors.success
                                : theme.colors.accent,
                          },
                        ]}
                      />
                    </View>

                    {progress.nextTrainingId ? (
                      <Text
                        style={[
                          styles.nextText,
                          {
                            color:
                              theme.colors.foregroundMuted,
                          },
                        ]}
                      >
                        Prochaine formation : position{" "}
                        {progress.nextPosition ?? "-"}
                      </Text>
                    ) : null}

                    <View style={styles.trainingProgressList}>
                      {progress.trainings.map((training) => {
                        const percentage =
                          clampPercentage(
                            training.progressPercentage,
                          );

                        return (
                          <View
                            key={training.stepId}
                            style={[
                              styles.trainingProgressCard,
                              {
                                backgroundColor:
                                  theme.colors.background,
                                borderColor:
                                  theme.colors.border,
                              },
                            ]}
                          >
                            <View style={styles.trainingProgressHeading}>
                              <Text
                                style={[
                                  styles.trainingProgressTitle,
                                  {
                                    color:
                                      theme.colors.foreground,
                                  },
                                ]}
                              >
                                {training.position}.{" "}
                                {training.trainingMissing
                                  ? "Formation indisponible"
                                  : training.trainingTitle ||
                                    `Formation #${training.trainingId}`}
                              </Text>

                              <Text
                                style={[
                                  styles.trainingPercentage,
                                  {
                                    color:
                                      percentage >= 100
                                        ? theme.colors.success
                                        : theme.colors.accent,
                                  },
                                ]}
                              >
                                {percentage} %
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.trainingProgressMeta,
                                {
                                  color:
                                    theme.colors.foregroundMuted,
                                },
                              ]}
                            >
                              {training.required
                                ? "Obligatoire"
                                : "Facultative"}{" "}
                              ·{" "}
                              {training.enrolled
                                ? training.enrollmentStatus ||
                                  "Inscrit"
                                : "Non inscrit"}{" "}
                              · Échéance :{" "}
                              {formatDate(training.dueAt)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );

                function Metric({
                  label,
                  value,
                }: {
                  label: string;
                  value: string;
                }) {
                  return (
                    <View
                      style={[
                        styles.metric,
                        {
                          backgroundColor:
                            theme.colors.background,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricLabel,
                          {
                            color:
                              theme.colors.foregroundSubtle,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                      <Text
                        style={[
                          styles.metricValue,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  );
                }
              })}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 14,
  },
  sectionCard: {
    borderWidth: 1,
    padding: 16,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  successBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  successText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  subSection: {
    marginTop: 16,
    gap: 10,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchButton: {
    alignSelf: "flex-start",
  },
  choiceList: {
    gap: 8,
  },
  choiceCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  choiceCopy: {
    flex: 1,
    minWidth: 0,
  },
  choiceTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  choiceMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  selectedLabel: {
    fontSize: 11,
    fontWeight: "900",
  },
  miniHelp: {
    fontSize: 10,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    marginTop: 18,
    backgroundColor: "rgba(127,127,127,0.22)",
  },
  subHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  refreshButton: {
    minWidth: 104,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  assignmentList: {
    gap: 8,
  },
  assignmentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
  },
  assignmentTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  assignmentMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  progressList: {
    gap: 12,
    marginTop: 14,
  },
  progressCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  progressHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  progressName: {
    fontSize: 16,
    fontWeight: "900",
  },
  progressMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  progressMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 135,
    minWidth: 0,
    borderRadius: 10,
    padding: 9,
  },
  metricLabel: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
  },
  metricValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 12,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  nextText: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 9,
  },
  trainingProgressList: {
    gap: 7,
    marginTop: 12,
  },
  trainingProgressCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
  },
  trainingProgressHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  trainingProgressTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "800",
  },
  trainingPercentage: {
    fontSize: 12,
    fontWeight: "900",
  },
  trainingProgressMeta: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
});