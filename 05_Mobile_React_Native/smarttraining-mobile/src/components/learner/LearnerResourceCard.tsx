import type { ComponentProps } from "react";
import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  View,
} from "react-native";

import LearnerInlineMedia from "./LearnerInlineMedia";
import {
  normalizeLearnerResourceType,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerTrainingResource,
} from "../../types/learnerTraining";
import { Text } from "../nativewindui/Text";

type Props = {
  resource: LearnerTrainingResource;
  busy: boolean;
  onOpen: () => void;
  onVideoCompleted: () => void;
  videoCompleted?: boolean;
};

type SymbolName =
  ComponentProps<typeof SymbolView>["name"];

function resourceLabel(type?: string | null): string {
  const normalized = normalizeLearnerResourceType(type);

  if (normalized === "TEXT") return "Texte";
  if (normalized === "IMAGE") return "Image";
  if (normalized === "VIDEO") return "Vidéo";
  if (normalized === "PDF") return "PDF";
  if (normalized === "DOCUMENT") return "Document";
  if (normalized === "EXTERNAL_LINK") return "Lien externe";
  if (normalized === "SCORM") return "Module SCORM";

  return "Ressource";
}

function durationLabel(seconds?: number | null): string {
  if (!seconds || seconds <= 0) {
    return "";
  }

  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function resourceIcon(
  type?: string | null,
): SymbolName {
  const normalized = normalizeLearnerResourceType(type);

  if (normalized === "IMAGE") {
    return {
      ios: "photo.fill",
      android: "image",
      web: "image",
    };
  }

  if (normalized === "VIDEO") {
    return {
      ios: "play.rectangle.fill",
      android: "play_circle",
      web: "play_circle",
    };
  }

  if (normalized === "PDF") {
    return {
      ios: "doc.richtext.fill",
      android: "picture_as_pdf",
      web: "picture_as_pdf",
    };
  }

  if (normalized === "SCORM") {
    return {
      ios: "cube.fill",
      android: "view_in_ar",
      web: "view_in_ar",
    };
  }

  if (
    normalized === "DOCUMENT" ||
    normalized === "EXTERNAL_LINK"
  ) {
    return {
      ios: "link",
      android: "link",
      web: "link",
    };
  }

  return {
    ios: "text.alignleft",
    android: "subject",
    web: "subject",
  };
}

export default function LearnerResourceCard({
  resource,
  busy,
  onOpen,
  onVideoCompleted,
  videoCompleted = false,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const type = normalizeLearnerResourceType(resource.type);
  const hasOpenableUrl = Boolean(
    resource.publicUrl || resource.url,
  );
  const duration = durationLabel(resource.durationSeconds);

  return (
    <View
      className="mt-[10px] overflow-hidden rounded-[18px] border bg-white p-[12px]"
      style={{
        borderColor: theme.colors.border,
      }}
    >
      <View className="flex-row items-start">
        <View className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-[#F3EEFF]">
          <SymbolView
            name={resourceIcon(resource.type)}
            tintColor="#7C3AED"
            size={17}
            weight="bold"
          />
        </View>

        <View className="ml-[10px] min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-[6px]">
            <View className="rounded-full bg-[#F3EEFF] px-[9px] py-[5px]">
              <Text className="text-[9px] font-black uppercase tracking-[0.45px] text-[#7C3AED]">
                {resourceLabel(resource.type)}
              </Text>
            </View>

            {duration ? (
              <View className="flex-row items-center rounded-full bg-[#F8F6F3] px-[8px] py-[5px]">
                <SymbolView
                  name={{
                    ios: "clock.fill",
                    android: "schedule",
                    web: "schedule",
                  }}
                  tintColor="#667085"
                  size={9}
                  weight="bold"
                />
                <Text
                  className="ml-[4px] text-[9px] font-black"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {duration}
                </Text>
              </View>
            ) : null}
          </View>

          <Text
            className="mt-[7px] text-[16px] font-black leading-[21px]"
            style={{ color: theme.colors.foreground }}
          >
            {resource.title}
          </Text>

          {resource.description ? (
            <Text
              className="mt-[4px] text-[12px] leading-[18px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {resource.description}
            </Text>
          ) : null}
        </View>
      </View>

      {type === "TEXT" && resource.textContent ? (
        <View
          className="mt-[11px] rounded-[14px] px-[11px] py-[10px]"
          style={{
            backgroundColor: theme.colors.surfaceSoft,
          }}
        >
          <Text
            className="text-[12px] leading-[19px]"
            style={{
              color: theme.colors.foregroundMuted,
            }}
          >
            {resource.textContent}
          </Text>
        </View>
      ) : null}

      {(type === "IMAGE" ||
        type === "VIDEO" ||
        (type === "PDF" && Platform.OS === "web")) &&
      hasOpenableUrl ? (
        <LearnerInlineMedia
          resource={resource}
          onVideoEnded={onVideoCompleted}
        />
      ) : null}

      {type === "PDF" &&
      hasOpenableUrl &&
      Platform.OS !== "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Consulter le PDF"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onOpen}
          android_ripple={{ color: "transparent" }}
          className="mt-[11px] min-h-[62px] flex-row items-center overflow-hidden rounded-[16px] bg-[#7C3AED] px-[10px] py-[9px]"
          style={{
            opacity: busy ? 0.65 : 1,
          }}
        >
          <View className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[13px] bg-white/15">
            {busy ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />
            ) : (
              <SymbolView
                name={{
                  ios: "doc.richtext.fill",
                  android: "picture_as_pdf",
                  web: "picture_as_pdf",
                }}
                tintColor="#FFFFFF"
                size={16}
                weight="bold"
              />
            )}
          </View>

          <View className="ml-[10px] min-w-0 flex-1">
            <Text
              className="text-[8px] font-black uppercase tracking-[0.6px]"
              style={{
                color: "rgba(255,255,255,0.72)",
              }}
            >
              Document PDF
            </Text>

            <Text
              className="mt-[2px] text-[13px] font-black"
              style={{ color: "#FFFFFF" }}
              numberOfLines={1}
            >
              Consulter le PDF
            </Text>
          </View>

          <View className="ml-[8px] h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-white/15">
            <SymbolView
              name={{
                ios: "arrow.up.right",
                android: "open_in_new",
                web: "open_in_new",
              }}
              tintColor="#FFFFFF"
              size={12}
              weight="bold"
            />
          </View>
        </Pressable>
      ) : null}

      {type === "SCORM" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onOpen}
          android_ripple={{ color: "transparent" }}
          className="mt-[11px] min-h-[46px] flex-row items-center justify-center rounded-[13px] bg-[#7C3AED] px-[12px]"
          style={{ opacity: busy ? 0.65 : 1 }}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <SymbolView
              name={{
                ios: "arrow.up.right.square.fill",
                android: "open_in_new",
                web: "open_in_new",
              }}
              tintColor="#FFFFFF"
              size={13}
              weight="bold"
            />
          )}
          <Text className="ml-[7px] text-[11px] font-black text-white">
            Ouvrir le contenu
          </Text>
        </Pressable>
      ) : null}

      {(type === "DOCUMENT" ||
        type === "EXTERNAL_LINK") &&
      hasOpenableUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onOpen}
          android_ripple={{ color: "transparent" }}
          className="mt-[11px] min-h-[46px] flex-row items-center justify-center rounded-[13px] border bg-white px-[12px]"
          style={{
            borderColor: theme.colors.border,
            opacity: busy ? 0.65 : 1,
          }}
        >
          <SymbolView
            name={{
              ios: "arrow.up.right.square.fill",
              android: "open_in_new",
              web: "open_in_new",
            }}
            tintColor="#7C3AED"
            size={13}
            weight="bold"
          />
          <Text className="ml-[7px] text-[11px] font-black text-[#7C3AED]">
            Ouvrir la ressource
          </Text>
        </Pressable>
      ) : null}

      {type === "VIDEO" &&
      Platform.OS !== "web" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled: busy || videoCompleted,
          }}
          disabled={busy || videoCompleted}
          onPress={onVideoCompleted}
          android_ripple={{ color: "transparent" }}
          className="mt-[10px] min-h-[44px] flex-row items-center justify-center rounded-[13px] border px-[11px]"
          style={{
            backgroundColor: videoCompleted
              ? "#ECFDF3"
              : "#FFFFFF",
            borderColor: videoCompleted
              ? "#BBF7D0"
              : theme.colors.border,
            opacity: busy ? 0.65 : 1,
          }}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color="#7C3AED"
            />
          ) : (
            <SymbolView
              name={{
                ios: videoCompleted
                  ? "checkmark.circle.fill"
                  : "checkmark.circle",
                android: videoCompleted
                  ? "check_circle"
                  : "radio_button_unchecked",
                web: videoCompleted
                  ? "check_circle"
                  : "radio_button_unchecked",
              }}
              tintColor={
                videoCompleted ? "#16A36A" : "#7C3AED"
              }
              size={13}
              weight="bold"
            />
          )}

          <Text
            className="ml-[7px] text-[10px] font-black"
            style={{
              color: videoCompleted
                ? "#15803D"
                : "#7C3AED",
            }}
          >
            {videoCompleted
              ? "Vidéo terminée"
              : "J’ai terminé la vidéo"}
          </Text>
        </Pressable>
      ) : null}

      {type === "SCORM" ? (
        <View
          className="mt-[9px] flex-row items-start rounded-[13px] px-[10px] py-[9px]"
          style={{
            backgroundColor: theme.colors.surfaceSoft,
          }}
        >
          <SymbolView
            name={{
              ios: "info.circle.fill",
              android: "info",
              web: "info",
            }}
            tintColor={theme.colors.accent}
            size={12}
            weight="bold"
          />
          <Text
            className="ml-[7px] min-w-0 flex-1 text-[10px] leading-[15px]"
            style={{
              color: theme.colors.foregroundMuted,
            }}
          >
            Termine le module interactif pour mettre à jour ta progression.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
