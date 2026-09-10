import { SymbolView } from "expo-symbols";
import { Stack } from "expo-router";
import { isAxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  createTrainerRequest,
  getMyTrainerRequests,
} from "../../features/auth/learnerTrainerRequestService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
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

export default function LearnerBecomeTrainerScreen({ onBackHome }: Props) {
  const { theme } = useSmartTrainingTheme();
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
        if (active) setError("Impossible de charger tes demandes.");
      })
      .finally(() => {
        if (active) setLoading(false);
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

  function statusColor(status: LearnerTrainerRequestStatus): string {
    switch (status) {
      case "APPROVED":
        return theme.colors.success;
      case "REJECTED":
        return theme.colors.danger;
      case "CANCELLED":
        return theme.colors.foregroundMuted;
      case "PENDING":
      default:
        return theme.colors.warning;
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de tes demandes..." />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour à Mon compte"
              hitSlop={6}
              onPress={onBackHome}
              android_ripple={{ color: "transparent" }}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                marginLeft: 2,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.10)",
              })}
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "chevron_left",
                  web: "chevron_left",
                }}
                tintColor={theme.colors.headerForeground}
                size={24}
                weight="bold"
              />
            </Pressable>
          ),
        }}
      />
      <ScreenContainer>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full self-center" style={{ maxWidth: 820 }}>
          <View
            className="overflow-hidden rounded-[24px] border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme.shape.shadowOpacity,
              shadowRadius: 14,
              elevation: 2,
            }}
          >
            <View className="h-1.5" style={{ backgroundColor: theme.colors.accent }} />
            <View className="relative overflow-hidden px-4 py-4">
              <View
                className="absolute -right-10 -top-12 h-36 w-36 rounded-full"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              />
              <View className="flex-row items-center">
                <View
                  className="h-14 w-14 items-center justify-center rounded-[18px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <SymbolView
                    name={{ ios: "graduationcap.fill", android: "school", web: "school" }}
                    tintColor={theme.colors.accent}
                    size={25}
                    weight="bold"
                  />
                </View>
                <View className="ml-3.5 min-w-0 flex-1 pr-3">
                  <Text
                    className="text-[10px] font-black uppercase tracking-[0.9px]"
                    style={{ color: theme.colors.accent }}
                  >
                    Évolution du compte
                  </Text>
                  <Text
                    className="mt-1 text-[24px] font-black leading-[29px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Devenir formateur
                  </Text>
                  <Text
                    className="mt-1 text-[13px] leading-[19px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Présente ton expertise et ta motivation. L’administration examinera ensuite ta demande.
                  </Text>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between">
                {[
                  ["1", "Expertise"],
                  ["2", "Motivation"],
                  ["3", "Examen"],
                ].map(([step, label], index) => (
                  <View key={step} className="flex-1 flex-row items-center">
                    <View className="items-center">
                      <View
                        className="h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: theme.colors.surfaceSoft }}
                      >
                        <Text
                          className="text-[12px] font-black"
                          style={{ color: theme.colors.accent }}
                        >
                          {step}
                        </Text>
                      </View>
                      <Text
                        className="mt-1 text-[9px] font-bold"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {label}
                      </Text>
                    </View>
                    {index < 2 ? (
                      <View
                        className="mx-2 h-px flex-1"
                        style={{ backgroundColor: theme.colors.border }}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {success ? (
            <View
              className="mt-3 flex-row items-start rounded-[16px] border px-3.5 py-3"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.success,
              }}
            >
              <SymbolView
                name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                tintColor={theme.colors.success}
                size={26}
                weight="bold"
              />
              <Text
                className="ml-2.5 flex-1 text-[13px] font-bold leading-[18px]"
                style={{ color: theme.colors.success }}
              >
                {success}
              </Text>
            </View>
          ) : null}

          {error ? (
            <View className="mt-3">
              <ErrorMessage message={error} />
            </View>
          ) : null}

          {hasPending ? (
            !success ? (
              <View
                className="mt-4 overflow-hidden rounded-[20px] border p-4"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.warning,
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-[14px]"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <SymbolView
                      name={{ ios: "clock.fill", android: "schedule", web: "schedule" }}
                      tintColor={theme.colors.warning}
                      size={20}
                      weight="bold"
                    />
                  </View>
                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      className="text-[16px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      Demande en cours d’examen
                    </Text>
                    <Text
                      className="mt-1 text-[12px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Ta demande a bien été reçue. Son statut reste visible dans l’historique ci-dessous.
                    </Text>
                  </View>
                </View>
              </View>
            ) : null
          ) : (
            <View
              className="mt-4 rounded-[22px] border p-4"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="h-10 w-10 items-center justify-center rounded-[13px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <SymbolView
                    name={{ ios: "doc.text.fill", android: "description", web: "description" }}
                    tintColor={theme.colors.accent}
                    size={18}
                    weight="bold"
                  />
                </View>
                <View className="ml-3 flex-1">
                  <Text
                    className="text-[18px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Nouvelle demande
                  </Text>
                  <Text
                    className="mt-0.5 text-[11px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Les champs obligatoires sont indiqués clairement.
                  </Text>
                </View>
              </View>

              <Text
                className="mt-5 text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Domaine d’expertise
              </Text>
              <TextInput
                value={expertiseDomain}
                accessibilityLabel="Domaine d’expertise"
                onChangeText={setExpertiseDomain}
                maxLength={120}
                placeholder="Ex. Développement web, réseaux, bureautique..."
                placeholderTextColor={theme.colors.foregroundSubtle}
                className="mt-2 min-h-[52px] rounded-[15px] border px-3.5 text-[15px]"
                style={{
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              />
              <Text
                className="mt-1.5 text-right text-[10px] font-bold"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                {expertiseDomain.length}/120
              </Text>

              <Text
                className="mt-4 text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Résumé de ton expérience
              </Text>
              <Text
                className="mt-0.5 text-[10px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Facultatif
              </Text>
              <TextInput
                value={experienceSummary}
                accessibilityLabel="Résumé de ton expérience"
                onChangeText={setExperienceSummary}
                maxLength={1000}
                multiline
                textAlignVertical="top"
                placeholder="Décris brièvement ton expérience ou tes réalisations."
                placeholderTextColor={theme.colors.foregroundSubtle}
                className="mt-2 min-h-[116px] rounded-[15px] border px-3.5 py-3 text-[15px] leading-[21px]"
                style={{
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              />
              <Text
                className="mt-1.5 text-right text-[10px] font-bold"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                {experienceSummary.length}/1000
              </Text>

              <Text
                className="mt-4 text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Motivation
              </Text>
              <TextInput
                value={motivation}
                accessibilityLabel="Motivation"
                onChangeText={setMotivation}
                maxLength={1500}
                multiline
                textAlignVertical="top"
                placeholder="Explique pourquoi tu souhaites devenir formateur sur SmartTraining."
                placeholderTextColor={theme.colors.foregroundSubtle}
                className="mt-2 min-h-[140px] rounded-[15px] border px-3.5 py-3 text-[15px] leading-[21px]"
                style={{
                  color: theme.colors.foreground,
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              />
              <Text
                className="mt-1.5 text-right text-[10px] font-bold"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                {motivation.length}/1500
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Envoyer ma demande"
                disabled={submitting}
                onPress={() => void submit()}
                android_ripple={{ color: "transparent" }}
                className="mt-5 min-h-[52px] flex-row items-center justify-center rounded-[16px] px-4"
                style={{
                  backgroundColor: theme.colors.accent,
                  opacity: submitting ? 0.65 : 1,
                }}
              >
                <SymbolView
                  name={{ ios: "paperplane.fill", android: "send", web: "send" }}
                  tintColor={theme.colors.accentForeground}
                  size={17}
                  weight="bold"
                />
                <Text
                  className="ml-2 text-[14px] font-black"
                  style={{ color: theme.colors.accentForeground }}
                >
                  {submitting ? "Envoi en cours…" : "Envoyer ma demande"}
                </Text>
              </Pressable>
            </View>
          )}

          <View className="mt-5 mb-2 flex-row items-end justify-between">
            <View>
              <Text
                className="text-[19px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Mes demandes
              </Text>
              <Text
                className="mt-0.5 text-[11px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Historique réel de tes demandes envoyées.
              </Text>
            </View>
            {requests.length > 0 ? (
              <View
                className="rounded-full px-2.5 py-1.5"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <Text
                  className="text-[10px] font-black"
                  style={{ color: theme.colors.accent }}
                >
                  {requests.length}
                </Text>
              </View>
            ) : null}
          </View>

          {requests.length === 0 ? (
            <View
              className="mt-2 items-center rounded-[20px] border px-4 py-7"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <View
                className="h-12 w-12 items-center justify-center rounded-[16px]"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              >
                <SymbolView
                  name={{ ios: "tray.fill", android: "inbox", web: "inbox" }}
                  tintColor={theme.colors.accent}
                  size={20}
                  weight="bold"
                />
              </View>
              <Text
                className="mt-3 text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Aucune demande pour le moment
              </Text>
              <Text
                className="mt-1 text-center text-[11px] leading-[16px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Ton historique apparaîtra ici après ton premier envoi.
              </Text>
            </View>
          ) : (
            requests.map((request) => {
              const tone = statusColor(request.status);

              return (
                <View
                  key={request.id}
                  className="mt-2.5 rounded-[20px] border p-4"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1 pr-3">
                      <Text
                        className="text-[15px] font-black leading-[20px]"
                        style={{ color: theme.colors.foreground }}
                      >
                        {request.expertiseDomain}
                      </Text>
                      <Text
                        className="mt-1 text-[10px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Envoyée le {formatDate(request.requestedAt)}
                      </Text>
                    </View>
                    <View
                      className="rounded-full px-2.5 py-1.5"
                      style={{ backgroundColor: theme.colors.surfaceSoft }}
                    >
                      <Text
                        className="text-[10px] font-black"
                        style={{ color: tone }}
                      >
                        {statusLabel(request.status)}
                      </Text>
                    </View>
                  </View>

                  {request.experienceSummary ? (
                    <View className="mt-3">
                      <Text
                        className="text-[10px] font-black uppercase tracking-[0.6px]"
                        style={{ color: theme.colors.foregroundSubtle }}
                      >
                        Expérience
                      </Text>
                      <Text
                        className="mt-1 text-[12px] leading-[18px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        {request.experienceSummary}
                      </Text>
                    </View>
                  ) : null}

                  <View className="mt-3">
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.6px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Motivation
                    </Text>
                    <Text
                      className="mt-1 text-[12px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {request.motivation}
                    </Text>
                  </View>

                  {request.adminComment ? (
                    <View
                      className="mt-3 rounded-[14px] px-3 py-3"
                      style={{ backgroundColor: theme.colors.surfaceSoft }}
                    >
                      <Text
                        className="text-[10px] font-black uppercase tracking-[0.6px]"
                        style={{ color: theme.colors.accent }}
                      >
                        Réponse de l’administration
                      </Text>
                      <Text
                        className="mt-1 text-[12px] leading-[18px]"
                        style={{ color: theme.colors.foreground }}
                      >
                        {request.adminComment}
                      </Text>
                    </View>
                  ) : null}

                  {request.reviewedAt ? (
                    <Text
                      className="mt-3 text-[10px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Traitée le {formatDate(request.reviewedAt)}
                    </Text>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
      </ScreenContainer>
    </>
  );
}
