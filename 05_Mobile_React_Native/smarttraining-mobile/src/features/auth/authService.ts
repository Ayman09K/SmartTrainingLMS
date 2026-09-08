import { apiClient } from "../../api/apiClient";
import {
  AuthResponse,
  ConnectedUser,
  LoginRequest,
  RegisterRequest,
} from "../../types/auth";
import { saveConnectedUser, saveToken } from "../../storage/tokenStorage";

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>("/auth/login", request);
  const authResponse = response.data;
  const connectedUser: ConnectedUser = {
    userId: authResponse.userId,
    email: authResponse.email,
    role: authResponse.role,
    firstName: authResponse.firstName,
    lastName: authResponse.lastName,
  };

  await Promise.all([
    saveToken(authResponse.token),
    saveConnectedUser(connectedUser),
  ]);

  return authResponse;
}

export async function register(
  request: RegisterRequest,
): Promise<AuthResponse> {
  const response = await apiClient.post<AuthResponse>(
    "/auth/register",
    request,
  );

  // Important : le backend retourne actuellement un token, mais le parcours
  // public conserve une connexion manuelle explicite après inscription.
  // Le token n'est donc pas persisté ici.
  return response.data;
}