import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { apiClient } from "../../api/apiClient";
import { API_BASE_URL } from "../../api/apiConfig";
import { getToken } from "../../storage/tokenStorage";
import { LearnerCertificate } from "../../types/learnerCertificate";

export async function getMyCertificates(): Promise<
  LearnerCertificate[]
> {
  const response = await apiClient.get<LearnerCertificate[]>(
    "/certificates/me",
  );

  return response.data;
}

export async function issueMyCertificate(
  trainingId: number,
): Promise<LearnerCertificate> {
  const response = await apiClient.post<LearnerCertificate>(
    `/certificates/me/trainings/${trainingId}/issue`,
  );

  return response.data;
}

export async function downloadMyCertificatePdf(
  certificate: LearnerCertificate,
): Promise<void> {
  if (Platform.OS === "web") {
    const response = await apiClient.get(
      `/certificates/me/${certificate.id}/pdf`,
      {
        responseType: "blob",
        headers: {
          Accept: "application/pdf",
        },
      },
    );

    const browser = globalThis as typeof globalThis & {
      document?: {
        createElement: (tag: string) => {
          href: string;
          download: string;
          click: () => void;
        };
      };
      URL?: {
        createObjectURL: (blob: unknown) => string;
        revokeObjectURL: (url: string) => void;
      };
    };

    if (!browser.document || !browser.URL) {
      throw new Error("Téléchargement Web indisponible.");
    }

    const objectUrl = browser.URL.createObjectURL(response.data);
    const link = browser.document.createElement("a");
    link.href = objectUrl;
    link.download =
      `certificat-smarttraining-${certificate.publicCode}.pdf`;
    link.click();
    browser.URL.revokeObjectURL(objectUrl);
    return;
  }

  const token = await getToken();

  if (!token) {
    throw new Error("Session expirée.");
  }

  if (!FileSystem.cacheDirectory) {
    throw new Error("Stockage temporaire indisponible.");
  }

  const apiBase = API_BASE_URL.replace(/\/+$/, "");
  const remoteUrl =
    `${apiBase}/certificates/me/${certificate.id}/pdf`;
  const localUri =
    `${FileSystem.cacheDirectory}` +
    `certificat-smarttraining-${certificate.publicCode}.pdf`;

  const result = await FileSystem.downloadAsync(
    remoteUrl,
    localUri,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/pdf",
      },
    },
  );

  if (result.status !== 200) {
    throw new Error(
      `Téléchargement du certificat impossible (${result.status}).`,
    );
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, {
      mimeType: "application/pdf",
      dialogTitle: "Certificat SmartTraining AI",
      UTI: "com.adobe.pdf",
    });
    return;
  }

  await Linking.openURL(result.uri);
}