import ScreenContainer from "../../components/ScreenContainer";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import SectionHeader from "../../components/SectionHeader";
import LearnerInvitationCard from "../../components/learner/LearnerInvitationCard";
import {
  acceptTrainingInvitation,
  declineTrainingInvitation,
  getMyTrainingInvitations,
} from "../../features/trainings/invitationService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerTrainingInvitation } from "../../types/learnerInvitation";

type LearnerInvitationsScreenProps = {
  learnerId: number;
  learnerEmail: string;
  onOpenMyTrainings: () => void;
};

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

  return "Impossible de traiter cette invitation pour le moment.";
}

export default function LearnerInvitationsScreen({
  learnerId,
  learnerEmail,
  onOpenMyTrainings,
}: LearnerInvitationsScreenProps) {
  const { theme } = useSmartTrainingTheme();

  const [invitations, setInvitations] =
    useState<LearnerTrainingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    let active = true;

    void getMyTrainingInvitations(learnerId, learnerEmail)
      .then((data) => {
        if (!active) return;
        setInvitations(data);
        setErrorMessage("");
      })
      .catch((error: unknown) => {
        if (active) {
          setErrorMessage(apiErrorMessage(error));
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
  }, [learnerEmail, learnerId]);

  const pendingCount = useMemo(
    () =>
      invitations.filter(
        (invitation) => invitation.status === "PENDING",
      ).length,
    [invitations],
  );

  async function refresh() {
    try {
      setRefreshing(true);
      setErrorMessage("");

      const data = await getMyTrainingInvitations(
        learnerId,
        learnerEmail,
      );

      setInvitations(data);
    }
    catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    }
    finally {
      setRefreshing(false);
    }
  }

  async function accept(invitation: LearnerTrainingInvitation) {
    try {
      setBusyId(invitation.id);
      setErrorMessage("");
      setSuccessMessage("");

      const updated = await acceptTrainingInvitation(
        invitation.token,
      );

      setInvitations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setSuccessMessage(
        `${invitation.trainingTitle} a \u00E9t\u00E9 ajout\u00E9e \u00E0 tes formations.`,
      );
    }
    catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    }
    finally {
      setBusyId(null);
    }
  }

  async function decline(invitation: LearnerTrainingInvitation) {
    try {
      setBusyId(invitation.id);
      setErrorMessage("");
      setSuccessMessage("");

      const updated = await declineTrainingInvitation(
        invitation.id,
      );

      setInvitations((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setSuccessMessage(
        `Invitation refus\u00E9e pour ${invitation.trainingTitle}.`,
      );
    }
    catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    }
    finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de tes invitations..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
        },
      ]}
      contentContainerStyle={[
        styles.content,
        {
          padding: theme.shape.cardPadding,
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
    >
      <View style={styles.page}>
        <View
          style={[
            styles.introPanel,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
              padding: theme.shape.cardPadding,
            },
          ]}
        >
          <SectionHeader
            title="Mes invitations"
            subtitle={
              pendingCount > 0
                ? `${pendingCount} invitation${pendingCount > 1 ? "s" : ""} en attente`
                : "Retrouve ici les invitations re\u00E7ues pour rejoindre une formation."
            }
          />

          <View
            style={[
              styles.summaryPill,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderRadius: theme.shape.controlRadius,
              },
            ]}
          >
            <Text
              style={[
                styles.summaryValue,
                {
                  color:
                    pendingCount > 0
                      ? theme.colors.warning
                      : theme.colors.accent,
                },
              ]}
            >
              {pendingCount}
            </Text>
            <Text
              style={[
                styles.summaryText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {pendingCount > 1
                ? "invitations en attente"
                : "invitation en attente"}
            </Text>
          </View>
        </View>

        {successMessage ? (
          <View
            style={[
              styles.feedbackBox,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.success,
                borderRadius: theme.shape.controlRadius,
                borderWidth: Math.max(
                  1,
                  theme.shape.borderWidth,
                ),
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.feedbackTitle,
                {
                  color: theme.colors.success,
                },
              ]}
            >
              {"Mise \u00E0 jour effectu\u00E9e"}
            </Text>
            <Text
              style={[
                styles.feedbackText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {successMessage}
            </Text>
          </View>
        ) : null}

        {errorMessage ? (
          <ErrorMessage
            title="Action impossible"
            message={errorMessage}
            onRetry={() => void refresh()}
          />
        ) : null}

        {invitations.length === 0 ? (
          <View
            style={[
              styles.emptyBox,
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
                styles.emptyTitle,
                {
                  color: theme.colors.foreground,
                },
              ]}
            >
              Aucune invitation
            </Text>
            <Text
              style={[
                styles.emptyText,
                {
                  color: theme.colors.foregroundMuted,
                },
              ]}
            >
              {
                "Tu n\u2019as actuellement aucune invitation de formation."
              }
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {invitations.map((invitation) => (
              <LearnerInvitationCard
                key={invitation.id}
                invitation={invitation}
                busy={busyId === invitation.id}
                onAccept={() => void accept(invitation)}
                onDecline={() => void decline(invitation)}
                onOpenMyTrainings={onOpenMyTrainings}
              />
            ))}
          </View>
        )}
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
  },
  introPanel: {
    marginBottom: 22,
  },
  summaryPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  summaryValue: {
    fontSize: 21,
    fontWeight: "900",
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "700",
  },
  feedbackBox: {
    marginBottom: 18,
  },
  feedbackTitle: {
    fontWeight: "900",
    marginBottom: 5,
  },
  feedbackText: {
    lineHeight: 20,
  },
  list: {
    width: "100%",
  },
  emptyBox: {
    width: "100%",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    lineHeight: 21,
  },
});