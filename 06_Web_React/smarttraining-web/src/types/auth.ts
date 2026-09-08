export type UserRole = "ADMIN" | "FORMATEUR" | "APPRENANT";

export type AccountStatus = "ACTIVE" | "DISABLED" | "SUSPENDED" | "PENDING";

export type Civilite = "NON_RENSEIGNEE" | "MONSIEUR" | "MADAME";

export type TrainerRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tokenType?: string;
  type?: string;
  id?: number;
  userId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  civilite?: Civilite;
  avatarDataUrl?: string | null;
  role?: UserRole;
  accountStatus?: AccountStatus;
}

export interface AuthUser {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  civilite?: Civilite;
  avatarDataUrl?: string | null;
  role: UserRole;
  accountStatus?: AccountStatus;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type CurrentUserResponse = AuthUser;

export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  email: string;
  civilite: Civilite;
  avatarDataUrl?: string | null;
  currentPassword?: string;
}

export interface ProfileUpdateResponse extends LoginResponse {
  firstName?: string;
  lastName?: string;
  civilite?: Civilite;
  avatarDataUrl?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}


export interface TrainerAccessRequestCreateRequest {
  expertiseDomain: string;
  experienceSummary?: string;
  motivation: string;
}

export interface TrainerAccessRequestResponse {
  id: number;
  requesterId: number;
  requesterEmail?: string | null;
  requesterFullName?: string | null;
  expertiseDomain: string;
  experienceSummary?: string | null;
  motivation: string;
  status: TrainerRequestStatus;
  reviewerId?: number | null;
  reviewerEmail?: string | null;
  adminComment?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
}
