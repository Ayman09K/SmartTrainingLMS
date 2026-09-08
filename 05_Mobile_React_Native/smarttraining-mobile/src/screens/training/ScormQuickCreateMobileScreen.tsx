import { isAxiosError } from "axios";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import {
  Image,
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
import ErrorMessage from "../../components/ErrorMessage";
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
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>

      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        placeholderTextColor={theme.colors.foregroundSubtle}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          large && styles.largeInput,
          {
            color: theme.colors.foreground,
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
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
    <View style={styles.field}>
      <Text
        style={[
          styles.label,
          { color: theme.colors.foregroundMuted },
        ]}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.select,
          {
            opacity: disabled ? 0.55 : 1,
            backgroundColor: pressed
              ? theme.colors.surfaceSoft
              : theme.colors.background,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.selectText,
            { color: theme.colors.foreground },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            styles.chevron,
            { color: theme.colors.accent },
          ]}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          ▾
        </Text>
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
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.methodContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.methodPage}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.colors.accent },
            ]}
          >
            NOUVELLE FORMATION
          </Text>

          <Text
            style={[
              styles.pageTitle,
              { color: theme.colors.foreground },
            ]}
          >
            Comment souhaitez-vous commencer ?
          </Text>

          <Text
            style={[
              styles.pageSubtitle,
              { color: theme.colors.foregroundMuted },
            ]}
          >
            La création manuelle reste disponible. Vous pouvez aussi partir
            d’un package SCORM existant.
          </Text>

          <View style={styles.methodGrid}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Créer la formation manuellement"
              onPress={onManual}
              style={({ pressed }) => [
                styles.methodCard,
                {
                  backgroundColor: pressed
                    ? theme.colors.surfaceSoft
                    : theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.methodCardTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Créer manuellement
              </Text>
              <Text
                style={[
                  styles.methodCardText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Renseignez les informations puis construisez modules,
                leçons, quiz et ressources.
              </Text>
              <Text
                style={[
                  styles.methodCardCta,
                  { color: theme.colors.accent },
                ]}
              >
                Ouvrir le formulaire →
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Importer un package SCORM"
              onPress={onScorm}
              style={({ pressed }) => [
                styles.methodCard,
                {
                  backgroundColor: pressed
                    ? theme.colors.surfaceSoft
                    : theme.colors.surface,
                  borderColor: theme.colors.accent,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.methodCardTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Importer un SCORM
              </Text>
              <Text
                style={[
                  styles.methodCardText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Choisissez le ZIP : SmartTraining l’analyse, prépare le
                contenu et vous guide jusqu’à la création.
              </Text>
              <Text
                style={[
                  styles.methodCardCta,
                  { color: theme.colors.accent },
                ]}
              >
                Choisir un package →
              </Text>
            </Pressable>
          </View>

          <AppButton
            title="Annuler"
            variant="secondary"
            onPress={onCancel}
            style={styles.cancelButton}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export function ScormQuickCreateMobileScreen({
  role,
  onCreated,
  onBack,
}: QuickCreateProps) {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();

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

  const [picking, setPicking] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [coverFile, setCoverFile] =
    useState<TrainerPickedFile | null>(null);
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

      if (coverFile) {
        try {
          if (role === "ADMIN") {
            await uploadAdminTrainingCover(result.trainingId, coverFile);
          } else {
            await uploadTrainerTrainingCover(result.trainingId, coverFile);
          }
        } catch {
          onCreated(result.trainingId);
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
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.page}>
            <Text
              style={[
                styles.eyebrow,
                { color: theme.colors.accent },
              ]}
            >
              IMPORT SCORM · MOBILE
            </Text>

            <Text
              style={[
                styles.pageTitle,
                { color: theme.colors.foreground },
              ]}
            >
              Créer une formation depuis un SCORM
            </Text>

            <Text
              style={[
                styles.pageSubtitle,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Importez le ZIP, vérifiez ce que SmartTraining a détecté,
              ajoutez la couverture puis créez la formation.
            </Text>

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
              <ErrorMessage
                message={error}
                onRetry={() => setError("")}
              />
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
              <Text
                style={[
                  styles.cardTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                1. Package SCORM
              </Text>

              <Text
                style={[
                  styles.cardText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Sélectionnez un ZIP SCORM 1.2 ou 2004 depuis l’appareil.
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choisir un package SCORM ZIP"
                disabled={busy}
                onPress={() => void chooseFile()}
                style={({ pressed }) => [
                  styles.filePicker,
                  {
                    opacity: busy ? 0.6 : 1,
                    backgroundColor: pressed
                      ? theme.colors.surfaceSoft
                      : theme.colors.background,
                    borderColor: file
                      ? theme.colors.accent
                      : theme.colors.border,
                  },
                ]}
              >
                <Text
                  numberOfLines={2}
                  style={[
                    styles.fileName,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {file ? file.name : "Choisir un fichier ZIP"}
                </Text>

                <Text
                  style={[
                    styles.fileMeta,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {file
                    ? formatBytes(file.size)
                    : "ZIP uniquement"}
                </Text>
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

              <View style={styles.inlineActions}>
                <AppButton
                  title={
                    analyzing
                      ? "Analyse..."
                      : "Analyser le package"
                  }
                  onPress={() => void analyze()}
                  loading={analyzing}
                  disabled={!file || picking || confirming}
                  style={styles.inlineButton}
                />

                <AppButton
                  title="Changer de méthode"
                  variant="secondary"
                  onPress={onBack}
                  disabled={busy}
                  style={styles.inlineButton}
                />
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
                  <Text
                    style={[
                      styles.cardTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    2. Analyse et prévisualisation
                  </Text>

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
                    label="Titre"
                    value={metadata.title}
                    onChangeText={(value) => field("title", value)}
                    placeholder="Titre de la formation"
                  />

                  <Field
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
                      label="Code d’accès"
                      value={metadata.accessCode}
                      onChangeText={(value) =>
                        field("accessCode", value)
                      }
                      autoCapitalize="characters"
                    />
                  ) : null}

                  <Field
                    label="Participants max. (optionnel)"
                    value={metadata.maxLearners}
                    onChangeText={(value) =>
                      field("maxLearners", value)
                    }
                    keyboardType="numeric"
                    placeholder="Ex. 30"
                  />

                  <Field
                    label="Objectifs pédagogiques (optionnel)"
                    value={metadata.objectives}
                    onChangeText={(value) =>
                      field("objectives", value)
                    }
                    multiline
                  />

                  <Field
                    label="Prérequis (optionnel)"
                    value={metadata.prerequisites}
                    onChangeText={(value) =>
                      field("prerequisites", value)
                    }
                    multiline
                  />

                  <Field
                    label="Public cible (optionnel)"
                    value={metadata.targetAudience}
                    onChangeText={(value) =>
                      field("targetAudience", value)
                    }
                    multiline
                  />

                  {error && analysis ? (
                    <ErrorMessage message={error} />
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
          onRequestClose={() => setPicker(null)}
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
  keyboard: {
    flex: 1,
    minHeight: 0,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  page: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  methodContent: {
    flexGrow: 1,
    paddingBottom: 40,
    justifyContent: "center",
  },
  methodPage: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    marginBottom: 7,
  },
  pageTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
    marginBottom: 18,
  },
  methodGrid: {
    gap: 12,
  },
  methodCard: {
    padding: 20,
  },
  methodCardTitle: {
    fontSize: 19,
    fontWeight: "900",
  },
  methodCardText: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  methodCardCta: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 16,
  },
  cancelButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    minWidth: 150,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "900",
  },
  cardText: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    marginBottom: 14,
  },
  filePicker: {
    minHeight: 112,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  fileName: {
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  fileMeta: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  progressBlock: {
    marginTop: 14,
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  inlineButton: {
    minWidth: 180,
    flexGrow: 1,
    flexBasis: 180,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  tag: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 10,
    fontWeight: "900",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 10,
  },
  infoValue: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 3,
  },
  previewHeading: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 16,
    marginBottom: 8,
  },
  previewModule: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  previewModuleTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  previewLesson: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  warningText: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
    fontWeight: "700",
  },
  fieldHelp: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  coverSection: {
    marginTop: 16,
  },
  coverPicker: {
    minHeight: 150,
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  coverPreview: {
    width: "100%",
    height: 170,
  },
  coverPlaceholder: {
    fontSize: 13,
    fontWeight: "800",
  },
  coverHelp: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  field: {
    marginTop: 13,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  largeInput: {
    minHeight: 120,
  },
  select: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  chevron: {
    fontSize: 24,
    fontWeight: "500",
  },
  createButton: {
    marginTop: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
    padding: 14,
  },
  modalDismissArea: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  modalCard: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: 680,
    maxHeight: "76%",
    alignSelf: "center",
    borderWidth: 1,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
  },
  modalList: {
    minHeight: 80,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "800",
  },
});
