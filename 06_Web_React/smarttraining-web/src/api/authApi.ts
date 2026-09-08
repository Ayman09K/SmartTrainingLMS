import { getData, postData, putData } from "./apiClient";
import type {
  ChangePasswordRequest,
  CurrentUserResponse,
  LoginRequest,
  LoginResponse,
  ProfileUpdateRequest,
  ProfileUpdateResponse,
  RegisterRequest,
  TrainerAccessRequestCreateRequest,
  TrainerAccessRequestResponse,
} from "../types/auth";

export async function login(request: LoginRequest): Promise<LoginResponse> {
  return postData<LoginResponse, LoginRequest>("/auth/login", request);
}

export async function register(request: RegisterRequest): Promise<LoginResponse> {
  return postData<LoginResponse, RegisterRequest>("/auth/register", request);
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return getData<CurrentUserResponse>("/auth/me");
}

export async function updateMyProfile(
  request: ProfileUpdateRequest,
): Promise<ProfileUpdateResponse> {
  return putData<ProfileUpdateResponse, ProfileUpdateRequest>(
    "/auth/me/profile",
    request,
  );
}

export async function changeMyPassword(
  request: ChangePasswordRequest,
): Promise<void> {
  return putData<void, ChangePasswordRequest>("/auth/me/password", request);
}

export async function getAuthStatus(): Promise<string> {
  return getData<string>("/auth/status");
}

export async function requestTrainerAccess(
  request: TrainerAccessRequestCreateRequest,
): Promise<TrainerAccessRequestResponse> {
  return postData<TrainerAccessRequestResponse, TrainerAccessRequestCreateRequest>(
    "/auth/trainer-requests",
    request,
  );
}

export async function getMyTrainerAccessRequests(): Promise<
  TrainerAccessRequestResponse[]
> {
  return getData<TrainerAccessRequestResponse[]>(
    "/auth/trainer-requests/me",
  );
}
