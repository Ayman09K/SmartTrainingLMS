/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";

import { register } from "../../features/auth/authService";

type RegisterScreenProps = {
  onBackToLogin: () => void;
  onOpenPrivacy: () => void;
};

type FieldName =
  | "firstName"
  | "lastName"
  | "email"
  | "password"
  | "confirmPassword"
  | null;

type PremiumFieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  compact?: boolean;
  helperText?: string;
};

const BACKGROUND = "#F8F5F1";
const CARD = "#FFFFFF";
const TEXT = "#101828";
const MUTED = "#667085";
const MUTED_LIGHT = "#98A2B3";
const PRIMARY = "#7C3AED";
const PRIMARY_DARK = "#6D28D9";
const BORDER = "#E5E1DC";

const brandMark = require(
  "../../../assets/branding/SmartTraining_brand_mark.png",
);

const wordmark = require(
  "../../../assets/branding/SmartTraining_wordmark.png",
);

function registrationErrorMessage(error: unknown): string {
  const candidate = error as {
    response?: {
      data?: unknown;
    };
  };

  const data = candidate.response?.data;

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    const message =
      typeof record.message === "string"
        ? record.message
        : "";

    const normalizedMessage =
      message.toLocaleLowerCase("fr");

    if (
      normalizedMessage.includes("existe déjà") ||
      normalizedMessage.includes("already")
    ) {
      return "Cette adresse e-mail est déjà utilisée.";
    }

    const fieldMessage = Object.values(record).find(
      (value): value is string =>
        typeof value === "string" &&
        value.trim().length > 0,
    );

    if (fieldMessage) {
      return fieldMessage;
    }
  }

  if (!candidate.response) {
    return "Impossible de joindre SmartTraining. Vérifie ta connexion puis réessaie.";
  }

  return "La création du compte a échoué. Réessaie dans quelques instants.";
}

function ErrorBanner({
  message,
}: {
  message: string;
}) {
  return (
    <View
      className="mb-3 flex-row rounded-[17px]"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: "#FFF4F2",
        borderColor: "#F4D3CD",
        borderWidth: 1,
      }}
    >
      <View
        className="mr-2.5 items-center justify-center rounded-[11px]"
        style={{
          width: 34,
          height: 34,
          backgroundColor: "#FEE4E2",
        }}
      >
        <Ionicons
          name="alert-circle-outline"
          size={19}
          color="#D92D20"
        />
      </View>

      <View className="flex-1">
        <Text
          allowFontScaling={false}
          className="text-[11.5px] font-black text-[#B42318]"
        >
          Vérifie les informations
        </Text>

        <Text
          allowFontScaling={false}
          className="mt-0.5 text-[10.5px] font-medium leading-[15px] text-[#7A271A]"
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

const PremiumField = forwardRef<TextInput, PremiumFieldProps>(
  function PremiumField(
    {
      label,
      icon,
      isPassword = false,
      compact = false,
      helperText,
      secureTextEntry,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const [focused, setFocused] =
      useState(false);

    const [
      passwordVisible,
      setPasswordVisible,
    ] = useState(false);

    return (
      <View
        style={{
          marginBottom: compact ? 8 : 11,
        }}
      >
        <Text
          allowFontScaling={false}
          className="font-black"
          style={{
            marginBottom: compact ? 4 : 6,
            fontSize: compact ? 10.5 : 12,
            color: focused
              ? PRIMARY
              : "#344054",
          }}
        >
          {label}
        </Text>

        <View
          className="flex-row items-center bg-white"
          style={{
            height: compact ? 44 : 50,
            borderRadius: 16,
            borderWidth: focused ? 1.5 : 1,
            borderColor: focused
              ? "#8B5CF6"
              : BORDER,
            paddingHorizontal: compact ? 9 : 10,
            shadowColor: PRIMARY,
            shadowOpacity: focused ? 0.07 : 0,
            shadowRadius: 7,
            shadowOffset: {
              width: 0,
              height: 2,
            },
            elevation: focused ? 1 : 0,
          }}
        >
          <View
            className="mr-2 items-center justify-center rounded-[10px]"
            style={{
              width: compact ? 29 : 32,
              height: compact ? 29 : 32,
              backgroundColor: "#F5EFFF",
            }}
          >
            <Ionicons
              name={icon}
              size={compact ? 15 : 17}
              color={PRIMARY}
            />
          </View>

          <TextInput
            ref={ref}
            {...props}
            allowFontScaling={false}
            secureTextEntry={
              isPassword
                ? !passwordVisible
                : Boolean(secureTextEntry)
            }
            placeholderTextColor="#A7AFBC"
            className="h-full flex-1 font-semibold text-[#101828]"
            style={{
              fontSize: compact ? 12.5 : 14,
              paddingVertical: 0,
            }}
            selectionColor={PRIMARY}
            onFocus={(event) => {
              setFocused(true);
              onFocus?.(event);
            }}
            onBlur={(event) => {
              setFocused(false);
              onBlur?.(event);
            }}
          />

          {isPassword ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                passwordVisible
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              hitSlop={8}
              onPress={() =>
                setPasswordVisible(
                  (value) => !value,
                )
              }
              className="ml-1 h-9 w-9 items-center justify-center rounded-full active:bg-violet-50"
            >
              <Ionicons
                name={
                  passwordVisible
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={19}
                color="#667085"
              />
            </Pressable>
          ) : null}
        </View>

        {helperText ? (
          <Text
            allowFontScaling={false}
            style={{
              marginTop: 4,
              color: MUTED_LIGHT,
              fontSize: compact ? 9 : 10,
              fontWeight: "600",
            }}
          >
            {helperText}
          </Text>
        ) : null}
      </View>
    );
  },
);

export default function RegisterScreen({
  onBackToLogin,
  onOpenPrivacy,
}: RegisterScreenProps) {
  const { height } = useWindowDimensions();

  const firstNameRef =
    useRef<TextInput>(null);
  const lastNameRef =
    useRef<TextInput>(null);
  const emailRef =
    useRef<TextInput>(null);
  const passwordRef =
    useRef<TextInput>(null);
  const confirmPasswordRef =
    useRef<TextInput>(null);

  const [firstName, setFirstName] =
    useState("");
  const [lastName, setLastName] =
    useState("");
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [loading, setLoading] =
    useState(false);
  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");
  const [registered, setRegistered] =
    useState(false);

  const [
    keyboardVisible,
    setKeyboardVisible,
  ] = useState(false);

  const [
    keyboardTop,
    setKeyboardTop,
  ] = useState<number | null>(null);

  const [
    focusedField,
    setFocusedField,
  ] = useState<FieldName>(null);

  const [
    keyboardOffsetY,
    setKeyboardOffsetY,
  ] = useState(0);

  const shortScreen = height < 730;

  /**
   * Quand un message d'erreur est visible,
   * le formulaire gagne en hauteur.
   * On compacte uniquement les espacements verticaux
   * pour éviter de couper le logo ou le bas de la carte.
   */
  const crowdedLayout =
    shortScreen ||
    Boolean(errorMessage);

  const passwordKeyboardMode =
    keyboardVisible &&
    (
      focusedField === "password" ||
      focusedField === "confirmPassword"
    );

  useEffect(() => {
    const show = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        setKeyboardVisible(true);
        setKeyboardTop(
          event.endCoordinates.screenY,
        );
      },
    );

    const hide = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
        setKeyboardTop(null);
        setFocusedField(null);
        setKeyboardOffsetY(0);
      },
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  function currentInputRef() {
    switch (focusedField) {
      case "firstName":
        return firstNameRef;

      case "lastName":
        return lastNameRef;

      case "email":
        return emailRef;

      case "password":
        return passwordRef;

      case "confirmPassword":
        return confirmPasswordRef;

      default:
        return null;
    }
  }

  useEffect(() => {
    if (
      !passwordKeyboardMode ||
      keyboardTop === null
    ) {
      setKeyboardOffsetY(0);
      return;
    }

    const timer = setTimeout(() => {
      const activeRef = currentInputRef();

      activeRef?.current?.measureInWindow(
        (_x, y, _width, fieldHeight) => {
          const KEYBOARD_GAP =
            focusedField === "confirmPassword"
              ? 58
              : 46;

          /**
           * Le champ peut déjà être déplacé par translateY.
           * On retrouve sa position naturelle pour calculer
           * un offset absolu, comme sur Login.
           */
          const measuredBottom =
            y + fieldHeight;

          const naturalBottom =
            measuredBottom - keyboardOffsetY;

          const allowedBottom =
            keyboardTop - KEYBOARD_GAP;

          const requiredOffset =
            Math.min(
              0,
              allowedBottom -
                naturalBottom -
                6,
            );

          /**
           * Confirmation est plus basse dans le formulaire :
           * on lui autorise donc davantage de déplacement.
           *
           * Le calcul se relance aussi si le bandeau d'erreur
           * apparaît ou disparaît.
           */
          const maxShift =
            focusedField === "confirmPassword"
              ? 280
              : 220;

          const nextOffset =
            Math.max(
              requiredOffset,
              -maxShift,
            );

          setKeyboardOffsetY(
            nextOffset,
          );
        },
      );
    }, 120);

    return () => {
      clearTimeout(timer);
    };
  }, [
    focusedField,
    passwordKeyboardMode,
    keyboardTop,
    errorMessage,
  ]);

  function clearError() {
    if (errorMessage) {
      setErrorMessage("");
    }
  }

  async function handleRegister() {
    const normalizedFirstName =
      firstName.trim();

    const normalizedLastName =
      lastName.trim();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedFirstName ||
      !normalizedLastName ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage(
        "Complète tous les champs avant de créer ton compte.",
      );
      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setErrorMessage(
        "Saisis une adresse e-mail valide.",
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Le mot de passe doit contenir au moins 6 caractères.",
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setErrorMessage(
        "Les deux mots de passe ne correspondent pas.",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const response = await register({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password,
      });

      if (response.role !== "APPRENANT") {
        setErrorMessage(
          "Le serveur n’a pas confirmé la création d’un compte Apprenant.",
        );
        return;
      }

      Keyboard.dismiss();
      setRegistered(true);
    } catch (error: unknown) {
      setErrorMessage(
        registrationErrorMessage(error),
      );
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <View
        className="flex-1 items-center justify-center px-5"
        style={{
          backgroundColor: BACKGROUND,
        }}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor={BACKGROUND}
        />

        <View
          className="w-full rounded-[28px] bg-white px-6 py-8"
          style={{
            borderColor: "#DCEAE2",
            borderWidth: 1,
            shadowColor: "#101828",
            shadowOpacity: 0.06,
            shadowRadius: 18,
            shadowOffset: {
              width: 0,
              height: 8,
            },
            elevation: 3,
          }}
        >
          <View className="items-center">
            <View
              className="mb-5 items-center justify-center rounded-[22px]"
              style={{
                width: 66,
                height: 66,
                backgroundColor: "#EAF8F0",
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={36}
                color="#12824C"
              />
            </View>

            <Text
              allowFontScaling={false}
              className="text-center text-[24px] font-black tracking-tight text-[#101828]"
            >
              Compte créé
            </Text>

            <Text
              allowFontScaling={false}
              className="mt-2 text-center text-[13px] font-medium leading-5 text-[#667085]"
            >
              Ton espace Apprenant est prêt. Tu peux maintenant te connecter.
            </Text>

            <Pressable
              accessibilityRole="button"
              onPress={onBackToLogin}
              className="mt-6 h-14 w-full flex-row items-center justify-center rounded-[18px] bg-[#7C3AED]"
            >
              <Text
                allowFontScaling={false}
                className="text-[15px] font-black text-white"
              >
                Se connecter
              </Text>

              <Ionicons
                name="arrow-forward"
                size={19}
                color="#FFFFFF"
                style={{
                  position: "absolute",
                  right: 20,
                }}
              />
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{
        backgroundColor: BACKGROUND,
      }}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : undefined
      }
      keyboardVerticalOffset={
        Platform.OS === "ios" ? 8 : 0
      }
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BACKGROUND}
      />

      <View
        className="flex-1"
        style={{
          paddingHorizontal: 6,
          paddingTop: passwordKeyboardMode
            ? 8
            : crowdedLayout
              ? 8
              : 16,
          paddingBottom: passwordKeyboardMode
            ? 10
            : crowdedLayout
              ? 20
              : 24,
          justifyContent: passwordKeyboardMode
            ? "flex-start"
            : "center",
          transform: [
            {
              translateY: passwordKeyboardMode
                ? 0
                : keyboardOffsetY,
            },
          ],
        }}
      >
        {!passwordKeyboardMode ? (
          <View
            className="items-center"
            style={{
              marginBottom: crowdedLayout
                ? 7
                : 13,
            }}
          >
            <Image
            source={brandMark}
            contentFit="contain"
            style={{
              width: crowdedLayout
                ? 56
                : 72,
              height: crowdedLayout
                ? 56
                : 72,
            }}
          />

          <Image
            source={wordmark}
            contentFit="contain"
            style={{
              width: crowdedLayout
                ? 180
                : 204,
              height: crowdedLayout
                ? 30
                : 35,
            }}
          />

          <Text
            allowFontScaling={false}
            className="mt-1.5 text-center font-medium"
            style={{
              color: MUTED,
              fontSize: crowdedLayout
                ? 10
                : 11.5,
            }}
          >
            Crée ton espace d’apprentissage SmartTraining.
            </Text>
          </View>
        ) : null}

        <View
          className="overflow-hidden rounded-[32px]"
          style={{
            marginBottom: passwordKeyboardMode
              ? 2
              : 0,
            backgroundColor: CARD,
            borderColor: "#E4DFDA",
            borderWidth: 1,
            shadowColor: "#101828",
            shadowOpacity: 0.06,
            shadowRadius: 16,
            shadowOffset: {
              width: 0,
              height: 7,
            },
            elevation: 3,
          }}
        >
          <View
            style={{
              height: 4,
              backgroundColor: PRIMARY,
            }}
          />

          <View
            style={{
              paddingHorizontal: 20,
              paddingTop: passwordKeyboardMode
                ? 10
                : crowdedLayout
                  ? 14
                  : 18,
              paddingBottom: passwordKeyboardMode
                ? 10
                : crowdedLayout
                  ? 14
                  : 18,
            }}
          >
            <View
              style={{
                marginBottom: passwordKeyboardMode
                  ? 8
                  : crowdedLayout
                    ? 11
                    : 16,
              }}
            >
              <Text
                allowFontScaling={false}
                className="font-black tracking-tight text-[#101828]"
                style={{
                  fontSize: passwordKeyboardMode
                    ? 20
                    : 23,
                }}
              >
                Créer mon compte
              </Text>

              {!passwordKeyboardMode ? (
                <Text
                  allowFontScaling={false}
                  className="mt-1 text-[11px] font-medium leading-[16px] text-[#667085]"
                >
                  Ton compte sera créé avec le rôle Apprenant.
                </Text>
              ) : null}
            </View>

            {errorMessage ? (
              <View
                style={{
                  marginBottom: passwordKeyboardMode
                    ? -3
                    : 0,
                }}
              >
                <ErrorBanner
                  message={errorMessage}
                />
              </View>
            ) : null}

            <View className="flex-row gap-2.5">
              <View className="flex-1">
                <PremiumField
                  ref={firstNameRef}
                  label="Prénom"
                  icon="person-outline"
                  compact={passwordKeyboardMode}
                  value={firstName}
                  placeholder="Prénom"
                  accessibilityLabel="Prénom"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="givenName"
                  maxLength={80}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  editable={!loading}
                  onChangeText={(value) => {
                    setFirstName(value);
                    clearError();
                  }}
                  onFocus={() => {
                    setKeyboardOffsetY(0);
                    setFocusedField(
                      "firstName",
                    );
                  }}
                  onSubmitEditing={() =>
                    lastNameRef.current?.focus()
                  }
                />
              </View>

              <View className="flex-1">
                <PremiumField
                  ref={lastNameRef}
                  label="Nom"
                  icon="person-outline"
                  compact={passwordKeyboardMode}
                  value={lastName}
                  placeholder="Nom"
                  accessibilityLabel="Nom"
                  autoCapitalize="words"
                  autoCorrect={false}
                  textContentType="familyName"
                  maxLength={80}
                  returnKeyType="next"
                  blurOnSubmit={false}
                  editable={!loading}
                  onChangeText={(value) => {
                    setLastName(value);
                    clearError();
                  }}
                  onFocus={() => {
                    setKeyboardOffsetY(0);
                    setFocusedField(
                      "lastName",
                    );
                  }}
                  onSubmitEditing={() =>
                    emailRef.current?.focus()
                  }
                />
              </View>
            </View>

            <PremiumField
              ref={emailRef}
              label="Adresse e-mail"
              icon="mail-outline"
              compact={passwordKeyboardMode}
              value={email}
              placeholder="adresse@entreprise.com"
              accessibilityLabel="Adresse e-mail"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              maxLength={150}
              returnKeyType="next"
              blurOnSubmit={false}
              editable={!loading}
              onChangeText={(value) => {
                setEmail(value);
                clearError();
              }}
              onFocus={() => {
                setKeyboardOffsetY(0);
                setFocusedField("email");
              }}
              onSubmitEditing={() =>
                passwordRef.current?.focus()
              }
            />

            <PremiumField
              ref={passwordRef}
              label="Mot de passe"
              icon="lock-closed-outline"
              compact={passwordKeyboardMode}
              isPassword
              value={password}
              placeholder="Au moins 6 caractères"
              helperText={
                passwordKeyboardMode
                  ? undefined
                  : "Au moins 6 caractères"
              }
              accessibilityLabel="Mot de passe"
              textContentType="newPassword"
              returnKeyType="next"
              blurOnSubmit={false}
              editable={!loading}
              onChangeText={(value) => {
                setPassword(value);
                clearError();
              }}
              onFocus={() => {
                setFocusedField(
                  "password",
                );
              }}
              onSubmitEditing={() =>
                confirmPasswordRef.current?.focus()
              }
            />

            <PremiumField
              ref={confirmPasswordRef}
              label="Confirmer le mot de passe"
              icon="shield-checkmark-outline"
              compact={passwordKeyboardMode}
              isPassword
              value={confirmPassword}
              placeholder="Confirme ton mot de passe"
              accessibilityLabel="Confirmer le mot de passe"
              textContentType="newPassword"
              returnKeyType="done"
              editable={!loading}
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearError();
              }}
              onFocus={() => {
                setFocusedField(
                  "confirmPassword",
                );
              }}
              onSubmitEditing={() =>
                void handleRegister()
              }
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Créer mon compte"
              accessibilityState={{
                disabled: loading,
              }}
              disabled={loading}
              onPress={() =>
                void handleRegister()
              }
              className="flex-row items-center justify-center rounded-[17px]"
              style={{
                minHeight: passwordKeyboardMode
                  ? 44
                  : 52,
                backgroundColor: PRIMARY,
                opacity: loading
                  ? 0.72
                  : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Text
                    allowFontScaling={false}
                    className="text-[14px] font-black text-white"
                  >
                    Créer mon compte
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#FFFFFF"
                    style={{
                      position: "absolute",
                      right: 18,
                    }}
                  />
                </>
              )}
            </Pressable>

            {!passwordKeyboardMode ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Politique de confidentialité"
                  onPress={onOpenPrivacy}
                  disabled={loading}
                  className="mt-3 flex-row items-center justify-center rounded-[14px] py-2"
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={16}
                    color={PRIMARY}
                  />

                  <Text
                    allowFontScaling={false}
                    className="ml-2 text-[11px] font-black text-[#7C3AED]"
                  >
                    Politique de confidentialité
                  </Text>
                </Pressable>

                <View
                  className="mt-2 flex-row items-center justify-center rounded-[16px]"
                  style={{
                    minHeight: 44,
                    backgroundColor: "#FBF8F5",
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    className="text-[11px] font-medium text-[#667085]"
                  >
                    Déjà un compte ?
                  </Text>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Se connecter"
                    disabled={loading}
                    onPress={onBackToLogin}
                    className="ml-2 flex-row items-center py-2"
                  >
                    <Text
                      allowFontScaling={false}
                      className="text-[11px] font-black text-[#7C3AED]"
                    >
                      Se connecter
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={14}
                      color={PRIMARY}
                      style={{
                        marginLeft: 4,
                      }}
                    />
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
