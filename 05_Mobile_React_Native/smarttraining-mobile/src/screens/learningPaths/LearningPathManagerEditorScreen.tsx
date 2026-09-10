import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
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
type SymbolName = ComponentProps<typeof SymbolView>["name"];

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

function visibilityLabel(value: string): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") return "Sur affectation";
  if (value === "PRIVATE") return "Privé";

  return value;
}


function statusVisual(status: string): {
  label: string;
  color: string;
  soft: string;
} {
  if (status === "PUBLISHED") {
    return { label: "Publié", color: "#16845A", soft: "#EAFBF3" };
  }

  if (status === "DRAFT") {
    return { label: "Brouillon", color: "#B45309", soft: "#FFF4E5" };
  }

  if (status === "ARCHIVED") {
    return { label: "Archivé", color: "#667085", soft: "#F2F4F7" };
  }

  return { label: status, color: "#667085", soft: "#F2F4F7" };
}

function visibilityIcon(value: LearningPathVisibility): SymbolName {
  if (value === "PUBLIC") {
    return {
      ios: "globe",
      android: "public",
      web: "public",
    };
  }

  if (value === "PRIVATE") {
    return {
      ios: "lock.fill",
      android: "lock",
      web: "lock",
    };
  }

  return {
    ios: "person.2.fill",
    android: "group",
    web: "group",
  };
}

function trainingStatusLabel(value?: string | null): string {
  if (value === "PUBLISHED") return "Publiée";
  if (value === "DRAFT") return "Brouillon";
  if (value === "ARCHIVED") return "Archivée";
  return value || "Statut inconnu";
}

function sortSteps(steps: LearningPathStep[]): LearningPathStep[] {
  return [...steps].sort((a, b) => a.position - b.position);
}

export default function LearningPathManagerEditorScreen({
  role,
  userId,
  pathId,
  onPathCreated,
  onPathDeleted,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const infoTopRef = useRef(0);
  const trainingTopRef = useRef(0);
  const focusedYRef = useRef<number | null>(null);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
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

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);

      if (focusedYRef.current === null) return;

      const y = Math.max(0, focusedYRef.current - 110);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: true });
      }, 80);

      setTimeout(() => {
        scrollRef.current?.scrollTo({ y, animated: true });
      }, 240);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  function focusAt(y: number) {
    focusedYRef.current = y;

    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, y - 110),
        animated: true,
      });
    }, 60);
  }


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

  const currentStatus = path ? statusVisual(path.status) : null;
  const sortedSteps = sortSteps(steps);

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={16}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 14,
            paddingTop: 14,
            paddingBottom:
              Platform.OS === "android" && keyboardHeight > 0
                ? keyboardHeight + 28
                : 28,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[760px]">
            {/* HERO */}
            <View
              className="overflow-hidden rounded-[24px] border bg-white"
              style={{
                borderColor: "#E5DFE8",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.05,
                shadowRadius: 10,
                elevation: 2,
              }}
            >
              <View className="h-1.5 bg-[#7C3AED]" />

              <View className="relative overflow-hidden p-3.5">
                <View
                  pointerEvents="none"
                  className="absolute -right-8 -top-10 h-[128px] w-[128px] rounded-full bg-[#F3EEFF]"
                />

                <View className="flex-row items-start">
                  <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: path ? "point.topleft.down.to.point.bottomright.curvepath.fill" : "plus.circle.fill",
                        android: path ? "route" : "add_circle",
                        web: path ? "route" : "add_circle",
                      }}
                      tintColor="#7C3AED"
                      size={18}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1 pr-4">
                    <Text className="text-[9px] font-black uppercase tracking-[0.8px] text-[#7C3AED]">
                      {path ? "Gestion pédagogique" : "Création pédagogique"}
                    </Text>

                    <Text
                      accessibilityRole="header"
                      className={
                        path
                          ? "mt-1 text-[20px] font-black leading-[24px] tracking-[-0.35px]"
                          : "mt-1 text-[22px] font-black leading-[27px] tracking-[-0.4px]"
                      }
                      style={{ color: theme.colors.foreground }}
                    >
                      {path ? path.title : "Créer un parcours"}
                    </Text>

                    <Text
                      className={
                        path
                          ? "mt-1 text-[10px] leading-[15px]"
                          : "mt-1.5 text-[11px] leading-[17px]"
                      }
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {path
                        ? "Organisez les formations, gérez les versions et contrôlez le cycle de publication."
                        : "Définissez les informations essentielles avant d’ajouter les formations du parcours."}
                    </Text>
                  </View>
                </View>

                {path && currentStatus ? (
                  <>
                    <View className="mt-3 flex-row flex-wrap gap-1.5">
                      <InfoPill
                        icon={{
                          ios: "number.circle.fill",
                          android: "tag",
                          web: "tag",
                        }}
                        label={`V${path.versionNumber || 1}`}
                        color="#2563EB"
                        soft="#EFF6FF"
                      />

                      <InfoPill
                        icon={
                          path.status === "PUBLISHED"
                            ? {
                                ios: "checkmark.circle.fill",
                                android: "check_circle",
                                web: "check_circle",
                              }
                            : path.status === "DRAFT"
                              ? {
                                  ios: "pencil.circle.fill",
                                  android: "edit",
                                  web: "edit",
                                }
                              : {
                                  ios: "archivebox.fill",
                                  android: "inventory_2",
                                  web: "inventory_2",
                                }
                        }
                        label={currentStatus.label}
                        color={currentStatus.color}
                        soft={currentStatus.soft}
                      />

                      <InfoPill
                        icon={visibilityIcon(path.visibility)}
                        label={visibilityLabel(path.visibility)}
                        color="#7C3AED"
                        soft="#F3EEFF"
                      />
                    </View>

                    <View className="mt-2.5 flex-row gap-2">
                      <MiniMetric
                        value={String(steps.length)}
                        label="Formations"
                        icon={{
                          ios: "books.vertical.fill",
                          android: "menu_book",
                          web: "menu_book",
                        }}
                      />
                      <MiniMetric
                        value={String(versions.length || 1)}
                        label="Versions"
                        icon={{
                          ios: "square.stack.3d.up.fill",
                          android: "layers",
                          web: "layers",
                        }}
                      />
                    </View>
                  </>
                ) : (
                  <View className="mt-4 flex-row flex-wrap gap-2">
                    <InfoPill
                      icon={{
                        ios: "pencil.and.list.clipboard",
                        android: "edit_note",
                        web: "edit_note",
                      }}
                      label="Brouillon initial"
                      color="#B45309"
                      soft="#FFF4E5"
                    />
                    <InfoPill
                      icon={{
                        ios: "square.stack.3d.up.fill",
                        android: "layers",
                        web: "layers",
                      }}
                      label="Formations ajoutées après création"
                      color="#7C3AED"
                      soft="#F3EEFF"
                    />
                  </View>
                )}
              </View>
            </View>

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
                    Erreur
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

            {isHistoricalPublished ? (
              <NoticeCard
                icon={{
                  ios: "clock.arrow.circlepath",
                  android: "history",
                  web: "history",
                }}
                title="Version historique"
                text="Cette version reste accessible pour les apprenants déjà affectés. Les nouvelles affectations utilisent la dernière version publiée."
                color="#667085"
                soft="#F2F4F7"
              />
            ) : null}

            {isPublished && draftVersion ? (
              <View className="mt-3">
                <PrimaryAction
                  icon={{
                    ios: "pencil.and.list.clipboard",
                    android: "edit_note",
                    web: "edit_note",
                  }}
                  label={`Ouvrir le brouillon V${draftVersion.versionNumber || 1}`}
                  disabled={working}
                  onPress={() => onPathCreated(draftVersion.id)}
                />
              </View>
            ) : null}

            {isPublished && !draftVersion && isLatestPublished ? (
              <View className="mt-3">
                <PrimaryAction
                  icon={{
                    ios: "plus.rectangle.on.rectangle",
                    android: "library_add",
                    web: "library_add",
                  }}
                  label={working ? "Création..." : "Créer une nouvelle version"}
                  disabled={working}
                  onPress={confirmCreateVersion}
                />
              </View>
            ) : null}

            {/* INFORMATIONS */}
            <View
              onLayout={(event) => {
                infoTopRef.current = event.nativeEvent.layout.y;
              }}
            >
              <SectionTitle
                eyebrow="Configuration"
                title="Informations du parcours"
                icon={{
                  ios: "doc.text.fill",
                  android: "description",
                  web: "description",
                }}
              />

              <View
                className="rounded-[20px] border bg-white p-3"
                style={{ borderColor: "#E5DFE8" }}
              >
                <FieldLabel
                  label="Titre du parcours"
                  required
                  counter={`${title.length}`}
                />
                <TextInput
                  value={title}
                  editable={isDraft && !working}
                  onChangeText={setTitle}
                  onFocus={() => focusAt(infoTopRef.current + 25)}
                  placeholder="Ex. Parcours Data & IA"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  className={
                    path
                      ? "h-[46px] rounded-[13px] border px-3 text-[12px]"
                      : "h-[50px] rounded-[14px] border px-3.5 text-[13px]"
                  }
                  style={{
                    color: theme.colors.foreground,
                    backgroundColor: isDraft ? "#FCFBFD" : "#F5F3F6",
                    borderColor: "#E5DFE8",
                    opacity: isDraft ? 1 : 0.72,
                  }}
                />

                <View className="mt-3">
                  <FieldLabel
                    label="Description du parcours"
                    counter={`${description.length}/2000`}
                  />
                  <TextInput
                    value={description}
                    editable={isDraft && !working}
                    maxLength={2000}
                    onChangeText={setDescription}
                    onFocus={() => focusAt(infoTopRef.current + 110)}
                    multiline
                    textAlignVertical="top"
                    placeholder="Contexte, public cible et contenu du parcours"
                    placeholderTextColor={theme.colors.foregroundSubtle}
                    className={
                      path
                        ? "min-h-[76px] rounded-[13px] border px-3 py-2.5 text-[12px]"
                        : "min-h-[92px] rounded-[14px] border px-3.5 py-3 text-[13px]"
                    }
                    style={{
                      color: theme.colors.foreground,
                      backgroundColor: isDraft ? "#FCFBFD" : "#F5F3F6",
                      borderColor: "#E5DFE8",
                      opacity: isDraft ? 1 : 0.72,
                    }}
                  />
                </View>

                <View className="mt-3">
                  <FieldLabel
                    label="Objectifs pédagogiques"
                    counter={`${objectives.length}/2000`}
                  />
                  <TextInput
                    value={objectives}
                    editable={isDraft && !working}
                    maxLength={2000}
                    onChangeText={setObjectives}
                    onFocus={() => focusAt(infoTopRef.current + 250)}
                    multiline
                    textAlignVertical="top"
                    placeholder="Compétences et résultats attendus"
                    placeholderTextColor={theme.colors.foregroundSubtle}
                    className={
                      path
                        ? "min-h-[76px] rounded-[13px] border px-3 py-2.5 text-[12px]"
                        : "min-h-[92px] rounded-[14px] border px-3.5 py-3 text-[13px]"
                    }
                    style={{
                      color: theme.colors.foreground,
                      backgroundColor: isDraft ? "#FCFBFD" : "#F5F3F6",
                      borderColor: "#E5DFE8",
                      opacity: isDraft ? 1 : 0.72,
                    }}
                  />
                </View>

                {path &&
                path.status === "DRAFT" &&
                (path.versionNumber || 1) > 1 ? (
                  <View className="mt-3">
                    <FieldLabel
                      label="Note de version"
                      counter={`${versionNote.length}/1500`}
                    />
                    <TextInput
                      value={versionNote}
                      editable={!working}
                      maxLength={1500}
                      onChangeText={setVersionNote}
                      onFocus={() => focusAt(infoTopRef.current + 390)}
                      multiline
                      textAlignVertical="top"
                      placeholder="Décrivez brièvement les changements de cette version"
                      placeholderTextColor={theme.colors.foregroundSubtle}
                      className="min-h-[72px] rounded-[13px] border bg-[#FCFBFD] px-3 py-2.5 text-[12px]"
                      style={{
                        color: theme.colors.foreground,
                        borderColor: "#E5DFE8",
                      }}
                    />
                    <Text
                      className="mt-1.5 text-[9px] leading-[14px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Cette note sera visible dans l’historique des versions.
                    </Text>
                  </View>
                ) : null}

                <View className="mt-4">
                  <FieldLabel label="Visibilité" />

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                  >
                    {VISIBILITIES.map((item) => {
                      const selected = visibility === item;

                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          disabled={!isDraft || working}
                          onPress={() => setVisibility(item)}
                          android_ripple={{ color: "transparent" }}
                          className="h-[38px] flex-row items-center rounded-[11px] border px-2.5"
                          style={{
                            backgroundColor: selected
                              ? theme.colors.accent
                              : theme.colors.surface,
                            borderColor: selected
                              ? theme.colors.accent
                              : theme.colors.border,
                            opacity: !isDraft || working ? 0.55 : 1,
                          }}
                        >
                          <SymbolView
                            name={visibilityIcon(item)}
                            tintColor={
                              selected
                                ? theme.colors.accentForeground
                                : theme.colors.foregroundSubtle
                            }
                            size={12}
                            weight="bold"
                          />
                          <Text
                            className="ml-1.5 text-[10px] font-black"
                            style={{
                              color: selected
                                ? theme.colors.accentForeground
                                : theme.colors.foregroundMuted,
                            }}
                          >
                            {visibilityLabel(item)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {isDraft ? (
                  <View className="mt-4">
                    <PrimaryAction
                      icon={{
                        ios: path ? "checkmark.circle.fill" : "plus.circle.fill",
                        android: path ? "save" : "add_circle",
                        web: path ? "save" : "add_circle",
                      }}
                      label={
                        working
                          ? "Enregistrement..."
                          : path
                            ? "Enregistrer les modifications"
                            : "Créer le parcours"
                      }
                      disabled={working}
                      onPress={() => void savePath()}
                    />
                  </View>
                ) : (
                  <NoticeCard
                    compact
                    icon={{
                      ios: "lock.fill",
                      android: "lock",
                      web: "lock",
                    }}
                    title="Version en lecture seule"
                    text="Pour modifier le contenu d’une version publiée, créez une nouvelle version brouillon."
                    color="#667085"
                    soft="#F2F4F7"
                  />
                )}
              </View>
            </View>

            {/* FORMATIONS */}
            {path ? (
              <View
                onLayout={(event) => {
                  trainingTopRef.current = event.nativeEvent.layout.y;
                }}
              >
                <SectionTitle
                  eyebrow="Structure"
                  title="Formations du parcours"
                  icon={{
                    ios: "books.vertical.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  trailing={`${steps.length}`}
                />

                <View
                  className="rounded-[22px] border bg-white p-3.5"
                  style={{ borderColor: "#E5DFE8" }}
                >
                  <Text
                    className="text-[10px] leading-[16px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    L’ordre ci-dessous définit la progression pédagogique. Une formation
                    peut être réutilisée dans plusieurs parcours.
                  </Text>

                  {sortedSteps.length === 0 ? (
                    <View className="mt-3 items-center rounded-[17px] bg-[#FAF8FB] px-4 py-6">
                      <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
                        <SymbolView
                          name={{
                            ios: "books.vertical",
                            android: "menu_book",
                            web: "menu_book",
                          }}
                          tintColor="#7C3AED"
                          size={18}
                          weight="bold"
                        />
                      </View>
                      <Text
                        className="mt-3 text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Aucune formation ajoutée
                      </Text>
                      <Text
                        className="mt-1 text-center text-[9px] leading-[14px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Recherchez une formation ci-dessous pour construire ce parcours.
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-3 gap-2.5">
                      {sortedSteps.map((step, index) => (
                        <View
                          key={step.id}
                          className="overflow-hidden rounded-[15px] border bg-[#FCFBFD]"
                          style={{ borderColor: "#E8E2EA" }}
                        >
                          <View className="p-2.5">
                            <View className="flex-row items-start">
                              <View className="h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
                                <Text className="text-[11px] font-black text-[#7C3AED]">
                                  {index + 1}
                                </Text>
                              </View>

                              <View className="ml-2.5 min-w-0 flex-1">
                                <Text
                                  className="text-[11px] font-black leading-[15px]"
                                  style={{ color: theme.colors.foreground }}
                                >
                                  {step.trainingMissing
                                    ? "Formation indisponible"
                                    : step.trainingTitle ??
                                      `Formation #${step.trainingId}`}
                                </Text>

                                <View className="mt-2 flex-row flex-wrap gap-1.5">
                                  <SmallPill
                                    label={
                                      step.required ? "Obligatoire" : "Facultative"
                                    }
                                    color={
                                      step.required ? "#7C3AED" : "#667085"
                                    }
                                    soft={
                                      step.required ? "#F3EEFF" : "#F2F4F7"
                                    }
                                  />
                                  {step.trainingStatus ? (
                                    <SmallPill
                                      label={trainingStatusLabel(step.trainingStatus)}
                                      color={
                                        step.trainingStatus === "PUBLISHED"
                                          ? "#16845A"
                                          : "#B45309"
                                      }
                                      soft={
                                        step.trainingStatus === "PUBLISHED"
                                          ? "#EAFBF3"
                                          : "#FFF4E5"
                                      }
                                    />
                                  ) : null}
                                </View>
                              </View>
                            </View>

                            {isDraft ? (
                              <View className="mt-3 flex-row flex-wrap gap-2">
                                <MiniAction
                                  icon={{
                                    ios: step.required
                                      ? "checkmark.circle.fill"
                                      : "circle",
                                    android: step.required
                                      ? "check_circle"
                                      : "radio_button_unchecked",
                                    web: step.required
                                      ? "check_circle"
                                      : "radio_button_unchecked",
                                  }}
                                  label={
                                    step.required ? "Facultative" : "Obligatoire"
                                  }
                                  disabled={working}
                                  onPress={() => void toggleRequired(step)}
                                />
                                <IconAction
                                  icon={{
                                    ios: "arrow.up",
                                    android: "arrow_upward",
                                    web: "arrow_upward",
                                  }}
                                  label="Monter"
                                  disabled={working || index === 0}
                                  onPress={() => void moveStep(step.id, -1)}
                                />
                                <IconAction
                                  icon={{
                                    ios: "arrow.down",
                                    android: "arrow_downward",
                                    web: "arrow_downward",
                                  }}
                                  label="Descendre"
                                  disabled={
                                    working || index === sortedSteps.length - 1
                                  }
                                  onPress={() => void moveStep(step.id, 1)}
                                />
                                <IconAction
                                  icon={{
                                    ios: "trash.fill",
                                    android: "delete",
                                    web: "delete",
                                  }}
                                  label="Retirer"
                                  danger
                                  disabled={working}
                                  onPress={() => confirmRemoveStep(step)}
                                />
                              </View>
                            ) : null}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {isDraft ? (
                    <View className="mt-4 border-t border-[#EEE9F0] pt-4">
                      <View className="flex-row items-center">
                        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
                          <SymbolView
                            name={{
                              ios: "plus",
                              android: "add",
                              web: "add",
                            }}
                            tintColor="#7C3AED"
                            size={13}
                            weight="bold"
                          />
                        </View>
                        <View className="ml-2.5 min-w-0 flex-1">
                          <Text
                            className="text-[12px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            Ajouter une formation
                          </Text>
                          <Text
                            className="mt-0.5 text-[9px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            Sélectionnez une formation existante de la plateforme.
                          </Text>
                        </View>
                      </View>

                      <View
                        className="mt-3 flex-row items-center rounded-[14px] border bg-[#FCFBFD] px-3"
                        style={{ borderColor: "#E5DFE8" }}
                      >
                        <SymbolView
                          name={{
                            ios: "magnifyingglass",
                            android: "search",
                            web: "search",
                          }}
                          tintColor={theme.colors.foregroundSubtle}
                          size={14}
                        />
                        <TextInput
                          value={trainingQuery}
                          onChangeText={setTrainingQuery}
                          onFocus={() => focusAt(trainingTopRef.current + 410)}
                          placeholder="Rechercher une formation..."
                          placeholderTextColor={theme.colors.foregroundSubtle}
                          className="ml-2 h-[48px] min-w-0 flex-1 text-[12px]"
                          style={{ color: theme.colors.foreground }}
                          returnKeyType="search"
                        />
                        {trainingQuery ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Effacer la recherche"
                            onPress={() => setTrainingQuery("")}
                            className="h-8 w-8 items-center justify-center rounded-full"
                          >
                            <SymbolView
                              name={{
                                ios: "xmark.circle.fill",
                                android: "cancel",
                                web: "cancel",
                              }}
                              tintColor={theme.colors.foregroundSubtle}
                              size={14}
                            />
                          </Pressable>
                        ) : null}
                      </View>

                      <View className="mt-2.5 gap-2">
                        {availableTrainings.length === 0 ? (
                          <Text
                            className="rounded-[14px] bg-[#FAF8FB] px-3 py-4 text-center text-[9px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            Aucune formation disponible pour cet ajout.
                          </Text>
                        ) : (
                          availableTrainings.slice(0, 20).map((training) => {
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
                                    selected ? null : training.id,
                                  )
                                }
                                android_ripple={{ color: "transparent" }}
                                className="flex-row items-center rounded-[14px] border px-3 py-3"
                                style={{
                                  backgroundColor: selected
                                    ? "#F7F2FF"
                                    : "#FCFBFD",
                                  borderColor: selected
                                    ? "#7C3AED"
                                    : "#E5DFE8",
                                  opacity: working ? 0.55 : 1,
                                }}
                              >
                                <View
                                  className="h-7 w-7 items-center justify-center rounded-full border"
                                  style={{
                                    borderColor: selected
                                      ? "#7C3AED"
                                      : "#D7D0DB",
                                    backgroundColor: selected
                                      ? "#7C3AED"
                                      : "#FFFFFF",
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
                                      size={11}
                                      weight="bold"
                                    />
                                  ) : null}
                                </View>

                                <View className="ml-2.5 min-w-0 flex-1">
                                  <Text
                                    className="text-[11px] font-black"
                                    style={{ color: theme.colors.foreground }}
                                  >
                                    {training.title}
                                  </Text>
                                  <Text
                                    className="mt-0.5 text-[8px] font-bold"
                                    style={{
                                      color:
                                        training.status === "PUBLISHED"
                                          ? "#16845A"
                                          : "#B45309",
                                    }}
                                  >
                                    {trainingStatusLabel(training.status)}
                                  </Text>
                                </View>
                              </Pressable>
                            );
                          })
                        )}
                      </View>

                      <View className="mt-3">
                        <PrimaryAction
                          icon={{
                            ios: "plus.circle.fill",
                            android: "add_circle",
                            web: "add_circle",
                          }}
                          label={
                            working
                              ? "Ajout..."
                              : selectedTrainingId
                                ? "Ajouter la formation sélectionnée"
                                : "Sélectionnez une formation"
                          }
                          disabled={working || !selectedTrainingId}
                          onPress={() => void addStep()}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              </View>
            ) : null}

            {/* CYCLE DE VIE */}
            {path ? (
              <>
                <SectionTitle
                  eyebrow="Publication"
                  title="Cycle de vie"
                  icon={{
                    ios: "arrow.triangle.2.circlepath",
                    android: "sync_alt",
                    web: "sync_alt",
                  }}
                />

                <View
                  className="rounded-[22px] border bg-white p-3.5"
                  style={{ borderColor: "#E5DFE8" }}
                >
                  <Text
                    className="text-[10px] leading-[16px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Contrôlez la disponibilité du parcours sans modifier les
                    formations qui le composent.
                  </Text>

                  <View className="mt-3 gap-2">
                    {isDraft ? (
                      <LifecycleAction
                        icon={{
                          ios: "paperplane.fill",
                          android: "publish",
                          web: "publish",
                        }}
                        title="Publier le parcours"
                        description={
                          steps.length === 0
                            ? "Ajoutez au moins une formation avant publication."
                            : "Rendre cette version disponible pour les affectations."
                        }
                        color="#16845A"
                        soft="#EAFBF3"
                        disabled={working || steps.length === 0}
                        onPress={confirmPublish}
                      />
                    ) : null}

                    {isPublished ? (
                      <LifecycleAction
                        icon={{
                          ios: "archivebox.fill",
                          android: "inventory_2",
                          web: "inventory_2",
                        }}
                        title="Archiver"
                        description="Retirer cette version des nouvelles affectations."
                        color="#B45309"
                        soft="#FFF4E5"
                        disabled={working}
                        onPress={confirmArchive}
                      />
                    ) : null}

                    {isArchived ? (
                      <LifecycleAction
                        icon={{
                          ios: "arrow.uturn.backward.circle.fill",
                          android: "restore",
                          web: "restore",
                        }}
                        title="Désarchiver"
                        description="Rendre de nouveau cette version publiée et affectable."
                        color="#2563EB"
                        soft="#EFF6FF"
                        disabled={working}
                        onPress={confirmUnarchive}
                      />
                    ) : null}

                    {isDraft || isArchived ? (
                      <LifecycleAction
                        icon={{
                          ios: "trash.fill",
                          android: "delete",
                          web: "delete",
                        }}
                        title="Supprimer le parcours"
                        description="Supprimer cette version et ses données de parcours."
                        color="#C2413D"
                        soft="#FFF1F0"
                        disabled={working}
                        onPress={confirmDelete}
                      />
                    ) : null}
                  </View>
                </View>
              </>
            ) : null}

            {/* VERSIONS */}
            {path && versions.length > 0 ? (
              <>
                <SectionTitle
                  eyebrow="Historique"
                  title="Versions du parcours"
                  icon={{
                    ios: "square.stack.3d.up.fill",
                    android: "layers",
                    web: "layers",
                  }}
                  trailing={`${versions.length}`}
                />

                <View className="gap-2.5">
                  {versions.map((version) => {
                    const visual = statusVisual(version.status);
                    const current = version.id === path.id;

                    return (
                      <View
                        key={version.id}
                        className="overflow-hidden rounded-[16px] border bg-white"
                        style={{
                          borderColor: current ? "#7C3AED" : "#E5DFE8",
                        }}
                      >
                        {current ? (
                          <View className="h-1 bg-[#7C3AED]" />
                        ) : null}

                        <View className="p-3">
                          <View className="flex-row items-start">
                            <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
                              <Text className="text-[10px] font-black text-[#7C3AED]">
                                V{version.versionNumber || 1}
                              </Text>
                            </View>

                            <View className="ml-3 min-w-0 flex-1">
                              <View className="flex-row items-start justify-between gap-2">
                                <Text
                                  className="min-w-0 flex-1 text-[12px] font-black leading-[17px]"
                                  style={{ color: theme.colors.foreground }}
                                >
                                  {version.title}
                                </Text>

                                <SmallPill
                                  label={visual.label}
                                  color={visual.color}
                                  soft={visual.soft}
                                />
                              </View>

                              <Text
                                className="mt-1.5 text-[9px] leading-[14px]"
                                style={{ color: theme.colors.foregroundMuted }}
                              >
                                {(version.versionNumber || 1) === 1
                                  ? "Version initiale"
                                  : version.versionNote?.trim() ||
                                    "Aucune note de version renseignée."}
                              </Text>

                              {current ? (
                                <Text className="mt-2 text-[8px] font-black uppercase tracking-[0.5px] text-[#7C3AED]">
                                  Version affichée
                                </Text>
                              ) : (
                                <Pressable
                                  accessibilityRole="button"
                                  disabled={working}
                                  onPress={() => onPathCreated(version.id)}
                                  android_ripple={{ color: "transparent" }}
                                  className="mt-2.5 self-start flex-row items-center rounded-[11px] bg-[#F7F2FF] px-2.5 py-2"
                                  style={{ opacity: working ? 0.5 : 1 }}
                                >
                                  <Text className="text-[9px] font-black text-[#7C3AED]">
                                    {version.status === "DRAFT"
                                      ? "Modifier"
                                      : "Ouvrir"}
                                  </Text>
                                  <SymbolView
                                    name={{
                                      ios: "chevron.right",
                                      android: "chevron_right",
                                      web: "chevron_right",
                                    }}
                                    tintColor="#7C3AED"
                                    size={9}
                                    weight="bold"
                                  />
                                </Pressable>
                              )}
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            {path ? (
              <View className="mt-5">
                <LearningPathAssignmentProgressPanel
                  role={role}
                  pathId={path.id}
                  pathStatus={path.status}
                />
              </View>
            ) : null}

            <View className="h-2" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function SectionTitle({
    eyebrow,
    title: sectionTitle,
    icon,
    trailing,
  }: {
    eyebrow: string;
    title: string;
    icon: SymbolName;
    trailing?: string;
  }) {
    return (
      <View className="mb-2 mt-4 flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={14}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[9px] font-black uppercase tracking-[0.7px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {eyebrow}
          </Text>
          <Text
            className="mt-0.5 text-[15px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {sectionTitle}
          </Text>
        </View>

        {trailing ? (
          <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
            <Text className="text-[9px] font-black text-[#7C3AED]">
              {trailing}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  function FieldLabel({
    label,
    required = false,
    counter,
  }: {
    label: string;
    required?: boolean;
    counter?: string;
  }) {
    return (
      <View className="mb-1.5 flex-row items-center justify-between">
        <Text
          className="text-[11px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {label}
          {required ? <Text className="text-[#C2413D]"> *</Text> : null}
        </Text>
        {counter ? (
          <Text
            className="text-[8px] font-bold"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {counter}
          </Text>
        ) : null}
      </View>
    );
  }

  function InfoPill({
    icon,
    label,
    color,
    soft,
  }: {
    icon: SymbolName;
    label: string;
    color: string;
    soft: string;
  }) {
    return (
      <View
        className="flex-row items-center rounded-full px-2.5 py-1.5"
        style={{ backgroundColor: soft }}
      >
        <SymbolView
          name={icon}
          tintColor={color}
          size={10}
          weight="bold"
        />
        <Text
          className="ml-1.5 text-[9px] font-black"
          style={{ color }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function MiniMetric({
    value,
    label,
    icon,
  }: {
    value: string;
    label: string;
    icon: SymbolName;
  }) {
    return (
      <View className="min-w-0 flex-1 flex-row items-center rounded-[14px] bg-[#FAF8FB] px-3 py-2.5">
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white">
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={12}
            weight="bold"
          />
        </View>
        <View className="ml-2.5">
          <Text
            className="text-[14px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
          <Text
            className="text-[8px] font-bold"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {label}
          </Text>
        </View>
      </View>
    );
  }

  function SmallPill({
    label,
    color,
    soft,
  }: {
    label: string;
    color: string;
    soft: string;
  }) {
    return (
      <View className="rounded-full px-2 py-1" style={{ backgroundColor: soft }}>
        <Text className="text-[8px] font-black" style={{ color }}>
          {label}
        </Text>
      </View>
    );
  }

  function PrimaryAction({
    icon,
    label,
    disabled,
    onPress,
  }: {
    icon: SymbolName;
    label: string;
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
        className={
          !path
            ? "h-[48px] w-full flex-row items-center justify-center rounded-[14px] bg-[#7C3AED]"
            : "h-[44px] w-full flex-row items-center justify-center rounded-[13px] bg-[#7C3AED]"
        }
        style={{ opacity: disabled ? 0.48 : 1 }}
      >
        <SymbolView
          name={icon}
          tintColor="#FFFFFF"
          size={14}
          weight="bold"
        />
        <Text className="ml-2 text-[10px] font-black text-white">
          {label}
        </Text>
      </Pressable>
    );
  }

  function NoticeCard({
    icon,
    title: noticeTitle,
    text,
    color,
    soft,
    compact = false,
  }: {
    icon: SymbolName;
    title: string;
    text: string;
    color: string;
    soft: string;
    compact?: boolean;
  }) {
    return (
      <View
        className={`${compact ? "mt-3" : "mt-2.5"} flex-row items-start rounded-[14px] border px-2.5 py-2.5`}
        style={{
          backgroundColor: soft,
          borderColor: `${color}35`,
        }}
      >
        <View className="h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white">
          <SymbolView
            name={icon}
            tintColor={color}
            size={12}
            weight="bold"
          />
        </View>
        <View className="ml-2.5 min-w-0 flex-1">
          <Text className="text-[10px] font-black" style={{ color }}>
            {noticeTitle}
          </Text>
          <Text
            className="mt-1 text-[9px] leading-[14px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {text}
          </Text>
        </View>
      </View>
    );
  }

  function MiniAction({
    icon,
    label,
    disabled,
    onPress,
  }: {
    icon: SymbolName;
    label: string;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        className="flex-row items-center rounded-[10px] border bg-white px-2.5 py-2"
        style={{
          borderColor: "#E5DFE8",
          opacity: disabled ? 0.42 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor="#7C3AED"
          size={10}
          weight="bold"
        />
        <Text
          className="ml-1.5 text-[8px] font-black"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function IconAction({
    icon,
    label,
    disabled,
    danger = false,
    onPress,
  }: {
    icon: SymbolName;
    label: string;
    disabled: boolean;
    danger?: boolean;
    onPress: () => void;
  }) {
    const color = danger ? "#C2413D" : "#667085";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        className="h-8 w-8 items-center justify-center rounded-[10px] border bg-white"
        style={{
          borderColor: danger ? "#F2C6C3" : "#E5DFE8",
          opacity: disabled ? 0.38 : 1,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={color}
          size={11}
          weight="bold"
        />
      </Pressable>
    );
  }

  function LifecycleAction({
    icon,
    title: actionTitle,
    description: actionDescription,
    color,
    soft,
    disabled,
    onPress,
  }: {
    icon: SymbolName;
    title: string;
    description: string;
    color: string;
    soft: string;
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
        className="flex-row items-center rounded-[14px] border px-2.5 py-2.5"
        style={{
          backgroundColor: soft,
          borderColor: `${color}35`,
          opacity: disabled ? 0.48 : 1,
        }}
      >
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-white">
          <SymbolView
            name={icon}
            tintColor={color}
            size={14}
            weight="bold"
          />
        </View>
        <View className="ml-2.5 min-w-0 flex-1">
          <Text className="text-[10px] font-black" style={{ color }}>
            {actionTitle}
          </Text>
          <Text
            className="mt-0.5 text-[8px] leading-[13px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {actionDescription}
          </Text>
        </View>
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor={color}
          size={10}
          weight="bold"
        />
      </Pressable>
    );
  }
}
