import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
} from "react-native";

import AppButton from "../AppButton";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  TrainerTrainingListItem,
} from "../../types/trainerMobile";

type Props = {
  item: TrainerTrainingListItem;
  onOpen: () => void;
  onEdit?: () => void;
};

function statusLabel(
  value?: string | null,
): string {
  if (value === "PUBLISHED") {
    return "Publiée";
  }

  if (value === "DRAFT") {
    return "Brouillon";
  }

  if (value === "ARCHIVED") {
    return "Archivée";
  }

  return value || "Non renseigné";
}

function levelLabel(
  value?: string | null,
): string {
  if (value === "DEBUTANT") {
    return "Débutant";
  }

  if (value === "INTERMEDIAIRE") {
    return "Intermédiaire";
  }

  if (value === "AVANCE") {
    return "Avancé";
  }

  return value || "Niveau non renseigné";
}

function statusAppearance(
  value?: string | null,
) {
  if (value === "PUBLISHED") {
    return {
      background: "#ECFDF3",
      foreground: "#027A48",
    };
  }

  if (value === "DRAFT") {
    return {
      background: "#FFF7ED",
      foreground: "#B54708",
    };
  }

  if (value === "ARCHIVED") {
    return {
      background: "#F2F4F7",
      foreground: "#475467",
    };
  }

  return {
    background: "#F3EEFF",
    foreground: "#7C3AED",
  };
}

export default function TrainerTrainingCard({
  item,
  onOpen,
  onEdit,
}: Props) {
  const { theme } =
    useSmartTrainingTheme();

  const { training, metrics } = item;

  const statusColors =
    statusAppearance(training.status);

  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(metrics.averageProgress || 0),
    ),
  );

  const resolvedCoverUrl =
    buildLearnerMediaUrl(
      training.coverImageUrl ||
        training.coverImagePath,
    );

  return (
    <View
      className="overflow-hidden rounded-[24px] border bg-white"
      style={{
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.06,
        shadowRadius: 10,
        elevation: 2,
      }}
    >
      {/* =====================================================
          COUVERTURE
          IMPORTANT :
          - pleine largeur
          - ratio 16:9 réel
          - aucune grande zone violette vide
          - contain pour afficher la totalité du visuel
      ===================================================== */}
      <View
        style={{
          width: "100%",
          aspectRatio: 16 / 9,
          backgroundColor: "#F5F3FF",
          overflow: "hidden",
        }}
      >
        {resolvedCoverUrl ? (
          <Image
            source={{
              uri: resolvedCoverUrl,
            }}
            accessibilityLabel={`Couverture de ${training.title}`}
            resizeMode="contain"
            style={{
              width: "100%",
              height: "100%",
            }}
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-[#F3EEFF]">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white">
              <SymbolView
                name={{
                  ios: "photo",
                  android: "image",
                  web: "image",
                }}
                tintColor={
                  theme.colors.accent
                }
                size={22}
              />
            </View>

            <Text
              className="mt-2 text-[11px] font-bold"
              style={{
                color:
                  theme.colors
                    .foregroundMuted,
              }}
            >
              Couverture à ajouter
            </Text>
          </View>
        )}

        {/* badge catégorie superposé */}
        <View className="absolute bottom-3 left-3 max-w-[70%] rounded-full bg-black/55 px-3 py-1.5">
          <Text
            numberOfLines={1}
            className="text-[9px] font-black uppercase tracking-[0.4px] text-white"
          >
            {training.category ||
              "Sans catégorie"}
          </Text>
        </View>
      </View>

      {/* =====================================================
          CONTENU
      ===================================================== */}
      <View className="p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View
            className="rounded-full px-2.5 py-1"
            style={{
              backgroundColor:
                statusColors.background,
            }}
          >
            <Text
              className="text-[9px] font-black uppercase tracking-[0.5px]"
              style={{
                color:
                  statusColors.foreground,
              }}
            >
              {statusLabel(
                training.status,
              )}
            </Text>
          </View>

          <View className="flex-row items-center gap-1.5">
            <MetaPill
              icon={{
                ios: "chart.bar.fill",
                android: "bar_chart",
                web: "bar_chart",
              }}
              label={levelLabel(
                training.level,
              )}
            />

            <MetaPill
              icon={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              label={
                training
                  .estimatedDurationHours
                  ? `${training.estimatedDurationHours} h`
                  : "Durée -"
              }
            />
          </View>
        </View>

        <Text
          numberOfLines={2}
          className="mt-3 text-[19px] font-black leading-[24px] tracking-[-0.4px]"
          style={{
            color:
              theme.colors.foreground,
          }}
        >
          {training.title}
        </Text>

        {training.shortDescription ? (
          <Text
            numberOfLines={2}
            className="mt-1.5 text-[13px] leading-[19px]"
            style={{
              color:
                theme.colors
                  .foregroundMuted,
            }}
          >
            {training.shortDescription}
          </Text>
        ) : null}

        {/* Progression */}
        <View className="mt-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text
              className="text-[12px] font-bold"
              style={{
                color:
                  theme.colors
                    .foregroundMuted,
              }}
            >
              Progression moyenne
            </Text>

            <Text
              className="text-[13px] font-black"
              style={{
                color:
                  theme.colors.accent,
              }}
            >
              {progress} %
            </Text>
          </View>

          <View className="h-2 overflow-hidden rounded-full bg-[#EEE9E4]">
            <View
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                backgroundColor:
                  theme.colors.accent,
              }}
            />
          </View>
        </View>

        {/* Métriques */}
        <View
          className="mt-4 flex-row rounded-2xl px-2 py-3"
          style={{
            backgroundColor:
              theme.colors.surfaceSoft,
          }}
        >
          <Metric
            icon={{
              ios: "person.2.fill",
              android: "group",
              web: "group",
            }}
            value={String(
              metrics.learners,
            )}
            label="Apprenants"
          />

          <MetricDivider />

          <Metric
            icon={{
              ios: "star.fill",
              android: "star",
              web: "star",
            }}
            value={
              typeof training
                .averageRating === "number"
                ? training.averageRating.toFixed(
                    1,
                  )
                : "-"
            }
            label="Note"
          />

          <MetricDivider />

          <Metric
            icon={{
              ios: "chart.line.uptrend.xyaxis",
              android: "trending_up",
              web: "trending_up",
            }}
            value={`${progress}%`}
            label="Progression"
          />
        </View>
      </View>

      {/* =====================================================
          ACTIONS
      ===================================================== */}
      <View
        className="flex-row items-center justify-between border-t px-4 py-3"
        style={{
          borderTopColor:
            theme.colors.border,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Ouvrir le suivi de ${training.title}`}
          onPress={onOpen}
          android_ripple={{
            color: "transparent",
          }}
          className="min-h-[42px] flex-1 flex-row items-center"
        >
          <View className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-[#F3EEFF]">
            <SymbolView
              name={{
                ios: "chart.bar.xaxis",
                android: "analytics",
                web: "analytics",
              }}
              tintColor={
                theme.colors.accent
              }
              size={17}
              weight="bold"
            />
          </View>

          <Text
            className="text-[12px] font-extrabold"
            style={{
              color:
                theme.colors.accent,
            }}
          >
            Ouvrir le suivi
          </Text>

          <Text
            className="ml-1 text-[18px] font-bold"
            style={{
              color:
                theme.colors.accent,
            }}
          >
            ›
          </Text>
        </Pressable>

        {onEdit ? (
          <AppButton
            title="Modifier"
            onPress={onEdit}
            variant="secondary"
            style={{
              minWidth: 100,
              minHeight: 40,
            }}
          />
        ) : null}
      </View>
    </View>
  );

  function MetaPill({
    icon,
    label,
  }: {
    icon: ComponentProps<
      typeof SymbolView
    >["name"];
    label: string;
  }) {
    return (
      <View className="flex-row items-center rounded-full bg-[#F8F6F3] px-2 py-1">
        <SymbolView
          name={icon}
          tintColor={
            theme.colors
              .foregroundSubtle
          }
          size={11}
        />

        <Text
          numberOfLines={1}
          className="ml-1 max-w-[68px] text-[9px] font-bold"
          style={{
            color:
              theme.colors
                .foregroundMuted,
          }}
        >
          {label}
        </Text>
      </View>
    );
  }

  function Metric({
    icon,
    value,
    label,
  }: {
    icon: ComponentProps<
      typeof SymbolView
    >["name"];
    value: string;
    label: string;
  }) {
    return (
      <View className="min-w-0 flex-1 items-center">
        <View className="flex-row items-center">
          <SymbolView
            name={icon}
            tintColor={
              theme.colors.accent
            }
            size={13}
          />

          <Text
            className="ml-1 text-[14px] font-black"
            style={{
              color:
                theme.colors
                  .foreground,
            }}
          >
            {value}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          className="mt-0.5 text-[8px] font-bold"
          style={{
            color:
              theme.colors
                .foregroundMuted,
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
        className="mx-1 w-px"
        style={{
          backgroundColor:
            theme.colors.border,
        }}
      />
    );
  }
}
