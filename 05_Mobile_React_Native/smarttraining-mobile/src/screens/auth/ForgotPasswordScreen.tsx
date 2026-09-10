/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import {
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
  useWindowDimensions,
  View,
} from "react-native";
import { Image } from "expo-image";

import { requestPasswordReset } from "../../features/auth/passwordResetService";

type ForgotPasswordScreenProps = {
  onBackToLogin: () => void;
};

const BACKGROUND = "#F8F5F1";
const CARD = "#FFFFFF";
const TEXT = "#101828";
const MUTED = "#667085";
const PRIMARY = "#7C3AED";
const BORDER = "#E5E1DC";

const brandMark = require(
  "../../../assets/branding/SmartTraining_brand_mark.png",
);

const wordmark = require(
  "../../../assets/branding/SmartTraining_wordmark.png",
);

const SUCCESS_MESSAGE =
  "Si un compte correspond à cette adresse e-mail, un lien de réinitialisation vient d’être envoyé.";

function FeedbackBanner({
  type,
  title,
  message,
}: {
  type: "error" | "success";
  title: string;
  message: string;
}) {
  const isSuccess = type === "success";

  return (
    <View
      className="mb-3 flex-row rounded-[17px]"
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isSuccess
          ? "#F2FBF6"
          : "#FFF4F2",
        borderColor: isSuccess
          ? "#D5F0E0"
          : "#F4D3CD",
        borderWidth: 1,
      }}
    >
      <View
        className="mr-2.5 items-center justify-center rounded-[11px]"
        style={{
          width: 34,
          height: 34,
          backgroundColor: isSuccess
            ? "#DFF6E8"
            : "#FEE4E2",
        }}
      >
        <Ionicons
          name={
            isSuccess
              ? "checkmark-circle-outline"
              : "alert-circle-outline"
          }
          size={19}
          color={
            isSuccess
              ? "#12824C"
              : "#D92D20"
          }
        />
      </View>

      <View className="flex-1">
        <Text
          allowFontScaling={false}
          className="font-black"
          style={{
            fontSize: 11.5,
            color: isSuccess
              ? "#087443"
              : "#B42318",
          }}
        >
          {title}
        </Text>

        <Text
          allowFontScaling={false}
          className="mt-0.5 font-medium"
          style={{
            fontSize: 10.5,
            lineHeight: 15,
            color: isSuccess
              ? "#256445"
              : "#7A271A",
          }}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

export default function ForgotPasswordScreen({
  onBackToLogin,
}: ForgotPasswordScreenProps) {
  const { height } = useWindowDimensions();

  const emailRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [keyboardVisible, setKeyboardVisible] =
    useState(false);
  const [keyboardTop, setKeyboardTop] =
    useState<number | null>(null);
  const [keyboardOffsetY, setKeyboardOffsetY] =
    useState(0);

  const shortScreen = height < 730;

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
        setKeyboardOffsetY(0);
      },
    );

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  useEffect(() => {
    if (
      !keyboardVisible ||
      !focused ||
      keyboardTop === null
    ) {
      setKeyboardOffsetY(0);
      return;
    }

    const timer = setTimeout(() => {
      emailRef.current?.measureInWindow(
        (_x, y, _width, fieldHeight) => {
          const KEYBOARD_GAP = 28;

          const fieldBottom =
            y + fieldHeight;

          const allowedBottom =
            keyboardTop - KEYBOARD_GAP;

          const overlap =
            fieldBottom - allowedBottom;

          setKeyboardOffsetY(
            overlap > 0
              ? -(overlap + 4)
              : 0,
          );
        },
      );
    }, 140);

    return () => {
      clearTimeout(timer);
    };
  }, [
    focused,
    keyboardVisible,
    keyboardTop,
  ]);

  async function handleSubmit() {
    const normalizedEmail =
      email.trim().toLowerCase();

    setErrorMessage("");
    setSuccessMessage("");

    if (!normalizedEmail) {
      setErrorMessage(
        "Saisis l’adresse e-mail associée à ton compte.",
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

    try {
      setLoading(true);

      await requestPasswordReset(
        normalizedEmail,
      );

      Keyboard.dismiss();
      setSuccessMessage(
        SUCCESS_MESSAGE,
      );
    } catch {
      setErrorMessage(
        "Impossible d’envoyer le lien pour le moment. Réessaie dans quelques instants.",
      );
    } finally {
      setLoading(false);
    }
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
          paddingHorizontal: 8,
          paddingTop: shortScreen
            ? 18
            : 30,
          paddingBottom: shortScreen
            ? 18
            : 24,
          justifyContent: "flex-start",
          transform: [
            {
              translateY:
                keyboardOffsetY,
            },
          ],
        }}
      >
        <View
          className="items-center"
          style={{
            marginBottom: shortScreen
              ? 12
              : 16,
          }}
        >
          <Image
            source={brandMark}
            contentFit="contain"
            style={{
              width: shortScreen
                ? 64
                : 72,
              height: shortScreen
                ? 64
                : 72,
            }}
          />

          <Image
            source={wordmark}
            contentFit="contain"
            style={{
              width: shortScreen
                ? 190
                : 204,
              height: shortScreen
                ? 32
                : 35,
            }}
          />

          <Text
            allowFontScaling={false}
            className="mt-1.5 text-center font-medium"
            style={{
              maxWidth: 330,
              color: MUTED,
              fontSize: shortScreen
                ? 10.5
                : 11.5,
              lineHeight: shortScreen
                ? 15
                : 17,
            }}
          >
            Retrouve l’accès à ton compte SmartTraining.
          </Text>
        </View>

        <View
          className="overflow-hidden rounded-[30px]"
          style={{
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
            marginBottom: 18,
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
              paddingHorizontal: 18,
              paddingTop: 17,
              paddingBottom: 16,
            }}
          >
            <View className="mb-4 flex-row items-center">
              <View
                className="mr-3 items-center justify-center rounded-[15px]"
                style={{
                  width: 44,
                  height: 44,
                  backgroundColor: "#F1EAFE",
                }}
              >
                <Ionicons
                  name="key-outline"
                  size={22}
                  color={PRIMARY}
                />
              </View>

              <View className="flex-1">
                <Text
                  allowFontScaling={false}
                  className="text-[23px] font-black tracking-tight text-[#101828]"
                >
                  Mot de passe oublié
                </Text>

                <Text
                  allowFontScaling={false}
                  className="mt-0.5 text-[11px] font-medium leading-[16px] text-[#667085]"
                >
                  Reçois un lien sécurisé pour choisir un nouveau mot de passe.
                </Text>
              </View>
            </View>

            {errorMessage ? (
              <FeedbackBanner
                type="error"
                title="Envoi impossible"
                message={errorMessage}
              />
            ) : null}

            {successMessage ? (
              <FeedbackBanner
                type="success"
                title="Lien envoyé"
                message={successMessage}
              />
            ) : null}

            <View className="mb-3">
              <Text
                allowFontScaling={false}
                className="mb-1.5 text-[12px] font-black"
                style={{
                  color: focused
                    ? PRIMARY
                    : "#344054",
                }}
              >
                Adresse e-mail
              </Text>

              <View
                className="h-[52px] flex-row items-center rounded-[16px] bg-white px-2.5"
                style={{
                  borderWidth: focused
                    ? 1.5
                    : 1,
                  borderColor: focused
                    ? "#8B5CF6"
                    : BORDER,
                  shadowColor: PRIMARY,
                  shadowOpacity: focused
                    ? 0.07
                    : 0,
                  shadowRadius: 7,
                  shadowOffset: {
                    width: 0,
                    height: 2,
                  },
                  elevation: focused
                    ? 1
                    : 0,
                }}
              >
                <View
                  className="mr-2.5 items-center justify-center rounded-[10px]"
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: "#F5EFFF",
                  }}
                >
                  <Ionicons
                    name="mail-outline"
                    size={17}
                    color={PRIMARY}
                  />
                </View>

                <TextInput
                  ref={emailRef}
                  allowFontScaling={false}
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);

                    if (errorMessage) {
                      setErrorMessage("");
                    }

                    if (successMessage) {
                      setSuccessMessage("");
                    }
                  }}
                  onFocus={() => {
                    setFocused(true);
                  }}
                  onBlur={() => {
                    setFocused(false);
                    setKeyboardOffsetY(0);
                  }}
                  placeholder="nom@entreprise.com"
                  placeholderTextColor="#A7AFBC"
                  className="h-full flex-1 text-[14px] font-semibold text-[#101828]"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  editable={!loading}
                  selectionColor={PRIMARY}
                  onSubmitEditing={() =>
                    void handleSubmit()
                  }
                />
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Recevoir le lien"
              accessibilityState={{
                disabled: loading,
              }}
              disabled={loading}
              onPress={() =>
                void handleSubmit()
              }
              className="h-[52px] flex-row items-center justify-center rounded-[17px]"
              style={{
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
                    Recevoir le lien
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

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour à la connexion"
              disabled={loading}
              onPress={onBackToLogin}
              className="mt-3 h-[44px] flex-row items-center justify-center rounded-[15px]"
              style={{
                backgroundColor: "#FBF8F5",
                borderColor: "#EEE8E3",
                borderWidth: 1,
              }}
            >
              <Ionicons
                name="arrow-back"
                size={16}
                color={PRIMARY}
              />

              <Text
                allowFontScaling={false}
                className="ml-2 text-[11px] font-black text-[#7C3AED]"
              >
                Retour à la connexion
              </Text>
            </Pressable>

            <View
              className="mt-3 flex-row rounded-[16px]"
              style={{
                paddingHorizontal: 11,
                paddingVertical: 10,
                backgroundColor: "#F7F4FF",
              }}
            >
              <View
                className="mr-2.5 items-center justify-center rounded-[10px]"
                style={{
                  width: 31,
                  height: 31,
                  backgroundColor: "#EEE8FF",
                }}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={17}
                  color={PRIMARY}
                />
              </View>

              <View className="flex-1">
                <Text
                  allowFontScaling={false}
                  className="text-[10.5px] font-black text-[#5B21B6]"
                >
                  Réinitialisation sécurisée
                </Text>

                <Text
                  allowFontScaling={false}
                  className="mt-0.5 text-[9.5px] font-medium leading-[14px] text-[#6941C6]"
                >
                  Le lien reçu par e-mail te permettra de définir un nouveau mot de passe.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
