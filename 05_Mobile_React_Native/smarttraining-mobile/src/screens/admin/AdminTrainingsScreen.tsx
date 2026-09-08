import {
  Href,
  router,
} from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
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
import { AppEmptyState } from "../../components/ux/AppStates";
import { TrainingCover } from "../../components/ux/RichPrimitives";
import {
  ADMIN_TRAINING_FILTER_STATUSES,
  AdminTrainingLifecycleTarget,
  getAdminFullTraining,
  getAdminTrainings,
  updateAdminTrainingLifecycle,
} from "../../features/admin/adminTrainingService";
import {
  getAdminUsers,
} from "../../features/admin/adminUserService";
import { buildLearnerMediaUrl } from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  AdminTrainingStatus,
  AdminTrainingSummary,
  AdminUserSummary,
} from "../../types/admin";

type StatusFilter =
  | "ALL"
  | AdminTrainingStatus;

type PendingLifecycle = {
  training: AdminTrainingSummary;
  target: AdminTrainingLifecycleTarget;
};

type AdminTrainingVisual = {
  coverImageUrl?: string | null;
  coverImagePath?: string | null;
};

async function loadAdminTrainingData(): Promise<{
  trainings: AdminTrainingSummary[];
  users: AdminUserSummary[];
  visuals: Record<number, AdminTrainingVisual>;
}> {
  const [trainings, users] = await Promise.all([
    getAdminTrainings(),
    getAdminUsers(),
  ]);

  const visuals: Record<number, AdminTrainingVisual> = {};

  for (let index = 0; index < trainings.length; index += 8) {
    const batch = trainings.slice(index, index + 8);
    const details = await Promise.allSettled(
      batch.map((training) =>
        getAdminFullTraining(training.id),
      ),
    );

    details.forEach((result, batchIndex) => {
      const training = batch[batchIndex];
      if (!training || result.status !== "fulfilled") {
        return;
      }

      visuals[training.id] = {
        coverImageUrl: result.value.coverImageUrl,
        coverImagePath: result.value.coverImagePath,
      };
    });
  }

  return { trainings, users, visuals };
}

function statusLabel(status: string) {
  if (status === "DRAFT") return "Brouillon";
  if (status === "PUBLISHED") return "Publiée";
  if (status === "ARCHIVED") return "Archivée";
  if (status === "INACTIVE") return "Inactive";
  return status;
}

function userLabel(
  user?: AdminUserSummary,
): string {
  if (!user) return "Formateur non résolu";

  const name =
    user.fullName?.trim() ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name
    ? `${name} — ${user.email}`
    : user.email;
}

export default function AdminTrainingsScreen() {
  const { theme } = useSmartTrainingTheme();
  const [items, setItems] =
    useState<AdminTrainingSummary[]>([]);
  const [users, setUsers] =
    useState<AdminUserSummary[]>([]);
  const [visualById, setVisualById] =
    useState<Record<number, AdminTrainingVisual>>({});
  const [loading, setLoading] =
    useState(true);
  const [working, setWorking] =
    useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] =
    useState<StatusFilter>("ALL");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] =
    useState<PendingLifecycle | null>(null);
  const [expandedTrainingId, setExpandedTrainingId] =
    useState<number | null>(null);

  async function load() {
    const loaded = await loadAdminTrainingData();
    setItems(loaded.trainings);
    setUsers(loaded.users);
    setVisualById(loaded.visuals);
  }

  useEffect(() => {
    let active = true;

    void loadAdminTrainingData()
      .then((loaded) => {
        if (active) {
          setItems(loaded.trainings);
          setUsers(loaded.users);
          setVisualById(loaded.visuals);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger le catalogue administrateur.",
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
  }, []);

  const userById = useMemo(
    () =>
      new Map(
        users.map((user) => [
          user.id,
          user,
        ]),
      ),
    [users],
  );

  const filtered = useMemo(() => {
    const normalized =
      query.trim().toLowerCase();

    return items.filter((item) => {
      if (
        status !== "ALL" &&
        item.status !== status
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const trainer =
        item.trainerId
          ? userById.get(item.trainerId)
          : undefined;

      return [
        item.title,
        item.shortDescription || "",
        item.category || "",
        statusLabel(item.status),
        trainer ? userLabel(trainer) : "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [items, query, status, userById]);

  async function confirmLifecycle() {
    if (!pending || working) return;

    setWorking(true);
    setError("");
    setNotice("");

    try {
      const updated =
        await updateAdminTrainingLifecycle(
          pending.training.id,
          pending.target,
        );

      setItems((current) =>
        current.map((item) =>
          item.id === updated.id
            ? updated
            : item,
        ),
      );

      setNotice(
        `Formation « ${updated.title} » : ${statusLabel(
          updated.status,
        )}.`,
      );
      setPending(null);
    } catch {
      setError(
        "Le changement de statut n’a pas pu être enregistré.",
      );
    } finally {
      setWorking(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement des formations..." />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.page}>
          <SectionHeader
            title="Formations"
            subtitle="Créez, attribuez, modifiez et pilotez le catalogue depuis le mobile."
          />

          <View style={styles.topActions}>
            <AppButton
              title="+ Nouvelle formation"
              onPress={() =>
                router.push(
                  "/admin/training-new" as Href,
                )
              }
              style={styles.topButton}
            />

            <AppButton
              title="Catégories de formation"
              variant="secondary"
              onPress={() =>
                router.push(
                  "/admin/training-categories" as Href,
                )
              }
              style={styles.topButton}
            />
          </View>

          <TextInput
            accessibilityLabel="Rechercher une formation"
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une formation ou un formateur..."
            placeholderTextColor={
              theme.colors.foregroundSubtle
            }
            style={[
              styles.search,
              {
                color:
                  theme.colors.foreground,
                backgroundColor:
                  theme.colors.surface,
                borderColor:
                  theme.colors.border,
              },
            ]}
          />

          <View style={styles.filters}>
            <Filter
              label="Toutes"
              selected={status === "ALL"}
              onPress={() => setStatus("ALL")}
            />
            {ADMIN_TRAINING_FILTER_STATUSES.map(
              (value) => (
                <Filter
                  key={value}
                  label={statusLabel(value)}
                  selected={status === value}
                  onPress={() =>
                    setStatus(value)
                  }
                />
              ),
            )}
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => {
                setError("");
                void load().catch(() =>
                  setError(
                    "Impossible d’actualiser.",
                  ),
                );
              }}
            />
          ) : null}

          {notice ? (
            <View
              style={[
                styles.notice,
                {
                  backgroundColor:
                    theme.colors.surfaceSoft,
                  borderColor:
                    theme.colors.border,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    theme.colors.foreground,
                }}
              >
                {notice}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.count,
              {
                color:
                  theme.colors.foregroundMuted,
              },
            ]}
          >
            {filtered.length} formation
            {filtered.length > 1 ? "s" : ""}
          </Text>

          {filtered.length === 0 ? (
            <AppEmptyState
              title={
                items.length === 0
                  ? "Aucune formation"
                  : "Aucun résultat"
              }
              description={
                items.length === 0
                  ? "Créez une première formation pour commencer à piloter le catalogue."
                  : "Aucune formation ne correspond à votre recherche ou aux filtres sélectionnés."
              }
              actionLabel={
                items.length === 0
                  ? "Créer une formation"
                  : "Réinitialiser les filtres"
              }
              onAction={() => {
                if (items.length === 0) {
                  router.push("/admin/training-new" as Href);
                  return;
                }

                setQuery("");
                setStatus("ALL");
              }}
            />
          ) : null}

          {filtered.map((item) => (
            <View
              key={item.id}
              style={[
                styles.card,
                {
                  backgroundColor:
                    theme.colors.surface,
                  borderColor:
                    theme.colors.border,
                  borderRadius:
                    theme.shape.cardRadius,
                  borderWidth:
                    theme.shape.borderWidth,
                },
              ]}
            >
              <View
                style={[
                  styles.coverFrame,
                  { borderRadius: theme.shape.controlRadius },
                ]}
              >
                <TrainingCover
                  title={item.title}
                  coverUrl={buildLearnerMediaUrl(
                    visualById[item.id]?.coverImageUrl ||
                      visualById[item.id]?.coverImagePath,
                  )}
                />
              </View>

              <View style={styles.cardHead}>
                <View style={styles.cardText}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.title,
                      {
                        color:
                          theme.colors
                            .foreground,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={[
                      styles.trainer,
                      {
                        color:
                          theme.colors
                            .foregroundMuted,
                      },
                    ]}
                  >
                    Responsable :{" "}
                    {userLabel(
                      item.trainerId
                        ? userById.get(
                            item.trainerId,
                          )
                        : undefined,
                    )}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          item.status === "PUBLISHED"
                            ? theme.colors.success
                            : item.status === "ARCHIVED"
                              ? theme.colors.foregroundMuted
                              : theme.colors.info,
                      },
                    ]}
                  >
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>

              {item.shortDescription ? (
                <Text
                  numberOfLines={2}
                  style={[
                    styles.description,
                    {
                      color:
                        theme.colors
                          .foregroundMuted,
                    },
                  ]}
                >
                  {item.shortDescription}
                </Text>
              ) : null}

              <Text
                style={[
                  styles.meta,
                  {
                    color:
                      theme.colors
                        .foregroundSubtle,
                  },
                ]}
              >
                {item.category ||
                  "Sans catégorie"}{" "}
                ·{" "}
                {item.level ||
                  "Niveau non renseigné"}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Gérer ${item.title}`}
                accessibilityState={{ expanded: expandedTrainingId === item.id }}
                onPress={() =>
                  setExpandedTrainingId((current) =>
                    current === item.id ? null : item.id,
                  )
                }
                style={[
                  styles.manageButton,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.manageButtonText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {expandedTrainingId === item.id ? "Masquer" : "Gérer ›"}
                </Text>
              </Pressable>

              {expandedTrainingId === item.id ? (
                <View style={styles.actions}>
                {item.status === "DRAFT" ? (
                  <AppButton
                    title="Modifier"
                    variant="secondary"
                    onPress={() =>
                      router.push(
                        `/admin/training-edit/${item.id}` as Href,
                      )
                    }
                    style={styles.actionButton}
                  />
                ) : null}

                <AppButton
                  title="Quiz Builder"
                  variant="secondary"
                  onPress={() =>
                    router.push(
                      `/admin/training-quizzes/${item.id}` as Href,
                    )
                  }
                  style={styles.actionButton}
                />

                {item.status !== "PUBLISHED" ? (
                  <AppButton
                    title="Publier"
                    variant="secondary"
                    onPress={() =>
                      setPending({
                        training: item,
                        target: "PUBLISHED",
                      })
                    }
                    style={styles.actionButton}
                  />
                ) : null}

                {item.status !== "DRAFT" ? (
                  <AppButton
                    title="Brouillon"
                    variant="secondary"
                    onPress={() =>
                      setPending({
                        training: item,
                        target: "DRAFT",
                      })
                    }
                    style={styles.actionButton}
                  />
                ) : null}

                {item.status !== "ARCHIVED" ? (
                  <AppButton
                    title="Archiver"
                    variant="secondary"
                    onPress={() =>
                      setPending({
                        training: item,
                        target: "ARCHIVED",
                      })
                    }
                    style={styles.actionButton}
                  />
                ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={pending !== null}
        transparent
        animationType="fade"
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.colors.surfaceElevated,
                borderColor:
                  theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.colors.foreground,
                },
              ]}
            >
              Confirmer le changement de statut
            </Text>
            <Text
              style={[
                styles.modalText,
                {
                  color:
                    theme.colors
                      .foregroundMuted,
                },
              ]}
            >
              {pending?.training.title}
            </Text>
            <View style={styles.modalActions}>
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={working}
                onPress={() => setPending(null)}
              />
              <AppButton
                title="Confirmer"
                loading={working}
                onPress={() =>
                  void confirmLifecycle()
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );

  function Filter({
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
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={[
          styles.filter,
          {
            backgroundColor: selected
              ? theme.colors.surface
              : theme.colors.surfaceSoft,
            borderColor: selected
              ? theme.colors.foregroundSubtle
              : theme.colors.border,
          },
        ]}
      >
        <Text
          style={{
            color: theme.colors.foreground,
            fontWeight: "800",
            fontSize: 11,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  page: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
  },
  topActions: {
    flexDirection: "column",
    gap: 8,
    marginBottom: 14,
  },
  topButton: {
    width: "100%",
  },
  search: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    marginBottom: 12,
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 14,
  },
  filter: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  count: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 10,
  },
  card: {
    padding: 15,
    marginBottom: 11,
  },
  coverFrame: {
    width: "100%",
    height: 118,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardHead: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  cardText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "900",
  },
  trainer: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  description: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9,
  },
  meta: {
    fontSize: 10,
    marginTop: 8,
  },
  manageButton: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginTop: 10,
  },
  manageButtonText: {
    fontSize: 12,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  actionButton: {
    minWidth: 105,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  modalText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },
});
