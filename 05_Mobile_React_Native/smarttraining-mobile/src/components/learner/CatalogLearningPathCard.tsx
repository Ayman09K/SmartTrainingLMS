import { SymbolView } from "expo-symbols";
import { type ComponentProps } from "react";
import {
  Pressable,
  Text,
  View,
} from "react-native";

import { TrainingCover } from "../ux/RichPrimitives";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearningPathCatalog } from "../../types/learningPath";

type Props = {
  path: LearningPathCatalog;
  onOpen: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function visibilityLabel(
  value?: string | null,
): string {
  if (value === "PUBLIC") return "Public";
  if (value === "ASSIGNED_ONLY") {
    return "Affecté uniquement";
  }
  if (value === "PRIVATE") return "Privé";

  return value || "Accès encadré";
}

function MetaPill({
  icon,
  value,
  tint,
  background,
}: {
  icon: SymbolName;
  value: string;
  tint: string;
  background: string;
}) {
  return (
    <View className="min-h-[29px] rounded-[10px] border border-[#EEE9F0] bg-[#FBFAFC] px-[6px] flex-row items-center">
      <View
        className="w-[22px] h-[22px] rounded-[7px] mr-[5px] items-center justify-center" style={{ backgroundColor: background }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={11}
          weight="bold"
        />
      </View>

      <Text
        numberOfLines={1}
        className="text-[#475467] text-[10px] font-extrabold"
      >
        {value}
      </Text>
    </View>
  );
}

export default function CatalogLearningPathCard({
  path,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const description =
    path.shortDescription ||
    path.description ||
    "Découvre les formations organisées dans ce parcours.";

  const coverUrl = buildLearnerMediaUrl(
    path.coverImageUrl ||
      path.coverImagePath,
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le parcours ${path.title}`}
      onPress={onOpen}
      android_ripple={{
        color: "transparent",
      }}
      className="overflow-hidden rounded-[21px] border bg-[#FFFFFF]" style={[{ shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: {
      width: 0,
      height: 3,
    }, elevation: 1 }, {
          borderColor: path.assignedToMe
            ? "#C4B5FD"
            : theme.colors.border,
          shadowColor: theme.colors.shadow,
        }]}
    >
      <View className="h-[98px] overflow-hidden bg-[#F7F4F9]">
        <TrainingCover
          title={path.title}
          coverUrl={coverUrl}
          resizeMode="contain"
        />

        <View className="absolute top-[9px] left-[9px] min-h-[27px] px-[8px] rounded-full bg-[rgba(255,255,255,0.95)] flex-row items-center gap-[5px]">
          <SymbolView
            name={{
              ios: "point.topleft.down.curvedto.point.bottomright.up",
              android: "route",
              web: "route",
            }}
            tintColor="#7C3AED"
            size={10}
            weight="bold"
          />
          <Text className="text-[#7C3AED] text-[11px] font-black">
            Parcours
          </Text>
        </View>

        <View
          className={`${(path.assignedToMe ? "absolute top-[9px] right-[9px] min-h-[27px] px-[8px] rounded-full bg-[#ECFDF3] flex-row items-center gap-[5px]" : "absolute top-[9px] right-[9px] min-h-[27px] px-[8px] rounded-full bg-[#EFF6FF] flex-row items-center gap-[5px]")}`}
        >
          <SymbolView
            name={
              path.assignedToMe
                ? {
                    ios: "checkmark.seal.fill",
                    android: "verified",
                    web: "verified",
                  }
                : {
                    ios: "sparkles",
                    android: "auto_awesome",
                    web: "auto_awesome",
                  }
            }
            tintColor={
              path.assignedToMe
                ? "#16A36A"
                : "#2563EB"
            }
            size={10}
            weight="bold"
          />

          <Text
            className={`${(path.assignedToMe ? "text-[#16A36A] text-[11px] font-black" : "text-[#2563EB] text-[11px] font-black")}`}
          >
            {path.assignedToMe
              ? "Affecté"
              : "À découvrir"}
          </Text>
        </View>
      </View>

      <View className="p-[11px]">
        <View className="flex-row items-start gap-[8px]">
          <Text
            numberOfLines={2}
            className="flex-1 min-w-[0px] text-[16px] leading-[21px] font-black" style={{ color: theme.colors.foreground }}
          >
            {path.title}
          </Text>

          <View className="min-h-[27px] max-w-[112px] px-[8px] rounded-full bg-[#F2F4F7] justify-center">
            <Text className="text-[#667085] text-[10px] font-extrabold">
              {visibilityLabel(path.visibility)}
            </Text>
          </View>
        </View>

        <Text
          numberOfLines={2}
          className="mt-[4px] text-[12px] leading-[17px]" style={{
              color:
                theme.colors.foregroundMuted,
            }}
        >
          {description}
        </Text>

        <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
          <MetaPill
            icon={{
              ios: "rectangle.stack.fill",
              android: "view_agenda",
              web: "view_agenda",
            }}
            value={`${path.totalTrainings} formation${
              path.totalTrainings > 1 ? "s" : ""
            }`}
            tint="#7C3AED"
            background="#F3EEFF"
          />

          <MetaPill
            icon={{
              ios: "checkmark.circle.fill",
              android: "check_circle",
              web: "check_circle",
            }}
            value={`${path.requiredTrainings} obligatoire${
              path.requiredTrainings > 1 ? "s" : ""
            }`}
            tint="#16A36A"
            background="#ECFDF3"
          />

          {path.optionalTrainings > 0 ? (
            <MetaPill
              icon={{
                ios: "plus.circle.fill",
                android: "add_circle",
                web: "add_circle",
              }}
              value={`${path.optionalTrainings} facultative${
                path.optionalTrainings > 1 ? "s" : ""
              }`}
              tint="#2563EB"
              background="#EFF6FF"
            />
          ) : null}

          {path.estimatedDurationHours > 0 ? (
            <MetaPill
              icon={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              value={`${path.estimatedDurationHours} h`}
              tint="#D97706"
              background="#FFF7ED"
            />
          ) : null}
        </View>

        <View
          className={`mt-[8px] min-h-[50px] rounded-[13px] border px-[8px] flex-row items-center ${(path.canStart ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[#BFDBFE] bg-[#EFF6FF]")}`}
        >
          <View
            className={`w-[32px] h-[32px] rounded-[10px] mr-[8px] items-center justify-center ${(path.canStart ? "bg-[#FFFFFF]" : "bg-[#FFFFFF]")}`}
          >
            <SymbolView
              name={
                path.canStart
                  ? {
                      ios: "play.circle.fill",
                      android: "play_circle",
                      web: "play_circle",
                    }
                  : {
                      ios: "eye.fill",
                      android: "visibility",
                      web: "visibility",
                    }
              }
              tintColor={
                path.canStart
                  ? "#16A36A"
                  : "#2563EB"
              }
              size={14}
              weight="bold"
            />
          </View>

          <View className="flex-1 min-w-[0px]">
            <Text
              className="text-[11px] font-black" style={{
                  color: path.canStart
                    ? "#15803D"
                    : "#1D4ED8",
                }}
            >
              {path.canStart
                ? "Prêt à démarrer"
                : "Consultable"}
            </Text>

            <Text className="mt-[2px] text-[#667085] text-[10px] leading-[14px]">
              {path.canStart
                ? "Ce parcours t’est affecté et peut être démarré."
                : "Tu peux découvrir son contenu. Une affectation est requise pour démarrer."}
            </Text>
          </View>
        </View>

        <View
          className={`mt-[9px] min-h-[52px] rounded-[15px] border px-[7px] flex-row items-center ${(path.canStart ? "border-[#7C3AED] bg-[#7C3AED]" : "border-[#5B21B6] bg-[#5B21B6]")}`}
        >
          <View className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center">
            <SymbolView
              name={
                path.canStart
                  ? {
                      ios: "play.fill",
                      android: "play_arrow",
                      web: "play_arrow",
                    }
                  : {
                      ios: "eye.fill",
                      android: "visibility",
                      web: "visibility",
                    }
              }
              tintColor="#FFFFFF"
              size={13}
              weight="bold"
            />
          </View>

          <View className="flex-1 min-w-[0px]">
            <Text className="text-[rgba(255,255,255,0.78)] text-[9px] leading-[11px] font-black tracking-[0.45px]">
              {path.canStart
                ? "PARCOURS DISPONIBLE"
                : "CONSULTATION"}
            </Text>

            <Text className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black">
              {path.canStart
                ? "Ouvrir le parcours"
                : "Consulter le parcours"}
            </Text>
          </View>

          <View className="w-[30px] h-[30px] rounded-[15px] bg-[rgba(255,255,255,0.16)] items-center justify-center">
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              tintColor="#FFFFFF"
              size={11}
              weight="bold"
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
