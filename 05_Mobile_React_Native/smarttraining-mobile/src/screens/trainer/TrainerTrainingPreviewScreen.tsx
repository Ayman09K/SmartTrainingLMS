import { Href, router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import AppButton from "../../components/AppButton";
import LearnerInlineMedia from "../../components/learner/LearnerInlineMedia";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { API_BASE_URL } from "../../api/apiConfig";
import {
  getTrainerFullTraining,
} from "../../features/trainer/trainerAuthoringService";
import { getToken } from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerTrainingResource,
} from "../../types/learnerTraining";
import type {
  TrainerFullLessonResponse,
  TrainerFullModuleResponse,
  TrainerFullTrainingResponse,
  TrainerResourceResponse,
} from "../../types/trainerAuthoringMobile";

type Props = {
  trainingId: number;
  trainerId: number;
  onBack: () => void;
};

function isAbsoluteHttpUrl(
  value?: string | null,
): value is string {
  return Boolean(
    value && /^https?:\/\//i.test(value.trim()),
  );
}

function resourceUrl(
  resource: TrainerResourceResponse,
): string | null {
  const candidates = [
    resource.url,
    resource.publicUrl,
    resource.scormLaunchPath,
  ];

  return (
    candidates.find((value) =>
      isAbsoluteHttpUrl(value),
    ) ?? null
  );
}

function typeLabel(type?: string): string {
  if (type === "TEXT") return "Texte";
  if (type === "EXTERNAL_LINK") return "Lien";
  if (type === "IMAGE") return "Image";
  if (type === "PDF" || type === "PDF_URL") return "PDF";
  if (type === "DOCUMENT") return "Document";
  if (type === "VIDEO" || type === "VIDEO_URL") return "Vidéo";
  if (type === "SCORM") return "SCORM";

  return type || "Ressource";
}

function protectedMediaPath(value?: string | null): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  let pathname = raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsedUrl = new URL(raw);
      if (parsedUrl.origin !== new URL(API_BASE_URL).origin) {
        return null;
      }
      pathname = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else {
    pathname = raw.split(/[?#]/, 1)[0] || raw;
  }

  const markerIndex = pathname.indexOf("/media/");

  if (markerIndex < 0) {
    return null;
  }

  return pathname.slice(markerIndex);
}

function rawResourceUrl(
  resource: TrainerResourceResponse,
): string | null {
  const candidates = [
    resource.publicUrl,
    resource.url,
  ];

  return (
    candidates.find((value) => Boolean(value?.trim()))?.trim() ??
    null
  );
}

function safeDocumentName(
  resource: TrainerResourceResponse,
): string {
  const fallback = `ressource-${resource.id}`;
  const raw =
    resource.originalFileName?.trim() || fallback;

  return raw.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function statusLabel(status?: string): string {
  if (status === "DRAFT") return "Brouillon";
  if (status === "PUBLISHED") return "Publiée";
  if (status === "ARCHIVED") return "Archivée";

  return status || "Non renseigné";
}

function levelLabel(level?: string): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";

  return level || "Niveau non renseigné";
}

function formatSize(size?: number): string {
  if (!size || size <= 0) {
    return "";
  }

  if (size < 1024) {
    return `${size} o`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} Ko`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Impossible de charger la prévisualisation.";
}

export default function TrainerTrainingPreviewScreen({
  trainingId,
  trainerId,
  onBack,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [training, setTraining] =
    useState<TrainerFullTrainingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const modules = useMemo<TrainerFullModuleResponse[]>(
    () =>
      [...(training?.modules ?? [])].sort(
        (left, right) =>
          (left.orderIndex ?? 0) -
          (right.orderIndex ?? 0),
      ),
    [training],
  );

  useEffect(() => {
    let active = true;

    void getTrainerFullTraining(trainingId)
      .then((loaded) => {
        if (!active) {
          return;
        }

        if (loaded.trainerId !== trainerId) {
          setError(
            "Cette formation n’appartient pas à ce compte formateur.",
          );
          return;
        }

        setTraining(loaded);
      })
      .catch((caught) => {
        if (active) {
          setError(errorText(caught));
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
  }, [trainerId, trainingId]);

  async function openUrl(url: string) {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        setError("Cette ressource ne peut pas être ouverte.");
        return;
      }

      await Linking.openURL(url);
    } catch (caught) {
      setError(errorText(caught));
    }
  }

  async function openDocument(
    resource: TrainerResourceResponse,
  ) {
    const rawUrl = rawResourceUrl(resource);

    if (!rawUrl) {
      setError("Ce document ne possède pas de lien ouvrable.");
      return;
    }

    const protectedPath = protectedMediaPath(rawUrl);

    if (!protectedPath) {
      await openUrl(rawUrl);
      return;
    }

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Session expirée.");
      }

      const remoteUrl = `${API_BASE_URL}${protectedPath}`;

      if (Platform.OS === "web") {
        const response = await fetch(remoteUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const browserGlobal = globalThis as typeof globalThis & {
          open?: (url?: string, target?: string) => unknown;
        };

        browserGlobal.open?.(objectUrl, "_blank");
        setTimeout(
          () => URL.revokeObjectURL(objectUrl),
          60_000,
        );
        return;
      }

      if (!FileSystem.cacheDirectory) {
        throw new Error("Stockage temporaire indisponible.");
      }

      const localUri =
        `${FileSystem.cacheDirectory}${safeDocumentName(resource)}`;

      const result = await FileSystem.downloadAsync(
        remoteUrl,
        localUri,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
        },
      );

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`HTTP ${result.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: resource.mimeType || undefined,
          dialogTitle: resource.title,
        });
        return;
      }

      await Linking.openURL(result.uri);
    } catch {
      setError(
        "Le document protégé n’a pas pu être ouvert. Réessayez dans quelques instants.",
      );
    }
  }

  function sortedLessons(
    module: TrainerFullModuleResponse,
  ): TrainerFullLessonResponse[] {
    return [...(module.lessons ?? [])].sort(
      (left, right) =>
        (left.orderIndex ?? 0) -
        (right.orderIndex ?? 0),
    );
  }

  function sortedResources(
    lesson: TrainerFullLessonResponse,
  ): TrainerResourceResponse[] {
    return [...(lesson.resources ?? [])]
      .filter((resource) => resource.active !== false)
      .sort(
        (left, right) =>
          (left.orderIndex ?? 0) -
          (right.orderIndex ?? 0),
      );
  }

  if (loading) {
    return (
      <LoadingState message="Préparation de la prévisualisation..." />
    );
  }

  if (!training) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message={error || "Formation indisponible."}
          onRetry={onBack}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <AppButton
            title="Retour à la formation"
            variant="secondary"
            onPress={onBack}
            style={styles.backButton}
          />

          <View
            style={[
              styles.previewBanner,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.previewEyebrow,
                { color: theme.colors.accent },
              ]}
            >
              PRÉVISUALISATION FORMATEUR
            </Text>

            <Text
              style={[
                styles.previewText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Lecture seule · aperçu de la structure pédagogique
              présentée à l’apprenant.
            </Text>
          </View>

          {isAbsoluteHttpUrl(training.coverImageUrl) ? (
            <Image
              source={{ uri: training.coverImageUrl }}
              resizeMode="cover"
              style={[
                styles.cover,
                {
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            />
          ) : null}

          <View style={styles.trainingHeader}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.foreground },
              ]}
            >
              {training.title}
            </Text>

            <Text
              style={[
                styles.shortDescription,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {training.shortDescription ||
                training.description ||
                "Aucune description."}
            </Text>

            <View style={styles.metaRow}>
              <Meta text={statusLabel(training.status)} />
              <Meta
                text={training.category || "Sans catégorie"}
              />
              <Meta text={levelLabel(training.level)} />
              <Meta
                text={training.language || "Langue non renseignée"}
              />
              {training.estimatedDurationHours ? (
                <Meta
                  text={`${training.estimatedDurationHours} h`}
                />
              ) : null}
            </View>
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => setError("")}
            />
          ) : null}

          {training.objectives ? (
            <InfoCard
              title="Objectifs pédagogiques"
              text={training.objectives}
            />
          ) : null}

          {training.prerequisites ? (
            <InfoCard
              title="Prérequis"
              text={training.prerequisites}
            />
          ) : null}

          {training.targetAudience ? (
            <InfoCard
              title="Public cible"
              text={training.targetAudience}
            />
          ) : null}

          <View style={styles.structureHeader}>
            <Text
              style={[
                styles.structureTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Parcours
            </Text>

            <Text
              style={[
                styles.structureCount,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {modules.length} module
              {modules.length > 1 ? "s" : ""}
            </Text>
          </View>

          {modules.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.emptyTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun contenu
              </Text>
              <Text
                style={[
                  styles.emptyText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Cette formation ne contient encore aucun module.
              </Text>
            </View>
          ) : (
            modules.map((module, moduleIndex) => {
              const lessons = sortedLessons(module);

              return (
                <View
                  key={module.id}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderRadius: theme.shape.cardRadius,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.moduleEyebrow,
                      { color: theme.colors.accent },
                    ]}
                  >
                    MODULE {moduleIndex + 1}
                  </Text>

                  <Text
                    style={[
                      styles.moduleTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {module.title}
                  </Text>

                  {module.description ? (
                    <Text
                      style={[
                        styles.moduleDescription,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      {module.description}
                    </Text>
                  ) : null}

                  <View
                    style={[
                      styles.lessonList,
                      {
                        borderTopColor: theme.colors.border,
                      },
                    ]}
                  >
                    {lessons.length === 0 ? (
                      <Text
                        style={[
                          styles.noLesson,
                          {
                            color:
                              theme.colors.foregroundSubtle,
                          },
                        ]}
                      >
                        Aucune leçon.
                      </Text>
                    ) : (
                      lessons.map((lesson, lessonIndex) => {
                        const resources =
                          sortedResources(lesson);

                        return (
                          <View
                            key={lesson.id}
                            style={[
                              styles.lessonCard,
                              {
                                backgroundColor:
                                  theme.colors.surfaceSoft,
                                borderColor:
                                  theme.colors.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.lessonEyebrow,
                                {
                                  color:
                                    theme.colors
                                      .foregroundSubtle,
                                },
                              ]}
                            >
                              LEÇON {lessonIndex + 1}
                            </Text>

                            <Text
                              style={[
                                styles.lessonTitle,
                                {
                                  color:
                                    theme.colors.foreground,
                                },
                              ]}
                            >
                              {lesson.title}
                            </Text>

                            <View style={styles.lessonMetaRow}>
                              <Text
                                style={[
                                  styles.lessonMeta,
                                  {
                                    color:
                                      theme.colors
                                        .foregroundMuted,
                                  },
                                ]}
                              >
                                {lesson.estimatedDurationMinutes ??
                                  0}{" "}
                                min
                              </Text>
                              <Text
                                style={[
                                  styles.lessonMeta,
                                  {
                                    color:
                                      theme.colors
                                        .foregroundMuted,
                                  },
                                ]}
                              >
                                {lesson.required === false
                                  ? "Optionnelle"
                                  : "Obligatoire"}
                              </Text>
                            </View>

                            {lesson.objective ? (
                              <Text
                                style={[
                                  styles.lessonObjective,
                                  {
                                    color:
                                      theme.colors
                                        .foregroundMuted,
                                  },
                                ]}
                              >
                                Objectif : {lesson.objective}
                              </Text>
                            ) : null}

                            {lesson.content ? (
                              <Text
                                style={[
                                  styles.lessonContent,
                                  {
                                    color:
                                      theme.colors.foreground,
                                  },
                                ]}
                              >
                                {lesson.content}
                              </Text>
                            ) : null}

                            <View style={styles.resourcesBlock}>
                              <Text
                                style={[
                                  styles.resourcesTitle,
                                  {
                                    color:
                                      theme.colors.foreground,
                                  },
                                ]}
                              >
                                Ressources
                              </Text>

                              {resources.length === 0 ? (
                                <Text
                                  style={[
                                    styles.noResource,
                                    {
                                      color:
                                        theme.colors
                                          .foregroundSubtle,
                                    },
                                  ]}
                                >
                                  Aucune ressource.
                                </Text>
                              ) : (
                                resources.map((resource) => (
                                  <ResourcePreview
                                    key={resource.id}
                                    resource={resource}
                                  />
                                ))
                              )}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function Meta({ text }: { text: string }) {
    return (
      <View
        style={[
          styles.metaPill,
          {
            backgroundColor: theme.colors.surfaceSoft,
          },
        ]}
      >
        <Text
          style={[
            styles.metaText,
            { color: theme.colors.foreground },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  function InfoCard({
    title,
    text,
  }: {
    title: string;
    text: string;
  }) {
    return (
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderRadius: theme.shape.cardRadius,
            borderWidth: theme.shape.borderWidth,
          },
        ]}
      >
        <Text
          style={[
            styles.infoTitle,
            { color: theme.colors.foreground },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.infoText,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          {text}
        </Text>
      </View>
    );
  }

  function ResourcePreview({
    resource,
  }: {
    resource: TrainerResourceResponse;
  }) {
    const url = resourceUrl(resource);
    const rawUrl = rawResourceUrl(resource);
    const inlineMedia =
      resource.type === "IMAGE" ||
      resource.type === "VIDEO" ||
      resource.type === "VIDEO_URL" ||
      resource.type === "PDF" ||
      resource.type === "PDF_URL";

    const inlineMediaResource =
      resource as unknown as LearnerTrainingResource;

    return (
      <View
        style={[
          styles.resourceCard,
          {
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.resourceHeader}>
          <Text
            style={[
              styles.resourceTitle,
              { color: theme.colors.foreground },
            ]}
          >
            {resource.title}
          </Text>

          <View
            style={[
              styles.resourceType,
              {
                backgroundColor: theme.colors.surfaceSoft,
              },
            ]}
          >
            <Text
              style={[
                styles.resourceTypeText,
                { color: theme.colors.accent },
              ]}
            >
              {typeLabel(resource.type)}
            </Text>
          </View>
        </View>

        {resource.description ? (
          <Text
            style={[
              styles.resourceDescription,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {resource.description}
          </Text>
        ) : null}

        {resource.type === "TEXT" &&
        resource.textContent ? (
          <Text
            style={[
              styles.textResource,
              { color: theme.colors.foreground },
            ]}
          >
            {resource.textContent}
          </Text>
        ) : null}

        {inlineMedia && rawUrl ? (
          <LearnerInlineMedia
            resource={inlineMediaResource}
          />
        ) : null}

        {resource.originalFileName ? (
          <Text
            style={[
              styles.fileMeta,
              { color: theme.colors.foregroundSubtle },
            ]}
          >
            {resource.originalFileName}
            {resource.fileSize
              ? ` · ${formatSize(resource.fileSize)}`
              : ""}
          </Text>
        ) : null}

        {resource.type === "SCORM" ? (
          <Text
            style={[
              styles.fileMeta,
              { color: theme.colors.foregroundSubtle },
            ]}
          >
            Package SCORM
            {resource.scormPackageId
              ? ` #${resource.scormPackageId}`
              : ""}
          </Text>
        ) : null}

        {resource.type === "SCORM" ||
        (resource.type === "DOCUMENT" && rawUrl) ||
        (resource.type === "EXTERNAL_LINK" && url) ? (
          <AppButton
            title={
              resource.type === "SCORM"
                ? "Ouvrir le SCORM"
                : resource.type === "EXTERNAL_LINK"
                  ? "Ouvrir le lien"
                  : "Ouvrir le document"
            }
            variant="secondary"
            onPress={() => {
              if (resource.type === "SCORM") {
                router.push(
                  `/scorm/${resource.id}?mode=author` as Href,
                );
                return;
              }

              if (resource.type === "DOCUMENT") {
                void openDocument(resource);
                return;
              }

              if (url) {
                void openUrl(url);
              }
            }}
            style={styles.openButton}
          />
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
    paddingBottom: 44,
  },
  page: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  previewBanner: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  previewEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  previewText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  cover: {
    width: "100%",
    height: 210,
    marginBottom: 18,
  },
  trainingHeader: {
    marginBottom: 18,
  },
  title: {
    fontSize: 29,
    lineHeight: 35,
    fontWeight: "900",
  },
  shortDescription: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12,
  },
  metaPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    fontSize: 10,
    fontWeight: "800",
  },
  infoCard: {
    padding: 15,
    marginBottom: 11,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "900",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  structureHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginTop: 10,
    marginBottom: 12,
  },
  structureTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  structureCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  moduleCard: {
    padding: 16,
    marginBottom: 14,
  },
  moduleEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
  },
  moduleTitle: {
    fontSize: 19,
    fontWeight: "900",
    marginTop: 4,
  },
  moduleDescription: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  lessonList: {
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
  },
  noLesson: {
    fontSize: 12,
    fontStyle: "italic",
  },
  lessonCard: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    marginBottom: 11,
  },
  lessonEyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  lessonMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginTop: 5,
  },
  lessonMeta: {
    fontSize: 10,
    fontWeight: "700",
  },
  lessonObjective: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },
  lessonContent: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  resourcesBlock: {
    marginTop: 14,
  },
  resourcesTitle: {
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  noResource: {
    fontSize: 11,
    fontStyle: "italic",
  },
  resourceCard: {
    borderWidth: 1,
    borderRadius: 11,
    padding: 12,
    marginBottom: 8,
  },
  resourceHeader: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  resourceTitle: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  resourceType: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resourceTypeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  resourceDescription: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },
  textResource: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  resourceImage: {
    width: "100%",
    height: 190,
    borderRadius: 10,
    marginTop: 10,
  },
  fileMeta: {
    fontSize: 10,
    lineHeight: 15,
    marginTop: 8,
  },
  openButton: {
    alignSelf: "flex-start",
    marginTop: 10,
  },
});