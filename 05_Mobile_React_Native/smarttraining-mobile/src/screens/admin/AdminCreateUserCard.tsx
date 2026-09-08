import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

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

const roles: readonly AdminUserRole[] = ["APPRENANT", "FORMATEUR", "ADMIN"];
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
        "Compte créé. Un lien sécurisé permet à l’utilisateur de définir son mot de passe par e-mail.",
      );
    } catch {
      setError("Impossible de créer ce compte.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          borderRadius: theme.shape.cardRadius,
          borderWidth: theme.shape.borderWidth,
          padding: theme.shape.cardPadding,
        },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.foreground }]}>
        Créer un utilisateur
      </Text>
      <Text style={[styles.help, { color: theme.colors.foregroundMuted }]}>
        Aucun mot de passe n’est communiqué à l’administrateur. SmartTraining
        envoie un lien sécurisé pour que l’utilisateur définisse le sien.
      </Text>

      <TextInput
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Prénom"
        placeholderTextColor={theme.colors.foregroundSubtle}
        style={[
          styles.input,
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      />
      <TextInput
        value={lastName}
        onChangeText={setLastName}
        placeholder="Nom"
        placeholderTextColor={theme.colors.foregroundSubtle}
        style={[
          styles.input,
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        placeholder="Adresse e-mail"
        placeholderTextColor={theme.colors.foregroundSubtle}
        style={[
          styles.input,
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
          },
        ]}
      />

      <Text style={[styles.label, { color: theme.colors.foregroundMuted }]}>
        RÔLE
      </Text>
      <View style={styles.chips}>
        {roles.map((item) => (
          <Pressable
            key={item}
            onPress={() => setRole(item)}
            style={[
              styles.chip,
              {
                borderColor:
                  role === item ? theme.colors.accent : theme.colors.border,
                backgroundColor:
                  role === item
                    ? theme.colors.surfaceSoft
                    : theme.colors.surface,
              },
            ]}
          >
            <Text
              style={{
                color:
                  role === item
                    ? theme.colors.accent
                    : theme.colors.foregroundMuted,
                fontWeight: role === item ? "800" : "600",
              }}
            >
              {roleLabel(item)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.colors.foregroundMuted }]}>
        STATUT
      </Text>
      <View style={styles.chips}>
        {statuses.map((item) => (
          <Pressable
            key={item}
            onPress={() => setAccountStatus(item)}
            style={[
              styles.chip,
              {
                borderColor:
                  accountStatus === item
                    ? theme.colors.accent
                    : theme.colors.border,
                backgroundColor:
                  accountStatus === item
                    ? theme.colors.surfaceSoft
                    : theme.colors.surface,
              },
            ]}
          >
            <Text
              style={{
                color:
                  accountStatus === item
                    ? theme.colors.accent
                    : theme.colors.foregroundMuted,
                fontWeight: accountStatus === item ? "800" : "600",
              }}
            >
              {statusLabel(item)}
            </Text>
          </Pressable>
        ))}
      </View>

      {error ? (
        <Text style={[styles.message, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}

      {message ? (
        <Text style={[styles.message, { color: theme.colors.success }]}>
          {message}
        </Text>
      ) : null}

      <AppButton
        title={working ? "Création..." : "Créer le compte"}
        onPress={() => void submit()}
        loading={working}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 20 },
  title: { fontSize: 19, fontWeight: "900" },
  help: { fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 16 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 4,
    marginBottom: 7,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    minHeight: 38,
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  message: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
});