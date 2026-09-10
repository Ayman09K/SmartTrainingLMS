/* eslint-disable react/no-unescaped-entities */
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  addTrainerGroupMembers,
  assignTrainingToTrainerGroup,
  getTrainerGroup,
  getTrainerGroupMembers,
  removeTrainerGroupMember,
  searchTrainerGroupDirectory,
} from "../../features/trainer/trainerGroupService";
import { getTrainerTrainings } from "../../features/trainer/trainerTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerGroupTrainingAssignmentResponse,
  TrainerLearnerGroup,
  TrainerLearnerGroupMember,
} from "../../types/trainerGroupMobile";
import type { TrainerLearnerIdentity } from "../../types/trainerLearnerMobile";
import type { TrainerTraining } from "../../types/trainerMobile";

type Props = { groupId: number };
type SymbolName = ComponentProps<typeof SymbolView>["name"];

function formatDateTime(value?: string | null): string {
  if (!value) return "Non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") return "Administrateur";
  if (value === "FORMATEUR") return "Formateur";
  return "Gestionnaire";
}

function learnerName(learner: TrainerLearnerIdentity): string {
  const combined = [learner.firstName, learner.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return learner.fullName || combined || learner.email;
}

function memberName(member: TrainerLearnerGroupMember): string {
  return member.fullName || member.email || "Membre du groupe";
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function trainingStatusLabel(value?: string | null): string {
  if (value === "PUBLISHED") return "Publiée";
  if (value === "DRAFT") return "Brouillon";
  if (value === "ARCHIVED") return "Archivée";
  return value || "Statut non renseigné";
}

function trainingStatusTone(value?: string | null) {
  if (value === "PUBLISHED") return { color: "#16845A", soft: "#EAFBF3" };
  if (value === "DRAFT") return { color: "#B45309", soft: "#FFF4E5" };
  if (value === "ARCHIVED") return { color: "#667085", soft: "#F2F4F7" };
  return { color: "#667085", soft: "#F2F4F7" };
}

function toApiDueAt(value: string): string | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || "0");

  const parsed = new Date(year, month - 1, day, hour, minute, second, 0);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day ||
    parsed.getHours() !== hour ||
    parsed.getMinutes() !== minute ||
    parsed.getSeconds() !== second
  ) {
    return null;
  }

  const pad = (item: number) => String(item).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}`;
}

export default function TrainerGroupDetailScreen({ groupId }: Props) {
  const { theme } = useSmartTrainingTheme();

  const [group, setGroup] = useState<TrainerLearnerGroup | null>(null);
  const [members, setMembers] = useState<TrainerLearnerGroupMember[]>([]);
  const [directoryResults, setDirectoryResults] = useState<TrainerLearnerIdentity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignableTrainings, setAssignableTrainings] = useState<TrainerTraining[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState<number | null>(null);
  const [assignmentDueAt, setAssignmentDueAt] = useState("");
  const [assignmentResult, setAssignmentResult] =
    useState<TrainerGroupTrainingAssignmentResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [assigningTraining, setAssigningTraining] = useState(false);
  const [mutationLearnerId, setMutationLearnerId] = useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const [assignmentMessage, setAssignmentMessage] = useState("");

  async function loadAll() {
    const [loadedGroup, loadedMembers] = await Promise.all([
      getTrainerGroup(groupId),
      getTrainerGroupMembers(groupId),
    ]);
    setGroup(loadedGroup);
    setMembers(loadedMembers);
  }

  useEffect(() => {
    let active = true;

    if (!Number.isFinite(groupId) || groupId <= 0) {
      setError("Groupe invalide.");
      setLoading(false);
      return () => {
        active = false;
      };
    }

    void Promise.all([
      getTrainerGroup(groupId),
      getTrainerGroupMembers(groupId),
    ])
      .then(([loadedGroup, loadedMembers]) => {
        if (!active) return;
        setGroup(loadedGroup);
        setMembers(loadedMembers);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger ce groupe ou vous n'avez pas accès à sa gestion.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [groupId]);

  useEffect(() => {
    if (!group || group.ownerRole !== "FORMATEUR") {
      setAssignableTrainings([]);
      return;
    }

    let active = true;
    setLoadingTrainings(true);
    setAssignmentMessage("");

    void getTrainerTrainings(group.ownerId)
      .then((loaded) => {
        if (!active) return;
        setAssignableTrainings(
          [...loaded].sort((a, b) => a.title.localeCompare(b.title, "fr")),
        );
      })
      .catch(() => {
        if (active) {
          setAssignableTrainings([]);
          setAssignmentMessage("Impossible de charger les formations affectables.");
        }
      })
      .finally(() => {
        if (active) setLoadingTrainings(false);
      });

    return () => {
      active = false;
    };
  }, [group?.ownerId, group?.ownerRole]);

  async function refresh() {
    setRefreshing(true);
    try {
      await loadAll();
      setError("");
    } catch {
      setError("Impossible d'actualiser ce groupe.");
    } finally {
      setRefreshing(false);
    }
  }

  const memberIds = useMemo(
    () => new Set(members.map((member) => member.learnerId)),
    [members],
  );

  const availableDirectoryResults = useMemo(
    () => directoryResults.filter((candidate) => !memberIds.has(candidate.id)),
    [directoryResults, memberIds],
  );

  async function searchDirectory() {
    const query = searchQuery.trim();
    setSuccess("");
    setSearchMessage("");

    if (query.length < 2) {
      setDirectoryResults([]);
      setSearchMessage("Saisissez au moins 2 caractères du nom ou de l'e-mail.");
      return;
    }

    setSearching(true);
    try {
      const results = await searchTrainerGroupDirectory(query, 60);
      setDirectoryResults(results);
      if (results.length === 0) {
        setSearchMessage("Aucun utilisateur actif correspondant.");
      }
    } catch {
      setDirectoryResults([]);
      setSearchMessage("La recherche dans l'annuaire a échoué.");
    } finally {
      setSearching(false);
    }
  }

  async function addMember(candidate: TrainerLearnerIdentity) {
    setMutationLearnerId(candidate.id);
    setError("");
    setSuccess("");

    try {
      const updatedMembers = await addTrainerGroupMembers(groupId, [candidate.id]);
      setMembers(updatedMembers);

      const updatedGroup = await getTrainerGroup(groupId);
      setGroup(updatedGroup);

      setDirectoryResults((current) =>
        current.filter((item) => item.id !== candidate.id),
      );

      setSuccess(`${learnerName(candidate)} a été ajouté au groupe.`);
    } catch {
      setError("Impossible d'ajouter cette personne au groupe.");
    } finally {
      setMutationLearnerId(null);
    }
  }

  async function removeMember(member: TrainerLearnerGroupMember) {
    setMutationLearnerId(member.learnerId);
    setError("");
    setSuccess("");

    try {
      await removeTrainerGroupMember(groupId, member.learnerId);

      const [updatedMembers, updatedGroup] = await Promise.all([
        getTrainerGroupMembers(groupId),
        getTrainerGroup(groupId),
      ]);

      setMembers(updatedMembers);
      setGroup(updatedGroup);
      setSuccess(`${memberName(member)} a été retiré du groupe.`);
    } catch {
      setError("Impossible de retirer ce membre du groupe.");
    } finally {
      setMutationLearnerId(null);
    }
  }

  async function assignTraining() {
    if (!group) return;

    if (
      selectedTrainingId === null ||
      !Number.isInteger(selectedTrainingId) ||
      selectedTrainingId <= 0
    ) {
      setAssignmentMessage("Sélectionnez une formation par son titre.");
      return;
    }

    const dueAt = toApiDueAt(assignmentDueAt);

    if (dueAt === null) {
      setAssignmentMessage("Format attendu pour l'échéance : AAAA-MM-JJ HH:mm.");
      return;
    }

    if (dueAt && new Date(dueAt).getTime() <= Date.now()) {
      setAssignmentMessage("L'échéance doit être dans le futur.");
      return;
    }

    setAssigningTraining(true);
    setAssignmentResult(null);
    setAssignmentMessage("");
    setError("");
    setSuccess("");

    try {
      const result = await assignTrainingToTrainerGroup(group.id, {
        trainingId: selectedTrainingId,
        dueAt,
      });
      setAssignmentResult(result);
      setAssignmentMessage(
        "Affectation terminée. Consultez le résultat ci-dessous.",
      );
    } catch {
      setAssignmentMessage("Impossible d'affecter cette formation au groupe.");
    } finally {
      setAssigningTraining(false);
    }
  }

  function confirmRemove(member: TrainerLearnerGroupMember) {
    Alert.alert(
      "Retirer ce membre ?",
      `${memberName(member)} ne fera plus partie de ce groupe.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: () => void removeMember(member),
        },
      ],
    );
  }

  if (loading) {
    return <LoadingState message="Chargement du groupe..." />;
  }

  if (!group) {
    return (
      <ScreenContainer>
        <View className="mx-auto w-full max-w-[720px] pt-6">
          <ErrorMessage
            message={error || "Groupe indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[760px] px-4">
            <View
              className="mt-4 overflow-hidden rounded-[24px] border bg-white"
              style={{
                borderColor: "#E5DFE8",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 9,
                elevation: 2,
              }}
            >
              <View className="h-1.5 w-full" style={{ backgroundColor: "#7C3AED" }} />
              <View className="p-4">
                <View className="flex-row items-start">
                  <View
                    className="h-12 w-12 items-center justify-center rounded-[16px]"
                    style={{ backgroundColor: "#F1E9FF" }}
                  >
                    <SymbolView
                      name={{ ios: "person.3.fill", android: "groups", web: "groups" }}
                      tintColor="#7C3AED"
                      size={20}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      className="text-[20px] font-black leading-[24px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      {group.name}
                    </Text>
                    <Text
                      className="mt-1 text-[12px] leading-[15px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {group.description || "Aucune description renseignée."}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  <Metric
                    icon={{ ios: "person.2.fill", android: "group", web: "group" }}
                    value={String(group.memberCount)}
                    label="Membres"
                  />
                  <Metric
                    icon={{ ios: "person.badge.key.fill", android: "badge", web: "badge" }}
                    value={ownerRoleLabel(group.ownerRole)}
                    label="Gestionnaire"
                  />
                </View>
              </View>
            </View>

            {error ? (
              <View className="mt-3">
                <ErrorMessage message={error} onRetry={() => void refresh()} />
              </View>
            ) : null}

            {success ? (
              <View
                className="mt-3 flex-row items-center rounded-[15px] px-3 py-2.5"
                style={{ backgroundColor: "#EAFBF3" }}
              >
                <SymbolView
                  name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                  tintColor="#16845A"
                  size={15}
                  weight="bold"
                />
                <Text className="ml-2 flex-1 text-[12px] font-bold" style={{ color: "#16845A" }}>
                  {success}
                </Text>
              </View>
            ) : null}

            <SectionTitle
              eyebrow="Cohorte"
              title="Membres du groupe"
              subtitle={`${members.length} membre(s) actuellement`}
              icon={{ ios: "person.2.fill", android: "group", web: "group" }}
            />

            {members.length === 0 ? (
              <EmptyCard
                icon={{ ios: "person.2.slash.fill", android: "group_off", web: "group_off" }}
                title="Aucun membre"
                text="Ce groupe ne contient encore aucun membre."
              />
            ) : (
              <View className="gap-2">
                {members.map((member) => (
                  <View
                    key={member.learnerId}
                    className="flex-row items-center rounded-[18px] border bg-white p-3"
                    style={{ borderColor: "#E5DFE8" }}
                  >
                    <View
                      className="h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: "#F1E9FF" }}
                    >
                      <Text className="text-[12px] font-black" style={{ color: "#7C3AED" }}>
                        {initials(memberName(member))}
                      </Text>
                    </View>

                    <View className="ml-2.5 min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className="text-[13px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {memberName(member)}
                      </Text>
                      {member.email ? (
                        <Text
                          numberOfLines={1}
                          className="mt-0.5 text-[10px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {member.email}
                        </Text>
                      ) : null}
                      {member.addedAt ? (
                        <Text
                          className="mt-0.5 text-[9px]"
                          style={{ color: theme.colors.foregroundSubtle }}
                        >
                          Ajouté le {formatDateTime(member.addedAt)}
                        </Text>
                      ) : null}
                    </View>

                    <CompactButton
                      label={mutationLearnerId === member.learnerId ? "..." : "Retirer"}
                      icon={{ ios: "person.badge.minus", android: "person_remove", web: "person_remove" }}
                      tone="danger"
                      disabled={mutationLearnerId !== null}
                      onPress={() => confirmRemove(member)}
                    />
                  </View>
                ))}
              </View>
            )}

            <SectionTitle
              eyebrow="Gestion"
              title="Ajouter des membres"
              subtitle="Recherchez une personne par son nom ou son e-mail"
              icon={{ ios: "person.badge.plus", android: "person_add", web: "person_add" }}
            />

            <View
              className="rounded-[20px] border bg-white p-3.5"
              style={{ borderColor: "#E5DFE8" }}
            >
              <View
                className="flex-row items-center rounded-[15px] border px-3"
                style={{ borderColor: "#E5DFE8", backgroundColor: "#FCFBFD" }}
              >
                <SymbolView
                  name={{ ios: "magnifyingglass", android: "search", web: "search" }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={16}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  onSubmitEditing={() => void searchDirectory()}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  accessibilityLabel="Nom ou e-mail"
                  placeholder="Nom ou e-mail"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  className="ml-2 min-h-[48px] flex-1 text-[13px]"
                  style={{ color: theme.colors.foreground }}
                />
              </View>

              <View className="mt-2.5">
                <PrimaryButton
                  label={searching ? "Recherche..." : "Rechercher"}
                  icon={{ ios: "magnifyingglass", android: "search", web: "search" }}
                  disabled={searching || mutationLearnerId !== null}
                  onPress={() => void searchDirectory()}
                />
              </View>

              {searchMessage ? <MessageBox text={searchMessage} tone="neutral" /> : null}

              {availableDirectoryResults.length > 0 ? (
                <View className="mt-3 gap-2">
                  {availableDirectoryResults.map((candidate) => (
                    <View
                      key={candidate.id}
                      className="flex-row items-center rounded-[16px] border p-3"
                      style={{ backgroundColor: "#FCFBFD", borderColor: "#EEE9F0" }}
                    >
                      <View
                        className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ backgroundColor: "#F1E9FF" }}
                      >
                        <Text className="text-[11px] font-black" style={{ color: "#7C3AED" }}>
                          {initials(learnerName(candidate))}
                        </Text>
                      </View>

                      <View className="ml-2.5 min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-[12px] font-black"
                          style={{ color: theme.colors.foreground }}
                        >
                          {learnerName(candidate)}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="mt-0.5 text-[10px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {candidate.email}
                        </Text>
                        {candidate.role ? (
                          <Text
                            className="mt-0.5 text-[9px]"
                            style={{ color: theme.colors.foregroundSubtle }}
                          >
                            {candidate.role}
                          </Text>
                        ) : null}
                      </View>

                      <CompactButton
                        label={mutationLearnerId === candidate.id ? "..." : "Ajouter"}
                        icon={{ ios: "plus", android: "add", web: "add" }}
                        tone="primary"
                        disabled={mutationLearnerId !== null}
                        onPress={() => void addMember(candidate)}
                      />
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <SectionTitle
              eyebrow="Formation"
              title="Affectation collective"
              subtitle="Sélectionnez une formation puis ajoutez une échéance optionnelle"
              icon={{
                ios: "rectangle.stack.badge.plus",
                android: "library_add",
                web: "library_add",
              }}
            />

            <View
              className="rounded-[20px] border bg-white p-3.5"
              style={{ borderColor: "#E5DFE8" }}
            >
              {members.length === 0 ? (
                <MessageBox
                  text="Ce groupe est vide. Une affectation retournera simplement zéro membre traité."
                  tone="neutral"
                />
              ) : null}

              {loadingTrainings ? (
                <MessageBox text="Chargement des formations..." tone="neutral" />
              ) : null}

              {!loadingTrainings && assignableTrainings.length === 0 ? (
                <MessageBox text="Aucune formation gérable disponible." tone="neutral" />
              ) : null}

              {assignableTrainings.length > 0 ? (
                <>
                  <Text
                    className="mb-2 text-[11px] font-black uppercase tracking-[0.5px]"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    Formation
                  </Text>

                  <View className="gap-2">
                    {assignableTrainings.map((training) => {
                      const selected = selectedTrainingId === training.id;
                      const tone = trainingStatusTone(training.status);

                      return (
                        <Pressable
                          key={training.id}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`Sélectionner la formation ${training.title}`}
                          onPress={() => {
                            setSelectedTrainingId(training.id);
                            setAssignmentResult(null);
                            setAssignmentMessage("");
                          }}
                          android_ripple={{ color: "transparent" }}
                          className="flex-row items-center rounded-[16px] border p-3"
                          style={{
                            backgroundColor: selected ? "#F7F2FF" : "#FCFBFD",
                            borderColor: selected ? "#9B6AF3" : "#EEE9F0",
                          }}
                        >
                          <View
                            className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                            style={{
                              backgroundColor: selected ? "#E9DCFF" : "#F2EEF5",
                            }}
                          >
                            <SymbolView
                              name={{
                                ios: selected ? "checkmark.circle.fill" : "book.closed.fill",
                                android: selected ? "check_circle" : "menu_book",
                                web: selected ? "check_circle" : "menu_book",
                              }}
                              tintColor={
                                selected ? "#7C3AED" : theme.colors.foregroundSubtle
                              }
                              size={14}
                              weight="bold"
                            />
                          </View>

                          <View className="ml-2.5 min-w-0 flex-1">
                            <Text
                              numberOfLines={2}
                              className="text-[12px] font-black leading-[14px]"
                              style={{ color: theme.colors.foreground }}
                            >
                              {training.title}
                            </Text>

                            <View
                              className="mt-1 self-start rounded-full px-2 py-1"
                              style={{ backgroundColor: tone.soft }}
                            >
                              <Text
                                className="text-[9px] font-black"
                                style={{ color: tone.color }}
                              >
                                {trainingStatusLabel(training.status)}
                              </Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text
                className="mb-2 mt-4 text-[11px] font-black uppercase tracking-[0.5px]"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                Échéance optionnelle
              </Text>

              <View
                className="flex-row items-center rounded-[15px] border px-3"
                style={{ borderColor: "#E5DFE8", backgroundColor: "#FCFBFD" }}
              >
                <SymbolView
                  name={{ ios: "calendar", android: "calendar_today", web: "calendar_today" }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={15}
                />
                <TextInput
                  value={assignmentDueAt}
                  onChangeText={(value) => {
                    setAssignmentDueAt(value);
                    setAssignmentResult(null);
                    setAssignmentMessage("");
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="AAAA-MM-JJ HH:mm"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  accessibilityLabel="Échéance optionnelle"
                  className="ml-2 min-h-[48px] flex-1 text-[13px]"
                  style={{ color: theme.colors.foreground }}
                />
              </View>

              <Text
                className="mt-1.5 text-[10px] leading-[12px]"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                Laissez vide si aucune échéance n'est requise.
              </Text>

              <View className="mt-3">
                <PrimaryButton
                  label={assigningTraining ? "Affectation..." : "Affecter la formation"}
                  icon={{ ios: "paperplane.fill", android: "send", web: "send" }}
                  disabled={
                    assigningTraining ||
                    loadingTrainings ||
                    selectedTrainingId === null
                  }
                  onPress={() => void assignTraining()}
                />
              </View>

              {assignmentMessage ? (
                <MessageBox
                  text={assignmentMessage}
                  tone={
                    assignmentResult
                      ? assignmentResult.failed > 0
                        ? "warning"
                        : "success"
                      : "neutral"
                  }
                />
              ) : null}

              {assignmentResult ? (
                <View
                  className="mt-3 rounded-[18px] border p-3"
                  style={{
                    backgroundColor: "#FCFBFD",
                    borderColor:
                      assignmentResult.failed > 0 ? "#F1C7B8" : "#C7EBD9",
                  }}
                >
                  <Text
                    className="text-[13px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Résultat de l'affectation
                  </Text>

                  <View className="mt-3 flex-row gap-2">
                    <ResultMetric label="Affectés" value={assignmentResult.assigned} />
                    <ResultMetric
                      label="Déjà inscrits"
                      value={assignmentResult.alreadyEnrolled}
                    />
                    <ResultMetric label="Échecs" value={assignmentResult.failed} />
                  </View>

                  <Text
                    className="mt-2.5 text-[10px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {assignmentResult.totalMembers} membre(s) traité(s) au total.
                  </Text>
                </View>
              ) : null}
            </View>

            <SectionTitle
              eyebrow="Détails"
              title="Informations"
              subtitle="Informations réelles du groupe"
              icon={{ ios: "info.circle.fill", android: "info", web: "info" }}
            />

            <View
              className="mb-2 overflow-hidden rounded-[20px] border bg-white"
              style={{ borderColor: "#E5DFE8" }}
            >
              <InfoLine
                icon={{ ios: "person.badge.key.fill", android: "badge", web: "badge" }}
                label="Rôle propriétaire"
                value={ownerRoleLabel(group.ownerRole)}
              />
              <Divider />
              <InfoLine
                icon={{ ios: "calendar.badge.plus", android: "event_available", web: "event_available" }}
                label="Création"
                value={formatDateTime(group.createdAt)}
              />
              <Divider />
              <InfoLine
                icon={{ ios: "clock.arrow.circlepath", android: "update", web: "update" }}
                label="Dernière mise à jour"
                value={formatDateTime(group.updatedAt)}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function SectionTitle({
    eyebrow,
    title,
    subtitle,
    icon,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: SymbolName;
  }) {
    return (
      <View className="mb-2.5 mt-5 flex-row items-center">
        <View
          className="h-9 w-9 items-center justify-center rounded-[11px]"
          style={{ backgroundColor: "#F1E9FF" }}
        >
          <SymbolView name={icon} tintColor="#7C3AED" size={14} weight="bold" />
        </View>
        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.6px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {eyebrow}
          </Text>
          <Text
            className="mt-0.5 text-[16px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[10px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }

  function Metric({
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
        className="min-w-0 flex-1 rounded-[14px] border px-3 py-2.5"
        style={{ backgroundColor: "#F8F6F9", borderColor: "#EEE9F0" }}
      >
        <View className="flex-row items-center">
          <SymbolView name={icon} tintColor="#7C3AED" size={11} weight="bold" />
          <Text
            className="ml-1.5 text-[10px] font-bold"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {label}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          className="mt-1.5 text-[15px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>
    );
  }

  function PrimaryButton({
    label,
    icon,
    disabled,
    onPress,
  }: {
    label: string;
    icon: SymbolName;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-[50px] w-full flex-row items-center justify-center rounded-[14px]"
        style={{
          backgroundColor: theme.colors.accent,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={theme.colors.accentForeground}
          size={14}
          weight="bold"
        />
        <Text
          className="ml-2 text-[13px] font-black"
          style={{ color: theme.colors.accentForeground }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function CompactButton({
    label,
    icon,
    tone,
    disabled,
    onPress,
  }: {
    label: string;
    icon: SymbolName;
    tone: "primary" | "danger";
    disabled: boolean;
    onPress: () => void;
  }) {
    const danger = tone === "danger";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-9 flex-row items-center rounded-[11px] border px-2.5"
        style={{
          backgroundColor: danger ? "#FFF4F2" : "#F3EEFF",
          borderColor: danger ? "#F5C9C4" : "#DDCEFA",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={danger ? "#C2413A" : "#7C3AED"}
          size={11}
          weight="bold"
        />
        <Text
          className="ml-1.5 text-[11px] font-black"
          style={{ color: danger ? "#C2413A" : "#7C3AED" }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function MessageBox({
    text,
    tone,
  }: {
    text: string;
    tone: "neutral" | "success" | "warning";
  }) {
    const palette =
      tone === "success"
        ? {
            color: "#16845A",
            soft: "#EAFBF3",
            icon: {
              ios: "checkmark.circle.fill",
              android: "check_circle",
              web: "check_circle",
            } as SymbolName,
          }
        : tone === "warning"
          ? {
              color: "#B45309",
              soft: "#FFF4E5",
              icon: {
                ios: "exclamationmark.triangle.fill",
                android: "warning",
                web: "warning",
              } as SymbolName,
            }
          : {
              color: "#667085",
              soft: "#F2F4F7",
              icon: {
                ios: "info.circle.fill",
                android: "info",
                web: "info",
              } as SymbolName,
            };

    return (
      <View
        className="mt-3 flex-row items-start rounded-[14px] px-3 py-2.5"
        style={{ backgroundColor: palette.soft }}
      >
        <SymbolView name={palette.icon} tintColor={palette.color} size={13} weight="bold" />
        <Text
          className="ml-2 min-w-0 flex-1 text-[11px] leading-[14px]"
          style={{ color: palette.color }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function EmptyCard({
    icon,
    title,
    text,
  }: {
    icon: SymbolName;
    title: string;
    text: string;
  }) {
    return (
      <View
        className="items-center rounded-[20px] border bg-white px-5 py-6"
        style={{ borderColor: "#E5DFE8" }}
      >
        <View
          className="h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "#F1E9FF" }}
        >
          <SymbolView name={icon} tintColor="#7C3AED" size={18} weight="bold" />
        </View>
        <Text
          className="mt-3 text-[14px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {title}
        </Text>
        <Text
          className="mt-1 text-center text-[11px] leading-[14px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function ResultMetric({ label, value }: { label: string; value: number }) {
    return (
      <View
        className="min-w-0 flex-1 rounded-[13px] px-2.5 py-2"
        style={{ backgroundColor: "#F8F6F9" }}
      >
        <Text className="text-[16px] font-black" style={{ color: theme.colors.accent }}>
          {value}
        </Text>
        <Text
          className="mt-0.5 text-[9px] font-bold"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function InfoLine({
    icon,
    label,
    value,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
  }) {
    return (
      <View className="flex-row items-center px-3.5 py-3">
        <View
          className="h-9 w-9 items-center justify-center rounded-[11px]"
          style={{ backgroundColor: "#F7F3FA" }}
        >
          <SymbolView name={icon} tintColor="#7C3AED" size={13} weight="bold" />
        </View>
        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[10px] font-black uppercase tracking-[0.5px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {label}
          </Text>
          <Text
            className="mt-0.5 text-[12px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
        </View>
      </View>
    );
  }

  function Divider() {
    return <View className="mx-3 h-px" style={{ backgroundColor: "#EEE9F0" }} />;
  }
}
