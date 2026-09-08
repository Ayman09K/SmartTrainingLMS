import { apiClient } from "../../api/apiClient";
import {
  AdminAccountStatus,
  AdminCreateUserRequest,
  AdminUserRole,
  AdminUserSummary,
} from "../../types/admin";

export const ADMIN_USER_ROLES: readonly AdminUserRole[] = [
  "ADMIN",
  "FORMATEUR",
  "APPRENANT",
];

export const ADMIN_ACCOUNT_STATUSES: readonly AdminAccountStatus[] = [
  "ACTIVE",
  "DISABLED",
  "SUSPENDED",
];

export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const response = await apiClient.get<AdminUserSummary[]>("/auth/admin/users");
  return response.data;
}
export async function createAdminUser(
  request: AdminCreateUserRequest,
): Promise<AdminUserSummary> {
  const response = await apiClient.post<AdminUserSummary>(
    "/auth/admin/users",
    request,
  );
  return response.data;
}

export async function updateAdminUserRole(
  userId: number,
  role: AdminUserRole,
): Promise<AdminUserSummary> {
  const response = await apiClient.put<AdminUserSummary>(
    `/auth/admin/users/${userId}/role`,
    { role },
  );
  return response.data;
}

export async function updateAdminUserStatus(
  userId: number,
  accountStatus: AdminAccountStatus,
): Promise<AdminUserSummary> {
  const response = await apiClient.put<AdminUserSummary>(
    `/auth/admin/users/${userId}/status`,
    { accountStatus },
  );
  return response.data;
}