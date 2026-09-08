import { isAxiosError } from "axios";
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
import SectionHeader from "../../components/SectionHeader";
import {
  archiveTrainerTraining,
  deleteTrainerTraining,
  moveTrainerTrainingToDraft,
  publishTrainerTraining,
} from "../../features/trainer/trainerAuthoringService";
import {
  getTrainerTrainingDetail,
} from "../../features/trainer/trainerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
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

function statusLabel(value?: string | null): string {
  if (value === "PUBLISHED") return "Publiée";
  if (value === "DRAFT") return "Brouillon";
  if (value === "ARCHIVED") return "Archivée";

  return value || "Non renseigné";
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

      if (
        typeof candidate === "string" &&
        candidate.trim()
      ) {
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
          setError(
            "Impossible de charger cette formation.",
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
  }, [trainingId]);

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError(
        "Impossible d’actualiser cette formation.",
      );
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
        lifecycleError.includes(
          "au moins un module",
        )
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
    return (
      <LoadingState message="Chargement de la formation..." />
    );
  }

  if (!detail) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message={
            error || "Formation indisponible."
          }
          onRetry={() => void refresh()}
        />
      </ScreenContainer>
    );
  }

  const { training, enrollments, metrics } = detail;

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
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
            title={training.title}
            subtitle="Pilotez la formation, son statut et le suivi apprenant depuis le mobile."
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => setError("")}
            />
          ) : null}

          {notice ? (
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
                  { color: theme.colors.foreground },
                ]}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          <View style={styles.badges}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.accent },
                ]}
              >
                {statusLabel(training.status)}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.foreground },
                ]}
              >
                {training.category || "Sans catégorie"}
              </Text>
            </View>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  { color: theme.colors.foreground },
                ]}
              >
                {levelLabel(training.level)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.lifecycleCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <View style={styles.lifecycleHeader}>
              <View style={styles.lifecycleHeaderText}>
                <Text
                  style={[
                    styles.lifecycleTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Cycle de vie
                </Text>
                <Text
                  style={[
                    styles.lifecycleText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Gérez le statut de cette formation directement depuis le mobile.
                </Text>
              </View>

              <View
                style={[
                  styles.currentStatus,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currentStatusLabel,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  STATUT
                </Text>
                <Text
                  style={[
                    styles.currentStatusValue,
                    { color: theme.colors.accent },
                  ]}
                >
                  {statusLabel(training.status)}
                </Text>
              </View>
            </View>

            <View style={styles.lifecycleActions}>
              {training.status === "DRAFT" ? (
                <AppButton
                  title="Publier"
                  onPress={() => setConfirmAction("PUBLISH")}
                  style={styles.action}
                />
              ) : null}

              {training.status === "PUBLISHED" ||
              training.status === "ARCHIVED" ? (
                <AppButton
                  title="Remettre en brouillon"
                  onPress={() => setConfirmAction("DRAFT")}
                  variant="secondary"
                  style={styles.action}
                />
              ) : null}

              {training.status !== "ARCHIVED" ? (
                <AppButton
                  title="Archiver"
                  onPress={() => setConfirmAction("ARCHIVE")}
                  variant="secondary"
                  style={styles.action}
                />
              ) : null}

              {training.status === "DRAFT" ||
              training.status === "ARCHIVED" ? (
                <AppButton
                  title="Supprimer"
                  onPress={() => setConfirmAction("DELETE")}
                  variant="secondary"
                  style={styles.action}
                />
              ) : null}
            </View>
          </View>

          <View
            style={[
              styles.contentCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <View style={styles.contentCardText}>
              <Text
                style={[
                  styles.contentCardTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Contenu pédagogique
              </Text>

              <Text
                style={[
                  styles.contentCardDescription,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Gérez modules, leçons et ressources depuis le mobile.
              </Text>
            </View>

            <View style={styles.contentActions}>
              <AppButton
                title={
                  training.status === "DRAFT"
                    ? "Gérer le contenu"
                    : "Voir le contenu"
                }
                onPress={onManageContent}
                variant="secondary"
                style={styles.contentButton}
              />

              <AppButton
                title="Gérer les quiz"
                onPress={() =>
                  router.push(
                    `/trainer/trainings/${trainingId}/quizzes` as Href,
                  )
                }
                variant="secondary"
                style={styles.contentButton}
              />

              <AppButton
                title="Prévisualiser"
                onPress={onPreview}
                style={styles.contentButton}
              />
            </View>
          </View>

          <View style={styles.metricGrid}>
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
                  { color: theme.colors.foreground },
                ]}
              >
                {metrics.learners}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Apprenants
              </Text>
            </View>

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
                  { color: theme.colors.foreground },
                ]}
              >
                {metrics.averageProgress} %
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Progression moyenne
              </Text>
            </View>

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
                  { color: theme.colors.foreground },
                ]}
              >
                {typeof training.averageRating === "number"
                  ? training.averageRating.toFixed(1)
                  : "-"}
              </Text>
              <Text
                style={[
                  styles.metricLabel,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Note moyenne
              </Text>
            </View>
          </View>

          <InfoSection
            title="Paramètres"
            rows={[
              ["Visibilité", visibilityLabel(training.visibility)],
              ["Inscription", enrollmentLabel(training.enrollmentMode)],
              [
                "Durée",
                training.estimatedDurationHours
                  ? `${training.estimatedDurationHours} h`
                  : "Non renseignée",
              ],
              [
                "Créée le",
                formatDate(training.createdAt),
              ],
            ]}
          />

          <InfoSection
            title="Description"
            text={
              training.description ||
              training.shortDescription ||
              "Aucune description."
            }
          />

          <InfoSection
            title="Objectifs pédagogiques"
            text={
              training.objectives ||
              "Aucun objectif renseigné."
            }
          />

          <InfoSection
            title="Prérequis"
            text={
              training.prerequisites ||
              "Aucun prérequis renseigné."
            }
          />

          <InfoSection
            title="Public cible"
            text={
              training.targetAudience ||
              "Non renseigné."
            }
          />

          <View
            style={[
              styles.enrollmentCard,
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
              Suivi apprenant
            </Text>

            <Text
              style={[
                styles.sectionText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {enrollments.length === 0
                ? "Aucun apprenant inscrit."
                : `${enrollments.length} inscription${
                    enrollments.length > 1 ? "s" : ""
                  } sur cette formation.`}
            </Text>
          </View>
        </View>
      </ScrollView>

      {confirmAction ? (
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => {
              if (!transitioning) {
                setConfirmAction(null);
              }
            }}
          />

          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.confirmTitle,
                { color: theme.colors.foreground },
              ]}
            >
              {actionTitle(confirmAction)}
            </Text>

            <Text
              style={[
                styles.confirmText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {actionDescription(confirmAction)}
            </Text>

            <View style={styles.confirmActions}>
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

  function InfoSection({
    title,
    text,
    rows,
  }: {
    title: string;
    text?: string;
    rows?: [string, string][];
  }) {
    return (
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
          {title}
        </Text>

        {rows
          ? rows.map(([label, value]) => (
              <View
                key={label}
                style={styles.row}
              >
                <Text
                  style={[
                    styles.rowLabel,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.rowValue,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {value}
                </Text>
              </View>
            ))
          : null}

        {text ? (
          <Text
            style={[
              styles.sectionText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {text}
          </Text>
        ) : null}
      </View>
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
  },
  page: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "900",
  },
  lifecycleCard: {
    padding: 18,
    marginBottom: 16,
  },
  lifecycleHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
  },
  lifecycleHeaderText: {
    flex: 1,
    minWidth: 220,
  },
  lifecycleTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  lifecycleText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  currentStatus: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 9,
    minWidth: 120,
  },
  currentStatusLabel: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  currentStatusValue: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  lifecycleActions: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  action: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
  },
  contentCard: {
    padding: 16,
    marginBottom: 16,
    alignItems: "stretch",
    gap: 14,
  },
  contentCardText: {
    width: "100%",
  },
  contentCardTitle: {
    fontSize: 17,
    fontWeight: "900",
  },
  contentCardDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  contentActions: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  contentButton: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 18,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  metricValue: {
    fontSize: 25,
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "900",
    marginBottom: 9,
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 22,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 7,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "800",
  },
  enrollmentCard: {
    marginBottom: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.52)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    zIndex: 100,
  },
  confirmCard: {
    width: "100%",
    maxWidth: 520,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  confirmText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 20,
  },
  confirmButton: {
    minWidth: 130,
  },
});
