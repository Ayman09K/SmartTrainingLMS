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

import { login } from "../../features/auth/authService";
import type { ConnectedUser } from "../../types/auth";

type LoginScreenProps = {
  onLoginSuccess: (user: ConnectedUser) => void;
  onCreateAccount: () => void;
  onForgotPassword: () => void;
};

type PremiumFieldProps = TextInputProps & {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
  compact?: boolean;
};

const BACKGROUND = "#F8F5F1";
const CARD = "#FFFFFF";
const TEXT = "#101828";
const MUTED = "#667085";
const MUTED_LIGHT = "#98A2B3";
const PRIMARY = "#7C3AED";
const PRIMARY_DARK = "#6D28D9";
const BORDER = "#E6E0DA";

const brandMark = require(
  "../../../assets/branding/SmartTraining_brand_mark.png",
);

const wordmark = require(
  "../../../assets/branding/SmartTraining_wordmark.png",
);

function ErrorBanner({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <View
      className="flex-row rounded-[16px]"
      style={{
        marginBottom: compact ? 8 : 11,
        paddingHorizontal: compact ? 10 : 12,
        paddingVertical: compact ? 8 : 10,
        backgroundColor: "#FFF4F2",
        borderColor: "#F4D3CD",
        borderWidth: 1,
      }}
    >
      <View
        className="mr-2.5 items-center justify-center rounded-[10px]"
        style={{
          width: compact ? 29 : 32,
          height: compact ? 29 : 32,
          backgroundColor: "#FEE4E2",
        }}
      >
        <Ionicons
          name="alert-circle-outline"
          size={compact ? 17 : 19}
          color="#D92D20"
        />
      </View>

      <View className="flex-1">
        <Text
          allowFontScaling={false}
          className="font-black text-[#B42318]"
          style={{ fontSize: compact ? 10.5 : 11.5 }}
        >
          Connexion impossible
        </Text>
        <Text
          allowFontScaling={false}
          className="mt-0.5 font-medium text-[#7A271A]"
          style={{
            fontSize: compact ? 10 : 11,
            lineHeight: compact ? 14 : 16,
          }}
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
      secureTextEntry,
      onFocus,
      onBlur,
      ...props
    },
    ref,
  ) {
    const [focused, setFocused] = useState(false);
    const [passwordVisible, setPasswordVisible] = useState(false);

    return (
      <View style={{ marginBottom: compact ? 8 : 11 }}>
        <Text
          allowFontScaling={false}
          className="font-black"
          style={{
            marginBottom: compact ? 4 : 6,
            fontSize: compact ? 11.5 : 13,
            color: focused ? PRIMARY : "#475467",
          }}
        >
          {label}
        </Text>

        <View
          className="flex-row items-center rounded-[17px] bg-white px-2.5"
          style={{
            height: compact ? 46 : 52,
            borderWidth: focused ? 1.5 : 1,
            borderColor: focused ? "#8B5CF6" : BORDER,
            shadowColor: PRIMARY,
            shadowOpacity: focused ? 0.07 : 0,
            shadowRadius: 7,
            shadowOffset: { width: 0, height: 2 },
            elevation: focused ? 1 : 0,
          }}
        >
          <View
            className="mr-2.5 items-center justify-center rounded-[10px]"
            style={{
              width: compact ? 30 : 34,
              height: compact ? 30 : 34,
              backgroundColor: "#F5EFFF",
            }}
          >
            <Ionicons
              name={icon}
              size={compact ? 16 : 18}
              color={PRIMARY}
            />
          </View>

          <TextInput
            ref={ref}
            {...props}
            allowFontScaling={false}
            secureTextEntry={
              isPassword ? !passwordVisible : Boolean(secureTextEntry)
            }
            placeholderTextColor="#A7AFBC"
            className="h-full flex-1 font-semibold text-[#101828]"
            style={{
              fontSize: compact ? 13.5 : 14.5,
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
              onPress={() => setPasswordVisible((value) => !value)}
              className="ml-1 h-9 w-9 items-center justify-center rounded-full active:bg-violet-50"
            >
              <Ionicons
                name={
                  passwordVisible
                    ? "eye-off-outline"
                    : "eye-outline"
                }
                size={20}
                color="#667085"
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  },
);

function Benefit({
  icon,
  title,
  success = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  success?: boolean;
}) {
  return (
    <View className="flex-1 flex-row items-center justify-center">
      <View
        className="mr-2 items-center justify-center rounded-full"
        style={{
          width: 30,
          height: 30,
          backgroundColor: success ? "#E7F8EF" : "#F0EBFF",
        }}
      >
        <Ionicons
          name={icon}
          size={16}
          color={success ? "#12824C" : "#6941C6"}
        />
      </View>

      <Text
        allowFontScaling={false}
        className="font-semibold"
        style={{
          color: MUTED,
          fontSize: 9.5,
          lineHeight: 13,
        }}
      >
        {title}
      </Text>
    </View>
  );
}

export default function LoginScreen({
  onLoginSuccess,
  onCreateAccount,
  onForgotPassword,
}: LoginScreenProps) {
  const { height } = useWindowDimensions();

  const passwordInputRef = useRef<TextInput>(null);
  const submitLockRef = useRef(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [keyboardOffsetY, setKeyboardOffsetY] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (event) => {
      setKeyboardVisible(true);
      setKeyboardTop(event.endCoordinates.screenY);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardVisible(false);
      setKeyboardTop(null);
      setPasswordFocused(false);
      setKeyboardOffsetY(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const shortScreen = height < 730;
  const passwordKeyboardMode = keyboardVisible && passwordFocused;

  useEffect(() => {
    if (!passwordKeyboardMode || keyboardTop === null) {
      setKeyboardOffsetY(0);
      return;
    }

    const timer = setTimeout(() => {
      passwordInputRef.current?.measureInWindow(
        (_x, y, _width, fieldHeight) => {
          const KEYBOARD_GAP = 48;

          /**
           * measureInWindow() tient compte du translateY actuel.
           * On reconstitue donc la position "naturelle" du champ
           * avant translation pour calculer un offset absolu stable.
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
           * Suffisamment large pour absorber aussi
           * l'apparition du bandeau d'erreur,
           * sans laisser l'écran partir trop loin.
           */
          const nextOffset =
            Math.max(
              requiredOffset,
              -220,
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
    passwordKeyboardMode,
    keyboardTop,
    errorMessage,
  ]);

  async function handleLogin() {
    if (loading) return;

    if (!email.trim() || !password) {
      setErrorMessage(
        "Saisis ton adresse e-mail et ton mot de passe pour continuer.",
      );
      return;
    }

    try {
      setLoading(true);
      setErrorMessage("");

      const authResponse = await login({
        email: email.trim(),
        password,
      });

      onLoginSuccess({
        userId: authResponse.userId,
        email: authResponse.email,
        role: authResponse.role,
        firstName: authResponse.firstName,
        lastName: authResponse.lastName,
      });
    } catch (error: unknown) {
      const candidate = error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      };

      setErrorMessage(
        candidate.response?.data?.message ||
          candidate.response?.data?.error ||
          "Vérifie ton adresse e-mail et ton mot de passe, puis réessaie.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyboardLogin() {
    if (submitLockRef.current || loading) return;

    submitLockRef.current = true;

    void handleLogin().finally(() => {
      submitLockRef.current = false;
    });
  }

  return (
    <KeyboardAvoidingView
      className="flex-1"
      style={{ backgroundColor: BACKGROUND }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BACKGROUND}
      />

      <View
        className="flex-1"
        style={{
          paddingHorizontal: 6,
          paddingTop: shortScreen ? 10 : 16,
          paddingBottom: shortScreen ? 8 : 14,
          justifyContent: "center",
          transform: [
            {
              translateY: keyboardOffsetY,
            },
          ],
        }}
      >
        <View
          className="items-center"
          style={{
            marginBottom: shortScreen ? 10 : 14,
          }}
        >
          <Image
            source={brandMark}
            contentFit="contain"
            style={{
              width: shortScreen ? 72 : 80,
              height: shortScreen ? 72 : 80,
            }}
          />

          <Image
            source={wordmark}
            contentFit="contain"
            style={{
              marginTop: 0,
              width: shortScreen ? 190 : 202,
              height: shortScreen ? 32 : 35,
            }}
          />

          <Text
            allowFontScaling={false}
            className="mt-1.5 text-center font-medium"
            style={{
              maxWidth: 330,
              color: MUTED,
              fontSize: shortScreen ? 11.5 : 12.5,
              lineHeight: shortScreen ? 17 : 19,
            }}
          >
            Retrouve tes formations, ta progression et ton espace d’apprentissage.
          </Text>
        </View>

        <View
          className="rounded-[31px]"
          style={{
            backgroundColor: CARD,
            borderWidth: 1,
            borderColor: "#E6E1DC",
            shadowColor: "#101828",
            shadowOpacity: 0.055,
            shadowRadius: 14,
            shadowOffset: {
              width: 0,
              height: 6,
            },
            elevation: 2,
            paddingHorizontal: 20,
            paddingTop: shortScreen ? 17 : 20,
            paddingBottom: shortScreen ? 17 : 20,
          }}
        >
          <View
            className="flex-row items-center"
            style={{
              marginBottom: shortScreen ? 11 : 14,
            }}
          >
            <View
              className="mr-3 items-center justify-center rounded-[15px]"
              style={{
                width: 44,
                height: 44,
                backgroundColor: "#F1EAFE",
              }}
            >
              <Ionicons
                name="person-outline"
                size={22}
                color={PRIMARY}
              />
            </View>

            <View className="flex-1">
              <Text
                allowFontScaling={false}
                className="font-black tracking-tight"
                style={{
                  color: TEXT,
                  fontSize: shortScreen ? 23 : 25,
                }}
              >
                Connexion
              </Text>

              <Text
                allowFontScaling={false}
                className="mt-0.5 font-medium"
                style={{
                  color: MUTED,
                  fontSize: shortScreen ? 10.5 : 11.5,
                  lineHeight: shortScreen ? 15 : 17,
                }}
              >
                Connecte-toi à ton espace SmartTraining.
              </Text>
            </View>
          </View>

          {errorMessage ? (
            <ErrorBanner
              message={errorMessage}
              compact={false}
            />
          ) : null}

          <PremiumField
            label="Adresse e-mail"
            icon="mail-outline"
            compact={false}
            placeholder="adresse@entreprise.com"
            accessibilityLabel="Adresse e-mail"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="username"
            value={email}
            onChangeText={(value) => {
              setEmail(value);

              if (errorMessage) {
                setErrorMessage("");
              }
            }}
            onFocus={() => {
              setPasswordFocused(false);
              setKeyboardOffsetY(0);
            }}
            returnKeyType="next"
            blurOnSubmit={false}
            editable={!loading}
            onSubmitEditing={() =>
              passwordInputRef.current?.focus()
            }
          />

          <PremiumField
            ref={passwordInputRef}
            label="Mot de passe"
            icon="lock-closed-outline"
            compact={false}
            isPassword
            placeholder="Ton mot de passe"
            accessibilityLabel="Mot de passe"
            textContentType="password"
            value={password}
            onChangeText={(value) => {
              setPassword(value);

              if (errorMessage) {
                setErrorMessage("");
              }
            }}
            onFocus={() => {
              setPasswordFocused(true);
            }}
            onBlur={() => {
              setPasswordFocused(false);
              setKeyboardOffsetY(0);
            }}
            returnKeyType="go"
            editable={!loading}
            onSubmitEditing={handleKeyboardLogin}
          />

          <View
            className="items-end"
            style={{
              marginBottom: 9,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mot de passe oublié"
              disabled={loading}
              onPress={onForgotPassword}
              hitSlop={8}
              className="rounded-full px-1 py-1 active:bg-violet-50"
            >
              <Text
                allowFontScaling={false}
                className="font-black"
                style={{
                  color: PRIMARY,
                  fontSize: 12,
                }}
              >
                Mot de passe oublié ?
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Se connecter"
            accessibilityState={{
              disabled: loading,
            }}
            disabled={loading}
            onPress={() => void handleLogin()}
            className="flex-row items-center justify-center rounded-[18px]"
            style={{
              minHeight: 52,
              backgroundColor: PRIMARY,
              opacity: loading ? 0.72 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text
                  allowFontScaling={false}
                  className="font-black text-white"
                  style={{
                    fontSize: 15,
                  }}
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
              </>
            )}
          </Pressable>

          {!passwordKeyboardMode ? (
            <View
              className="mt-3 flex-row items-center rounded-[18px]"
              style={{
                minHeight: shortScreen ? 64 : 70,
                paddingHorizontal: 11,
                paddingVertical: shortScreen ? 9 : 10,
                backgroundColor: "#FBF8F5",
              }}
            >
              <View
                className="mr-2.5 items-center justify-center rounded-full"
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: "#F1EAFE",
                }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={18}
                  color={PRIMARY}
                />
              </View>

              <View className="flex-1 pr-2">
                <Text
                  allowFontScaling={false}
                  className="font-black"
                  style={{
                    color: TEXT,
                    fontSize: 11.5,
                  }}
                >
                  Pas encore de compte ?
                </Text>

                <Text
                  allowFontScaling={false}
                  className="mt-0.5 font-medium"
                  style={{
                    color: MUTED,
                    fontSize: 9.5,
                    lineHeight: 13,
                  }}
                >
                  Rejoins SmartTraining dès aujourd’hui.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Créer un compte"
                disabled={loading}
                onPress={onCreateAccount}
                className="rounded-[14px] bg-white px-3 py-2.5 active:bg-violet-50"
                style={{
                  borderWidth: 1,
                  borderColor: "#D8C6FF",
                }}
              >
                <Text
                  allowFontScaling={false}
                  className="font-black"
                  style={{
                    color: PRIMARY_DARK,
                    fontSize: 10.5,
                  }}
                >
                  Créer un compte
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        {!passwordKeyboardMode ? (
          <View
            className="mt-3 flex-row items-center"
            style={{
              minHeight: shortScreen ? 42 : 48,
            }}
          >
            <Benefit
              icon="shield-checkmark-outline"
              title={"Connexion\nsécurisée"}
              success
            />

            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: "#DDD8D3",
              }}
            />

            <Benefit
              icon="school-outline"
              title={"Apprendre\nà ton rythme"}
            />

            <View
              style={{
                width: 1,
                height: 28,
                backgroundColor: "#DDD8D3",
              }}
            />

            <Benefit
              icon="trending-up-outline"
              title={"Progresser\nau quotidien"}
            />
          </View>
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}
