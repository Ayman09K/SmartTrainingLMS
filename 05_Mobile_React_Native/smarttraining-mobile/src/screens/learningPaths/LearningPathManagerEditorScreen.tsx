import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
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
import StatusBadge from "../../components/StatusBadge";
import LearningPathAssignmentProgressPanel from "./LearningPathAssignmentProgressPanel";
import { getAdminTrainings } from "../../features/admin/adminTrainingService";
import {
  addLearningPathStep,
  archiveLearningPath,
  createLearningPath,
  createManageableLearningPathVersion,
  deleteLearningPath,
  getLearningPathSteps,
  getManageableLearningPath,
  getManageableLearningPathVersions,
  publishLearningPath,
  unarchiveLearningPath,
  removeLearningPathStep,
  reorderLearningPathSteps,
  updateLearningPath,
  updateLearningPathStepRequired,
} from "../../features/learningPaths/learningPathService";
import {
  getTrainerTrainings,
} from "../../features/trainer/trainerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearningPathManager,
  LearningPathManagerRequest,
  LearningPathStep,
  LearningPathVisibility,
} from "../../types/learningPath";

type Role = "FORMATEUR" | "ADMIN";

type Props = {
  role: Role;
  userId: number;
  pathId?: number;
  onBack: () => void;
  onPathCreated: (pathId: number) => void;
  onPathDeleted: () => void;
};

type TrainingChoice = {
  id: number;
  title: string;
  status: string;
};

const VISIBILITIES: readonly LearningPathVisibility[] = [
  "PUBLIC",
  "ASSIGNED_ONLY",
  "PRIVATE",
];

function statusLabel(status: string): string {
  if (status === "DRAFT") return "Brouillon";
  if (status === "PUBLISHED") return "Publié";
  if (status === "ARCHIVED") return "Archivé";

  return status;
}

function visibilityLabel(value: string): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") return "Sur affectation";
  if (value === "PRIVATE") return "Privé";

  return value;
}

function sortSteps(steps: LearningPathStep[]): LearningPathStep[] {
  return [...steps].sort((a, b) => a.position - b.position);
}

export default function LearningPathManagerEditorScreen({
  role,
  userId,
  pathId,
  onBack,
  onPathCreated,
  onPathDeleted,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [path, setPath] = useState<LearningPathManager | null>(null);
  const [steps, setSteps] = useState<LearningPathStep[]>([]);
  const [versions, setVersions] = useState<LearningPathManager[]>([]);
  const [trainings, setTrainings] = useState<TrainingChoice[]>([]);
  const [trainingQuery, setTrainingQuery] = useState("");
  const [selectedTrainingId, setSelectedTrainingId] =
    useState<number | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [objectives, setObjectives] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const [visibility, setVisibility] =
    useState<LearningPathVisibility>("ASSIGNED_ONLY");

  const [loading, setLoading] = useState(Boolean(pathId));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const isDraft = !path || path.status === "DRAFT";
  const isPublished = path?.status === "PUBLISHED";
  const isArchived = path?.status === "ARCHIVED";

  const draftVersion = versions.find(
    (item) => item.status === "DRAFT",
  );

  const latestPublishedVersionNumber = Math.max(
    ...versions
      .filter((item) => item.status === "PUBLISHED")
      .map((item) => item.versionNumber || 1),
    isPublished ? path?.versionNumber || 1 : 0,
  );

  const isLatestPublished =
    isPublished &&
    (path?.versionNumber || 1) === latestPublishedVersionNumber;

  const isHistoricalPublished =
    isPublished && !isLatestPublished;

  const loadTrainingChoices = useCallback(
    async (): Promise<TrainingChoice[]> => {
      if (role === "ADMIN") {
        const items = await getAdminTrainings();

        return items.map((item) => ({
          id: item.id,
          title: item.title,
          status: String(item.status ?? ""),
        }));
      }

      const items = await getTrainerTrainings(userId);

      return items.map((item) => ({
        id: item.id,
        title: item.title,
        status: String(item.status ?? ""),
      }));
    },
    [role, userId],
  );

  const applyPath = useCallback(
    (loaded: LearningPathManager) => {
      setPath(loaded);
      setTitle(loaded.title);
      setDescription(loaded.description ?? loaded.shortDescription ?? "");
      setObjectives(loaded.objectives ?? "");
      setVersionNote(loaded.versionNote ?? "");
      setVisibility(loaded.visibility);
    },
    [],
  );

  useEffect(() => {
    let active = true;

    if (pathId) {
      void Promise.all([
        getManageableLearningPath(pathId),
        getLearningPathSteps(pathId),
        getManageableLearningPathVersions(pathId),
        loadTrainingChoices(),
      ])
        .then(([
          loadedPath,
          loadedSteps,
          loadedVersions,
          loadedTrainings,
        ]) => {
          if (!active) return;

          applyPath(loadedPath);
          setSteps(sortSteps(loadedSteps));
          setVersions(loadedVersions);
          setTrainings(loadedTrainings);
          setError("");
        })
        .catch(() => {
          if (active) {
            setError("Impossible de charger le parcours.");
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
          }
        });
    } else {
      void loadTrainingChoices()
        .then((loadedTrainings) => {
          if (active) {
            setTrainings(loadedTrainings);
          }
        })
        .catch(() => {
          if (active) {
            setError(
              "Le formulaire est disponible, mais la liste des formations n’a pas pu être chargée.",
            );
          }
        });
    }

    return () => {
      active = false;
    };
  }, [applyPath, loadTrainingChoices, pathId]);

  const existingTrainingIds = useMemo(
    () => new Set(steps.map((step) => step.trainingId)),
    [steps],
  );

  const availableTrainings = useMemo(() => {
    const normalized = trainingQuery
      .trim()
      .toLocaleLowerCase("fr");

    return trainings
      .filter((item) => !existingTrainingIds.has(item.id))
      .filter((item) => item.status !== "ARCHIVED")
      .filter((item) => {
        if (!normalized) return true;

        return `${item.title} ${item.status}`
          .toLocaleLowerCase("fr")
          .includes(normalized);
      });
  }, [existingTrainingIds, trainingQuery, trainings]);

  function requestPayload(): LearningPathManagerRequest {
    return {
      title: title.trim(),
      shortDescription: description.trim().slice(0, 500) || null,
      description: description.trim() || null,
      objectives: objectives.trim() || null,
      versionNote: versionNote.trim() || null,
      visibility,
    };
  }

  async function refreshVersions(pathIdToLoad: number) {
    const loadedVersions =
      await getManageableLearningPathVersions(pathIdToLoad);
    setVersions(loadedVersions);
  }

  function confirmCreateVersion() {
    if (!path || !isLatestPublished || draftVersion) {
      return;
    }

    if (Platform.OS === "web") {
      const browserConfirm = (
        globalThis as typeof globalThis & {
          confirm?: (message?: string) => boolean;
        }
      ).confirm;

      if (
        typeof browserConfirm === "function" &&
        browserConfirm(
          `Créer une nouvelle version\n\nCréer une version V${(path.versionNumber || 1) + 1} en brouillon à partir de V${path.versionNumber || 1} ?`,
        )
      ) {
        void createVersion();
      }
      return;
    }

    Alert.alert(
      "Créer une nouvelle version",
      `Créer une version V${(path.versionNumber || 1) + 1} en brouillon à partir de V${path.versionNumber || 1} ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Créer",
          onPress: () => {
            void createVersion();
          },
        },
      ],
    );
  }

  async function createVersion() {
    if (!path) return;

    setWorking(true);

    try {
      const created =
        await createManageableLearningPathVersion(path.id);
      setError("");
      onPathCreated(created.id);
    } catch {
      setError(
        "Impossible de créer une nouvelle version du parcours.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function savePath() {
    if (!title.trim()) {
      setError("Le titre du parcours est obligatoire.");
      return;
    }

    setWorking(true);

    try {
      if (!path) {
        const created = await createLearningPath(requestPayload());
        applyPath(created);
        setError("");
        onPathCreated(created.id);
        return;
      }

      if (path.status !== "DRAFT") {
        setError(
          "Seul un parcours brouillon peut être modifié.",
        );
        return;
      }

      const updated = await updateLearningPath(
        path.id,
        requestPayload(),
      );

      applyPath(updated);
      setError("");
    } catch {
      setError("Impossible d’enregistrer le parcours.");
    } finally {
      setWorking(false);
    }
  }

  async function addStep() {
    if (!path || path.status !== "DRAFT") return;

    if (!selectedTrainingId) {
      setError("Sélectionnez une formation à ajouter.");
      return;
    }

    setWorking(true);

    try {
      await addLearningPathStep(path.id, {
        trainingId: selectedTrainingId,
        required: true,
      });

      const loadedSteps = await getLearningPathSteps(path.id);
      setSteps(sortSteps(loadedSteps));
      setSelectedTrainingId(null);
      setTrainingQuery("");
      setError("");
    } catch {
      setError(
        "Impossible d’ajouter cette formation au parcours.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function toggleRequired(step: LearningPathStep) {
    if (!path || path.status !== "DRAFT") return;

    setWorking(true);

    try {
      await updateLearningPathStepRequired(
        path.id,
        step.id,
        { required: !step.required },
      );

      const loadedSteps = await getLearningPathSteps(path.id);
      setSteps(sortSteps(loadedSteps));
      setError("");
    } catch {
      setError(
        "Impossible de modifier le caractère obligatoire de cette étape.",
      );
    } finally {
      setWorking(false);
    }
  }

  async function moveStep(stepId: number, direction: -1 | 1) {
    if (!path || path.status !== "DRAFT") return;

    const current = sortSteps(steps);
    const index = current.findIndex((step) => step.id === stepId);
    const targetIndex = index + direction;

    if (
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= current.length
    ) {
      return;
    }

    const reordered = [...current];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    setWorking(true);

    try {
      const updated = await reorderLearningPathSteps(
        path.id,
        {
          stepIds: reordered.map((step) => step.id),
        },
      );

      setSteps(sortSteps(updated));
      setError("");
    } catch {
      setError("Impossible de réordonner les étapes.");
    } finally {
      setWorking(false);
    }
  }

  function confirmRemoveStep(step: LearningPathStep) {
    if (!path || path.status !== "DRAFT") return;

    Alert.alert(
      "Retirer la formation",
      `Retirer « ${step.trainingTitle ?? "Formation"} » du parcours ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Retirer",
          style: "destructive",
          onPress: () => {
            void removeStep(step);
          },
        },
      ],
    );
  }

  async function removeStep(step: LearningPathStep) {
    if (!path) return;

    setWorking(true);

    try {
      await removeLearningPathStep(path.id, step.id);
      const loadedSteps = await getLearningPathSteps(path.id);
      setSteps(sortSteps(loadedSteps));
      setError("");
    } catch {
      setError("Impossible de retirer cette formation.");
    } finally {
      setWorking(false);
    }
  }

  function confirmPublish() {
    if (!path || path.status !== "DRAFT") return;

    if (
      (path.versionNumber || 1) > 1 &&
      !versionNote.trim()
    ) {
      setError(
        "Ajoutez une note de version avant de publier cette révision.",
      );
      return;
    }

    if (
      (path.versionNumber || 1) > 1 &&
      versionNote.trim() !==
        (path.versionNote ?? "").trim()
    ) {
      setError(
        "Enregistrez la note de version avant de publier.",
      );
      return;
    }

    if (Platform.OS === "web") {
      const browserConfirm = (
        globalThis as typeof globalThis & {
          confirm?: (message?: string) => boolean;
        }
      ).confirm;

      if (
        typeof browserConfirm === "function" &&
        browserConfirm(
          "Publier le parcours\n\nLe parcours deviendra affectable. Les formations restent gérées par leur cycle de vie actuel.",
        )
      ) {
        void publishPath();
      }
      return;
    }

    Alert.alert(
      "Publier le parcours",
      "Le parcours deviendra affectable. Les formations restent gérées par leur cycle de vie actuel.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Publier",
          onPress: () => {
            void publishPath();
          },
        },
      ],
    );
  }

  async function publishPath() {
    if (!path) return;

    setWorking(true);

    try {
      const updated = await publishLearningPath(path.id);
      applyPath(updated);
      await refreshVersions(updated.id);
      setError("");
    } catch {
      setError(
        "Impossible de publier le parcours. Vérifiez son contenu et les formations associées.",
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmArchive() {
    if (!path || path.status !== "PUBLISHED") return;

    Alert.alert(
      "Archiver le parcours",
      "Le parcours ne sera plus proposé pour de nouvelles affectations.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Archiver",
          style: "destructive",
          onPress: () => {
            void archivePath();
          },
        },
      ],
    );
  }

  async function archivePath() {
    if (!path) return;

    setWorking(true);

    try {
      const updated = await archiveLearningPath(path.id);
      applyPath(updated);
      await refreshVersions(updated.id);
      setError("");
    } catch {
      setError("Impossible d’archiver le parcours.");
    } finally {
      setWorking(false);
    }
  }

  function confirmUnarchive() {
    if (!path || path.status !== "ARCHIVED") return;

    const currentVersion = path.versionNumber || 1;
    const newerPublishedVersionExists = versions.some(
      (item) =>
        item.status === "PUBLISHED" &&
        (item.versionNumber || 1) > currentVersion,
    );

    if (newerPublishedVersionExists) {
      Alert.alert(
        "Désarchivage indisponible",
        "Une version plus récente de ce parcours est déjà publiée.",
      );
      return;
    }

    Alert.alert(
      "Désarchiver le parcours",
      "Le parcours redeviendra publié et pourra de nouveau être affecté. Son historique et sa progression sont conservés.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Désarchiver",
          onPress: () => {
            void unarchivePath();
          },
        },
      ],
    );
  }

  async function unarchivePath() {
    if (!path) return;

    setWorking(true);

    try {
      const updated = await unarchiveLearningPath(path.id);
      applyPath(updated);
      setVersions(
        await getManageableLearningPathVersions(path.id),
      );
      setError("");
    } catch {
      setError(
        "Impossible de désarchiver le parcours. Vérifiez qu’aucune version plus récente n’est déjà publiée et que ses formations sont toujours publiées.",
      );
    } finally {
      setWorking(false);
    }
  }

  function confirmDelete() {
    if (!path || path.status === "PUBLISHED") return;

    Alert.alert(
      "Supprimer le parcours",
      "Le parcours, ses étapes et ses traces d’affectation seront supprimés. Les formations et leurs inscriptions restent intactes.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void deletePath();
          },
        },
      ],
    );
  }

  async function deletePath() {
    if (!path) return;

    setWorking(true);

    try {
      await deleteLearningPath(path.id);
      setError("");
      onPathDeleted();
    } catch {
      setError("Impossible de supprimer le parcours.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement du parcours..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <AppButton
            title="← Retour aux parcours"
            variant="secondary"
            disabled={working}
            onPress={onBack}
            style={styles.backToPathsButton}
          />

          <SectionHeader
            title={path ? path.title : "Nouveau parcours"}
            subtitle={
              path
                ? "Gérez les informations, l’ordre des formations et le cycle de vie."
                : "Créez d’abord le parcours, puis ajoutez les formations existantes."
            }
          />

          {path ? (
            <View style={styles.statusRow}>
              <StatusBadge
                label={`V${path.versionNumber || 1}`}
                variant="info"
              />
              <StatusBadge
                label={statusLabel(path.status)}
                variant={
                  path.status === "PUBLISHED"
                    ? "success"
                    : path.status === "DRAFT"
                      ? "warning"
                      : "info"
                }
              />
              <Text
                style={[
                  styles.visibilityMeta,
                  { color: theme.colors.foregroundSubtle },
                ]}
              >
                {visibilityLabel(path.visibility)}
              </Text>
            </View>
          ) : null}

          {error ? <ErrorMessage message={error} /> : null}

          {isHistoricalPublished ? (
            <View
              style={[
                styles.infoNotice,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.infoNoticeTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Version historique
              </Text>
              <Text
                style={[
                  styles.infoNoticeText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Cette version reste accessible pour les apprenants déjà affectés. Les nouvelles affectations utilisent la dernière version publiée.
              </Text>
            </View>
          ) : null}

          {isPublished && draftVersion ? (
            <AppButton
              title={`Ouvrir le brouillon V${draftVersion.versionNumber || 1}`}
              onPress={() => onPathCreated(draftVersion.id)}
              style={styles.versionPrimaryAction}
            />
          ) : null}

          {isPublished &&
          !draftVersion &&
          isLatestPublished ? (
            <AppButton
              title="Créer une nouvelle version"
              loading={working}
              onPress={confirmCreateVersion}
              style={styles.versionPrimaryAction}
            />
          ) : null}

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
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Informations
            </Text>


            <FieldLabel label="Description du parcours" />
            <TextInput
              value={description}
              editable={isDraft && !working}
              maxLength={2000}
              onChangeText={setDescription}
              multiline
              placeholder="Contexte et contenu du parcours"
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            <FieldLabel label="Objectifs" />
            <TextInput
              value={objectives}
              editable={isDraft && !working}
              maxLength={2000}
              onChangeText={setObjectives}
              multiline
              placeholder="Compétences et objectifs pédagogiques"
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                },
              ]}
            />

            {path &&
            path.status === "DRAFT" &&
            (path.versionNumber || 1) > 1 ? (
              <>
                <FieldLabel label="Note de version / Changements apportés" />
                <TextInput
                  value={versionNote}
                  editable={!working}
                  maxLength={1500}
                  onChangeText={setVersionNote}
                  multiline
                  placeholder="Ex. ajout d’une formation, nouvel ordre, mise à jour des objectifs..."
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  style={[
                    styles.input,
                    styles.multilineSmall,
                    {
                      color: theme.colors.foreground,
                      backgroundColor: theme.colors.background,
                      borderColor: theme.colors.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.versionNoteHelp,
                    {
                      color:
                        theme.colors.foregroundSubtle,
                    },
                  ]}
                >
                  {versionNote.length}/1500 · Cette note sera visible dans l’historique des versions.
                </Text>
              </>
            ) : null}

            <FieldLabel label="Visibilité" />
            <View style={styles.choiceRow}>
              {VISIBILITIES.map((item) => {
                const selected = visibility === item;

                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    disabled={!isDraft || working}
                    onPress={() => setVisibility(item)}
                    style={[
                      styles.choice,
                      {
                        backgroundColor: selected
                          ? theme.colors.accent
                          : theme.colors.surfaceSoft,
                        borderColor: selected
                          ? theme.colors.accent
                          : theme.colors.border,
                        opacity:
                          !isDraft || working ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected
                          ? theme.colors.accentForeground
                          : theme.colors.foreground,
                        fontWeight: "800",
                        fontSize: 12,
                      }}
                    >
                      {visibilityLabel(item)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isDraft ? (
              <AppButton
                title={path ? "Enregistrer" : "Créer le parcours"}
                loading={working}
                onPress={() => void savePath()}
                style={styles.primaryAction}
              />
            ) : (
              <Text
                style={[
                  styles.readOnlyNotice,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Cette version publiée est en lecture seule. Pour faire évoluer son contenu, créez une nouvelle version.
              </Text>
            )}
          </View>

          {path ? (
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
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Formations du parcours
              </Text>

              <Text
                style={[
                  styles.helpText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Une même formation peut être réutilisée dans plusieurs parcours. L’ordre ci-dessous est l’ordre pédagogique du parcours.
              </Text>

              {steps.length === 0 ? (
                <Text
                  style={[
                    styles.emptyText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Aucune formation ajoutée.
                </Text>
              ) : (
                <View style={styles.steps}>
                  {sortSteps(steps).map((step, index) => (
                    <View
                      key={step.id}
                      style={[
                        styles.stepCard,
                        {
                          backgroundColor:
                            theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <View style={styles.stepHeader}>
                        <View style={styles.stepCopy}>
                          <Text
                            style={[
                              styles.stepTitle,
                              { color: theme.colors.foreground },
                            ]}
                          >
                            {index + 1}.{" "}
                            {step.trainingMissing
                              ? "Formation indisponible"
                              : step.trainingTitle ??
                                `Formation #${step.trainingId}`}
                          </Text>
                          <Text
                            style={[
                              styles.stepMeta,
                              {
                                color:
                                  theme.colors.foregroundMuted,
                              },
                            ]}
                          >
                            {step.required
                              ? "Obligatoire"
                              : "Facultative"}
                            {step.trainingStatus
                              ? ` · ${step.trainingStatus}`
                              : ""}
                          </Text>
                        </View>
                      </View>

                      {isDraft ? (
                        <View style={styles.stepActions}>
                          <AppButton
                            title={step.required
                              ? "Rendre facultative"
                              : "Rendre obligatoire"}
                            variant="secondary"
                            disabled={working}
                            onPress={() =>
                              void toggleRequired(step)
                            }
                            style={styles.smallAction}
                          />
                          <AppButton
                            title="↑"
                            variant="secondary"
                            disabled={working || index === 0}
                            onPress={() =>
                              void moveStep(step.id, -1)
                            }
                            style={styles.orderAction}
                          />
                          <AppButton
                            title="↓"
                            variant="secondary"
                            disabled={
                              working ||
                              index === steps.length - 1
                            }
                            onPress={() =>
                              void moveStep(step.id, 1)
                            }
                            style={styles.orderAction}
                          />
                          <AppButton
                            title="Retirer"
                            variant="danger"
                            disabled={working}
                            onPress={() =>
                              confirmRemoveStep(step)
                            }
                            style={styles.smallAction}
                          />
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              )}

              {isDraft ? (
                <View style={styles.addArea}>
                  <Text
                    style={[
                      styles.subTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Ajouter une formation existante
                  </Text>

                  <TextInput
                    value={trainingQuery}
                    onChangeText={setTrainingQuery}
                    placeholder="Rechercher une formation..."
                    placeholderTextColor={
                      theme.colors.foregroundSubtle
                    }
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

                  <View style={styles.trainingChoices}>
                    {availableTrainings.length === 0 ? (
                      <Text
                        style={[
                          styles.emptyText,
                          {
                            color:
                              theme.colors.foregroundMuted,
                          },
                        ]}
                      >
                        Aucune formation disponible pour cet ajout.
                      </Text>
                    ) : (
                      availableTrainings
                        .slice(0, 20)
                        .map((training) => {
                          const selected =
                            selectedTrainingId === training.id;

                          return (
                            <Pressable
                              key={training.id}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              disabled={working}
                              onPress={() =>
                                setSelectedTrainingId(
                                  selected
                                    ? null
                                    : training.id,
                                )
                              }
                              style={[
                                styles.trainingChoice,
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
                                      training.status ===
                                      "PUBLISHED"
                                        ? theme.colors.success
                                        : theme.colors.warning,
                                  },
                                ]}
                              >
                                {training.status ||
                                  "Statut inconnu"}
                              </Text>
                            </Pressable>
                          );
                        })
                    )}
                  </View>

                  <Text
                    style={[
                      styles.helpText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Une formation non publiée peut empêcher le parcours d’être visible dans le catalogue apprenant. Le backend reste l’autorité sur les règles d’ajout et de publication.
                  </Text>

                  <AppButton
                    title="Ajouter au parcours"
                    loading={working}
                    disabled={!selectedTrainingId}
                    onPress={() => void addStep()}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {path ? (
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
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Cycle de vie
              </Text>

              <View style={styles.lifecycleActions}>
                {isDraft ? (
                  <AppButton
                    title="Publier"
                    loading={working}
                    disabled={steps.length === 0}
                    onPress={confirmPublish}
                    style={styles.lifecycleButton}
                  />
                ) : null}

                {isPublished ? (
                  <AppButton
                    title="Archiver"
                    variant="secondary"
                    loading={working}
                    onPress={confirmArchive}
                    style={styles.lifecycleButton}
                  />
                ) : null}

                {isArchived ? (
                  <AppButton
                    title="Désarchiver"
                    variant="secondary"
                    loading={working}
                    onPress={confirmUnarchive}
                    style={styles.lifecycleButton}
                  />
                ) : null}

                {isDraft || isArchived ? (
                  <AppButton
                    title="Supprimer"
                    variant="danger"
                    loading={working}
                    onPress={confirmDelete}
                    style={styles.lifecycleButton}
                  />
                ) : null}
              </View>
            </View>
          ) : null}

          {path && versions.length > 0 ? (
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
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Versions du parcours
              </Text>

              <Text
                style={[
                  styles.helpText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Les versions publiées restent stables. Les évolutions se préparent dans une nouvelle version brouillon.
              </Text>

              <View style={styles.versionList}>
                {versions.map((version) => (
                  <View
                    key={version.id}
                    style={[
                      styles.versionCard,
                      {
                        backgroundColor:
                          version.id === path.id
                            ? theme.colors.surfaceElevated
                            : theme.colors.surfaceSoft,
                        borderColor:
                          version.id === path.id
                            ? theme.colors.accent
                            : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.versionCardHeader}>
                      <View style={styles.versionCardCopy}>
                        <Text
                          style={[
                            styles.versionTitle,
                            { color: theme.colors.foreground },
                          ]}
                        >
                          V{version.versionNumber || 1} · {version.title}
                        </Text>

                        <View style={styles.versionStatusRow}>
                          <StatusBadge
                            label={statusLabel(version.status)}
                            variant={
                              version.status === "PUBLISHED"
                                ? "success"
                                : version.status === "DRAFT"
                                  ? "warning"
                                  : "info"
                            }
                          />

                          {version.id === path.id ? (
                            <Text
                              style={[
                                styles.currentVersionText,
                                {
                                  color: theme.colors.accent,
                                },
                              ]}
                            >
                              Version affichée
                            </Text>
                          ) : null}
                        </View>

                        <Text
                          style={[
                            styles.versionNoteText,
                            {
                              color:
                                theme.colors.foregroundMuted,
                            },
                          ]}
                        >
                          {(version.versionNumber || 1) === 1
                            ? "Version initiale"
                            : version.versionNote?.trim() ||
                              "Aucune note de version renseignée."}
                        </Text>
                      </View>

                      {version.id !== path.id ? (
                        <AppButton
                          title={
                            version.status === "DRAFT"
                              ? "Modifier"
                              : "Ouvrir"
                          }
                          variant="secondary"
                          disabled={working}
                          onPress={() => onPathCreated(version.id)}
                          style={styles.versionOpenButton}
                        />
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {path ? (
            <LearningPathAssignmentProgressPanel
              role={role}
              pathId={path.id}
              pathStatus={path.status}
            />
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function FieldLabel({ label }: { label: string }) {
    return (
      <Text
        style={[
          styles.label,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  page: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  backToPathsButton: {
    alignSelf: "flex-start",
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  visibilityMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 12,
  },
  subTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineSmall: {
    minHeight: 76,
    textAlignVertical: "top",
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choice: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryAction: {
    marginTop: 16,
  },
  versionPrimaryAction: {
    marginBottom: 14,
  },
  infoNotice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  infoNoticeTitle: {
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  infoNoticeText: {
    fontSize: 12,
    lineHeight: 18,
  },
  versionList: {
    gap: 8,
  },
  versionCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  versionCardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  versionCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  versionTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  versionStatusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginTop: 7,
  },
  currentVersionText: {
    fontSize: 11,
    fontWeight: "900",
  },
  versionNoteHelp: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  versionNoteText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  versionOpenButton: {
    minWidth: 92,
  },
  readOnlyNotice: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  helpText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
  steps: {
    gap: 10,
  },
  stepCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  stepCopy: {
    flex: 1,
    minWidth: 0,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  stepMeta: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },
  stepActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  smallAction: {
    minWidth: 128,
  },
  orderAction: {
    minWidth: 54,
  },
  addArea: {
    marginTop: 18,
  },
  trainingChoices: {
    gap: 8,
    marginVertical: 10,
  },
  trainingChoice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 11,
  },
  trainingChoiceTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  trainingChoiceMeta: {
    fontSize: 10,
    fontWeight: "900",
    marginTop: 4,
  },
  lifecycleActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lifecycleButton: {
    minWidth: 120,
  },
});
