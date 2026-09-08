import * as ImagePicker from "expo-image-picker";
import { useEffect, useMemo, useState } from "react";
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

export default function AdminTrainingEditorScreen({
  trainingId,
  onSaved,
  onCancel,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const insets = useSafeAreaInsets();
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
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.page}>
          <Text
            style={[
              styles.eyebrow,
              { color: theme.colors.accent },
            ]}
          >
            ADMIN · ÉTAPE {step + 1} SUR 4
          </Text>

          <Text
            style={[
              styles.title,
              { color: theme.colors.foreground },
            ]}
          >
            {editing
              ? "Modifier la formation"
              : "Nouvelle formation"}
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
            {steps[step][1]}
          </Text>

          <View style={styles.progress}>
            {steps.map((item, index) => (
              <Pressable
                key={item[0]}
                accessibilityRole="button"
                accessibilityLabel={`Étape ${index + 1} : ${item[0]}`}
                accessibilityState={{ selected: index === step }}
                onPress={() => {
                  if (
                    index <= step ||
                    validate(step)
                  ) {
                    setStep(index);
                  }
                }}
                style={styles.progressItem}
              >
                <View
                  style={[
                    styles.progressBar,
                    {
                      backgroundColor:
                        index <= step
                          ? theme.colors.accent
                          : theme.colors.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.progressLabel,
                    {
                      color:
                        index === step
                          ? theme.colors.foreground
                          : theme.colors
                              .foregroundSubtle,
                    },
                  ]}
                >
                  {item[0]}
                </Text>
              </Pressable>
            ))}
          </View>

          {error ? (
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
                  borderColor: theme.colors.success,
                },
              ]}
            >
              <Text
                style={[
                  styles.noticeText,
                  { color: theme.colors.success },
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
                backgroundColor:
                  theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius:
                  theme.shape.cardRadius,
                borderWidth:
                  theme.shape.borderWidth,
              },
            ]}
          >
            {step === 0 ? (
              <>
                <SelectField
                  label="Formateur responsable"
                  value={
                    selectedTrainer
                      ? userLabel(selectedTrainer)
                      : "Choisir un formateur"
                  }
                  onPress={() =>
                    setPicker("TRAINER")
                  }
                />

                <Field
                  label="Titre"
                  value={form.title}
                  onChangeText={(value) =>
                    field("title", value)
                  }
                  placeholder="Ex. Fondamentaux de la relation client"
                />

                <Field
                  label="Description de la formation"
                  value={form.description}
                  onChangeText={(value) =>
                    field("description", value)
                  }
                  multiline
                  large
                  placeholder="Présentez clairement le contenu et le contexte de la formation"
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
                    form.categoryLabel ||
                    "Choisir une catégorie"
                  }
                  onPress={() =>
                    setPicker("CATEGORY")
                  }
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
                          backgroundColor: theme.colors.surfaceSoft,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.coverPlaceholderTitle,
                          { color: theme.colors.foreground },
                        ]}
                      >
                        Aucune couverture
                      </Text>
                      <Text
                        style={[
                          styles.coverPlaceholderText,
                          { color: theme.colors.foregroundMuted },
                        ]}
                      >
                        Ajoutez une image 16:9 pour valoriser la formation.
                      </Text>
                    </View>
                  )}

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
                    style={styles.coverButton}
                  />

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
                </View>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <Field
                  label="Objectifs pédagogiques"
                  value={form.objectives}
                  onChangeText={(value) =>
                    field("objectives", value)
                  }
                  multiline
                />
                <Field
                  label="Prérequis"
                  value={form.prerequisites}
                  onChangeText={(value) =>
                    field("prerequisites", value)
                  }
                  multiline
                />
                <Field
                  label="Public cible"
                  value={form.targetAudience}
                  onChangeText={(value) =>
                    field("targetAudience", value)
                  }
                  multiline
                />
              </>
            ) : null}

            {step === 2 ? (
              <>
                <SelectField
                  label="Niveau"
                  value={levelLabel(form.level)}
                  onPress={() =>
                    setPicker("LEVEL")
                  }
                />
                <SelectField
                  label="Langue"
                  value={
                    form.language === "en"
                      ? "English"
                      : form.language === "ar"
                        ? "Arabe"
                        : "Français"
                  }
                  onPress={() =>
                    setPicker("LANGUAGE")
                  }
                />
                <Field
                  label="Durée estimée (h)"
                  value={form.durationHours}
                  onChangeText={(value) =>
                    field("durationHours", value)
                  }
                  keyboardType="numeric"
                />
                <Field
                  label="Participants max."
                  value={form.maxLearners}
                  onChangeText={(value) =>
                    field("maxLearners", value)
                  }
                  keyboardType="numeric"
                />
              </>
            ) : null}

            {step === 3 ? (
              <>
                <SelectField
                  label="Visibilité"
                  value={visibilityLabel(
                    form.visibility,
                  )}
                  onPress={() =>
                    setPicker("VISIBILITY")
                  }
                />
                <SelectField
                  label="Mode d’inscription"
                  value={enrollmentLabel(
                    form.enrollmentMode,
                  )}
                  onPress={() =>
                    setPicker("ENROLLMENT")
                  }
                />
                {form.enrollmentMode ===
                "ACCESS_CODE" ? (
                  <Field
                    label="Code d’accès"
                    value={form.accessCode}
                    onChangeText={(value) =>
                      field("accessCode", value)
                    }
                    autoCapitalize="characters"
                  />
                ) : null}

                <View
                  style={[
                    styles.summary,
                    {
                      backgroundColor:
                        theme.colors.surfaceSoft,
                      borderColor:
                        theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.summaryTitle,
                      {
                        color:
                          theme.colors.foreground,
                      },
                    ]}
                  >
                    Prêt à enregistrer
                  </Text>
                  <Text
                    style={[
                      styles.summaryText,
                      {
                        color:
                          theme.colors
                            .foregroundMuted,
                      },
                    ]}
                  >
                    Le formateur responsable sera
                    propriétaire de la formation.
                    La création reste en brouillon.
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          <View style={styles.footer}>
            <AppButton
              title={
                step === 0
                  ? "Annuler"
                  : "Précédent"
              }
              variant="secondary"
              onPress={() => {
                if (step === 0) {
                  requestCancel();
                } else {
                  setStep((current) =>
                    Math.max(0, current - 1),
                  );
                }
              }}
              style={styles.footerButton}
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
                    setStep((current) =>
                      Math.min(3, current + 1),
                    );
                  }
                } else {
                  void save();
                }
              }}
              style={styles.footerButton}
            />
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
        onRequestClose={() =>
          setPicker(null)
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fermer le sélecteur"
          style={[styles.modalBackdrop, { paddingBottom: Math.max(14, insets.bottom + 8) }]}
          onPress={() => setPicker(null)}
        >
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor:
                  theme.colors.surfaceElevated,
                borderColor:
                  theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color:
                    theme.colors.foreground,
                },
              ]}
            >
              Choisir
            </Text>

            <ScrollView
              style={styles.modalList}
            >
              {pickerOptions().map((option) => (
                <Pressable
                  key={option.key}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  onPress={() =>
                    selectOption(option)
                  }
                  style={[
                    styles.option,
                    {
                      borderBottomColor:
                        theme.colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.optionLabel,
                      {
                        color:
                          theme.colors
                            .foreground,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                  {option.helper ? (
                    <Text
                      style={[
                        styles.optionHelper,
                        {
                          color:
                            theme.colors
                              .foregroundMuted,
                        },
                      ]}
                    >
                      {option.helper}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );

  function Field(
    props: React.ComponentProps<
      typeof TextInput
    > & {
      label: string;
      large?: boolean;
    },
  ) {
    const {
      label,
      multiline,
      large,
      ...inputProps
    } = props;

    return (
      <View style={styles.field}>
        <Text
          style={[
            styles.label,
            {
              color:
                theme.colors.foregroundMuted,
            },
          ]}
        >
          {label}
        </Text>
        <TextInput
          {...inputProps}
          accessibilityLabel={inputProps.accessibilityLabel ?? label}
          multiline={multiline}
          placeholderTextColor={
            theme.colors.foregroundSubtle
          }
          style={[
            styles.input,
            multiline && styles.multiline,
            large && styles.largeInput,
            {
              color:
                theme.colors.foreground,
              backgroundColor:
                theme.colors.background,
              borderColor:
                theme.colors.border,
            },
          ]}
        />
      </View>
    );
  }

  function SelectField({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: string;
    onPress: () => void;
  }) {
    return (
      <View style={styles.field}>
        <Text
          style={[
            styles.label,
            {
              color:
                theme.colors.foregroundMuted,
            },
          ]}
        >
          {label}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} : ${value || "Non renseigné"}`}
          onPress={onPress}
          style={[
            styles.select,
            {
              backgroundColor:
                theme.colors.background,
              borderColor:
                theme.colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.selectText,
              {
                color:
                  theme.colors.foreground,
              },
            ]}
          >
            {value}
          </Text>
          <Text
            style={{
              color:
                theme.colors.foregroundSubtle,
            }}
          >
            ›
          </Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: 36,
  },
  page: {
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginTop: 5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 5,
  },
  progress: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 18,
  },
  progressItem: {
    flex: 1,
    minWidth: 0,
  },
  progressBar: {
    height: 4,
    borderRadius: 99,
  },
  progressLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 6,
  },
  notice: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    padding: 18,
  },
  field: {
    marginBottom: 15,
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
    minHeight: 84,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  fieldHelp: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    marginBottom: 12,
  },
  coverSection: {
    marginTop: 2,
  },
  coverPreview: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderRadius: 14,
    marginBottom: 10,
  },
  coverPlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    marginBottom: 10,
  },
  coverPlaceholderTitle: {
    fontSize: 14,
    fontWeight: "900",
  },
  coverPlaceholderText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 4,
  },
  coverHelp: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  coverFileName: {
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 8,
  },
  coverButton: {
    alignSelf: "flex-start",
    minWidth: 190,
  },
  summary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "900",
  },
  summaryText: {
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 16,
  },
  footerButton: {
    minWidth: 150,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 620,
    maxHeight: "78%",
    borderWidth: 1,
    borderRadius: 16,
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
  optionHelper: {
    fontSize: 10,
    marginTop: 3,
  },
});