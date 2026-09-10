import { isAxiosError } from "axios";
import { SymbolView } from "expo-symbols";
import type { ComponentProps, ReactNode } from "react";
import { Href, router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  archiveTrainerTraining,
  deleteTrainerTraining,
  moveTrainerTrainingToDraft,
  publishTrainerTraining,
} from "../../features/trainer/trainerAuthoringService";
import { getTrainerTrainingDetail } from "../../features/trainer/trainerTrainingService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerEnrollment,
  TrainerTraining,
  TrainerTrainingMetrics,
} from "../../types/trainerMobile";

type Detail = {
  training: TrainerTraining;
  enrollments: TrainerEnrollment[];
  metrics: TrainerTrainingMetrics;
};

type LifecycleAction =
  | "PUBLISH"
  | "DRAFT"
  | "ARCHIVE"
  | "DELETE"
  | null;

type Props = {
  trainingId: number;
  onDeleted: () => void;
  onManageContent: () => void;
  onPreview: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type Tone = "violet" | "blue" | "green" | "orange" | "red";

const TONES: Record<Tone, { soft: string; icon: string }> = {
  violet: { soft: "#F1E9FF", icon: "#7C3AED" },
  blue: { soft: "#EAF2FF", icon: "#397BE8" },
  green: { soft: "#EAFBF3", icon: "#12A66A" },
  orange: { soft: "#FFF4E5", icon: "#F59E0B" },
  red: { soft: "#FFF0F1", icon: "#E5484D" },
};

function statusLabel(value?: string | null): string {
  if (value === "PUBLISHED") return "Publiée";
  if (value === "DRAFT") return "Brouillon";
  if (value === "ARCHIVED") return "Archivée";

  return value || "Non renseigné";
}

function statusTone(value?: string | null): Tone {
  if (value === "PUBLISHED") return "green";
  if (value === "DRAFT") return "orange";
  if (value === "ARCHIVED") return "blue";

  return "violet";
}

function levelLabel(value?: string | null): string {
  if (value === "DEBUTANT") return "Débutant";
  if (value === "INTERMEDIAIRE") return "Intermédiaire";
  if (value === "AVANCE") return "Avancé";

  return value || "Non renseigné";
}

function visibilityLabel(value?: string | null): string {
  if (value === "PUBLIC") return "Publique";
  if (value === "PRIVATE") return "Privée";
  if (value === "ASSIGNED_ONLY") return "Affectation uniquement";

  return value || "Non renseignée";
}

function enrollmentLabel(value?: string | null): string {
  if (value === "ASSIGNMENT_ONLY") return "Affectation";
  if (value === "SELF_ENROLLMENT") return "Auto-inscription";
  if (value === "ACCESS_CODE") return "Code d’accès";
  if (value === "INVITATION") return "Invitation";

  return value || "Non renseigné";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "Non disponible";
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(parsed);
}

function actionTitle(action: LifecycleAction): string {
  if (action === "PUBLISH") return "Publier la formation";
  if (action === "DRAFT") return "Remettre en brouillon";
  if (action === "ARCHIVE") return "Archiver la formation";
  if (action === "DELETE") return "Supprimer définitivement";

  return "";
}

function actionDescription(action: LifecycleAction): string {
  if (action === "PUBLISH") {
    return "La formation sera publiée et deviendra accessible selon sa visibilité et son mode d’inscription.";
  }

  if (action === "DRAFT") {
    return "La formation repassera en brouillon afin de pouvoir être modifiée.";
  }

  if (action === "ARCHIVE") {
    return "La formation sera archivée. Son historique reste conservé.";
  }

  if (action === "DELETE") {
    return "Cette suppression est définitive. Elle n’est disponible que pour une formation en brouillon ou archivée.";
  }

  return "";
}

function errorText(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === "string" && data.trim()) {
      return data.trim();
    }

    if (typeof data === "object" && data !== null) {
      const candidate =
        (data as { message?: unknown }).message ??
        (data as { error?: unknown }).error;

      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    if (error.response?.status === 400) {
      return "La formation ne remplit pas encore les conditions de cette action.";
    }

    if (error.response?.status === 403) {
      return "Vous n’êtes pas autorisé à effectuer cette action sur cette formation.";
    }

    if (!error.response) {
      return "Impossible de joindre SmartTraining. Vérifiez la connexion puis réessayez.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "L’action n’a pas pu être réalisée.";
}

export default function TrainerTrainingDetailScreen({
  trainingId,
  onDeleted,
  onManageContent,
  onPreview,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [confirmAction, setConfirmAction] =
    useState<LifecycleAction>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    const loaded = await getTrainerTrainingDetail(trainingId);
    setDetail(loaded);
  }

  useEffect(() => {
    let active = true;

    void getTrainerTrainingDetail(trainingId)
      .then((loaded) => {
        if (active) {
          setDetail(loaded);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger cette formation.");
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
  }, [trainingId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser cette formation.");
    } finally {
      setRefreshing(false);
    }
  }

  async function applyLifecycle() {
    if (!confirmAction || transitioning) {
      return;
    }

    setTransitioning(true);
    setError("");
    setNotice("");

    try {
      if (confirmAction === "PUBLISH") {
        await publishTrainerTraining(trainingId);
        setNotice("Formation publiée.");
      } else if (confirmAction === "DRAFT") {
        await moveTrainerTrainingToDraft(trainingId);
        setNotice("Formation remise en brouillon.");
      } else if (confirmAction === "ARCHIVE") {
        await archiveTrainerTraining(trainingId);
        setNotice("Formation archivée.");
      } else if (confirmAction === "DELETE") {
        await deleteTrainerTraining(trainingId);
        setConfirmAction(null);
        onDeleted();
        return;
      }

      setConfirmAction(null);
      await load();
    } catch (caught) {
      // MOBILE_EMPTY_DRAFT_PUBLICATION_ESCAPE_SAFE_V1
      const lifecycleError = errorText(caught);
      setConfirmAction(null);

      if (
        confirmAction === "PUBLISH" &&
        lifecycleError.includes("au moins un module")
      ) {
        setError("");
        onManageContent();
        return;
      }

      setError(lifecycleError);
    } finally {
      setTransitioning(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de la formation..." />;
  }

  if (!detail) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message={error || "Formation indisponible."}
          onRetry={() => void refresh()}
        />
      </ScreenContainer>
    );
  }

  const { training, enrollments, metrics } = detail;
  const currentStatusTone = TONES[statusTone(training.status)];

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px] px-4">
          {/* HERO FORMATION */}
          <View
            className="-mx-4 rounded-b-[26px] px-5 pb-5 pt-4"
            style={{
              backgroundColor: theme.colors.headerBackground,
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View className="flex-row items-start">
              <View
                className="h-[52px] w-[52px] items-center justify-center rounded-[16px]"
                style={{ backgroundColor: "#2B1A49" }}
              >
                <SymbolView
                  name={{
                    ios: "rectangle.stack.fill",
                    android: "menu_book",
                    web: "menu_book",
                  }}
                  tintColor="#C4B5FD"
                  size={22}
                  weight="bold"
                />
              </View>

              <View className="ml-3 min-w-0 flex-1">
                <Text className="text-[9px] font-black uppercase tracking-[0.8px] text-[#C4B5FD]">
                  Suivi de la formation
                </Text>

                <Text
                  className="mt-1 text-[21px] font-black leading-[26px] text-white"
                >
                  {training.title}
                </Text>

                <Text className="mt-2 text-[10px] leading-[15px] text-white/65">
                  Pilotez son statut, son contenu et le suivi apprenant depuis
                  le mobile.
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              <View
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: currentStatusTone.soft }}
              >
                <Text
                  className="text-[9px] font-black"
                  style={{ color: currentStatusTone.icon }}
                >
                  {statusLabel(training.status)}
                </Text>
              </View>

              <View className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-[9px] font-extrabold text-white/85">
                  {training.category || "Sans catégorie"}
                </Text>
              </View>

              <View className="rounded-full bg-white/10 px-3 py-1.5">
                <Text className="text-[9px] font-extrabold text-white/85">
                  {levelLabel(training.level)}
                </Text>
              </View>
            </View>
          </View>

          {error ? (
            <View className="mt-4">
              <ErrorMessage
                message={error}
                onRetry={() => setError("")}
              />
            </View>
          ) : null}

          {notice ? (
            <View
              className="mt-4 flex-row items-center rounded-[16px] border p-3"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              }}
            >
              <View className="h-8 w-8 items-center justify-center rounded-full bg-white">
                <SymbolView
                  name={{
                    ios: "checkmark",
                    android: "check",
                    web: "check",
                  }}
                  tintColor={theme.colors.success}
                  size={14}
                  weight="bold"
                />
              </View>

              <Text
                className="ml-2.5 flex-1 text-[10px] font-extrabold"
                style={{ color: theme.colors.foreground }}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          {/* KPI COMPACTS */}
          <View className="mt-5 flex-row gap-2.5">
            <MetricCard
              icon={{
                ios: "person.2.fill",
                android: "groups",
                web: "groups",
              }}
              value={String(metrics.learners)}
              label="Apprenants"
              tone="violet"
            />

            <MetricCard
              icon={{
                ios: "chart.line.uptrend.xyaxis",
                android: "trending_up",
                web: "trending_up",
              }}
              value={`${metrics.averageProgress} %`}
              label="Progression"
              tone="blue"
            />

            <MetricCard
              icon={{
                ios: "star.fill",
                android: "star",
                web: "star",
              }}
              value={
                typeof training.averageRating === "number"
                  ? training.averageRating.toFixed(1)
                  : "-"
              }
              label="Note"
              tone="orange"
            />
          </View>

          {/* CYCLE DE VIE */}
          <SectionHeading
            icon={{
              ios: "arrow.triangle.2.circlepath",
              android: "sync",
              web: "sync",
            }}
            title="Cycle de vie"
            subtitle="Gérez le statut de cette formation."
          />

          <SurfaceCard>
            <View className="flex-row items-center">
              <View
                className="h-11 w-11 items-center justify-center rounded-[14px]"
                style={{ backgroundColor: currentStatusTone.soft }}
              >
                <SymbolView
                  name={{
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }}
                  tintColor={currentStatusTone.icon}
                  size={19}
                  weight="bold"
                />
              </View>

              <View className="ml-3 flex-1">
                <Text
                  className="text-[8px] font-black uppercase tracking-[0.7px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Statut actuel
                </Text>

                <Text
                  className="mt-0.5 text-[16px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {statusLabel(training.status)}
                </Text>
              </View>
            </View>

            <View className="mt-4 flex-row flex-wrap gap-2">
              {training.status === "DRAFT" ? (
                <LifecycleButton
                  title="Publier"
                  icon={{
                    ios: "paperplane.fill",
                    android: "publish",
                    web: "publish",
                  }}
                  tone="primary"
                  onPress={() => setConfirmAction("PUBLISH")}
                />
              ) : null}

              {training.status === "PUBLISHED" ||
              training.status === "ARCHIVED" ? (
                <LifecycleButton
                  title="Remettre en brouillon"
                  icon={{
                    ios: "arrow.uturn.backward",
                    android: "undo",
                    web: "undo",
                  }}
                  onPress={() => setConfirmAction("DRAFT")}
                />
              ) : null}

              {training.status !== "ARCHIVED" ? (
                <LifecycleButton
                  title="Archiver"
                  icon={{
                    ios: "archivebox.fill",
                    android: "archive",
                    web: "archive",
                  }}
                  onPress={() => setConfirmAction("ARCHIVE")}
                />
              ) : null}

              {training.status === "DRAFT" ||
              training.status === "ARCHIVED" ? (
                <LifecycleButton
                  title="Supprimer"
                  icon={{
                    ios: "trash.fill",
                    android: "delete",
                    web: "delete",
                  }}
                  tone="danger"
                  onPress={() => setConfirmAction("DELETE")}
                />
              ) : null}
            </View>
          </SurfaceCard>

          {/* CONTENU */}
          <SectionHeading
            icon={{
              ios: "books.vertical.fill",
              android: "menu_book",
              web: "menu_book",
            }}
            title="Contenu pédagogique"
            subtitle="Modules, leçons, ressources et quiz."
          />

          <SurfaceCard>
            <ActionRow
              icon={{
                ios: "list.bullet.rectangle.fill",
                android: "view_list",
                web: "view_list",
              }}
              tone="violet"
              title={
                training.status === "DRAFT"
                  ? "Gérer le contenu"
                  : "Voir le contenu"
              }
              subtitle="Modules, leçons et ressources"
              onPress={onManageContent}
            />

            <Divider />

            <ActionRow
              icon={{
                ios: "questionmark.square.fill",
                android: "quiz",
                web: "quiz",
              }}
              tone="blue"
              title="Gérer les quiz"
              subtitle="Évaluations rattachées à la formation"
              onPress={() =>
                router.push(
                  `/trainer/trainings/${trainingId}/quizzes` as Href,
                )
              }
            />

            <Divider />

            <ActionRow
              icon={{
                ios: "eye.fill",
                android: "visibility",
                web: "visibility",
              }}
              tone="green"
              title="Prévisualiser"
              subtitle="Voir le rendu côté apprenant"
              onPress={onPreview}
            />
          </SurfaceCard>

          {/* PARAMÈTRES */}
          <SectionHeading
            icon={{
              ios: "slider.horizontal.3",
              android: "tune",
              web: "tune",
            }}
            title="Paramètres"
            subtitle="Configuration actuelle de la formation."
          />

          <SurfaceCard>
            <InfoRow
              icon={{
                ios: "eye.fill",
                android: "visibility",
                web: "visibility",
              }}
              label="Visibilité"
              value={visibilityLabel(training.visibility)}
              tone="violet"
            />

            <Divider />

            <InfoRow
              icon={{
                ios: "person.crop.circle.badge.plus",
                android: "person_add",
                web: "person_add",
              }}
              label="Inscription"
              value={enrollmentLabel(training.enrollmentMode)}
              tone="blue"
            />

            <Divider />

            <InfoRow
              icon={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              label="Durée"
              value={
                training.estimatedDurationHours
                  ? `${training.estimatedDurationHours} h`
                  : "Non renseignée"
              }
              tone="orange"
            />

            <Divider />

            <InfoRow
              icon={{
                ios: "calendar",
                android: "calendar_today",
                web: "calendar_today",
              }}
              label="Créée le"
              value={formatDate(training.createdAt)}
              tone="green"
            />
          </SurfaceCard>

          {/* INFORMATIONS PÉDAGOGIQUES */}
          <SectionHeading
            icon={{
              ios: "doc.text.fill",
              android: "description",
              web: "description",
            }}
            title="Informations pédagogiques"
            subtitle="Les informations renseignées pour cette formation."
          />

          <SurfaceCard>
            <TextBlock
              icon={{
                ios: "text.alignleft",
                android: "notes",
                web: "notes",
              }}
              title="Description"
              text={
                training.description ||
                training.shortDescription ||
                "Aucune description."
              }
            />

            <Divider />

            <TextBlock
              icon={{
                ios: "target",
                android: "track_changes",
                web: "track_changes",
              }}
              title="Objectifs pédagogiques"
              text={training.objectives || "Aucun objectif renseigné."}
            />

            <Divider />

            <TextBlock
              icon={{
                ios: "checklist",
                android: "checklist",
                web: "checklist",
              }}
              title="Prérequis"
              text={training.prerequisites || "Aucun prérequis renseigné."}
            />

            <Divider />

            <TextBlock
              icon={{
                ios: "person.3.fill",
                android: "groups",
                web: "groups",
              }}
              title="Public cible"
              text={training.targetAudience || "Non renseigné."}
            />
          </SurfaceCard>

          {/* SUIVI APPRENANT */}
          <SectionHeading
            icon={{
              ios: "person.2.fill",
              android: "groups",
              web: "groups",
            }}
            title="Suivi apprenant"
            subtitle="Inscriptions actuellement rattachées à cette formation."
          />

          <SurfaceCard>
            <View className="flex-row items-center">
              <View
                className="h-12 w-12 items-center justify-center rounded-[15px]"
                style={{ backgroundColor: TONES.violet.soft }}
              >
                <SymbolView
                  name={{
                    ios: "person.2.fill",
                    android: "groups",
                    web: "groups",
                  }}
                  tintColor={TONES.violet.icon}
                  size={20}
                  weight="bold"
                />
              </View>

              <View className="ml-3 flex-1">
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  {enrollments.length}
                </Text>

                <Text
                  className="mt-0.5 text-[10px] leading-[14px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {enrollments.length === 0
                    ? "Aucun apprenant inscrit."
                    : `${enrollments.length} inscription${
                        enrollments.length > 1 ? "s" : ""
                      } sur cette formation.`}
                </Text>
              </View>
            </View>
          </SurfaceCard>
        </View>
      </ScrollView>

      {/* CONFIRMATION CYCLE DE VIE */}
      {confirmAction ? (
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            android_ripple={{ color: "transparent" }}
            onPress={() => {
              if (!transitioning) {
                setConfirmAction(null);
              }
            }}
          />

          <View
            className="w-full max-w-[520px] rounded-[24px] border bg-white p-5"
            style={{
              borderColor: "#E2DCE6",
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.18,
              shadowRadius: 18,
              elevation: 10,
            }}
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-[14px]"
              style={{
                backgroundColor:
                  confirmAction === "DELETE"
                    ? TONES.red.soft
                    : TONES.violet.soft,
              }}
            >
              <SymbolView
                name={
                  confirmAction === "DELETE"
                    ? {
                        ios: "trash.fill",
                        android: "delete",
                        web: "delete",
                      }
                    : {
                        ios: "arrow.triangle.2.circlepath",
                        android: "sync",
                        web: "sync",
                      }
                }
                tintColor={
                  confirmAction === "DELETE"
                    ? TONES.red.icon
                    : TONES.violet.icon
                }
                size={19}
                weight="bold"
              />
            </View>

            <Text
              className="mt-4 text-[19px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              {actionTitle(confirmAction)}
            </Text>

            <Text
              className="mt-2 text-[11px] leading-[17px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {actionDescription(confirmAction)}
            </Text>

            <View className="mt-5 flex-row flex-wrap justify-end gap-2.5">
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={transitioning}
                onPress={() => setConfirmAction(null)}
                style={styles.confirmButton}
              />

              <AppButton
                title={
                  transitioning
                    ? "Traitement..."
                    : confirmAction === "DELETE"
                      ? "Supprimer définitivement"
                      : "Confirmer"
                }
                loading={transitioning}
                onPress={() => void applyLifecycle()}
                style={styles.confirmButton}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );

  function SectionHeading({
    icon,
    title,
    subtitle,
  }: {
    icon: SymbolName;
    title: string;
    subtitle: string;
  }) {
    return (
      <View className="mb-3 mt-5 flex-row items-center">
        <View
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px]"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <SymbolView
            name={icon}
            tintColor={theme.colors.accent}
            size={18}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[18px] font-black leading-[22px]"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>

          <Text
            className="mt-0.5 text-[10px] leading-[14px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }

  function SurfaceCard({ children }: { children: ReactNode }) {
    return (
      <View
        className="rounded-[22px] border bg-white p-3.5"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 2,
        }}
      >
        {children}
      </View>
    );
  }

  function MetricCard({
    icon,
    value,
    label,
    tone,
  }: {
    icon: SymbolName;
    value: string;
    label: string;
    tone: Tone;
  }) {
    const palette = TONES[tone];

    return (
      <View
        className="min-w-0 flex-1 rounded-[18px] border bg-white p-3"
        style={{
          borderColor: "#E2DCE6",
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 7,
          elevation: 2,
        }}
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: palette.soft }}
        >
          <SymbolView
            name={icon}
            tintColor={palette.icon}
            size={14}
            weight="bold"
          />
        </View>

        <Text
          numberOfLines={1}
          className="mt-2 text-[17px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-0.5 text-[8px] leading-[11px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function LifecycleButton({
    title,
    icon,
    onPress,
    tone = "secondary",
  }: {
    title: string;
    icon: SymbolName;
    onPress: () => void;
    tone?: "primary" | "secondary" | "danger";
  }) {
    const isPrimary = tone === "primary";
    const isDanger = tone === "danger";

    const backgroundColor = isPrimary
      ? theme.colors.accent
      : isDanger
        ? "#FFF7F7"
        : "#FFFFFF";

    const borderColor = isPrimary
      ? theme.colors.accent
      : isDanger
        ? "#F3C6CA"
        : "#E2DCE6";

    const foregroundColor = isPrimary
      ? "#FFFFFF"
      : isDanger
        ? theme.colors.danger
        : theme.colors.foreground;

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="min-h-[44px] flex-row items-center justify-center rounded-[14px] border px-3 py-2.5"
        style={{
          flexGrow: 1,
          flexBasis: "47%",
          minWidth: 0,
          backgroundColor,
          borderColor,
        }}
      >
        <SymbolView
          name={icon}
          tintColor={foregroundColor}
          size={14}
          weight="bold"
        />

        <Text
          numberOfLines={2}
          className="ml-2 text-center text-[11px] font-black leading-[14px]"
          style={{ color: foregroundColor }}
        >
          {title}
        </Text>
      </Pressable>
    );
  }

  function ActionRow({
    icon,
    tone,
    title,
    subtitle,
    onPress,
  }: {
    icon: SymbolName;
    tone: Tone;
    title: string;
    subtitle: string;
    onPress: () => void;
  }) {
    const palette = TONES[tone];

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="flex-row items-center py-1"
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: palette.soft }}
        >
          <SymbolView
            name={icon}
            tintColor={palette.icon}
            size={17}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[12px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>

          <Text
            className="mt-0.5 text-[9px] leading-[13px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>

        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor={theme.colors.foregroundSubtle}
          size={16}
          weight="bold"
        />
      </Pressable>
    );
  }

  function InfoRow({
    icon,
    label,
    value,
    tone,
  }: {
    icon: SymbolName;
    label: string;
    value: string;
    tone: Tone;
  }) {
    const palette = TONES[tone];

    return (
      <View className="flex-row items-center py-1">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: palette.soft }}
        >
          <SymbolView
            name={icon}
            tintColor={palette.icon}
            size={15}
            weight="bold"
          />
        </View>

        <Text
          className="ml-2.5 flex-1 text-[10px] font-bold"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {label}
        </Text>

        <Text
          className="max-w-[55%] text-right text-[10px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>
    );
  }

  function TextBlock({
    icon,
    title,
    text,
  }: {
    icon: SymbolName;
    title: string;
    text: string;
  }) {
    return (
      <View className="py-1">
        <View className="flex-row items-center">
          <View
            className="h-8 w-8 items-center justify-center rounded-[10px]"
            style={{ backgroundColor: theme.colors.surfaceSoft }}
          >
            <SymbolView
              name={icon}
              tintColor={theme.colors.accent}
              size={14}
              weight="bold"
            />
          </View>

          <Text
            className="ml-2.5 text-[12px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
        </View>

        <Text
          className="mt-2 text-[10px] leading-[16px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function Divider() {
    return (
      <View
        className="my-3 h-px"
        style={{ backgroundColor: "#EEE9F0" }}
      />
    );
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(15, 23, 42, 0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 100,
  },
  confirmButton: {
    minWidth: 130,
  },
});
