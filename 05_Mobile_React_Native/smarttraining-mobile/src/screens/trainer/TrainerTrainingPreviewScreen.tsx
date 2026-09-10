import * as FileSystem from "expo-file-system/legacy";
import { Href, router } from "expo-router";
import * as Sharing from "expo-sharing";
import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { API_BASE_URL } from "../../api/apiConfig";
import ErrorMessage from "../../components/ErrorMessage";
import LearnerInlineMedia from "../../components/learner/LearnerInlineMedia";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
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

type SymbolName = ComponentProps<typeof SymbolView>["name"];

type ResourceVisual = {
  icon: SymbolName;
  soft: string;
  color: string;
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

function rawResourceUrl(
  resource: TrainerResourceResponse,
): string | null {
  const candidates = [
    resource.publicUrl,
    resource.url,
  ];

  return (
    candidates
      .find((value) => Boolean(value?.trim()))
      ?.trim() ?? null
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

function resourceVisual(type?: string): ResourceVisual {
  if (type === "TEXT") {
    return {
      icon: {
        ios: "text.alignleft",
        android: "notes",
        web: "notes",
      },
      soft: "#F3EDFF",
      color: "#7C3AED",
    };
  }

  if (type === "EXTERNAL_LINK") {
    return {
      icon: {
        ios: "link",
        android: "link",
        web: "link",
      },
      soft: "#EAF3FF",
      color: "#2563EB",
    };
  }

  if (type === "IMAGE") {
    return {
      icon: {
        ios: "photo.fill",
        android: "image",
        web: "image",
      },
      soft: "#EAFBF3",
      color: "#059669",
    };
  }

  if (type === "PDF" || type === "PDF_URL") {
    return {
      icon: {
        ios: "doc.fill",
        android: "picture_as_pdf",
        web: "picture_as_pdf",
      },
      soft: "#FFF0F2",
      color: "#DC2626",
    };
  }

  if (type === "DOCUMENT") {
    return {
      icon: {
        ios: "doc.text.fill",
        android: "description",
        web: "description",
      },
      soft: "#EEF2FF",
      color: "#4F46E5",
    };
  }

  if (type === "VIDEO" || type === "VIDEO_URL") {
    return {
      icon: {
        ios: "play.rectangle.fill",
        android: "smart_display",
        web: "smart_display",
      },
      soft: "#FFF4E5",
      color: "#D97706",
    };
  }

  return {
    icon: {
      ios: "shippingbox.fill",
      android: "inventory_2",
      web: "inventory_2",
    },
    soft: "#E9FAFC",
    color: "#0EA5A8",
  };
}

function protectedMediaPath(
  value?: string | null,
): string | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  let pathname = raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsedUrl = new URL(raw);

      if (
        parsedUrl.origin !==
        new URL(API_BASE_URL).origin
      ) {
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

  return level || "";
}

function languageLabel(language?: string | null): string {
  const value = language?.trim().toLowerCase();

  if (!value) return "";
  if (value === "fr" || value === "fr-fr") return "Français";
  if (value === "en" || value === "en-us" || value === "en-gb") return "Anglais";
  if (value === "es" || value === "es-es") return "Espagnol";
  if (value === "de" || value === "de-de") return "Allemand";
  if (value === "it" || value === "it-it") return "Italien";
  if (value === "ar") return "Arabe";

  return language?.trim() || "";
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
    useState<TrainerFullTrainingResponse | null>(
      null,
    );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expandedModules, setExpandedModules] =
    useState<Set<number>>(new Set());
  const [expandedLessons, setExpandedLessons] =
    useState<Set<number>>(new Set());
  const [expandedMedia, setExpandedMedia] =
    useState<Set<number>>(new Set());

  const modules = useMemo<
    TrainerFullModuleResponse[]
  >(
    () =>
      [...(training?.modules ?? [])].sort(
        (left, right) =>
          (left.orderIndex ?? 0) -
          (right.orderIndex ?? 0),
      ),
    [training],
  );

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
      .filter(
        (resource) => resource.active !== false,
      )
      .sort(
        (left, right) =>
          (left.orderIndex ?? 0) -
          (right.orderIndex ?? 0),
      );
  }

  const totalLessons = useMemo(
    () =>
      modules.reduce(
        (total, module) =>
          total + sortedLessons(module).length,
        0,
      ),
    [modules],
  );

  const totalResources = useMemo(
    () =>
      modules.reduce(
        (moduleTotal, module) =>
          moduleTotal +
          sortedLessons(module).reduce(
            (lessonTotal, lesson) =>
              lessonTotal +
              sortedResources(lesson).length,
            0,
          ),
        0,
      ),
    [modules],
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

        const firstModule = [...(loaded.modules ?? [])].sort(
          (left, right) =>
            (left.orderIndex ?? 0) -
            (right.orderIndex ?? 0),
        )[0];

        if (firstModule) {
          setExpandedModules(
            new Set([firstModule.id]),
          );

          const firstLesson = [
            ...(firstModule.lessons ?? []),
          ].sort(
            (left, right) =>
              (left.orderIndex ?? 0) -
              (right.orderIndex ?? 0),
          )[0];

          if (firstLesson) {
            setExpandedLessons(
              new Set([firstLesson.id]),
            );
          }
        }
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

  function toggleSet(
    current: Set<number>,
    id: number,
  ): Set<number> {
    const next = new Set(current);

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    return next;
  }

  async function openUrl(url: string) {
    try {
      const supported =
        await Linking.canOpenURL(url);

      if (!supported) {
        setError(
          "Cette ressource ne peut pas être ouverte.",
        );
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
      setError(
        "Ce document ne possède pas de lien ouvrable.",
      );
      return;
    }

    const protectedPath =
      protectedMediaPath(rawUrl);

    if (!protectedPath) {
      await openUrl(rawUrl);
      return;
    }

    try {
      const token = await getToken();

      if (!token) {
        throw new Error("Session expirée.");
      }

      const remoteUrl =
        `${API_BASE_URL}${protectedPath}`;

      if (Platform.OS === "web") {
        const response = await fetch(remoteUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "*/*",
          },
        });

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }

        const blob = await response.blob();
        const objectUrl =
          URL.createObjectURL(blob);

        const browserGlobal =
          globalThis as typeof globalThis & {
            open?: (
              url?: string,
              target?: string,
            ) => unknown;
          };

        browserGlobal.open?.(
          objectUrl,
          "_blank",
        );

        setTimeout(
          () => URL.revokeObjectURL(objectUrl),
          60_000,
        );

        return;
      }

      if (!FileSystem.cacheDirectory) {
        throw new Error(
          "Stockage temporaire indisponible.",
        );
      }

      const localUri =
        `${FileSystem.cacheDirectory}${safeDocumentName(
          resource,
        )}`;

      const result =
        await FileSystem.downloadAsync(
          remoteUrl,
          localUri,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "*/*",
            },
          },
        );

      if (
        result.status < 200 ||
        result.status >= 300
      ) {
        throw new Error(`HTTP ${result.status}`);
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType:
            resource.mimeType || undefined,
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

  if (loading) {
    return (
      <LoadingState message="Préparation de la prévisualisation..." />
    );
  }

  if (!training) {
    return (
      <ScreenContainer>
        <ErrorMessage
          message={
            error || "Formation indisponible."
          }
          onRetry={onBack}
        />
      </ScreenContainer>
    );
  }

  const coverVisible = isAbsoluteHttpUrl(
    training.coverImageUrl,
  );

  const summary =
    training.shortDescription ||
    training.description ||
    "";

  const level = levelLabel(training.level);
  const language = languageLabel(training.language);

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{
        padding: 0,
        backgroundColor: "#F8F6F3",
      }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: 36,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[820px] px-4">
          {/* PREVIEW CONTROL BAR */}
          <View
            className="mt-3 flex-row items-center rounded-[14px] border bg-white px-3 py-2"
            style={{
              borderColor: "#E8E2EB",
            }}
          >
            <View
              className="h-7 w-7 items-center justify-center rounded-[9px]"
              style={{
                backgroundColor: "#F1EBFF",
              }}
            >
              <SymbolView
                name={{
                  ios: "eye.fill",
                  android: "visibility",
                  web: "visibility",
                }}
                tintColor="#7C3AED"
                size={13}
                weight="bold"
              />
            </View>

            <View className="ml-2.5 min-w-0 flex-1">
              <Text
                className="text-[12px] font-black"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                Aperçu côté apprenant
              </Text>

              <Text
                className="mt-0.5 text-[10px]"
                style={{
                  color: theme.colors.foregroundMuted,
                }}
              >
                Lecture seule
              </Text>
            </View>

            <View
              className="rounded-full px-2.5 py-1"
              style={{
                backgroundColor:
                  training.status === "PUBLISHED"
                    ? "#EAFBF3"
                    : training.status === "ARCHIVED"
                      ? "#F2F4F7"
                      : "#FFF4E5",
              }}
            >
              <Text
                className="text-[10px] font-black"
                style={{
                  color:
                    training.status === "PUBLISHED"
                      ? "#16845A"
                      : training.status === "ARCHIVED"
                        ? "#667085"
                        : "#D97706",
                }}
              >
                {statusLabel(training.status)}
              </Text>
            </View>
          </View>

          {/* COVER OR FALLBACK SUMMARY */}
          {coverVisible ? (
            <>
              <View
                className="mt-3 overflow-hidden rounded-[22px] border bg-white"
                style={{
                  borderColor: "#E2DCE6",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.04,
                  shadowRadius: 8,
                  elevation: 1,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    aspectRatio: 16 / 9,
                    backgroundColor: "#0F172A",
                  }}
                >
                  <Image
                    source={{
                      uri: training.coverImageUrl,
                    }}
                    resizeMode="contain"
                    style={{
                      width: "100%",
                      height: "100%",
                    }}
                  />
                </View>
              </View>

              {(training.category ||
                level ||
                language ||
                training.estimatedDurationHours) ? (
                <View
                  className="mt-2.5 rounded-[16px] border bg-white p-2"
                  style={{
                    borderColor: "#E8E2EB",
                  }}
                >
                  <View className="flex-row gap-2">
                    {training.category ? (
                      <InfoTile
                        icon={{
                          ios: "tag.fill",
                          android: "category",
                          web: "category",
                        }}
                        text={training.category}
                      />
                    ) : (
                      <View className="flex-1" />
                    )}

                    {level ? (
                      <InfoTile
                        icon={{
                          ios: "chart.bar.fill",
                          android: "bar_chart",
                          web: "bar_chart",
                        }}
                        text={level}
                      />
                    ) : (
                      <View className="flex-1" />
                    )}
                  </View>

                  {(language || training.estimatedDurationHours) ? (
                    <View className="mt-2 flex-row gap-2">
                      {language ? (
                        <InfoTile
                          icon={{
                            ios: "globe",
                            android: "language",
                            web: "language",
                          }}
                          text={language}
                        />
                      ) : (
                        <View className="flex-1" />
                      )}

                      {training.estimatedDurationHours ? (
                        <InfoTile
                          icon={{
                            ios: "clock.fill",
                            android: "schedule",
                            web: "schedule",
                          }}
                          text={`${training.estimatedDurationHours} h`}
                        />
                      ) : (
                        <View className="flex-1" />
                      )}
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : (
            <View
              className="mt-3 rounded-[20px] border bg-white p-4"
              style={cardStyle}
            >
              <View className="flex-row items-start">
                <View
                  className="h-10 w-10 items-center justify-center rounded-[12px]"
                  style={{ backgroundColor: "#F1EBFF" }}
                >
                  <SymbolView
                    name={{
                      ios: "graduationcap.fill",
                      android: "school",
                      web: "school",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    className="text-[11px] font-black uppercase tracking-[0.7px]"
                    style={{ color: "#7C3AED" }}
                  >
                    Formation
                  </Text>

                  <Text
                    className="mt-1 text-[20px] font-black leading-[24px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    {training.title}
                  </Text>

                  {summary ? (
                    <Text
                      className="mt-1.5 text-[12px] leading-[15px]"
                      style={{
                        color: theme.colors.foregroundMuted,
                      }}
                    >
                      {summary}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-2">
                {training.category ? (
                  <InfoTile
                    icon={{
                      ios: "tag.fill",
                      android: "category",
                      web: "category",
                    }}
                    text={training.category}
                  />
                ) : null}

                {level ? (
                  <InfoTile
                    icon={{
                      ios: "chart.bar.fill",
                      android: "bar_chart",
                      web: "bar_chart",
                    }}
                    text={level}
                  />
                ) : null}

                {language ? (
                  <InfoTile
                    icon={{
                      ios: "globe",
                      android: "language",
                      web: "language",
                    }}
                    text={language}
                  />
                ) : null}

                {training.estimatedDurationHours ? (
                  <InfoTile
                    icon={{
                      ios: "clock.fill",
                      android: "schedule",
                      web: "schedule",
                    }}
                    text={`${training.estimatedDurationHours} h`}
                  />
                ) : null}
              </View>
            </View>
          )}

          {/* REAL STATS */}
          <View
            className="mt-3 flex-row rounded-[18px] border bg-white px-2 py-3"
            style={cardStyle}
          >
            <SummaryMetric
              icon={{
                ios: "rectangle.stack.fill",
                android: "view_module",
                web: "view_module",
              }}
              value={modules.length}
              label="Modules"
              soft="#F1EBFF"
              color="#7C3AED"
            />

            <MetricDivider />

            <SummaryMetric
              icon={{
                ios: "doc.text.fill",
                android: "description",
                web: "description",
              }}
              value={totalLessons}
              label="Leçons"
              soft="#EAF3FF"
              color="#2563EB"
            />

            <MetricDivider />

            <SummaryMetric
              icon={{
                ios: "paperclip",
                android: "attach_file",
                web: "attach_file",
              }}
              value={totalResources}
              label="Ressources"
              soft="#EAFBF3"
              color="#059669"
            />
          </View>

          {error ? (
            <View className="mt-4">
              <ErrorMessage
                message={error}
                onRetry={() => setError("")}
              />
            </View>
          ) : null}

          {/* PEDAGOGICAL INFO */}
          {training.objectives ||
          training.prerequisites ||
          training.targetAudience ? (
            <>
              <SectionHeading
                icon={{
                  ios: "scope",
                  android: "track_changes",
                  web: "track_changes",
                }}
                title="À propos de la formation"
                subtitle="Informations visibles avant le parcours"
              />

              <View
                className="overflow-hidden rounded-[20px] border bg-white"
                style={cardStyle}
              >
                {training.objectives ? (
                  <InfoRow
                    icon={{
                      ios: "target",
                      android: "track_changes",
                      web: "track_changes",
                    }}
                    title="Objectifs"
                    text={training.objectives}
                    soft="#F1EBFF"
                    color="#7C3AED"
                  />
                ) : null}

                {training.prerequisites ? (
                  <InfoRow
                    icon={{
                      ios: "checklist",
                      android: "checklist",
                      web: "checklist",
                    }}
                    title="Prérequis"
                    text={training.prerequisites}
                    soft="#EAF3FF"
                    color="#2563EB"
                  />
                ) : null}

                {training.targetAudience ? (
                  <InfoRow
                    icon={{
                      ios: "person.2.fill",
                      android: "groups",
                      web: "groups",
                    }}
                    title="Public cible"
                    text={training.targetAudience}
                    soft="#EAFBF3"
                    color="#059669"
                    last
                  />
                ) : null}
              </View>
            </>
          ) : null}

          {/* COURSE */}
          <SectionHeading
            icon={{
              ios: "books.vertical.fill",
              android: "menu_book",
              web: "menu_book",
            }}
            title="Programme"
            subtitle={`${modules.length} module${
              modules.length > 1 ? "s" : ""
            } · ${totalLessons} leçon${
              totalLessons > 1 ? "s" : ""
            }`}
          />

          {modules.length === 0 ? (
            <View
              className="items-center rounded-[22px] border bg-white px-5 py-8"
              style={cardStyle}
            >
              <View
                className="h-[60px] w-[60px] items-center justify-center rounded-full"
                style={{
                  backgroundColor: "#F1EBFF",
                }}
              >
                <SymbolView
                  name={{
                    ios: "rectangle.stack.badge.minus",
                    android: "view_module",
                    web: "view_module",
                  }}
                  tintColor="#7C3AED"
                  size={23}
                  weight="bold"
                />
              </View>

              <Text
                className="mt-4 text-[18px] font-black"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                Aucun contenu
              </Text>

              <Text
                className="mt-1.5 text-center text-[12px] leading-[15px]"
                style={{
                  color:
                    theme.colors.foregroundMuted,
                }}
              >
                Cette formation ne contient encore aucun module.
              </Text>
            </View>
          ) : (
            modules.map((module, moduleIndex) => {
              const lessons =
                sortedLessons(module);
              const isModuleExpanded =
                expandedModules.has(module.id);

              const moduleResources =
                lessons.reduce(
                  (total, lesson) =>
                    total +
                    sortedResources(lesson).length,
                  0,
                );

              return (
                <View
                  key={module.id}
                  className="mb-3 overflow-hidden rounded-[20px] border bg-white"
                  style={cardStyle}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${
                      isModuleExpanded
                        ? "Réduire"
                        : "Développer"
                    } le module ${module.title}`}
                    onPress={() =>
                      setExpandedModules(
                        (current) =>
                          toggleSet(
                            current,
                            module.id,
                          ),
                      )
                    }
                    android_ripple={{
                      color: "transparent",
                    }}
                    className="flex-row items-center px-3.5 py-3.5"
                  >
                    <View
                      className="h-11 w-11 items-center justify-center rounded-[13px]"
                      style={{
                        backgroundColor: "#F1EBFF",
                      }}
                    >
                      <Text
                        className="text-[16px] font-black"
                        style={{
                          color: "#7C3AED",
                        }}
                      >
                        {String(moduleIndex + 1).padStart(
                          2,
                          "0",
                        )}
                      </Text>
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-[11px] font-black uppercase tracking-[0.6px]"
                        style={{
                          color: "#7C3AED",
                        }}
                      >
                        Module {moduleIndex + 1}
                      </Text>

                      <Text
                        className="mt-0.5 text-[17px] font-black leading-[20px]"
                        style={{
                          color:
                            theme.colors.foreground,
                        }}
                      >
                        {module.title}
                      </Text>

                      <View className="mt-2 flex-row flex-wrap gap-3">
                        <MiniMeta
                          icon={{
                            ios: "doc.text.fill",
                            android: "description",
                            web: "description",
                          }}
                          text={`${lessons.length} leçon${
                            lessons.length > 1
                              ? "s"
                              : ""
                          }`}
                        />

                        <MiniMeta
                          icon={{
                            ios: "paperclip",
                            android: "attach_file",
                            web: "attach_file",
                          }}
                          text={`${moduleResources} ressource${
                            moduleResources > 1
                              ? "s"
                              : ""
                          }`}
                        />
                      </View>
                    </View>

                    <View
                      className="ml-2 h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: "#F8F6FA",
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: isModuleExpanded
                            ? "chevron.up"
                            : "chevron.down",
                          android: isModuleExpanded
                            ? "expand_less"
                            : "expand_more",
                          web: isModuleExpanded
                            ? "expand_less"
                            : "expand_more",
                        }}
                        tintColor={
                          theme.colors
                            .foregroundMuted
                        }
                        size={15}
                        weight="bold"
                      />
                    </View>
                  </Pressable>

                  {isModuleExpanded ? (
                    <View
                      className="border-t px-3 pb-3 pt-2.5"
                      style={{
                        borderTopColor: "#EEE9F0",
                        backgroundColor: "#FBFAFC",
                      }}
                    >
                      {module.description ? (
                        <Text
                          className="mb-2.5 px-1 text-[12px] leading-[15px]"
                          style={{
                            color:
                              theme.colors
                                .foregroundMuted,
                          }}
                        >
                          {module.description}
                        </Text>
                      ) : null}

                      {lessons.length === 0 ? (
                        <View className="rounded-[14px] bg-white px-3 py-4">
                          <Text
                            className="text-center text-[12px]"
                            style={{
                              color:
                                theme.colors
                                  .foregroundSubtle,
                            }}
                          >
                            Aucune leçon dans ce module.
                          </Text>
                        </View>
                      ) : (
                        lessons.map(
                          (
                            lesson,
                            lessonIndex,
                          ) => {
                            const resources =
                              sortedResources(
                                lesson,
                              );
                            const isLessonExpanded =
                              expandedLessons.has(
                                lesson.id,
                              );

                            return (
                              <View
                                key={lesson.id}
                                className="mb-2.5 overflow-hidden rounded-[16px] border bg-white"
                                style={{
                                  borderColor:
                                    "#E6E1E8",
                                }}
                              >
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityLabel={`${
                                    isLessonExpanded
                                      ? "Réduire"
                                      : "Développer"
                                  } la leçon ${lesson.title}`}
                                  onPress={() =>
                                    setExpandedLessons(
                                      (current) =>
                                        toggleSet(
                                          current,
                                          lesson.id,
                                        ),
                                    )
                                  }
                                  android_ripple={{
                                    color:
                                      "transparent",
                                  }}
                                  className="flex-row items-center px-3 py-3"
                                >
                                  <View
                                    className="h-9 w-9 items-center justify-center rounded-[11px]"
                                    style={{
                                      backgroundColor:
                                        "#EEF2FF",
                                    }}
                                  >
                                    <Text
                                      className="text-[13px] font-black"
                                      style={{
                                        color:
                                          "#4F46E5",
                                      }}
                                    >
                                      {lessonIndex + 1}
                                    </Text>
                                  </View>

                                  <View className="ml-2.5 min-w-0 flex-1">
                                    <Text
                                      className="text-[15px] font-black leading-[18px]"
                                      style={{
                                        color:
                                          theme.colors
                                            .foreground,
                                      }}
                                    >
                                      {lesson.title}
                                    </Text>

                                    <View className="mt-1.5 flex-row flex-wrap gap-3">
                                      {lesson.estimatedDurationMinutes &&
                                      lesson.estimatedDurationMinutes >
                                        0 ? (
                                        <MiniMeta
                                          icon={{
                                            ios: "clock.fill",
                                            android:
                                              "schedule",
                                            web: "schedule",
                                          }}
                                          text={`${lesson.estimatedDurationMinutes} min`}
                                        />
                                      ) : null}

                                      <MiniMeta
                                        icon={{
                                          ios:
                                            lesson.required ===
                                            false
                                              ? "circle"
                                              : "checkmark.circle.fill",
                                          android:
                                            lesson.required ===
                                            false
                                              ? "radio_button_unchecked"
                                              : "check_circle",
                                          web:
                                            lesson.required ===
                                            false
                                              ? "radio_button_unchecked"
                                              : "check_circle",
                                        }}
                                        text={
                                          lesson.required ===
                                          false
                                            ? "Optionnelle"
                                            : "Obligatoire"
                                        }
                                      />

                                      <MiniMeta
                                        icon={{
                                          ios: "paperclip",
                                          android:
                                            "attach_file",
                                          web: "attach_file",
                                        }}
                                        text={`${resources.length} ressource${
                                          resources.length >
                                          1
                                            ? "s"
                                            : ""
                                        }`}
                                      />
                                    </View>
                                  </View>

                                  <SymbolView
                                    name={{
                                      ios:
                                        isLessonExpanded
                                          ? "chevron.up"
                                          : "chevron.down",
                                      android:
                                        isLessonExpanded
                                          ? "expand_less"
                                          : "expand_more",
                                      web:
                                        isLessonExpanded
                                          ? "expand_less"
                                          : "expand_more",
                                    }}
                                    tintColor={
                                      theme.colors
                                        .foregroundSubtle
                                    }
                                    size={14}
                                    weight="bold"
                                  />
                                </Pressable>

                                {isLessonExpanded ? (
                                  <View
                                    className="border-t px-3 pb-3 pt-3"
                                    style={{
                                      borderTopColor:
                                        "#F0EBF2",
                                    }}
                                  >
                                    {lesson.objective ? (
                                      <View
                                        className="rounded-[13px] px-3 py-2.5"
                                        style={{
                                          backgroundColor:
                                            "#F7F3FF",
                                        }}
                                      >
                                        <Text
                                          className="text-[11px] font-black uppercase tracking-[0.5px]"
                                          style={{
                                            color:
                                              "#7C3AED",
                                          }}
                                        >
                                          Objectif
                                        </Text>

                                        <Text
                                          className="mt-1 text-[12px] leading-[15px]"
                                          style={{
                                            color:
                                              theme.colors
                                                .foregroundMuted,
                                          }}
                                        >
                                          {
                                            lesson.objective
                                          }
                                        </Text>
                                      </View>
                                    ) : null}

                                    {lesson.content ? (
                                      <Text
                                        className="mt-3 text-[13px] leading-[18px]"
                                        style={{
                                          color:
                                            theme.colors
                                              .foreground,
                                        }}
                                      >
                                        {lesson.content}
                                      </Text>
                                    ) : null}

                                    <View className="mt-4">
                                      <View className="mb-2.5 flex-row items-center">
                                        <Text
                                          className="flex-1 text-[13px] font-black"
                                          style={{
                                            color:
                                              theme.colors
                                                .foreground,
                                          }}
                                        >
                                          Ressources
                                        </Text>

                                        <View
                                          className="rounded-full px-2 py-1"
                                          style={{
                                            backgroundColor:
                                              "#F1EBFF",
                                          }}
                                        >
                                          <Text
                                            className="text-[10px] font-black"
                                            style={{
                                              color:
                                                "#7C3AED",
                                            }}
                                          >
                                            {
                                              resources.length
                                            }
                                          </Text>
                                        </View>
                                      </View>

                                      {resources.length ===
                                      0 ? (
                                        <View
                                          className="rounded-[13px] px-3 py-3"
                                          style={{
                                            backgroundColor:
                                              "#F8F6F3",
                                          }}
                                        >
                                          <Text
                                            className="text-center text-[11px]"
                                            style={{
                                              color:
                                                theme.colors
                                                  .foregroundSubtle,
                                            }}
                                          >
                                            Aucune ressource.
                                          </Text>
                                        </View>
                                      ) : (
                                        resources.map(
                                          (
                                            resource,
                                          ) => (
                                            <ResourcePreview
                                              key={
                                                resource.id
                                              }
                                              resource={
                                                resource
                                              }
                                            />
                                          ),
                                        )
                                      )}
                                    </View>
                                  </View>
                                ) : null}
                              </View>
                            );
                          },
                        )
                      )}
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function InfoTile({
    icon,
    text,
  }: {
    icon: SymbolName;
    text: string;
  }) {
    return (
      <View
        className="min-h-[42px] min-w-0 flex-1 flex-row items-center rounded-[12px] px-2.5 py-2"
        style={{
          backgroundColor: "#F8F5FB",
        }}
      >
        <View
          className="h-7 w-7 items-center justify-center rounded-[9px]"
          style={{
            backgroundColor: "#EFE7FF",
          }}
        >
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={12}
            weight="bold"
          />
        </View>

        <Text
          numberOfLines={2}
          className="ml-2 min-w-0 flex-1 text-[11px] font-black leading-[12px]"
          style={{
            color: theme.colors.foregroundMuted,
          }}
        >
          {text}
        </Text>
      </View>
    );
  }

  function SummaryMetric({
    icon,
    value,
    label,
    soft,
    color,
  }: {
    icon: SymbolName;
    value: number;
    label: string;
    soft: string;
    color: string;
  }) {
    return (
      <View className="flex-1 items-center">
        <View
          className="h-8 w-8 items-center justify-center rounded-[10px]"
          style={{
            backgroundColor: soft,
          }}
        >
          <SymbolView
            name={icon}
            tintColor={color}
            size={14}
            weight="bold"
          />
        </View>

        <Text
          className="mt-1.5 text-[16px] font-black"
          style={{
            color: theme.colors.foreground,
          }}
        >
          {value}
        </Text>

        <Text
          className="mt-0.5 text-[11px]"
          style={{
            color:
              theme.colors.foregroundMuted,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function MetricDivider() {
    return (
      <View
        className="my-1 w-px"
        style={{
          backgroundColor: "#E8ECF1",
        }}
      />
    );
  }

  function SectionHeading({
    icon,
    title,
    subtitle,
  }: {
    icon: SymbolName;
    title: string;
    subtitle: string;
  }) {
    return (
      <View className="mb-3 mt-6 flex-row items-center">
        <View
          className="h-10 w-10 items-center justify-center rounded-[12px]"
          style={{
            backgroundColor: "#F1EBFF",
          }}
        >
          <SymbolView
            name={icon}
            tintColor="#7C3AED"
            size={17}
            weight="bold"
          />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[19px] font-black"
            style={{
              color: theme.colors.foreground,
            }}
          >
            {title}
          </Text>

          <Text
            className="mt-0.5 text-[11px] leading-[13px]"
            style={{
              color:
                theme.colors.foregroundMuted,
            }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }

  function InfoRow({
    icon,
    title,
    text,
    soft,
    color,
    last = false,
  }: {
    icon: SymbolName;
    title: string;
    text: string;
    soft: string;
    color: string;
    last?: boolean;
  }) {
    return (
      <View
        className={[
          "flex-row items-start p-3.5",
          last ? "" : "border-b",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          borderBottomColor: "#EEE9F0",
        }}
      >
        <View
          className="h-10 w-10 items-center justify-center rounded-[12px]"
          style={{
            backgroundColor: soft,
          }}
        >
          <SymbolView
            name={icon}
            tintColor={color}
            size={16}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text
            className="text-[14px] font-black"
            style={{
              color: theme.colors.foreground,
            }}
          >
            {title}
          </Text>

          <Text
            className="mt-1 text-[12px] leading-[16px]"
            style={{
              color:
                theme.colors.foregroundMuted,
            }}
          >
            {text}
          </Text>
        </View>
      </View>
    );
  }

  function MiniMeta({
    icon,
    text,
  }: {
    icon: SymbolName;
    text: string;
  }) {
    return (
      <View className="flex-row items-center">
        <SymbolView
          name={icon}
          tintColor={
            theme.colors.foregroundSubtle
          }
          size={11}
        />

        <Text
          className="ml-1 text-[11px] font-bold"
          style={{
            color:
              theme.colors.foregroundMuted,
          }}
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
    const visual =
      resourceVisual(resource.type);

    const isImage =
      resource.type === "IMAGE";
    const isVideo =
      resource.type === "VIDEO" ||
      resource.type === "VIDEO_URL";
    const isPdf =
      resource.type === "PDF" ||
      resource.type === "PDF_URL";

    const canInlinePreview =
      (isImage || isVideo) && Boolean(rawUrl);

    const isMediaExpanded =
      expandedMedia.has(resource.id);

    const inlineMediaResource =
      resource as unknown as LearnerTrainingResource;

    const canOpenFile =
      isPdf ||
      resource.type === "DOCUMENT";

    const canOpenLink =
      resource.type === "EXTERNAL_LINK" &&
      Boolean(url);

    const canOpenScorm =
      resource.type === "SCORM";

    return (
      <View
        className="mb-2.5 overflow-hidden rounded-[14px] border bg-white"
        style={{
          borderColor: "#E7E2EA",
        }}
      >
        <View className="flex-row items-start p-3">
          <View
            className="h-9 w-9 items-center justify-center rounded-[11px]"
            style={{
              backgroundColor: visual.soft,
            }}
          >
            <SymbolView
              name={visual.icon}
              tintColor={visual.color}
              size={15}
              weight="bold"
            />
          </View>

          <View className="ml-2.5 min-w-0 flex-1">
            <View className="flex-row items-start">
              <Text
                className="flex-1 text-[13px] font-black leading-[15px]"
                style={{
                  color: theme.colors.foreground,
                }}
              >
                {resource.title}
              </Text>

              <View
                className="ml-2 rounded-full px-2 py-1"
                style={{
                  backgroundColor: visual.soft,
                }}
              >
                <Text
                  className="text-[10px] font-black"
                  style={{
                    color: visual.color,
                  }}
                >
                  {typeLabel(resource.type)}
                </Text>
              </View>
            </View>

            {resource.description ? (
              <Text
                className="mt-1.5 text-[11px] leading-[14px]"
                style={{
                  color:
                    theme.colors
                      .foregroundMuted,
                }}
              >
                {resource.description}
              </Text>
            ) : null}

            {resource.originalFileName ? (
              <Text
                numberOfLines={1}
                className="mt-1.5 text-[10px]"
                style={{
                  color:
                    theme.colors
                      .foregroundSubtle,
                }}
              >
                {resource.originalFileName}
                {resource.fileSize
                  ? ` · ${formatSize(
                      resource.fileSize,
                    )}`
                  : ""}
              </Text>
            ) : null}

            {resource.type === "SCORM" ? (
              <Text
                className="mt-1.5 text-[10px]"
                style={{
                  color:
                    theme.colors
                      .foregroundSubtle,
                }}
              >
                Package SCORM
                {resource.scormPackageId
                  ? ` #${resource.scormPackageId}`
                  : ""}
              </Text>
            ) : null}
          </View>
        </View>

        {resource.type === "TEXT" &&
        resource.textContent ? (
          <View
            className="mx-3 mb-3 rounded-[12px] px-3 py-2.5"
            style={{
              backgroundColor: "#F8F6F3",
            }}
          >
            <Text
              className="text-[12px] leading-[16px]"
              style={{
                color: theme.colors.foreground,
              }}
            >
              {resource.textContent}
            </Text>
          </View>
        ) : null}

        {canInlinePreview ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                isMediaExpanded
                  ? "Masquer l’aperçu"
                  : "Afficher l’aperçu"
              }
              onPress={() =>
                setExpandedMedia((current) =>
                  toggleSet(
                    current,
                    resource.id,
                  ),
                )
              }
              android_ripple={{
                color: "transparent",
              }}
              className="mx-3 mb-3 flex-row items-center justify-center rounded-[12px] px-3 py-2.5"
              style={{
                backgroundColor: visual.soft,
              }}
            >
              <SymbolView
                name={{
                  ios: isMediaExpanded
                    ? "chevron.up"
                    : "play.fill",
                  android: isMediaExpanded
                    ? "expand_less"
                    : "play_arrow",
                  web: isMediaExpanded
                    ? "expand_less"
                    : "play_arrow",
                }}
                tintColor={visual.color}
                size={12}
                weight="bold"
              />

              <Text
                className="ml-2 text-[11px] font-black"
                style={{
                  color: visual.color,
                }}
              >
                {isMediaExpanded
                  ? "Masquer l’aperçu"
                  : isVideo
                    ? "Lire la vidéo"
                    : "Afficher l’image"}
              </Text>
            </Pressable>

            {isMediaExpanded ? (
              <View
                className="mx-3 mb-3 overflow-hidden rounded-[12px]"
                style={{
                  maxHeight: 390,
                }}
              >
                <LearnerInlineMedia
                  resource={inlineMediaResource}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {canOpenFile ||
        canOpenLink ||
        canOpenScorm ? (
          <View
            className="border-t px-3 py-2.5"
            style={{
              borderTopColor: "#F0EBF2",
              backgroundColor: "#FCFBFD",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                canOpenScorm
                  ? "Ouvrir le SCORM"
                  : canOpenLink
                    ? "Ouvrir le lien"
                    : isPdf
                      ? "Ouvrir le PDF"
                      : "Ouvrir le document"
              }
              onPress={() => {
                if (canOpenScorm) {
                  router.push(
                    `/scorm/${resource.id}?mode=author` as Href,
                  );
                  return;
                }

                if (canOpenLink && url) {
                  void openUrl(url);
                  return;
                }

                if (canOpenFile) {
                  void openDocument(resource);
                }
              }}
              android_ripple={{
                color: "transparent",
              }}
              className="flex-row items-center justify-between rounded-[11px] px-2 py-2"
            >
              <View className="flex-row items-center">
                <SymbolView
                  name={{
                    ios: canOpenLink
                      ? "arrow.up.right"
                      : "arrow.up.doc.fill",
                    android: "open_in_new",
                    web: "open_in_new",
                  }}
                  tintColor="#7C3AED"
                  size={12}
                  weight="bold"
                />

                <Text
                  className="ml-2 text-[11px] font-black"
                  style={{
                    color: "#7C3AED",
                  }}
                >
                  {canOpenScorm
                    ? "Ouvrir le SCORM"
                    : canOpenLink
                      ? "Ouvrir le lien"
                      : isPdf
                        ? "Ouvrir le PDF"
                        : "Ouvrir le document"}
                </Text>
              </View>

              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                tintColor="#A78BFA"
                size={13}
                weight="bold"
              />
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }
}

const cardStyle = {
  borderColor: "#E2DCE6",
  shadowColor: "#0F172A",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 1,
} as const;

const styles = StyleSheet.create({});
