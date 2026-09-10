import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LearnerInvitationCard from "../../components/learner/LearnerInvitationCard";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  acceptTrainingInvitation,
  declineTrainingInvitation,
  getMyTrainingInvitations,
} from "../../features/trainings/invitationService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerTrainingInvitation } from "../../types/learnerInvitation";

type LearnerInvitationsScreenProps = {
  learnerId: number;
  learnerEmail: string;
  onOpenMyTrainings: () => void;
};

type StatCardProps = {
  icon: ComponentProps<typeof SymbolView>["name"];
  label: string;
  value: number;
  tone: string;
};

const PAGE_SIZE = 3;

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
      candidate.response?.data?.message || candidate.response?.data?.error;

    if (backendMessage) {
      return backendMessage;
    }
  }

  return "Impossible de traiter cette invitation pour le moment.";
}

function StatCard({ icon, label, value, tone }: StatCardProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View
      className="min-w-0 flex-1 items-center rounded-[17px] border px-2 py-2.5"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
      }}
    >
      <View className="flex-row items-center justify-center">
        <View
          className="h-7 w-7 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <SymbolView name={icon} tintColor={tone} size={15} weight="semibold" />
        </View>

        <Text
          maxFontSizeMultiplier={1}
          className="ml-2 text-[20px] font-black leading-[22px]"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>
      </View>

      <Text
        maxFontSizeMultiplier={1}
        numberOfLines={1}
        className="mt-1 w-full text-center text-[9px] font-extrabold leading-[12px]"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>
    </View>
  );
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
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;

    void getMyTrainingInvitations(learnerId, learnerEmail)
      .then((data) => {
        if (!active) return;
        setInvitations(data);
        setPage(1);
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
      invitations.filter((invitation) => invitation.status === "PENDING")
        .length,
    [invitations],
  );

  const acceptedCount = useMemo(
    () =>
      invitations.filter((invitation) => invitation.status === "ACCEPTED")
        .length,
    [invitations],
  );

  const totalPages = Math.max(1, Math.ceil(invitations.length / PAGE_SIZE));

  const visibleInvitations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return invitations.slice(start, start + PAGE_SIZE);
  }, [invitations, page]);

  const firstVisible = invitations.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(page * PAGE_SIZE, invitations.length);

  async function refresh() {
    try {
      setRefreshing(true);
      setErrorMessage("");
      const data = await getMyTrainingInvitations(learnerId, learnerEmail);
      setInvitations(data);
      setPage(1);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setRefreshing(false);
    }
  }

  async function accept(invitation: LearnerTrainingInvitation) {
    try {
      setBusyId(invitation.id);
      setErrorMessage("");
      setSuccessMessage("");

      const updated = await acceptTrainingInvitation(invitation.token);

      setInvitations((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSuccessMessage(
        `${invitation.trainingTitle} a été ajoutée à tes formations.`,
      );
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function decline(invitation: LearnerTrainingInvitation) {
    try {
      setBusyId(invitation.id);
      setErrorMessage("");
      setSuccessMessage("");

      const updated = await declineTrainingInvitation(invitation.id);

      setInvitations((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSuccessMessage(`Invitation refusée pour ${invitation.trainingTitle}.`);
    } catch (error: unknown) {
      setErrorMessage(apiErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de tes invitations..." />;
  }

  return (
    <ScreenContainer style={{ paddingHorizontal: 16, paddingTop: 18, paddingBottom: 0 }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full max-w-[720px] self-center">
          {/* Hero */}
          <View
            className="mb-5 overflow-hidden rounded-[24px] border px-4 pb-4 pt-[17px]"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              shadowOpacity: 0.045,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 2,
            }}
          >
            <View
              pointerEvents="none"
              className="absolute -right-[62px] -top-[72px] h-[180px] w-[180px] rounded-full opacity-80"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            />
            <View
              pointerEvents="none"
              className="absolute right-[44px] -top-[60px] h-[102px] w-[102px] rounded-full opacity-40"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            />

            <View className="flex-row items-center">
              <View
                className="h-[64px] w-[64px] shrink-0 items-center justify-center rounded-[21px]"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name={{
                    ios: "envelope.badge.fill",
                    android: "mark_email_unread",
                    web: "mark_email_unread",
                  }}
                  tintColor={theme.colors.accent}
                  size={29}
                  weight="semibold"
                />
              </View>

              <View className="ml-3.5 min-w-0 flex-1 pr-[58px]">
                <Text
                  maxFontSizeMultiplier={1.1}
                  className="mb-1 text-[10px] font-black leading-[13px] tracking-[0.85px]"
                  style={{ color: theme.colors.accent }}
                >
                  INVITATIONS
                </Text>
                <Text
                  maxFontSizeMultiplier={1.1}
                  className="text-[22px] font-black leading-[27px] tracking-[-0.35px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Tes invitations de formation
                </Text>
                <Text
                  maxFontSizeMultiplier={1.15}
                  className="mt-1.5 text-[13px] leading-[19px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Accepte ou consulte les invitations envoyées par tes formateurs.
                </Text>
              </View>

              <View
                pointerEvents="none"
                className="absolute right-1 top-3 h-[68px] w-[68px] items-center justify-center"
              >
                <View
                  className="absolute h-[38px] w-[49px] rounded-xl opacity-75"
                  style={{
                    backgroundColor: theme.colors.surfaceSoft,
                    transform: [{ rotate: "-12deg" }, { translateY: -9 }],
                  }}
                />
                <View
                  className="h-[45px] w-[54px] items-center justify-center rounded-[15px]"
                  style={{
                    backgroundColor: theme.colors.accent,
                    transform: [{ rotate: "8deg" }, { translateY: 9 }],
                  }}
                >
                  <SymbolView
                    name={{ ios: "envelope.fill", android: "mail", web: "mail" }}
                    tintColor={theme.colors.accentForeground}
                    size={23}
                    weight="semibold"
                  />
                </View>
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              <StatCard
                icon={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
                value={pendingCount}
                label="En attente"
                tone={theme.colors.warning}
              />
              <StatCard
                icon={{
                  ios: "checkmark.circle.fill",
                  android: "check_circle",
                  web: "check_circle",
                }}
                value={acceptedCount}
                label="Acceptées"
                tone={theme.colors.success}
              />
              <StatCard
                icon={{ ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" }}
                value={invitations.length}
                label="Total"
                tone={theme.colors.accent}
              />
            </View>
          </View>

          {successMessage ? (
            <View
              className="mb-4 flex-row items-start rounded-[17px] border p-3"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.success,
              }}
            >
              <View
                className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor={theme.colors.success}
                  size={20}
                  weight="semibold"
                />
              </View>
              <View className="ml-2.5 flex-1">
                <Text
                  className="text-[13px] font-black leading-[18px]"
                  style={{ color: theme.colors.foreground }}
                >
                  Mise à jour effectuée
                </Text>
                <Text
                  className="mt-0.5 text-[12px] leading-[17px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {successMessage}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer le message"
                hitSlop={8}
                onPress={() => setSuccessMessage("")}
                className="h-8 w-8 items-center justify-center"
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  tintColor={theme.colors.foregroundMuted}
                  size={14}
                  weight="semibold"
                />
              </Pressable>
            </View>
          ) : null}

          {errorMessage ? (
            <ErrorMessage
              title="Action impossible"
              message={errorMessage}
              onRetry={() => void refresh()}
            />
          ) : null}

          <View className="mb-3 flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text
                maxFontSizeMultiplier={1.1}
                className="text-[22px] font-black leading-[27px] tracking-[-0.3px]"
                style={{ color: theme.colors.foreground }}
              >
                Mes invitations
              </Text>
              <Text
                maxFontSizeMultiplier={1.15}
                className="mt-1 text-[13px] leading-[19px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                {pendingCount > 0
                  ? `${pendingCount} invitation${pendingCount > 1 ? "s" : ""} demande${pendingCount > 1 ? "nt" : ""} ton attention.`
                  : "Aucune invitation ne demande d’action pour le moment."}
              </Text>
            </View>

            <View
              className="h-9 min-w-9 items-center justify-center rounded-full px-2.5"
              style={{ backgroundColor: theme.colors.surfaceSoft }}
            >
              <Text
                className="text-[13px] font-black"
                style={{ color: theme.colors.accent }}
              >
                {invitations.length}
              </Text>
            </View>
          </View>

          {invitations.length === 0 ? (
            <View
              className="items-center rounded-[22px] border px-6 py-8"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <View
                className="mb-3 h-14 w-14 items-center justify-center rounded-[19px]"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name={{ ios: "tray.fill", android: "inbox", web: "inbox" }}
                  tintColor={theme.colors.accent}
                  size={26}
                  weight="medium"
                />
              </View>
              <Text
                className="text-[18px] font-black leading-6"
                style={{ color: theme.colors.foreground }}
              >
                Aucune invitation
              </Text>
              <Text
                className="mt-1.5 max-w-[420px] text-center text-[13px] leading-5"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Tes nouvelles invitations de formation apparaîtront ici.
              </Text>
            </View>
          ) : (
            <View>
              {visibleInvitations.map((invitation) => (
                <LearnerInvitationCard
                  key={invitation.id}
                  invitation={invitation}
                  busy={busyId === invitation.id}
                  onAccept={() => void accept(invitation)}
                  onDecline={() => void decline(invitation)}
                  onOpenMyTrainings={onOpenMyTrainings}
                />
              ))}

              {totalPages > 1 ? (
                <View
                  className="mb-2 mt-1 rounded-[20px] border px-3 py-3"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View className="mb-2.5 flex-row items-center justify-between">
                    <View>
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Page {page} sur {totalPages}
                      </Text>
                      <Text
                        className="mt-0.5 text-[10px] font-semibold"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {firstVisible}–{lastVisible} sur {invitations.length} invitations
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-2">
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Page précédente"
                        accessibilityState={{ disabled: page === 1 }}
                        disabled={page === 1}
                        onPress={() => setPage((current) => Math.max(1, current - 1))}
                        className="h-10 w-10 items-center justify-center rounded-[13px] border"
                        style={{
                          backgroundColor:
                            page === 1 ? theme.colors.surfaceSoft : theme.colors.surface,
                          borderColor: theme.colors.border,
                          opacity: page === 1 ? 0.45 : 1,
                        }}
                      >
                        <SymbolView
                          name={{
                            ios: "chevron.left",
                            android: "chevron_left",
                            web: "chevron_left",
                          }}
                          tintColor={theme.colors.foreground}
                          size={17}
                          weight="bold"
                        />
                      </Pressable>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Page suivante"
                        accessibilityState={{ disabled: page === totalPages }}
                        disabled={page === totalPages}
                        onPress={() =>
                          setPage((current) => Math.min(totalPages, current + 1))
                        }
                        className="h-10 w-10 items-center justify-center rounded-[13px] border"
                        style={{
                          backgroundColor:
                            page === totalPages
                              ? theme.colors.surfaceSoft
                              : theme.colors.accent,
                          borderColor:
                            page === totalPages
                              ? theme.colors.border
                              : theme.colors.accent,
                          opacity: page === totalPages ? 0.45 : 1,
                        }}
                      >
                        <SymbolView
                          name={{
                            ios: "chevron.right",
                            android: "chevron_right",
                            web: "chevron_right",
                          }}
                          tintColor={
                            page === totalPages
                              ? theme.colors.foreground
                              : theme.colors.accentForeground
                          }
                          size={17}
                          weight="bold"
                        />
                      </Pressable>
                    </View>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerClassName="gap-2 pr-1"
                  >
                    {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                      (pageNumber) => {
                        const selected = pageNumber === page;

                        return (
                          <Pressable
                            key={pageNumber}
                            accessibilityRole="button"
                            accessibilityLabel={`Aller à la page ${pageNumber}`}
                            accessibilityState={{ selected }}
                            onPress={() => setPage(pageNumber)}
                            className="h-9 min-w-9 items-center justify-center rounded-[12px] border px-2.5"
                            style={{
                              backgroundColor: selected
                                ? theme.colors.accent
                                : theme.colors.surfaceSoft,
                              borderColor: selected
                                ? theme.colors.accent
                                : theme.colors.border,
                            }}
                          >
                            <Text
                              className="text-[11px] font-black"
                              style={{
                                color: selected
                                  ? theme.colors.accentForeground
                                  : theme.colors.foregroundMuted,
                              }}
                            >
                              {pageNumber}
                            </Text>
                          </Pressable>
                        );
                      },
                    )}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
