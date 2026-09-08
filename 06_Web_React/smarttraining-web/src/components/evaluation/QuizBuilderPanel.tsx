import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  createManageableOption,
  createManageableQuestion,
  createManageableQuiz,
  deleteManageableOption,
  deleteManageableQuestion,
  deleteManageableQuiz,
  getManageableQuizFull,
  getManageableQuizzesByTraining,
  updateManageableOption,
  updateManageableQuestion,
  updateManageableQuiz,
} from "../../api/quizAuthoringApi";
import type { QuestionType } from "../../types/evaluation";
import type {
  AnswerOptionAuthoringResponse,
  CorrectAnswerPolicy,
  QuestionAuthoringRequest,
  QuestionFullAuthoringResponse,
  QuestionTypeConfigRequest,
  QuizAuthoringRequest,
  QuizAuthoringResponse,
  QuizFullAuthoringResponse,
  QuizStatus,
  ResultPolicy,
} from "../../types/quizAuthoring";
import { SmartSectionCard } from "../ui";

type ModuleOption = {
  id: number;
  title: string;
};

type QuizBuilderPanelProps = {
  trainingId: number;
  modules: ModuleOption[];
};

type QuizForm = {
  moduleId: number | "";
  title: string;
  description: string;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  resultPolicy: ResultPolicy;
  correctAnswerPolicy: CorrectAnswerPolicy;
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

type MatchingRow = {
  left: string;
  right: string;
};

type DragItemRow = {
  text: string;
  targetZone: number;
};

type QuestionDraft = {
  id?: number;
  type: QuestionType;
  content: string;
  points: number;
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

type DeleteTarget =
  | { kind: "QUIZ"; id: number; label: string }
  | { kind: "QUESTION"; id: number; label: string };

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: "SINGLE_CHOICE", label: "QCM — choix unique" },
  { value: "MULTIPLE_CHOICE", label: "QCM — choix multiples" },
  { value: "TRUE_FALSE", label: "Vrai / Faux" },
  { value: "FILL_BLANK", label: "Texte à trous" },
  { value: "ORDERING", label: "Ordonnancement" },
  { value: "MATCHING", label: "Association / Matching" },
  { value: "DRAG_DROP", label: "Glisser-déposer" },
  { value: "NUMERIC", label: "Réponse numérique" },
];

const TYPE_LABEL = Object.fromEntries(
  QUESTION_TYPES.map((item) => [item.value, item.label]),
) as Record<QuestionType, string>;

function emptyQuizForm(): QuizForm {
  return {
    moduleId: "",
    title: "",
    description: "",
    passingScore: 70,
    maxAttempts: 2,
    timeLimitMinutes: 0,
    shuffleQuestions: false,
    shuffleOptions: false,
    resultPolicy: "AFTER_SUBMIT",
    correctAnswerPolicy: "NEVER",
    successFeedback: "",
    failureFeedback: "",
  };
}

function defaultOptions(type: QuestionType): DraftOption[] {
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
  type: QuestionType = "SINGLE_CHOICE",
): QuestionDraft {
  return {
    type,
    content: "",
    points: 10,
    orderIndex,
    explanation: "",
    options: defaultOptions(type),
    fillRows: [
      { accepted: "", caseSensitive: false, trim: true },
    ],
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

function quizFormFrom(
  quiz: QuizAuthoringResponse,
): QuizForm {
  return {
    moduleId: quiz.moduleId ?? "",
    title: quiz.title ?? "",
    description: quiz.description ?? "",
    passingScore: quiz.passingScore ?? 70,
    maxAttempts: quiz.maxAttempts ?? 2,
    timeLimitMinutes: quiz.timeLimitMinutes ?? 0,
    shuffleQuestions: Boolean(quiz.shuffleQuestions),
    shuffleOptions: Boolean(quiz.shuffleOptions),
    resultPolicy: quiz.resultPolicy ?? "AFTER_SUBMIT",
    correctAnswerPolicy:
      quiz.correctAnswerPolicy ?? "NEVER",
    successFeedback: quiz.successFeedback ?? "",
    failureFeedback: quiz.failureFeedback ?? "",
  };
}

function sortQuestions(
  questions: QuestionFullAuthoringResponse[],
): QuestionFullAuthoringResponse[] {
  return [...questions].sort(
    (a, b) =>
      (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
        (b.orderIndex ?? Number.MAX_SAFE_INTEGER) ||
      a.id - b.id,
  );
}

function questionDraftFrom(
  question: QuestionFullAuthoringResponse,
): QuestionDraft {
  const draft = emptyQuestion(
    question.orderIndex ?? 1,
    question.type,
  );

  draft.id = question.id;
  draft.content = question.content ?? "";
  draft.points = question.points ?? 1;
  draft.explanation = question.explanation ?? "";
  draft.options = [...(question.options ?? [])]
    .sort(
      (a, b) =>
        (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
          (b.orderIndex ?? Number.MAX_SAFE_INTEGER) ||
        a.id - b.id,
    )
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

  if (
    config?.matching?.left?.length &&
    config.matching.right?.length &&
    config.matching.pairs?.length
  ) {
    draft.matchingRows = config.matching.pairs.map((pair) => ({
      left:
        config.matching?.left.find(
          (item) => item.id === pair.leftId,
        )?.text ?? "",
      right:
        config.matching?.right.find(
          (item) => item.id === pair.rightId,
        )?.text ?? "",
    }));
  }

  if (
    config?.dragDrop?.items?.length &&
    config.dragDrop.zones?.length
  ) {
    draft.dragZones = config.dragDrop.zones.map(
      (zone) => zone.text,
    );
    draft.dragItems = config.dragDrop.items.map((item) => {
      const placement = config.dragDrop?.placements.find(
        (entry) => entry.itemId === item.id,
      );
      const target = config.dragDrop?.zones.findIndex(
        (zone) => zone.id === placement?.zoneId,
      );

      return {
        text: item.text,
        targetZone: target !== undefined && target >= 0 ? target : 0,
      };
    });
  }

  if (config?.numeric) {
    draft.numericExpected = String(config.numeric.expected);
    draft.numericTolerance = String(
      config.numeric.tolerance ?? 0,
    );
    draft.numericUnit = config.numeric.unit ?? "";
  }

  if (
    question.type === "TRUE_FALSE" &&
    draft.options.length !== 2
  ) {
    draft.options = defaultOptions("TRUE_FALSE");
  }

  return draft;
}

function normalizeAccepted(
  value: string,
  caseSensitive: boolean,
): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const rawItem of value.split("|")) {
    const item = rawItem.trim();

    if (!item) {
      continue;
    }

    const key = caseSensitive ? item : item.toLocaleLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(item);
  }

  return normalized;
}

function buildTypeConfig(
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
        unit: draft.numericUnit.trim() || undefined,
      },
    };
  }

  return undefined;
}

function validateQuestion(draft: QuestionDraft): string {
  if (!draft.content.trim()) {
    return "Le texte de la question est obligatoire.";
  }

  if (draft.content.trim().length > 1000) {
    return "Le texte de la question dépasse 1000 caractères.";
  }

  if (!Number.isInteger(draft.orderIndex) || draft.orderIndex < 1) {
    return "L'ordre doit être un entier supérieur ou égal à 1.";
  }

  if (!Number.isInteger(draft.points) || draft.points < 1) {
    return "Les points doivent être un entier supérieur ou égal à 1.";
  }

  if (draft.explanation.length > 1000) {
    return "L'explication dépasse 1000 caractères.";
  }

  if (
    draft.type === "SINGLE_CHOICE" ||
    draft.type === "MULTIPLE_CHOICE"
  ) {
    if (draft.options.length < 2) {
      return "Ajoutez au moins deux réponses.";
    }

    if (draft.options.some((item) => !item.content.trim())) {
      return "Toutes les réponses doivent être renseignées.";
    }

    const correctCount = draft.options.filter(
      (item) => item.correct,
    ).length;

    if (
      draft.type === "SINGLE_CHOICE" &&
      correctCount !== 1
    ) {
      return "Le choix unique exige exactement une bonne réponse.";
    }

    if (
      draft.type === "MULTIPLE_CHOICE" &&
      correctCount < 1
    ) {
      return "Le choix multiple exige au moins une bonne réponse.";
    }
  }

  if (draft.type === "TRUE_FALSE") {
    if (
      draft.options.length !== 2 ||
      draft.options.filter((item) => item.correct).length !== 1
    ) {
      return "Vrai/Faux exige exactement une réponse correcte.";
    }
  }

  if (draft.type === "FILL_BLANK") {
    if (!draft.fillRows.length) {
      return "Ajoutez au moins un trou.";
    }

    if (
      draft.fillRows.some(
        (row) =>
          normalizeAccepted(
            row.accepted,
            row.caseSensitive,
          ).length === 0,
      )
    ) {
      return "Chaque trou doit avoir au moins une réponse acceptée.";
    }
  }

  if (draft.type === "ORDERING") {
    if (
      draft.orderingItems.length < 2 ||
      draft.orderingItems.some((item) => !item.trim())
    ) {
      return "L'ordonnancement exige au moins deux éléments renseignés.";
    }
  }

  if (draft.type === "MATCHING") {
    if (
      !draft.matchingRows.length ||
      draft.matchingRows.some(
        (row) => !row.left.trim() || !row.right.trim(),
      )
    ) {
      return "Chaque association doit renseigner les deux éléments.";
    }
  }

  if (draft.type === "DRAG_DROP") {
    if (
      !draft.dragZones.length ||
      draft.dragZones.some((zone) => !zone.trim())
    ) {
      return "Ajoutez au moins une zone cible renseignée.";
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
      return "Chaque élément à déplacer doit avoir une zone cible valide.";
    }
  }

  if (draft.type === "NUMERIC") {
    const expected = Number(draft.numericExpected);
    const tolerance = Number(draft.numericTolerance || 0);

    if (!Number.isFinite(expected)) {
      return "La valeur attendue doit être numérique.";
    }

    if (!Number.isFinite(tolerance) || tolerance < 0) {
      return "La tolérance doit être un nombre positif ou nul.";
    }
  }

  return "";
}

function quizRequest(
  trainingId: number,
  form: QuizForm,
  status: QuizStatus,
): QuizAuthoringRequest {
  return {
    trainingId,
    moduleId: form.moduleId === "" ? null : form.moduleId,
    title: form.title.trim(),
    description: form.description.trim() || null,
    passingScore: form.passingScore,
    maxAttempts: form.maxAttempts,
    timeLimitMinutes: form.timeLimitMinutes,
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
    points: draft.points,
    explanation: draft.explanation.trim() || null,
    typeConfig: buildTypeConfig(draft),
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

export function QuizBuilderPanel({
  trainingId,
  modules,
}: QuizBuilderPanelProps) {
  const [quizzes, setQuizzes] = useState<QuizAuthoringResponse[]>([]);
  const [activeQuiz, setActiveQuiz] =
    useState<QuizFullAuthoringResponse | null>(null);
  const [quizForm, setQuizForm] = useState<QuizForm>(emptyQuizForm);
  const [loading, setLoading] = useState(true);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [questionDraft, setQuestionDraft] =
    useState<QuestionDraft | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const questions = useMemo(
    () => sortQuestions(activeQuiz?.questions ?? []),
    [activeQuiz],
  );

  const loadQuizzes = useCallback(
    async (preferredQuizId?: number): Promise<void> => {
      setLoading(true);
      setError("");

      try {
        const loaded = await getManageableQuizzesByTraining(trainingId);
        setQuizzes(loaded);

        const nextId = preferredQuizId ?? 0;

        if (nextId) {
          const full = await getManageableQuizFull(nextId);
          setActiveQuiz(full);
          setQuizForm(quizFormFrom(full));
        } else if (!loaded.length) {
          setActiveQuiz(null);
          setQuizForm(emptyQuizForm());
        }
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [trainingId],
  );

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  async function openQuiz(quizId: number): Promise<void> {
    setLoadingQuiz(true);
    setError("");
    setSuccess("");

    try {
      const full = await getManageableQuizFull(quizId);
      setActiveQuiz(full);
      setQuizForm(quizFormFrom(full));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingQuiz(false);
    }
  }

  function prepareNewQuiz(): void {
    setActiveQuiz(null);
    setQuizForm(emptyQuizForm());
    setError("");
    setSuccess("");
  }

  function validateQuiz(): string {
    if (!quizForm.title.trim()) {
      return "Le titre du quiz est obligatoire.";
    }

    if (quizForm.title.trim().length > 255) {
      return "Le titre du quiz est trop long.";
    }

    if (quizForm.description.length > 1000) {
      return "La description dépasse 1000 caractères.";
    }

    if (
      !Number.isInteger(quizForm.passingScore) ||
      quizForm.passingScore < 0 ||
      quizForm.passingScore > 100
    ) {
      return "Le seuil de réussite doit être un entier entre 0 et 100.";
    }

    if (
      !Number.isInteger(quizForm.maxAttempts) ||
      quizForm.maxAttempts < 1
    ) {
      return "Le nombre de tentatives doit être au moins 1.";
    }

    if (
      !Number.isInteger(quizForm.timeLimitMinutes) ||
      quizForm.timeLimitMinutes < 0
    ) {
      return "La durée doit être un entier positif ou nul.";
    }

    if (quizForm.successFeedback.length > 2000) {
      return "Le feedback de réussite dépasse 2000 caractères.";
    }

    if (quizForm.failureFeedback.length > 2000) {
      return "Le feedback d'échec dépasse 2000 caractères.";
    }

    return "";
  }

  async function saveQuiz(): Promise<void> {
    const validation = validateQuiz();

    if (validation) {
      setError(validation);
      return;
    }

    setSavingQuiz(true);
    setError("");
    setSuccess("");

    try {
      if (activeQuiz) {
        const updated = await updateManageableQuiz(
          activeQuiz.id,
          quizRequest(trainingId, quizForm, activeQuiz.status),
        );
        await loadQuizzes(updated.id);
        setSuccess("Paramètres du quiz enregistrés.");
      } else {
        const created = await createManageableQuiz(
          quizRequest(trainingId, quizForm, "DRAFT"),
        );
        await loadQuizzes(created.id);
        setSuccess("Quiz créé en brouillon.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingQuiz(false);
    }
  }

  async function changeQuizStatus(
    status: QuizStatus,
  ): Promise<void> {
    if (!activeQuiz) {
      return;
    }

    if (status === "PUBLISHED" && questions.length === 0) {
      setError("Ajoutez au moins une question avant de publier.");
      return;
    }

    const validation = validateQuiz();

    if (validation) {
      setError(validation);
      return;
    }

    setSavingQuiz(true);
    setError("");
    setSuccess("");

    try {
      const updated = await updateManageableQuiz(
        activeQuiz.id,
        quizRequest(trainingId, quizForm, status),
      );
      await loadQuizzes(updated.id);
      setSuccess(
        status === "PUBLISHED"
          ? "Quiz publié."
          : status === "ARCHIVED"
            ? "Quiz archivé."
            : "Quiz repassé en brouillon.",
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingQuiz(false);
    }
  }

  function changeQuestionType(type: QuestionType): void {
    setQuestionDraft((current) => {
      if (!current) {
        return current;
      }

      const next = emptyQuestion(current.orderIndex, type);

      return {
        ...next,
        id: current.id,
        content: current.content,
        points: current.points,
        orderIndex: current.orderIndex,
        explanation: current.explanation,
      };
    });
  }

  async function syncOptions(
    questionId: number,
    desired: DraftOption[],
    existing: AnswerOptionAuthoringResponse[],
  ): Promise<void> {
    const sortedExisting = [...existing].sort(
      (a, b) =>
        (a.orderIndex ?? Number.MAX_SAFE_INTEGER) -
          (b.orderIndex ?? Number.MAX_SAFE_INTEGER) ||
        a.id - b.id,
    );

    for (let index = 0; index < desired.length; index += 1) {
      const item = desired[index];
      const request = {
        questionId,
        content: item.content.trim(),
        correct: item.correct,
        orderIndex: index + 1,
      };
      const current = sortedExisting[index];

      if (current) {
        await updateManageableOption(current.id, request);
      } else {
        await createManageableOption(request);
      }
    }

    for (
      let index = desired.length;
      index < sortedExisting.length;
      index += 1
    ) {
      await deleteManageableOption(sortedExisting[index].id);
    }
  }

  async function saveQuestion(): Promise<void> {
    if (!activeQuiz || !questionDraft) {
      return;
    }

    const validation = validateQuestion(questionDraft);

    if (validation) {
      setError(validation);
      return;
    }

    setSavingQuestion(true);
    setError("");
    setSuccess("");

    const existing = questionDraft.id
      ? activeQuiz.questions.find(
          (question) => question.id === questionDraft.id,
        )
      : undefined;

    let createdQuestionId = 0;

    try {
      const payload = questionRequest(activeQuiz.id, questionDraft);
      const saved = existing
        ? await updateManageableQuestion(existing.id, payload)
        : await createManageableQuestion(payload);

      if (!existing) {
        createdQuestionId = saved.id;
      }

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
      await loadQuizzes(activeQuiz.id);
      setSuccess(
        existing ? "Question mise à jour." : "Question ajoutée.",
      );
    } catch (err) {
      if (createdQuestionId) {
        try {
          await deleteManageableQuestion(createdQuestionId);
        } catch {
          // Compensation best-effort. Le runtime M7B vérifiera l'absence
          // d'orphelin après les scénarios contrôlés.
        }
      }

      setError(getApiErrorMessage(err));
    } finally {
      setSavingQuestion(false);
    }
  }

  async function moveQuestion(
    index: number,
    direction: -1 | 1,
  ): Promise<void> {
    if (!activeQuiz) {
      return;
    }

    const current = questions[index];
    const target = questions[index + direction];

    if (!current || !target) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const currentOrder = current.orderIndex ?? index + 1;
      const targetOrder =
        target.orderIndex ?? index + direction + 1;

      await updateManageableQuestion(
        current.id,
        existingQuestionRequest(current, targetOrder),
      );
      await updateManageableQuestion(
        target.id,
        existingQuestionRequest(target, currentOrder),
      );

      await loadQuizzes(activeQuiz.id);
      setSuccess("Ordre des questions mis à jour.");
    } catch (err) {
      setError(getApiErrorMessage(err));
      await loadQuizzes(activeQuiz.id);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      if (deleteTarget.kind === "QUIZ") {
        await deleteManageableQuiz(deleteTarget.id);
        setDeleteTarget(null);
        setActiveQuiz(null);
        setQuizForm(emptyQuizForm());
        await loadQuizzes();
        setSuccess("Quiz supprimé.");
      } else {
        await deleteManageableQuestion(deleteTarget.id);
        setDeleteTarget(null);

        if (activeQuiz) {
          await loadQuizzes(activeQuiz.id);
        }

        setSuccess("Question supprimée.");
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  function renderSimpleOptions(): React.ReactNode {
    if (!questionDraft) {
      return null;
    }

    const trueFalse = questionDraft.type === "TRUE_FALSE";

    return (
      <Stack spacing={1.25}>
        <Typography variant="subtitle2">
          Réponses et correction
        </Typography>

        {questionDraft.options.map((option, index) => (
          <Stack
            key={`${option.id ?? "new"}-${index}`}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" } }}
          >
            <Checkbox
              checked={option.correct}
              onChange={(event) => {
                const checked = event.target.checked;
                setQuestionDraft((current) => {
                  if (!current) return current;

                  return {
                    ...current,
                    options: current.options.map((item, itemIndex) => ({
                      ...item,
                      correct:
                        current.type === "SINGLE_CHOICE" ||
                        current.type === "TRUE_FALSE"
                          ? itemIndex === index
                            ? checked
                            : false
                          : itemIndex === index
                            ? checked
                            : item.correct,
                    })),
                  };
                });
              }}
              slotProps={{
                input: {
                  "aria-label": `Réponse correcte ${index + 1}`,
                },
              }}
            />

            <TextField
              size="small"
              label={`Réponse ${index + 1}`}
              value={option.content}
              disabled={trueFalse}
              onChange={(event) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        options: current.options.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  content: event.target.value,
                                }
                              : item,
                        ),
                      }
                    : current,
                )
              }
              slotProps={{ htmlInput: { maxLength: 500 } }}
              fullWidth
            />

            {!trueFalse && questionDraft.options.length > 2 ? (
              <IconButton
                aria-label={`Supprimer la réponse ${index + 1}`}
                onClick={() =>
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
              >
                <Trash2 size={16} />
              </IconButton>
            ) : null}
          </Stack>
        ))}

        {!trueFalse ? (
          <Button
            type="button"
            variant="outlined"
            startIcon={<Plus size={16} />}
            onClick={() =>
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
            sx={{ alignSelf: "flex-start" }}
          >
            Ajouter une réponse
          </Button>
        ) : null}
      </Stack>
    );
  }

  function renderFillBlank(): React.ReactNode {
    if (!questionDraft) return null;

    return (
      <Stack spacing={1.5}>
        <Alert severity="info">
          Utilisez un trou par ligne. Séparez les variantes acceptées par
          le caractère |, par exemple : Paris | capitale de la France.
          Les doublons équivalents sont supprimés automatiquement.
        </Alert>

        {questionDraft.fillRows.map((row, index) => (
          <Card key={index} variant="outlined">
            <CardContent>
              <Stack spacing={1.25}>
                <TextField
                  label={`Réponses acceptées — trou ${index + 1}`}
                  value={row.accepted}
                  onChange={(event) =>
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            fillRows: current.fillRows.map(
                              (item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      accepted: event.target.value,
                                    }
                                  : item,
                            ),
                          }
                        : current,
                    )
                  }
                  fullWidth
                />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={row.caseSensitive}
                        onChange={(event) =>
                          setQuestionDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  fillRows: current.fillRows.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            caseSensitive:
                                              event.target.checked,
                                          }
                                        : item,
                                  ),
                                }
                              : current,
                          )
                        }
                      />
                    }
                    label="Respecter la casse"
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={row.trim}
                        onChange={(event) =>
                          setQuestionDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  fillRows: current.fillRows.map(
                                    (item, itemIndex) =>
                                      itemIndex === index
                                        ? {
                                            ...item,
                                            trim: event.target.checked,
                                          }
                                        : item,
                                  ),
                                }
                              : current,
                          )
                        }
                      />
                    }
                    label="Ignorer espaces externes"
                  />
                </Stack>

                {questionDraft.fillRows.length > 1 ? (
                  <Button
                    color="error"
                    size="small"
                    startIcon={<Trash2 size={15} />}
                    onClick={() =>
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
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Retirer ce trou
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    fillRows: [
                      ...current.fillRows,
                      {
                        accepted: "",
                        caseSensitive: false,
                        trim: true,
                      },
                    ],
                  }
                : current,
            )
          }
          sx={{ alignSelf: "flex-start" }}
        >
          Ajouter un trou
        </Button>
      </Stack>
    );
  }

  function renderOrdering(): React.ReactNode {
    if (!questionDraft) return null;

    return (
      <Stack spacing={1.25}>
        <Alert severity="info">
          L'ordre affiché ci-dessous est l'ordre correct attendu.
        </Alert>

        {questionDraft.orderingItems.map((item, index) => (
          <Stack
            key={index}
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ alignItems: { sm: "center" } }}
          >
            <Chip label={index + 1} size="small" />
            <TextField
              size="small"
              label={`Élément ${index + 1}`}
              value={item}
              onChange={(event) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        orderingItems: current.orderingItems.map(
                          (value, itemIndex) =>
                            itemIndex === index
                              ? event.target.value
                              : value,
                        ),
                      }
                    : current,
                )
              }
              fullWidth
            />
            <Tooltip title="Monter">
              <span>
                <IconButton
                  disabled={index === 0}
                  aria-label={`Monter l'élément ${index + 1}`}
                  onClick={() =>
                    setQuestionDraft((current) => {
                      if (!current || index === 0) return current;
                      const items = [...current.orderingItems];
                      [items[index - 1], items[index]] = [
                        items[index],
                        items[index - 1],
                      ];
                      return { ...current, orderingItems: items };
                    })
                  }
                >
                  <ArrowUp size={16} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Descendre">
              <span>
                <IconButton
                  disabled={
                    index === questionDraft.orderingItems.length - 1
                  }
                  aria-label={`Descendre l'élément ${index + 1}`}
                  onClick={() =>
                    setQuestionDraft((current) => {
                      if (
                        !current ||
                        index === current.orderingItems.length - 1
                      ) {
                        return current;
                      }
                      const items = [...current.orderingItems];
                      [items[index], items[index + 1]] = [
                        items[index + 1],
                        items[index],
                      ];
                      return { ...current, orderingItems: items };
                    })
                  }
                >
                  <ArrowDown size={16} />
                </IconButton>
              </span>
            </Tooltip>
            {questionDraft.orderingItems.length > 2 ? (
              <IconButton
                aria-label={`Supprimer l'élément ${index + 1}`}
                onClick={() =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          orderingItems:
                            current.orderingItems.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                        }
                      : current,
                  )
                }
              >
                <Trash2 size={16} />
              </IconButton>
            ) : null}
          </Stack>
        ))}

        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    orderingItems: [...current.orderingItems, ""],
                  }
                : current,
            )
          }
          sx={{ alignSelf: "flex-start" }}
        >
          Ajouter un élément
        </Button>
      </Stack>
    );
  }

  function renderMatching(): React.ReactNode {
    if (!questionDraft) return null;

    return (
      <Stack spacing={1.25}>
        <Alert severity="info">
          Chaque ligne définit une paire correcte à associer.
        </Alert>

        {questionDraft.matchingRows.map((row, index) => (
          <Stack
            key={index}
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            sx={{ alignItems: { md: "center" } }}
          >
            <TextField
              size="small"
              label={`Élément gauche ${index + 1}`}
              value={row.left}
              onChange={(event) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        matchingRows: current.matchingRows.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, left: event.target.value }
                              : item,
                        ),
                      }
                    : current,
                )
              }
              fullWidth
            />
            <Typography color="text.secondary">↔</Typography>
            <TextField
              size="small"
              label={`Élément droit ${index + 1}`}
              value={row.right}
              onChange={(event) =>
                setQuestionDraft((current) =>
                  current
                    ? {
                        ...current,
                        matchingRows: current.matchingRows.map(
                          (item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, right: event.target.value }
                              : item,
                        ),
                      }
                    : current,
                )
              }
              fullWidth
            />
            {questionDraft.matchingRows.length > 1 ? (
              <IconButton
                aria-label={`Supprimer la paire ${index + 1}`}
                onClick={() =>
                  setQuestionDraft((current) =>
                    current
                      ? {
                          ...current,
                          matchingRows: current.matchingRows.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        }
                      : current,
                  )
                }
              >
                <Trash2 size={16} />
              </IconButton>
            ) : null}
          </Stack>
        ))}

        <Button
          variant="outlined"
          startIcon={<Plus size={16} />}
          onClick={() =>
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
          sx={{ alignSelf: "flex-start" }}
        >
          Ajouter une paire
        </Button>
      </Stack>
    );
  }

  function renderDragDrop(): React.ReactNode {
    if (!questionDraft) return null;

    return (
      <Stack spacing={2}>
        <Alert severity="info">
          Créez les zones cibles puis associez chaque élément à la zone
          correcte. Aucun identifiant technique n'est demandé.
        </Alert>

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Zones cibles
          </Typography>
          <Stack spacing={1}>
            {questionDraft.dragZones.map((zone, index) => (
              <Stack
                key={index}
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
              >
                <TextField
                  size="small"
                  label={`Zone ${index + 1}`}
                  value={zone}
                  onChange={(event) =>
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            dragZones: current.dragZones.map(
                              (value, itemIndex) =>
                                itemIndex === index
                                  ? event.target.value
                                  : value,
                            ),
                          }
                        : current,
                    )
                  }
                  fullWidth
                />
                {questionDraft.dragZones.length > 1 ? (
                  <IconButton
                    aria-label={`Supprimer la zone ${index + 1}`}
                    onClick={() =>
                      setQuestionDraft((current) => {
                        if (!current) return current;
                        return {
                          ...current,
                          dragZones: current.dragZones.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                          dragItems: current.dragItems.map((item) => ({
                            ...item,
                            targetZone:
                              item.targetZone === index
                                ? 0
                                : item.targetZone > index
                                  ? item.targetZone - 1
                                  : item.targetZone,
                          })),
                        };
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </IconButton>
                ) : null}
              </Stack>
            ))}
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus size={15} />}
            onClick={() =>
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
            sx={{ mt: 1 }}
          >
            Ajouter une zone
          </Button>
        </Box>

        <Divider />

        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Éléments à déplacer
          </Typography>
          <Stack spacing={1}>
            {questionDraft.dragItems.map((item, index) => (
              <Stack
                key={index}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
              >
                <TextField
                  size="small"
                  label={`Élément ${index + 1}`}
                  value={item.text}
                  onChange={(event) =>
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            dragItems: current.dragItems.map(
                              (value, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...value,
                                      text: event.target.value,
                                    }
                                  : value,
                            ),
                          }
                        : current,
                    )
                  }
                  fullWidth
                />
                <TextField
                  select
                  size="small"
                  label="Zone correcte"
                  value={item.targetZone}
                  onChange={(event) =>
                    setQuestionDraft((current) =>
                      current
                        ? {
                            ...current,
                            dragItems: current.dragItems.map(
                              (value, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...value,
                                      targetZone: Number(
                                        event.target.value,
                                      ),
                                    }
                                  : value,
                            ),
                          }
                        : current,
                    )
                  }
                  sx={{ minWidth: 210 }}
                >
                  {questionDraft.dragZones.map((zone, zoneIndex) => (
                    <MenuItem key={zoneIndex} value={zoneIndex}>
                      {zone || `Zone ${zoneIndex + 1}`}
                    </MenuItem>
                  ))}
                </TextField>
                {questionDraft.dragItems.length > 1 ? (
                  <IconButton
                    aria-label={`Supprimer l'élément ${index + 1}`}
                    onClick={() =>
                      setQuestionDraft((current) =>
                        current
                          ? {
                              ...current,
                              dragItems: current.dragItems.filter(
                                (_, itemIndex) => itemIndex !== index,
                              ),
                            }
                          : current,
                      )
                    }
                  >
                    <Trash2 size={16} />
                  </IconButton>
                ) : null}
              </Stack>
            ))}
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus size={15} />}
            onClick={() =>
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
            sx={{ mt: 1 }}
          >
            Ajouter un élément
          </Button>
        </Box>
      </Stack>
    );
  }

  function renderNumeric(): React.ReactNode {
    if (!questionDraft) return null;

    return (
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(3, minmax(0, 1fr))",
          },
          gap: 1.5,
        }}
      >
        <TextField
          label="Valeur attendue"
          type="number"
          value={questionDraft.numericExpected}
          onChange={(event) =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    numericExpected: event.target.value,
                  }
                : current,
            )
          }
          fullWidth
        />
        <TextField
          label="Tolérance ±"
          type="number"
          value={questionDraft.numericTolerance}
          onChange={(event) =>
            setQuestionDraft((current) =>
              current
                ? {
                    ...current,
                    numericTolerance: event.target.value,
                  }
                : current,
            )
          }
          slotProps={{ htmlInput: { min: 0, step: "any" } }}
          fullWidth
        />
        <TextField
          label="Unité (optionnelle)"
          value={questionDraft.numericUnit}
          onChange={(event) =>
            setQuestionDraft((current) =>
              current
                ? { ...current, numericUnit: event.target.value }
                : current,
            )
          }
          fullWidth
        />
      </Box>
    );
  }

  function renderTypeEditor(): React.ReactNode {
    if (!questionDraft) return null;

    if (
      questionDraft.type === "SINGLE_CHOICE" ||
      questionDraft.type === "MULTIPLE_CHOICE" ||
      questionDraft.type === "TRUE_FALSE"
    ) {
      return renderSimpleOptions();
    }

    if (questionDraft.type === "FILL_BLANK") {
      return renderFillBlank();
    }

    if (questionDraft.type === "ORDERING") {
      return renderOrdering();
    }

    if (questionDraft.type === "MATCHING") {
      return renderMatching();
    }

    if (questionDraft.type === "DRAG_DROP") {
      return renderDragDrop();
    }

    return renderNumeric();
  }

  return (
    <SmartSectionCard
      title="Quiz Builder"
      description="Créez des évaluations avancées avec 8 types de questions, règles de correction et feedbacks."
    >
      <Stack spacing={2.5}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {success ? <Alert severity="success">{success}</Alert> : null}

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ alignItems: { md: "center" } }}
        >
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={prepareNewQuiz}
          >
            Nouveau quiz
          </Button>
          <Button
            variant="outlined"
            startIcon={
              loading ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <RefreshCw size={15} />
              )
            }
            disabled={loading}
            onClick={() => void loadQuizzes(activeQuiz?.id)}
          >
            Actualiser
          </Button>
          <Box sx={{ flex: 1 }} />
          <Chip
            label={`${quizzes.length} quiz`}
            variant="outlined"
          />
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              xl: "minmax(250px, 0.7fr) minmax(0, 2fr)",
            },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Stack spacing={1}>
            <Typography variant="subtitle2">
              Quiz de la formation
            </Typography>

            {loading ? (
              <Box sx={{ py: 4, display: "grid", placeItems: "center" }}>
                <CircularProgress size={28} />
              </Box>
            ) : quizzes.length ? (
              quizzes.map((quiz) => (
                <Card
                  key={quiz.id}
                  variant="outlined"
                  sx={{
                    borderColor:
                      activeQuiz?.id === quiz.id
                        ? "primary.main"
                        : "divider",
                  }}
                >
                  <CardContent>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontWeight: 800 }}
                        >
                          {quiz.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={
                            quiz.status === "DRAFT"
                              ? "Brouillon"
                              : quiz.status === "PUBLISHED"
                                ? "Publié"
                                : "Archivé"
                          }
                          color={
                            quiz.status === "PUBLISHED"
                              ? "success"
                              : quiz.status === "DRAFT"
                                ? "warning"
                                : "default"
                          }
                        />
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                      >
                        Seuil {quiz.passingScore}% ·{" "}
                        {quiz.maxAttempts} tentative(s)
                      </Typography>
                      <Button
                        size="small"
                        variant={
                          activeQuiz?.id === quiz.id
                            ? "contained"
                            : "outlined"
                        }
                        disabled={
                          loadingQuiz || activeQuiz?.id === quiz.id
                        }
                        onClick={() => void openQuiz(quiz.id)}
                      >
                        {activeQuiz?.id === quiz.id ? "Édition en cours" : "Modifier"}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Alert severity="info">
                Aucun quiz. Créez votre première évaluation.
              </Alert>
            )}
          </Stack>

          <Stack spacing={2}>
            <SmartSectionCard
              title={
                activeQuiz
                  ? `Paramètres — ${activeQuiz.title}`
                  : "Nouveau quiz"
              }
              description="Le quiz est créé en brouillon. La publication reste une action explicite."
            >
              <Stack spacing={1.5}>
                <TextField
                  label="Titre"
                  value={quizForm.title}
                  onChange={(event) =>
                    setQuizForm({
                      ...quizForm,
                      title: event.target.value,
                    })
                  }
                  required
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={quizForm.description}
                  onChange={(event) =>
                    setQuizForm({
                      ...quizForm,
                      description: event.target.value,
                    })
                  }
                  multiline
                  minRows={2}
                  slotProps={{ htmlInput: { maxLength: 1000 } }}
                  helperText={`${quizForm.description.length}/1000`}
                  fullWidth
                />

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                      xl: "repeat(4, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    select
                    label="Module (optionnel)"
                    value={quizForm.moduleId}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        moduleId:
                          event.target.value === ""
                            ? ""
                            : Number(event.target.value),
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="">Formation entière</MenuItem>
                    {modules.map((module) => (
                      <MenuItem key={module.id} value={module.id}>
                        {module.title}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Seuil de réussite (%)"
                    type="number"
                    value={quizForm.passingScore}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        passingScore: Number(event.target.value),
                      })
                    }
                    slotProps={{
                      htmlInput: { min: 0, max: 100, step: 1 },
                    }}
                    fullWidth
                  />
                  <TextField
                    label="Tentatives max"
                    type="number"
                    value={quizForm.maxAttempts}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        maxAttempts: Number(event.target.value),
                      })
                    }
                    slotProps={{ htmlInput: { min: 1, step: 1 } }}
                    fullWidth
                  />
                  <TextField
                    label="Durée limite (min, 0 = aucune)"
                    type="number"
                    value={quizForm.timeLimitMinutes}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        timeLimitMinutes: Number(event.target.value),
                      })
                    }
                    slotProps={{ htmlInput: { min: 0, step: 1 } }}
                    fullWidth
                  />
                </Box>

                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                >
                  <FormControlLabel
                    control={
                      <Switch
                        checked={quizForm.shuffleQuestions}
                        onChange={(event) =>
                          setQuizForm({
                            ...quizForm,
                            shuffleQuestions: event.target.checked,
                          })
                        }
                      />
                    }
                    label="Mélanger les questions"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={quizForm.shuffleOptions}
                        onChange={(event) =>
                          setQuizForm({
                            ...quizForm,
                            shuffleOptions: event.target.checked,
                          })
                        }
                      />
                    }
                    label="Mélanger les réponses"
                  />
                </Stack>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "repeat(2, minmax(0, 1fr))",
                    },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    select
                    label="Affichage du résultat"
                    value={quizForm.resultPolicy}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        resultPolicy:
                          event.target.value as ResultPolicy,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="AFTER_SUBMIT">
                      Après soumission
                    </MenuItem>
                    <MenuItem value="AFTER_EACH_QUESTION">
                      Après chaque question
                    </MenuItem>
                  </TextField>
                  <TextField
                    select
                    label="Révélation des bonnes réponses"
                    value={quizForm.correctAnswerPolicy}
                    onChange={(event) =>
                      setQuizForm({
                        ...quizForm,
                        correctAnswerPolicy:
                          event.target
                            .value as CorrectAnswerPolicy,
                      })
                    }
                    fullWidth
                  >
                    <MenuItem value="NEVER">Jamais</MenuItem>
                    <MenuItem value="AFTER_SUBMIT">
                      Après soumission
                    </MenuItem>
                    <MenuItem value="AFTER_LAST_ATTEMPT">
                      Après la dernière tentative
                    </MenuItem>
                  </TextField>
                </Box>

                <TextField
                  label="Feedback en cas de réussite"
                  value={quizForm.successFeedback}
                  onChange={(event) =>
                    setQuizForm({
                      ...quizForm,
                      successFeedback: event.target.value,
                    })
                  }
                  multiline
                  minRows={2}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  helperText={`${quizForm.successFeedback.length}/2000`}
                  fullWidth
                />
                <TextField
                  label="Feedback en cas d'échec"
                  value={quizForm.failureFeedback}
                  onChange={(event) =>
                    setQuizForm({
                      ...quizForm,
                      failureFeedback: event.target.value,
                    })
                  }
                  multiline
                  minRows={2}
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  helperText={`${quizForm.failureFeedback.length}/2000`}
                  fullWidth
                />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ flexWrap: "wrap" }}
                >
                  <Button
                    variant="contained"
                    startIcon={
                      savingQuiz ? (
                        <CircularProgress size={15} color="inherit" />
                      ) : (
                        <Save size={16} />
                      )
                    }
                    disabled={savingQuiz}
                    onClick={() => void saveQuiz()}
                  >
                    {activeQuiz
                      ? "Enregistrer les paramètres"
                      : "Créer le brouillon"}
                  </Button>

                  {activeQuiz ? (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<Eye size={16} />}
                        onClick={() => setPreviewOpen(true)}
                      >
                        Prévisualiser
                      </Button>

                      {activeQuiz.status === "DRAFT" ? (
                        <Button
                          color="success"
                          variant="outlined"
                          startIcon={<Send size={16} />}
                          disabled={savingQuiz || questions.length === 0}
                          onClick={() =>
                            void changeQuizStatus("PUBLISHED")
                          }
                        >
                          Publier
                        </Button>
                      ) : (
                        <Button
                          variant="outlined"
                          disabled={savingQuiz}
                          onClick={() =>
                            void changeQuizStatus("DRAFT")
                          }
                        >
                          Repasser en brouillon
                        </Button>
                      )}

                      {activeQuiz.status !== "ARCHIVED" ? (
                        <Button
                          variant="text"
                          disabled={savingQuiz}
                          onClick={() =>
                            void changeQuizStatus("ARCHIVED")
                          }
                        >
                          Archiver
                        </Button>
                      ) : null}

                      <Button
                        color="error"
                        variant="text"
                        startIcon={<Trash2 size={16} />}
                        onClick={() =>
                          setDeleteTarget({
                            kind: "QUIZ",
                            id: activeQuiz.id,
                            label: activeQuiz.title,
                          })
                        }
                      >
                        Supprimer
                      </Button>
                    </>
                  ) : null}
                </Stack>
              </Stack>
            </SmartSectionCard>

            {activeQuiz ? (
              <SmartSectionCard
                title={`Questions (${questions.length})`}
                description="Ajoutez, éditez et ordonnez les questions. Le backend reste l'unique moteur de notation."
              >
                <Stack spacing={1.5}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    sx={{ alignItems: { sm: "center" } }}
                  >
                    <Button
                      variant="contained"
                      startIcon={<Plus size={16} />}
                      disabled={activeQuiz.status !== "DRAFT"}
                      onClick={() =>
                        setQuestionDraft(
                          emptyQuestion(questions.length + 1),
                        )
                      }
                    >
                      Ajouter une question
                    </Button>
                    {activeQuiz.status !== "DRAFT" ? (
                      <Alert severity="info" sx={{ flex: 1 }}>
                        Repasser le quiz en brouillon pour modifier ses
                        questions.
                      </Alert>
                    ) : null}
                  </Stack>

                  {questions.length ? (
                    questions.map((question, index) => (
                      <Card key={question.id} variant="outlined">
                        <CardContent>
                          <Stack spacing={1.25}>
                            <Stack
                              direction={{ xs: "column", md: "row" }}
                              spacing={1}
                              sx={{
                                alignItems: { md: "center" },
                                justifyContent: "space-between",
                              }}
                            >
                              <Box sx={{ minWidth: 0 }}>
                                <Typography
                                  variant="subtitle2"
                                  sx={{ fontWeight: 800 }}
                                >
                                  {index + 1}. {question.content}
                                </Typography>
                                <Stack
                                  direction="row"
                                  spacing={0.75}
                                  sx={{
                                    mt: 0.75,
                                    flexWrap: "wrap",
                                    gap: 0.75,
                                  }}
                                >
                                  <Chip
                                    size="small"
                                    label={TYPE_LABEL[question.type]}
                                    variant="outlined"
                                  />
                                  <Chip
                                    size="small"
                                    label={`${question.points} pt`}
                                  />
                                </Stack>
                              </Box>

                              <Stack
                                direction="row"
                                spacing={0.5}
                              >
                                <Tooltip title="Monter">
                                  <span>
                                    <IconButton
                                      disabled={
                                        activeQuiz.status !== "DRAFT" ||
                                        index === 0
                                      }
                                      aria-label="Monter la question"
                                      onClick={() =>
                                        void moveQuestion(index, -1)
                                      }
                                    >
                                      <ArrowUp size={16} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Descendre">
                                  <span>
                                    <IconButton
                                      disabled={
                                        activeQuiz.status !== "DRAFT" ||
                                        index === questions.length - 1
                                      }
                                      aria-label="Descendre la question"
                                      onClick={() =>
                                        void moveQuestion(index, 1)
                                      }
                                    >
                                      <ArrowDown size={16} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Modifier">
                                  <span>
                                    <IconButton
                                      disabled={
                                        activeQuiz.status !== "DRAFT"
                                      }
                                      aria-label="Modifier la question"
                                      onClick={() =>
                                        setQuestionDraft(
                                          questionDraftFrom(question),
                                        )
                                      }
                                    >
                                      <Pencil size={16} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Supprimer">
                                  <span>
                                    <IconButton
                                      disabled={
                                        activeQuiz.status !== "DRAFT"
                                      }
                                      color="error"
                                      aria-label="Supprimer la question"
                                      onClick={() =>
                                        setDeleteTarget({
                                          kind: "QUESTION",
                                          id: question.id,
                                          label: question.content,
                                        })
                                      }
                                    >
                                      <Trash2 size={16} />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              </Stack>
                            </Stack>

                            {question.explanation ? (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                Explication : {question.explanation}
                              </Typography>
                            ) : null}
                          </Stack>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Alert severity="info">
                      Aucune question. Le quiz ne peut pas être publié
                      tant qu'il est vide.
                    </Alert>
                  )}
                </Stack>
              </SmartSectionCard>
            ) : null}
          </Stack>
        </Box>
      </Stack>

      <Dialog
        open={Boolean(questionDraft)}
        onClose={() => {
          if (!savingQuestion) setQuestionDraft(null);
        }}
        aria-labelledby="quiz-question-editor-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="quiz-question-editor-title">
          {questionDraft?.id ? "Modifier la question" : "Nouvelle question"}
        </DialogTitle>
        <DialogContent dividers sx={{ pb: 4 }}>
          {questionDraft ? (
            <Stack spacing={2}>
              <TextField
                select
                label="Type de question"
                value={questionDraft.type}
                onChange={(event) =>
                  changeQuestionType(
                    event.target.value as QuestionType,
                  )
                }
                fullWidth
              >
                {QUESTION_TYPES.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Question"
                value={questionDraft.content}
                onChange={(event) =>
                  setQuestionDraft({
                    ...questionDraft,
                    content: event.target.value,
                  })
                }
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
                helperText={`${questionDraft.content.length}/1000`}
                required
                fullWidth
              />

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: 1.5,
                }}
              >
                <TextField
                  label="Points"
                  type="number"
                  value={questionDraft.points}
                  onChange={(event) =>
                    setQuestionDraft({
                      ...questionDraft,
                      points: Number(event.target.value),
                    })
                  }
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  fullWidth
                />
                <TextField
                  label="Ordre"
                  type="number"
                  value={questionDraft.orderIndex}
                  onChange={(event) =>
                    setQuestionDraft({
                      ...questionDraft,
                      orderIndex: Number(event.target.value),
                    })
                  }
                  slotProps={{ htmlInput: { min: 1, step: 1 } }}
                  fullWidth
                />
              </Box>

              <TextField
                label="Explication / feedback pédagogique"
                value={questionDraft.explanation}
                onChange={(event) =>
                  setQuestionDraft({
                    ...questionDraft,
                    explanation: event.target.value,
                  })
                }
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
                helperText={`${questionDraft.explanation.length}/1000`}
                fullWidth
              />

              <Divider />
              {renderTypeEditor()}
            </Stack>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            disabled={savingQuestion}
            onClick={() => setQuestionDraft(null)}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            disabled={savingQuestion}
            startIcon={
              savingQuestion ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <Save size={16} />
              )
            }
            onClick={() => void saveQuestion()}
          >
            {savingQuestion ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        aria-labelledby="quiz-author-preview-title"
        maxWidth="md"
        fullWidth
      >
        <DialogTitle id="quiz-author-preview-title">
          Prévisualisation auteur — {activeQuiz?.title ?? "Quiz"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {activeQuiz ? (
              <Alert severity="info">
                Cette prévisualisation est côté auteur et ne démarre
                aucune tentative apprenant.
              </Alert>
            ) : null}

            {questions.map((question, index) => (
              <Card key={question.id} variant="outlined">
                <CardContent>
                  <Stack spacing={1}>
                    <Typography variant="subtitle2">
                      {index + 1}. {question.content}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {TYPE_LABEL[question.type]} · {question.points} pt
                    </Typography>

                    {question.options?.length ? (
                      <Stack spacing={0.5}>
                        {question.options
                          .slice()
                          .sort(
                            (a, b) =>
                              (a.orderIndex ?? 0) -
                              (b.orderIndex ?? 0),
                          )
                          .map((option) => (
                            <Typography
                              key={option.id}
                              variant="body2"
                              color={
                                option.correct
                                  ? "success.main"
                                  : "text.secondary"
                              }
                            >
                              {option.correct ? "✓" : "○"}{" "}
                              {option.content}
                            </Typography>
                          ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Configuration avancée enregistrée pour ce type.
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setPreviewOpen(false)}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (!deleting) setDeleteTarget(null);
        }}
        aria-labelledby="quiz-delete-title"
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle id="quiz-delete-title">
          {deleteTarget?.kind === "QUIZ"
            ? "Supprimer le quiz"
            : "Supprimer la question"}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <Alert severity="warning">
              Cette action est définitive.
            </Alert>
            <Typography>
              {deleteTarget?.label ?? ""}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            disabled={deleting}
            onClick={() => setDeleteTarget(null)}
          >
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={15} color="inherit" />
              ) : (
                <Trash2 size={16} />
              )
            }
            onClick={() => void confirmDelete()}
          >
            {deleting ? "Suppression..." : "Supprimer"}
          </Button>
        </DialogActions>
      </Dialog>
    </SmartSectionCard>
  );
}
