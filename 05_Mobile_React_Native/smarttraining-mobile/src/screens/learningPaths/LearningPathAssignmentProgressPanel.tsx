import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SymbolView } from "expo-symbols";
import {
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

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
    <View className="gap-4">
      <View
        className="overflow-hidden rounded-[22px] border bg-white"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="h-1 bg-[#7C3AED]" />

        <View className="p-3.5">
          <View className="flex-row items-start">
            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
              <SymbolView
                name={{
                  ios: "person.2.fill",
                  android: "group",
                  web: "group",
                }}
                tintColor="#7C3AED"
                size={15}
                weight="bold"
              />
            </View>

            <View className="ml-3 min-w-0 flex-1">
              <Text
                className="text-[18px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Affectations
              </Text>
              <Text
                className="mt-1 text-[11px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Affectez le parcours à des apprenants ou à un groupe existant.
              </Text>
            </View>

            <View
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor: enabled
                  ? "#EAFBF3"
                  : pathStatus === "ARCHIVED"
                    ? "#F2F4F7"
                    : "#FFF4E5",
              }}
            >
              <Text
                className="text-[9px] font-black"
                style={{
                  color: enabled
                    ? "#16845A"
                    : pathStatus === "ARCHIVED"
                      ? "#667085"
                      : "#B45309",
                }}
              >
                {enabled
                  ? "Publié"
                  : pathStatus === "ARCHIVED"
                    ? "Archivé"
                    : "Brouillon"}
              </Text>
            </View>
          </View>

          {pathStatus === "DRAFT" ? (
            <View className="mt-3 flex-row items-start rounded-[14px] bg-[#F7F3FC] px-3 py-3">
              <SymbolView
                name={{
                  ios: "info.circle.fill",
                  android: "info",
                  web: "info",
                }}
                tintColor="#7C3AED"
                size={13}
              />
              <Text
                className="ml-2 min-w-0 flex-1 text-[9px] leading-[14px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Publiez le parcours avant de créer de nouvelles affectations.
              </Text>
            </View>
          ) : (
            <>
              {error ? (
                <View
                  className="mt-3 flex-row items-start rounded-[16px] border px-3.5 py-3.5"
                  style={{
                    backgroundColor: "#FFF4F2",
                    borderColor: "#F2C6C3",
                  }}
                >
                  <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white">
                    <SymbolView
                      name={{
                        ios: "exclamationmark.triangle.fill",
                        android: "error",
                        web: "error",
                      }}
                      tintColor="#C2413D"
                      size={14}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[11px] font-black text-[#C2413D]">
                      Une action nécessite votre attention
                    </Text>
                    <Text
                      className="mt-1 text-[10px] leading-[15px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {error}
                    </Text>
                  </View>
                </View>
              ) : null}

              {success ? (
                <View className="mt-3 flex-row items-start rounded-[14px] bg-[#EAFBF3] px-3 py-3">
                  <SymbolView
                    name={{
                      ios: "checkmark.circle.fill",
                      android: "check_circle",
                      web: "check_circle",
                    }}
                    tintColor="#16845A"
                    size={13}
                    weight="bold"
                  />
                  <View className="ml-2 min-w-0 flex-1">
                    <Text className="text-[9px] font-black text-[#16845A]">
                      Affectation terminée
                    </Text>
                    <Text
                      className="mt-0.5 text-[8px] leading-[13px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {success}
                    </Text>
                  </View>
                </View>
              ) : null}

              {enabled ? (
                <>
                  <View className="mt-4">
                    <PanelHeading
                      icon={{
                        ios: "person.fill.badge.plus",
                        android: "person_add",
                        web: "person_add",
                      }}
                      title="Apprenants"
                      subtitle="Recherche par nom ou e-mail"
                    />

                    <View
                      className="mt-2 flex-row items-center rounded-[14px] border bg-[#FCFBFD] px-3"
                      style={{ borderColor: "#E5DFE8" }}
                    >
                      <SymbolView
                        name={{
                          ios: "magnifyingglass",
                          android: "search",
                          web: "search",
                        }}
                        tintColor={theme.colors.foregroundSubtle}
                        size={13}
                      />
                      <TextInput
                        value={learnerQuery}
                        onChangeText={setLearnerQuery}
                        placeholder="Nom ou e-mail"
                        placeholderTextColor={theme.colors.foregroundSubtle}
                        autoCapitalize="none"
                        className="ml-2 h-[50px] min-w-0 flex-1 text-[13px]"
                        style={{ color: theme.colors.foreground }}
                        returnKeyType="search"
                        onSubmitEditing={() => void searchLearners()}
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={searching}
                        onPress={() => void searchLearners()}
                        className="h-9 flex-row items-center justify-center rounded-[10px] bg-[#F3EEFF] px-3"
                        style={{ opacity: searching ? 0.55 : 1 }}
                      >
                        <Text className="text-[10px] font-black text-[#7C3AED]">
                          {searching ? "..." : "Rechercher"}
                        </Text>
                      </Pressable>
                    </View>

                    {searchResults.length ? (
                      <View className="mt-2 gap-1.5">
                        {searchResults.map((learner) => {
                          const selected = selectedLearnerIds.includes(
                            learner.id,
                          );

                          return (
                            <Pressable
                              key={learner.id}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              onPress={() => toggleLearner(learner)}
                              className="flex-row items-center rounded-[14px] border px-3 py-3"
                              style={{
                                backgroundColor: selected
                                  ? "#F7F2FF"
                                  : "#FCFBFD",
                                borderColor: selected
                                  ? "#7C3AED"
                                  : "#E5DFE8",
                              }}
                            >
                              <View
                                className="h-7 w-7 items-center justify-center rounded-full"
                                style={{
                                  backgroundColor: selected
                                    ? "#7C3AED"
                                    : "#F1E9FF",
                                }}
                              >
                                <SymbolView
                                  name={{
                                    ios: selected
                                      ? "checkmark"
                                      : "person.fill",
                                    android: selected
                                      ? "check"
                                      : "person",
                                    web: selected
                                      ? "check"
                                      : "person",
                                  }}
                                  tintColor={selected ? "#FFFFFF" : "#7C3AED"}
                                  size={10}
                                  weight="bold"
                                />
                              </View>

                              <View className="ml-2.5 min-w-0 flex-1">
                                <Text
                                  numberOfLines={1}
                                  className="text-[11px] font-black"
                                  style={{ color: theme.colors.foreground }}
                                >
                                  {learnerDisplayName(learner)}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  className="mt-0.5 text-[9px]"
                                  style={{ color: theme.colors.foregroundMuted }}
                                >
                                  {learner.email || "E-mail indisponible"}
                                </Text>
                              </View>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}

                    <CompactInput
                      value={learnerDueAt}
                      onChangeText={setLearnerDueAt}
                      placeholder="Échéance optionnelle · AAAA-MM-JJTHH:mm"
                    />

                    <PrimaryButton
                      label={
                        selectedLearnerIds.length > 0
                          ? `Affecter ${selectedLearnerIds.length} apprenant${selectedLearnerIds.length > 1 ? "s" : ""}`
                          : "Sélectionnez un apprenant"
                      }
                      disabled={
                        assigningLearners ||
                        selectedLearnerIds.length === 0
                      }
                      loading={assigningLearners}
                      icon={{
                        ios: "person.badge.plus",
                        android: "person_add",
                        web: "person_add",
                      }}
                      onPress={() => void assignLearners()}
                    />
                  </View>

                  <View className="my-4 h-px bg-[#EEE9F0]" />

                  <PanelHeading
                    icon={{
                      ios: "person.3.fill",
                      android: "groups",
                      web: "groups",
                    }}
                    title="Groupe / cohorte"
                    subtitle={`${groups.length} groupe${groups.length > 1 ? "s" : ""} disponible${groups.length > 1 ? "s" : ""}`}
                  />

                  {groups.length === 0 ? (
                    <Text
                      className="mt-2 rounded-[13px] bg-[#FAF8FB] px-3 py-3 text-center text-[9px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Aucun groupe disponible.
                    </Text>
                  ) : (
                    <View className="mt-2 gap-1.5">
                      {groups.map((group) => {
                        const selected = selectedGroupId === group.id;

                        return (
                          <Pressable
                            key={group.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() =>
                              setSelectedGroupId(selected ? null : group.id)
                            }
                            className="flex-row items-center rounded-[15px] border px-3.5 py-3.5"
                            style={{
                              backgroundColor: selected
                                ? "#F7F2FF"
                                : "#FCFBFD",
                              borderColor: selected
                                ? "#7C3AED"
                                : "#E5DFE8",
                            }}
                          >
                            <View className="min-w-0 flex-1">
                              <Text
                                numberOfLines={1}
                                className="text-[12px] font-black"
                                style={{ color: theme.colors.foreground }}
                              >
                                {group.name}
                              </Text>
                              <Text
                                className="mt-1 text-[9px]"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {group.memberCount} membre(s)
                              </Text>
                            </View>

                            <View
                              className="h-8 w-8 items-center justify-center rounded-full border"
                              style={{
                                backgroundColor: selected
                                  ? "#7C3AED"
                                  : "#FFFFFF",
                                borderColor: selected
                                  ? "#7C3AED"
                                  : "#D7D0DB",
                              }}
                            >
                              {selected ? (
                                <SymbolView
                                  name={{
                                    ios: "checkmark",
                                    android: "check",
                                    web: "check",
                                  }}
                                  tintColor="#FFFFFF"
                                  size={10}
                                  weight="bold"
                                />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}

                  <CompactInput
                    value={groupDueAt}
                    onChangeText={setGroupDueAt}
                    placeholder="Échéance optionnelle · AAAA-MM-JJTHH:mm"
                  />

                  <PrimaryButton
                    label={
                      selectedGroupId
                        ? "Affecter au groupe"
                        : "Sélectionnez un groupe"
                    }
                    disabled={assigningGroup || !selectedGroupId}
                    loading={assigningGroup}
                    icon={{
                      ios: "person.3.fill",
                      android: "groups",
                      web: "groups",
                    }}
                    onPress={() => void assignGroup()}
                  />
                </>
              ) : (
                <View className="mt-3 rounded-[14px] bg-[#F2F4F7] px-3 py-3">
                  <Text
                    className="text-[9px] leading-[14px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Le parcours est archivé : les affectations existantes restent
                    consultables, mais aucune nouvelle affectation n’est proposée.
                  </Text>
                </View>
              )}

              <View className="my-4 h-px bg-[#EEE9F0]" />

              <View className="flex-row items-center">
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[15px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Affectations existantes
                  </Text>
                  <Text
                    className="mt-1 text-[9px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {learnerAssignments.length + groupAssignments.length} élément(s)
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={loadingOverview}
                  onPress={() => void loadOverview()}
                  className="h-9 flex-row items-center rounded-[11px] border bg-white px-3"
                  style={{
                    borderColor: "#E5DFE8",
                    opacity: loadingOverview ? 0.55 : 1,
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "arrow.clockwise",
                      android: "refresh",
                      web: "refresh",
                    }}
                    tintColor="#7C3AED"
                    size={10}
                    weight="bold"
                  />
                  <Text className="ml-1.5 text-[9px] font-black text-[#7C3AED]">
                    Actualiser
                  </Text>
                </Pressable>
              </View>

              {learnerAssignments.length === 0 &&
              groupAssignments.length === 0 ? (
                <Text
                  className="mt-2 rounded-[13px] bg-[#FAF8FB] px-3 py-3 text-center text-[9px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Aucune affectation enregistrée.
                </Text>
              ) : (
                <View className="mt-2 gap-1.5">
                  {learnerAssignments.map((assignment) => {
                    const learner = identityById.get(assignment.learnerId);
                    const group = assignment.groupId
                      ? groupById.get(assignment.groupId)
                      : undefined;

                    return (
                      <AssignmentRow
                        key={`learner-${assignment.id}`}
                        title={learnerDisplayName(learner)}
                        subtitle={`${sourceLabel(assignment.source)}${
                          group ? ` · ${group.name}` : ""
                        }`}
                        meta={`Affecté : ${formatDate(
                          assignment.assignedAt,
                        )} · Échéance : ${formatDate(assignment.dueAt)}`}
                        icon={{
                          ios: "person.fill",
                          android: "person",
                          web: "person",
                        }}
                      />
                    );
                  })}

                  {groupAssignments.map((assignment) => {
                    const group = groupById.get(assignment.groupId);

                    return (
                      <AssignmentRow
                        key={`group-${assignment.id}`}
                        title={`Groupe : ${
                          group?.name || `#${assignment.groupId}`
                        }`}
                        subtitle={
                          group
                            ? `${group.memberCount} membre(s)`
                            : "Groupe existant"
                        }
                        meta={`Affecté : ${formatDate(
                          assignment.assignedAt,
                        )} · Échéance : ${formatDate(assignment.dueAt)}`}
                        icon={{
                          ios: "person.3.fill",
                          android: "groups",
                          web: "groups",
                        }}
                      />
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>
      </View>

      {pathStatus !== "DRAFT" ? (
        <View
          className="overflow-hidden rounded-[22px] border bg-white"
          style={{ borderColor: "#E5DFE8" }}
        >
          <View className="h-1 bg-[#7C3AED]" />

          <View className="p-3.5">
            <View className="flex-row items-start">
              <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
                <SymbolView
                  name={{
                    ios: "chart.bar.fill",
                    android: "bar_chart",
                    web: "bar_chart",
                  }}
                  tintColor="#7C3AED"
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text
                  className="text-[18px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Progression des apprenants
                </Text>
                <Text
                  className="mt-1 text-[10px] leading-[15px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Suivi calculé à partir des inscriptions Formation existantes.
                </Text>
              </View>

              <View className="rounded-full bg-[#EFF6FF] px-2.5 py-1">
                <Text className="text-[9px] font-black text-[#2563EB]">
                  {progressItems.length} apprenant(s)
                </Text>
              </View>
            </View>

            {loadingOverview && progressItems.length === 0 ? (
              <Text
                className="mt-3 text-center text-[9px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Chargement de la progression...
              </Text>
            ) : progressItems.length === 0 ? (
              <Text
                className="mt-3 rounded-[13px] bg-[#FAF8FB] px-3 py-3 text-center text-[9px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Aucune progression à afficher.
              </Text>
            ) : (
              <View className="mt-3 gap-2">
                {progressItems.map((progress) => {
                  const learner = identityById.get(progress.learnerId);
                  const overall = clampPercentage(
                    progress.overallProgressPercentage,
                  );
                  const completion = clampPercentage(
                    progress.completionProgressPercentage,
                  );

                  return (
                    <View
                      key={progress.learnerId}
                      className="rounded-[19px] border bg-[#FBF9FF] p-3.5"
                      style={{ borderColor: "#E5DDF0" }}
                    >
                      <View className="flex-row items-start">
                        <View className="min-w-0 flex-1">
                          <Text
                            numberOfLines={1}
                            className="text-[14px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            {learnerDisplayName(learner)}
                          </Text>
                          <Text
                            numberOfLines={1}
                            className="mt-1 text-[9px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            {sourceLabel(progress.assignmentSource)} · Échéance :{" "}
                            {formatDate(progress.pathDueAt)}
                          </Text>
                        </View>

                        <View
                          className="ml-2 rounded-full px-2.5 py-1"
                          style={{
                            backgroundColor: progress.completed
                              ? "#EAFBF3"
                              : "#EFF6FF",
                          }}
                        >
                          <Text
                            className="text-[11px] font-black"
                            style={{
                              color: progress.completed
                                ? "#16845A"
                                : "#2563EB",
                            }}
                          >
                            {progress.completed ? "Terminé" : `${overall}%`}
                          </Text>
                        </View>
                      </View>

                      <View className="mt-2.5 flex-row gap-1.5">
                        <MiniMetric label="Global" value={`${overall}%`} />
                        <MiniMetric
                          label="Obligatoire"
                          value={`${completion}%`}
                        />
                        <MiniMetric
                          label="Terminées"
                          value={`${progress.completedSteps}/${progress.totalSteps}`}
                        />
                        <MiniMetric
                          label="Requises"
                          value={`${progress.completedRequiredSteps}/${progress.requiredSteps}`}
                        />
                      </View>

                      <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E7E1EA]">
                        <View
                          className="h-full rounded-full"
                          style={{
                            width: `${overall}%`,
                            backgroundColor: progress.completed
                              ? "#16845A"
                              : "#7C3AED",
                          }}
                        />
                      </View>

                      {progress.nextTrainingId ? (
                        <Text
                          className="mt-2 text-[8px] font-bold"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          Prochaine formation · position{" "}
                          {progress.nextPosition ?? "-"}
                        </Text>
                      ) : null}

                      <View className="mt-2 gap-1.5">
                        {progress.trainings.map((training) => {
                          const percentage = clampPercentage(
                            training.progressPercentage,
                          );

                          return (
                            <View
                              key={training.stepId}
                              className="flex-row items-start rounded-[14px] border bg-white px-3 py-2.5"
                              style={{ borderColor: "#E8E2EA" }}
                            >
                              <View className="min-w-0 flex-1">
                                <Text
                                  numberOfLines={2}
                                  className="text-[10px] font-black leading-[14px]"
                                  style={{ color: theme.colors.foreground }}
                                >
                                  {training.position}.{" "}
                                  {training.trainingMissing
                                    ? "Formation indisponible"
                                    : training.trainingTitle ||
                                      `Formation #${training.trainingId}`}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  className="mt-1 text-[8px]"
                                  style={{
                                    color: theme.colors.foregroundMuted,
                                  }}
                                >
                                  {training.required
                                    ? "Obligatoire"
                                    : "Facultative"}{" "}
                                  ·{" "}
                                  {training.enrolled
                                    ? training.enrollmentStatus || "Inscrit"
                                    : "Non inscrit"}{" "}
                                  · {formatDate(training.dueAt)}
                                </Text>
                              </View>

                              <Text
                                className="ml-2 text-[11px] font-black"
                                style={{
                                  color:
                                    percentage >= 100
                                      ? "#16845A"
                                      : "#7C3AED",
                                }}
                              >
                                {percentage}%
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      ) : null}
    </View>
  );

  function PanelHeading({
    icon,
    title,
    subtitle,
  }: {
    icon: React.ComponentProps<typeof SymbolView>["name"];
    title: string;
    subtitle: string;
  }) {
    return (
      <View className="flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F1E9FF]">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={13}
            weight="bold"
          />
        </View>
        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[13px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
          <Text
            className="mt-1 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }

  function CompactInput({
    value,
    onChangeText,
    placeholder,
  }: {
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
  }) {
    return (
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.foregroundSubtle}
        autoCapitalize="none"
        className="mt-2.5 h-[48px] rounded-[14px] border bg-[#FCFBFD] px-3.5 text-[11px]"
        style={{
          borderColor: "#E5DFE8",
          color: theme.colors.foreground,
        }}
      />
    );
  }

  function PrimaryButton({
    label,
    disabled,
    loading,
    icon,
    onPress,
  }: {
    label: string;
    disabled: boolean;
    loading: boolean;
    icon: React.ComponentProps<typeof SymbolView>["name"];
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        className="mt-3 h-[48px] flex-row items-center justify-center rounded-[14px] bg-[#7C3AED]"
        style={{ opacity: disabled ? 0.42 : 1 }}
      >
        <SymbolView
          name={icon}
          tintColor="#FFFFFF"
          size={12}
          weight="bold"
        />
        <Text className="ml-2 text-[11px] font-black text-white">
          {loading ? "Traitement..." : label}
        </Text>
      </Pressable>
    );
  }

  function AssignmentRow({
    title,
    subtitle,
    meta,
    icon,
  }: {
    title: string;
    subtitle: string;
    meta: string;
    icon: React.ComponentProps<typeof SymbolView>["name"];
  }) {
    return (
      <View className="flex-row items-start rounded-[15px] border bg-[#FCFBFD] px-3 py-3"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={10}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[12px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-1 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
          <Text
            numberOfLines={1}
            className="mt-1 text-[8px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {meta}
          </Text>
        </View>
      </View>
    );
  }

  function MiniMetric({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View className="min-w-0 flex-1 rounded-[12px] bg-white px-2.5 py-2.5">
        <Text
          numberOfLines={1}
          className="text-[8px] font-bold"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-[12px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>
    );
  }
}
