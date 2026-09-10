import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Image,
  Pressable,
  ScrollView,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  getLearningPathCatalogDetail,
  getMyLearningPathProgress,
} from "../../features/learningPaths/learningPathService";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearningPathCatalog,
  LearningPathProgress,
  LearningPathStep,
} from "../../types/learningPath";
import { Text } from "../../components/nativewindui/Text";

type Props = {
  pathId: number;
  onBack: () => void;
  onOpenTraining: (trainingId: number) => void;
  onOpenCourse: (
    trainingId: number,
    replay?: boolean,
  ) => void;
};

type PathTab = "TRAININGS" | "ABOUT";

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function clampProgress(value?: number | null): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value?: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function firstAvailableTraining(
  trainings: LearningPathStep[],
): number | null {
  const item = trainings.find(
    (training) =>
      !training.trainingMissing &&
      (!training.trainingStatus ||
        training.trainingStatus === "PUBLISHED"),
  );

  return item?.trainingId ?? null;
}

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

  return "Ce parcours ne peut pas être chargé pour le moment.";
}

function ProgressBar({
  value,
  success = false,
}: {
  value: number;
  success?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();
  const normalized = clampProgress(value);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: normalized,
      }}
      className="h-[8px] w-full overflow-hidden rounded-full"
      style={{
        backgroundColor: theme.colors.surfaceSoft,
      }}
    >
      <View
        className="h-full rounded-full"
        style={{
          width: `${normalized}%`,
          backgroundColor: success
            ? theme.colors.success
            : theme.colors.accent,
        }}
      />
    </View>
  );
}

function MetaChip({
  label,
  icon,
  tint,
  background,
}: {
  label: string;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="min-h-[36px] shrink-0 flex-row items-center rounded-[12px] border px-[9px]"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <View
        className="h-[24px] w-[24px] items-center justify-center rounded-[8px]"
        style={{ backgroundColor: background }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={11}
          weight="bold"
        />
      </View>

      <Text
        numberOfLines={1}
        className="ml-[6px] text-[10px] font-black"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>
    </View>
  );
}

function DashboardKpiCard({
  label,
  value,
  icon,
  tint,
  background,
}: {
  label: string;
  value: string | number;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="w-[31.7%] rounded-[19px] border bg-white px-2.5 py-2.5"
      style={{
        minHeight: 104,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 7,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        elevation: 1,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View
          className="h-9 w-9 items-center justify-center rounded-[12px]"
          style={{
            backgroundColor: background,
          }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={17}
            weight="bold"
          />
        </View>

        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
          className="ml-1 text-[19px] font-black leading-[23px] tracking-[-0.5px]"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {value}
        </Text>
      </View>

      <View className="mt-3 min-h-[26px] justify-end">
        <Text
          numberOfLines={2}
          className="text-[10px] font-extrabold leading-[13px] tracking-[-0.1px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className="min-h-[40px] flex-1 items-center justify-center rounded-[12px] border px-[10px]"
      style={{
        backgroundColor: active
          ? "#F3EEFF"
          : theme.colors.surface,
        borderColor: active
          ? "#E4D8F4"
          : theme.colors.border,
      }}
    >
      <Text
        numberOfLines={1}
        className="text-[11px] font-black"
        style={{
          color: active
            ? "#7C3AED"
            : theme.colors.foregroundMuted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function LearnerLearningPathDetailScreen({
  pathId,
  onBack,
  onOpenTraining,
  onOpenCourse,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [path, setPath] =
    useState<LearningPathCatalog | null>(null);
  const [progress, setProgress] =
    useState<LearningPathProgress | null>(null);
  const [activeTab, setActiveTab] =
    useState<PathTab>("TRAININGS");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const detail =
          await getLearningPathCatalogDetail(pathId);

        let learnerProgress: LearningPathProgress | null = null;

        if (detail.assignedToMe) {
          learnerProgress =
            await getMyLearningPathProgress(pathId);
        }

        if (active) {
          setPath(detail);
          setProgress(learnerProgress);
        }
      } catch (caught: unknown) {
        if (active) {
          setPath(null);
          setProgress(null);
          setError(apiErrorMessage(caught));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [pathId]);

  const orderedTrainings = useMemo(
    () =>
      [...(path?.trainings || [])].sort(
        (a, b) =>
          a.position - b.position ||
          a.id - b.id,
      ),
    [path?.trainings],
  );

  if (loading) {
    return <LoadingState message="Chargement du parcours..." />;
  }

  if (!path) {
    return (
      <ScreenContainer>
        <View className="w-full max-w-[760px] self-center px-4 pt-4">
          <ErrorMessage
            message={error || "Parcours indisponible."}
          />

          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            android_ripple={{ color: "transparent" }}
            className="mt-3 min-h-[46px] flex-row items-center justify-center self-start rounded-[13px] border px-4"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <SymbolView
              name={{
                ios: "chevron.left",
                android: "arrow_back",
                web: "arrow_back",
              }}
              tintColor={theme.colors.accent}
              size={13}
              weight="bold"
            />

            <Text
              className="ml-2 text-[11px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Retour
            </Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  const completionProgress = clampProgress(
    progress?.completionProgressPercentage,
  );

  const overallProgress = clampProgress(
    progress?.overallProgressPercentage,
  );

  const fallbackTrainingId =
    firstAvailableTraining(orderedTrainings);

  const startTrainingId =
    progress?.nextTrainingId || fallbackTrainingId;

  const completed = progress?.completed === true;
  const started =
    (progress?.overallProgressPercentage || 0) > 0;

  const dueAt = formatDateTime(progress?.pathDueAt);

  const updatedAt = formatDate(path.updatedAt);

  const coverUrl = buildLearnerMediaUrl(
    path.coverImageUrl || path.coverImagePath,
  );

  const duration =
    typeof path.estimatedDurationHours === "number" &&
    path.estimatedDurationHours > 0
      ? `${path.estimatedDurationHours} h`
      : null;

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        className="flex-1 min-h-[0px]"
        contentContainerClassName="grow px-[14px] pt-[12px] pb-[18px]"
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[760px] self-center">
          {/* HERO — même famille visuelle que Accueil / Activité */}
          <View
            className="overflow-hidden rounded-[26px] border bg-[#FFFFFF] p-[16px]"
            style={{
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              shadowOpacity: 0.05,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 2,
            }}
          >
            <View className="absolute -right-[76px] -top-[94px] h-[188px] w-[188px] rounded-full bg-[#F3EEFF]" />
            <View className="absolute right-[34px] top-[-32px] h-[72px] w-[72px] rounded-full bg-[#E2D4FF] opacity-[0.82]" />

            <View className="flex-row items-center">
              <View className="h-[50px] w-[50px] items-center justify-center overflow-hidden rounded-[16px] bg-[#FAF8F5]">
                {coverUrl ? (
                  <Image
                    source={{ uri: coverUrl }}
                    accessibilityLabel={`Couverture de ${path.title}`}
                    resizeMode="cover"
                    className="h-full w-full"
                  />
                ) : (
                  <SymbolView
                    name={{
                      ios: "square.stack.3d.up.fill",
                      android: "layers",
                      web: "layers",
                    }}
                    tintColor="#7C3AED"
                    size={24}
                    weight="bold"
                  />
                )}
              </View>

              <View className="ml-[10px] min-h-[28px] rounded-full bg-[#F3EEFF] px-[11px] items-center justify-center">
                <Text className="text-[10px] font-black tracking-[0.65px] text-[#7C3AED]">
                  PARCOURS APPRENANT
                </Text>
              </View>
            </View>

            <Text
              className="mt-[14px] text-[25px] leading-[30px] font-black tracking-[-0.6px]"
              style={{ color: theme.colors.foreground }}
            >
              {path.title}
            </Text>

            {path.shortDescription || path.description ? (
              <Text
                className="mt-[5px] max-w-[94%] text-[14px] leading-[20px]"
                style={{ color: theme.colors.foregroundMuted }}
                numberOfLines={3}
              >
                {path.shortDescription || path.description}
              </Text>
            ) : null}

            <View className="mt-[17px]">
              <View className="mb-[10px]">
                <Text
                  className="text-[18px] font-black leading-[22px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Indicateurs clés
                </Text>
                <Text
                  className="mt-[2px] text-[11px] leading-[16px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Une vue rapide des données réelles de ce parcours.
                </Text>
              </View>

              <View className="flex-row flex-wrap justify-between gap-y-3">
                <DashboardKpiCard
                  label="Formations"
                  value={path.totalTrainings}
                  icon={{
                    ios: "book.pages.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                />

                <DashboardKpiCard
                  label="Obligatoires"
                  value={path.requiredTrainings}
                  icon={{
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }}
                  tint="#16A36A"
                  background="#ECFDF3"
                />

                <DashboardKpiCard
                  label="Facultatives"
                  value={path.optionalTrainings}
                  icon={{
                    ios: "plus.circle.fill",
                    android: "add_circle",
                    web: "add_circle",
                  }}
                  tint="#2563EB"
                  background="#EFF6FF"
                />

                <DashboardKpiCard
                  label="Durée"
                  value={`${path.estimatedDurationHours} h`}
                  icon={{
                    ios: "clock.fill",
                    android: "schedule",
                    web: "schedule",
                  }}
                  tint="#D97706"
                  background="#FFF7ED"
                />

                <DashboardKpiCard
                  label="Complétion"
                  value={progress ? `${completionProgress}%` : "—"}
                  icon={{
                    ios: "chart.bar.fill",
                    android: "bar_chart",
                    web: "bar_chart",
                  }}
                  tint="#7C3AED"
                  background="#F3EEFF"
                />

                <DashboardKpiCard
                  label="Affecté"
                  value={path.assignedToMe ? "Oui" : "Non"}
                  icon={{
                    ios: path.assignedToMe
                      ? "person.crop.circle.badge.checkmark"
                      : "person.crop.circle",
                    android: path.assignedToMe
                      ? "verified_user"
                      : "person",
                    web: path.assignedToMe
                      ? "verified_user"
                      : "person",
                  }}
                  tint={path.assignedToMe ? "#16A36A" : "#D97706"}
                  background={path.assignedToMe ? "#ECFDF3" : "#FFF7ED"}
                />
              </View>
            </View>
          </View>

          {/* PROGRESSION */}
          {progress ? (
            <View
              className="mt-[14px] rounded-[22px] border p-[13px]"
              style={{
                borderColor: progress.completed
                  ? "#BBF7D0"
                  : "#DCCFF0",
                backgroundColor: progress.completed
                  ? "#F4FBF7"
                  : "#F8F4FF",
              }}
            >
              <View className="flex-row items-center">
                <View className="h-[44px] w-[44px] items-center justify-center rounded-[14px] bg-[#FFFFFF]">
                  <SymbolView
                    name={{
                      ios: progress.completed
                        ? "checkmark.circle.fill"
                        : "chart.line.uptrend.xyaxis",
                      android: progress.completed
                        ? "check_circle"
                        : "monitoring",
                      web: progress.completed
                        ? "check_circle"
                        : "monitoring",
                    }}
                    tintColor={
                      progress.completed
                        ? theme.colors.success
                        : theme.colors.accent
                    }
                    size={18}
                    weight="bold"
                  />
                </View>

                <View className="ml-[10px] min-w-0 flex-1">
                  <Text
                    className="text-[10px] font-black tracking-[0.55px]"
                    style={{
                      color: progress.completed
                        ? theme.colors.success
                        : theme.colors.accent,
                    }}
                  >
                    PROGRESSION DU PARCOURS
                  </Text>
                  <Text
                    className="mt-[2px] text-[18px] leading-[22px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    {progress.completed
                      ? "Parcours terminé"
                      : started
                        ? "Progression en cours"
                        : "Parcours à démarrer"}
                  </Text>
                </View>

                <Text
                  className="ml-[8px] text-[27px] font-black tracking-[-0.6px]"
                  style={{
                    color: progress.completed
                      ? theme.colors.success
                      : theme.colors.accent,
                  }}
                >
                  {completionProgress}%
                </Text>
              </View>

              <View className="mt-[11px]">
                <ProgressBar
                  value={completionProgress}
                  success={progress.completed}
                />
              </View>

              <View className="mt-[10px] flex-row gap-[8px]">
                <View className="min-h-[64px] min-w-0 flex-1 rounded-[14px] bg-[#FFFFFF] px-[10px] py-[8px]">
                  <Text
                    className="text-[9px] font-black uppercase leading-[12px] tracking-[0.35px]"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    Formations obligatoires
                  </Text>
                  <View className="mt-[3px] flex-row items-end">
                    <Text
                      className="text-[17px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {progress.completedRequiredSteps} /{" "}
                      {progress.requiredSteps || progress.totalSteps}
                    </Text>
                    <Text
                      className="mb-[1px] ml-[5px] text-[9px] font-bold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      terminées
                    </Text>
                  </View>
                </View>

                <View className="min-h-[58px] min-w-0 flex-1 rounded-[14px] bg-[#FFFFFF] px-[10px] py-[8px]">
                  <Text
                    className="text-[9px] font-black uppercase tracking-[0.45px]"
                    style={{ color: theme.colors.foregroundSubtle }}
                  >
                    Progression globale
                  </Text>
                  <Text
                    className="mt-[3px] text-[17px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    {overallProgress}%
                  </Text>
                </View>
              </View>

              {dueAt ? (
                <View className="mt-[9px] flex-row items-center rounded-[13px] border border-[#F5D0A8] bg-[#FFF7ED] px-[10px] py-[8px]">
                  <SymbolView
                    name={{
                      ios: "calendar.badge.clock",
                      android: "event",
                      web: "event",
                    }}
                    tintColor="#D97706"
                    size={12}
                    weight="bold"
                  />
                  <Text className="ml-[7px] min-w-0 flex-1 text-[10px] font-black text-[#B45309]">
                    Échéance : {dueAt}
                  </Text>
                </View>
              ) : null}

              {path.canStart && startTrainingId ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    onOpenCourse(startTrainingId, completed)
                  }
                  android_ripple={{ color: "transparent" }}
                  className="mt-[10px] min-h-[54px] flex-row items-center rounded-[15px] bg-[#7C3AED] px-[8px]"
                >
                  <View className="h-[38px] w-[38px] items-center justify-center rounded-[12px] bg-[rgba(255,255,255,0.16)]">
                    <SymbolView
                      name={{
                        ios: completed
                          ? "arrow.counterclockwise"
                          : "play.fill",
                        android: completed ? "replay" : "play_arrow",
                        web: completed ? "replay" : "play_arrow",
                      }}
                      tintColor="#FFFFFF"
                      size={14}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-[9px] min-w-0 flex-1">
                    <Text
                      className="text-[9px] font-black uppercase tracking-[0.55px]"
                      style={{ color: "rgba(255,255,255,0.75)" }}
                    >
                      {completed
                        ? "PARCOURS TERMINÉ"
                        : started
                          ? "EN COURS"
                          : "PRÊT À DÉMARRER"}
                    </Text>
                    <Text
                      className="mt-[1px] text-[13px] font-black"
                      style={{ color: "#FFFFFF" }}
                    >
                      {completed
                        ? "Revoir le parcours"
                        : started
                          ? "Continuer le parcours"
                          : "Commencer le parcours"}
                    </Text>
                  </View>

                  <View className="h-[32px] w-[32px] items-center justify-center rounded-full bg-[rgba(255,255,255,0.16)]">
                    <SymbolView
                      name={{
                        ios: "chevron.right",
                        android: "chevron_right",
                        web: "chevron_right",
                      }}
                      tintColor="#FFFFFF"
                      size={11}
                      weight="bold"
                    />
                  </View>
                </Pressable>
              ) : !path.assignedToMe ? (
                <View
                  className="mt-[10px] flex-row items-start rounded-[13px] border px-[10px] py-[9px]"
                  style={{
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.info,
                  }}
                >
                  <SymbolView
                    name={{
                      ios: "info.circle.fill",
                      android: "info",
                      web: "info",
                    }}
                    tintColor={theme.colors.info}
                    size={12}
                    weight="bold"
                  />
                  <Text
                    className="ml-[7px] min-w-0 flex-1 text-[10px] leading-[15px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Ce parcours doit être affecté à ton compte avant de pouvoir être démarré.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* CONTENU — même logique qu'Activité : heading + filtres + cartes */}
          <View className="mt-[18px]">
            <View className="flex-row items-center">
              <View className="h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-[#EFF6FF]">
                <SymbolView
                  name={{
                    ios: "list.number",
                    android: "format_list_numbered",
                    web: "format_list_numbered",
                  }}
                  tintColor="#2563EB"
                  size={17}
                  weight="bold"
                />
              </View>

              <View className="ml-[10px] min-w-0 flex-1">
                <Text
                  className="text-[18px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Contenu du parcours
                </Text>
                <Text
                  className="mt-[1px] text-[12px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {path.totalTrainings} formation
                  {path.totalTrainings > 1 ? "s" : ""} dans ce parcours.
                </Text>
              </View>
            </View>

            <View className="mt-[11px] flex-row gap-[8px]">
              <TabButton
                label={`Formations (${path.totalTrainings})`}
                active={activeTab === "TRAININGS"}
                onPress={() => setActiveTab("TRAININGS")}
              />
              <TabButton
                label="À propos"
                active={activeTab === "ABOUT"}
                onPress={() => setActiveTab("ABOUT")}
              />
            </View>

            {activeTab === "TRAININGS" ? (
              <View className="mt-[10px] gap-[9px]">
                {orderedTrainings.map((training, index) => {
                  const trainingProgress = progress?.trainings.find(
                    (item) => item.trainingId === training.trainingId,
                  );

                  const percentage = clampProgress(
                    trainingProgress?.progressPercentage,
                  );

                  const stepCompleted = percentage >= 100;
                  const isNext =
                    training.trainingId === progress?.nextTrainingId;

                  return (
                    <Pressable
                      key={training.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Ouvrir ${training.trainingTitle || "la formation"}`}
                      onPress={() =>
                        path.canStart &&
                        onOpenTraining(training.trainingId)
                      }
                      disabled={!path.canStart}
                      android_ripple={{ color: "transparent" }}
                      className="rounded-[20px] border bg-[#FFFFFF] p-[12px]"
                      style={{
                        borderColor: isNext
                          ? "#C4B5FD"
                          : theme.colors.border,
                        opacity: path.canStart ? 1 : 0.78,
                      }}
                    >
                      <View className="flex-row items-start">
                        <View
                          className="h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[15px]"
                          style={{
                            backgroundColor: stepCompleted
                              ? "#ECFDF3"
                              : isNext
                                ? "#F3EEFF"
                                : "#F1F5F9",
                          }}
                        >
                          {stepCompleted ? (
                            <SymbolView
                              name={{
                                ios: "checkmark",
                                android: "check",
                                web: "check",
                              }}
                              tintColor="#16A36A"
                              size={16}
                              weight="bold"
                            />
                          ) : (
                            <Text
                              className="text-[15px] font-black"
                              style={{
                                color: isNext ? "#7C3AED" : "#64748B",
                              }}
                            >
                              {index + 1}
                            </Text>
                          )}
                        </View>

                        <View className="ml-[11px] min-w-0 flex-1">
                          <View className="flex-row items-start">
                            <Text
                              className="min-w-0 flex-1 pr-[8px] text-[15px] leading-[20px] font-black"
                              style={{ color: theme.colors.foreground }}
                              numberOfLines={2}
                            >
                              {training.trainingTitle ||
                                "Titre non renseigné"}
                            </Text>

                            {path.canStart ? (
                              <View className="h-[30px] w-[30px] items-center justify-center rounded-full bg-[#F8F6F3]">
                                <SymbolView
                                  name={{
                                    ios: "chevron.right",
                                    android: "chevron_right",
                                    web: "chevron_right",
                                  }}
                                  tintColor={theme.colors.foregroundSubtle}
                                  size={10}
                                  weight="bold"
                                />
                              </View>
                            ) : null}
                          </View>

                          <View className="mt-[7px] flex-row flex-wrap gap-[6px]">
                            <View
                              className="rounded-full px-[9px] py-[5px]"
                              style={{
                                backgroundColor: stepCompleted
                                  ? "#ECFDF3"
                                  : isNext
                                    ? "#F3EEFF"
                                    : "#F8F6F3",
                              }}
                            >
                              <Text
                                className="text-[10px] font-black"
                                style={{
                                  color: stepCompleted
                                    ? theme.colors.success
                                    : percentage > 0
                                      ? theme.colors.accent
                                      : theme.colors.foregroundMuted,
                                }}
                              >
                                {stepCompleted
                                  ? "Terminé"
                                  : percentage > 0
                                    ? `En cours · ${percentage}%`
                                    : "À faire"}
                              </Text>
                            </View>

                            <View className="rounded-full bg-[#F8F6F3] px-[9px] py-[5px]">
                              <Text
                                className="text-[10px] font-bold"
                                style={{ color: theme.colors.foregroundSubtle }}
                              >
                                {training.required
                                  ? "Obligatoire"
                                  : "Facultative"}
                              </Text>
                            </View>

                            {training.estimatedDurationHours ? (
                              <View className="rounded-full bg-[#F8F6F3] px-[9px] py-[5px]">
                                <Text
                                  className="text-[10px] font-bold"
                                  style={{
                                    color: theme.colors.foregroundSubtle,
                                  }}
                                >
                                  {training.estimatedDurationHours} h
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="mt-[10px] gap-[9px]">
                {path.description ? (
                  <View
                    className="rounded-[20px] border bg-[#FFFFFF] p-[13px]"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <View className="flex-row items-center">
                      <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-[#EFF6FF]">
                        <SymbolView
                          name={{
                            ios: "doc.text.fill",
                            android: "description",
                            web: "description",
                          }}
                          tintColor="#2563EB"
                          size={15}
                          weight="bold"
                        />
                      </View>
                      <Text
                        className="ml-[9px] text-[14px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Présentation
                      </Text>
                    </View>
                    <Text
                      className="mt-[9px] text-[12px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {path.description}
                    </Text>
                  </View>
                ) : null}

                {path.objectives ? (
                  <View
                    className="rounded-[20px] border bg-[#FFFFFF] p-[13px]"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <View className="flex-row items-center">
                      <View className="h-[38px] w-[38px] items-center justify-center rounded-[13px] bg-[#ECFDF3]">
                        <SymbolView
                          name={{
                            ios: "target",
                            android: "track_changes",
                            web: "track_changes",
                          }}
                          tintColor="#16A36A"
                          size={15}
                          weight="bold"
                        />
                      </View>
                      <Text
                        className="ml-[9px] text-[14px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Objectifs
                      </Text>
                    </View>
                    <Text
                      className="mt-[9px] text-[12px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {path.objectives}
                    </Text>
                  </View>
                ) : null}

                {updatedAt ? (
                  <View
                    className="flex-row items-center rounded-[16px] border bg-[#FFFFFF] px-[11px] py-[10px]"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <View className="h-[32px] w-[32px] items-center justify-center rounded-[10px] bg-[#F8F6F3]">
                      <SymbolView
                        name={{
                          ios: "arrow.clockwise",
                          android: "update",
                          web: "update",
                        }}
                        tintColor="#667085"
                        size={12}
                        weight="bold"
                      />
                    </View>
                    <Text
                      className="ml-[8px] text-[11px] font-bold"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Mis à jour le {updatedAt}
                    </Text>
                  </View>
                ) : null}

                {!path.description && !path.objectives && !updatedAt ? (
                  <View
                    className="rounded-[20px] border bg-[#FFFFFF] p-[13px]"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <Text
                      className="text-[12px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Aucune information complémentaire n’est disponible pour ce parcours.
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
