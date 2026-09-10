import { isAxiosError } from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import {
  Alert,
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppButton from "../../components/AppButton";
import {
  PexelsCoverPicker,
} from "../../components/training/PexelsCoverPicker";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  uploadAdminTrainingCover,
} from "../../features/admin/adminTrainingService";
import {
  analyzeScormQuickCreateMobile,
  confirmScormQuickCreateMobile,
  getScormQuickCreateCategories,
  previewScormQuickCreateMobile,
} from "../../features/scorm/scormQuickCreateMobileService";
import {
  uploadTrainerTrainingCover,
} from "../../features/trainer/trainerAuthoringService";
import {
  importPexelsTrainingCover,
  type PexelsCoverPhoto,
} from "../../features/trainings/pexelsCoverService";
import type {
  ScormQuickCreateAnalysisResponse,
  ScormQuickCreateMode,
} from "../../features/scorm/scormQuickCreateMobileService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  MobileEnrollmentMode,
  MobileTrainingCategory,
  MobileTrainingLevel,
  MobileTrainingVisibility,
  TrainerPickedFile,
} from "../../types/trainerAuthoringMobile";

type CreationMethodProps = {
  onManual: () => void;
  onScorm: () => void;
  onCancel: () => void;
};

type QuickCreateProps = {
  role: "FORMATEUR" | "ADMIN";
  onCreated: (trainingId: number) => void;
  onBack: () => void;
};

type PickerKind =
  | "CATEGORY"
  | "LANGUAGE"
  | "LEVEL"
  | "VISIBILITY"
  | "ENROLLMENT"
  | null;

type PickerOption = {
  key: string;
  label: string;
};

type MetadataForm = {
  title: string;
  shortDescription: string;
  description: string;
  objectives: string;
  prerequisites: string;
  targetAudience: string;
  categoryId: number | null;
  categoryLabel: string;
  language: string;
  level: "" | MobileTrainingLevel;
  durationHours: string;
  visibility: "" | MobileTrainingVisibility;
  enrollmentMode: "" | MobileEnrollmentMode;
  accessCode: string;
  maxLearners: string;
};

const initialMetadata: MetadataForm = {
  title: "",
  shortDescription: "",
  description: "",
  objectives: "",
  prerequisites: "",
  targetAudience: "",
  categoryId: null,
  categoryLabel: "",
  language: "fr",
  level: "DEBUTANT",
  durationHours: "1",
  visibility: "PRIVATE",
  enrollmentMode: "ASSIGNMENT_ONLY",
  accessCode: "",
  maxLearners: "30",
};

const LARGE_FILE_WARNING_BYTES = 50 * 1024 * 1024;

const COVER_MAX_SIZE_BYTES = 10 * 1024 * 1024;
const COVER_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

function normalizeCoverMimeType(
  mimeType?: string | null,
  fileNameOrUri = "",
): string | null {
  const normalized = mimeType?.trim().toLowerCase();

  if (normalized) {
    if (normalized === "image/jpg") {
      return "image/jpeg";
    }

    return COVER_ALLOWED_MIME_TYPES.includes(
      normalized as (typeof COVER_ALLOWED_MIME_TYPES)[number],
    )
      ? normalized
      : null;
  }

  const cleanName = fileNameOrUri.split("?")[0].toLowerCase();

  if (cleanName.endsWith(".jpg") || cleanName.endsWith(".jpeg")) {
    return "image/jpeg";
  }

  if (cleanName.endsWith(".png")) {
    return "image/png";
  }

  if (cleanName.endsWith(".webp")) {
    return "image/webp";
  }

  return null;
}

function coverFileExtension(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function buildShortDescription(
  description: string,
  fallback = "",
): string {
  const normalized = (description || fallback)
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length <= 180) {
    return normalized;
  }

  return `${normalized.slice(0, 177).trimEnd()}…`;
}

function formatBytes(size?: number | null): string {
  if (
    typeof size !== "number" ||
    !Number.isFinite(size) ||
    size < 0
  ) {
    return "Taille inconnue";
  }

  if (size < 1024 * 1024) {
    return `${Math.max(1, Math.round(size / 1024))} Ko`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} Mo`;
}

function versionLabel(value: string): string {
  if (value === "SCORM_1_2") return "SCORM 1.2";
  if (value === "SCORM_2004") return "SCORM 2004";
  return value || "Version non déterminée";
}

function cleanFileTitle(fileName: string): string {
  return fileName
    .replace(/\.zip$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function backendMessage(error: unknown): string | null {
  if (!isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (typeof data === "object" && data !== null) {
    const candidate =
      (data as { message?: unknown }).message ??
      (data as { error?: unknown }).error;

    if (
      typeof candidate === "string" &&
      candidate.trim()
    ) {
      return candidate.trim();
    }
  }

  return null;
}

function readableError(
  error: unknown,
  stage: "PICK" | "ANALYZE" | "CONFIRM" | "LOAD",
): string {
  const backend = backendMessage(error);

  if (backend) {
    return backend;
  }

  if (isAxiosError(error) && !error.response) {
    if (stage === "CONFIRM") {
      return (
        "Connexion interrompue pendant la création. " +
        "Vérifiez d’abord vos formations avant de réessayer afin d’éviter un doublon."
      );
    }

    return (
      "Problème réseau. Vérifiez la connexion puis réessayez " +
      "sans sélectionner un autre fichier."
    );
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (stage === "PICK") {
    return "Impossible d’ouvrir le sélecteur de documents.";
  }

  if (stage === "LOAD") {
    return "Impossible de charger les catégories.";
  }

  return "L’opération SCORM n’a pas pu être réalisée.";
}

function Field({
  label,
  large = false,
  ...props
}: ComponentProps<typeof TextInput> & {
  label: string;
  large?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="mb-3">
      <Text
        className="mb-1.5 text-[11px] font-black"
        style={{ color: theme.colors.foreground }}
      >
        {label}
      </Text>

      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={theme.colors.foregroundSubtle}
        className={`rounded-[14px] border bg-[#FCFBFD] px-3.5 text-[13px] ${
          props.multiline ? "py-3" : "h-[50px]"
        }`}
        style={{
          color: theme.colors.foreground,
          borderColor: theme.colors.border,
          minHeight: props.multiline ? (large ? 110 : 82) : 50,
          textAlignVertical: props.multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  disabled,
  onPress,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="mb-3">
      <Text
        className="mb-1.5 text-[11px] font-black"
        style={{ color: theme.colors.foreground }}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value || "Non renseigné"}`}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-[50px] flex-row items-center rounded-[14px] border bg-[#FCFBFD] px-3.5"
        style={{
          borderColor: theme.colors.border,
          opacity: disabled ? 0.55 : 1,
        }}
      >
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1 text-[13px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {value}
        </Text>

        <View className="ml-2 h-7 w-7 items-center justify-center rounded-[9px] bg-[#F3EEFF]">
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            tintColor="#7C3AED"
            size={10}
            weight="bold"
          />
        </View>
      </Pressable>
    </View>
  );
}


export function TrainingCreationMethodScreen({
  onManual,
  onScorm,
  onCancel,
}: CreationMethodProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <ScreenContainer edges={["left", "right"]} style={{ paddingBottom: 0 }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: 16,
          paddingBottom: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mx-auto w-full max-w-[760px]">
          <View
            className="mb-4 overflow-hidden rounded-[22px] border bg-white"
            style={{ borderColor: theme.colors.border }}
          >
            <View className="h-1 bg-[#7C3AED]" />

            <View className="p-4">
              <View className="flex-row items-start">
                <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "plus.rectangle.on.folder.fill",
                      android: "note_add",
                      web: "note_add",
                    }}
                    tintColor="#7C3AED"
                    size={19}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-[10px] font-black uppercase tracking-[0.9px] text-[#7C3AED]">
                      Mode de création
                    </Text>

                    <View className="flex-row items-center rounded-full bg-[#EAFBF3] px-2.5 py-1">
                      <View className="mr-1.5 h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      <Text className="text-[8px] font-black text-[#16845A]">
                        Prêt
                      </Text>
                    </View>
                  </View>

                  <Text
                    className="mt-1 text-[22px] font-black leading-[27px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Comment voulez-vous créer votre formation ?
                  </Text>

                  <Text
                    className="mt-1.5 text-[10px] leading-[16px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Choisissez votre point de départ. Le contenu pourra être enrichi et réorganisé ensuite.
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Créer la formation manuellement"
            onPress={onManual}
            android_ripple={{ color: "transparent" }}
            className="mb-3 overflow-hidden rounded-[22px] border bg-white"
            style={{
              borderColor: "#DDD1F5",
              shadowColor: "#7C3AED",
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
            }}
          >
            <View className="h-1 bg-[#7C3AED]" />

            <View className="p-4">
              <View className="flex-row items-start">
                <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios: "square.and.pencil",
                      android: "edit",
                      web: "edit",
                    }}
                    tintColor="#7C3AED"
                    size={19}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[18px] font-black leading-[22px]"
                        style={{ color: theme.colors.foreground }}
                      >
                        Création manuelle
                      </Text>

                      <Text
                        className="mt-1 text-[10px] leading-[15px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Construisez votre formation étape par étape avec un contrôle complet.
                      </Text>
                    </View>

                    <View className="rounded-full bg-[#F7F3FC] px-2.5 py-1.5">
                      <Text className="text-[8px] font-black uppercase tracking-[0.5px] text-[#7C3AED]">
                        Sur mesure
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="mt-3 flex-row gap-2">
                <InlineFeature
                  icon={{
                    ios: "square.grid.2x2.fill",
                    android: "view_module",
                    web: "view_module",
                  }}
                  label="Structure"
                />
                <InlineFeature
                  icon={{
                    ios: "checkmark.circle.fill",
                    android: "quiz",
                    web: "quiz",
                  }}
                  label="Évaluations"
                />
                <InlineFeature
                  icon={{
                    ios: "paperclip",
                    android: "attach_file",
                    web: "attach_file",
                  }}
                  label="Ressources"
                />
              </View>

              <View
                className="mt-3 flex-row items-center rounded-[15px] px-3.5 py-3"
                style={{ backgroundColor: "#5B21B6" }}
              >
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[10px] font-black"
                    style={{ color: "#FFFFFF" }}
                  >
                    Créer de zéro
                  </Text>
                  <Text
                    className="mt-0.5 text-[8px]"
                    style={{ color: "rgba(255,255,255,0.78)" }}
                  >
                    Idéal pour une formation personnalisée
                  </Text>
                </View>

                <View
                  className="ml-3 h-9 w-9 items-center justify-center rounded-[11px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.16)" }}
                >
                  <SymbolView
                    name={{
                      ios: "arrow.right",
                      android: "arrow_forward",
                      web: "arrow_forward",
                    }}
                    tintColor="#FFFFFF"
                    size={13}
                    weight="bold"
                  />
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Importer un package SCORM"
            onPress={onScorm}
            android_ripple={{ color: "transparent" }}
            className="mb-3 overflow-hidden rounded-[22px] border"
            style={{
              backgroundColor: "#FCFAFF",
              borderColor: "#D8C9F8",
              shadowColor: "#7C3AED",
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.07,
              shadowRadius: 12,
            }}
          >
            <View className="h-1 bg-[#7C3AED]" />

            <View className="p-4">
              <View className="flex-row items-start">
                <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#EDE4FF]">
                  <SymbolView
                    name={{
                      ios: "shippingbox.fill",
                      android: "inventory_2",
                      web: "inventory_2",
                    }}
                    tintColor="#7C3AED"
                    size={19}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="min-w-0 flex-1">
                      <Text
                        className="text-[18px] font-black leading-[22px]"
                        style={{ color: theme.colors.foreground }}
                      >
                        Import SCORM
                      </Text>

                      <Text
                        className="mt-1 text-[10px] leading-[15px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Importez un fichier ZIP et préparez rapidement la base de la formation.
                      </Text>
                    </View>

                    <View className="flex-row items-center rounded-full bg-[#EDE4FF] px-2.5 py-1.5">
                      <SymbolView
                        name={{
                          ios: "bolt.fill",
                          android: "bolt",
                          web: "bolt",
                        }}
                        tintColor="#7C3AED"
                        size={9}
                        weight="bold"
                      />
                      <Text className="ml-1 text-[8px] font-black uppercase tracking-[0.5px] text-[#7C3AED]">
                        Rapide
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View
                className="mt-3 flex-row items-center rounded-[14px] border bg-white px-3 py-2.5"
                style={{ borderColor: "#DDD1F5" }}
              >
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F3EEFF]">
                  <SymbolView
                    name={{
                      ios: "sparkles",
                      android: "auto_awesome",
                      web: "auto_awesome",
                    }}
                    tintColor="#7C3AED"
                    size={14}
                    weight="bold"
                  />
                </View>

                <View className="ml-2.5 min-w-0 flex-1">
                  <Text
                    className="text-[10px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    Import intelligent
                  </Text>
                  <Text
                    numberOfLines={1}
                    className="mt-0.5 text-[8px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Analyse du package et préparation des métadonnées.
                  </Text>
                </View>

                <View className="ml-2 rounded-full bg-[#F8F6F9] px-2 py-1">
                  <Text
                    className="text-[7px] font-black uppercase"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    ZIP
                  </Text>
                </View>
              </View>

              <View
                className="mt-3 flex-row items-center rounded-[15px] px-3.5 py-3"
                style={{ backgroundColor: "#7C3AED" }}
              >
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-[10px] font-black"
                    style={{ color: "#FFFFFF" }}
                  >
                    Importer un package
                  </Text>
                  <Text
                    className="mt-0.5 text-[8px]"
                    style={{ color: "rgba(255,255,255,0.80)" }}
                  >
                    Sélectionnez votre fichier SCORM
                  </Text>
                </View>

                <View
                  className="ml-3 h-9 w-9 items-center justify-center rounded-[11px]"
                  style={{ backgroundColor: "rgba(255,255,255,0.18)" }}
                >
                  <SymbolView
                    name={{
                      ios: "arrow.up.doc.fill",
                      android: "upload_file",
                      web: "upload_file",
                    }}
                    tintColor="#FFFFFF"
                    size={13}
                    weight="bold"
                  />
                </View>
              </View>
            </View>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Annuler la création"
            onPress={onCancel}
            android_ripple={{ color: "transparent" }}
            className="mb-1 h-[50px] flex-row items-center justify-center rounded-[15px] border bg-white"
            style={{
              borderColor: "#DDD1F5",
              backgroundColor: "#FFFFFF",
            }}
          >
            <View className="mr-2 h-7 w-7 items-center justify-center rounded-[9px] bg-[#F3EEFF]">
              <SymbolView
                name={{
                  ios: "xmark",
                  android: "close",
                  web: "close",
                }}
                tintColor="#7C3AED"
                size={10}
                weight="bold"
              />
            </View>

            <Text
              className="text-[11px] font-black"
              style={{ color: "#5B21B6" }}
            >
              Annuler!
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function InlineFeature({
    icon,
    label,
  }: {
    icon: ComponentProps<typeof SymbolView>["name"];
    label: string;
  }) {
    return (
      <View
        className="min-w-0 flex-1 flex-row items-center justify-center rounded-[12px] px-2 py-2"
        style={{ backgroundColor: "#F7F3FC" }}
      >
        <SymbolView
          name={icon}
          tintColor="#6D5A7D"
          size={11}
        />
        <Text
          numberOfLines={1}
          className="ml-1.5 text-[8px] font-black"
          style={{ color: "#6D5A7D" }}
        >
          {label}
        </Text>
      </View>
    );
  }
}

export function ScormQuickCreateMobileScreen({
  role,
  onCreated,
  onBack,
}: QuickCreateProps) {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [categories, setCategories] =
    useState<MobileTrainingCategory[]>([]);
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [file, setFile] =
    useState<TrainerPickedFile | null>(null);
  const [analysis, setAnalysis] =
    useState<ScormQuickCreateAnalysisResponse | null>(null);
  const [mode, setMode] =
    useState<ScormQuickCreateMode>("SAFE");
  const [metadata, setMetadata] =
    useState<MetadataForm>(initialMetadata);
  const [picker, setPicker] =
    useState<PickerKind>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const [picking, setPicking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverFile, setCoverFile] =
    useState<TrainerPickedFile | null>(null);
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] =
    useState<PexelsCoverPhoto | null>(null);
  const [coverPreviewUri, setCoverPreviewUri] = useState("");
  const [selectingCover, setSelectingCover] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (left, right) =>
          (left.sortOrder ?? left.id) -
          (right.sortOrder ?? right.id),
      ),
    [categories],
  );

  useEffect(() => {
    if (role !== "ADMIN") {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      handleSystemBack,
    );

    return () => subscription.remove();
  }, [role]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(
      "keyboardDidHide",
      () => setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;

    void getScormQuickCreateCategories()
      .then((loaded) => {
        if (active) {
          setCategories(loaded);
          setError("");
        }
      })
      .catch((caught) => {
        if (active) {
          setError(readableError(caught, "LOAD"));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingCategories(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  function handleSystemBack() {
    if (role === "ADMIN") {
      onBack();
      return true;
    }

    return false;
  }

  function keepFocusedFieldVisible(event: any) {
    const target = event?.target;

    if (!target) {
      return;
    }

    setTimeout(() => {
      const responder = scrollRef.current as any;
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(
        target,
        115,
        true,
      );
    }, 140);
  }

  function field<K extends keyof MetadataForm>(
    key: K,
    value: MetadataForm[K],
  ) {
    setError("");
    setMetadata((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetAnalysis() {
    setAnalysis(null);
    setMode("SAFE");
    setUploadProgress(0);
    setMetadata(initialMetadata);
    setCoverFile(null);
    setSelectedPexelsPhoto(null);
    setCoverPreviewUri("");
  }

  async function chooseFile() {
    if (picking || analyzing || confirming) {
      return;
    }

    setPicking(true);
    setError("");
    setNotice("");

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/zip",
          "application/x-zip-compressed",
          "application/octet-stream",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.name || !asset.name.toLowerCase().endsWith(".zip")) {
        setError("Sélectionnez un package SCORM au format ZIP.");
        return;
      }

      if (
        typeof asset.size === "number" &&
        asset.size <= 0
      ) {
        setError("Le fichier ZIP sélectionné est vide.");
        return;
      }

      const picked: TrainerPickedFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType || "application/zip",
        size: asset.size,
        webFile: asset.file ?? null,
      };

      setFile(picked);
      resetAnalysis();

      if (
        typeof picked.size === "number" &&
        picked.size >= LARGE_FILE_WARNING_BYTES
      ) {
        setNotice(
          "Fichier volumineux détecté. Gardez l’application au premier plan " +
            "pendant l’envoi ; la limite de sécurité définitive est contrôlée par le backend.",
        );
      } else {
        setNotice(
          "Package prêt pour l’analyse. Aucune formation n’est créée à cette étape.",
        );
      }
    } catch (caught) {
      setError(readableError(caught, "PICK"));
    } finally {
      setPicking(false);
    }
  }

  async function chooseCover() {
    if (confirming || analyzing || selectingCover) {
      return;
    }

    setSelectingCover(true);
    setError("");
    setNotice("");

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (!asset?.uri) {
        setError("La couverture sélectionnée n’a pas pu être préparée.");
        return;
      }

      const webFile =
        (asset as typeof asset & { file?: File }).file ?? null;
      const fileSize = asset.fileSize ?? webFile?.size ?? null;
      const mimeType = normalizeCoverMimeType(
        asset.mimeType,
        asset.fileName || webFile?.name || asset.uri,
      );

      if (!mimeType) {
        setError(
          "Format non autorisé. Utilisez une image JPEG, PNG ou WebP.",
        );
        return;
      }

      if (fileSize !== null && fileSize > COVER_MAX_SIZE_BYTES) {
        setError("La couverture ne doit pas dépasser 10 Mo.");
        return;
      }

      const fileName =
        asset.fileName?.trim() ||
        webFile?.name ||
        `cover-${Date.now()}.${coverFileExtension(mimeType)}`;

      setCoverFile({
        uri: asset.uri,
        name: fileName,
        mimeType,
        size: fileSize,
        webFile,
      });
      setSelectedPexelsPhoto(null);
      setCoverPreviewUri(asset.uri);
      setNotice(
        "Couverture prête. Elle sera ajoutée automatiquement à la formation.",
      );
    } catch {
      setError("Impossible d’ouvrir la bibliothèque d’images.");
    } finally {
      setSelectingCover(false);
    }
  }

  async function analyze() {
    if (!file || analyzing || confirming) {
      return;
    }

    setAnalyzing(true);
    setError("");
    setNotice("");
    setUploadProgress(0);

    try {
      const analyzed = await analyzeScormQuickCreateMobile(
        file,
        setUploadProgress,
      );

      const previewed = await previewScormQuickCreateMobile(
        analyzed.temporaryImportId,
      );

      if (
        previewed.temporaryImportId !== analyzed.temporaryImportId ||
        previewed.checksumSha256 !== analyzed.checksumSha256
      ) {
        throw new Error(
          "La prévisualisation ne correspond pas au package analysé.",
        );
      }

      setAnalysis(previewed);
      setMode(
        previewed.structuredAvailable &&
          previewed.proposedMode === "STRUCTURED"
          ? "STRUCTURED"
          : "SAFE",
      );
      setMetadata({
        ...initialMetadata,
        title:
          previewed.detectedTitle?.trim() ||
          cleanFileTitle(file.name),
      });
      setNotice(
        "Analyse terminée. Vérifiez le contenu détecté puis complétez les informations de la formation.",
      );
    } catch (caught) {
      setAnalysis(null);
      setMode("SAFE");
      setError(readableError(caught, "ANALYZE"));
    } finally {
      setAnalyzing(false);
    }
  }

  function validateMetadata(): string | null {
    if (!analysis) {
      return "Analysez d’abord le package SCORM.";
    }

    if (!metadata.title.trim()) {
      return "Le titre de la formation est obligatoire.";
    }

    if (!metadata.categoryId) {
      return "Choisissez une catégorie.";
    }

    if (!metadata.language) {
      return "Choisissez la langue.";
    }

    if (!metadata.level) {
      return "Choisissez le niveau.";
    }

    const duration = Number(metadata.durationHours);

    if (
      !metadata.durationHours.trim() ||
      !Number.isFinite(duration) ||
      duration < 0
    ) {
      return "Renseignez une durée estimée positive ou égale à zéro.";
    }

    if (!metadata.visibility) {
      return "Choisissez la visibilité.";
    }

    if (!metadata.enrollmentMode) {
      return "Choisissez le mode d’inscription.";
    }

    if (
      metadata.enrollmentMode === "ACCESS_CODE" &&
      !metadata.accessCode.trim()
    ) {
      return "Le code d’accès est obligatoire pour ce mode d’inscription.";
    }

    if (metadata.maxLearners.trim()) {
      const maxLearners = Number(metadata.maxLearners);

      if (
        !Number.isFinite(maxLearners) ||
        maxLearners < 0
      ) {
        return "Le nombre maximal de participants doit être positif ou égal à zéro.";
      }
    }

    return null;
  }

  function continueAfterCoverFailure(trainingId: number) {
    const message =
      "La formation SCORM a bien été créée, mais la couverture n’a pas pu être enregistrée. Vous pourrez la définir depuis l’éditeur de la formation.";

    if (Platform.OS === "web") {
      console.warn(message);
      onCreated(trainingId);
      return;
    }

    Alert.alert(
      "Formation créée",
      message,
      [
        {
          text: "Continuer",
          onPress: () => onCreated(trainingId),
        },
      ],
      { cancelable: false },
    );
  }

  async function createDraft() {
    if (confirming || analyzing) {
      return;
    }

    const validation = validateMetadata();

    if (validation) {
      setError(validation);
      return;
    }

    if (
      !analysis ||
      !metadata.categoryId ||
      !metadata.level ||
      !metadata.visibility ||
      !metadata.enrollmentMode
    ) {
      setError("Les informations obligatoires sont incomplètes.");
      return;
    }

    setConfirming(true);
    setError("");
    setNotice("");

    try {
      const result = await confirmScormQuickCreateMobile(
        analysis.temporaryImportId,
        {
          title: metadata.title.trim(),
          shortDescription:
            buildShortDescription(
              metadata.description,
              metadata.shortDescription,
            ) || undefined,
          description:
            metadata.description.trim() || undefined,
          objectives:
            metadata.objectives.trim() || undefined,
          prerequisites:
            metadata.prerequisites.trim() || undefined,
          targetAudience:
            metadata.targetAudience.trim() || undefined,
          categoryId: metadata.categoryId,
          language: metadata.language,
          level: metadata.level,
          estimatedDurationHours: Number(metadata.durationHours),
          visibility: metadata.visibility,
          enrollmentMode: metadata.enrollmentMode,
          accessCode:
            metadata.enrollmentMode === "ACCESS_CODE"
              ? metadata.accessCode.trim()
              : undefined,
          maxLearners:
            metadata.maxLearners.trim()
              ? Number(metadata.maxLearners)
              : undefined,
          mode:
            mode === "STRUCTURED" &&
            analysis.structuredAvailable
              ? "STRUCTURED"
              : "SAFE",
        },
      );

      if (
        !result.trainingId ||
        result.status !== "DRAFT"
      ) {
        throw new Error(
          "SmartTraining n’a pas confirmé la création de la formation.",
        );
      }

      if (selectedPexelsPhoto) {
        try {
          await importPexelsTrainingCover(
            result.trainingId,
            selectedPexelsPhoto.id,
          );
        } catch {
          continueAfterCoverFailure(result.trainingId);
          return;
        }
      } else if (coverFile) {
        try {
          if (role === "ADMIN") {
            await uploadAdminTrainingCover(result.trainingId, coverFile);
          } else {
            await uploadTrainerTrainingCover(result.trainingId, coverFile);
          }
        } catch {
          continueAfterCoverFailure(result.trainingId);
          return;
        }
      }

      setNotice("Formation créée.");
      onCreated(result.trainingId);
    } catch (caught) {
      setError(readableError(caught, "CONFIRM"));
    } finally {
      setConfirming(false);
    }
  }

  function pickerOptions(): PickerOption[] {
    if (picker === "CATEGORY") {
      return sortedCategories.map((category) => ({
        key: String(category.id),
        label: category.name,
      }));
    }

    if (picker === "LANGUAGE") {
      return [
        { key: "fr", label: "Français" },
        { key: "en", label: "English" },
        { key: "ar", label: "Arabe" },
      ];
    }

    if (picker === "LEVEL") {
      return [
        { key: "DEBUTANT", label: "Débutant" },
        { key: "INTERMEDIAIRE", label: "Intermédiaire" },
        { key: "AVANCE", label: "Avancé" },
      ];
    }

    if (picker === "VISIBILITY") {
      return [
        { key: "PRIVATE", label: "Privée" },
        { key: "PUBLIC", label: "Publique" },
        { key: "ASSIGNED_ONLY", label: "Affectation uniquement" },
      ];
    }

    return [
      { key: "ASSIGNMENT_ONLY", label: "Affectation" },
      { key: "SELF_ENROLLMENT", label: "Auto-inscription" },
      { key: "ACCESS_CODE", label: "Code d’accès" },
      { key: "INVITATION", label: "Invitation" },
    ];
  }

  function pickerTitle(): string {
    if (picker === "CATEGORY") return "Choisir une catégorie";
    if (picker === "LANGUAGE") return "Choisir une langue";
    if (picker === "LEVEL") return "Choisir un niveau";
    if (picker === "VISIBILITY") return "Choisir la visibilité";
    if (picker === "ENROLLMENT") return "Mode d’inscription";
    return "Choisir";
  }

  function selectOption(option: PickerOption) {
    if (picker === "CATEGORY") {
      const category = sortedCategories.find(
        (item) => String(item.id) === option.key,
      );

      if (category) {
        setError("");
        setMetadata((current) => ({
          ...current,
          categoryId: category.id,
          categoryLabel: category.name,
        }));
      }
    } else if (picker === "LANGUAGE") {
      field("language", option.key);
    } else if (picker === "LEVEL") {
      field("level", option.key as MobileTrainingLevel);
    } else if (picker === "VISIBILITY") {
      field(
        "visibility",
        option.key as MobileTrainingVisibility,
      );
    } else if (picker === "ENROLLMENT") {
      field(
        "enrollmentMode",
        option.key as MobileEnrollmentMode,
      );
    }

    setPicker(null);
  }

  if (loadingCategories) {
    return (
      <LoadingState message="Préparation de l’import SCORM..." />
    );
  }

  const busy =
    picking || analyzing || confirming || selectingCover;
  const progressWidth =
    `${Math.max(0, Math.min(100, uploadProgress))}%` as `${number}%`;

  const languageValue =
    metadata.language === "fr"
      ? "Français"
      : metadata.language === "en"
        ? "English"
        : metadata.language === "ar"
          ? "Arabe"
          : "Choisir une langue";

  const levelValue =
    metadata.level === "DEBUTANT"
      ? "Débutant"
      : metadata.level === "INTERMEDIAIRE"
        ? "Intermédiaire"
        : metadata.level === "AVANCE"
          ? "Avancé"
          : "Choisir un niveau";

  const visibilityValue =
    metadata.visibility === "PRIVATE"
      ? "Privée"
      : metadata.visibility === "PUBLIC"
        ? "Publique"
        : metadata.visibility === "ASSIGNED_ONLY"
          ? "Affectation uniquement"
          : "Choisir la visibilité";

  const enrollmentValue =
    metadata.enrollmentMode === "ASSIGNMENT_ONLY"
      ? "Affectation"
      : metadata.enrollmentMode === "SELF_ENROLLMENT"
        ? "Auto-inscription"
        : metadata.enrollmentMode === "ACCESS_CODE"
          ? "Code d’accès"
          : metadata.enrollmentMode === "INVITATION"
            ? "Invitation"
            : "Choisir un mode";

  return (
    <ScreenContainer edges={["left", "right"]} style={{ paddingBottom: 0 }}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: keyboardVisible
                ? 190
                : Math.max(34, insets.bottom + 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <View
              className="mb-4 overflow-hidden rounded-[22px] border bg-white"
              style={{ borderColor: theme.colors.border }}
            >
              <View className="h-1 bg-[#7C3AED]" />

              <View className="p-4">
                <View className="flex-row items-start">
                  <View className="h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#F1E9FF]">
                    <SymbolView
                      name={{
                        ios: "shippingbox.fill",
                        android: "inventory_2",
                        web: "inventory_2",
                      }}
                      tintColor="#7C3AED"
                      size={19}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-[10px] font-black uppercase tracking-[0.9px] text-[#7C3AED]">
                        Admin · Import SCORM
                      </Text>

                      <View
                        className="flex-row items-center rounded-full px-2.5 py-1"
                        style={{
                          backgroundColor: analysis ? "#EAFBF3" : "#F3EEFF",
                        }}
                      >
                        <View
                          className="mr-1.5 h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: analysis ? "#10B981" : "#7C3AED",
                          }}
                        />
                        <Text
                          className="text-[8px] font-black"
                          style={{
                            color: analysis ? "#16845A" : "#7C3AED",
                          }}
                        >
                          {analysis ? "Analysé" : "Prêt"}
                        </Text>
                      </View>
                    </View>

                    <Text
                      className="mt-1 text-[23px] font-black leading-[28px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      Importer un package SCORM
                    </Text>

                    <Text
                      className="mt-1.5 text-[11px] leading-[17px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Sélectionnez le ZIP, analysez son contenu puis finalisez les informations de la formation.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row rounded-[15px] bg-[#F8F6F9] p-1">
                  {[
                    ["1", "Package", Boolean(file)],
                    ["2", "Analyse", Boolean(analysis)],
                    ["3", "Finaliser", false],
                  ].map(([number, label, done], index) => {
                    const active =
                      (!analysis && index === 0) ||
                      (analysis && index === 1);

                    return (
                      <View
                        key={String(label)}
                        className="min-h-[38px] min-w-0 flex-1 flex-row items-center justify-center rounded-[12px] px-2"
                        style={{
                          backgroundColor: active
                            ? theme.colors.accent
                            : done
                              ? "#F3EEFF"
                              : "transparent",
                        }}
                      >
                        {done && !active ? (
                          <SymbolView
                            name={{
                              ios: "checkmark.circle.fill",
                              android: "check_circle",
                              web: "check_circle",
                            }}
                            tintColor={theme.colors.accent}
                            size={12}
                            weight="bold"
                          />
                        ) : (
                          <Text
                            className="text-[9px] font-black"
                            style={{
                              color: active
                                ? theme.colors.accentForeground
                                : theme.colors.foregroundSubtle,
                            }}
                          >
                            {number}
                          </Text>
                        )}

                        <Text
                          className="ml-1 text-[8px] font-extrabold"
                          style={{
                            color: active
                              ? theme.colors.accentForeground
                              : done
                                ? theme.colors.accent
                                : theme.colors.foregroundSubtle,
                          }}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>

            {role === "ADMIN" ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.noticeText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  Après création, attribuez le formateur responsable dans
                  l’éditeur Admin avant une modification ultérieure.
                </Text>
              </View>
            ) : null}

            {error && !analysis ? (
              <View
                className="mb-3 flex-row items-start rounded-[16px] border px-3.5 py-3"
                style={{
                  backgroundColor: "#FFF4F2",
                  borderColor: "#F2C6C3",
                }}
              >
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
                  <Text className="text-[10px] font-black text-[#C2413D]">
                    Import impossible
                  </Text>
                  <Text
                    className="mt-0.5 text-[9px] leading-[14px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {error}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fermer le message"
                  onPress={() => setError("")}
                  className="ml-2 h-7 w-7 items-center justify-center rounded-[9px] bg-white"
                >
                  <SymbolView
                    name={{
                      ios: "xmark",
                      android: "close",
                      web: "close",
                    }}
                    tintColor="#C2413D"
                    size={10}
                    weight="bold"
                  />
                </Pressable>
              </View>
            ) : null}

            {notice ? (
              <View
                style={[
                  styles.notice,
                  {
                    backgroundColor: theme.colors.surfaceSoft,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.noticeText,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {notice}
                </Text>
              </View>
            ) : null}

            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <View className="mb-4 flex-row items-center">
                <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F3EEFF]">
                  <SymbolView
                    name={{
                      ios: "shippingbox.fill",
                      android: "inventory_2",
                      web: "inventory_2",
                    }}
                    tintColor={theme.colors.accent}
                    size={18}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    className="text-[16px] font-black leading-[20px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Package SCORM
                  </Text>
                  <Text
                    className="mt-0.5 text-[10px] leading-[15px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Compatible SCORM 1.2 et SCORM 2004
                  </Text>
                </View>

                <View className="rounded-full bg-[#F8F6F3] px-2.5 py-1">
                  <Text
                    className="text-[8px] font-black uppercase tracking-[0.5px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    .ZIP
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choisir un package SCORM ZIP"
                disabled={busy}
                onPress={() => void chooseFile()}
                android_ripple={{ color: "transparent" }}
                style={[
                  styles.filePicker,
                  {
                    opacity: busy ? 0.6 : 1,
                    backgroundColor: file ? "#F7F2FF" : "#FCFBF9",
                    borderColor: file ? "#CDB5FF" : "#DED8E2",
                  },
                ]}
              >
                <View
                  className="h-11 w-11 items-center justify-center rounded-[14px]"
                  style={{ backgroundColor: file ? "#EDE4FF" : "#F3EEFF" }}
                >
                  <SymbolView
                    name={{
                      ios: file ? "doc.zipper" : "arrow.up.doc.fill",
                      android: file ? "folder_zip" : "upload_file",
                      web: file ? "folder_zip" : "upload_file",
                    }}
                    tintColor={theme.colors.accent}
                    size={20}
                    weight="bold"
                  />
                </View>

                <View className="ml-3 min-w-0 flex-1">
                  <Text
                    numberOfLines={2}
                    className="text-[13px] font-black leading-[17px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    {file ? file.name : "Sélectionner un fichier ZIP"}
                  </Text>

                  <Text
                    className="mt-1 text-[9px] leading-[13px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {file
                      ? `${formatBytes(file.size)} · prêt pour l’analyse`
                      : "Parcourez les fichiers de votre appareil"}
                  </Text>
                </View>

                <View className="h-9 w-9 items-center justify-center rounded-[12px] bg-white">
                  <SymbolView
                    name={{
                      ios: file ? "checkmark" : "chevron.right",
                      android: file ? "check" : "chevron_right",
                      web: file ? "check" : "chevron_right",
                    }}
                    tintColor={theme.colors.accent}
                    size={15}
                    weight="bold"
                  />
                </View>
              </Pressable>

              {analyzing || uploadProgress > 0 ? (
                <View style={styles.progressBlock}>
                  <View
                    style={[
                      styles.progressTrack,
                      { backgroundColor: theme.colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: progressWidth,
                          backgroundColor: theme.colors.accent,
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {analyzing
                      ? `Envoi et analyse : ${uploadProgress}%`
                      : `Envoi : ${uploadProgress}%`}
                  </Text>
                </View>
              ) : null}

              <View className="mt-4">
                <AppButton
                  title={analyzing ? "Analyse..." : "Analyser le package"}
                  onPress={() => void analyze()}
                  loading={analyzing}
                  disabled={!file || picking || confirming}
                  style={{ width: "100%" }}
                />

                <Pressable
                  accessibilityRole="button"
                  onPress={onBack}
                  disabled={busy}
                  android_ripple={{ color: "transparent" }}
                  className="mt-2 min-h-[42px] items-center justify-center rounded-[14px]"
                >
                  <Text
                    className="text-[11px] font-extrabold"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Changer de méthode
                  </Text>
                </Pressable>
              </View>
            </View>

            {analysis ? (
              <>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderRadius: theme.shape.cardRadius,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  <View className="mb-1 flex-row items-center">
                    <View
                      className="h-9 w-9 items-center justify-center rounded-xl"
                      style={{ backgroundColor: theme.colors.accent }}
                    >
                      <Text
                        className="text-[12px] font-black"
                        style={{ color: theme.colors.accentForeground }}
                      >
                        2
                      </Text>
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-[18px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Analyse et prévisualisation
                      </Text>
                      <Text
                        className="mt-0.5 text-[10px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Vérifiez ce que SmartTraining a détecté.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badges}>
                    {[
                      versionLabel(analysis.scormVersion),
                      `${analysis.scoCount} contenu(s)`,
                      `${analysis.itemCount} élément(s)`,
                    ].map((label) => (
                      <View
                        key={label}
                        style={[
                          styles.tag,
                          {
                            backgroundColor: theme.colors.surfaceSoft,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tagText,
                            { color: theme.colors.foreground },
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text
                    style={[
                      styles.infoLabel,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    TITRE DÉTECTÉ
                  </Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {analysis.detectedTitle || "Non détecté"}
                  </Text>

                  <Text
                    style={[
                      styles.infoLabel,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    ORGANISATION
                  </Text>
                  <Text
                    style={[
                      styles.infoValue,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {analysis.organizationTitle || "Non déterminée"}
                  </Text>

                  <Text
                    style={[
                      styles.previewHeading,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Structure proposée
                  </Text>

                  {analysis.preview.map((module, moduleIndex) => (
                    <View
                      key={`${module.title}-${moduleIndex}`}
                      style={[
                        styles.previewModule,
                        {
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.previewModuleTitle,
                          { color: theme.colors.foreground },
                        ]}
                      >
                        {module.title}
                      </Text>

                      {module.lessons.map((lesson, lessonIndex) => (
                        <Text
                          key={`${lesson.title}-${lessonIndex}`}
                          style={[
                            styles.previewLesson,
                            { color: theme.colors.foregroundMuted },
                          ]}
                        >
                          {`${lessonIndex + 1}. ${lesson.title}`}
                        </Text>
                      ))}
                    </View>
                  ))}

                  {!analysis.structuredAvailable ? (
                    <Text
                      style={[
                        styles.warningText,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      La structure détaillée n’est pas assez fiable :
                      SmartTraining conservera automatiquement le contenu
                      dans une organisation sûre et simple.
                    </Text>
                  ) : null}
                </View>

                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      borderRadius: theme.shape.cardRadius,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    3. Finaliser la formation
                  </Text>

                  <Text
                    style={[
                      styles.cardText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Vérifiez les informations proposées et complétez ce qui
                    manque avant de créer la formation.
                  </Text>

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Titre"
                    value={metadata.title}
                    onChangeText={(value) => field("title", value)}
                    placeholder="Titre de la formation"
                  />

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Description de la formation"
                    value={metadata.description}
                    onChangeText={(value) =>
                      field("description", value)
                    }
                    placeholder="Présentez clairement le contenu de la formation"
                    multiline
                    large
                  />

                  <Text
                    style={[
                      styles.fieldHelp,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Le résumé affiché dans les cartes sera généré automatiquement.
                  </Text>

                  <View style={styles.coverSection}>
                    <Text
                      style={[
                        styles.label,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      Couverture de la formation
                    </Text>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Choisir la couverture de la formation"
                      disabled={busy}
                      onPress={() => void chooseCover()}
                      style={({ pressed }) => [
                        styles.coverPicker,
                        {
                          opacity: busy ? 0.6 : 1,
                          backgroundColor: pressed
                            ? theme.colors.surfaceSoft
                            : theme.colors.background,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      {coverPreviewUri ? (
                        <Image
                          source={{ uri: coverPreviewUri }}
                          resizeMode="contain"
                          accessibilityLabel="Aperçu de la couverture"
                          style={[
                            styles.coverPreview,
                            { backgroundColor: theme.colors.surfaceSoft },
                          ]}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.coverPlaceholder,
                            { color: theme.colors.foregroundMuted },
                          ]}
                        >
                          Ajouter une image
                        </Text>
                      )}
                    </Pressable>

                    <PexelsCoverPicker
                      selectedPhoto={selectedPexelsPhoto}
                      initialQuery={metadata.title}
                      disabled={busy}
                      onSelect={(photo) => {
                        setCoverFile(null);
                        setSelectedPexelsPhoto(photo);
                        setCoverPreviewUri(
                          photo.landscapeUrl || photo.previewUrl,
                        );
                        setError("");
                        setNotice(
                          "Couverture Pexels prête. Elle sera importée automatiquement à la création.",
                        );
                      }}
                    />

                    <Text
                      style={[
                        styles.coverHelp,
                        { color: theme.colors.foregroundMuted },
                      ]}
                    >
                      JPEG, PNG ou WebP · 10 Mo maximum · recadrage 16:9 avant validation.
                    </Text>
                  </View>

                  <SelectField
                    label="Catégorie"
                    value={
                      metadata.categoryLabel ||
                      "Choisir une catégorie"
                    }
                    disabled={busy}
                    onPress={() => setPicker("CATEGORY")}
                  />

                  <SelectField
                    label="Langue"
                    value={languageValue}
                    disabled={busy}
                    onPress={() => setPicker("LANGUAGE")}
                  />

                  <SelectField
                    label="Niveau"
                    value={levelValue}
                    disabled={busy}
                    onPress={() => setPicker("LEVEL")}
                  />

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Durée estimée (h)"
                    value={metadata.durationHours}
                    onChangeText={(value) =>
                      field("durationHours", value)
                    }
                    keyboardType="numeric"
                    placeholder="Ex. 2"
                  />

                  <SelectField
                    label="Visibilité"
                    value={visibilityValue}
                    disabled={busy}
                    onPress={() => setPicker("VISIBILITY")}
                  />

                  <SelectField
                    label="Mode d’inscription"
                    value={enrollmentValue}
                    disabled={busy}
                    onPress={() => setPicker("ENROLLMENT")}
                  />

                  {metadata.enrollmentMode === "ACCESS_CODE" ? (
                    <Field
                      onFocus={keepFocusedFieldVisible}
                      label="Code d’accès"
                      value={metadata.accessCode}
                      onChangeText={(value) =>
                        field("accessCode", value)
                      }
                      autoCapitalize="characters"
                    />
                  ) : null}

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Participants max. (optionnel)"
                    value={metadata.maxLearners}
                    onChangeText={(value) =>
                      field("maxLearners", value)
                    }
                    keyboardType="numeric"
                    placeholder="Ex. 30"
                  />

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Objectifs pédagogiques (optionnel)"
                    value={metadata.objectives}
                    onChangeText={(value) =>
                      field("objectives", value)
                    }
                    multiline
                  />

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Prérequis (optionnel)"
                    value={metadata.prerequisites}
                    onChangeText={(value) =>
                      field("prerequisites", value)
                    }
                    multiline
                  />

                  <Field
                    onFocus={keepFocusedFieldVisible}
                    label="Public cible (optionnel)"
                    value={metadata.targetAudience}
                    onChangeText={(value) =>
                      field("targetAudience", value)
                    }
                    multiline
                  />

                  {error && analysis ? (
                    <View
                      className="mb-3 flex-row items-start rounded-[16px] border px-3.5 py-3"
                      style={{
                        backgroundColor: "#FFF4F2",
                        borderColor: "#F2C6C3",
                      }}
                    >
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
                        <Text className="text-[10px] font-black text-[#C2413D]">
                          Vérifiez les informations
                        </Text>
                        <Text
                          className="mt-0.5 text-[9px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {error}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  <AppButton
                    title={
                      confirming
                        ? "Création..."
                        : "Créer la formation"
                    }
                    onPress={() => void createDraft()}
                    loading={confirming}
                    disabled={analyzing || picking}
                    style={styles.createButton}
                  />
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>

        <Modal
          visible={picker !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (role === "ADMIN" && handleSystemBack()) {
              return;
            }

            setPicker(null);
          }}
        >
          <View style={[styles.modalBackdrop, { paddingBottom: Math.max(14, insets.bottom + 8) }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer le sélecteur"
              style={styles.modalDismissArea}
              onPress={() => setPicker(null)}
            />

            <View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.modalTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                {pickerTitle()}
              </Text>

              <ScrollView
                style={styles.modalList}
                showsVerticalScrollIndicator={false}
              >
                {pickerOptions().map((option) => (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    onPress={() => selectOption(option)}
                    style={[
                      styles.option,
                      { borderBottomColor: theme.colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.optionLabel,
                        { color: theme.colors.foreground },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  keyboard: { flex: 1, minHeight: 0 },
  scroll: { flex: 1, minHeight: 0 },
  content: { flexGrow: 1, paddingBottom: 34 },
  page: { width: "100%", maxWidth: 760, alignSelf: "center" },
  methodContent: { flexGrow: 1, paddingBottom: 36 },
  methodPage: { width: "100%", maxWidth: 760, alignSelf: "center" },
  eyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1, marginBottom: 6 },
  pageTitle: { fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.7 },
  pageSubtitle: { fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 14 },
  methodGrid: { gap: 10 },
  methodCard: { padding: 18 },
  methodCardTitle: { fontSize: 18, fontWeight: "900" },
  methodCardText: { fontSize: 12, lineHeight: 18, marginTop: 6 },
  methodCardCta: { fontSize: 11, fontWeight: "900", marginTop: 14 },
  cancelButton: { marginTop: 14, alignSelf: "flex-start", minWidth: 140 },
  notice: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  noticeText: { fontSize: 10, lineHeight: 16, fontWeight: "700" },
  card: {
    padding: 16,
    marginBottom: 14,
    borderRadius: 22,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.035,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: "900" },
  cardText: { fontSize: 10, lineHeight: 16, marginTop: 4, marginBottom: 12 },
  filePicker: {
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  fileName: { fontSize: 13, lineHeight: 17, fontWeight: "900" },
  fileMeta: { fontSize: 9, lineHeight: 13, marginTop: 4 },
  progressBlock: { marginTop: 12 },
  progressTrack: { height: 6, borderRadius: 999, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999 },
  progressText: { fontSize: 9, fontWeight: "700", marginTop: 5 },
  inlineActions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  inlineButton: { minWidth: 160, flexGrow: 1, flexBasis: 160 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10, marginBottom: 10 },
  tag: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  tagText: { fontSize: 8, fontWeight: "900" },
  infoLabel: { fontSize: 8, fontWeight: "900", letterSpacing: 0.5, marginTop: 9 },
  infoValue: { fontSize: 11, lineHeight: 16, fontWeight: "800", marginTop: 2 },
  previewHeading: { fontSize: 11, fontWeight: "900", marginTop: 14, marginBottom: 7 },
  previewModule: { borderWidth: 1, borderRadius: 15, padding: 11, marginBottom: 7 },
  previewModuleTitle: { fontSize: 11, fontWeight: "900" },
  previewLesson: { fontSize: 9, lineHeight: 14, marginTop: 4 },
  warningText: { fontSize: 9, lineHeight: 14, marginTop: 7, fontWeight: "700" },
  fieldHelp: { fontSize: 10, lineHeight: 15, marginTop: 5 },
  coverSection: { marginTop: 14 },
  coverPicker: {
    minHeight: 140,
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  coverPreview: { width: "100%", height: 160 },
  coverPlaceholder: { fontSize: 11, fontWeight: "800" },
  coverHelp: { fontSize: 9, lineHeight: 14, marginTop: 6 },
  field: { marginTop: 12 },
  label: { fontSize: 10, fontWeight: "900", marginBottom: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
  },
  multiline: { minHeight: 84, textAlignVertical: "top" },
  largeInput: { minHeight: 110 },
  select: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  selectText: { flex: 1, fontSize: 13, fontWeight: "700" },
  chevron: { fontSize: 20, fontWeight: "500" },
  createButton: { marginTop: 16 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
    padding: 12,
  },
  modalDismissArea: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  modalCard: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 680,
    maxHeight: "76%",
    alignSelf: "center",
    borderWidth: 1,
    padding: 14,
    borderRadius: 26,
  },
  modalTitle: { fontSize: 17, fontWeight: "900", marginBottom: 8 },
  modalList: { minHeight: 70 },
  option: { paddingVertical: 11, paddingHorizontal: 11, borderBottomWidth: 1, borderRadius: 12 },
  optionLabel: { fontSize: 12, fontWeight: "800" },
});
