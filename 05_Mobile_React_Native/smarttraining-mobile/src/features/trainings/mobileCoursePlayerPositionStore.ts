import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export interface MobileCoursePlayerPosition {
  lessonId: number;
  resourceId: number | null;
}

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function storageKey(trainingId: number): string {
  return `smarttraining.coursePlayer.position.v1.${trainingId}`;
}

function getWebStorage(): WebStorage | null {
  const candidate = (
    globalThis as unknown as {
      localStorage?: WebStorage;
    }
  ).localStorage;

  return candidate ?? null;
}

function parsePosition(
  value: string | null,
): MobileCoursePlayerPosition | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as {
      lessonId?: unknown;
      resourceId?: unknown;
    };

    if (
      typeof parsed.lessonId !== "number"
      || !Number.isInteger(parsed.lessonId)
      || parsed.lessonId <= 0
    ) {
      return null;
    }

    if (
      parsed.resourceId !== null
      && parsed.resourceId !== undefined
      && (
        typeof parsed.resourceId !== "number"
        || !Number.isInteger(parsed.resourceId)
        || parsed.resourceId <= 0
      )
    ) {
      return null;
    }

    return {
      lessonId: parsed.lessonId,
      resourceId:
        typeof parsed.resourceId === "number"
          ? parsed.resourceId
          : null,
    };
  } catch {
    return null;
  }
}

export async function loadMobileCoursePlayerPosition(
  trainingId: number,
): Promise<MobileCoursePlayerPosition | null> {
  const key = storageKey(trainingId);

  try {
    if (Platform.OS === "web") {
      return parsePosition(getWebStorage()?.getItem(key) ?? null);
    }

    return parsePosition(await SecureStore.getItemAsync(key));
  } catch {
    return null;
  }
}

export async function saveMobileCoursePlayerPosition(
  trainingId: number,
  position: MobileCoursePlayerPosition,
): Promise<void> {
  const key = storageKey(trainingId);
  const payload = JSON.stringify(position);

  try {
    if (Platform.OS === "web") {
      getWebStorage()?.setItem(key, payload);
      return;
    }

    await SecureStore.setItemAsync(key, payload);
  } catch {
    // Resume position is a convenience only. It must never block learning.
  }
}
