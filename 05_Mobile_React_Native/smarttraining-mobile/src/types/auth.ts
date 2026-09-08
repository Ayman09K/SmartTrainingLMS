export type UserRole = "ADMIN" | "FORMATEUR" | "APPRENANT";

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

export interface AuthResponse {
  token: string;
  userId: number;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface ConnectedUser {
  userId: number;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}