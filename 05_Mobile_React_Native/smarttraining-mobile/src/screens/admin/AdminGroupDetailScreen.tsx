import { useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  getAdminGroup,
  getAdminGroupMembers,
} from "../../features/admin/adminGroupService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerGroup,
  TrainerLearnerGroupMember,
} from "../../types/trainerGroupMobile";

type Props = {
  groupId: number;
};

function ownerRoleLabel(value?: string | null): string {
  if (value === "ADMIN") {
    return "Administrateur";
  }
  if (value === "FORMATEUR") {
    return "Formateur";
  }
  return value || "Gestionnaire";
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

function formatDateTime(value?: string | null): string {
  if (!value) {
    return "-";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}

export default function AdminGroupDetailScreen({
  groupId,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [group, setGroup] =
    useState<TrainerLearnerGroup | null>(null);
  const [members, setMembers] =
    useState<TrainerLearnerGroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [loadedGroup, loadedMembers] =
      await Promise.all([
        getAdminGroup(groupId),
        getAdminGroupMembers(groupId),
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
      getAdminGroup(groupId),
      getAdminGroupMembers(groupId),
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
          setError("Impossible de charger ce groupe.");
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

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
      setError("");
    } catch {
      setError("Impossible d'actualiser ce groupe.");
    } finally {
      setRefreshing(false);
    }
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
            title={group.name}
            subtitle="Consultation administrateur du groupe et de ses membres."
          />

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => void refresh()}
            />
          ) : null}

          <View style={styles.metricGrid}>
            <Metric
              value={String(group.memberCount)}
              label="Membres"
            />
            <Metric
              value={ownerRoleLabel(group.ownerRole)}
              label="Proprietaire"
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
                { color: theme.colors.foregroundMuted },
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
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Membres
            </Text>
            <Text
              style={[
                styles.sectionHelper,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Consultation uniquement : {members.length} membre(s).
            </Text>

            {members.length === 0 ? (
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Ce groupe ne contient aucun membre.
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
                    <Text
                      style={[
                        styles.memberName,
                        { color: theme.colors.foreground },
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
                        {formatDateTime(member.addedAt)}
                      </Text>
                    ) : null}
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
            { color: theme.colors.foregroundMuted },
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
            { color: theme.colors.foregroundSubtle },
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
  scroll: {
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
