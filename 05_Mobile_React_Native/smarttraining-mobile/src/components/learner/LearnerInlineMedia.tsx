import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";

import { API_BASE_URL } from "../../api/apiConfig";
import { getToken } from "../../storage/tokenStorage";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  LearnerTrainingResource,
} from "../../types/learnerTraining";
import {
  normalizeLearnerResourceType,
} from "../../features/trainings/learnerTrainingService";
import { Text } from "../nativewindui/Text";

type MediaKind = "IMAGE" | "VIDEO" | "PDF";

type Props = {
  resource: LearnerTrainingResource;
  onVideoEnded?: () => void;
};

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
    pathname =
      raw.split(/[?#]/, 1)[0] || raw;
  }

  const markerIndex = pathname.indexOf("/media/");

  if (markerIndex < 0) {
    return null;
  }

  return pathname.slice(markerIndex);
}

function gatewayMediaUrl(
  value?: string | null,
): {
  url: string;
  protectedMedia: boolean;
} | null {
  const raw = value?.trim();

  if (!raw) {
    return null;
  }

  const path = protectedMediaPath(raw);

  if (!path) {
    return {
      url: raw,
      protectedMedia: false,
    };
  }

  return {
    url: `${API_BASE_URL}${path}`,
    protectedMedia: true,
  };
}

export default function LearnerInlineMedia({
  resource,
  onVideoEnded,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const {
    width: viewportWidth,
    height: viewportHeight,
  } = useWindowDimensions();

  const nativePdfHeight = useMemo(() => {
    const estimatedContentWidth = Math.max(
      280,
      viewportWidth - 48,
    );

    const widthDrivenHeight = Math.round(
      estimatedContentWidth * 1.35,
    );

    const viewportDrivenHeight = Math.round(
      viewportHeight * 0.62,
    );

    return Math.max(
      360,
      Math.min(
        640,
        widthDrivenHeight,
        viewportDrivenHeight,
      ),
    );
  }, [viewportHeight, viewportWidth]);

  const nativeMediaHeight = useMemo(() => {
    const contentWidth = Math.max(
      280,
      viewportWidth - 68,
    );

    return Math.max(
      220,
      Math.min(
        330,
        Math.round(contentWidth * 0.62),
      ),
    );
  }, [viewportWidth]);

  const type =
    normalizeLearnerResourceType(
      resource.type,
    ) as MediaKind;

  const originalUrl =
    resource.publicUrl ||
    resource.url ||
    "";

  const resolved = useMemo(
    () => gatewayMediaUrl(originalUrl),
    [originalUrl],
  );

  const [token, setToken] =
    useState<string | null>(null);

  const [webObjectUrl, setWebObjectUrl] =
    useState("");

  const [loading, setLoading] =
    useState(Boolean(resolved));

  const [error, setError] =
    useState("");

  useEffect(() => {
    let active = true;
    let createdObjectUrl = "";

    void Promise.resolve()
      .then(async () => {
        if (!active) return;

        setError("");
        setWebObjectUrl("");
        setLoading(Boolean(resolved));

        const value = await getToken();

        if (!active) return;

        setToken(value);

        if (!resolved) {
          setLoading(false);
          return;
        }

        if (
          Platform.OS !== "web" ||
          !resolved.protectedMedia
        ) {
          setLoading(false);
          return;
        }

        const response = await fetch(
          resolved.url,
          {
            headers: value
              ? {
                  Authorization:
                    `Bearer ${value}`,
                  Accept: "*/*",
                }
              : {
                  Accept: "*/*",
                },
          },
        );

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`,
          );
        }

        const blob =
          await response.blob();

        createdObjectUrl =
          URL.createObjectURL(blob);

        if (!active) {
          URL.revokeObjectURL(
            createdObjectUrl,
          );
          return;
        }

        setWebObjectUrl(
          createdObjectUrl,
        );

        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError(
            "Le média protégé n’a pas pu être chargé dans le lecteur.",
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;

      if (createdObjectUrl) {
        URL.revokeObjectURL(
          createdObjectUrl,
        );
      }
    };
  }, [resolved]);

  if (!resolved) {
    return null;
  }

  if (loading) {
    return (
      <View className="mt-[11px] min-h-[110px] items-center justify-center rounded-[15px] bg-[#F8F6F3] px-[12px]">
        <ActivityIndicator
          color={theme.colors.accent}
        />

        <Text
          className="mt-[8px] text-[11px] font-bold"
          style={{
            color:
              theme.colors.foregroundMuted,
          }}
        >
          Chargement du média sécurisé...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="mt-[11px] rounded-[14px] border px-[11px] py-[10px]"
        style={{
          backgroundColor:
            theme.colors.surfaceSoft,
          borderColor:
            theme.colors.border,
        }}
      >
        <Text
          className="text-[11px] font-bold leading-[16px]"
          style={{
            color:
              theme.colors.foreground,
          }}
        >
          {error}
        </Text>
      </View>
    );
  }

  const headers =
    resolved.protectedMedia && token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : undefined;

  if (Platform.OS === "web") {
    const url =
      webObjectUrl || resolved.url;

    if (type === "IMAGE") {
      return React.createElement(
        "img",
        {
          src: url,
          alt: resource.title,
          style: {
            display: "block",
            width: "100%",
            maxHeight: 520,
            objectFit: "contain",
            borderRadius: 14,
            marginTop: 12,
          },
        } as never,
      );
    }

    if (type === "VIDEO") {
      return React.createElement(
        "video",
        {
          src: url,
          controls: true,
          preload: "metadata",
          onEnded: onVideoEnded,
          style: {
            display: "block",
            width: "100%",
            maxHeight: 520,
            borderRadius: 14,
            marginTop: 12,
            backgroundColor: "#000000",
          },
        } as never,
      );
    }

    return React.createElement(
      "iframe",
      {
        src: url,
        title: resource.title,
        style: {
          display: "block",
          width: "100%",
          height: "82vh",
          minHeight: 640,
          maxHeight: 1000,
          border: 0,
          borderRadius: 14,
          marginTop: 12,
        },
      } as never,
    );
  }

  if (type === "IMAGE") {
    return (
      <View
        className="mt-[11px] overflow-hidden rounded-[15px] bg-[#F8F6F3]"
        style={{
          height: nativeMediaHeight,
        }}
      >
        <Image
          source={{
            uri: resolved.url,
            headers,
          }}
          contentFit="contain"
          style={{
            width: "100%",
            height: "100%",
          }}
          accessibilityLabel={
            resource.title
          }
        />
      </View>
    );
  }

  return (
    <View
      className="mt-[11px] overflow-hidden rounded-[15px] bg-black"
      style={{
        height:
          type === "PDF"
            ? nativePdfHeight
            : nativeMediaHeight,
      }}
    >
      <WebView
        source={{
          uri: resolved.url,
          headers,
        }}
        originWhitelist={["*"]}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={
          type === "VIDEO"
        }
        javaScriptEnabled
        domStorageEnabled
        style={{
          width: "100%",
          height: "100%",
          backgroundColor:
            type === "VIDEO"
              ? "#000000"
              : "#FFFFFF",
        }}
      />
    </View>
  );
}
