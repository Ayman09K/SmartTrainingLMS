import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { ConnectedUser } from "../types/auth";

const TOKEN_KEY = "smarttraining_token";
const CONNECTED_USER_KEY = "smarttraining_connected_user";

async function saveValue(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getValue(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function removeValue(key: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function saveToken(token: string): Promise<void> {
  await saveValue(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return getValue(TOKEN_KEY);
}

export async function saveConnectedUser(user: ConnectedUser): Promise<void> {
  await saveValue(CONNECTED_USER_KEY, JSON.stringify(user));
}

export async function getConnectedUser(): Promise<ConnectedUser | null> {
  const storedUser = await getValue(CONNECTED_USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as ConnectedUser;
  } catch {
    await removeValue(CONNECTED_USER_KEY);
    return null;
  }
}

export async function removeToken(): Promise<void> {
  await Promise.all([
    removeValue(TOKEN_KEY),
    removeValue(CONNECTED_USER_KEY),
  ]);
}
