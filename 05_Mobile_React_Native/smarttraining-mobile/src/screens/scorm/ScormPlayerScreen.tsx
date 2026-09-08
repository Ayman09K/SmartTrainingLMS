// MOBILE_SCORM_FINAL_VISUAL_POLISH_SAFE_V4_1
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { createElement, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import {
  buildScormRuntimeUrl,
  launchScorm,
  launchScormAuthorPreview,
} from "../../features/scorm/scormRuntimeService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

export default function ScormPlayerScreen({
  resourceId,
  authorPreview = false,
}: {
  resourceId: number;
  authorPreview?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();
  const router = useRouter();
  const {
    width: viewportWidth,
    height: viewportHeight,
  } = useWindowDimensions();
  const showLandscapeGuide = viewportHeight > viewportWidth;
  const [runtimeUrl, setRuntimeUrl] = useState("");
  const [error, setError] = useState("");
  const launchPromiseRef = useRef<{
    resourceId: number;
    authorPreview: boolean;
    promise: Promise<{ runtimePath: string }>;
  } | null>(null);

  const miniHeader = (
    <View
      style={[
        styles.miniHeader,
        {
          backgroundColor: theme.colors.headerBackground,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Retour"
        accessibilityHint="Revient a l'ecran precedent"
        hitSlop={8}
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.miniBackButton,
          {
            opacity: pressed ? 0.65 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.miniBackChevron,
            { color: theme.colors.headerForeground },
          ]}
        >
          {"\u2039"}
        </Text>
      </Pressable>
    </View>
  );
  const landscapeGuide = showLandscapeGuide ? (
    <View
      style={[
        styles.landscapeGate,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <View
        style={[
          styles.landscapeCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.rotateVisual,
            { backgroundColor: theme.colors.surfaceSoft },
          ]}
        >
          <View
            style={[
              styles.phoneLandscape,
              { borderColor: theme.colors.accent },
            ]}
          >
            <View
              style={[
                styles.phoneLandscapeScreen,
                { backgroundColor: theme.colors.accent },
              ]}
            />
          </View>
        </View>

        <Text
          style={[
            styles.landscapeTitle,
            { color: theme.colors.foreground },
          ]}
        >
          Passez en mode paysage
        </Text>

        <Text
          style={[
            styles.landscapeText,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          La formation sera plus lisible et plus confortable.
        </Text>

        <View
          style={[
            styles.rotationHelpBox,
            {
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.rotationHelpTitle,
              { color: theme.colors.foreground },
            ]}
          >
            {"L\u2019\u00E9cran ne pivote pas ?"}
          </Text>

          <Text
            style={[
              styles.rotationHelpText,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            {"Activez la rotation automatique dans les r\u00E9glages rapides du t\u00E9l\u00E9phone."}
          </Text>
        </View>
      </View>
    </View>
  ) : null;
  useEffect(() => {
    let active = true;

    const launchPromise =
      launchPromiseRef.current?.resourceId === resourceId &&
      launchPromiseRef.current?.authorPreview === authorPreview
        ? launchPromiseRef.current.promise
        : authorPreview
          ? launchScormAuthorPreview(resourceId)
          : launchScorm(resourceId);

    launchPromiseRef.current = {
      resourceId,
      authorPreview,
      promise: launchPromise,
    };

    void launchPromise
      .then((launch) => {
        if (active) {
          setError("");
          setRuntimeUrl(buildScormRuntimeUrl(launch.runtimePath));
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de lancer cette formation SCORM.");
        }
      });

    return () => {
      active = false;
    };
  }, [authorPreview, resourceId]);

  if (error && !runtimeUrl) {
    return (
      <View
        style={[
          styles.playerPage,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <StatusBar hidden />
        {miniHeader}
        <View style={styles.statePage}>
          <View
            style={[
              styles.stateCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.danger,
                borderRadius: theme.shape.cardRadius,
                borderWidth: Math.max(1, theme.shape.borderWidth),
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.stateEyebrow,
                { color: theme.colors.danger },
              ]}
            >
              LECTEUR SCORM
            </Text>

            <Text
              style={[
                styles.errorTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Lecture impossible
            </Text>

            <Text
              style={[
                styles.error,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {error}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!runtimeUrl) {
    return (
      <View
        style={[
          styles.playerPage,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <StatusBar hidden />
        {miniHeader}
        <View style={styles.statePage}>
          <View
            style={[
              styles.loadingCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <ActivityIndicator
              size="large"
              color={theme.colors.accent}
            />

            <Text
              style={[
                styles.loadingTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Chargement SCORM...
            </Text>

            <Text
              style={[
                styles.loadingText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {"Le module est en cours de pr\u00E9paration."}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.playerPage,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <StatusBar hidden />
        {miniHeader}
        <View style={styles.contentArea}>
          {createElement("iframe", {
            title: "Formation SCORM",
            src: runtimeUrl,
            allow: "fullscreen",
            referrerPolicy: "no-referrer",
            style: {
              width: "100%",
              height: "100%",
              minHeight: "100%",
              border: 0,
              display: "block",
              backgroundColor: theme.colors.background,
            },
          })}
          {landscapeGuide}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[
        styles.playerPage,
        { backgroundColor: theme.colors.background },
      ]}
    >
      <StatusBar hidden />
      {miniHeader}
      <View style={styles.contentArea}>
        <WebView
          source={{ uri: runtimeUrl }}
          style={[
            styles.webview,
            { backgroundColor: theme.colors.background },
          ]}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["https://*", "http://*"]}
          allowsFullscreenVideo
          setSupportMultipleWindows={false}
        />
        {landscapeGuide}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  playerPage: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
  },
  miniHeader: {
    height: 44,
    minHeight: 44,
    justifyContent: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 30,
  },
  miniBackButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBackChevron: {
    fontSize: 30,
    fontWeight: "600",
    lineHeight: 32,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    position: "relative",
  },
  webview: {
    flex: 1,
  },
  landscapeGate: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  landscapeCard: {
    width: "100%",
    maxWidth: 320,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },
  rotateVisual: {
    width: 92,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  phoneLandscape: {
    width: 62,
    height: 38,
    borderWidth: 3,
    borderRadius: 9,
    padding: 5,
  },
  phoneLandscapeScreen: {
    flex: 1,
    borderRadius: 4,
    opacity: 0.18,
  },
  landscapeTitle: {
    marginTop: 16,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    textAlign: "center",
  },
  landscapeText: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  rotationHelpBox: {
    width: "100%",
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rotationHelpTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
    textAlign: "center",
  },
  rotationHelpText: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
  },  statePage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  stateCard: {
    width: "100%",
    maxWidth: 680,
  },
  loadingCard: {
    width: "100%",
    maxWidth: 560,
    alignItems: "center",
  },
  stateEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 21,
    fontWeight: "900",
  },
  error: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14,
    textAlign: "center",
  },
  loadingText: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
});