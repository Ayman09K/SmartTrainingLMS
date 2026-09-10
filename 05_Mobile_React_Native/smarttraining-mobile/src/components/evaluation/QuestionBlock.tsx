import { useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  Question,
  SubmittedAnswerRequest,
} from "../../types/evaluation";
import AnswerOptionItem from "./AnswerOptionItem";

type Props = {
  question: Question;
  answer: SubmittedAnswerRequest;
  onChange: (answer: SubmittedAnswerRequest) => void;
};

type BrowserDataTransfer = {
  effectAllowed?: string;
  dropEffect?: string;
  getData: (format: string) => string;
  setData: (format: string, value: string) => void;
};

type BrowserDragEvent = {
  dataTransfer?: BrowserDataTransfer;
  nativeEvent?: {
    dataTransfer?: BrowserDataTransfer;
  };
  preventDefault?: () => void;
};

function getDataTransfer(event: BrowserDragEvent): BrowserDataTransfer | undefined {
  return event.dataTransfer ?? event.nativeEvent?.dataTransfer;
}

function webOnlyProps(props: Record<string, unknown>): object {
  return Platform.OS === "web" ? props : {};
}

function splitPromptOnBlanks(
  content: string,
  expectedBlankCount: number,
): string[] | null {
  if (expectedBlankCount <= 0) return null;

  const segments = content.split(/_{2,}/g);
  return segments.length === expectedBlankCount + 1 ? segments : null;
}

function typeLabel(question: Question): string {
  if (question.type === "MULTIPLE_CHOICE") {
    return "Plusieurs réponses peuvent être sélectionnées";
  }
  if (question.type === "TRUE_FALSE") {
    return "Choisis vrai ou faux";
  }
  if (question.type === "FILL_BLANK") {
    return "Complète directement la phrase";
  }
  if (question.type === "ORDERING") {
    return "Replace les éléments dans le bon ordre";
  }
  if (question.type === "MATCHING") {
    return "Sélectionne un élément, puis sa correspondance";
  }
  if (question.type === "DRAG_DROP") {
    return Platform.OS === "web"
      ? "Fais glisser chaque élément vers sa zone cible"
      : "Sélectionne un élément, puis sa zone cible";
  }
  if (question.type === "NUMERIC") {
    return question.typeConfig?.numericUnit
      ? `Saisis une valeur numérique en ${question.typeConfig.numericUnit}`
      : "Saisis une valeur numérique";
  }
  return "Une seule réponse peut être sélectionnée";
}

function typeShortLabel(question: Question): string {
  if (question.type === "MULTIPLE_CHOICE") return "Choix multiple";
  if (question.type === "TRUE_FALSE") return "Vrai / Faux";
  if (question.type === "FILL_BLANK") return "Texte à trous";
  if (question.type === "ORDERING") return "Ordonnancement";
  if (question.type === "MATCHING") return "Association";
  if (question.type === "DRAG_DROP") return "Glisser-déposer";
  if (question.type === "NUMERIC") return "Numérique";
  return "Choix unique";
}

function moveItem(items: string[], from: number, to: number): string[] {
  if (to < 0 || to >= items.length || from === to) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export default function QuestionBlock({
  question,
  answer,
  onChange,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [matchingFocusLeftId, setMatchingFocusLeftId] = useState<string | null>(
    null,
  );
  const [dragFocusItemId, setDragFocusItemId] = useState<string | null>(null);
  const [dragHoverZoneId, setDragHoverZoneId] = useState<string | null>(null);

  function updateSimpleOption(optionId: number): void {
    const previous = answer.selectedOptionIds ?? [];
    const next =
      question.type === "MULTIPLE_CHOICE"
        ? previous.includes(optionId)
          ? previous.filter((id) => id !== optionId)
          : [...previous, optionId]
        : [optionId];

    onChange({
      questionId: question.id,
      selectedOptionIds: next,
    });
  }

  function updateBlank(blankId: string, value: string): void {
    const blankIds = question.typeConfig?.blankIds ?? [];
    const current = new Map(
      (answer.blankAnswers ?? []).map((item) => [item.blankId, item.value]),
    );
    current.set(blankId, value);

    onChange({
      questionId: question.id,
      blankAnswers: blankIds.map((id) => ({
        blankId: id,
        value: current.get(id) ?? "",
      })),
    });
  }

  function currentOrderingIds(): string[] {
    const configured = question.typeConfig?.orderingItems ?? [];
    const current = answer.orderedItemIds ?? [];

    return current.length === configured.length && current.length > 0
      ? current
      : configured.map((item) => item.id);
  }

  function setOrdering(ids: string[]): void {
    onChange({
      questionId: question.id,
      orderedItemIds: ids,
    });
  }

  function setMatching(leftId: string, rightId: string): void {
    const previous = answer.matchingPairs ?? [];
    const filtered = previous.filter(
      (pair) => pair.leftId !== leftId && pair.rightId !== rightId,
    );
    const nextPairs = [...filtered, { leftId, rightId }];

    onChange({
      questionId: question.id,
      matchingPairs: nextPairs,
    });

    const leftItems = question.typeConfig?.matchingLeft ?? [];
    const nextUnmatched = leftItems.find(
      (item) =>
        item.id !== leftId &&
        !nextPairs.some((pair) => pair.leftId === item.id),
    );
    setMatchingFocusLeftId(nextUnmatched?.id ?? leftId);
  }

  function setDragPlacement(itemId: string, zoneId: string): void {
    const previous = answer.dragPlacements ?? [];
    const filtered = previous.filter((entry) => entry.itemId !== itemId);
    const nextPlacements = [...filtered, { itemId, zoneId }];

    onChange({
      questionId: question.id,
      dragPlacements: nextPlacements,
    });

    const items = question.typeConfig?.dragItems ?? [];
    const nextUnplaced = items.find(
      (item) =>
        item.id !== itemId &&
        !nextPlacements.some((entry) => entry.itemId === item.id),
    );
    setDragFocusItemId(nextUnplaced?.id ?? null);
    setDragHoverZoneId(null);
  }

  function setNumeric(rawValue: string): void {
    const normalized = rawValue.trim().replace(",", ".");
    const parsed = Number(normalized);

    onChange({
      questionId: question.id,
      answerText: rawValue,
      numericValue:
        normalized.length > 0 && Number.isFinite(parsed)
          ? parsed
          : undefined,
    });
  }

  function renderSimpleQuestion() {
    const selectedOptionIds = answer.selectedOptionIds ?? [];

    return (
      <View className="gap-2.5">
        {question.options.map((option) => (
          <AnswerOptionItem
            key={option.id}
            option={option}
            selected={selectedOptionIds.includes(option.id)}
            onPress={() => updateSimpleOption(option.id)}
          />
        ))}
      </View>
    );
  }

  function renderFillBlankQuestion() {
    const blankIds = question.typeConfig?.blankIds ?? [];

    if (blankIds.length === 0) {
      return (
        <Text
          className="text-[13px] font-bold leading-[20px]"
          style={{ color: theme.colors.danger }}
        >
          Configuration du texte à trous indisponible.
        </Text>
      );
    }

    if (splitPromptOnBlanks(question.content, blankIds.length)) {
      return null;
    }

    return (
      <View className="gap-3">
        {blankIds.map((blankId, index) => {
          const value =
            answer.blankAnswers?.find((item) => item.blankId === blankId)
              ?.value ?? "";

          return (
            <View key={blankId} className="gap-1.5">
              <Text
                className="text-[12px] font-extrabold"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                Réponse {index + 1}
              </Text>
              <TextInput
                accessibilityLabel={`Réponse du trou ${index + 1}`}
                value={value}
                onChangeText={(nextValue) => updateBlank(blankId, nextValue)}
                placeholder="Saisis ta réponse"
                placeholderTextColor={theme.colors.foregroundMuted}
                autoCapitalize="sentences"
                className="min-h-[52px] rounded-[16px] border px-4 py-3 text-[15px]"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                }}
              />
            </View>
          );
        })}
      </View>
    );
  }

  function renderOrderingQuestion() {
    const configured = question.typeConfig?.orderingItems ?? [];

    if (configured.length === 0) {
      return (
        <Text
          className="text-[13px] font-bold leading-[20px]"
          style={{ color: theme.colors.danger }}
        >
          Configuration d’ordonnancement indisponible.
        </Text>
      );
    }

    const ids = currentOrderingIds();
    const byId = new Map(configured.map((item) => [item.id, item]));

    return (
      <View className="gap-2.5">
        <Text
          className="mb-1 text-[12px] leading-[18px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          Utilise Monter / Descendre. Si l’ordre affiché te convient, confirme-le.
        </Text>

        {ids.map((id, index) => (
          <View
            key={id}
            className="min-h-[56px] flex-row items-center gap-2 rounded-[17px] border p-2.5"
            style={{
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
            }}
          >
            <View
              className="h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <Text
                maxFontSizeMultiplier={1}
                className="text-[13px] font-black"
                style={{ color: theme.colors.accent }}
              >
                {index + 1}
              </Text>
            </View>

            <Text
              className="min-w-0 flex-1 text-[14px] font-bold leading-[20px]"
              style={{ color: theme.colors.foreground }}
            >
              {byId.get(id)?.text ?? id}
            </Text>

            <View className="flex-row gap-1.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Monter ${byId.get(id)?.text ?? id}`}
                disabled={index === 0}
                onPress={() => setOrdering(moveItem(ids, index, index - 1))}
                className="h-10 w-10 items-center justify-center rounded-[12px] border active:opacity-70 disabled:opacity-30"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              >
                <Text
                  className="text-[17px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  ↑
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Descendre ${byId.get(id)?.text ?? id}`}
                disabled={index === ids.length - 1}
                onPress={() => setOrdering(moveItem(ids, index, index + 1))}
                className="h-10 w-10 items-center justify-center rounded-[12px] border active:opacity-70 disabled:opacity-30"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.border,
                }}
              >
                <Text
                  className="text-[17px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  ↓
                </Text>
              </Pressable>
            </View>
          </View>
        ))}

        {!answer.orderedItemIds?.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Conserver cet ordre"
            onPress={() => setOrdering(ids)}
            className="min-h-11 items-center justify-center rounded-[14px] px-4 py-2.5 active:opacity-75"
            style={{ backgroundColor: theme.colors.accent }}
          >
            <Text
              className="font-black"
              style={{ color: theme.colors.accentForeground }}
            >
              Conserver cet ordre
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  function renderMatchingQuestion() {
    const left = question.typeConfig?.matchingLeft ?? [];
    const right = question.typeConfig?.matchingRight ?? [];

    if (left.length === 0 || right.length === 0) {
      return (
        <Text
          className="text-[13px] font-bold leading-[20px]"
          style={{ color: theme.colors.danger }}
        >
          Configuration d’association indisponible.
        </Text>
      );
    }

    const pairs = answer.matchingPairs ?? [];
    const firstUnmatched = left.find(
      (item) => !pairs.some((pair) => pair.leftId === item.id),
    );
    const activeLeftId =
      matchingFocusLeftId && left.some((item) => item.id === matchingFocusLeftId)
        ? matchingFocusLeftId
        : firstUnmatched?.id ?? left[0].id;
    const activeLeft = left.find((item) => item.id === activeLeftId) ?? left[0];

    return (
      <View className="gap-2.5">
        <Text
          className="text-[12px] font-black"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          1. Choisis l’élément à associer
        </Text>

        {left.map((leftItem) => {
          const pair = pairs.find((entry) => entry.leftId === leftItem.id);
          const rightItem = right.find((item) => item.id === pair?.rightId);
          const active = activeLeftId === leftItem.id;

          return (
            <Pressable
              key={leftItem.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${leftItem.text}. ${
                rightItem ? `Associé à ${rightItem.text}` : "À associer"
              }`}
              onPress={() => setMatchingFocusLeftId(leftItem.id)}
              className="gap-1.5 rounded-[16px] border p-3 active:opacity-75"
              style={{
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: active ? theme.colors.accent : theme.colors.border,
                borderWidth: active ? 2 : 1,
              }}
            >
              <Text
                className="text-[14px] font-black leading-[20px]"
                style={{ color: theme.colors.foreground }}
              >
                {leftItem.text}
              </Text>
              <Text
                className="text-[13px] font-bold leading-[19px]"
                style={{
                  color: rightItem
                    ? theme.colors.accent
                    : theme.colors.foregroundMuted,
                }}
              >
                {rightItem ? `→ ${rightItem.text}` : "À associer"}
              </Text>
            </Pressable>
          );
        })}

        <Text
          className="mt-1 text-[12px] font-black"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          2. Correspondance pour « {activeLeft.text} »
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {right.map((rightItem) => {
            const owner = pairs.find((pair) => pair.rightId === rightItem.id);
            const selected = owner?.leftId === activeLeftId;

            return (
              <Pressable
                key={rightItem.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Associer ${activeLeft.text} à ${rightItem.text}`}
                onPress={() => setMatching(activeLeftId, rightItem.id)}
                className="min-h-11 justify-center rounded-full border px-3 py-2 active:opacity-75"
                style={{
                  opacity: owner && !selected ? 0.55 : 1,
                  backgroundColor: selected
                    ? theme.colors.accent
                    : theme.colors.surfaceElevated,
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.border,
                }}
              >
                <Text
                  className="text-[13px] font-bold"
                  style={{
                    color: selected
                      ? theme.colors.accentForeground
                      : theme.colors.foreground,
                  }}
                >
                  {rightItem.text}
                  {owner && !selected ? " · déjà associé" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  function renderDragDropQuestion() {
    const items = question.typeConfig?.dragItems ?? [];
    const zones = question.typeConfig?.dragZones ?? [];

    if (items.length === 0 || zones.length === 0) {
      return (
        <Text
          className="text-[13px] font-bold leading-[20px]"
          style={{ color: theme.colors.danger }}
        >
          Configuration de glisser-déposer indisponible.
        </Text>
      );
    }

    const placements = answer.dragPlacements ?? [];

    return (
      <View className="gap-2.5">
        <Text
          className="text-[12px] leading-[18px]"
          style={{ color: theme.colors.foregroundMuted }}
        >
          {Platform.OS === "web"
            ? "Glisse un élément vers une zone. Alternative clavier ou tactile : sélectionne l’élément, puis la zone."
            : "Sélectionne un élément, puis touche sa zone cible."}
        </Text>

        <Text
          className="mt-1 text-[12px] font-black"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          Éléments à déplacer
        </Text>

        <View className="gap-2">
          {items.map((item) => {
            const placement = placements.find((entry) => entry.itemId === item.id);
            const zone = zones.find((entry) => entry.id === placement?.zoneId);
            const selected = dragFocusItemId === item.id;
            const webDragProps = webOnlyProps({
              draggable: true,
              onDragStart: (event: BrowserDragEvent) => {
                const transfer = getDataTransfer(event);
                transfer?.setData("text/plain", item.id);
                if (transfer) transfer.effectAllowed = "move";
                setDragFocusItemId(item.id);
              },
              onDragEnd: () => setDragHoverZoneId(null),
            });

            return (
              <Pressable
                {...webDragProps}
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${item.text}. ${
                  zone ? `Placé dans ${zone.text}` : "Non placé"
                }`}
                onPress={() => setDragFocusItemId(item.id)}
                className="min-h-[58px] flex-row items-center gap-2.5 rounded-[16px] border px-3 py-2.5 active:opacity-75"
                style={{
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: selected ? theme.colors.accent : theme.colors.border,
                  borderWidth: selected ? 2 : 1,
                }}
              >
                <Text
                  className="text-[20px] font-black"
                  style={{ color: theme.colors.accent }}
                >
                  ⋮⋮
                </Text>
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text
                    className="text-[14px] font-black leading-[20px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    {item.text}
                  </Text>
                  <Text
                    className="text-[11px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {zone ? `Placée : ${zone.text}` : "À placer"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text
          className="mt-1 text-[12px] font-black"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          Zones cibles
        </Text>

        {zones.map((zone) => {
          const placedItems = items.filter((item) =>
            placements.some(
              (entry) => entry.itemId === item.id && entry.zoneId === zone.id,
            ),
          );
          const active = dragHoverZoneId === zone.id;
          const webDropProps = webOnlyProps({
            onDragEnter: () => setDragHoverZoneId(zone.id),
            onDragLeave: () =>
              setDragHoverZoneId((current) =>
                current === zone.id ? null : current,
              ),
            onDragOver: (event: BrowserDragEvent) => {
              event.preventDefault?.();
              const transfer = getDataTransfer(event);
              if (transfer) transfer.dropEffect = "move";
              setDragHoverZoneId(zone.id);
            },
            onDrop: (event: BrowserDragEvent) => {
              event.preventDefault?.();
              const droppedId = getDataTransfer(event)?.getData("text/plain");
              const itemId = droppedId || dragFocusItemId;
              if (itemId && items.some((item) => item.id === itemId)) {
                setDragPlacement(itemId, zone.id);
              }
            },
          });

          return (
            <Pressable
              {...webDropProps}
              key={zone.id}
              accessibilityRole="button"
              accessibilityLabel={`Zone ${zone.text}. ${placedItems.length} élément(s)`}
              onPress={() => {
                if (dragFocusItemId) {
                  setDragPlacement(dragFocusItemId, zone.id);
                }
              }}
              className="min-h-[80px] rounded-[18px] border border-dashed p-3.5 active:opacity-75"
              style={{
                backgroundColor: active
                  ? theme.colors.surfaceSoft
                  : theme.colors.surfaceElevated,
                borderColor: active ? theme.colors.accent : theme.colors.border,
                borderWidth: active ? 2 : 1,
              }}
            >
              <Text
                className="text-[14px] font-black"
                style={{ color: theme.colors.foreground }}
              >
                {zone.text}
              </Text>

              {placedItems.length === 0 ? (
                <Text
                  className="mt-1.5 text-[12px] leading-[18px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  {dragFocusItemId ? "Dépose ou touche ici" : "Dépose un élément ici"}
                </Text>
              ) : (
                <View className="mt-2 flex-row flex-wrap gap-1.5">
                  {placedItems.map((item) => (
                    <View
                      key={item.id}
                      className="rounded-full px-2.5 py-1.5"
                      style={{ backgroundColor: theme.colors.surfaceSoft }}
                    >
                      <Text
                        className="text-[11px] font-bold"
                        style={{ color: theme.colors.foreground }}
                      >
                        {item.text}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    );
  }

  function renderNumericQuestion() {
    return (
      <View className="gap-1.5">
        <Text
          className="text-[12px] font-extrabold"
          style={{ color: theme.colors.foregroundSubtle }}
        >
          Valeur
          {question.typeConfig?.numericUnit
            ? ` (${question.typeConfig.numericUnit})`
            : ""}
        </Text>
        <TextInput
          accessibilityLabel="Réponse numérique"
          value={answer.answerText ?? ""}
          onChangeText={setNumeric}
          keyboardType="numbers-and-punctuation"
          placeholder={
            question.typeConfig?.numericUnit === "%" ? "Ex. 70" : "Ex. 12,5"
          }
          placeholderTextColor={theme.colors.foregroundMuted}
          selectTextOnFocus
          className="min-h-[52px] rounded-[16px] border px-4 py-3 text-[15px]"
          style={{
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            color: theme.colors.foreground,
          }}
        />
      </View>
    );
  }

  function renderAnswerEditor() {
    if (
      question.type === "SINGLE_CHOICE" ||
      question.type === "MULTIPLE_CHOICE" ||
      question.type === "TRUE_FALSE"
    ) {
      return renderSimpleQuestion();
    }
    if (question.type === "FILL_BLANK") {
      return renderFillBlankQuestion();
    }
    if (question.type === "ORDERING") {
      return renderOrderingQuestion();
    }
    if (question.type === "MATCHING") {
      return renderMatchingQuestion();
    }
    if (question.type === "DRAG_DROP") {
      return renderDragDropQuestion();
    }
    return renderNumericQuestion();
  }

  function renderQuestionPrompt() {
    const blankIds = question.typeConfig?.blankIds ?? [];
    const segments =
      question.type === "FILL_BLANK"
        ? splitPromptOnBlanks(question.content, blankIds.length)
        : null;

    if (!segments) {
      return (
        <Text
          className="text-[17px] font-black leading-[24px]"
          style={{ color: theme.colors.foreground }}
        >
          {question.content}
        </Text>
      );
    }

    return (
      <View className="flex-row flex-wrap items-center gap-1.5">
        {segments.map((segment, index) => {
          const blankId = blankIds[index];
          const value = blankId
            ? answer.blankAnswers?.find((item) => item.blankId === blankId)
                ?.value ?? ""
            : "";

          return (
            <View
              key={`segment-${index}`}
              className="flex-row flex-wrap items-center gap-1.5"
            >
              {segment ? (
                <Text
                  className="text-[17px] font-black leading-[24px]"
                  style={{ color: theme.colors.foreground }}
                >
                  {segment}
                </Text>
              ) : null}
              {blankId ? (
                <TextInput
                  accessibilityLabel={`Réponse du trou ${index + 1}`}
                  value={value}
                  onChangeText={(nextValue) => updateBlank(blankId, nextValue)}
                  placeholder={`Réponse ${index + 1}`}
                  placeholderTextColor={theme.colors.foregroundMuted}
                  autoCapitalize="none"
                  className="min-h-10 min-w-[140px] rounded-[14px] border px-3 py-1.5 text-[14px]"
                  style={{
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    color: theme.colors.foreground,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View
      className="mb-3.5 overflow-hidden rounded-[24px] border p-4"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        shadowColor: theme.colors.shadow,
        shadowOpacity: 0.035,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 5 },
        elevation: 1,
      }}
    >
      <View className="mb-3 flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <View
            className="h-9 w-9 items-center justify-center rounded-[12px]"
            style={{ backgroundColor: theme.colors.surfaceSoft }}
          >
            <Text
              maxFontSizeMultiplier={1}
              className="text-[14px] font-black"
              style={{ color: theme.colors.accent }}
            >
              {question.orderIndex}
            </Text>
          </View>
          <View
            className="rounded-full px-2.5 py-1.5"
            style={{ backgroundColor: theme.colors.surfaceSoft }}
          >
            <Text
              maxFontSizeMultiplier={1}
              className="text-[10px] font-extrabold"
              style={{ color: theme.colors.foregroundMuted }}
            >
              {typeShortLabel(question)}
            </Text>
          </View>
        </View>

        <View
          className="rounded-full px-2.5 py-1.5"
          style={{ backgroundColor: theme.colors.surfaceSoft }}
        >
          <Text
            maxFontSizeMultiplier={1}
            className="text-[10px] font-black"
            style={{ color: theme.colors.accent }}
          >
            {question.points} pt{question.points > 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {renderQuestionPrompt()}

      <Text
        className="mb-4 mt-2 text-[13px] leading-[19px]"
        style={{ color: theme.colors.foregroundMuted }}
      >
        {typeLabel(question)}
      </Text>

      {renderAnswerEditor()}
    </View>
  );
}
