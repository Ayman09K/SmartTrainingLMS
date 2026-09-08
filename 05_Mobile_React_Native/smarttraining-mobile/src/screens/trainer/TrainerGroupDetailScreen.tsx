import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
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
import {
  addTrainerGroupMembers,
  assignTrainingToTrainerGroup,
  getTrainerGroup,
  getTrainerGroupMembers,
  removeTrainerGroupMember,
  searchTrainerGroupDirectory,
} from "../../features/trainer/trainerGroupService";
import {
  getTrainerTrainings,
} from "../../features/trainer/trainerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  TrainerLearnerGroup,
  TrainerGroupTrainingAssignmentResponse,
  TrainerLearnerGroupMember,
} from "../../types/trainerGroupMobile";
import type {
  TrainerLearnerIdentity,
} from "../../types/trainerLearnerMobile";
import type {
  TrainerTraining,
} from "../../types/trainerMobile";

type Props = {
  groupId: number;
};

function formatDateTime(value?: string | null): string {
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

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") {
    return "Administrateur";
  }

  if (value === "FORMATEUR") {
    return "Formateur";
  }

  return "Gestionnaire";
}

function learnerName(
  learner: TrainerLearnerIdentity,
): string {
  const combined = [
    learner.firstName,
    learner.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    learner.fullName ||
    combined ||
    learner.email
  );
}

function memberName(
  member: TrainerLearnerGroupMember,
): string {
  return (
    member.fullName ||
    member.email ||
    "Membre du groupe"
  );
}


function trainingStatusLabel(value?: string | null): string {
  if (value === "PUBLISHED") {
    return "Publiee";
  }

  if (value === "DRAFT") {
    return "Brouillon";
  }

  if (value === "ARCHIVED") {
    return "Archivee";
  }

  return value || "Statut non renseigne";
}

function toApiDueAt(
  value: string,
): string | null | undefined {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
      trimmed,
    );

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6] || "0");

  const parsed = new Date(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    0,
  );

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

  const pad = (item: number) =>
    String(item).padStart(2, "0");

  return (
    `${year}-${pad(month)}-${pad(day)}` +
    `T${pad(hour)}:${pad(minute)}:${pad(second)}`
  );
}

export default function TrainerGroupDetailScreen({
  groupId,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [group, setGroup] =
    useState<TrainerLearnerGroup | null>(null);

  const [members, setMembers] =
    useState<TrainerLearnerGroupMember[]>([]);

  const [directoryResults, setDirectoryResults] =
    useState<TrainerLearnerIdentity[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [assignableTrainings, setAssignableTrainings] =
    useState<TrainerTraining[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] =
    useState<number | null>(null);
  const [assignmentDueAt, setAssignmentDueAt] =
    useState("");
  const [assignmentResult, setAssignmentResult] =
    useState<TrainerGroupTrainingAssignmentResponse | null>(
      null,
    );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [loadingTrainings, setLoadingTrainings] =
    useState(false);
  const [assigningTraining, setAssigningTraining] =
    useState(false);

  const [mutationLearnerId, setMutationLearnerId] =
    useState<number | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchMessage, setSearchMessage] =
    useState("");
  const [assignmentMessage, setAssignmentMessage] =
    useState("");

  async function loadAll() {
    const [loadedGroup, loadedMembers] =
      await Promise.all([
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
        if (!active) {
          return;
        }

        setGroup(loadedGroup);
        setMembers(loadedMembers);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger ce groupe ou vous n'avez pas acces a sa gestion.",
          );
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
        if (!active) {
          return;
        }

        setAssignableTrainings(
          [...loaded].sort((a, b) =>
            a.title.localeCompare(b.title, "fr"),
          ),
        );
      })
      .catch(() => {
        if (active) {
          setAssignableTrainings([]);
          setAssignmentMessage(
            "Impossible de charger les formations affectables.",
          );
        }
      })
      .finally(() => {
        if (active) {
          setLoadingTrainings(false);
        }
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
      setError(
        "Impossible d'actualiser ce groupe.",
      );
    } finally {
      setRefreshing(false);
    }
  }

  const memberIds = useMemo(
    () =>
      new Set(
        members.map((member) => member.learnerId),
      ),
    [members],
  );

  const availableDirectoryResults = useMemo(
    () =>
      directoryResults.filter(
        (candidate) => !memberIds.has(candidate.id),
      ),
    [directoryResults, memberIds],
  );

  async function searchDirectory() {
    const query = searchQuery.trim();

    setSuccess("");
    setSearchMessage("");

    if (query.length < 2) {
      setDirectoryResults([]);
      setSearchMessage(
        "Saisissez au moins 2 caracteres du nom ou de l'e-mail.",
      );
      return;
    }

    setSearching(true);

    try {
      const results =
        await searchTrainerGroupDirectory(query, 60);

      setDirectoryResults(results);

      if (results.length === 0) {
        setSearchMessage(
          "Aucun utilisateur actif correspondant.",
        );
      }
    } catch {
      setDirectoryResults([]);
      setSearchMessage(
        "La recherche dans l'annuaire a echoue.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function addMember(
    candidate: TrainerLearnerIdentity,
  ) {
    setMutationLearnerId(candidate.id);
    setError("");
    setSuccess("");

    try {
      const updatedMembers =
        await addTrainerGroupMembers(
          groupId,
          [candidate.id],
        );

      setMembers(updatedMembers);

      const updatedGroup =
        await getTrainerGroup(groupId);

      setGroup(updatedGroup);

      setDirectoryResults((current) =>
        current.filter(
          (item) => item.id !== candidate.id,
        ),
      );

      setSuccess(
        `${learnerName(candidate)} a ete ajoute au groupe.`,
      );
    } catch {
      setError(
        "Impossible d'ajouter cette personne au groupe.",
      );
    } finally {
      setMutationLearnerId(null);
    }
  }

  async function removeMember(
    member: TrainerLearnerGroupMember,
  ) {
    setMutationLearnerId(member.learnerId);
    setError("");
    setSuccess("");

    try {
      await removeTrainerGroupMember(
        groupId,
        member.learnerId,
      );

      const [updatedMembers, updatedGroup] =
        await Promise.all([
          getTrainerGroupMembers(groupId),
          getTrainerGroup(groupId),
        ]);

      setMembers(updatedMembers);
      setGroup(updatedGroup);

      setSuccess(
        `${memberName(member)} a ete retire du groupe.`,
      );
    } catch {
      setError(
        "Impossible de retirer ce membre du groupe.",
      );
    } finally {
      setMutationLearnerId(null);
    }
  }

  async function assignTraining() {
    if (!group) {
      return;
    }

    if (
      selectedTrainingId === null ||
      !Number.isInteger(selectedTrainingId) ||
      selectedTrainingId <= 0
    ) {
      setAssignmentMessage(
        "Selectionnez une formation par son titre.",
      );
      return;
    }

    const dueAt = toApiDueAt(assignmentDueAt);

    if (dueAt === null) {
      setAssignmentMessage(
        "Format attendu pour l'echeance : AAAA-MM-JJ HH:mm.",
      );
      return;
    }

    if (
      dueAt &&
      new Date(dueAt).getTime() <= Date.now()
    ) {
      setAssignmentMessage(
        "L'echeance doit etre dans le futur.",
      );
      return;
    }

    setAssigningTraining(true);
    setAssignmentResult(null);
    setAssignmentMessage("");
    setError("");
    setSuccess("");

    try {
      const result =
        await assignTrainingToTrainerGroup(
          group.id,
          {
            trainingId: selectedTrainingId,
            dueAt,
          },
        );

      setAssignmentResult(result);
      setAssignmentMessage(
        "Affectation terminee. Consultez le resultat ci-dessous.",
      );
    } catch {
      setAssignmentMessage(
        "Impossible d'affecter cette formation au groupe.",
      );
    } finally {
      setAssigningTraining(false);
    }
  }

  function confirmRemove(
    member: TrainerLearnerGroupMember,
  ) {
    Alert.alert(
      "Retirer ce membre ?",
      `${memberName(member)} ne fera plus partie de ce groupe.`,
      [
        {
          text: "Annuler",
          style: "cancel",
        },
        {
          text: "Retirer",
          style: "destructive",
          onPress: () => {
            void removeMember(member);
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <LoadingState message="Chargement du groupe..." />
    );
  }

  if (!group) {
    return (
      <ScreenContainer>
        <View style={styles.fallback}>
          <ErrorMessage
            message={error || "Groupe indisponible."}
            onRetry={() => void refresh()}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              theme.shape.cardPadding * 2,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <SectionHeader
            title={group.name}
            subtitle="Gerez les membres de ce groupe depuis le mobile."
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          {success ? (
            <View
              style={[
                styles.successBox,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor: theme.colors.accent,
                  borderRadius:
                    theme.shape.controlRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.successText,
                  { color: theme.colors.foreground },
                ]}
              >
                {success}
              </Text>
            </View>
          ) : null}

          <View style={styles.metricGrid}>
            <Metric
              value={String(group.memberCount)}
              label="Membres"
            />
            <Metric
              value={ownerRoleLabel(group.ownerRole)}
              label="Gestionnaire"
            />
          </View>

          <View
            style={[
              styles.section,
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
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Description
            </Text>

            <Text
              style={[
                styles.sectionText,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              {group.description ||
                "Aucune description renseignee."}
            </Text>
          </View>

          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionHeadingCopy}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Membres du groupe
                </Text>
                <Text
                  style={[
                    styles.sectionHelper,
                    {
                      color:
                        theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  {members.length} membre(s) actuellement.
                </Text>
              </View>
            </View>

            {members.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                Ce groupe ne contient encore aucun membre.
              </Text>
            ) : (
              <View style={styles.memberList}>
                {members.map((member) => (
                  <View
                    key={member.learnerId}
                    style={[
                      styles.memberCard,
                      {
                        backgroundColor:
                          theme.colors.surfaceSoft,
                        borderColor:
                          theme.colors.border,
                        borderRadius:
                          theme.shape.controlRadius,
                      },
                    ]}
                  >
                    <View style={styles.memberCopy}>
                      <Text
                        style={[
                          styles.memberName,
                          {
                            color:
                              theme.colors.foreground,
                          },
                        ]}
                      >
                        {memberName(member)}
                      </Text>

                      {member.email ? (
                        <Text
                          style={[
                            styles.memberEmail,
                            {
                              color:
                                theme.colors
                                  .foregroundMuted,
                            },
                          ]}
                        >
                          {member.email}
                        </Text>
                      ) : null}

                      {member.addedAt ? (
                        <Text
                          style={[
                            styles.memberMeta,
                            {
                              color:
                                theme.colors
                                  .foregroundSubtle,
                            },
                          ]}
                        >
                          Ajoute le{" "}
                          {formatDateTime(
                            member.addedAt,
                          )}
                        </Text>
                      ) : null}
                    </View>

                    <AppButton
                      title="Retirer"
                      variant="danger"
                      disabled={
                        mutationLearnerId !== null
                      }
                      loading={
                        mutationLearnerId ===
                        member.learnerId
                      }
                      onPress={() =>
                        confirmRemove(member)
                      }
                      style={styles.memberButton}
                    />
                  </View>
                ))}
              </View>
            )}
          </View>

          <View
            style={[
              styles.section,
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
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Ajouter des membres
            </Text>

            <Text
              style={[
                styles.sectionHelper,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              Recherchez une personne par son nom ou son e-mail.
              {"Aucun identifiant technique n\'est a saisir."}
            </Text>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() =>
                void searchDirectory()
              }
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              accessibilityLabel="Nom ou e-mail"
              placeholder="Nom ou e-mail"
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              style={[
                styles.searchInput,
                {
                  backgroundColor:
                    theme.colors.background,
                  borderColor:
                    theme.colors.border,
                  borderRadius:
                    theme.shape.controlRadius,
                  borderWidth:
                    theme.shape.borderWidth,
                  color:
                    theme.colors.foreground,
                },
              ]}
            />

            <AppButton
              title="Rechercher"
              onPress={() =>
                void searchDirectory()
              }
              loading={searching}
              disabled={
                searching ||
                mutationLearnerId !== null
              }
              style={styles.searchButton}
            />

            {searchMessage ? (
              <Text
                style={[
                  styles.searchMessage,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                {searchMessage}
              </Text>
            ) : null}

            {availableDirectoryResults.length > 0 ? (
              <View style={styles.directoryList}>
                {availableDirectoryResults.map(
                  (candidate) => (
                    <View
                      key={candidate.id}
                      style={[
                        styles.directoryCard,
                        {
                          backgroundColor:
                            theme.colors.surfaceSoft,
                          borderColor:
                            theme.colors.border,
                          borderRadius:
                            theme.shape.controlRadius,
                        },
                      ]}
                    >
                      <View
                        style={styles.directoryCopy}
                      >
                        <Text
                          style={[
                            styles.memberName,
                            {
                              color:
                                theme.colors
                                  .foreground,
                            },
                          ]}
                        >
                          {learnerName(candidate)}
                        </Text>

                        <Text
                          style={[
                            styles.memberEmail,
                            {
                              color:
                                theme.colors
                                  .foregroundMuted,
                            },
                          ]}
                        >
                          {candidate.email}
                        </Text>

                        {candidate.role ? (
                          <Text
                            style={[
                              styles.memberMeta,
                              {
                                color:
                                  theme.colors
                                    .foregroundSubtle,
                              },
                            ]}
                          >
                            {candidate.role}
                          </Text>
                        ) : null}
                      </View>

                      <AppButton
                        title="Ajouter"
                        disabled={
                          mutationLearnerId !== null
                        }
                        loading={
                          mutationLearnerId ===
                          candidate.id
                        }
                        onPress={() =>
                          void addMember(candidate)
                        }
                        style={
                          styles.directoryButton
                        }
                      />
                    </View>
                  ),
                )}
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.section,
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
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Affectation collective
            </Text>

            <Text
              style={[
                styles.sectionHelper,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              Selectionnez une formation par son titre puis
              ajoutez une echeance optionnelle.
            </Text>

            {members.length === 0 ? (
              <View
                style={[
                  styles.assignmentNotice,
                  {
                    backgroundColor:
                      theme.colors.surfaceSoft,
                    borderColor:
                      theme.colors.border,
                    borderRadius:
                      theme.shape.controlRadius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.assignmentNoticeText,
                    {
                      color:
                        theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  Ce groupe est vide. Une affectation
                  retournera simplement zero membre traite.
                </Text>
              </View>
            ) : null}

            {loadingTrainings ? (
              <Text
                style={[
                  styles.assignmentMessage,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                Chargement des formations...
              </Text>
            ) : null}

            {!loadingTrainings &&
            assignableTrainings.length === 0 ? (
              <Text
                style={[
                  styles.assignmentMessage,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                Aucune formation gerable disponible.
              </Text>
            ) : null}

            <View style={styles.trainingChoiceList}>
              {assignableTrainings.map((training) => {
                const selected =
                  selectedTrainingId === training.id;

                return (
                  <Pressable
                    key={training.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={
                      `Selectionner la formation ${training.title}`
                    }
                    onPress={() => {
                      setSelectedTrainingId(training.id);
                      setAssignmentResult(null);
                      setAssignmentMessage("");
                    }}
                    style={({ pressed }) => [
                      styles.trainingChoice,
                      {
                        backgroundColor: selected
                          ? theme.colors.surfaceSoft
                          : theme.colors.background,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                        borderRadius:
                          theme.shape.controlRadius,
                        borderWidth: selected
                          ? Math.max(
                              2,
                              theme.shape.borderWidth,
                            )
                          : theme.shape.borderWidth,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.trainingChoiceTitle,
                        {
                          color:
                            theme.colors.foreground,
                        },
                      ]}
                    >
                      {training.title}
                    </Text>
                    <Text
                      style={[
                        styles.trainingChoiceMeta,
                        {
                          color:
                            theme.colors
                              .foregroundMuted,
                        },
                      ]}
                    >
                      {trainingStatusLabel(
                        training.status,
                      )}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text
              style={[
                styles.assignmentLabel,
                {
                  color:
                    theme.colors.foreground,
                },
              ]}
            >
              Echeance optionnelle
            </Text>

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
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              accessibilityLabel="Echeance optionnelle"
              style={[
                styles.searchInput,
                {
                  backgroundColor:
                    theme.colors.background,
                  borderColor:
                    theme.colors.border,
                  borderRadius:
                    theme.shape.controlRadius,
                  borderWidth:
                    theme.shape.borderWidth,
                  color:
                    theme.colors.foreground,
                },
              ]}
            />

            <Text
              style={[
                styles.assignmentHelp,
                {
                  color:
                    theme.colors.foregroundSubtle,
                },
              ]}
            >
              Laissez vide si aucune echeance
              est requise uniquement si necessaire.
            </Text>

            <AppButton
              title="Affecter la formation"
              onPress={() => void assignTraining()}
              loading={assigningTraining}
              disabled={
                assigningTraining ||
                loadingTrainings ||
                selectedTrainingId === null
              }
              style={styles.assignmentButton}
            />

            {assignmentMessage ? (
              <Text
                style={[
                  styles.assignmentMessage,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                {assignmentMessage}
              </Text>
            ) : null}

            {assignmentResult ? (
              <View
                style={[
                  styles.assignmentResult,
                  {
                    backgroundColor:
                      theme.colors.surfaceSoft,
                    borderColor:
                      assignmentResult.failed > 0
                        ? theme.colors.danger
                        : theme.colors.accent,
                    borderRadius:
                      theme.shape.controlRadius,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.assignmentResultTitle,
                    {
                      color:
                        theme.colors.foreground,
                    },
                  ]}
                >
                  {"Resultat de l'affectation"}
                </Text>

                <View
                  style={styles.assignmentResultGrid}
                >
                  <ResultMetric
                    label="Affectes"
                    value={assignmentResult.assigned}
                  />
                  <ResultMetric
                    label="Deja inscrits"
                    value={
                      assignmentResult.alreadyEnrolled
                    }
                  />
                  <ResultMetric
                    label="Echecs"
                    value={assignmentResult.failed}
                  />
                </View>

                <Text
                  style={[
                    styles.assignmentTotal,
                    {
                      color:
                        theme.colors.foregroundMuted,
                    },
                  ]}
                >
                  {assignmentResult.totalMembers} membre(s)
                  traite(s) au total.
                </Text>
              </View>
            ) : null}
          </View>

          <View
            style={[
              styles.section,
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
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Informations
            </Text>

            <InfoLine
              label="Role proprietaire"
              value={ownerRoleLabel(group.ownerRole)}
            />
            <InfoLine
              label="Creation"
              value={formatDateTime(group.createdAt)}
            />
            <InfoLine
              label="Derniere mise a jour"
              value={formatDateTime(group.updatedAt)}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function Metric({
    value,
    label,
  }: {
    value: string;
    label: string;
  }) {
    return (
      <View
        style={[
          styles.metric,
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
            styles.metricValue,
            { color: theme.colors.accent },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.metricLabel,
            {
              color:
                theme.colors.foregroundMuted,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function ResultMetric({
    label,
    value,
  }: {
    label: string;
    value: number;
  }) {
    return (
      <View style={styles.resultMetric}>
        <Text
          style={[
            styles.resultMetricValue,
            { color: theme.colors.accent },
          ]}
        >
          {value}
        </Text>
        <Text
          style={[
            styles.resultMetricLabel,
            {
              color:
                theme.colors.foregroundMuted,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function InfoLine({
    label,
    value,
  }: {
    label: string;
    value: string;
  }) {
    return (
      <View style={styles.infoLine}>
        <Text
          style={[
            styles.infoLabel,
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
            styles.infoValue,
            { color: theme.colors.foreground },
          ]}
        >
          {value}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
    paddingTop: 24,
  },
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
  },
  successBox: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  successText: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "900",
  },
  metricLabel: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionHeadingCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 8,
  },
  sectionHelper: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  memberList: {
    gap: 10,
  },
  memberCard: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  memberCopy: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "900",
  },
  memberEmail: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  memberMeta: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  memberButton: {
    alignSelf: "flex-start",
    minWidth: 104,
  },
  searchInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  searchButton: {
    marginTop: 10,
    alignSelf: "flex-start",
    minWidth: 132,
  },
  searchMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  directoryList: {
    gap: 10,
    marginTop: 14,
  },
  directoryCard: {
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  directoryCopy: {
    flex: 1,
    minWidth: 0,
  },
  directoryButton: {
    alignSelf: "flex-start",
    minWidth: 104,
  },
  assignmentNotice: {
    borderWidth: 1,
    padding: 11,
    marginBottom: 12,
  },
  assignmentNoticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  trainingChoiceList: {
    gap: 8,
    marginBottom: 14,
  },
  trainingChoice: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  trainingChoiceTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  trainingChoiceMeta: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  assignmentLabel: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 7,
  },
  assignmentHelp: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  assignmentButton: {
    alignSelf: "flex-start",
    minWidth: 180,
    marginTop: 12,
  },
  assignmentMessage: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  assignmentResult: {
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  assignmentResultTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 10,
  },
  assignmentResultGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resultMetric: {
    minWidth: 92,
    flexGrow: 1,
  },
  resultMetricValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  resultMetricLabel: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  assignmentTotal: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 10,
  },
  infoLine: {
    gap: 3,
    marginBottom: 11,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 14,
    lineHeight: 20,
  },
});