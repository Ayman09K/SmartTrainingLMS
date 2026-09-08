import { apiClient, getData, postData } from "./apiClient";
import type {
  CertificateVerification,
  TrainingCertificate,
} from "../types/certificate";

export async function getMyCertificates(): Promise<TrainingCertificate[]> {
  return getData<TrainingCertificate[]>("/certificates/me");
}

export async function issueMyCertificate(
  trainingId: number,
): Promise<TrainingCertificate> {
  return postData<TrainingCertificate>(
    `/certificates/me/trainings/${trainingId}/issue`,
  );
}

export async function getMyCertificate(
  certificateId: number,
): Promise<TrainingCertificate> {
  return getData<TrainingCertificate>(
    `/certificates/me/${certificateId}`,
  );
}

export async function verifyCertificate(
  publicCode: string,
): Promise<CertificateVerification> {
  return getData<CertificateVerification>(
    `/certificates/verify/${encodeURIComponent(publicCode)}`,
  );
}

export async function getMyCertificatePdf(
  certificateId: number,
): Promise<Blob> {
  const response = await apiClient.get<Blob>(
    `/certificates/me/${certificateId}/pdf`,
    {
      responseType: "blob",
      headers: {
        Accept: "application/pdf",
      },
    },
  );

  return response.data;
}