import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import { createAdminUser } from "../../features/admin/adminUserService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import {
  AdminAccountStatus,
  AdminCreateUserRequest,
  AdminUserRole,
  AdminUserSummary,
} from "../../types/admin";

type Props = {
  onCreated: (user: AdminUserSummary) => void;
};

const roles: readonly AdminUserRole[] = [
  "APPRENANT",
  "FORMATEUR",
  "ADMIN",
];

const statuses: readonly AdminAccountStatus[] = [
  "ACTIVE",
  "DISABLED",
  "SUSPENDED",
];

function roleLabel(role: string) {
  if (role === "ADMIN") return "Administrateur";
  if (role === "FORMATEUR") return "Formateur";
  return "Apprenant";
}

function statusLabel(status: string) {
  if (status === "DISABLED") return "Désactivé";
  if (status === "SUSPENDED") return "Suspendu";
  return "Actif";
}

export default function AdminCreateUserCard({ onCreated }: Props) {
  const { theme } = useSmartTrainingTheme();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminUserRole>("APPRENANT");
  const [accountStatus, setAccountStatus] =
    useState<AdminAccountStatus>("ACTIVE");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(false);

  async function submit() {
    const request: AdminCreateUserRequest = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      role,
      accountStatus,
    };

    if (!request.firstName || !request.lastName || !request.email) {
      setError("Prénom, nom et e-mail sont obligatoires.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
      setError("Saisissez une adresse e-mail valide.");
      return;
    }

    setWorking(true);
    setError("");
    setMessage("");

    try {
      const created = await createAdminUser(request);
      onCreated(created);
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("APPRENANT");
      setAccountStatus("ACTIVE");
      setMessage(
        "Compte créé. Le lien de définition du mot de passe a été envoyé par e-mail.",
      );
    } catch {
      setError("Impossible de créer ce compte.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        className="mb-3 overflow-hidden rounded-[20px] border bg-white"
        style={{ borderColor: "#E5DFE8" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Créer un utilisateur"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((current) => !current)}
          android_ripple={{ color: "transparent" }}
          className="flex-row items-center px-4 py-3.5"
        >
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-[#F1E9FF]">
            <SymbolView
              name={{
                ios: "person.badge.plus",
                android: "person_add",
                web: "person_add",
              }}
              tintColor="#7C3AED"
              size={16}
              weight="bold"
            />
          </View>

          <View className="ml-3 min-w-0 flex-1">
            <Text className="text-[9px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
              Nouveau compte
            </Text>
            <Text
              className="mt-0.5 text-[16px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Créer un utilisateur
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-[9px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              L’utilisateur définit lui-même son mot de passe.
            </Text>
          </View>

          <View className="ml-2 h-8 w-8 items-center justify-center rounded-[10px] bg-[#F7F3FC]">
            <SymbolView
              name={{
                ios: expanded ? "chevron.up" : "chevron.down",
                android: expanded
                  ? "keyboard_arrow_up"
                  : "keyboard_arrow_down",
                web: expanded
                  ? "keyboard_arrow_up"
                  : "keyboard_arrow_down",
              }}
              tintColor="#7C3AED"
              size={13}
              weight="bold"
            />
          </View>
        </Pressable>

        {expanded ? (
          <View className="border-t border-[#EEE9F0] px-3.5 pb-3.5 pt-3">
            <View className="flex-row gap-2">
              <View className="min-w-0 flex-1">
                <AdminInput
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Prénom"
                  returnKeyType="next"
                />
              </View>
              <View className="min-w-0 flex-1">
                <AdminInput
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Nom"
                  returnKeyType="next"
                />
              </View>
            </View>

            <View className="mt-2">
              <AdminInput
                value={email}
                onChangeText={setEmail}
                placeholder="Adresse e-mail"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
              />
            </View>

            <ChoiceGroup
              label="Rôle"
              helper="Type de compte"
              items={roles}
              selected={role}
              onSelect={setRole}
              getLabel={roleLabel}
            />

            <ChoiceGroup
              label="Statut"
              helper="Disponibilité du compte"
              items={statuses}
              selected={accountStatus}
              onSelect={setAccountStatus}
              getLabel={statusLabel}
            />

            {error ? (
              <View
                className="mt-3 flex-row items-start rounded-[14px] border px-3 py-2.5"
                style={{
                  backgroundColor: "#FFF4F2",
                  borderColor: "#F2C6C3",
                }}
              >
                <SymbolView
                  name={{
                    ios: "exclamationmark.triangle.fill",
                    android: "error",
                    web: "error",
                  }}
                  tintColor="#C2413D"
                  size={12}
                  weight="bold"
                />
                <View className="ml-2 min-w-0 flex-1">
                  <Text className="text-[9px] font-black text-[#C2413D]">
                    Vérifiez les informations
                  </Text>
                  <Text
                    className="mt-0.5 text-[8px] leading-[13px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {error}
                  </Text>
                </View>
              </View>
            ) : null}

            {message ? (
              <View
                className="mt-3 flex-row items-start rounded-[14px] border px-3 py-2.5"
                style={{
                  backgroundColor: "#EAFBF3",
                  borderColor: "#BFECD7",
                }}
              >
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor="#16845A"
                  size={12}
                  weight="bold"
                />
                <View className="ml-2 min-w-0 flex-1">
                  <Text className="text-[9px] font-black text-[#16845A]">
                    Compte créé
                  </Text>
                  <Text
                    className="mt-0.5 text-[8px] leading-[13px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {message}
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="mt-3">
              <AppButton
                title={working ? "Création..." : "Créer le compte"}
                onPress={() => void submit()}
                loading={working}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );

  function AdminInput(props: React.ComponentProps<typeof TextInput>) {
    return (
      <TextInput
        placeholderTextColor={theme.colors.foregroundSubtle}
        className="h-[50px] rounded-[14px] border bg-[#FCFBFD] px-3.5 text-[13px]"
        style={{
          color: theme.colors.foreground,
          borderColor: "#E5DFE8",
        }}
        {...props}
      />
    );
  }

  function ChoiceGroup<T extends string>({
    label,
    helper,
    items,
    selected,
    onSelect,
    getLabel,
  }: {
    label: string;
    helper: string;
    items: readonly T[];
    selected: T;
    onSelect: (item: T) => void;
    getLabel: (item: T) => string;
  }) {
    return (
      <View className="mt-4">
        <Text
          className="text-[12px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {label}
        </Text>
        <Text
          className="mt-1 text-[9px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {helper}
        </Text>

        <View className="mt-2 flex-row flex-wrap gap-1.5">
          {items.map((item) => {
            const active = selected === item;

            return (
              <Pressable
                key={item}
                onPress={() => onSelect(item)}
                className="h-[42px] justify-center rounded-[12px] border px-3.5"
                style={{
                  borderColor: active ? "#7C3AED" : "#E5DFE8",
                  backgroundColor: active ? "#F3EEFF" : "#FFFFFF",
                }}
              >
                <Text
                  className="text-[11px] font-black"
                  style={{
                    color: active
                      ? "#7C3AED"
                      : theme.colors.foregroundMuted,
                  }}
                >
                  {getLabel(item)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
}
