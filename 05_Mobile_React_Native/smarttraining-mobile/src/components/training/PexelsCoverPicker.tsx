import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  searchPexelsCovers,
  type PexelsCoverPhoto,
} from "../../features/trainings/pexelsCoverService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type Props = {
  selectedPhoto: PexelsCoverPhoto | null;
  initialQuery?: string;
  disabled?: boolean;
  onSelect: (photo: PexelsCoverPhoto) => void;
  onSystemBack?: () => void;
};

function apiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return "Impossible de rechercher des images pour le moment.";
  }

  const response = (
    error as {
      response?: {
        data?: unknown;
      };
    }
  ).response;

  const data = response?.data;

  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>;

    for (const key of ["message", "detail", "error"]) {
      const value = payload[key];

      if (
        typeof value === "string" &&
        value.trim()
      ) {
        return value.trim();
      }
    }
  }

  if (
    error instanceof Error &&
    error.message &&
    !/^Request failed with status code \d+$/i.test(
      error.message,
    )
  ) {
    return error.message;
  }

  return "Impossible de rechercher des images pour le moment.";
}

export function PexelsCoverPicker({
  selectedPhoto,
  initialQuery = "",
  disabled = false,
  onSelect,
  onSystemBack,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] =
    useState<PexelsCoverPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setError("Saisissez au moins 2 caractères.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await searchPexelsCovers(normalized);

      setPhotos(response.photos);
    } catch (caught) {
      setPhotos([]);
      setError(apiErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  function closeModal(fromSystemBack = false) {
    if (loading) {
      return;
    }

    setOpen(false);

    if (fromSystemBack && onSystemBack) {
      setTimeout(() => onSystemBack(), 0);
    }
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choisir une couverture dans Pexels"
        disabled={disabled}
        onPress={() => {
          setQuery((current) =>
            current.trim()
              ? current
              : initialQuery,
          );
          setOpen(true);
        }}
        android_ripple={{ color: "transparent" }}
        className={`mt-2.5 min-h-[58px] w-full flex-row items-center rounded-[15px] bg-[#F1E9FF] px-3.5 py-2.5 ${
          disabled ? "opacity-55" : "opacity-100"
        }`}
      >
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-white">
          <SymbolView
            name={{
              ios: "sparkles",
              android: "auto_awesome",
              web: "auto_awesome",
            }}
            tintColor="#7C3AED"
            size={15}
            weight="bold"
          />
        </View>

        <View className="ml-3 min-w-0 flex-1">
          <Text className="text-[11px] font-black text-[#5B21B6]">
            {selectedPhoto
              ? "Changer l’image Pexels"
              : "Choisir dans Pexels"}
          </Text>

          <Text
            numberOfLines={1}
            className="mt-0.5 text-[9px] text-[#776887]"
          >
            Photos professionnelles · recherche intégrée
          </Text>
        </View>

        <View className="ml-2 h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#7C3AED]">
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            tintColor="#FFFFFF"
            size={11}
            weight="bold"
          />
        </View>
      </Pressable>

      {selectedPhoto ? (
        <View className="mt-1.5 flex-row items-center px-1">
          <SymbolView
            name={{
              ios: "checkmark.circle.fill",
              android: "check_circle",
              web: "check_circle",
            }}
            tintColor="#16845A"
            size={10}
          />

          <Text
            numberOfLines={1}
            className="ml-1.5 min-w-0 flex-1 text-[9px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            Photo : {selectedPhoto.photographer} · Pexels
          </Text>
        </View>
      ) : null}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => closeModal(true)}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            className="flex-1 px-3.5 pb-2 pt-4"
            style={{ backgroundColor: theme.colors.background }}
          >
            <View
              className="mb-3 overflow-hidden rounded-[22px] bg-white"
              >
              <View className="h-1 bg-[#7C3AED]" />

              <View className="flex-row items-start px-4 py-3.5">
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "photo.on.rectangle.angled",
                      android: "collections",
                      web: "collections",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text className="text-[9px] font-black uppercase tracking-[0.7px] text-[#7C3AED]">
                    Bibliothèque d’images
                  </Text>

                  <Text
                    className="mt-0.5 text-[18px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Pexels
                  </Text>

                  <Text
                    className="mt-1 text-[9px] leading-[14px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Recherchez une couverture professionnelle au format paysage.
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer la bibliothèque Pexels"
                  disabled={loading}
                  onPress={() => closeModal(false)}
                  className="ml-2 h-9 w-9 items-center justify-center rounded-[11px] bg-[#F7F3FC]"
                  style={{ opacity: loading ? 0.45 : 1 }}
                >
                  <SymbolView
                    name={{
                      ios: "xmark",
                      android: "close",
                      web: "close",
                    }}
                    tintColor="#7C3AED"
                    size={11}
                    weight="bold"
                  />
                </Pressable>
              </View>
            </View>

            <View
              className="mb-3 rounded-[18px] bg-white p-3.5"
              >
              <Text
                className="text-[11px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                Rechercher une couverture
              </Text>

              <Text
                className="mt-0.5 text-[8px]"
                style={{ color: theme.colors.foregroundMuted }}
              >
                Utilisez au moins 2 caractères.
              </Text>

              <View
                className="mt-2.5 flex-row items-center rounded-[14px] border border-[#E7E0EB] bg-[#FCFBFD] px-3"
              >
                <SymbolView
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  tintColor={theme.colors.foregroundSubtle}
                  size={14}
                />

                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={() => void runSearch()}
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Ex. data, leadership, cybersécurité..."
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  accessibilityLabel="Rechercher une image Pexels"
                  className="ml-2 h-[48px] min-w-0 flex-1 text-[12px]"
                  style={{ color: theme.colors.foreground }}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Rechercher dans Pexels"
                disabled={loading}
                onPress={() => void runSearch()}
                className="mt-2.5 h-[44px] flex-row items-center justify-center rounded-[13px] bg-[#7C3AED] px-3"
                style={{ opacity: loading ? 0.65 : 1 }}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <SymbolView
                      name={{
                        ios: "magnifyingglass",
                        android: "search",
                        web: "search",
                      }}
                      tintColor="#FFFFFF"
                      size={12}
                      weight="bold"
                    />

                    <Text className="ml-2 text-[10px] font-black text-white">
                      Rechercher
                    </Text>
                  </>
                )}
              </Pressable>
            </View>

            {error ? (
              <View className="mb-3 flex-row items-start rounded-[15px] border border-[#F2C6C3] bg-[#FFF4F2] px-3 py-3">
                <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white">
                  <SymbolView
                    name={{
                      ios: "exclamationmark.triangle.fill",
                      android: "error",
                      web: "error",
                    }}
                    tintColor="#C2413D"
                    size={13}
                    weight="bold"
                  />
                </View>

                <View className="ml-2.5 min-w-0 flex-1">
                  <Text className="text-[9px] font-black text-[#C2413D]">
                    Recherche impossible
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

            {!loading &&
            !error &&
            photos.length === 0 ? (
              <View className="items-center rounded-[18px] border border-[#E7E0EB] bg-white px-5 py-7">
                <View className="h-11 w-11 items-center justify-center rounded-[14px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "photo.stack",
                      android: "photo_library",
                      web: "photo_library",
                    }}
                    tintColor="#7C3AED"
                    size={17}
                  />
                </View>

                <Text
                  className="mt-2.5 text-[11px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Aucune recherche lancée
                </Text>

                <Text
                  className="mt-1 text-center text-[8px] leading-[13px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Recherchez un thème pour afficher des couvertures Pexels.
                </Text>
              </View>
            ) : null}

            <FlatList
              data={photos}
              keyExtractor={(item) => String(item.id)}
              numColumns={2}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              className="flex-1"
              contentContainerStyle={{
                paddingBottom: 10,
              }}
              columnWrapperStyle={{
                gap: 10,
              }}
              renderItem={({ item }) => {
                const selected =
                  selectedPhoto?.id === item.id;

                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Photo de ${item.photographer}`}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(item);
                      setOpen(false);
                    }}
                    className={`mb-2.5 min-w-0 flex-1 overflow-hidden rounded-[15px] bg-white ${
                      selected
                        ? "border-2 border-[#7C3AED]"
                        : "border border-[#E7E0EB]"
                    }`}
                  >
                    <View className="relative overflow-hidden">
                      <Image
                        source={{
                          uri:
                            item.previewUrl ||
                            item.landscapeUrl,
                        }}
                        resizeMode="cover"
                        accessibilityLabel={
                          item.alt ||
                          `Photo de ${item.photographer}`
                        }
                        className="w-full bg-[#F7F3FC]"
                        style={{ aspectRatio: 16 / 9 }}
                      />

                      {selected ? (
                        <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-[#7C3AED]">
                          <SymbolView
                            name={{
                              ios: "checkmark",
                              android: "check",
                              web: "check",
                            }}
                            tintColor="#FFFFFF"
                            size={10}
                            weight="bold"
                          />
                        </View>
                      ) : null}
                    </View>

                    <View className="px-2.5 py-2">
                      <Text
                        numberOfLines={1}
                        className="text-[9px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {item.photographer}
                      </Text>

                      <Text
                        className="mt-0.5 text-[7px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Pexels
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />

            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Ouvrir Pexels"
              onPress={() => {
                void Linking.openURL(
                  "https://www.pexels.com/",
                );
              }}
              className="self-center px-3 py-2"
            >
              <Text className="text-[9px] font-black text-[#7C3AED]">
                Photos fournies par Pexels
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
