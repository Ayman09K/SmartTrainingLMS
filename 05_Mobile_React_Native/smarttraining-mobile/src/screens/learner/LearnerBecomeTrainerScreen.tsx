import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import {
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
  createTrainerRequest,
  getMyTrainerRequests,
} from "../../features/auth/learnerTrainerRequestService";



import {
  LearnerTrainerRequest,
  LearnerTrainerRequestStatus,
} from "../../types/learnerTrainerRequest";

type Props = {
  onBackHome: () => void;
};

function statusLabel(status: LearnerTrainerRequestStatus): string {
  switch (status) {
    case "PENDING":
      return "En attente";
    case "APPROVED":
      return "Acceptée";
    case "REJECTED":
      return "Refusée";
    case "CANCELLED":
      return "Annulée";
    default:
      return status;
  }
}

function formatDate(value?: string | null): string {
  if (!value) return "Date non disponible";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

function errorMessage(error: unknown): string {
  if (!isAxiosError(error)) {
    return "Une erreur est survenue.";
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof data.message === "string" &&
    data.message.trim()
  ) {
    return data.message;
  }

  return "La demande n’a pas pu être enregistrée.";
}

export default function LearnerBecomeTrainerScreen({
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [requests, setRequests] = useState<LearnerTrainerRequest[]>([]);
  const [expertiseDomain, setExpertiseDomain] = useState("");
  const [experienceSummary, setExperienceSummary] = useState("");
  const [motivation, setMotivation] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasPending = useMemo(
    () => requests.some((request) => request.status === "PENDING"),
    [requests],
  );

  async function loadRequests() {
    const data = await getMyTrainerRequests();
    setRequests(data);
  }

  useEffect(() => {
    let active = true;

    void getMyTrainerRequests()
      .then((data) => {
        if (!active) return;
        setRequests(data);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger tes demandes.");
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
  }, []);

  async function refresh() {
    setRefreshing(true);
    setSuccess("");

    try {
      await loadRequests();
      setError("");
    } catch {
      setError("Impossible d’actualiser tes demandes.");
    } finally {
      setRefreshing(false);
    }
  }

  async function submit() {
    const expertise = expertiseDomain.trim();
    const experience = experienceSummary.trim();
    const motivationText = motivation.trim();

    if (hasPending) {
      setError("Ta demande est déjà en cours d’examen.");
      return;
    }

    if (!expertise) {
      setError("Le domaine d’expertise est obligatoire.");
      return;
    }

    if (expertise.length > 120) {
      setError("Le domaine d’expertise ne doit pas dépasser 120 caractères.");
      return;
    }

    if (experience.length > 1000) {
      setError("Le résumé d’expérience ne doit pas dépasser 1000 caractères.");
      return;
    }

    if (!motivationText) {
      setError("La motivation est obligatoire.");
      return;
    }

    if (motivationText.length > 1500) {
      setError("La motivation ne doit pas dépasser 1500 caractères.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const created = await createTrainerRequest({
        expertiseDomain: expertise,
        experienceSummary: experience || undefined,
        motivation: motivationText,
      });

      setRequests((current) => [created, ...current]);
      setExpertiseDomain("");
      setExperienceSummary("");
      setMotivation("");
      setSuccess(
        "Ta demande a été envoyée. Elle est maintenant en attente d’examen.",
      );
    } catch (submitError: unknown) {
      setError(errorMessage(submitError));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de tes demandes..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <AppButton
          title="Retour à Mon compte"
          onPress={onBackHome}
          variant="secondary"
          style={styles.backButton}
        />

        <SectionHeader
          title="Devenir formateur"
          subtitle="Présente ton expertise et ta motivation. Un administrateur examinera ta demande."
        />

        {success ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{success}</Text>
          </View>
        ) : null}

        {error ? <ErrorMessage message={error} /> : null}

        {hasPending ? (
          !success && (
            <View style={styles.pendingBox}>
              <Text style={styles.pendingTitle}>
                Demande en cours d’examen
              </Text>
              <Text style={styles.pendingText}>
                Ta demande a bien été reçue par l’administration.
                Tu peux suivre son statut dans la section Mes demandes.
              </Text>
            </View>
          )
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Nouvelle demande</Text>

            <Text style={styles.label}>Domaine d’expertise</Text>
            <TextInput
              value={expertiseDomain}
              accessibilityLabel={"Domaine d\u2019expertise"}
              onChangeText={setExpertiseDomain}
              maxLength={120}
              placeholder="Ex. Développement web, réseaux, bureautique..."
              placeholderTextColor={theme.colors.foregroundMuted}
              style={styles.input}
            />
            <Text style={styles.counter}>
              {expertiseDomain.length}/120
            </Text>

            <Text style={styles.label}>
              Résumé de ton expérience (facultatif)
            </Text>
            <TextInput
              value={experienceSummary}
              accessibilityLabel={"R\u00E9sum\u00E9 de ton exp\u00E9rience"}
              onChangeText={setExperienceSummary}
              maxLength={1000}
              multiline
              textAlignVertical="top"
              placeholder="Décris brièvement ton expérience ou tes réalisations."
              placeholderTextColor={theme.colors.foregroundMuted}
              style={[styles.input, styles.multilineMedium]}
            />
            <Text style={styles.counter}>
              {experienceSummary.length}/1000
            </Text>

            <Text style={styles.label}>Motivation</Text>
            <TextInput
              value={motivation}
              accessibilityLabel="Motivation"
              onChangeText={setMotivation}
              maxLength={1500}
              multiline
              textAlignVertical="top"
              placeholder="Explique pourquoi tu souhaites devenir formateur sur SmartTraining."
              placeholderTextColor={theme.colors.foregroundMuted}
              style={[styles.input, styles.multilineLarge]}
            />
            <Text style={styles.counter}>
              {motivation.length}/1500
            </Text>

            <AppButton
              title="Envoyer ma demande"
              onPress={() => void submit()}
              loading={submitting}
              style={styles.submitButton}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mes demandes</Text>

          {requests.length === 0 ? (
            <Text style={styles.emptyText}>
              Tu n’as encore envoyé aucune demande.
            </Text>
          ) : (
            requests.map((request) => (
              <View key={request.id} style={styles.historyItem}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>
                    {request.expertiseDomain}
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {statusLabel(request.status)}
                    </Text>
                  </View>
                </View>

                <Text style={styles.dateText}>
                  Envoyée le {formatDate(request.requestedAt)}
                </Text>

                {request.experienceSummary ? (
                  <>
                    <Text style={styles.smallLabel}>Expérience</Text>
                    <Text style={styles.bodyText}>
                      {request.experienceSummary}
                    </Text>
                  </>
                ) : null}

                <Text style={styles.smallLabel}>Motivation</Text>
                <Text style={styles.bodyText}>
                  {request.motivation}
                </Text>

                {request.adminComment ? (
                  <View style={styles.adminCommentBox}>
                    <Text style={styles.smallLabel}>
                      Réponse de l’administration
                    </Text>
                    <Text style={styles.bodyText}>
                      {request.adminComment}
                    </Text>
                  </View>
                ) : null}

                {request.reviewedAt ? (
                  <Text style={styles.dateText}>
                    Traitée le {formatDate(request.reviewedAt)}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    paddingBottom: theme.shape.cardPadding * 2,
  },
  backButton: {
    marginBottom: 14,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginBottom: 18,
  },
  cardTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  label: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 5,
  },
  smallLabel: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginTop: 14,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.controlRadius,
    backgroundColor: theme.colors.surface,
    color: theme.colors.foreground,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
  },
  multilineMedium: {
    minHeight: 110,
  },
  multilineLarge: {
    minHeight: 140,
  },
  counter: {
    color: theme.colors.foregroundMuted,
    fontSize: 11,
    textAlign: "right",
    marginTop: 5,
  },
  submitButton: {
    marginTop: 18,
  },
  pendingBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 18,
  },
  pendingTitle: {
    color: theme.colors.accent,
    fontSize: 15,
    fontWeight: "900",
  },
  pendingText: {
    color: theme.colors.foreground,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  successBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginBottom: 14,
  },
  successText: {
    color: theme.colors.success,
    fontSize: 14,
    fontWeight: "800",
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  historyItem: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 18,
    marginTop: 18,
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  historyTitle: {
    flex: 1,
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    color: theme.colors.foreground,
    fontSize: 11,
    fontWeight: "900",
  },
  dateText: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    marginTop: 8,
  },
  bodyText: {
    color: theme.colors.foreground,
    fontSize: 14,
    lineHeight: 20,
  },
  adminCommentBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginTop: 14,
  },
});
}
