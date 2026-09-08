import { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  getAdminOpenFeedbacks,
  markAdminFeedbackInProgress,
  resolveAdminFeedback,
} from "../../features/admin/adminFeedbackAlertService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  AdminFeedbackStatus,
  AdminFeedbackSummary,
} from "../../types/admin";

type FeedbackFilter = "ALL" | AdminFeedbackStatus;
type FeedbackAction = "IN_PROGRESS" | "RESOLVE";

type PendingFeedbackAction = {
  feedback: AdminFeedbackSummary;
  action: FeedbackAction;
};

const feedbackFilters: readonly AdminFeedbackStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

function statusLabel(status: string): string {
  if (status === "OPEN") return "Ouvert";
  if (status === "IN_PROGRESS") return "En cours";
  if (status === "RESOLVED") return "Résolu";
  if (status === "CLOSED") return "Clôturé";
  return status;
}

function formatDate(value?: string | null): string {
  if (!value) return "Non renseignée";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("fr-FR");
}

export default function AdminFeedbacksScreen() {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] = useState<AdminFeedbackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FeedbackFilter>("ALL");
  const [pending, setPending] =
    useState<PendingFeedbackAction | null>(null);
  const [trainerResponse, setTrainerResponse] = useState("");

  async function load() {
    const data = await getAdminOpenFeedbacks();
    setItems(data);
  }

  useEffect(() => {
    let active = true;

    void getAdminOpenFeedbacks()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger les feedbacks ouverts.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== "ALL" && item.status !== filter) {
        return false;
      }

      if (!normalized) return true;

      return [
        item.message || "",
        item.difficultyLevel || "",
        item.needHelp ? "besoin aide" : "",
        item.status,
        String(item.learnerId),
        String(item.trainingId),
        item.trainerResponse || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, query, filter]);

  function openAction(
    feedback: AdminFeedbackSummary,
    action: FeedbackAction,
  ) {
    if (
      action === "IN_PROGRESS" &&
      feedback.status !== "OPEN"
    ) {
      return;
    }

    if (
      action === "RESOLVE" &&
      feedback.status !== "OPEN" &&
      feedback.status !== "IN_PROGRESS"
    ) {
      return;
    }

    setError("");
    setNotice("");
    setTrainerResponse(feedback.trainerResponse || "");
    setPending({ feedback, action });
  }

  async function confirmAction() {
    if (!pending || working) return;

    const { feedback, action } = pending;

    if (
      action === "IN_PROGRESS" &&
      feedback.status !== "OPEN"
    ) {
      setPending(null);
      return;
    }

    if (
      action === "RESOLVE" &&
      feedback.status !== "OPEN" &&
      feedback.status !== "IN_PROGRESS"
    ) {
      setPending(null);
      return;
    }

    setWorking(true);
    setError("");

    try {
      const updated =
        action === "IN_PROGRESS"
          ? await markAdminFeedbackInProgress(feedback.id)
          : await resolveAdminFeedback(
              feedback.id,
              trainerResponse,
            );

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      );

      setNotice(
        action === "IN_PROGRESS"
          ? "Le feedback est maintenant pris en charge."
          : "Le feedback a été résolu.",
      );
      setPending(null);
      setTrainerResponse("");
    } catch {
      setError("L’action sur ce feedback n’a pas pu être enregistrée.");
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement des feedbacks..." />;
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <SectionHeader
            title="Feedbacks"
            subtitle="Traitez la file opérationnelle des difficultés et demandes d’aide."
          />

          <View
            style={[
              styles.scopeCard,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.scopeText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Le mobile utilise la file backend « ouverte ». Les éléments
              résolus restent visibles dans cette session après traitement,
              puis quittent naturellement la file au prochain chargement.
            </Text>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher message, difficulté ou identifiant"
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[
              styles.search,
              {
                color: theme.colors.foreground,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          />

          <View style={styles.chips}>
            <FilterChip
              label="Tous"
              selected={filter === "ALL"}
              onPress={() => setFilter("ALL")}
            />
            {feedbackFilters.map((status) => (
              <FilterChip
                key={status}
                label={statusLabel(status)}
                selected={filter === status}
                onPress={() => setFilter(status)}
              />
            ))}
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError("");
                void load().catch(() =>
                  setError("Impossible de charger les feedbacks ouverts."),
                );
              }}
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
              <Text style={{ color: theme.colors.foreground }}>
                {notice}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.count,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {filtered.length} feedback
            {filtered.length > 1 ? "s" : ""}
          </Text>

          <View style={styles.list}>
            {filtered.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    borderRadius: theme.shape.cardRadius,
                    borderWidth: theme.shape.borderWidth,
                    padding: theme.shape.cardPadding,
                  },
                ]}
              >
                <View style={styles.cardHead}>
                  <View style={styles.identity}>
                    <Text
                      style={[
                        styles.title,
                        { color: theme.colors.foreground },
                      ]}
                    >
                      {item.needHelp
                        ? "Demande d’aide"
                        : "Feedback apprenant"}
                    </Text>
                    <Text
                      style={[
                        styles.meta,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      Apprenant #{item.learnerId} · Formation #{item.trainingId}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.colors.surfaceSoft,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: theme.colors.accent },
                      ]}
                    >
                      {statusLabel(item.status)}
                    </Text>
                  </View>
                </View>

                {item.difficultyLevel ? (
                  <Text
                    style={[
                      styles.info,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Difficulté : {item.difficultyLevel}
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.message,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {item.message || "Aucun message."}
                </Text>

                {item.trainerResponse ? (
                  <View
                    style={[
                      styles.responseBox,
                      { backgroundColor: theme.colors.surfaceSoft },
                    ]}
                  >
                    <Text
                      style={[
                        styles.responseTitle,
                        { color: theme.colors.accent },
                      ]}
                    >
                      Réponse pédagogique
                    </Text>
                    <Text
                      style={[
                        styles.responseText,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {item.trainerResponse}
                    </Text>
                  </View>
                ) : null}

                <Text
                  style={[
                    styles.date,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  Créé : {formatDate(item.createdAt)}
                </Text>

                <View style={styles.actions}>
                  {item.status === "OPEN" ? (
                    <ActionButton
                      label="Prendre en charge"
                      primary={false}
                      disabled={working}
                      onPress={() => openAction(item, "IN_PROGRESS")}
                    />
                  ) : null}

                  {item.status === "OPEN" ||
                  item.status === "IN_PROGRESS" ? (
                    <ActionButton
                      label="Résoudre"
                      primary
                      disabled={working}
                      onPress={() => openAction(item, "RESOLVE")}
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {filtered.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun feedback dans cette vue
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {pending ? (
        <View style={styles.overlay}>
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
              Confirmer l’action
            </Text>

            <Text
              style={[
                styles.confirmText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {pending.action === "IN_PROGRESS"
                ? "Prendre en charge ce feedback ?"
                : "Résoudre ce feedback ?"}
            </Text>

            {pending.action === "RESOLVE" ? (
              <>
                <TextInput
                  value={trainerResponse}
                  onChangeText={setTrainerResponse}
                  placeholder="Réponse pédagogique (facultative)"
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  multiline
                  maxLength={2000}
                  style={[
                    styles.responseInput,
                    {
                      color: theme.colors.foreground,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.counter,
                    { color: theme.colors.foregroundSubtle },
                  ]}
                >
                  {trainerResponse.length}/2000
                </Text>
              </>
            ) : null}

            <View style={styles.confirmActions}>
              <ActionButton
                label="Annuler"
                primary={false}
                disabled={working}
                onPress={() => {
                  setPending(null);
                  setTrainerResponse("");
                }}
              />
              <ActionButton
                label={working ? "Enregistrement..." : "Confirmer"}
                primary
                disabled={working}
                onPress={() => void confirmAction()}
              />
            </View>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );

  function FilterChip({
    label,
    selected,
    onPress,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.chip,
          {
            backgroundColor: selected
              ? theme.colors.surfaceSoft
              : theme.colors.surface,
            borderColor: selected
              ? theme.colors.accent
              : theme.colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: selected
              ? theme.colors.accent
              : theme.colors.foregroundMuted,
            fontWeight: selected ? "800" : "600",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  function ActionButton({
    label,
    primary,
    disabled,
    onPress,
  }: {
    label: string;
    primary: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.actionButton,
          {
            backgroundColor: primary
              ? theme.colors.accent
              : theme.colors.surfaceSoft,
            borderColor: primary
              ? theme.colors.accent
              : theme.colors.border,
            opacity: disabled ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={{
            color: primary
              ? theme.colors.accentForeground
              : theme.colors.foreground,
            fontWeight: "700",
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingBottom: 40 },
  page: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  scopeCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },
  scopeText: { fontSize: 12, lineHeight: 18 },
  search: {
    minHeight: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 14,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
  },
  chip: {
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
  },
  count: { fontSize: 12, fontWeight: "700", marginBottom: 10 },
  list: { gap: 12 },
  card: { width: "100%" },
  cardHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  identity: { flexGrow: 1, flexShrink: 1 },
  title: { fontSize: 17, fontWeight: "900" },
  meta: { fontSize: 11, marginTop: 4 },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 10, fontWeight: "900" },
  info: { fontSize: 12, marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 21 },
  responseBox: { borderRadius: 12, padding: 12, marginTop: 12 },
  responseTitle: { fontSize: 11, fontWeight: "900" },
  responseText: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  date: { fontSize: 11, marginTop: 12 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    minWidth: 128,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  empty: { padding: 20, marginTop: 12 },
  emptyTitle: { fontSize: 16, fontWeight: "900" },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  confirmCard: { width: "100%", maxWidth: 540, padding: 20 },
  confirmTitle: { fontSize: 19, fontWeight: "900" },
  confirmText: { fontSize: 14, lineHeight: 21, marginTop: 9 },
  responseInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    marginTop: 16,
  },
  counter: { fontSize: 11, textAlign: "right", marginTop: 5 },
  confirmActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
});