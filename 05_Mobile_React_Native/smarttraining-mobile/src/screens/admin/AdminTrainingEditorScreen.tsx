/* eslint-disable react-hooks/set-state-in-effect */
import * as ImagePicker from "expo-image-picker";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackHandler,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { AppConfirmSheet } from "../../components/ux/AppStates";
import {
  createAdminTrainingDraft,
  getAdminActiveTrainingCategories,
  getAdminFullTraining,
  updateAdminTraining,
  uploadAdminTrainingCover,
} from "../../features/admin/adminTrainingService";
import {
  importPexelsTrainingCover,
  type PexelsCoverPhoto,
} from "../../features/trainings/pexelsCoverService";
import {
  getAdminUsers,
} from "../../features/admin/adminUserService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  AdminUserSummary,
} from "../../types/admin";
import type {
  MobileEnrollmentMode,
  MobileTrainingCategory,
  MobileTrainingLevel,
  MobileTrainingVisibility,
  TrainerPickedFile,
  TrainerTrainingAuthoringForm,
} from "../../types/trainerAuthoringMobile";

type Props = {
  trainingId?: number;
  onSaved: (trainingId: number) => void;
  onCancel: () => void;
};

type FormState = {
  trainerId: number | null;
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
  | "TRAINER"
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
  trainerId: null,
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

const steps = [
  ["Responsable", "Formateur et identité"],
  ["Pédagogie", "Objectifs et public"],
  ["Paramètres", "Niveau, durée et capacité"],
  ["Accès", "Visibilité et inscription"],
] as const;

function positiveNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : fallback;
}

function errorText(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "L’opération n’a pas pu être réalisée.";
}

function userLabel(user: AdminUserSummary): string {
  const name =
    user.fullName?.trim() ||
    [user.firstName, user.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();

  return name
    ? `${name} — ${user.email}`
    : user.email;
}

function isAssignableTrainer(
  user: AdminUserSummary,
): boolean {
  return (
    user.role === "FORMATEUR" &&
    user.enabled !== false &&
    user.accountStatus !== "DISABLED" &&
    user.accountStatus !== "SUSPENDED"
  );
}

function levelLabel(value: MobileTrainingLevel) {
  if (value === "INTERMEDIAIRE") return "Intermédiaire";
  if (value === "AVANCE") return "Avancé";
  return "Débutant";
}

function visibilityLabel(
  value: MobileTrainingVisibility,
) {
  if (value === "PUBLIC") return "Publique";
  if (value === "ASSIGNED_ONLY")
    return "Affectation uniquement";
  return "Privée";
}

function enrollmentLabel(value: MobileEnrollmentMode) {
  if (value === "SELF_ENROLLMENT")
    return "Auto-inscription";
  if (value === "ACCESS_CODE") return "Code d’accès";
  if (value === "INVITATION") return "Invitation";
  return "Affectation";
}


function TrainingPremiumAlert({
  kind,
  title,
  message,
  onClose,
}: {
  kind: "error" | "success";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const isError = kind === "error";
  const foreground = isError ? "#C2413D" : "#16845A";
  const background = isError ? "#FFF4F2" : "#EAFBF3";
  const border = isError ? "#F2C6C3" : "#BFECD7";

  return (
    <View
      className="mb-3 flex-row items-start rounded-[16px] border px-3.5 py-3"
      style={{ backgroundColor: background, borderColor: border }}
    >
      <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white">
        <SymbolView
          name={{
            ios: isError
              ? "exclamationmark.triangle.fill"
              : "checkmark.circle.fill",
            android: isError ? "error" : "check_circle",
            web: isError ? "error" : "check_circle",
          }}
          tintColor={foreground}
          size={13}
          weight="bold"
        />
      </View>

      <View className="ml-2.5 min-w-0 flex-1">
        <Text
          className="text-[10px] font-black"
          style={{ color: foreground }}
        >
          {title}
        </Text>
        <Text
          className="mt-0.5 text-[9px] leading-[14px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {message}
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Fermer le message"
        onPress={onClose}
        className="ml-2 h-7 w-7 items-center justify-center rounded-[9px] bg-white"
      >
        <SymbolView
          name={{ ios: "xmark", android: "close", web: "close" }}
          tintColor={foreground}
          size={10}
          weight="bold"
        />
      </Pressable>
    </View>
  );
}

function TrainingField(
  props: React.ComponentProps<typeof TextInput> & {
    label: string;
    large?: boolean;
  },
) {
  const { theme } = useSmartTrainingTheme();
  const { label, multiline, large, ...inputProps } = props;

  return (
    <View className="mb-3">
      <Text
        className="mb-1.5 text-[11px] font-black"
        style={{ color: theme.colors.foreground }}
      >
        {label}
      </Text>

      <TextInput
        {...inputProps}
        accessibilityLabel={inputProps.accessibilityLabel ?? label}
        multiline={multiline}
        placeholderTextColor={theme.colors.foregroundSubtle}
        className={`rounded-[14px] border bg-[#FCFBFD] px-3.5 text-[13px] ${
          multiline ? "py-3" : "h-[50px]"
        }`}
        style={[
          {
            color: theme.colors.foreground,
            borderColor: theme.colors.border,
            minHeight: multiline ? (large ? 110 : 82) : 50,
            textAlignVertical: multiline ? "top" : "center",
          },
          inputProps.style,
        ]}
      />
    </View>
  );
}

function TrainingSelectField({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
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
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-[50px] flex-row items-center rounded-[14px] border bg-[#FCFBFD] px-3.5"
        style={{ borderColor: theme.colors.border }}
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

export default function AdminTrainingEditorScreen({
  trainingId,
  onSaved,
  onCancel,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const editing =
    Number.isInteger(trainingId) &&
    (trainingId ?? 0) > 0;

  const [form, setForm] =
    useState<FormState>(initialForm);
  const [savedFormSnapshot, setSavedFormSnapshot] = useState(
    () => JSON.stringify(initialForm),
  );
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [trainers, setTrainers] =
    useState<AdminUserSummary[]>([]);
  const [categories, setCategories] =
    useState<MobileTrainingCategory[]>([]);
  const [step, setStep] = useState(0);
  const [picker, setPicker] =
    useState<PickerMode>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [coverPreviewUri, setCoverPreviewUri] = useState("");
  const [coverFile, setCoverFile] = useState<TrainerPickedFile | null>(null);
  const [selectedPexelsPhoto, setSelectedPexelsPhoto] =
    useState<PexelsCoverPhoto | null>(null);
  const [selectingCover, setSelectingCover] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

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
    if (picker === null) {
      setPickerSearch("");
    }
  }, [picker]);

  const sortedCategories = useMemo(
    () =>
      [...categories].sort(
        (a, b) =>
          (a.sortOrder ?? a.id) -
          (b.sortOrder ?? b.id),
      ),
    [categories],
  );

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [users, activeCategories] =
          await Promise.all([
            getAdminUsers(),
            getAdminActiveTrainingCategories(),
          ]);

        if (!active) return;

        const assignable =
          users.filter(isAssignableTrainer);

        setTrainers(assignable);
        setCategories(activeCategories);

        if (!editing || !trainingId) {
          if (assignable.length === 1) {
            const nextForm = {
              ...initialForm,
              trainerId: assignable[0].id,
            };
            setForm(nextForm);
            setSavedFormSnapshot(JSON.stringify(nextForm));
          }

          return;
        }

        const training =
          await getAdminFullTraining(trainingId);

        if (!active) return;

        if (training.status !== "DRAFT") {
          setError(
            "Seule une formation en brouillon est modifiable. Remettez-la d’abord en brouillon.",
          );
          return;
        }

        setCoverImageUrl(training.coverImageUrl || "");
        setCoverPreviewUri(training.coverImageUrl || "");
        setCoverFile(null);
        setSelectedPexelsPhoto(null);

        const nextForm: FormState = {
          trainerId: training.trainerId,
          title: training.title || "",
          shortDescription:
            training.shortDescription || "",
          description:
            training.description || training.shortDescription || "",
          objectives: training.objectives || "",
          prerequisites: training.prerequisites || "",
          targetAudience:
            training.targetAudience || "",
          categoryId:
            training.categoryId ?? null,
          categoryLabel:
            training.category || "",
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
            training.enrollmentMode ===
              "SELF_ENROLLMENT" ||
            training.enrollmentMode ===
              "ACCESS_CODE" ||
            training.enrollmentMode === "INVITATION"
              ? training.enrollmentMode
              : "ASSIGNMENT_ONLY",
          accessCode: training.accessCode || "",
          maxLearners: String(
            training.maxLearners ?? 30,
          ),
        };
        setForm(nextForm);
        setSavedFormSnapshot(JSON.stringify(nextForm));
      } catch (caught) {
        if (active) {
          setError(errorText(caught));
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
  }, [editing, trainingId]);

  const isDirty =
    JSON.stringify(form) !== savedFormSnapshot ||
    coverFile !== null ||
    selectedPexelsPhoto !== null;

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (saving) {
          return true;
        }

        if (isDirty) {
          setExitConfirmOpen(true);
          return true;
        }

        onCancel();
        return true;
      },
    );

    return () => subscription.remove();
  }, [isDirty, onCancel, saving]);

  function keepFocusedFieldVisible(event: any) {
    const target = event?.target;

    if (!target) {
      return;
    }

    setTimeout(() => {
      const responder = scrollRef.current as any;
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(
        target,
        110,
        true,
      );
    }, 140);
  }

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

  function validate(currentStep: number): boolean {
    setError("");

    if (currentStep === 0) {
      if (!form.trainerId) {
        setError(
          "Choisissez le formateur responsable.",
        );
        return false;
      }

      if (!form.title.trim()) {
        setError(
          "Le titre de la formation est obligatoire.",
        );
        return false;
      }

      if (!form.categoryId) {
        setError("Choisissez une catégorie.");
        return false;
      }
    }

    if (
      currentStep === 3 &&
      form.enrollmentMode === "ACCESS_CODE" &&
      !form.accessCode.trim()
    ) {
      setError(
        "Le code d’accès est obligatoire.",
      );
      return false;
    }

    return true;
  }

  async function save() {
    if (
      saving ||
      !validate(0) ||
      !validate(3) ||
      !form.trainerId
    ) {
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
      targetAudience:
        form.targetAudience.trim(),
      categoryId: form.categoryId ?? undefined,
      category: form.categoryLabel.trim(),
      language: form.language,
      level: form.level,
      estimatedDurationHours:
        positiveNumber(form.durationHours, 1),
      status: "DRAFT",
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
          ? await updateAdminTraining(
              trainingId,
              form.trainerId,
              request,
            )
          : await createAdminTrainingDraft(
              form.trainerId,
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

          if (!importedUrl) {
            throw new Error(
              "Le serveur n’a pas renvoyé l’URL de la couverture Pexels.",
            );
          }

          setCoverImageUrl(importedUrl);
          setCoverPreviewUri(importedUrl);
          setSelectedPexelsPhoto(null);
          setCoverFile(null);
        } catch (coverError) {
          if (!editing) {
            setError(
              `Le brouillon a été créé, mais la couverture Pexels n’a pas pu être importée. ${errorText(coverError)}`,
            );
            onSaved(saved.id);
            return;
          }

          throw coverError;
        }
      } else if (coverFile) {
        try {
          const uploaded = await uploadAdminTrainingCover(
            saved.id,
            coverFile,
          );

          const uploadedUrl = uploaded.publicUrl?.trim() || "";

          if (!uploadedUrl) {
            throw new Error(
              "Le serveur n’a pas renvoyé l’URL de la couverture.",
            );
          }

          setCoverImageUrl(uploadedUrl);
          setCoverPreviewUri(uploadedUrl);
          setCoverFile(null);
        } catch (coverError) {
          if (!editing) {
            setError(
              `Le brouillon a été créé, mais la couverture n’a pas pu être envoyée. ${errorText(coverError)}`,
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
      setError(errorText(caught));
    } finally {
      setSaving(false);
    }
  }

  function pickerOptions(): PickerOption[] {
    if (picker === "TRAINER") {
      return trainers.map((trainer) => ({
        key: String(trainer.id),
        label: userLabel(trainer),
        helper: "Formateur actif",
      }));
    }

    if (picker === "CATEGORY") {
      return sortedCategories.map((category) => ({
        key: String(category.id),
        label: category.name,
      }));
    }

    if (picker === "LEVEL") {
      return [
        { key: "DEBUTANT", label: "Débutant" },
        {
          key: "INTERMEDIAIRE",
          label: "Intermédiaire",
        },
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
        { key: "PRIVATE", label: "Privée" },
        { key: "PUBLIC", label: "Publique" },
        {
          key: "ASSIGNED_ONLY",
          label: "Affectation uniquement",
        },
      ];
    }

    return [
      {
        key: "ASSIGNMENT_ONLY",
        label: "Affectation",
      },
      {
        key: "SELF_ENROLLMENT",
        label: "Auto-inscription",
      },
      {
        key: "ACCESS_CODE",
        label: "Code d’accès",
      },
      {
        key: "INVITATION",
        label: "Invitation",
      },
    ];
  }

  function pickerTitle(): string {
    if (picker === "TRAINER") return "Choisir un formateur";
    if (picker === "CATEGORY") return "Choisir une catégorie";
    if (picker === "LEVEL") return "Choisir un niveau";
    if (picker === "LANGUAGE") return "Choisir une langue";
    if (picker === "VISIBILITY") return "Choisir la visibilité";
    if (picker === "ENROLLMENT") return "Mode d’inscription";
    return "Choisir";
  }

  function pickerSubtitle(): string {
    if (picker === "TRAINER") {
      return "Sélectionnez le responsable de la formation.";
    }
    if (picker === "CATEGORY") {
      return "Classez la formation dans une catégorie active.";
    }
    return "Sélectionnez une option.";
  }

  function selectedPickerKey(): string | null {
    if (picker === "TRAINER") {
      return form.trainerId ? String(form.trainerId) : null;
    }
    if (picker === "CATEGORY") {
      return form.categoryId ? String(form.categoryId) : null;
    }
    if (picker === "LEVEL") return form.level;
    if (picker === "LANGUAGE") return form.language;
    if (picker === "VISIBILITY") return form.visibility;
    if (picker === "ENROLLMENT") return form.enrollmentMode;
    return null;
  }

  function visiblePickerOptions(): PickerOption[] {
    const options = pickerOptions();
    const normalized = pickerSearch.trim().toLowerCase();

    if (!normalized || (picker !== "TRAINER" && picker !== "CATEGORY")) {
      return options;
    }

    return options.filter((option) =>
      `${option.label} ${option.helper || ""}`
        .toLowerCase()
        .includes(normalized),
    );
  }

  function selectOption(option: PickerOption) {
    if (picker === "TRAINER") {
      field("trainerId", Number(option.key));
    } else if (picker === "CATEGORY") {
      const category = sortedCategories.find(
        (item) =>
          String(item.id) === option.key,
      );

      if (category) {
        setForm((current) => ({
          ...current,
          categoryId: category.id,
          categoryLabel: category.name,
        }));
      }
    } else if (picker === "LEVEL") {
      field(
        "level",
        option.key as MobileTrainingLevel,
      );
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

  const selectedTrainer =
    trainers.find(
      (trainer) =>
        trainer.id === form.trainerId,
    );

  if (loading) {
    return (
      <LoadingState
        message={
          editing
            ? "Chargement de la formation..."
            : "Préparation de la formation..."
        }
      />
    );
  }

  return (
    <ScreenContainer edges={["left", "right"]} style={{ paddingBottom: 0 }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom: keyboardVisible
              ? 180
              : Math.max(28, insets.bottom + 20),
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
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
                        ios: editing ? "pencil.and.list.clipboard" : "plus.rectangle.on.folder.fill",
                        android: editing ? "edit_note" : "note_add",
                        web: editing ? "edit_note" : "note_add",
                      }}
                      tintColor="#7C3AED"
                      size={19}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-[10px] font-black uppercase tracking-[0.9px] text-[#7C3AED]">
                        Admin · étape {step + 1} sur 4
                      </Text>

                      {!editing ? (
                        <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                          <Text className="text-[8px] font-black text-[#7C3AED]">
                            Brouillon
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      className="mt-1 text-[23px] font-black leading-[28px]"
                      style={{ color: theme.colors.foreground }}
                    >
                      {editing ? "Modifier la formation" : "Nouvelle formation"}
                    </Text>
                    <Text
                      className="mt-1.5 text-[11px] leading-[17px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {steps[step][1]}
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  {steps.map((item, index) => {
                    const active = index === step;
                    const reached = index <= step;

                    return (
                      <Pressable
                        key={item[0]}
                        accessibilityRole="button"
                        accessibilityLabel={`Étape ${index + 1} : ${item[0]}`}
                        accessibilityState={{ selected: active }}
                        onPress={() => {
                          if (index <= step || validate(step)) {
                            setStep(index);
                          }
                        }}
                        className="min-w-0 flex-1"
                      >
                        <View
                          className="h-1 rounded-full"
                          style={{
                            backgroundColor: reached
                              ? "#7C3AED"
                              : theme.colors.border,
                          }}
                        />
                        <Text
                          numberOfLines={1}
                          className="mt-1.5 text-[9px] font-black"
                          style={{
                            color: active
                              ? theme.colors.foreground
                              : theme.colors.foregroundSubtle,
                          }}
                        >
                          {item[0]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {error ? (
              <TrainingPremiumAlert
                kind="error"
                title="Vérifiez les informations"
                message={error}
                onClose={() => setError("")}
              />
            ) : null}

            {notice ? (
              <TrainingPremiumAlert
                kind="success"
                title="Information enregistrée"
                message={notice}
                onClose={() => setNotice("")}
              />
            ) : null}

            <View
              className="overflow-hidden rounded-[22px] border bg-white"
              style={{ borderColor: theme.colors.border }}
            >
              <View className="flex-row items-center border-b border-[#EEE9F0] px-4 py-3">
                <View className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F1E9FF]">
                  <SymbolView
                    name={{
                      ios:
                        step === 0
                          ? "person.text.rectangle.fill"
                          : step === 1
                            ? "target"
                            : step === 2
                              ? "slider.horizontal.3"
                              : "lock.shield.fill",
                      android:
                        step === 0
                          ? "badge"
                          : step === 1
                            ? "track_changes"
                            : step === 2
                              ? "tune"
                              : "verified_user",
                      web:
                        step === 0
                          ? "badge"
                          : step === 1
                            ? "track_changes"
                            : step === 2
                              ? "tune"
                              : "verified_user",
                    }}
                    tintColor="#7C3AED"
                    size={14}
                    weight="bold"
                  />
                </View>

                <View className="ml-2.5 min-w-0 flex-1">
                  <Text
                    className="text-[13px] font-black"
                    style={{ color: theme.colors.foreground }}
                  >
                    {step === 0 ? "Identité de la formation" : steps[step][0]}
                  </Text>
                  <Text
                    className="mt-0.5 text-[9px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {step === 0
                      ? "Responsable, identité et couverture"
                      : step === 1
                        ? "Objectifs, prérequis et public"
                        : step === 2
                          ? "Niveau, langue et capacité"
                          : "Visibilité et inscription"}
                  </Text>
                </View>
              </View>

              <View className="p-4">
                {step === 0 ? (
                  <>
                    <TrainingSelectField
                      label="Formateur responsable"
                      value={
                        selectedTrainer
                          ? userLabel(selectedTrainer)
                          : "Choisir un formateur"
                      }
                      onPress={() => setPicker("TRAINER")}
                    />

                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Titre"
                      value={form.title}
                      onChangeText={(value) => field("title", value)}
                      placeholder="Ex. Fondamentaux de la relation client"
                      returnKeyType="next"
                    />

                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Description de la formation"
                      value={form.description}
                      onChangeText={(value) => field("description", value)}
                      multiline
                      large
                      placeholder="Présentez clairement le contenu et le contexte de la formation"
                    />

                    <View className="-mt-1 mb-3 flex-row items-start rounded-[13px] bg-[#F8F6F9] px-3 py-2.5">
                      <SymbolView
                        name={{
                          ios: "sparkles",
                          android: "auto_awesome",
                          web: "auto_awesome",
                        }}
                        tintColor="#7C3AED"
                        size={11}
                      />
                      <Text
                        className="ml-2 min-w-0 flex-1 text-[9px] leading-[14px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        Le résumé affiché dans les cartes sera généré automatiquement à partir de cette description.
                      </Text>
                    </View>

                    <TrainingSelectField
                      label="Catégorie"
                      value={form.categoryLabel || "Choisir une catégorie"}
                      onPress={() => setPicker("CATEGORY")}
                    />

                    <View className="mt-1">
                      <Text
                        className="mb-2 text-[11px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Couverture de la formation
                      </Text>

                      {coverPreviewUri || coverImageUrl ? (
                        <Image
                          source={{ uri: coverPreviewUri || coverImageUrl }}
                          resizeMode="cover"
                          accessibilityLabel="Aperçu de la couverture de la formation"
                          className="w-full rounded-[16px] border"
                          style={{
                            aspectRatio: 16 / 9,
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.surfaceSoft,
                          }}
                        />
                      ) : (
                        <View
                          className="w-full items-center justify-center rounded-[16px] border border-dashed px-5 py-8"
                          style={{
                            aspectRatio: 16 / 9,
                            backgroundColor: "#F7F2FF",
                            borderColor: "#DCCCF7",
                          }}
                        >
                          <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-white">
                            <SymbolView
                              name={{
                                ios: "photo.fill",
                                android: "image",
                                web: "image",
                              }}
                              tintColor="#7C3AED"
                              size={16}
                              weight="bold"
                            />
                          </View>
                          <Text
                            className="mt-2 text-[12px] font-black"
                            style={{ color: theme.colors.foreground }}
                          >
                            Aucune couverture
                          </Text>
                          <Text
                            className="mt-1 text-center text-[9px] leading-[14px]"
                            style={{ color: theme.colors.foregroundMuted }}
                          >
                            Ajoutez une image 16:9 pour valoriser la formation.
                          </Text>
                        </View>
                      )}

                      <Text
                        className="mt-2 text-[9px] leading-[14px]"
                        style={{ color: theme.colors.foregroundMuted }}
                      >
                        JPEG, PNG ou WebP · 10 Mo maximum · recadrage 16:9.
                      </Text>

                      {coverFile ? (
                        <Text
                          numberOfLines={1}
                          className="mt-1 text-[9px] font-bold"
                          style={{ color: theme.colors.foreground }}
                        >
                          {coverFile.name}
                        </Text>
                      ) : null}

                      <View className="mt-2.5">
                        <AppButton
                          title={
                            selectingCover
                              ? "Ouverture..."
                              : coverPreviewUri || coverImageUrl
                                ? "Remplacer la couverture"
                                : "Choisir une couverture"
                          }
                          onPress={() => void chooseCover()}
                          loading={selectingCover}
                          disabled={saving}
                          variant="secondary"
                          style={{ width: "100%" }}
                        />
                      </View>

                      <PexelsCoverPicker
                        selectedPhoto={selectedPexelsPhoto}
                        initialQuery={form.title}
                        disabled={saving || selectingCover}
                        onSystemBack={requestCancel}
                        onSelect={(photo) => {
                          setCoverFile(null);
                          setSelectedPexelsPhoto(photo);
                          setCoverPreviewUri(
                            photo.landscapeUrl || photo.previewUrl,
                          );
                          setError("");
                          setNotice(
                            "Couverture Pexels prête. Elle sera importée lors de l’enregistrement.",
                          );
                        }}
                      />
                    </View>
                  </>
                ) : null}

                {step === 1 ? (
                  <>
                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Objectifs pédagogiques"
                      value={form.objectives}
                      onChangeText={(value) => field("objectives", value)}
                      multiline
                    />
                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Prérequis"
                      value={form.prerequisites}
                      onChangeText={(value) => field("prerequisites", value)}
                      multiline
                    />
                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Public cible"
                      value={form.targetAudience}
                      onChangeText={(value) => field("targetAudience", value)}
                      multiline
                    />
                  </>
                ) : null}

                {step === 2 ? (
                  <>
                    <TrainingSelectField
                      label="Niveau"
                      value={levelLabel(form.level)}
                      onPress={() => setPicker("LEVEL")}
                    />
                    <TrainingSelectField
                      label="Langue"
                      value={
                        form.language === "en"
                          ? "English"
                          : form.language === "ar"
                            ? "Arabe"
                            : "Français"
                      }
                      onPress={() => setPicker("LANGUAGE")}
                    />
                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Durée estimée (h)"
                      value={form.durationHours}
                      onChangeText={(value) => field("durationHours", value)}
                      keyboardType="numeric"
                    />
                    <TrainingField
                      onFocus={keepFocusedFieldVisible}
                      label="Participants max."
                      value={form.maxLearners}
                      onChangeText={(value) => field("maxLearners", value)}
                      keyboardType="numeric"
                    />
                  </>
                ) : null}

                {step === 3 ? (
                  <>
                    <TrainingSelectField
                      label="Visibilité"
                      value={visibilityLabel(form.visibility)}
                      onPress={() => setPicker("VISIBILITY")}
                    />
                    <TrainingSelectField
                      label="Mode d’inscription"
                      value={enrollmentLabel(form.enrollmentMode)}
                      onPress={() => setPicker("ENROLLMENT")}
                    />

                    {form.enrollmentMode === "ACCESS_CODE" ? (
                      <TrainingField
                        onFocus={keepFocusedFieldVisible}
                        label="Code d’accès"
                        value={form.accessCode}
                        onChangeText={(value) => field("accessCode", value)}
                        autoCapitalize="characters"
                      />
                    ) : null}

                    <View className="mt-1 flex-row items-start rounded-[15px] border border-[#DDD1F5] bg-[#F7F2FF] px-3 py-3">
                      <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-white">
                        <SymbolView
                          name={{
                            ios: "checkmark.shield.fill",
                            android: "verified_user",
                            web: "verified_user",
                          }}
                          tintColor="#7C3AED"
                          size={13}
                          weight="bold"
                        />
                      </View>
                      <View className="ml-2.5 min-w-0 flex-1">
                        <Text
                          className="text-[10px] font-black"
                          style={{ color: theme.colors.foreground }}
                        >
                          Prêt à enregistrer
                        </Text>
                        <Text
                          className="mt-0.5 text-[9px] leading-[14px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          Le formateur responsable sera propriétaire de la formation. La création reste en brouillon.
                        </Text>
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
            </View>

            <View className="mt-4 flex-row gap-2">
              <AppButton
                title={step === 0 ? "Annuler" : "Précédent"}
                variant="secondary"
                onPress={() => {
                  if (step === 0) {
                    requestCancel();
                  } else {
                    setStep((current) => Math.max(0, current - 1));
                  }
                }}
                style={{ flex: 1 }}
              />

              <AppButton
                title={
                  step < 3
                    ? "Suivant"
                    : saving
                      ? "Enregistrement..."
                      : editing
                        ? "Enregistrer"
                        : "Créer le brouillon"
                }
                loading={saving}
                onPress={() => {
                  if (step < 3) {
                    if (validate(step)) {
                      setStep((current) => Math.min(3, current + 1));
                    }
                  } else {
                    void save();
                  }
                }}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
        statusBarTranslucent
        onRequestClose={() => {
          setPicker(null);
          setTimeout(() => requestCancel(), 0);
        }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View
            className="flex-1 justify-end bg-black/50 px-3 pt-8"
            style={{ paddingBottom: Math.max(14, insets.bottom + 8) }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer le sélecteur"
              className="absolute inset-0"
              onPress={() => setPicker(null)}
            />

            <View
              className="relative z-10 mx-auto w-full max-w-[680px] overflow-hidden rounded-[26px] border bg-white"
              style={{
                borderColor: "#DDD1F5",
                maxHeight: "70%",
              }}
            >
              <View className="h-1 bg-[#7C3AED]" />

              <View className="px-4 pb-3 pt-3.5">
                <View className="flex-row items-start justify-between">
                  <View className="min-w-0 flex-1 pr-3">
                    <Text
                      className="text-[16px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {pickerTitle()}
                    </Text>

                    <Text
                      className="mt-0.5 text-[9px] leading-[14px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {pickerSubtitle()}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Fermer"
                    onPress={() => setPicker(null)}
                    className="h-9 w-9 items-center justify-center rounded-[11px] bg-[#F3EEFF]"
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

                {picker === "CATEGORY" || picker === "TRAINER" ? (
                  <View
                    className="mt-3 flex-row items-center rounded-[13px] border bg-[#FCFBFD] px-3"
                    style={{ borderColor: theme.colors.border }}
                  >
                    <SymbolView
                      name={{
                        ios: "magnifyingglass",
                        android: "search",
                        web: "search",
                      }}
                      tintColor={theme.colors.foregroundSubtle}
                      size={13}
                    />

                    <TextInput
                      value={pickerSearch}
                      onChangeText={setPickerSearch}
                      placeholder={
                        picker === "CATEGORY"
                          ? "Rechercher une catégorie"
                          : "Rechercher un formateur"
                      }
                      placeholderTextColor={theme.colors.foregroundSubtle}
                      className="ml-2 h-[44px] min-w-0 flex-1 text-[11px]"
                      style={{ color: theme.colors.foreground }}
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                  </View>
                ) : null}
              </View>

              <ScrollView
                className="border-t border-[#EEE9F0]"
                contentContainerClassName="px-3 py-3"
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View className="gap-2">
                  {visiblePickerOptions().map((option) => {
                    const selected = selectedPickerKey() === option.key;

                    return (
                      <Pressable
                        key={option.key}
                        accessibilityRole="button"
                        accessibilityLabel={option.label}
                        accessibilityState={{ selected }}
                        onPress={() => selectOption(option)}
                        android_ripple={{ color: "transparent" }}
                        className="flex-row items-center rounded-[14px] border px-3 py-3"
                        style={{
                          borderColor: selected
                            ? "#CBB5F7"
                            : "#ECE7EF",
                          backgroundColor: selected
                            ? "#F7F2FF"
                            : "#FFFFFF",
                        }}
                      >
                        <View
                          className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                          style={{
                            backgroundColor: selected
                              ? "#EDE4FF"
                              : "#F8F6F9",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios:
                                picker === "CATEGORY"
                                  ? "tag.fill"
                                  : picker === "TRAINER"
                                    ? "person.fill"
                                    : "circle.fill",
                              android:
                                picker === "CATEGORY"
                                  ? "category"
                                  : picker === "TRAINER"
                                    ? "person"
                                    : "circle",
                              web:
                                picker === "CATEGORY"
                                  ? "category"
                                  : picker === "TRAINER"
                                    ? "person"
                                    : "circle",
                            }}
                            tintColor={selected ? "#7C3AED" : "#8B7F94"}
                            size={12}
                            weight="bold"
                          />
                        </View>

                        <View className="ml-2.5 min-w-0 flex-1">
                          <Text
                            className="text-[11px] font-black"
                            style={{
                              color: selected
                                ? "#5B21B6"
                                : theme.colors.foreground,
                            }}
                          >
                            {option.label}
                          </Text>

                          {option.helper ? (
                            <Text
                              className="mt-0.5 text-[8px]"
                              style={{
                                color: theme.colors.foregroundMuted,
                              }}
                            >
                              {option.helper}
                            </Text>
                          ) : null}
                        </View>

                        <View
                          className="ml-2 h-7 w-7 items-center justify-center rounded-[9px]"
                          style={{
                            backgroundColor: selected
                              ? "#7C3AED"
                              : "#F3EEFF",
                          }}
                        >
                          <SymbolView
                            name={{
                              ios: selected
                                ? "checkmark"
                                : "chevron.right",
                              android: selected
                                ? "check"
                                : "chevron_right",
                              web: selected
                                ? "check"
                                : "chevron_right",
                            }}
                            tintColor={selected ? "#FFFFFF" : "#7C3AED"}
                            size={10}
                            weight="bold"
                          />
                        </View>
                      </Pressable>
                    );
                  })}

                  {visiblePickerOptions().length === 0 ? (
                    <View className="items-center px-4 py-7">
                      <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#F3EEFF]">
                        <SymbolView
                          name={{
                            ios: "magnifyingglass",
                            android: "search",
                            web: "search",
                          }}
                          tintColor="#7C3AED"
                          size={14}
                        />
                      </View>
                      <Text
                        className="mt-2 text-[11px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        Aucun résultat
                      </Text>
                    </View>
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenContainer>
  );

}
