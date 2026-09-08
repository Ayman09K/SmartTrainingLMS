import { UserRole } from "./auth";

export type LearnerCivilite =
  | "NON_RENSEIGNEE"
  | "MONSIEUR"
  | "MADAME";

export interface LearnerProfile {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  civilite: LearnerCivilite;
  avatarDataUrl?: string | null;
  role: UserRole;
  enabled: boolean;
  accountStatus: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface LearnerProfileUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  civilite: LearnerCivilite;
  avatarDataUrl?: string | null;
  currentPassword?: string;
}

export interface LearnerProfileUpdateResponse {
  token: string;
  tokenType?: string;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  civilite: LearnerCivilite;
  avatarDataUrl?: string | null;
  role: UserRole;
  accountStatus?: string;
}

export interface LearnerChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}