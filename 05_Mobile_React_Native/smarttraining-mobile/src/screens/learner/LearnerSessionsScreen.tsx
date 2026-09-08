import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useMemo, useState } from "react";
import {
  Linking,
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
  getMySupportSessions,
} from "../../features/analytics/learnerSupportSessionService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";



import {
  LearnerSupportSession,
  LearnerSupportSessionStatus,
} from "../../types/learnerSupportSession";
import { LearnerMyTraining } from "../../types/learnerTraining";

type Props = {
  onBackHome: () => void;
};

function statusLabel(status: LearnerSupportSessionStatus): string {
  if (status === "SCHEDULED") return "Planifiée";
  if (status === "COMPLETED") return "Terminée";
  return "Annulée";
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function isSafeMeetingLink(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value);
}

export default function LearnerSessionsScreen({
  onBackHome,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [sessions, setSessions] =
    useState<LearnerSupportSession[]>([]);
  const [trainings, setTrainings] =
    useState<LearnerMyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openingId, setOpeningId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const [sessionData, trainingData] = await Promise.all([
      getMySupportSessions(),
      getMyLearnerTrainings(),
    ]);

    setSessions(sessionData);
    setTrainings(trainingData);
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMySupportSessions(),
      getMyLearnerTrainings(),
    ])
      .then(([sessionData, trainingData]) => {
        if (!active) return;

        setSessions(sessionData);
        setTrainings(trainingData);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger tes séances.");
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

  const trainingTitles = useMemo(
    () =>
      new Map(
        trainings.map((training) => [
          training.id,
          training.title,
        ]),
      ),
    [trainings],
  );

  const upcoming = useMemo(
    () =>
      sessions
        .filter((session) => session.status === "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        ),
    [sessions],
  );

  const history = useMemo(
    () =>
      sessions
        .filter((session) => session.status !== "SCHEDULED")
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        ),
    [sessions],
  );

  async function refresh() {
    setRefreshing(true);

    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d’actualiser tes séances.");
    } finally {
      setRefreshing(false);
    }
  }

  async function openMeeting(session: LearnerSupportSession) {
    if (
      session.status !== "SCHEDULED" ||
      !isSafeMeetingLink(session.meetingLink)
    ) {
      setError("Le lien de cette séance n’est pas disponible.");
      return;
    }

    setOpeningId(session.id);
    setError("");

    try {
      const supported = await Linking.canOpenURL(session.meetingLink);

      if (!supported) {
        setError("Ce lien de réunion ne peut pas être ouvert.");
        return;
      }

      await Linking.openURL(session.meetingLink);
    } catch {
      setError("Impossible d’ouvrir le lien de réunion.");
    } finally {
      setOpeningId(null);
    }
  }

  function renderSession(
    session: LearnerSupportSession,
    allowJoin: boolean,
  ) {
    const trainingTitle =
      trainingTitles.get(session.trainingId) ?? "Formation associée";

    return (
      <View key={session.id} style={styles.sessionCard}>
        <View style={styles.topRow}>
          <View style={styles.titleArea}>
            <Text style={styles.trainingTitle}>{trainingTitle}</Text>
            <Text style={styles.sessionTitle}>{session.title}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              session.status === "COMPLETED" &&
                styles.statusCompleted,
              session.status === "CANCELLED" &&
                styles.statusCancelled,
            ]}
          >
            <Text style={styles.statusText}>
              {statusLabel(session.status)}
            </Text>
          </View>
        </View>

        <View style={styles.dateBox}>
          <Text style={styles.dateLabel}>Date et heure</Text>
          <Text style={styles.dateValue}>
            {formatDateTime(session.scheduledAt)}
          </Text>
        </View>

        <Text style={styles.metaLabel}>Objectif</Text>
        <Text style={styles.bodyText}>{session.objective}</Text>

        {session.note ? (
          <>
            <Text style={styles.metaLabel}>Note du formateur</Text>
            <Text style={styles.bodyText}>{session.note}</Text>
          </>
        ) : null}

        {allowJoin &&
        session.status === "SCHEDULED" &&
        isSafeMeetingLink(session.meetingLink) ? (
          <AppButton
            title="Rejoindre la séance"
            onPress={() => void openMeeting(session)}
            loading={openingId === session.id}
            style={styles.joinButton}
          />
        ) : null}

        {session.status === "COMPLETED" ? (
          <Text style={styles.finalInfo}>
            Cette séance est terminée.
          </Text>
        ) : null}

        {session.status === "CANCELLED" ? (
          <Text style={styles.finalInfo}>
            Cette séance a été annulée.
          </Text>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return <LoadingState message="Chargement de tes séances..." />;
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
          title="Retour à l’accueil"
          onPress={onBackHome}
          variant="secondary"
          style={styles.backButton}
        />

        <SectionHeader
          title="Mes séances"
          subtitle="Retrouve tes rendez-vous d’accompagnement planifiés par ton formateur."
        />

        {error ? <ErrorMessage message={error} /> : null}

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{upcoming.length}</Text>
          <Text style={styles.summaryLabel}>
            séance{upcoming.length > 1 ? "s" : ""} à venir
          </Text>
        </View>

        <Text style={styles.sectionTitle}>À venir</Text>

        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Aucune séance planifiée
            </Text>
            <Text style={styles.emptyText}>
              Les prochains rendez-vous fixés par ton formateur
              apparaîtront ici.
            </Text>
          </View>
        ) : (
          upcoming.map((session) => renderSession(session, true))
        )}

        <Text style={styles.sectionTitle}>Historique</Text>

        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>
              Aucun historique pour le moment
            </Text>
            <Text style={styles.emptyText}>
              Les séances terminées ou annulées apparaîtront ici.
            </Text>
          </View>
        ) : (
          history.map((session) => renderSession(session, false))
        )}
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
  summaryCard: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginBottom: theme.shape.cardPadding,
  },
  summaryValue: {
    color: theme.colors.accent,
    fontSize: 30,
    fontWeight: "900",
  },
  summaryLabel: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
  },
  sectionTitle: {
    color: theme.colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  sessionCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginBottom: 18,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
  },
  titleArea: {
    flex: 1,
  },
  trainingTitle: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  sessionTitle: {
    color: theme.colors.foreground,
    fontSize: 17,
    fontWeight: "900",
  },
  statusBadge: {
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceSoft,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  statusCompleted: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  statusCancelled: {
    backgroundColor: theme.colors.surfaceSoft,
  },
  statusText: {
    color: theme.colors.foregroundMuted,
    fontSize: 11,
    fontWeight: "900",
  },
  dateBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.controlRadius,
    padding: 14,
    marginTop: 18,
  },
  dateLabel: {
    color: theme.colors.foregroundMuted,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dateValue: {
    color: theme.colors.foreground,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 5,
  },
  metaLabel: {
    color: theme.colors.foreground,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 5,
  },
  bodyText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  joinButton: {
    marginTop: 18,
  },
  finalInfo: {
    color: theme.colors.foregroundMuted,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 18,
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: theme.shape.cardPadding,
  },
  emptyTitle: {
    color: theme.colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
});
}
