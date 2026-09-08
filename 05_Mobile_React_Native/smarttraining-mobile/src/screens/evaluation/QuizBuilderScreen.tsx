import { isAxiosError } from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  createManageableOption,
  createManageableQuestion,
  createManageableQuiz,
  deleteManageableOption,
  deleteManageableQuestion,
  deleteManageableQuiz,
  getManageableQuizFull,
  getManageableQuizzesByTraining,
  getQuizBuilderTrainingOutline,
  updateManageableOption,
  updateManageableQuestion,
  updateManageableQuiz,
} from "../../features/evaluation/quizAuthoringService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  AnswerOptionAuthoringResponse,
  AuthoringQuestionType,
  QuestionAuthoringRequest,
  QuestionFullAuthoringResponse,
  QuestionTypeConfigRequest,
  QuizAuthoringRequest,
  QuizAuthoringResponse,
  QuizBuilderModuleOption,
  QuizCorrectAnswerPolicy,
  QuizFullAuthoringResponse,
  QuizResultPolicy,
} from "../../types/quizAuthoringMobile";

type Props = {
  trainingId: number;
  onBack: () => void;
};

type QuizForm = {
  moduleId: number | null;
  title: string;
  description: string;
  passingScore: string;
  maxAttempts: string;
  timeLimitMinutes: string;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  resultPolicy: QuizResultPolicy;
  correctAnswerPolicy: QuizCorrectAnswerPolicy;
  successFeedback: string;
  failureFeedback: string;
};

type DraftOption = {
  id?: number;
  content: string;
  correct: boolean;
};

type FillRow = {
  accepted: string;
  caseSensitive: boolean;
  trim: boolean;
};

type MatchingRow = { left: string; right: string };
type DragItemRow = { text: string; targetZone: number };

type QuestionDraft = {
  id?: number;
  type: AuthoringQuestionType;
  content: string;
  points: string;
  orderIndex: number;
  explanation: string;
  options: DraftOption[];
  fillRows: FillRow[];
  orderingItems: string[];
  matchingRows: MatchingRow[];
  dragZones: string[];
  dragItems: DragItemRow[];
  numericExpected: string;
  numericTolerance: string;
  numericUnit: string;
};

type ConfirmTarget =
  | { kind: "QUIZ"; id: number; label: string }
  | { kind: "QUESTION"; id: number; label: string }
  | { kind: "PUBLISH"; id: number; label: string }
  | null;

const QUESTION_TYPES: {
  value: AuthoringQuestionType;
  label: string;
  helper: string;
}[] = [
  { value: "SINGLE_CHOICE", label: "Choix unique", helper: "Une seule bonne réponse." },
  { value: "MULTIPLE_CHOICE", label: "Choix multiples", helper: "Plusieurs bonnes réponses possibles." },
  { value: "TRUE_FALSE", label: "Vrai / Faux", helper: "Deux choix, une bonne réponse." },
  { value: "FILL_BLANK", label: "Texte à trous", helper: "Variantes acceptées par trou." },
  { value: "ORDERING", label: "Ordonnancement", helper: "L'ordre affiché est l'ordre correct." },
  { value: "MATCHING", label: "Association", helper: "Associez chaque élément gauche à un élément droit." },
  { value: "DRAG_DROP", label: "Glisser-déposer", helper: "Déposez chaque élément dans une zone cible." },
  { value: "NUMERIC", label: "Numérique", helper: "Valeur attendue avec tolérance." },
];

const TYPE_LABEL = Object.fromEntries(
  QUESTION_TYPES.map((item) => [item.value, item.label]),
) as Record<AuthoringQuestionType, string>;

function apiError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string; error?: string }
      | undefined;
    return data?.message || data?.error || "L'opération a échoué.";
  }

  if (error instanceof Error && error.message) return error.message;
  return "L'opération a échoué.";
}

function emptyQuizForm(): QuizForm {
  return {
    moduleId: null,
    title: "",
    description: "",
    passingScore: "70",
    maxAttempts: "2",
    timeLimitMinutes: "0",
    shuffleQuestions: false,
    shuffleOptions: false,
    resultPolicy: "AFTER_SUBMIT",
    correctAnswerPolicy: "NEVER",
    successFeedback: "",
    failureFeedback: "",
  };
}

function defaultOptions(type: AuthoringQuestionType): DraftOption[] {
  if (type === "TRUE_FALSE") {
    return [
      { content: "Vrai", correct: true },
      { content: "Faux", correct: false },
    ];
  }

  if (type === "SINGLE_CHOICE" || type === "MULTIPLE_CHOICE") {
    return [
      { content: "", correct: true },
      { content: "", correct: false },
    ];
  }

  return [];
}

function emptyQuestion(
  orderIndex: number,
  type: AuthoringQuestionType = "SINGLE_CHOICE",
): QuestionDraft {
  return {
    type,
    content: "",
    points: "10",
    orderIndex,
    explanation: "",
    options: defaultOptions(type),
    fillRows: [{ accepted: "", caseSensitive: false, trim: true }],
    orderingItems: ["", ""],
    matchingRows: [
      { left: "", right: "" },
      { left: "", right: "" },
    ],
    dragZones: ["Zone 1"],
    dragItems: [{ text: "", targetZone: 0 }],
    numericExpected: "",
    numericTolerance: "0",
    numericUnit: "",
  };
}

function quizFormFrom(quiz: QuizAuthoringResponse): QuizForm {
  return {
    moduleId: quiz.moduleId ?? null,
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    passingScore: String(quiz.passingScore ?? 70),
    maxAttempts: String(quiz.maxAttempts ?? 2),
    timeLimitMinutes: String(quiz.timeLimitMinutes ?? 0),
    shuffleQuestions: Boolean(quiz.shuffleQuestions),
    shuffleOptions: Boolean(quiz.shuffleOptions),
    resultPolicy: quiz.resultPolicy ?? "AFTER_SUBMIT",
    correctAnswerPolicy: quiz.correctAnswerPolicy ?? "NEVER",
    successFeedback: quiz.successFeedback ?? "",
    failureFeedback: quiz.failureFeedback ?? "",
  };
}

function normalizeAccepted(
  value: string,
  caseSensitive: boolean,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  value.split("|").forEach((raw) => {
    const item = raw.trim();
    if (!item) return;
    const key = caseSensitive ? item : item.toLocaleLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });

  return result;
}

function configFromDraft(
  draft: QuestionDraft,
): QuestionTypeConfigRequest | undefined {
  if (draft.type === "FILL_BLANK") {
    return {
      version: 1,
      fillBlank: {
        blanks: draft.fillRows.map((row, index) => ({
          id: `blank_${index + 1}`,
          accepted: normalizeAccepted(row.accepted, row.caseSensitive),
          caseSensitive: row.caseSensitive,
          trim: row.trim,
        })),
      },
    };
  }

  if (draft.type === "ORDERING") {
    return {
      version: 1,
      ordering: {
        items: draft.orderingItems.map((text, index) => ({
          id: `order_${index + 1}`,
          text: text.trim(),
          correctIndex: index,
        })),
      },
    };
  }

  if (draft.type === "MATCHING") {
    return {
      version: 1,
      matching: {
        left: draft.matchingRows.map((row, index) => ({
          id: `left_${index + 1}`,
          text: row.left.trim(),
        })),
        right: draft.matchingRows.map((row, index) => ({
          id: `right_${index + 1}`,
          text: row.right.trim(),
        })),
        pairs: draft.matchingRows.map((_, index) => ({
          leftId: `left_${index + 1}`,
          rightId: `right_${index + 1}`,
        })),
      },
    };
  }

  if (draft.type === "DRAG_DROP") {
    return {
      version: 1,
      dragDrop: {
        zones: draft.dragZones.map((text, index) => ({
          id: `zone_${index + 1}`,
          text: text.trim(),
        })),
        items: draft.dragItems.map((item, index) => ({
          id: `item_${index + 1}`,
          text: item.text.trim(),
        })),
        placements: draft.dragItems.map((item, index) => ({
          itemId: `item_${index + 1}`,
          zoneId: `zone_${item.targetZone + 1}`,
        })),
      },
    };
  }

  if (draft.type === "NUMERIC") {
    return {
      version: 1,
      numeric: {
        expected: Number(draft.numericExpected),
        tolerance: Number(draft.numericTolerance || 0),
        unit: draft.numericUnit.trim() || null,
      },
    };
  }

  return undefined;
}

function questionDraftFrom(
  question: QuestionFullAuthoringResponse,
): QuestionDraft {
  const draft = emptyQuestion(question.orderIndex ?? 1, question.type);
  draft.id = question.id;
  draft.content = question.content ?? "";
  draft.points = String(question.points ?? 1);
  draft.explanation = question.explanation ?? "";
  draft.options = [...(question.options ?? [])]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((option) => ({
      id: option.id,
      content: option.content,
      correct: Boolean(option.correct),
    }));

  const config = question.typeConfig;

  if (config?.fillBlank?.blanks?.length) {
    draft.fillRows = config.fillBlank.blanks.map((blank) => ({
      accepted: blank.accepted.join(" | "),
      caseSensitive: Boolean(blank.caseSensitive),
      trim: blank.trim !== false,
    }));
  }

  if (config?.ordering?.items?.length) {
    draft.orderingItems = [...config.ordering.items]
      .sort((a, b) => a.correctIndex - b.correctIndex)
      .map((item) => item.text);
  }

  if (config?.matching?.pairs?.length) {
    draft.matchingRows = config.matching.pairs.map((pair) => ({
      left:
        config.matching?.left.find((item) => item.id === pair.leftId)?.text ?? "",
      right:
        config.matching?.right.find((item) => item.id === pair.rightId)?.text ?? "",
    }));
  }

  if (config?.dragDrop?.items?.length) {
    draft.dragZones = config.dragDrop.zones.map((zone) => zone.text);
    draft.dragItems = config.dragDrop.items.map((item) => {
      const placement = config.dragDrop?.placements.find(
        (entry) => entry.itemId === item.id,
      );
      const zoneIndex = config.dragDrop?.zones.findIndex(
        (zone) => zone.id === placement?.zoneId,
      );
      return {
        text: item.text,
        targetZone:
          zoneIndex !== undefined && zoneIndex >= 0 ? zoneIndex : 0,
      };
    });
  }

  if (config?.numeric) {
    draft.numericExpected = String(config.numeric.expected);
    draft.numericTolerance = String(config.numeric.tolerance ?? 0);
    draft.numericUnit = config.numeric.unit ?? "";
  }

  if (question.type === "TRUE_FALSE" && draft.options.length !== 2) {
    draft.options = defaultOptions("TRUE_FALSE");
  }

  return draft;
}

function validateQuiz(form: QuizForm): string {
  const passing = Number(form.passingScore);
  const attempts = Number(form.maxAttempts);
  const time = Number(form.timeLimitMinutes);

  if (!form.title.trim()) return "Le titre du quiz est obligatoire.";
  if (form.title.trim().length > 255) return "Le titre est trop long.";
  if (form.description.length > 1000) {
    return "La description dépasse 1000 caractères.";
  }
  if (!Number.isInteger(passing) || passing < 0 || passing > 100) {
    return "Le seuil doit être un entier entre 0 et 100.";
  }
  if (!Number.isInteger(attempts) || attempts < 1) {
    return "Le nombre de tentatives doit être au moins 1.";
  }
  if (!Number.isInteger(time) || time < 0) {
    return "La durée doit être un entier positif ou nul.";
  }
  if (form.successFeedback.length > 2000) {
    return "Le feedback de réussite dépasse 2000 caractères.";
  }
  if (form.failureFeedback.length > 2000) {
    return "Le feedback d'échec dépasse 2000 caractères.";
  }
  return "";
}

function validateQuestion(draft: QuestionDraft): string {
  const points = Number(draft.points);

  if (!draft.content.trim()) return "Le texte de la question est obligatoire.";
  if (draft.content.length > 1000) return "La question dépasse 1000 caractères.";
  if (!Number.isInteger(points) || points < 1) {
    return "Les points doivent être un entier supérieur à 0.";
  }
  if (draft.explanation.length > 1000) {
    return "L'explication dépasse 1000 caractères.";
  }

  if (
    draft.type === "SINGLE_CHOICE" ||
    draft.type === "MULTIPLE_CHOICE" ||
    draft.type === "TRUE_FALSE"
  ) {
    if (draft.options.length < 2) return "Ajoutez au moins deux réponses.";
    if (draft.options.some((item) => !item.content.trim())) {
      return "Toutes les réponses doivent être renseignées.";
    }
    const correct = draft.options.filter((item) => item.correct).length;
    if (
      (draft.type === "SINGLE_CHOICE" || draft.type === "TRUE_FALSE") &&
      correct !== 1
    ) {
      return "Ce type exige exactement une bonne réponse.";
    }
    if (draft.type === "MULTIPLE_CHOICE" && correct < 1) {
      return "Sélectionnez au moins une bonne réponse.";
    }
  }

  if (
    draft.type === "FILL_BLANK" &&
    draft.fillRows.some(
      (row) => normalizeAccepted(row.accepted, row.caseSensitive).length === 0,
    )
  ) {
    return "Chaque trou doit avoir au moins une réponse acceptée.";
  }

  if (
    draft.type === "ORDERING" &&
    (draft.orderingItems.length < 2 ||
      draft.orderingItems.some((item) => !item.trim()))
  ) {
    return "Renseignez au moins deux éléments à ordonner.";
  }

  if (
    draft.type === "MATCHING" &&
    draft.matchingRows.some((row) => !row.left.trim() || !row.right.trim())
  ) {
    return "Chaque paire doit être entièrement renseignée.";
  }

  if (draft.type === "DRAG_DROP") {
    if (!draft.dragZones.length || draft.dragZones.some((zone) => !zone.trim())) {
      return "Ajoutez au moins une zone cible.";
    }
    if (
      !draft.dragItems.length ||
      draft.dragItems.some(
        (item) =>
          !item.text.trim() ||
          item.targetZone < 0 ||
          item.targetZone >= draft.dragZones.length,
      )
    ) {
      return "Chaque élément doit avoir une zone cible valide.";
    }
  }

  if (draft.type === "NUMERIC") {
    const expected = Number(draft.numericExpected);
    const tolerance = Number(draft.numericTolerance || 0);
    if (!Number.isFinite(expected)) {
      return "La valeur attendue doit être numérique.";
    }
    if (!Number.isFinite(tolerance) || tolerance < 0) {
      return "La tolérance doit être positive ou nulle.";
    }
  }

  return "";
}

function quizRequest(
  trainingId: number,
  form: QuizForm,
  status: QuizAuthoringResponse["status"],
): QuizAuthoringRequest {
  return {
    trainingId,
    moduleId: form.moduleId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    passingScore: Number(form.passingScore),
    maxAttempts: Number(form.maxAttempts),
    timeLimitMinutes: Number(form.timeLimitMinutes),
    shuffleQuestions: form.shuffleQuestions,
    shuffleOptions: form.shuffleOptions,
    resultPolicy: form.resultPolicy,
    correctAnswerPolicy: form.correctAnswerPolicy,
    successFeedback: form.successFeedback.trim() || null,
    failureFeedback: form.failureFeedback.trim() || null,
    status,
  };
}

function questionRequest(
  quizId: number,
  draft: QuestionDraft,
  orderIndex = draft.orderIndex,
): QuestionAuthoringRequest {
  return {
    quizId,
    content: draft.content.trim(),
    type: draft.type,
    orderIndex,
    points: Number(draft.points),
    explanation: draft.explanation.trim() || null,
    typeConfig: configFromDraft(draft),
  };
}

function existingQuestionRequest(
  question: QuestionFullAuthoringResponse,
  orderIndex: number,
): QuestionAuthoringRequest {
  return {
    quizId: question.quizId,
    content: question.content,
    type: question.type,
    orderIndex,
    points: question.points,
    explanation: question.explanation,
    typeConfig: question.typeConfig,
  };
}

function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length || from === to) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
}) {
  const { theme } = useSmartTrainingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.accent
            : theme.colors.surfaceSoft,
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: selected
            ? theme.colors.accentForeground
            : theme.colors.foreground,
          fontWeight: "800",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SmallAction({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const { theme } = useSmartTrainingTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallAction,
        {
          borderColor: danger ? theme.colors.danger : theme.colors.border,
          backgroundColor: theme.colors.surfaceSoft,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: danger ? theme.colors.danger : theme.colors.foreground,
          fontWeight: "800",
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useSmartTrainingTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.colors.foreground }]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function DragAssignmentItem({
  label,
  itemIndex,
  zones,
  targetZone,
  onTargetZone,
  onDropAt,
}: {
  label: string;
  itemIndex: number;
  zones: string[];
  targetZone: number;
  onTargetZone: (index: number) => void;
  onDropAt: (itemIndex: number, x: number, y: number) => void;
}) {
  const { theme } = useSmartTrainingTheme();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          setDragging(true);
          setDragOffset({ x: 0, y: 0 });
        },
        onPanResponderMove: (_, gesture) => {
          setDragOffset({
            x: gesture.dx,
            y: gesture.dy,
          });
        },
        onPanResponderRelease: (_, gesture) => {
          onDropAt(itemIndex, gesture.moveX, gesture.moveY);
          setDragging(false);
          setDragOffset({ x: 0, y: 0 });
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          setDragOffset({ x: 0, y: 0 });
        },
      }),
    [itemIndex, onDropAt],
  );

  return (
    <View style={styles.dragItemCard}>
      <View
        {...panResponder.panHandlers}
        style={[
          styles.dragHandle,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: dragging
              ? theme.colors.focusRing
              : theme.colors.accent,
            opacity: dragging ? 0.92 : 1,
            transform: [
              { translateX: dragOffset.x },
              { translateY: dragOffset.y },
            ],
          },
        ]}
      >
        <Text style={{ color: theme.colors.foreground, fontWeight: "900" }}>
          ↕ {label || `Élément ${itemIndex + 1}`}
        </Text>
        <Text style={{ color: theme.colors.foregroundMuted, fontSize: 11 }}>
          Glissez vers une zone cible
        </Text>
      </View>

      <Text style={{ color: theme.colors.foregroundMuted, fontSize: 12 }}>
        Alternative accessible : touchez directement la cible
      </Text>
      <View style={styles.chipWrap}>
        {zones.map((zone, index) => (
          <Chip
            key={`${zone}-${index}`}
            label={zone || `Zone ${index + 1}`}
            selected={targetZone === index}
            onPress={() => onTargetZone(index)}
          />
        ))}
      </View>
    </View>
  );
}

export default function QuizBuilderScreen({ trainingId, onBack }: Props) {
  const { theme } = useSmartTrainingTheme();
  const [trainingTitle, setTrainingTitle] = useState("");
  const [modules, setModules] = useState<QuizBuilderModuleOption[]>([]);
  const [quizzes, setQuizzes] = useState<QuizAuthoringResponse[]>([]);
  const [activeQuiz, setActiveQuiz] =
    useState<QuizFullAuthoringResponse | null>(null);
  const [form, setForm] = useState<QuizForm>(emptyQuizForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [questionDraft, setQuestionDraft] =
    useState<QuestionDraft | null>(null);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget>(null);
  const [confirmWorking, setConfirmWorking] = useState(false);
  const zoneRefs = useRef<Record<number, View | null>>({});

  const inputStyle = [
    styles.input,
    {
      color: theme.colors.foreground,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  ];

  const questions = useMemo(
    () =>
      [...(activeQuiz?.questions ?? [])].sort(
        (a, b) => a.orderIndex - b.orderIndex || a.id - b.id,
      ),
    [activeQuiz],
  );

  const load = useCallback(
    async (preferredQuizId?: number) => {
      const [outline, list] = await Promise.all([
        getQuizBuilderTrainingOutline(trainingId),
        getManageableQuizzesByTraining(trainingId),
      ]);
      setTrainingTitle(outline.title || `Formation ${trainingId}`);
      setModules(outline.modules ?? []);
      setQuizzes(list);

      if (preferredQuizId) {
        const full = await getManageableQuizFull(preferredQuizId);
        setActiveQuiz(full);
        setForm(quizFormFrom(full));
      } else if (!list.length) {
        setActiveQuiz(null);
        setForm(emptyQuizForm());
      }
    },
    [trainingId],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void load()
        .then(() => {
          if (active) setError("");
        })
        .catch((caught) => {
          if (active) setError(apiError(caught));
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [load]);

  async function refresh(): Promise<void> {
    setRefreshing(true);
    setError("");
    try {
      await load(activeQuiz?.id);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setRefreshing(false);
    }
  }

  async function openQuiz(id: number): Promise<void> {
    setError("");
    setNotice("");
    try {
      const full = await getManageableQuizFull(id);
      setActiveQuiz(full);
      setForm(quizFormFrom(full));
    } catch (caught) {
      setError(apiError(caught));
    }
  }

  function newQuiz(): void {
    setActiveQuiz(null);
    setForm(emptyQuizForm());
    setNotice("");
    setError("");
  }

  async function saveQuiz(): Promise<void> {
    const validation = validateQuiz(form);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (activeQuiz) {
        const updated = await updateManageableQuiz(
          activeQuiz.id,
          quizRequest(trainingId, form, activeQuiz.status),
        );
        await load(updated.id);
        setNotice("Paramètres du quiz enregistrés.");
      } else {
        const created = await createManageableQuiz(
          quizRequest(trainingId, form, "DRAFT"),
        );
        await load(created.id);
        setNotice("Quiz créé en brouillon.");
      }
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function setQuizStatus(status: "DRAFT" | "ARCHIVED") {
    if (!activeQuiz) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateManageableQuiz(
        activeQuiz.id,
        quizRequest(trainingId, form, status),
      );
      await load(updated.id);
      setNotice(
        status === "DRAFT" ? "Quiz repassé en brouillon." : "Quiz archivé.",
      );
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setSaving(false);
    }
  }

  async function publishQuiz() {
    if (!activeQuiz) return;
    if (!questions.length) {
      setError("Ajoutez au moins une question avant de publier.");
      return;
    }
    setConfirmWorking(true);
    setError("");
    try {
      const updated = await updateManageableQuiz(
        activeQuiz.id,
        quizRequest(trainingId, form, "PUBLISHED"),
      );
      setConfirmTarget(null);
      await load(updated.id);
      setNotice("Quiz publié.");
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setConfirmWorking(false);
    }
  }

  function changeQuestionType(type: AuthoringQuestionType) {
    setQuestionDraft((current) => {
      if (!current) return current;
      const next = emptyQuestion(current.orderIndex, type);
      return {
        ...next,
        id: current.id,
        content: current.content,
        points: current.points,
        explanation: current.explanation,
      };
    });
  }

  async function syncOptions(
    questionId: number,
    desired: DraftOption[],
    existing: AnswerOptionAuthoringResponse[],
  ) {
    const current = [...existing].sort(
      (a, b) => a.orderIndex - b.orderIndex || a.id - b.id,
    );

    for (let index = 0; index < desired.length; index += 1) {
      const request = {
        questionId,
        content: desired[index].content.trim(),
        correct: desired[index].correct,
        orderIndex: index + 1,
      };
      if (current[index]) {
        await updateManageableOption(current[index].id, request);
      } else {
        await createManageableOption(request);
      }
    }

    for (let index = desired.length; index < current.length; index += 1) {
      await deleteManageableOption(current[index].id);
    }
  }

  async function saveQuestion() {
    if (!activeQuiz || !questionDraft) return;
    const validation = validateQuestion(questionDraft);
    if (validation) {
      setError(validation);
      return;
    }

    const existing = questionDraft.id
      ? activeQuiz.questions.find((item) => item.id === questionDraft.id)
      : undefined;
    let createdId = 0;
    setQuestionSaving(true);
    setError("");

    try {
      const saved = existing
        ? await updateManageableQuestion(
            existing.id,
            questionRequest(activeQuiz.id, questionDraft),
          )
        : await createManageableQuestion(
            questionRequest(activeQuiz.id, questionDraft),
          );
      if (!existing) createdId = saved.id;

      const simple =
        questionDraft.type === "SINGLE_CHOICE" ||
        questionDraft.type === "MULTIPLE_CHOICE" ||
        questionDraft.type === "TRUE_FALSE";
      await syncOptions(
        saved.id,
        simple ? questionDraft.options : [],
        existing?.options ?? [],
      );

      setQuestionDraft(null);
      await load(activeQuiz.id);
      setNotice(existing ? "Question mise à jour." : "Question ajoutée.");
    } catch (caught) {
      if (createdId) {
        try {
          await deleteManageableQuestion(createdId);
        } catch {
          // Best-effort compensation. M8B vérifie ensuite l'absence d'orphelin.
        }
      }
      setError(apiError(caught));
    } finally {
      setQuestionSaving(false);
    }
  }

  async function moveQuestion(index: number, delta: -1 | 1) {
    if (!activeQuiz) return;
    const current = questions[index];
    const target = questions[index + delta];
    if (!current || !target) return;

    setError("");
    try {
      await updateManageableQuestion(
        current.id,
        existingQuestionRequest(current, target.orderIndex),
      );
      await updateManageableQuestion(
        target.id,
        existingQuestionRequest(target, current.orderIndex),
      );
      await load(activeQuiz.id);
      setNotice("Ordre des questions mis à jour.");
    } catch (caught) {
      setError(apiError(caught));
      await load(activeQuiz.id);
    }
  }

  async function confirmDelete() {
    if (!confirmTarget || confirmTarget.kind === "PUBLISH") return;
    setConfirmWorking(true);
    setError("");
    try {
      if (confirmTarget.kind === "QUIZ") {
        await deleteManageableQuiz(confirmTarget.id);
        setActiveQuiz(null);
        setForm(emptyQuizForm());
        await load();
        setNotice("Quiz supprimé.");
      } else {
        await deleteManageableQuestion(confirmTarget.id);
        if (activeQuiz) await load(activeQuiz.id);
        setNotice("Question supprimée.");
      }
      setConfirmTarget(null);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setConfirmWorking(false);
    }
  }

  const assignDragByPoint = useCallback(
    (itemIndex: number, x: number, y: number) => {
      Object.entries(zoneRefs.current).forEach(([key, node]) => {
        node?.measureInWindow((zx, zy, width, height) => {
          if (x >= zx && x <= zx + width && y >= zy && y <= zy + height) {
            const zoneIndex = Number(key);
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    dragItems: current.dragItems.map((item, index) =>
                      index === itemIndex
                        ? { ...item, targetZone: zoneIndex }
                        : item,
                    ),
                  }
                : current,
            );
          }
        });
      });
    },
    [],
  );

  function renderSimpleEditor(): ReactNode {
    if (!questionDraft) return null;
    const fixed = questionDraft.type === "TRUE_FALSE";
    return (
      <View style={styles.editorGroup}>
        <Text style={[styles.groupTitle, { color: theme.colors.foreground }]}>Réponses et correction</Text>
        {questionDraft.options.map((option, index) => (
          <View key={`${option.id ?? "new"}-${index}`} style={styles.optionRow}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: option.correct }}
              onPress={() =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        options: current.options.map((item, itemIndex) => ({
                          ...item,
                          correct:
                            current.type === "SINGLE_CHOICE" ||
                            current.type === "TRUE_FALSE"
                              ? itemIndex === index
                              : itemIndex === index
                                ? !item.correct
                                : item.correct,
                        })),
                      }
                    : current,
                )
              }
              style={[
                styles.check,
                {
                  borderColor: option.correct
                    ? theme.colors.accent
                    : theme.colors.border,
                  backgroundColor: option.correct
                    ? theme.colors.accent
                    : theme.colors.surface,
                },
              ]}
            >
              <Text style={{ color: option.correct ? theme.colors.accentForeground : theme.colors.foreground }}>
                {option.correct ? "✓" : "○"}
              </Text>
            </Pressable>
            <TextInput
              accessibilityLabel={`Réponse ${index + 1}`}
              editable={!fixed}
              value={option.content}
              onChangeText={(value) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        options: current.options.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, content: value } : item,
                        ),
                      }
                    : current,
                )
              }
              placeholder={`Réponse ${index + 1}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              style={[inputStyle, styles.optionInput]}
            />
            {!fixed && questionDraft.options.length > 2 ? (
              <SmallAction
                label="Retirer"
                danger
                onPress={() =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          options: current.options.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }
                      : current,
                  )
                }
              />
            ) : null}
          </View>
        ))}
        {!fixed ? (
          <SmallAction
            label="+ Ajouter une réponse"
            onPress={() =>
              setQuestionDraft((current) =>
                current
                  ? {
                      ...current,
                      options: [
                        ...current.options,
                        { content: "", correct: false },
                      ],
                    }
                  : current,
              )
            }
          />
        ) : null}
      </View>
    );
  }

  function renderFillBlankEditor(): ReactNode {
    if (!questionDraft) return null;
    return (
      <View style={styles.editorGroup}>
        <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>Séparez les variantes par |. Les doublons équivalents sont supprimés automatiquement.</Text>
        {questionDraft.fillRows.map((row, index) => (
          <View key={index} style={[styles.subCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]}>
            <Field label={`Trou ${index + 1} — réponses acceptées`}>
              <TextInput
                accessibilityLabel={`Réponse acceptée ${index + 1}`}
                value={row.accepted}
                onChangeText={(value) =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          fillRows: current.fillRows.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, accepted: value }
                              : item,
                          ),
                        }
                      : current,
                  )
                }
                placeholder="Paris | capitale de la France"
                placeholderTextColor={theme.colors.foregroundMuted}
                style={inputStyle}
              />
            </Field>
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.foreground }}>Respecter la casse</Text>
              <Switch
                value={row.caseSensitive}
                onValueChange={(value) =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          fillRows: current.fillRows.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, caseSensitive: value }
                              : item,
                          ),
                        }
                      : current,
                  )
                }
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.foreground }}>Ignorer les espaces externes</Text>
              <Switch
                value={row.trim}
                onValueChange={(value) =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          fillRows: current.fillRows.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, trim: value } : item,
                          ),
                        }
                      : current,
                  )
                }
              />
            </View>
            {questionDraft.fillRows.length > 1 ? (
              <SmallAction
                label="Retirer ce trou"
                danger
                onPress={() =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          fillRows: current.fillRows.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }
                      : current,
                  )
                }
              />
            ) : null}
          </View>
        ))}
        <SmallAction
          label="+ Ajouter un trou"
          onPress={() =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    fillRows: [
                      ...current.fillRows,
                      { accepted: "", caseSensitive: false, trim: true },
                    ],
                  }
                : current,
            )
          }
        />
      </View>
    );
  }

  function renderOrderingEditor(): ReactNode {
    if (!questionDraft) return null;
    return (
      <View style={styles.editorGroup}>
        <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>L’ordre affiché est l’ordre correct. Monter / Descendre constitue l’alternative tactile accessible.</Text>
        {questionDraft.orderingItems.map((item, index) => (
          <View key={index} style={styles.orderRow}>
            <Text style={[styles.orderNumber, { color: theme.colors.accent }]}>{index + 1}</Text>
            <TextInput
              accessibilityLabel={`Élément à ordonner ${index + 1}`}
              value={item}
              onChangeText={(value) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        orderingItems: current.orderingItems.map(
                          (entry, itemIndex) =>
                            itemIndex === index ? value : entry,
                        ),
                      }
                    : current,
                )
              }
              placeholder={`Élément ${index + 1}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              style={[inputStyle, styles.orderInput]}
            />
            <View style={styles.verticalActions}>
              <SmallAction
                label="↑ Monter"
                disabled={index === 0}
                onPress={() =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          orderingItems: moveItem(
                            current.orderingItems,
                            index,
                            index - 1,
                          ),
                        }
                      : current,
                  )
                }
              />
              <SmallAction
                label="↓ Descendre"
                disabled={index === questionDraft.orderingItems.length - 1}
                onPress={() =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          orderingItems: moveItem(
                            current.orderingItems,
                            index,
                            index + 1,
                          ),
                        }
                      : current,
                  )
                }
              />
            </View>
          </View>
        ))}
        <SmallAction
          label="+ Ajouter un élément"
          onPress={() =>
            setQuestionDraft((current) =>
              current
                ? { ...current, orderingItems: [...current.orderingItems, ""] }
                : current,
            )
          }
        />
      </View>
    );
  }

  function renderMatchingEditor(): ReactNode {
    if (!questionDraft) return null;
    return (
      <View style={styles.editorGroup}>
        {questionDraft.matchingRows.map((row, index) => (
          <View key={index} style={[styles.subCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]}>
            <TextInput
              accessibilityLabel={`Élément gauche ${index + 1}`}
              value={row.left}
              onChangeText={(value) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        matchingRows: current.matchingRows.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, left: value }
                              : item,
                        ),
                      }
                    : current,
                )
              }
              placeholder={`Élément gauche ${index + 1}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              style={inputStyle}
            />
            <Text style={{ color: theme.colors.foregroundMuted, textAlign: "center" }}>↔ associé à ↔</Text>
            <TextInput
              accessibilityLabel={`Élément droit ${index + 1}`}
              value={row.right}
              onChangeText={(value) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        matchingRows: current.matchingRows.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, right: value }
                              : item,
                        ),
                      }
                    : current,
                )
              }
              placeholder={`Élément droit ${index + 1}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              style={inputStyle}
            />
          </View>
        ))}
        <SmallAction
          label="+ Ajouter une paire"
          onPress={() =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    matchingRows: [
                      ...current.matchingRows,
                      { left: "", right: "" },
                    ],
                  }
                : current,
            )
          }
        />
      </View>
    );
  }

  function renderDragDropEditor(): ReactNode {
    if (!questionDraft) return null;
    return (
      <View style={styles.editorGroup}>
        <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>Glissez chaque élément vers sa cible. Le choix tactile direct reste disponible.</Text>
        <Text style={[styles.groupTitle, { color: theme.colors.foreground }]}>Zones cibles</Text>
        {questionDraft.dragZones.map((zone, index) => (
          <View
            key={index}
            ref={(node) => {
              zoneRefs.current[index] = node;
            }}
            style={[styles.dropZone, { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceSoft }]}
          >
            <TextInput
              accessibilityLabel={`Zone de dépôt ${index + 1}`}
              value={zone}
              onChangeText={(value) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        dragZones: current.dragZones.map((item, itemIndex) =>
                          itemIndex === index ? value : item,
                        ),
                      }
                    : current,
                )
              }
              placeholder={`Zone ${index + 1}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              style={inputStyle}
            />
          </View>
        ))}
        <SmallAction
          label="+ Ajouter une zone"
          onPress={() =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    dragZones: [
                      ...current.dragZones,
                      `Zone ${current.dragZones.length + 1}`,
                    ],
                  }
                : current,
            )
          }
        />

        <Text style={[styles.groupTitle, { color: theme.colors.foreground }]}>Éléments à déplacer</Text>
        {questionDraft.dragItems.map((item, index) => (
          <View key={index} style={[styles.subCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSoft }]}>
            <TextInput
              accessibilityLabel={`Élément à déplacer ${index + 1}`}
              value={item.text}
              onChangeText={(value) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        dragItems: current.dragItems.map((entry, itemIndex) =>
                          itemIndex === index ? { ...entry, text: value } : entry,
                        ),
                      }
                    : current,
                )
              }
              placeholder={`Élément ${index + 1}`}
              placeholderTextColor={theme.colors.foregroundMuted}
              style={inputStyle}
            />
            <DragAssignmentItem
              label={item.text}
              itemIndex={index}
              zones={questionDraft.dragZones}
              targetZone={item.targetZone}
              onDropAt={assignDragByPoint}
              onTargetZone={(targetZone) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        dragItems: current.dragItems.map((entry, itemIndex) =>
                          itemIndex === index
                            ? { ...entry, targetZone }
                            : entry,
                        ),
                      }
                    : current,
                )
              }
            />
          </View>
        ))}
        <SmallAction
          label="+ Ajouter un élément"
          onPress={() =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    dragItems: [
                      ...current.dragItems,
                      { text: "", targetZone: 0 },
                    ],
                  }
                : current,
            )
          }
        />
      </View>
    );
  }

  function renderNumericEditor(): ReactNode {
    if (!questionDraft) return null;
    return (
      <View style={styles.editorGroup}>
        <Field label="Valeur attendue">
          <TextInput
            accessibilityLabel="Réponse numérique attendue"
            value={questionDraft.numericExpected}
            onChangeText={(numericExpected) =>
              setQuestionDraft({ ...questionDraft, numericExpected })
            }
            keyboardType="decimal-pad"
            placeholder="42"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={inputStyle}
          />
        </Field>
        <Field label="Tolérance ±">
          <TextInput
            accessibilityLabel="Tolérance numérique"
            value={questionDraft.numericTolerance}
            onChangeText={(numericTolerance) =>
              setQuestionDraft({ ...questionDraft, numericTolerance })
            }
            keyboardType="decimal-pad"
            placeholder="0.1"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={inputStyle}
          />
        </Field>
        <Field label="Unité (optionnelle)">
          <TextInput
            accessibilityLabel="Unité numérique"
            value={questionDraft.numericUnit}
            onChangeText={(numericUnit) =>
              setQuestionDraft({ ...questionDraft, numericUnit })
            }
            placeholder="kg"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={inputStyle}
          />
        </Field>
      </View>
    );
  }

  function renderTypeEditor(): ReactNode {
    if (!questionDraft) return null;
    if (
      questionDraft.type === "SINGLE_CHOICE" ||
      questionDraft.type === "MULTIPLE_CHOICE" ||
      questionDraft.type === "TRUE_FALSE"
    ) {
      return renderSimpleEditor();
    }
    if (questionDraft.type === "FILL_BLANK") return renderFillBlankEditor();
    if (questionDraft.type === "ORDERING") return renderOrderingEditor();
    if (questionDraft.type === "MATCHING") return renderMatchingEditor();
    if (questionDraft.type === "DRAG_DROP") return renderDragDropEditor();
    return renderNumericEditor();
  }

  if (loading) {
    return <LoadingState message="Chargement du Quiz Builder..." />;
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.flex}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: theme.shape.cardPadding * 2 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <AppButton title="Retour" variant="secondary" onPress={onBack} />
            <SectionHeader
              title="Quiz Builder"
              subtitle={
                trainingTitle ||
                "Créez et pilotez les évaluations de cette formation."
              }
            />

            {error ? (
              <ErrorMessage message={error} onRetry={() => setError("")} />
            ) : null}
            {notice ? (
              <View
                style={[
                  styles.notice,
                  {
                    borderColor: theme.colors.success,
                    backgroundColor: theme.colors.surfaceSoft,
                  },
                ]}
              >
                <Text style={{ color: theme.colors.success, fontWeight: "800" }}>
                  {notice}
                </Text>
              </View>
            ) : null}

            <View style={styles.topActions}>
              <AppButton
                title="Nouveau quiz"
                onPress={newQuiz}
                style={styles.flexButton}
              />
              <AppButton
                title={refreshing ? "Actualisation..." : "Actualiser"}
                variant="secondary"
                disabled={refreshing}
                onPress={() => void refresh()}
                style={styles.flexButton}
              />
            </View>

            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Quiz de la formation</Text>
              {quizzes.length === 0 ? (
                <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>Aucun quiz. Créez le premier brouillon ci-dessous.</Text>
              ) : (
                quizzes.map((quiz) => (
                  <Pressable
                    key={quiz.id}
                    accessibilityRole="button"
                    onPress={() => void openQuiz(quiz.id)}
                    style={({ pressed }) => [
                      styles.quizRow,
                      {
                        borderColor:
                          activeQuiz?.id === quiz.id
                            ? theme.colors.accent
                            : theme.colors.border,
                        backgroundColor: theme.colors.surfaceSoft,
                        opacity: pressed ? 0.76 : 1,
                      },
                    ]}
                  >
                    <View style={styles.quizRowText}>
                      <Text style={[styles.quizTitle, { color: theme.colors.foreground }]}>{quiz.title}</Text>
                      <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>
                        {quiz.status === "DRAFT"
                          ? "Brouillon"
                          : quiz.status === "PUBLISHED"
                            ? "Publié"
                            : "Archivé"} · seuil {quiz.passingScore}% · {quiz.maxAttempts} tentative(s)
                      </Text>
                    </View>
                    <Text style={{ color: theme.colors.accent, fontWeight: "900" }}>Ouvrir ›</Text>
                  </Pressable>
                ))
              )}
            </View>

            <View
              style={[
                styles.card,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>
                {activeQuiz ? "Paramètres du quiz" : "Nouveau quiz"}
              </Text>

              <Field label="Titre">
                <TextInput
                  accessibilityLabel="Titre du quiz"
                  value={form.title}
                  onChangeText={(title) =>
                    setForm((current) => ({ ...current, title }))
                  }
                  placeholder="Quiz final"
                  placeholderTextColor={theme.colors.foregroundMuted}
                  style={inputStyle}
                />
              </Field>

              <Field label="Description">
                <TextInput
                  accessibilityLabel="Description du quiz"
                  value={form.description}
                  onChangeText={(description) =>
                    setForm((current) => ({ ...current, description }))
                  }
                  multiline
                  placeholder="Objectif de l'évaluation..."
                  placeholderTextColor={theme.colors.foregroundMuted}
                  style={[inputStyle, styles.multiline]}
                />
              </Field>

              <Field label="Module associé">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipWrap}
                >
                  <Chip
                    label="Formation entière"
                    selected={form.moduleId === null}
                    onPress={() =>
                      setForm((current) => ({ ...current, moduleId: null }))
                    }
                  />
                  {modules.map((module) => (
                    <Chip
                      key={module.id}
                      label={module.title}
                      selected={form.moduleId === module.id}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          moduleId: module.id,
                        }))
                      }
                    />
                  ))}
                </ScrollView>
              </Field>

              <View style={styles.twoColumns}>
                <Field label="Seuil (%)">
                  <TextInput
                    accessibilityLabel="Score de réussite"
                    value={form.passingScore}
                    onChangeText={(passingScore) =>
                      setForm((current) => ({ ...current, passingScore }))
                    }
                    keyboardType="number-pad"
                    style={inputStyle}
                  />
                </Field>
                <Field label="Tentatives max">
                  <TextInput
                    accessibilityLabel="Nombre maximal de tentatives"
                    value={form.maxAttempts}
                    onChangeText={(maxAttempts) =>
                      setForm((current) => ({ ...current, maxAttempts }))
                    }
                    keyboardType="number-pad"
                    style={inputStyle}
                  />
                </Field>
              </View>

              <Field label="Durée limite en minutes (0 = aucune)">
                <TextInput
                  accessibilityLabel="Durée limite en minutes"
                  value={form.timeLimitMinutes}
                  onChangeText={(timeLimitMinutes) =>
                    setForm((current) => ({ ...current, timeLimitMinutes }))
                  }
                  keyboardType="number-pad"
                  style={inputStyle}
                />
              </Field>

              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.foreground }}>Mélanger les questions</Text>
                <Switch
                  value={form.shuffleQuestions}
                  onValueChange={(shuffleQuestions) =>
                    setForm((current) => ({ ...current, shuffleQuestions }))
                  }
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={{ color: theme.colors.foreground }}>Mélanger les réponses</Text>
                <Switch
                  value={form.shuffleOptions}
                  onValueChange={(shuffleOptions) =>
                    setForm((current) => ({ ...current, shuffleOptions }))
                  }
                />
              </View>

              <Field label="Affichage du résultat">
                <View style={styles.chipWrap}>
                  <Chip
                    label="Après soumission"
                    selected={form.resultPolicy === "AFTER_SUBMIT"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        resultPolicy: "AFTER_SUBMIT",
                      }))
                    }
                  />
                  <Chip
                    label="Après chaque question"
                    selected={form.resultPolicy === "AFTER_EACH_QUESTION"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        resultPolicy: "AFTER_EACH_QUESTION",
                      }))
                    }
                  />
                </View>
              </Field>

              <Field label="Révélation des bonnes réponses">
                <View style={styles.chipWrap}>
                  <Chip
                    label="Jamais"
                    selected={form.correctAnswerPolicy === "NEVER"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        correctAnswerPolicy: "NEVER",
                      }))
                    }
                  />
                  <Chip
                    label="Après soumission"
                    selected={form.correctAnswerPolicy === "AFTER_SUBMIT"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        correctAnswerPolicy: "AFTER_SUBMIT",
                      }))
                    }
                  />
                  <Chip
                    label="Dernière tentative"
                    selected={form.correctAnswerPolicy === "AFTER_LAST_ATTEMPT"}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        correctAnswerPolicy: "AFTER_LAST_ATTEMPT",
                      }))
                    }
                  />
                </View>
              </Field>

              <Field label="Feedback réussite">
                <TextInput
                  accessibilityLabel="Feedback en cas de réussite"
                  value={form.successFeedback}
                  onChangeText={(successFeedback) =>
                    setForm((current) => ({ ...current, successFeedback }))
                  }
                  multiline
                  placeholder="Bravo..."
                  placeholderTextColor={theme.colors.foregroundMuted}
                  style={[inputStyle, styles.multiline]}
                />
              </Field>

              <Field label="Feedback échec">
                <TextInput
                  accessibilityLabel="Feedback en cas d’échec"
                  value={form.failureFeedback}
                  onChangeText={(failureFeedback) =>
                    setForm((current) => ({ ...current, failureFeedback }))
                  }
                  multiline
                  placeholder="À retravailler..."
                  placeholderTextColor={theme.colors.foregroundMuted}
                  style={[inputStyle, styles.multiline]}
                />
              </Field>

              {activeQuiz ? (
                <View style={styles.statusActions}>
                  {activeQuiz.status === "DRAFT" ? (
                    <SmallAction
                      label="Publier"
                      disabled={!questions.length || saving}
                      onPress={() =>
                        setConfirmTarget({
                          kind: "PUBLISH",
                          id: activeQuiz.id,
                          label: activeQuiz.title,
                        })
                      }
                    />
                  ) : (
                    <SmallAction
                      label="Repasser en brouillon"
                      disabled={saving}
                      onPress={() => void setQuizStatus("DRAFT")}
                    />
                  )}
                  {activeQuiz.status !== "ARCHIVED" ? (
                    <SmallAction
                      label="Archiver"
                      disabled={saving}
                      onPress={() => void setQuizStatus("ARCHIVED")}
                    />
                  ) : null}
                  <SmallAction
                    label="Supprimer le quiz"
                    danger
                    disabled={saving}
                    onPress={() =>
                      setConfirmTarget({
                        kind: "QUIZ",
                        id: activeQuiz.id,
                        label: activeQuiz.title,
                      })
                    }
                  />
                </View>
              ) : null}
            </View>

            {activeQuiz ? (
              <View
                style={[
                  styles.card,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <View style={styles.sectionTop}>
                  <View style={styles.quizRowText}>
                    <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Questions ({questions.length})</Text>
                    <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>Édition disponible lorsque le quiz est en brouillon.</Text>
                  </View>
                  <SmallAction
                    label="+ Question"
                    disabled={activeQuiz.status !== "DRAFT"}
                    onPress={() =>
                      setQuestionDraft(emptyQuestion(questions.length + 1))
                    }
                  />
                </View>

                {questions.length === 0 ? (
                  <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>Aucune question. Ajoutez au moins une question avant publication.</Text>
                ) : (
                  questions.map((question, index) => (
                    <View
                      key={question.id}
                      style={[
                        styles.questionCard,
                        {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surfaceSoft,
                        },
                      ]}
                    >
                      <Text style={[styles.questionTitle, { color: theme.colors.foreground }]}>{index + 1}. {question.content}</Text>
                      <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>{TYPE_LABEL[question.type]} · {question.points} pt</Text>
                      <View style={styles.questionActions}>
                        <SmallAction
                          label="↑ Monter"
                          disabled={activeQuiz.status !== "DRAFT" || index === 0}
                          onPress={() => void moveQuestion(index, -1)}
                        />
                        <SmallAction
                          label="↓ Descendre"
                          disabled={
                            activeQuiz.status !== "DRAFT" ||
                            index === questions.length - 1
                          }
                          onPress={() => void moveQuestion(index, 1)}
                        />
                        <SmallAction
                          label="Modifier"
                          disabled={activeQuiz.status !== "DRAFT"}
                          onPress={() =>
                            setQuestionDraft(questionDraftFrom(question))
                          }
                        />
                        <SmallAction
                          label="Supprimer"
                          danger
                          disabled={activeQuiz.status !== "DRAFT"}
                          onPress={() =>
                            setConfirmTarget({
                              kind: "QUESTION",
                              id: question.id,
                              label: question.content,
                            })
                          }
                        />
                      </View>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.stickyFooter,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surfaceElevated,
              },
            ]}
          >
            <AppButton
              title={
                saving
                  ? "Enregistrement..."
                  : activeQuiz
                    ? "Enregistrer le quiz"
                    : "Créer le brouillon"
              }
              disabled={saving}
              onPress={() => void saveQuiz()}
            />
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={Boolean(questionDraft)}
        animationType="slide"
        onRequestClose={() => {
          if (!questionSaving) setQuestionDraft(null);
        }}
      >
        <ScreenContainer>
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.flex}>
              <ScrollView
                style={styles.flex}
                contentContainerStyle={styles.modalContent}
                keyboardShouldPersistTaps="handled"
              >
                <SectionHeader
                  title={
                    questionDraft?.id
                      ? "Modifier la question"
                      : "Nouvelle question"
                  }
                  subtitle="Choisissez le type puis configurez la correction."
                />
                {questionDraft ? (
                  <>
                    <Field label="Type de question">
                      <View style={styles.chipWrap}>
                        {QUESTION_TYPES.map((item) => (
                          <Chip
                            key={item.value}
                            label={item.label}
                            selected={questionDraft.type === item.value}
                            onPress={() => changeQuestionType(item.value)}
                          />
                        ))}
                      </View>
                    </Field>
                    <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>
                      {QUESTION_TYPES.find(
                        (item) => item.value === questionDraft.type,
                      )?.helper}
                    </Text>
                    <Field label="Question">
                      <TextInput
                        accessibilityLabel="Énoncé de la question"
                        value={questionDraft.content}
                        onChangeText={(content) =>
                          setQuestionDraft({ ...questionDraft, content })
                        }
                        multiline
                        placeholder="Saisissez la question..."
                        placeholderTextColor={theme.colors.foregroundMuted}
                        style={[inputStyle, styles.multiline]}
                      />
                    </Field>
                    <View style={styles.twoColumns}>
                      <Field label="Points">
                        <TextInput
                          accessibilityLabel="Points de la question"
                          value={questionDraft.points}
                          onChangeText={(points) =>
                            setQuestionDraft({ ...questionDraft, points })
                          }
                          keyboardType="number-pad"
                          style={inputStyle}
                        />
                      </Field>
                      <Field label="Ordre">
                        <Text
                          style={[
                            styles.readOnlyValue,
                            {
                              color: theme.colors.foreground,
                              backgroundColor: theme.colors.surfaceSoft,
                            },
                          ]}
                        >
                          {questionDraft.orderIndex}
                        </Text>
                      </Field>
                    </View>
                    <Field label="Explication pédagogique">
                      <TextInput
                        accessibilityLabel="Explication de la réponse"
                        value={questionDraft.explanation}
                        onChangeText={(explanation) =>
                          setQuestionDraft({ ...questionDraft, explanation })
                        }
                        multiline
                        placeholder="Explication affichable selon la policy..."
                        placeholderTextColor={theme.colors.foregroundMuted}
                        style={[inputStyle, styles.multiline]}
                      />
                    </Field>
                    {renderTypeEditor()}
                  </>
                ) : null}
              </ScrollView>

              <View
                style={[
                  styles.stickyFooter,
                  {
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceElevated,
                  },
                ]}
              >
                <View style={styles.topActions}>
                  <AppButton
                    title="Annuler"
                    variant="secondary"
                    disabled={questionSaving}
                    onPress={() => setQuestionDraft(null)}
                    style={styles.flexButton}
                  />
                  <AppButton
                    title={
                      questionSaving
                        ? "Enregistrement..."
                        : "Enregistrer la question"
                    }
                    disabled={questionSaving}
                    onPress={() => void saveQuestion()}
                    style={styles.flexButton}
                  />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </ScreenContainer>
      </Modal>

      <Modal
        transparent
        visible={Boolean(confirmTarget)}
        animationType="fade"
        onRequestClose={() => {
          if (!confirmWorking) setConfirmTarget(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.confirmCard,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>
              {confirmTarget?.kind === "PUBLISH"
                ? "Publier le quiz ?"
                : confirmTarget?.kind === "QUIZ"
                  ? "Supprimer le quiz ?"
                  : "Supprimer la question ?"}
            </Text>
            <Text style={[styles.helpText, { color: theme.colors.foregroundMuted }]}>{confirmTarget?.label}</Text>
            {confirmTarget?.kind !== "PUBLISH" ? (
              <Text style={[styles.helpText, { color: theme.colors.danger }]}>Cette suppression est définitive.</Text>
            ) : null}
            <View style={styles.topActions}>
              <AppButton
                title="Annuler"
                variant="secondary"
                disabled={confirmWorking}
                onPress={() => setConfirmTarget(null)}
                style={styles.flexButton}
              />
              <AppButton
                title={confirmWorking ? "Traitement..." : "Confirmer"}
                disabled={confirmWorking}
                onPress={() =>
                  confirmTarget?.kind === "PUBLISH"
                    ? void publishQuiz()
                    : void confirmDelete()
                }
                style={styles.flexButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 14, gap: 14 },
  modalContent: { padding: 14, paddingBottom: 28, gap: 14 },
  topActions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  flexButton: { flex: 1, minWidth: 145 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  cardTitle: { fontSize: 18, fontWeight: "900" },
  helpText: { fontSize: 12, lineHeight: 18 },
  notice: { borderWidth: 1, borderRadius: 14, padding: 12 },
  quizRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  quizRowText: { flex: 1, minWidth: 0, gap: 3 },
  quizTitle: { fontSize: 15, fontWeight: "900" },
  field: { gap: 7, flex: 1, minWidth: 130 },
  fieldLabel: { fontSize: 13, fontWeight: "900" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: { minHeight: 88, textAlignVertical: "top" },
  twoColumns: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  statusActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallAction: {
    minHeight: 36,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  questionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 13,
    gap: 7,
    marginTop: 8,
  },
  questionTitle: { fontSize: 14, fontWeight: "900", lineHeight: 20 },
  questionActions: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  stickyFooter: { borderTopWidth: 1, padding: 12 },
  editorGroup: { gap: 12 },
  groupTitle: { fontSize: 15, fontWeight: "900" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  check: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionInput: { flex: 1 },
  subCard: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 10 },
  orderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  orderNumber: { width: 22, fontWeight: "900", textAlign: "center" },
  orderInput: { flex: 1 },
  verticalActions: { gap: 4 },
  dropZone: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  dragItemCard: { gap: 8 },
  dragHandle: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 3,
    zIndex: 10,
  },
  readOnlyValue: {
    minHeight: 46,
    borderRadius: 12,
    padding: 13,
    fontWeight: "800",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    padding: 20,
  },
  confirmCard: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 14 },
});
