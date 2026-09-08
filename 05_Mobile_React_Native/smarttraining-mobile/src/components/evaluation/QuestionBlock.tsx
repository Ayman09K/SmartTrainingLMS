import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
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
  const styles = makeStyles(theme);
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
      <View style={styles.options}>
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
        <Text style={styles.configError}>
          Configuration du texte à trous indisponible.
        </Text>
      );
    }

    if (splitPromptOnBlanks(question.content, blankIds.length)) {
      return null;
    }

    return (
      <View style={styles.editorGroup}>
        {blankIds.map((blankId, index) => {
          const value =
            answer.blankAnswers?.find((item) => item.blankId === blankId)
              ?.value ?? "";

          return (
            <View key={blankId} style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Réponse {index + 1}</Text>
              <TextInput
                accessibilityLabel={`Réponse du trou ${index + 1}`}
                value={value}
                onChangeText={(nextValue) => updateBlank(blankId, nextValue)}
                placeholder="Saisis ta réponse"
                placeholderTextColor={theme.colors.foregroundMuted}
                autoCapitalize="sentences"
                style={styles.textInput}
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
        <Text style={styles.configError}>
          Configuration d’ordonnancement indisponible.
        </Text>
      );
    }

    const ids = currentOrderingIds();
    const byId = new Map(configured.map((item) => [item.id, item]));

    return (
      <View style={styles.editorGroup}>
        <Text style={styles.assistiveText}>
          Utilise Monter / Descendre. Si l’ordre affiché te convient, confirme-le.
        </Text>

        {ids.map((id, index) => (
          <View key={id} style={styles.orderRow}>
            <Text style={styles.orderIndex}>{index + 1}</Text>
            <Text style={styles.orderText}>{byId.get(id)?.text ?? id}</Text>
            <View style={styles.orderActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Monter ${byId.get(id)?.text ?? id}`}
                disabled={index === 0}
                onPress={() => setOrdering(moveItem(ids, index, index - 1))}
                style={({ pressed }) => [
                  styles.miniButton,
                  index === 0 ? styles.disabledButton : null,
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <Text style={styles.miniButtonText}>↑</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Descendre ${byId.get(id)?.text ?? id}`}
                disabled={index === ids.length - 1}
                onPress={() => setOrdering(moveItem(ids, index, index + 1))}
                style={({ pressed }) => [
                  styles.miniButton,
                  index === ids.length - 1 ? styles.disabledButton : null,
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <Text style={styles.miniButtonText}>↓</Text>
              </Pressable>
            </View>
          </View>
        ))}

        {!answer.orderedItemIds?.length ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Conserver cet ordre"
            onPress={() => setOrdering(ids)}
            style={({ pressed }) => [
              styles.confirmButton,
              pressed ? styles.pressedButton : null,
            ]}
          >
            <Text style={styles.confirmButtonText}>Conserver cet ordre</Text>
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
        <Text style={styles.configError}>
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
      <View style={styles.editorGroup}>
        <Text style={styles.stepLabel}>1. Choisis l’élément à associer</Text>
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
              style={({ pressed }) => [
                styles.matchCard,
                active ? styles.matchCardActive : null,
                pressed ? styles.pressedButton : null,
              ]}
            >
              <Text style={styles.matchLeft}>{leftItem.text}</Text>
              <Text
                style={rightItem ? styles.matchAnswer : styles.matchAnswerEmpty}
              >
                {rightItem ? `→ ${rightItem.text}` : "À associer"}
              </Text>
            </Pressable>
          );
        })}

        <Text style={styles.stepLabel}>
          2. Correspondance pour « {activeLeft.text} »
        </Text>
        <View style={styles.chipWrap}>
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
                style={({ pressed }) => [
                  styles.choiceChip,
                  selected ? styles.choiceChipSelected : null,
                  owner && !selected ? styles.choiceChipUsed : null,
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <Text
                  style={[
                    styles.choiceChipText,
                    selected ? styles.choiceChipTextSelected : null,
                  ]}
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
        <Text style={styles.configError}>
          Configuration de glisser-déposer indisponible.
        </Text>
      );
    }

    const placements = answer.dragPlacements ?? [];

    return (
      <View style={styles.editorGroup}>
        <Text style={styles.assistiveText}>
          {Platform.OS === "web"
            ? "Glisse un élément vers une zone. Alternative clavier ou tactile : sélectionne l’élément, puis la zone."
            : "Sélectionne un élément, puis touche sa zone cible."}
        </Text>

        <Text style={styles.stepLabel}>Éléments à déplacer</Text>
        <View style={styles.dragItemBank}>
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
                style={({ pressed }) => [
                  styles.dragItem,
                  selected ? styles.dragItemSelected : null,
                  pressed ? styles.pressedButton : null,
                ]}
              >
                <Text style={styles.dragHandle}>⋮⋮</Text>
                <View style={styles.dragItemContent}>
                  <Text style={styles.dragItemText}>{item.text}</Text>
                  <Text style={styles.dragItemMeta}>
                    {zone ? `Placée : ${zone.text}` : "À placer"}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.stepLabel}>Zones cibles</Text>
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
              style={({ pressed }) => [
                styles.dropZone,
                active ? styles.dropZoneActive : null,
                pressed ? styles.pressedButton : null,
              ]}
            >
              <Text style={styles.dropZoneTitle}>{zone.text}</Text>
              {placedItems.length === 0 ? (
                <Text style={styles.dropZoneHint}>
                  {dragFocusItemId
                    ? "Dépose ou touche ici"
                    : "Dépose un élément ici"}
                </Text>
              ) : (
                <View style={styles.placedItems}>
                  {placedItems.map((item) => (
                    <View key={item.id} style={styles.placedItem}>
                      <Text style={styles.placedItemText}>{item.text}</Text>
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
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>
          Valeur{question.typeConfig?.numericUnit ? ` (${question.typeConfig.numericUnit})` : ""}
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
          style={styles.textInput}
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
        <Text style={styles.question}>
          {question.orderIndex}. {question.content}
        </Text>
      );
    }

    return (
      <View style={styles.inlinePrompt}>
        <Text style={styles.question}>{question.orderIndex}. </Text>
        {segments.map((segment, index) => {
          const blankId = blankIds[index];
          const value = blankId
            ? answer.blankAnswers?.find((item) => item.blankId === blankId)
                ?.value ?? ""
            : "";

          return (
            <View key={`segment-${index}`} style={styles.inlinePromptPart}>
              {segment ? <Text style={styles.question}>{segment}</Text> : null}
              {blankId ? (
                <TextInput
                  accessibilityLabel={`Réponse du trou ${index + 1}`}
                  value={value}
                  onChangeText={(nextValue) => updateBlank(blankId, nextValue)}
                  placeholder={`Réponse ${index + 1}`}
                  placeholderTextColor={theme.colors.foregroundMuted}
                  autoCapitalize="none"
                  style={[styles.textInput, styles.inlineBlankInput]}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {renderQuestionPrompt()}

      <Text style={styles.help}>{typeLabel(question)}</Text>
      <Text style={styles.points}>{question.points} point(s)</Text>

      {renderAnswerEditor()}
    </View>
  );
}

function makeStyles(theme: ReturnType<typeof useSmartTrainingTheme>["theme"]) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.cardRadius,
      padding: 18,
      marginBottom: 14,
    },
    question: {
      color: theme.colors.foreground,
      fontSize: 16,
      fontWeight: "900",
      lineHeight: 23,
    },
    help: {
      color: theme.colors.foregroundMuted,
      marginTop: 8,
      lineHeight: 19,
    },
    points: {
      color: theme.colors.accent,
      fontWeight: "800",
      marginTop: 5,
      marginBottom: 14,
    },
    options: {
      gap: 8,
    },
    editorGroup: {
      gap: 10,
    },
    fieldGroup: {
      gap: 6,
    },
    fieldLabel: {
      color: theme.colors.foregroundSubtle,
      fontWeight: "800",
      fontSize: 13,
    },
    textInput: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      backgroundColor: theme.colors.surfaceElevated,
      color: theme.colors.foreground,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 15,
    },
    inlinePrompt: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
    },
    inlinePromptPart: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 6,
    },
    inlineBlankInput: {
      minWidth: 140,
      minHeight: 40,
      paddingVertical: 6,
    },
    configError: {
      color: theme.colors.danger,
      lineHeight: 20,
      fontWeight: "700",
    },
    assistiveText: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
      lineHeight: 18,
    },
    stepLabel: {
      color: theme.colors.foregroundSubtle,
      fontSize: 13,
      fontWeight: "900",
      marginTop: 4,
    },
    orderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      minHeight: 50,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      padding: 8,
      backgroundColor: theme.colors.surfaceSoft,
    },
    orderIndex: {
      color: theme.colors.accent,
      fontWeight: "900",
      width: 24,
      textAlign: "center",
    },
    orderText: {
      flex: 1,
      color: theme.colors.foreground,
      fontWeight: "700",
    },
    orderActions: {
      flexDirection: "row",
      gap: 6,
    },
    miniButton: {
      minWidth: 44,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      backgroundColor: theme.colors.surfaceElevated,
    },
    miniButtonText: {
      color: theme.colors.foreground,
      fontSize: 18,
      fontWeight: "900",
    },
    disabledButton: {
      opacity: 0.35,
    },
    pressedButton: {
      opacity: 0.7,
    },
    confirmButton: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.shape.controlRadius,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    confirmButtonText: {
      color: theme.colors.accentForeground,
      fontWeight: "900",
    },
    matchCard: {
      gap: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      padding: 10,
      backgroundColor: theme.colors.surfaceSoft,
    },
    matchCardActive: {
      borderColor: theme.colors.accent,
      borderWidth: 2,
    },
    matchLeft: {
      color: theme.colors.foreground,
      fontWeight: "900",
      lineHeight: 20,
    },
    matchAnswer: {
      color: theme.colors.accent,
      fontWeight: "800",
      lineHeight: 19,
    },
    matchAnswerEmpty: {
      color: theme.colors.foregroundMuted,
      fontStyle: "italic",
      lineHeight: 19,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    choiceChip: {
      minHeight: 44,
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 999,
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    choiceChipSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    choiceChipUsed: {
      opacity: 0.55,
    },
    choiceChipText: {
      color: theme.colors.foreground,
      fontWeight: "700",
    },
    choiceChipTextSelected: {
      color: theme.colors.accentForeground,
    },
    dragItemBank: {
      gap: 8,
    },
    dragItem: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      backgroundColor: theme.colors.surfaceElevated,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    dragItemSelected: {
      borderColor: theme.colors.accent,
      borderWidth: 2,
    },
    dragHandle: {
      color: theme.colors.accent,
      fontSize: 22,
      fontWeight: "900",
    },
    dragItemContent: {
      flex: 1,
      gap: 2,
    },
    dragItemText: {
      color: theme.colors.foreground,
      fontWeight: "900",
    },
    dragItemMeta: {
      color: theme.colors.foregroundMuted,
      fontSize: 12,
    },
    dropZone: {
      minHeight: 76,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: theme.colors.border,
      borderRadius: theme.shape.controlRadius,
      backgroundColor: theme.colors.surfaceSoft,
      padding: 12,
      gap: 8,
    },
    dropZoneActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surfaceElevated,
    },
    dropZoneTitle: {
      color: theme.colors.foreground,
      fontWeight: "900",
    },
    dropZoneHint: {
      color: theme.colors.foregroundMuted,
      fontStyle: "italic",
    },
    placedItems: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    placedItem: {
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    placedItemText: {
      color: theme.colors.accentForeground,
      fontWeight: "800",
    },
  });
}
