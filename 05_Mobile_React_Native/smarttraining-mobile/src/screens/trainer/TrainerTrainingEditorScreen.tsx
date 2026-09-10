import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  BackHandler,
  Image,
  Modal,
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
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import { AppConfirmSheet } from "../../components/ux/AppStates";
import {
  createTrainerTrainingDraft,
  getTrainerActiveCategories,
  getTrainerFullTraining,
  updateTrainerTraining,
  uploadTrainerTrainingCover,
} from "../../features/trainer/trainerAuthoringService";
import {
  importPexelsTrainingCover,
  type PexelsCoverPhoto,
} from "../../features/trainings/pexelsCoverService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  MobileEnrollmentMode,
  MobileTrainingCategory,
  MobileTrainingLevel,
  MobileTrainingVisibility,
  TrainerPickedFile,
  TrainerTrainingAuthoringForm,
} from "../../types/trainerAuthoringMobile";

type Props = {
  trainerId: number;
  trainingId?: number;
  onSaved: (trainingId: number) => void;
  onCancel: () => void;
};

type FormState = {
  title: string;
  shortDescription: string;
  description: string;
  objectives: string;
  prerequisites: string;
  targetAudience: string;
  categoryId: number | null;
  categoryLabel: string;
  language: string;
  level: MobileTrainingLevel;
  durationHours: string;
  visibility: MobileTrainingVisibility;
  enrollmentMode: MobileEnrollmentMode;
  accessCode: string;
  maxLearners: string;
};

type PickerMode =
  | "CATEGORY"
  | "LEVEL"
  | "LANGUAGE"
  | "VISIBILITY"
  | "ENROLLMENT"
  | null;

type PickerOption = {
  key: string;
  label: string;
  helper?: string;
};

const initialForm: FormState = {
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

const stepMeta = [
  {
    title: "Essentiel",
    subtitle: "Identité et catégorie",
  },
  {
    title: "Pédagogie",
    subtitle: "Contenu et objectifs",
  },
  {
    title: "Paramètres",
    subtitle: "Niveau, durée et capacité",
  },
  {
    title: "Accès",
    subtitle: "Visibilité et inscription",
  },
] as const;

function positiveNumber(value: string, fallback: number): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

// PATCH16_A8C5O_API_ERROR_MESSAGE_V1
function apiErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const response = (
    error as { response?: { data?: unknown } }
  ).response;
  const data = response?.data;

  if (typeof data === "string" && data.trim()) {
    return data.trim();
  }

  if (data && typeof data === "object") {
    const payload = data as Record<string, unknown>;

    for (const key of ["message", "detail", "error"]) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }

    for (const value of Object.values(payload)) {
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
  }

  return null;
}

function errorText(error: unknown, fallback: string): string {
  const backendMessage = apiErrorMessage(error);
  if (backendMessage) {
    return backendMessage;
  }

  if (
    error instanceof Error &&
    error.message &&
    !/^Request failed with status code \d+$/i.test(error.message)
  ) {
    return error.message;
  }

  return fallback;
}

function levelLabel(value: MobileTrainingLevel): string {
  if (value === "INTERMEDIAIRE") return "Intermédiaire";
  if (value === "AVANCE") return "Avancé";
  return "Débutant";
}

function languageLabel(value: string): string {
  if (value === "en") return "English";
  if (value === "ar") return "Arabe";
  return "Français";
}

function visibilityLabel(value: MobileTrainingVisibility): string {
  if (value === "PUBLIC") return "Publique";
  if (value === "ASSIGNED_ONLY") return "Affectation uniquement";
  return "Privée";
}

function enrollmentLabel(value: MobileEnrollmentMode): string {
  if (value === "SELF_ENROLLMENT") return "Auto-inscription";
  if (value === "ACCESS_CODE") return "Code d’accès";
  if (value === "INVITATION") return "Invitation";
  return "Affectation";
}

// PATCH16_A8C5M_MOBILE_TRAINING_EDITOR_STABILITY_UX_V1
function StepCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { theme } = useSmartTrainingTheme();

  const iconName: ComponentProps<typeof SymbolView>["name"] =
    title.includes("Pédagog") || title.includes("Conception")
      ? {
          ios: "book.closed.fill",
          android: "menu_book",
          web: "menu_book",
        }
      : title.includes("Paramètres")
        ? {
            ios: "slider.horizontal.3",
            android: "tune",
            web: "tune",
          }
        : title.includes("Accès")
          ? {
              ios: "lock.fill",
              android: "lock",
              web: "lock",
            }
          : title.includes("Résumé")
            ? {
                ios: "checklist",
                android: "fact_check",
                web: "fact_check",
              }
            : {
                ios: "rectangle.and.pencil.and.ellipsis",
                android: "edit_note",
                web: "edit_note",
              };

  return (
    <View
      className="mb-4 rounded-[22px] border bg-white p-4"
      style={{
        borderColor: theme.colors.border,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.035,
        shadowRadius: 8,
        elevation: 1,
      }}
    >
      <View className="mb-4 flex-row items-center">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F3EEFF]">
          <SymbolView
            name={iconName}
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
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[11px] leading-[16px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {description}
          </Text>
        </View>
      </View>

      <View className="h-px bg-[#F0ECE7]" />
      <View className="pt-4">{children}</View>
    </View>
  );
}

function Field({
  label,
  multiline = false,
  large = false,
  ...props
}: {
  label: string;
  multiline?: boolean;
  large?: boolean;
} & ComponentProps<typeof TextInput>) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="mb-4">
      <Text
        className="mb-2 text-[11px] font-extrabold"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>

      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel ?? label}
        multiline={multiline}
        placeholderTextColor="#98A2B3"
        className="rounded-[16px] border px-4 text-[14px]"
        style={{
          minHeight: multiline ? (large ? 118 : 92) : 50,
          paddingTop: multiline ? 13 : 0,
          paddingBottom: multiline ? 13 : 0,
          textAlignVertical: multiline ? "top" : "center",
          color: theme.colors.foreground,
          backgroundColor: "#FCFBF9",
          borderColor: "#E7E2EB",
          borderWidth: 1,
        }}
      />
    </View>
  );
}

function SelectField({
  label,
  value,
  onPress,
  warning = false,
}: {
  label: string;
  value: string;
  onPress: () => void;
  warning?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="mb-4">
      <Text
        className="mb-2 text-[11px] font-extrabold"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {label}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} : ${value || "Non renseigné"}`}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="min-h-[50px] flex-row items-center rounded-[16px] border px-4"
        style={{
          backgroundColor: "#FCFBF9",
          borderColor: warning ? theme.colors.accent : "#E7E2EB",
          borderWidth: 1,
        }}
      >
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1 text-[14px] font-bold"
          style={{
            color: value
              ? theme.colors.foreground
              : theme.colors.foregroundSubtle,
          }}
        >
          {value}
        </Text>

        <SymbolView
          name={{
            ios: "chevron.down",
            android: "keyboard_arrow_down",
            web: "keyboard_arrow_down",
          }}
          tintColor={theme.colors.accent}
          size={17}
          weight="bold"
        />
      </Pressable>
    </View>
  );
}

function SummaryStrip({
  items,
}: {
  items: [string, string][];
}) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map(([label, value]) => (
        <View
          key={`${label}-${value}`}
          className="min-w-[46%] flex-1 rounded-[16px] border bg-[#FBFAF8] px-3 py-3"
          style={{ borderColor: theme.colors.border }}
        >
          <Text
            className="text-[8px] font-black uppercase tracking-[0.6px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {label}
          </Text>
          <Text
            numberOfLines={2}
            className="mt-1 text-[11px] font-extrabold leading-[15px]"
            style={{ color: theme.colors.foreground }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

// PATCH16_A8C5N_COVER_PERSISTENCE_V1
export default function TrainerTrainingEditorScreen({
  trainerId,
  trainingId,
  onSaved,
  onCancel,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();
  const editing = Number.isInteger(trainingId) && (trainingId ?? 0) > 0;

  const [form, setForm] = useState<FormState>(initialForm);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(
    () => JSON.stringify(initialForm),
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [categories, setCategories] =
    useState<MobileTrainingCategory[]>([]);
  const [historicalCategory, setHistoricalCategory] =
    useState<MobileTrainingCategory | null>(null);

  const [step, setStep] = useState(0);
  const [picker, setPicker] = useState<PickerMode>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // PATCH16_A8C5O_EDITOR_LOAD_GUARD_V1
  const [loadFailure, setLoadFailure] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [error, setError] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverImagePath, setCoverImagePath] = useState("");
  const [coverPreviewUri, setCoverPreviewUri] = useState("");
  const [coverFile, setCoverFile] = useState<TrainerPickedFile | null>(null);
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] =
    useState<PexelsCoverPhoto | null>(null);
  const [selectingCover, setSelectingCover] = useState(false);

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

    async function load() {
      setLoading(true);
      setLoadFailure("");
      setError("");

      try {
        const activeCategories =
          await getTrainerActiveCategories();

        if (!active) {
          return;
        }

        setCategories(activeCategories);

        if (!editing || !trainingId) {
          setLoading(false);
          return;
        }

        const training =
          await getTrainerFullTraining(trainingId);

        if (!active) {
          return;
        }

        if (training.trainerId !== trainerId) {
          setLoadFailure(
            "Cette formation n’appartient pas à ce compte formateur.",
          );
          setLoading(false);
          return;
        }

        if (training.status !== "DRAFT") {
          setLoadFailure(
            "Seules les formations en brouillon sont modifiables. Remettez d’abord cette formation en brouillon depuis sa fiche.",
          );
          setLoading(false);
          return;
        }

        const activeCategory = activeCategories.find(
          (category) => category.id === training.categoryId,
        );

        if (
          training.categoryId &&
          !activeCategory &&
          training.category
        ) {
          setHistoricalCategory({
            id: training.categoryId,
            name: training.category,
            active: false,
            sortOrder: Number.MAX_SAFE_INTEGER,
          });
        }

        const loadedCoverUrl = training.coverImageUrl?.trim() || "";
        const loadedCoverPath = training.coverImagePath?.trim() || "";
        setCoverImageUrl(loadedCoverUrl);
        setCoverImagePath(loadedCoverPath);
        setCoverPreviewUri(loadedCoverUrl || loadedCoverPath);
        setCoverFile(null);

        const nextForm: FormState = {
          title: training.title || "",
          shortDescription: training.shortDescription || "",
          description:
            training.description || training.shortDescription || "",
          objectives: training.objectives || "",
          prerequisites: training.prerequisites || "",
          targetAudience: training.targetAudience || "",
          categoryId: training.categoryId ?? null,
          categoryLabel: training.category || "",
          language: training.language || "fr",
          level:
            training.level === "INTERMEDIAIRE" ||
            training.level === "AVANCE"
              ? training.level
              : "DEBUTANT",
          durationHours: String(
            training.estimatedDurationHours ?? 1,
          ),
          visibility:
            training.visibility === "PUBLIC" ||
            training.visibility === "ASSIGNED_ONLY"
              ? training.visibility
              : "PRIVATE",
          enrollmentMode:
            training.enrollmentMode === "SELF_ENROLLMENT" ||
            training.enrollmentMode === "ACCESS_CODE" ||
            training.enrollmentMode === "INVITATION"
              ? training.enrollmentMode
              : "ASSIGNMENT_ONLY",
          accessCode: training.accessCode || "",
          maxLearners: String(training.maxLearners ?? 30),
        };
        setForm(nextForm);
        setSavedFormSnapshot(JSON.stringify(nextForm));
      } catch (caught) {
        if (active) {
          setLoadFailure(
            errorText(
              caught,
              "Impossible de charger le formulaire de formation.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [editing, reloadToken, trainerId, trainingId]);

  const isDirty =
    JSON.stringify(form) !== savedFormSnapshot ||
    coverFile !== null ||
    selectedPexelsPhoto !== null;

  useEffect(() => {
    if (!isDirty || saving) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setExitConfirmOpen(true);
        return true;
      },
    );

    return () => subscription.remove();
  }, [isDirty, saving]);

  function requestCancel() {
    if (isDirty && !saving) {
      setExitConfirmOpen(true);
      return;
    }
    onCancel();
  }

  function field<K extends keyof FormState>(
    key: K,
    value: FormState[K],
  ) {
    setValidationMessage("");
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function chooseCover() {
    if (saving || selectingCover) {
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

      setSelectedPexelsPhoto(null);
      setCoverFile({
        uri: asset.uri,
        name: fileName,
        mimeType,
        size: fileSize,
        webFile,
      });
      setCoverPreviewUri(asset.uri);
      setNotice(
        "Couverture prête. Elle sera envoyée avec l’enregistrement.",
      );
    } catch {
      setError("Impossible d’ouvrir la bibliothèque d’images.");
    } finally {
      setSelectingCover(false);
    }
  }

  function validateStep(currentStep: number): boolean {
    setError("");
    setValidationMessage("");

    if (currentStep === 0) {
      if (!form.title.trim()) {
        setValidationMessage("Le titre de la formation est obligatoire.");
        return false;
      }

      if (!form.categoryId || !form.categoryLabel.trim()) {
        setValidationMessage("Choisissez une catégorie.");
        return false;
      }
    }

    if (
      currentStep === 3 &&
      form.enrollmentMode === "ACCESS_CODE" &&
      !form.accessCode.trim()
    ) {
      setValidationMessage(
        "Le code d’accès est obligatoire pour ce mode d’inscription.",
      );
      return false;
    }

    return true;
  }

  function next() {
    if (!validateStep(step)) {
      return;
    }

    setStep((current) => Math.min(current + 1, 3));
  }

  function previous() {
    setError("");
    setValidationMessage("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function save() {
    if (saving || !validateStep(0) || !validateStep(3)) {
      return;
    }

    const request: TrainerTrainingAuthoringForm = {
      title: form.title.trim(),
      shortDescription: buildShortDescription(
        form.description,
        form.shortDescription,
      ),
      description: form.description.trim(),
      objectives: form.objectives.trim(),
      prerequisites: form.prerequisites.trim(),
      targetAudience: form.targetAudience.trim(),
      categoryId: form.categoryId ?? undefined,
      category: form.categoryLabel.trim(),
      language: form.language.trim() || "fr",
      level: form.level,
      estimatedDurationHours: positiveNumber(
        form.durationHours,
        1,
      ),
      status: "DRAFT",
      coverImageUrl: coverImageUrl.trim() || undefined,
      coverImagePath: coverImagePath.trim() || undefined,
      visibility: form.visibility,
      enrollmentMode: form.enrollmentMode,
      accessCode:
        form.enrollmentMode === "ACCESS_CODE"
          ? form.accessCode.trim()
          : undefined,
      maxLearners: Math.floor(
        positiveNumber(form.maxLearners, 30),
      ),
    };

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const saved =
        editing && trainingId
          ? await updateTrainerTraining(
              trainingId,
              trainerId,
              request,
            )
          : await createTrainerTrainingDraft(
              trainerId,
              request,
            );

      if (selectedPexelsPhoto) {
        try {
          const imported =
            await importPexelsTrainingCover(
              saved.id,
              selectedPexelsPhoto.id,
            );

          const importedUrl =
            imported.publicUrl?.trim() || "";
          const importedPath =
            imported.relativePath?.trim() || "";

          if (!importedUrl) {
            throw new Error(
              "Le serveur n’a pas renvoyé l’URL de la couverture Pexels.",
            );
          }

          setCoverImageUrl(importedUrl);
          setCoverImagePath(importedPath);
          setCoverPreviewUri(importedUrl);
          setSelectedPexelsPhoto(null);
          setCoverFile(null);
        } catch (coverError) {
          if (!editing) {
            setError(
              errorText(
                coverError,
                "Le brouillon a été créé, mais la couverture Pexels n’a pas pu être importée. Rouvrez la formation pour réessayer.",
              ),
            );
            onSaved(saved.id);
            return;
          }

          throw coverError;
        }
      } else if (coverFile) {
        try {
          const uploaded = await uploadTrainerTrainingCover(
            saved.id,
            coverFile,
          );

          const uploadedUrl = uploaded.publicUrl?.trim() || "";
          const uploadedPath = uploaded.relativePath?.trim() || "";

          if (!uploadedUrl) {
            throw new Error(
              "Le serveur n’a pas renvoyé l’URL de la couverture.",
            );
          }

          setCoverImageUrl(uploadedUrl);
          setCoverImagePath(uploadedPath);
          setCoverPreviewUri(uploadedUrl);
          setCoverFile(null);
        } catch (coverError) {
          if (!editing) {
            setError(
              errorText(
                coverError,
                "Le brouillon a été créé, mais la couverture n’a pas pu être envoyée. Rouvrez la formation pour réessayer.",
              ),
            );
            onSaved(saved.id);
            return;
          }

          throw coverError;
        }
      }

      setNotice(
        editing
          ? "Formation mise à jour."
          : "Formation créée en brouillon.",
      );

      onSaved(saved.id);
    } catch (caught) {
      setError(
        errorText(
          caught,
          "La formation n’a pas pu être enregistrée.",
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  function pickerTitle(): string {
    if (picker === "CATEGORY") return "Choisir une catégorie";
    if (picker === "LEVEL") return "Choisir un niveau";
    if (picker === "LANGUAGE") return "Choisir une langue";
    if (picker === "VISIBILITY") return "Choisir la visibilité";
    if (picker === "ENROLLMENT") return "Mode d’inscription";
    return "";
  }

  function pickerOptions(): PickerOption[] {
    if (picker === "CATEGORY") {
      return sortedCategories.map((category) => ({
        key: String(category.id),
        label: category.name,
      }));
    }

    if (picker === "LEVEL") {
      return [
        { key: "DEBUTANT", label: "Débutant" },
        { key: "INTERMEDIAIRE", label: "Intermédiaire" },
        { key: "AVANCE", label: "Avancé" },
      ];
    }

    if (picker === "LANGUAGE") {
      return [
        { key: "fr", label: "Français" },
        { key: "en", label: "English" },
        { key: "ar", label: "Arabe" },
      ];
    }

    if (picker === "VISIBILITY") {
      return [
        {
          key: "PRIVATE",
          label: "Privée",
          helper: "Visible uniquement selon les règles d’affectation.",
        },
        {
          key: "PUBLIC",
          label: "Publique",
          helper: "Visible dans le catalogue public.",
        },
        {
          key: "ASSIGNED_ONLY",
          label: "Affectation uniquement",
          helper: "Accessible uniquement aux apprenants affectés.",
        },
      ];
    }

    return [
      {
        key: "ASSIGNMENT_ONLY",
        label: "Affectation",
        helper: "Inscription par affectation.",
      },
      {
        key: "SELF_ENROLLMENT",
        label: "Auto-inscription",
        helper: "L’apprenant peut s’inscrire lui-même.",
      },
      {
        key: "ACCESS_CODE",
        label: "Code d’accès",
        helper: "Un code est nécessaire pour rejoindre la formation.",
      },
      {
        key: "INVITATION",
        label: "Invitation",
        helper: "Accès par invitation.",
      },
    ];
  }

  function selectedPickerKey(): string | null {
    if (picker === "CATEGORY") {
      return form.categoryId ? String(form.categoryId) : null;
    }
    if (picker === "LEVEL") return form.level;
    if (picker === "LANGUAGE") return form.language;
    if (picker === "VISIBILITY") return form.visibility;
    if (picker === "ENROLLMENT") return form.enrollmentMode;
    return null;
  }

  function selectPickerOption(option: PickerOption) {
    setValidationMessage("");

    if (picker === "CATEGORY") {
      const category = sortedCategories.find(
        (item) => String(item.id) === option.key,
      );

      if (category) {
        setHistoricalCategory(null);
        setForm((current) => ({
          ...current,
          categoryId: category.id,
          categoryLabel: category.name,
        }));
      }
    } else if (picker === "LEVEL") {
      field("level", option.key as MobileTrainingLevel);
    } else if (picker === "LANGUAGE") {
      field("language", option.key);
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

  if (loading) {
    return (
      <LoadingState
        message={
          editing
            ? "Chargement de la formation..."
            : "Préparation de la nouvelle formation..."
        }
      />
    );
  }

  if (loadFailure) {
    return (
      <ScreenContainer>
        <View
          style={[
            styles.page,
            { paddingHorizontal: 16, paddingVertical: 24 },
          ]}
        >
          <ErrorMessage
            message={loadFailure}
            onRetry={() =>
              setReloadToken((current) => current + 1)
            }
          />
          <AppButton
            title="Retour"
            variant="secondary"
            onPress={onCancel}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <View className="mb-4">
            <View className="mb-2 flex-row items-center justify-between">
              <View className="rounded-full bg-[#F3EEFF] px-3 py-1.5">
                <Text
                  className="text-[9px] font-black uppercase tracking-[0.9px]"
                  style={{ color: theme.colors.accent }}
                >
                  Étape {step + 1} sur 4
                </Text>
              </View>

              <Text
                className="text-[10px] font-bold"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                {stepMeta[step].subtitle}
              </Text>
            </View>

            <Text
              className="text-[24px] font-black leading-[29px] tracking-[-0.7px]"
              style={{ color: theme.colors.foreground }}
            >
              {editing ? "Modifier la formation" : "Créer une formation"}
            </Text>

            <View
              className="mt-4 flex-row rounded-[18px] border bg-white p-1.5"
              style={{ borderColor: theme.colors.border }}
            >
              {stepMeta.map((item, index) => {
                const active = index === step;
                const completed = index < step;

                return (
                  <Pressable
                    key={item.title}
                    accessibilityRole="button"
                    accessibilityLabel={`Étape ${index + 1} : ${item.title}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      if (index <= step || validateStep(step)) {
                        setStep(index);
                      }
                    }}
                    android_ripple={{ color: "transparent" }}
                    className="min-h-[48px] min-w-0 flex-1 items-center justify-center rounded-[13px] px-1"
                    style={{
                      backgroundColor: active
                        ? theme.colors.accent
                        : completed
                          ? "#F3EEFF"
                          : "transparent",
                    }}
                  >
                    <View className="flex-row items-center justify-center">
                      {completed ? (
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
                          {index + 1}
                        </Text>
                      )}

                      <Text
                        numberOfLines={1}
                        className="ml-1 text-[8px] font-extrabold"
                        style={{
                          color: active
                            ? theme.colors.accentForeground
                            : completed
                              ? theme.colors.accent
                              : theme.colors.foregroundSubtle,
                        }}
                      >
                        {item.title}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {error ? (
            <ErrorMessage
              message={error}
              onRetry={() => setError("")}
            />
          ) : null}

          {validationMessage ? (
            <View
              accessibilityRole="alert"
              style={[
                styles.validationNotice,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.accent,
                },
              ]}
            >
              <Text
                style={[
                  styles.validationTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Information à compléter
              </Text>
              <Text
                style={[
                  styles.validationText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {validationMessage}
              </Text>
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
              <Text style={{ color: theme.colors.foreground }}>
                {notice}
              </Text>
            </View>
          ) : null}

          {step === 0 ? (
            <StepCard
              title="Les informations essentielles"
              description="Commencez par ce que vos apprenants verront en premier."
            >
              <Field
                label="Titre de la formation"
                value={form.title}
                onChangeText={(value) => field("title", value)}
                placeholder="Ex. Fondamentaux de la relation client"
              />

              <Field
                label="Description de la formation"
                value={form.description}
                onChangeText={(value) =>
                  field("description", value)
                }
                placeholder="Présentez clairement le contenu et le contexte de la formation"
                multiline
                large
              />

              <Text
                style={[
                  styles.fieldHelp,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Le résumé affiché dans les cartes sera généré automatiquement à partir de cette description.
              </Text>

              <SelectField
                label="Catégorie"
                value={
                  historicalCategory?.name ||
                  form.categoryLabel ||
                  "Choisir une catégorie"
                }
                onPress={() => setPicker("CATEGORY")}
                warning={Boolean(historicalCategory)}
              />


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
                  accessibilityLabel={
                    coverPreviewUri || coverImageUrl
                      ? "Changer la couverture de la formation"
                      : "Choisir une couverture pour la formation"
                  }
                  accessibilityHint="Ouvre la bibliothèque d’images"
                  disabled={saving || selectingCover}
                  onPress={() => void chooseCover()}
                  style={({ pressed }) => [
                    styles.coverPicker,
                    pressed && styles.coverPickerPressed,
                  ]}
                >
                  {coverPreviewUri || coverImageUrl ? (
                    <Image
                      source={{ uri: coverPreviewUri || coverImageUrl }}
                      resizeMode="contain"
                      accessibilityLabel="Aperçu de la couverture de la formation"
                      style={[
                        styles.coverPreview,
                        {
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    />
                  ) : (
                    <View
                      style={[
                        styles.coverPlaceholder,
                        {
                          backgroundColor: "#F7F2FF",
                          borderColor: "#D9C9F7",
                        },
                      ]}
                    >
                      <View className="mb-3 h-12 w-12 items-center justify-center rounded-2xl bg-white">
                        <SymbolView
                          name={{
                            ios: "photo.on.rectangle.angled",
                            android: "image",
                            web: "image",
                          }}
                          tintColor={theme.colors.accent}
                          size={21}
                          weight="bold"
                        />
                      </View>

                      <Text
                        style={[
                          styles.coverPlaceholderTitle,
                          { color: theme.colors.foreground },
                        ]}
                      >
                        Ajoutez une couverture
                      </Text>

                      <Text
                        style={[
                          styles.coverPlaceholderText,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        Format recommandé 16:9 · JPEG, PNG ou WebP.
                      </Text>
                    </View>
                  )}

                  <View
                    pointerEvents="none"
                    className="absolute bottom-3 right-3 flex-row items-center rounded-full bg-white px-3 py-2"
                    style={{
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                    }}
                  >
                    <SymbolView
                      name={{
                        ios: "photo",
                        android: "image",
                        web: "image",
                      }}
                      tintColor={theme.colors.accent}
                      size={13}
                    />
                    <Text
                      className="ml-1.5 text-[9px] font-black"
                      style={{ color: theme.colors.accent }}
                    >
                      {selectingCover
                        ? "Ouverture..."
                        : coverPreviewUri || coverImageUrl
                          ? "Changer"
                          : "Ajouter"}
                    </Text>
                  </View>
                </Pressable>

                <PexelsCoverPicker
                  selectedPhoto={selectedPexelsPhoto}
                  initialQuery={form.title}
                  disabled={saving || selectingCover}
                  onSelect={(photo) => {
                    setCoverFile(null);
                    setSelectedPexelsPhoto(photo);
                    setCoverPreviewUri(
                      photo.landscapeUrl ||
                        photo.previewUrl,
                    );
                    setError("");
                    setNotice(
                      "Couverture Pexels prête. Elle sera importée lors de l’enregistrement.",
                    );
                  }}
                />

                <Text
                  style={[
                    styles.coverHelp,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  JPEG, PNG ou WebP · 10 Mo maximum · recadrez l’image en 16:9 avant validation.
                </Text>

                {coverFile ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.coverFileName,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {coverFile.name}
                  </Text>
                ) : null}

              </View>
            </StepCard>
          ) : null}

          {step === 1 ? (
            <StepCard
              title="Conception pédagogique"
              description="Décrivez le contenu, les objectifs et le public visé."
            >
              <Field
                label="Objectifs pédagogiques"
                value={form.objectives}
                onChangeText={(value) =>
                  field("objectives", value)
                }
                placeholder="À la fin de la formation, l'apprenant saura..."
                multiline
              />

              <Field
                label="Prérequis"
                value={form.prerequisites}
                onChangeText={(value) =>
                  field("prerequisites", value)
                }
                placeholder="Connaissances ou matériel requis"
                multiline
              />

              <Field
                label="Public cible"
                value={form.targetAudience}
                onChangeText={(value) =>
                  field("targetAudience", value)
                }
                placeholder="Ex. Nouveaux conseillers, managers..."
                multiline
              />
            </StepCard>
          ) : null}

          {step === 2 ? (
            <StepCard
              title="Paramètres pédagogiques"
              description="Configurez le niveau, la langue, la durée et la capacité."
            >
              <View style={styles.twoColumns}>
                <View style={styles.column}>
                  <SelectField
                    label="Niveau"
                    value={levelLabel(form.level)}
                    onPress={() => setPicker("LEVEL")}
                  />
                </View>

                <View style={styles.column}>
                  <SelectField
                    label="Langue"
                    value={languageLabel(form.language)}
                    onPress={() => setPicker("LANGUAGE")}
                  />
                </View>
              </View>

              <View style={styles.twoColumns}>
                <View style={styles.column}>
                  <Field
                    label="Durée estimée (h)"
                    value={form.durationHours}
                    onChangeText={(value) =>
                      field("durationHours", value)
                    }
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.column}>
                  <Field
                    label="Participants max."
                    value={form.maxLearners}
                    onChangeText={(value) =>
                      field("maxLearners", value)
                    }
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <SummaryStrip
                items={[
                  ["Niveau", levelLabel(form.level)],
                  ["Langue", languageLabel(form.language)],
                  ["Durée", `${positiveNumber(form.durationHours, 1)} h`],
                  ["Capacité", String(Math.floor(positiveNumber(form.maxLearners, 30)))],
                ]}
              />
            </StepCard>
          ) : null}

          {step === 3 ? (
            <>
              <StepCard
                title="Accès et inscription"
                description="Définissez comment la formation sera proposée aux apprenants."
              >
                <SelectField
                  label="Visibilité"
                  value={visibilityLabel(form.visibility)}
                  onPress={() => setPicker("VISIBILITY")}
                />

                <SelectField
                  label="Mode d’inscription"
                  value={enrollmentLabel(form.enrollmentMode)}
                  onPress={() => setPicker("ENROLLMENT")}
                />

                {form.enrollmentMode === "ACCESS_CODE" ? (
                  <Field
                    label="Code d’accès"
                    value={form.accessCode}
                    onChangeText={(value) =>
                      field("accessCode", value)
                    }
                    placeholder="Ex. ST2026"
                    autoCapitalize="characters"
                  />
                ) : null}
              </StepCard>

              <StepCard
                title="Résumé"
                description="Vérifiez les éléments principaux avant d’enregistrer le brouillon."
              >
                <SummaryStrip
                  items={[
                    ["Formation", form.title || "Non renseignée"],
                    ["Catégorie", form.categoryLabel || "Non renseignée"],
                    ["Niveau", levelLabel(form.level)],
                    ["Visibilité", visibilityLabel(form.visibility)],
                    ["Inscription", enrollmentLabel(form.enrollmentMode)],
                  ]}
                />

                <View
                  style={[
                    styles.draftNotice,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.draftNoticeTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    Enregistrement en brouillon
                  </Text>
                  <Text
                    style={[
                      styles.draftNoticeText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Vous pourrez ensuite ajouter modules, leçons,
                    ressources et SCORM avant publication.
                  </Text>
                </View>
              </StepCard>
            </>
          ) : null}

          <View
            className="mt-1 flex-row gap-3 rounded-[20px] border bg-white p-2"
            style={{ borderColor: theme.colors.border }}
          >
            <View className="flex-1">
              {step > 0 ? (
                <AppButton
                  title="Précédent"
                  onPress={previous}
                  variant="secondary"
                  disabled={saving}
                  style={{ width: "100%" }}
                />
              ) : (
                <AppButton
                  title="Annuler"
                  onPress={requestCancel}
                  variant="secondary"
                  disabled={saving}
                  style={{ width: "100%" }}
                />
              )}
            </View>

            <View className="flex-[1.25]">
              {step < 3 ? (
                <AppButton
                  title="Continuer"
                  onPress={next}
                  style={{ width: "100%" }}
                />
              ) : (
                <AppButton
                  title={
                    saving
                      ? "Enregistrement..."
                      : editing
                        ? "Enregistrer"
                        : "Créer le brouillon"
                  }
                  onPress={() => void save()}
                  loading={saving}
                  style={{ width: "100%" }}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <AppConfirmSheet
        visible={exitConfirmOpen}
        title="Quitter sans enregistrer ?"
        description="Les modifications non enregistrées seront perdues."
        confirmLabel="Quitter"
        cancelLabel="Rester ici"
        destructive
        busy={saving}
        onConfirm={() => {
          setExitConfirmOpen(false);
          onCancel();
        }}
        onCancel={() => setExitConfirmOpen(false)}
      />

      <Modal
        visible={picker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <View style={[styles.modalBackdrop, { paddingBottom: Math.max(12, insets.bottom + 6) }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Fermer le sélecteur"
            onPress={() => setPicker(null)}
            style={StyleSheet.absoluteFill}
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
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text
                  style={[
                    styles.modalTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {pickerTitle()}
                </Text>
                <Text
                  style={[
                    styles.modalSubtitle,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Sélectionnez une option
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Fermer le sélecteur"
                onPress={() => setPicker(null)}
                android_ripple={{ color: "transparent" }}
                className="h-10 w-10 items-center justify-center rounded-2xl bg-[#F3EEFF]"
              >
                <SymbolView
                  name={{
                    ios: "xmark",
                    android: "close",
                    web: "close",
                  }}
                  tintColor={theme.colors.accent}
                  size={16}
                  weight="bold"
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
            >
              {pickerOptions().map((option) => {
                const selected = selectedPickerKey() === option.key;

                return (
                  <Pressable
                    key={option.key}
                    accessibilityRole="button"
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    onPress={() => selectPickerOption(option)}
                    android_ripple={{ color: "transparent" }}
                    className="mb-2 min-h-[56px] flex-row items-center rounded-[16px] border px-3.5 py-2.5"
                    style={{
                      backgroundColor: selected ? "#F7F2FF" : "#FFFFFF",
                      borderColor: selected
                        ? "#D8C7FF"
                        : theme.colors.border,
                    }}
                  >
                    <View
                      className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                      style={{
                        backgroundColor: selected ? "#EDE4FF" : "#F8F6F3",
                      }}
                    >
                      {selected ? (
                        <SymbolView
                          name={{
                            ios: "checkmark",
                            android: "check",
                            web: "check",
                          }}
                          tintColor={theme.colors.accent}
                          size={14}
                          weight="bold"
                        />
                      ) : (
                        <SymbolView
                          name={{
                            ios: "tag",
                            android: "label",
                            web: "label",
                          }}
                          tintColor={theme.colors.foregroundSubtle}
                          size={14}
                        />
                      )}
                    </View>

                    <View className="ml-3 min-w-0 flex-1">
                      <Text
                        className="text-[13px] font-extrabold"
                        style={{ color: theme.colors.foreground }}
                      >
                        {option.label}
                      </Text>

                      {option.helper ? (
                        <Text
                          numberOfLines={2}
                          className="mt-0.5 text-[9px] leading-[13px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {option.helper}
                        </Text>
                      ) : null}
                    </View>

                    <SymbolView
                      name={{
                        ios: selected ? "checkmark.circle.fill" : "chevron.right",
                        android: selected ? "check_circle" : "chevron_right",
                        web: selected ? "check_circle" : "chevron_right",
                      }}
                      tintColor={
                        selected
                          ? theme.colors.accent
                          : theme.colors.foregroundSubtle
                      }
                      size={16}
                      weight="bold"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );

}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  page: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  hero: {
    marginBottom: 14,
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  progressItem: {
    flex: 1,
    minWidth: 0,
  },
  progressBar: {
    height: 3,
    borderRadius: 999,
  },
  progressLabel: {
    fontSize: 8,
    fontWeight: "800",
    marginTop: 5,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  validationNotice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  validationTitle: {
    fontSize: 11,
    fontWeight: "900",
  },
  validationText: {
    fontSize: 10,
    lineHeight: 16,
    marginTop: 3,
  },
  card: {
    overflow: "hidden",
    marginBottom: 14,
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  cardDescription: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  cardBody: {
    padding: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 7,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  largeInput: {
    minHeight: 118,
  },
  select: {
    minHeight: 50,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  selectValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  selectChevron: {
    fontSize: 20,
    fontWeight: "500",
  },
  fieldHelp: {
    fontSize: 10,
    lineHeight: 16,
    marginTop: -2,
    marginBottom: 12,
  },
  coverSection: {
    marginTop: 0,
  },
  coverPicker: {
    position: "relative",
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 10,
  },
  coverPickerPressed: {
    opacity: 0.98,
  },
  coverPreview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: 18,
  },
  coverPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  coverOverlay: {
    position: "absolute",
    right: 12,
    bottom: 12,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coverOverlayText: {
    fontSize: 9,
    fontWeight: "900",
  },
  coverPlaceholderTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  coverPlaceholderText: {
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    marginTop: 4,
  },
  coverHelp: {
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 7,
  },
  coverFileName: {
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 7,
  },
  twoColumns: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  column: {
    flexGrow: 1,
    flexBasis: 150,
    minWidth: 0,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryItem: {
    flexGrow: 1,
    flexBasis: 140,
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  summaryKey: {
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  draftNotice: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
    marginTop: 12,
  },
  draftNoticeTitle: {
    fontSize: 11,
    fontWeight: "900",
  },
  draftNoticeText: {
    fontSize: 10,
    lineHeight: 16,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  footerSecondary: {
    flex: 1,
  },
  footerPrimary: {
    flex: 1.25,
  },
  footerButton: {
    width: "100%",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.46)",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
  },
  modalCard: {
    width: "100%",
    maxWidth: 680,
    maxHeight: "78%",
    alignSelf: "center",
    borderWidth: 1,
    overflow: "hidden",
    borderRadius: 28,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  modalTitle: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "900",
  },
  modalSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
  closeButton: {
    borderWidth: 0,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  closeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  modalList: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  optionRow: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionText: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  optionHelper: {
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },
  chevron: {
    fontSize: 20,
    fontWeight: "500",
  },
});
