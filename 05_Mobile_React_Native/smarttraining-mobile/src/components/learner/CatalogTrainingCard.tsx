import { SymbolView } from "expo-symbols";
import { type ComponentProps } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { TrainingCover } from "../ux/RichPrimitives";
import {
  buildLearnerMediaUrl,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import {
  LearnerCatalogTraining,
  LearnerEnrollmentMode,
} from "../../types/learnerCatalog";

type CatalogTrainingCardProps = {
  training: LearnerCatalogTraining;
  enrolled: boolean;
  pendingRequest: boolean;
  busy: boolean;
  accessCode: string;
  accessMessage: string;
  onAccessCodeChange: (value: string) => void;
  onAccessMessageChange: (value: string) => void;
  onSelfEnroll: () => void;
  onAccessCodeEnroll: () => void;
  onRequestAccess: () => void;
  onOpenTraining: () => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];

function accessPresentation(
  mode?: string | null,
): {
  label: string;
  tint: string;
  background: string;
  icon: SymbolName;
} {
  if (mode === "SELF_ENROLLMENT") {
    return {
      label: "Inscription libre",
      tint: "#16A36A",
      background: "#ECFDF3",
      icon: {
        ios: "person.badge.plus",
        android: "person_add",
        web: "person_add",
      },
    };
  }

  if (mode === "ACCESS_CODE") {
    return {
      label: "Code d’accès",
      tint: "#7C3AED",
      background: "#F3EEFF",
      icon: {
        ios: "key.fill",
        android: "key",
        web: "key",
      },
    };
  }

  if (mode === "ASSIGNMENT_ONLY") {
    return {
      label: "Sur demande",
      tint: "#D97706",
      background: "#FFF7ED",
      icon: {
        ios: "hand.raised.fill",
        android: "front_hand",
        web: "front_hand",
      },
    };
  }

  if (mode === "INVITATION") {
    return {
      label: "Sur invitation",
      tint: "#2563EB",
      background: "#EFF6FF",
      icon: {
        ios: "envelope.fill",
        android: "mail",
        web: "mail",
      },
    };
  }

  return {
    label: "Accès encadré",
    tint: "#667085",
    background: "#F2F4F7",
    icon: {
      ios: "lock.fill",
      android: "lock",
      web: "lock",
    },
  };
}

function levelLabel(level?: string | null): string {
  if (level === "DEBUTANT") return "Débutant";
  if (level === "INTERMEDIAIRE") return "Intermédiaire";
  if (level === "AVANCE") return "Avancé";

  return level || "Niveau non indiqué";
}

function normalizedMode(
  mode?: string | null,
): LearnerEnrollmentMode | null {
  if (
    mode === "SELF_ENROLLMENT" ||
    mode === "ASSIGNMENT_ONLY" ||
    mode === "ACCESS_CODE" ||
    mode === "INVITATION"
  ) {
    return mode;
  }

  return null;
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

function PrimaryAction({
  eyebrow,
  label,
  icon,
  loading,
  disabled = false,
  onPress,
  tone = "primary",
}: {
  eyebrow: string;
  label: string;
  icon: SymbolName;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  tone?: "primary" | "consult";
}) {
  const blocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: blocked,
      }}
      disabled={blocked}
      onPress={onPress}
      android_ripple={{ color: "transparent" }}
      className={`min-h-[52px] mt-[9px] rounded-[15px] border px-[7px] flex-row items-center ${(tone === "consult" ? "border-[#5B21B6] bg-[#5B21B6]" : "border-[#7C3AED] bg-[#7C3AED]")} ${(blocked ? "opacity-[0.5]" : "")}`}
    >
      <View className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center">
        {loading ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <SymbolView
            name={icon}
            tintColor="#FFFFFF"
            size={13}
            weight="bold"
          />
        )}
      </View>

      <View className="flex-1 min-w-[0px]">
        <Text
          numberOfLines={1}
          className="text-[rgba(255,255,255,0.78)] text-[9px] leading-[11px] font-black tracking-[0.45px]"
        >
          {eyebrow}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black"
        >
          {label}
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
    </Pressable>
  );
}

export default function CatalogTrainingCard({
  training,
  enrolled,
  pendingRequest,
  busy,
  accessCode,
  accessMessage,
  onAccessCodeChange,
  onAccessMessageChange,
  onSelfEnroll,
  onAccessCodeEnroll,
  onRequestAccess,
  onOpenTraining,
}: CatalogTrainingCardProps) {
  const { theme } = useSmartTrainingTheme();

  const mode = normalizedMode(
    training.enrollmentMode,
  );

  const access = accessPresentation(
    training.enrollmentMode,
  );

  const description =
    training.shortDescription ||
    training.description ||
    "Découvre le contenu et les objectifs de cette formation.";

  return (
    <View
      className="overflow-hidden rounded-[21px] border bg-[#FFFFFF]" style={[{ shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: {
      width: 0,
      height: 3,
    }, elevation: 1 }, {
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
        }]}
    >
      <View className="h-[104px] overflow-hidden bg-[#F4F1F6]">
        <TrainingCover
          title={training.title}
          coverUrl={buildLearnerMediaUrl(
            training.coverImageUrl,
          )}
        />

        <View
          className="absolute top-[9px] left-[9px] min-h-[27px] px-[8px] rounded-full flex-row items-center gap-[5px]" style={{ backgroundColor: access.background }}
        >
          <SymbolView
            name={access.icon}
            tintColor={access.tint}
            size={10}
            weight="bold"
          />

          <Text
            className="text-[12px] font-black" style={{ color: access.tint }}
          >
            {access.label}
          </Text>
        </View>

        {enrolled ? (
          <View className="absolute top-[9px] right-[9px] min-h-[27px] px-[8px] rounded-full bg-[#ECFDF3] flex-row items-center gap-[5px]">
            <SymbolView
              name={{
                ios: "checkmark.seal.fill",
                android: "verified",
                web: "verified",
              }}
              tintColor="#16A36A"
              size={10}
              weight="bold"
            />
            <Text className="text-[#16A36A] text-[12px] font-black">
              Inscrite
            </Text>
          </View>
        ) : pendingRequest ? (
          <View className="absolute top-[9px] right-[9px] min-h-[27px] px-[8px] rounded-full bg-[#FFF7ED] flex-row items-center gap-[5px]">
            <SymbolView
              name={{
                ios: "clock.fill",
                android: "schedule",
                web: "schedule",
              }}
              tintColor="#D97706"
              size={10}
              weight="bold"
            />
            <Text className="text-[#D97706] text-[12px] font-black">
              En attente
            </Text>
          </View>
        ) : null}
      </View>

      <View className="p-[11px]">
        <View className="flex-row items-start gap-[8px]">
          <View className="flex-1 min-w-[0px]">
            <Text
              numberOfLines={2}
              className="text-[16px] leading-[21px] font-black tracking-[-0.15px]" style={{ color: theme.colors.foreground }}
            >
              {training.title}
            </Text>

            <Text
              numberOfLines={2}
              className="mt-[3px] text-[12px] leading-[17px]" style={{
                  color:
                    theme.colors.foregroundMuted,
                }}
            >
              {description}
            </Text>
          </View>

          {training.category ? (
            <View className="max-w-[118px] min-h-[27px] px-[8px] rounded-full bg-[#F3EEFF] justify-center">
              <Text
                numberOfLines={1}
                className="text-[#7C3AED] text-[12px] font-black"
              >
                {training.category}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-[8px] flex-row flex-wrap gap-[6px]">
          <MetaPill
            icon={{
              ios: "chart.bar.fill",
              android: "bar_chart",
              web: "bar_chart",
            }}
            value={levelLabel(training.level)}
            tint="#7C3AED"
            background="#F3EEFF"
          />

          <MetaPill
            icon={{
              ios: "clock.fill",
              android: "schedule",
              web: "schedule",
            }}
            value={
              training.estimatedDurationHours
                ? `${training.estimatedDurationHours} h`
                : "Durée non indiquée"
            }
            tint="#2563EB"
            background="#EFF6FF"
          />

          {typeof training.averageRating === "number" &&
          training.averageRating > 0 ? (
            <MetaPill
              icon={{
                ios: "star.fill",
                android: "star",
                web: "star",
              }}
              value={`${training.averageRating.toFixed(1)} / 5`}
              tint="#D97706"
              background="#FFF7ED"
            />
          ) : null}
        </View>

        {enrolled ? (
          <View className="mt-[9px] rounded-[15px] border border-[#BBF7D0] bg-[#F0FDF4] p-[9px]">
            <View className="flex-row items-center">
              <View className="w-[34px] h-[34px] rounded-[11px] mr-[8px] bg-[#FFFFFF] items-center justify-center">
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor="#16A36A"
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="flex-1 min-w-[0px]">
                <Text className="text-[#15803D] text-[11px] font-black">
                  Inscription active
                </Text>
                <Text className="mt-[2px] text-[#667085] text-[10px] leading-[14px]">
                  Cette formation est déjà disponible dans ton espace.
                </Text>
              </View>
            </View>

            <PrimaryAction
              eyebrow="FORMATION DISPONIBLE"
              label="Consulter la formation"
              tone="consult"
              icon={{
                ios: "play.fill",
                android: "play_arrow",
                web: "play_arrow",
              }}
              onPress={onOpenTraining}
            />
          </View>
        ) : pendingRequest ? (
          <View className="mt-[9px] rounded-[15px] border border-[#FED7AA] bg-[#FFF7ED] p-[9px]">
            <View className="flex-row items-center">
              <View className="w-[34px] h-[34px] rounded-[11px] mr-[8px] bg-[#FFFFFF] items-center justify-center">
                <SymbolView
                  name={{
                    ios: "clock.fill",
                    android: "schedule",
                    web: "schedule",
                  }}
                  tintColor="#D97706"
                  size={15}
                  weight="bold"
                />
              </View>

              <View className="flex-1 min-w-[0px]">
                <Text className="text-[#B45309] text-[11px] font-black">
                  Demande en attente
                </Text>
                <Text className="mt-[2px] text-[#667085] text-[10px] leading-[14px]">
                  Ta demande a été transmise. L’accès sera disponible après décision.
                </Text>
              </View>
            </View>
          </View>
        ) : mode === "SELF_ENROLLMENT" ? (
          <View className="mt-[9px] rounded-[15px] border border-[#E5D9F5] bg-[#FAF7FF] p-[9px]">
            <Text className="text-[#4C1D95] text-[12px] font-black">
              Inscription immédiate
            </Text>
            <Text className="mt-[2px] text-[#667085] text-[11px] leading-[15px]">
              Cette formation est ouverte à l’inscription libre.
            </Text>

            <PrimaryAction
              eyebrow="INSCRIPTION"
              label="S’inscrire à la formation"
              icon={{
                ios: "person.badge.plus",
                android: "person_add",
                web: "person_add",
              }}
              loading={busy}
              onPress={onSelfEnroll}
            />
          </View>
        ) : mode === "ACCESS_CODE" ? (
          <View className="mt-[9px] rounded-[15px] border border-[#E5D9F5] bg-[#FAF7FF] p-[9px]">
            <Text className="text-[#4C1D95] text-[12px] font-black">
              Code d’accès requis
            </Text>
            <Text className="mt-[2px] text-[#667085] text-[11px] leading-[15px]">
              Saisis le code communiqué par ton formateur ou ton organisation.
            </Text>

            <View className="min-h-[44px] mt-[8px] rounded-[12px] border border-[#E5D9F5] bg-[#FFFFFF] px-[6px] flex-row items-center">
              <View className="w-[30px] h-[30px] rounded-[9px] bg-[#F3EEFF] items-center justify-center">
                <SymbolView
                  name={{
                    ios: "key.fill",
                    android: "key",
                    web: "key",
                  }}
                  tintColor="#7C3AED"
                  size={13}
                  weight="bold"
                />
              </View>

              <TextInput
                accessibilityLabel="Code d’accès"
                value={accessCode}
                onChangeText={onAccessCodeChange}
                placeholder="Code d’accès"
                placeholderTextColor={
                  theme.colors.foregroundSubtle
                }
                autoCorrect={false}
                autoCapitalize="none"
                className="flex-1 min-w-[0px] min-h-[42px] px-[8px] text-[12px]" style={{
                    color: theme.colors.foreground,
                  }}
              />
            </View>

            <PrimaryAction
              eyebrow="ACCÈS"
              label="Valider le code"
              icon={{
                ios: "checkmark.circle.fill",
                android: "check_circle",
                web: "check_circle",
              }}
              loading={busy}
              disabled={!accessCode.trim()}
              onPress={onAccessCodeEnroll}
            />
          </View>
        ) : mode === "ASSIGNMENT_ONLY" ? (
          <View className="mt-[9px] rounded-[15px] border border-[#E5D9F5] bg-[#FAF7FF] p-[9px]">
            <Text className="text-[#4C1D95] text-[12px] font-black">
              Demande d’accès
            </Text>
            <Text className="mt-[2px] text-[#667085] text-[11px] leading-[15px]">
              Cette formation nécessite l’accord d’un formateur ou d’un administrateur.
            </Text>

            <TextInput
              accessibilityLabel="Message facultatif pour la demande d’accès"
              value={accessMessage}
              onChangeText={onAccessMessageChange}
              placeholder="Message facultatif"
              placeholderTextColor={
                theme.colors.foregroundSubtle
              }
              multiline
              maxLength={500}
              textAlignVertical="top"
              className="min-h-[80px] max-h-[120px] mt-[8px] rounded-[12px] border border-[#E5D9F5] bg-[#FFFFFF] px-[10px] pt-[9px] text-[12px]" style={{
                  color: theme.colors.foreground,
                }}
            />

            <PrimaryAction
              eyebrow="DEMANDE D’ACCÈS"
              label="Envoyer la demande"
              icon={{
                ios: "paperplane.fill",
                android: "send",
                web: "send",
              }}
              loading={busy}
              onPress={onRequestAccess}
            />
          </View>
        ) : (
          <View className="mt-[9px] rounded-[15px] border border-[#E4E7EC] bg-[#F8F6F3] p-[9px]">
            <View className="flex-row items-center">
              <View className="w-[34px] h-[34px] rounded-[11px] mr-[8px] bg-[#FFFFFF] items-center justify-center">
                <SymbolView
                  name={
                    mode === "INVITATION"
                      ? {
                          ios: "envelope.fill",
                          android: "mail",
                          web: "mail",
                        }
                      : {
                          ios: "lock.fill",
                          android: "lock",
                          web: "lock",
                        }
                  }
                  tintColor="#667085"
                  size={14}
                  weight="bold"
                />
              </View>

              <View className="flex-1 min-w-[0px]">
                <Text className="text-[#475467] text-[11px] font-black">
                  {mode === "INVITATION"
                    ? "Accès sur invitation"
                    : "Accès encadré"}
                </Text>

                <Text className="mt-[2px] text-[#667085] text-[10px] leading-[14px]">
                  {mode === "INVITATION"
                    ? "L’inscription sera disponible lorsqu’une invitation t’aura été adressée."
                    : "Le mode d’accès ne permet pas une inscription directe depuis le catalogue."}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
