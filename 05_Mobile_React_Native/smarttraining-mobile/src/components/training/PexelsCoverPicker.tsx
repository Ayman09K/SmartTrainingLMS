import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
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
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: theme.colors.accent,
            backgroundColor: theme.colors.surface,
            opacity:
              disabled
                ? 0.55
                : pressed
                  ? 0.75
                  : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.triggerText,
            { color: theme.colors.accent },
          ]}
        >
          {selectedPhoto
            ? "Changer l’image Pexels"
            : "Choisir dans Pexels"}
        </Text>
      </Pressable>

      {selectedPhoto ? (
        <Text
          style={[
            styles.attribution,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          Photo : {selectedPhoto.photographer} · Pexels
        </Text>
      ) : null}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          if (!loading) {
            setOpen(false);
          }
        }}
      >
        <View
          style={[
            styles.modal,
            {
              backgroundColor:
                theme.colors.background,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text
                style={[
                  styles.title,
                  { color: theme.colors.foreground },
                ]}
              >
                Bibliothèque Pexels
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color:
                      theme.colors.foregroundMuted,
                  },
                ]}
              >
                Recherchez une image de couverture au format paysage.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer la bibliothèque Pexels"
              disabled={loading}
              onPress={() => setOpen(false)}
              style={[
                styles.closeButton,
                {
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.closeText,
                  { color: theme.colors.foreground },
                ]}
              >
                Fermer
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void runSearch()}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ex. data, leadership, cybersécurité..."
            placeholderTextColor={
              theme.colors.foregroundSubtle
            }
            accessibilityLabel="Rechercher une image Pexels"
            style={[
              styles.input,
              {
                color: theme.colors.foreground,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Rechercher dans Pexels"
            disabled={loading}
            onPress={() => void runSearch()}
            style={[
              styles.searchButton,
              {
                backgroundColor: theme.colors.accent,
                opacity: loading ? 0.65 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator
                color={
                  theme.colors.accentForeground
                }
              />
            ) : (
              <Text
                style={[
                  styles.searchText,
                  {
                    color:
                      theme.colors.accentForeground,
                  },
                ]}
              >
                Rechercher
              </Text>
            )}
          </Pressable>

          {error ? (
            <View
              style={[
                styles.message,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: theme.colors.danger },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {!loading &&
          !error &&
          photos.length === 0 ? (
            <Text
              style={[
                styles.empty,
                {
                  color:
                    theme.colors.foregroundMuted,
                },
              ]}
            >
              Lancez une recherche pour afficher des couvertures.
            </Text>
          ) : null}

          <FlatList
            data={photos}
            keyExtractor={(item) =>
              String(item.id)
            }
            numColumns={2}
            columnWrapperStyle={styles.columns}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  `Photo de ${item.photographer}`
                }
                onPress={() => {
                  onSelect(item);
                  setOpen(false);
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      theme.colors.surface,
                    borderColor:
                      selectedPhoto?.id === item.id
                        ? theme.colors.accent
                        : theme.colors.border,
                  },
                ]}
              >
                <Image
                  source={{
                    uri:
                      item.previewUrl ||
                      item.landscapeUrl,
                  }}
                  resizeMode="contain"
                  accessibilityLabel={
                    item.alt ||
                    `Photo de ${item.photographer}`
                  }
                  style={[
                    styles.photo,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                    },
                  ]}
                />

                <Text
                  numberOfLines={1}
                  style={[
                    styles.photographer,
                    {
                      color:
                        theme.colors.foreground,
                    },
                  ]}
                >
                  {item.photographer}
                </Text>
              </Pressable>
            )}
          />

          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Ouvrir Pexels"
            onPress={() => {
              void Linking.openURL(
                "https://www.pexels.com/",
              );
            }}
            style={styles.pexelsLink}
          >
            <Text
              style={[
                styles.pexelsText,
                { color: theme.colors.accent },
              ]}
            >
              Photos fournies par Pexels
            </Text>
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: "900",
  },
  attribution: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  modal: {
    flex: 1,
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  closeButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  searchButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  searchText: {
    fontSize: 13,
    fontWeight: "900",
  },
  message: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
  },
  messageText: {
    fontSize: 12,
    lineHeight: 17,
  },
  empty: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingVertical: 18,
  },
  list: {
    flexGrow: 1,
    paddingBottom: 8,
  },
  columns: {
    gap: 10,
  },
  card: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  photo: {
    width: "100%",
    aspectRatio: 16 / 9,
  },
  photographer: {
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  pexelsLink: {
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pexelsText: {
    fontSize: 11,
    fontWeight: "800",
  },
});