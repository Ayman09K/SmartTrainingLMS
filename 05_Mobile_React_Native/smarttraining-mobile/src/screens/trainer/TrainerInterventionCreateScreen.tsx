import { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  createTrainerIntervention,
  getTrainerLearnerTrainingOptions,
} from "../../features/trainer/trainerActionService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerInterventionResponse,
  TrainerInterventionType,
  TrainerLearnerTrainingOption,
} from "../../types/trainerActionMobile";

type Props = {
  trainerId: number;
  onCreated: (intervention: TrainerInterventionResponse) => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 10;

function buildPagination(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  if (currentPage <= 2) {
    return [1, 2, 3, "ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 1) {
    return [
      1,
      "ellipsis",
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "ellipsis",
    currentPage,
    "ellipsis",
    totalPages,
  ];
}

function typeLabel(value: TrainerInterventionType): string {
  const labels: Record<TrainerInterventionType, string> = {
    MESSAGE: "Message",
    CALL: "Appel",
    SUPPORT_SESSION: "Séance d’accompagnement",
    MANUAL_REVIEW: "Revue manuelle",
    FOLLOW_UP: "Suivi",
  };

  return labels[value];
}

function typeHelper(value: TrainerInterventionType): string {
  const helpers: Record<TrainerInterventionType, string> = {
    MESSAGE: "Échange pédagogique écrit",
    CALL: "Action téléphonique à tracer",
    SUPPORT_SESSION: "Accompagnement planifié",
    MANUAL_REVIEW: "Analyse et vérification",
    FOLLOW_UP: "Suivi pédagogique",
  };

  return helpers[value];
}

function typeIcon(value: TrainerInterventionType): SymbolName {
  if (value === "MESSAGE") {
    return { ios: "message.fill", android: "chat", web: "chat" };
  }

  if (value === "CALL") {
    return { ios: "phone.fill", android: "call", web: "call" };
  }

  if (value === "SUPPORT_SESSION") {
    return { ios: "person.2.fill", android: "groups", web: "groups" };
  }

  if (value === "MANUAL_REVIEW") {
    return {
      ios: "doc.text.magnifyingglass",
      android: "fact_check",
      web: "fact_check",
    };
  }

  return {
    ios: "arrow.triangle.2.circlepath",
    android: "sync",
    web: "sync",
  };
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "AP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

export default function TrainerInterventionCreateScreen({
  trainerId,
  onCreated,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const scrollRef = useRef<ScrollView | null>(null);
  const noteTopRef = useRef(0);

  const [options, setOptions] = useState<TrainerLearnerTrainingOption[]>([]);
  const [selected, setSelected] = useState<TrainerLearnerTrainingOption | null>(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TrainerInterventionType>("FOLLOW_UP");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void getTrainerLearnerTrainingOptions(trainerId)
      .then((loaded) => {
        if (active) {
          setOptions(loaded);
          setSelected(loaded[0] ?? null);
          setPage(1);
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError("Impossible de charger vos apprenants suivis.");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [trainerId]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(() => {
        scrollRef.current?.scrollTo({
          y: Math.max(0, noteTopRef.current - 90),
          animated: true,
        });
      }, 120);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  async function submit() {
    if (!selected) {
      setError("Sélectionnez un apprenant et une formation.");
      return;
    }

    if (!note.trim()) {
      setError("Ajoutez une note d’accompagnement.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const created = await createTrainerIntervention({
        learnerId: selected.learnerId,
        trainingId: selected.trainingId,
        interventionType: type,
        note: note.trim(),
        source: "MANUAL",
      });

      onCreated(created);
    } catch {
      setError("L’intervention n’a pas pu être créée.");
    } finally {
      setSubmitting(false);
    }
  }

  const types: TrainerInterventionType[] = [
    "FOLLOW_UP",
    "MESSAGE",
    "CALL",
    "SUPPORT_SESSION",
    "MANUAL_REVIEW",
  ];

  const totalPages = Math.max(
    1,
    Math.ceil(options.length / PAGE_SIZE),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const visibleOptions = useMemo(() => {
    const start =
      (currentPage - 1) * PAGE_SIZE;

    return options.slice(
      start,
      start + PAGE_SIZE,
    );
  }, [currentPage, options]);

  const paginationItems = useMemo(
    () =>
      buildPagination(
        currentPage,
        totalPages,
      ),
    [currentPage, totalPages],
  );

  const firstVisible =
    options.length === 0
      ? 0
      : (currentPage - 1) *
          PAGE_SIZE +
        1;

  const lastVisible = Math.min(
    currentPage * PAGE_SIZE,
    options.length,
  );

  function changePage(
    nextPage: number,
  ) {
    const normalizedPage =
      Math.min(
        Math.max(nextPage, 1),
        totalPages,
      );

    if (
      normalizedPage ===
      currentPage
    ) {
      return;
    }

    setPage(normalizedPage);
  }

  if (loading) {
    return <LoadingState message="Préparation de l’intervention..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "android" && keyboardHeight > 0
                ? keyboardHeight + 28
                : 30,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[760px] px-4">
            <View
              className="mt-4 overflow-hidden rounded-[22px] border bg-white"
              style={{
                borderColor: "#E6E0E9",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.045,
                shadowRadius: 9,
                elevation: 2,
              }}
            >
              <View
                className="h-1.5 w-full"
                style={{ backgroundColor: "#7C3AED" }}
              />

              <View className="p-4">
                <View className="flex-row items-center">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-[14px]"
                    style={{ backgroundColor: "#F1E9FF" }}
                  >
                    <SymbolView
                      name={{
                        ios: "plus.bubble.fill",
                        android: "add_comment",
                        web: "add_comment",
                      }}
                      tintColor="#7C3AED"
                      size={18}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      className="text-[10px] font-black uppercase tracking-[0.7px]"
                      style={{ color: theme.colors.accent }}
                    >
                      Nouvelle action pédagogique
                    </Text>

                    <Text
                      className="mt-1 text-[12px] leading-[17px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      Tracez votre accompagnement en trois étapes simples.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  {[
                    { number: "1", label: "Cible" },
                    { number: "2", label: "Action" },
                    { number: "3", label: "Note" },
                  ].map((step) => (
                    <View
                      key={step.number}
                      className="min-w-0 flex-1 flex-row items-center rounded-[13px] px-2.5 py-2"
                      style={{ backgroundColor: "#F8F5FA" }}
                    >
                      <View
                        className="h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: "#E9DCFF" }}
                      >
                        <Text
                          className="text-[12px] font-black"
                          style={{ color: "#7C3AED" }}
                        >
                          {step.number}
                        </Text>
                      </View>

                      <Text
                        className="ml-2 text-[10px] font-black"
                        style={{ color: theme.colors.foreground }}
                      >
                        {step.label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {error ? (
              <View className="mb-3">
                <ErrorMessage message={error} />
              </View>
            ) : null}

            <SectionTitle
              eyebrow="Cible"
              title="Apprenant et formation"
              subtitle="Sélectionnez un couple réellement présent dans votre périmètre"
              icon={{ ios: "person.crop.circle.badge.checkmark", android: "person_search", web: "person_search" }}
            />

            {options.length === 0 ? (
              <View
                className="items-center rounded-[20px] border bg-white px-5 py-7"
                style={{ borderColor: "#E5DFE8" }}
              >
                <View
                  className="h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#F1E9FF" }}
                >
                  <SymbolView
                    name={{ ios: "person.2.slash.fill", android: "group_off", web: "group_off" }}
                    tintColor="#7C3AED"
                    size={18}
                    weight="bold"
                  />
                </View>
                <Text
                  className="mt-3 text-[12px] font-black"
                  style={{ color: theme.colors.foreground }}
                >
                  Aucun couple disponible
                </Text>
                <Text
                  className="mt-1 text-center text-[9px] leading-[14px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Aucun couple apprenant / formation n’est disponible.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {visibleOptions.map((option) => {
                  const active =
                    selected?.learnerId === option.learnerId &&
                    selected?.trainingId === option.trainingId;

                  return (
                    <Pressable
                      key={`${option.learnerId}-${option.trainingId}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`${option.learnerName}, ${option.trainingTitle}`}
                      onPress={() => setSelected(option)}
                      android_ripple={{ color: "transparent" }}
                      className="flex-row items-center rounded-[16px] border bg-white px-3 py-2.5"
                      style={{
                        borderColor: active ? "#8B5CF6" : "#E6E0E9",
                        backgroundColor: active ? "#F7F2FF" : "#FFFFFF",
                        shadowColor: "#0F172A",
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: active ? 0.04 : 0.02,
                        shadowRadius: 4,
                        elevation: active ? 1 : 0,
                      }}
                    >
                      <View
                        className="h-9 w-9 shrink-0 items-center justify-center rounded-[12px]"
                        style={{ backgroundColor: active ? "#E8DAFF" : "#F1E9FF" }}
                      >
                        <Text
                          className="text-[9px] font-black"
                          style={{ color: "#7C3AED" }}
                        >
                          {initials(option.learnerName)}
                        </Text>
                      </View>

                      <View className="ml-2.5 min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-[10px] font-black"
                          style={{ color: theme.colors.foreground }}
                        >
                          {option.learnerName}
                        </Text>
                        <Text
                          numberOfLines={1}
                          className="mt-0.5 text-[9px]"
                          style={{ color: theme.colors.foregroundMuted }}
                        >
                          {option.learnerEmail}
                        </Text>
                        <View className="mt-1 flex-row items-center">
                          <SymbolView
                            name={{ ios: "book.closed.fill", android: "menu_book", web: "menu_book" }}
                            tintColor="#7C3AED"
                            size={10}
                          />
                          <Text
                            numberOfLines={1}
                            className="ml-1.5 min-w-0 flex-1 text-[10px] font-bold"
                            style={{ color: "#7C3AED" }}
                          >
                            {option.trainingTitle}
                          </Text>
                        </View>
                      </View>

                      <View
                        className="ml-2 h-8 w-8 items-center justify-center rounded-[11px]"
                        style={{
                          backgroundColor: active ? theme.colors.accent : "#F5F2F7",
                        }}
                      >
                        <SymbolView
                          name={{
                            ios: active ? "checkmark" : "circle",
                            android: active ? "check" : "radio_button_unchecked",
                            web: active ? "check" : "radio_button_unchecked",
                          }}
                          tintColor={
                            active
                              ? theme.colors.accentForeground
                              : theme.colors.foregroundSubtle
                          }
                          size={11}
                          weight="bold"
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {options.length > PAGE_SIZE ? (
              <View
                className="mt-3 rounded-[17px] border bg-white px-3 py-2.5"
                style={{
                  borderColor:
                    theme.colors.border,
                }}
              >
                <View className="mb-2.5 flex-row items-center justify-between">
                  <Text
                    className="text-[10px] font-bold"
                    style={{
                      color:
                        theme.colors
                          .foregroundMuted,
                    }}
                  >
                    {firstVisible}–
                    {lastVisible} sur{" "}
                    {options.length}
                  </Text>

                  <View className="rounded-full bg-[#F3EEFF] px-2.5 py-1">
                    <Text
                      className="text-[9px] font-black"
                      style={{
                        color:
                          theme.colors
                            .accent,
                      }}
                    >
                      Page {currentPage} /{" "}
                      {totalPages}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-center gap-1.5">
                  <PaginationArrow
                    direction="previous"
                    disabled={
                      currentPage === 1
                    }
                    onPress={() =>
                      changePage(
                        currentPage - 1,
                      )
                    }
                  />

                  {paginationItems.map(
                    (item, index) => {
                      if (
                        item === "ellipsis"
                      ) {
                        return (
                          <View
                            key={`ellipsis-${index}`}
                            className="h-8 w-5 items-center justify-center"
                          >
                            <Text
                              className="text-[14px] font-bold"
                              style={{
                                color:
                                  theme
                                    .colors
                                    .foregroundSubtle,
                              }}
                            >
                              …
                            </Text>
                          </View>
                        );
                      }

                      const active =
                        item ===
                        currentPage;

                      return (
                        <Pressable
                          key={item}
                          accessibilityRole="button"
                          accessibilityLabel={`Page ${item}`}
                          accessibilityState={{
                            selected:
                              active,
                          }}
                          onPress={() =>
                            changePage(
                              item,
                            )
                          }
                          android_ripple={{
                            color:
                              "transparent",
                          }}
                          className="h-8 w-8 items-center justify-center rounded-[10px] border"
                          style={{
                            backgroundColor:
                              active
                                ? theme
                                    .colors
                                    .accent
                                : theme
                                    .colors
                                    .surface,
                            borderColor:
                              active
                                ? theme
                                    .colors
                                    .accent
                                : theme
                                    .colors
                                    .border,
                          }}
                        >
                          <Text
                            className="text-[10px] font-black"
                            style={{
                              color:
                                active
                                  ? theme
                                      .colors
                                      .accentForeground
                                  : theme
                                      .colors
                                      .foregroundMuted,
                            }}
                          >
                            {item}
                          </Text>
                        </Pressable>
                      );
                    },
                  )}

                  <PaginationArrow
                    direction="next"
                    disabled={
                      currentPage ===
                      totalPages
                    }
                    onPress={() =>
                      changePage(
                        currentPage + 1,
                      )
                    }
                  />
                </View>
              </View>
            ) : null}

            {selected ? (
              <View
                className="mt-4 overflow-hidden rounded-[18px] border bg-white"
                style={{
                  borderColor: "#DCCAF8",
                  shadowColor: "#0F172A",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.03,
                  shadowRadius: 5,
                  elevation: 1,
                }}
              >
                <View className="flex-row items-center px-3.5 py-3">
                  <View
                    className="h-9 w-9 items-center justify-center rounded-[11px]"
                    style={{ backgroundColor: "#F1E9FF" }}
                  >
                    <SymbolView
                      name={{
                        ios: "checkmark.seal.fill",
                        android: "verified",
                        web: "verified",
                      }}
                      tintColor="#7C3AED"
                      size={15}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      className="text-[9px] font-black uppercase tracking-[0.55px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Cible sélectionnée
                    </Text>

                    <Text
                      numberOfLines={1}
                      className="mt-0.5 text-[13px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {selected.learnerName}
                    </Text>

                    <Text
                      numberOfLines={1}
                      className="mt-0.5 text-[10px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {selected.trainingTitle}
                    </Text>
                  </View>
                </View>

                <View
                  className="h-px w-full"
                  style={{ backgroundColor: "#EFE8F7" }}
                />

                <View
                  className="flex-row items-center px-3.5 py-2.5"
                  style={{ backgroundColor: "#FCFAFF" }}
                >
                  <SymbolView
                    name={{
                      ios: "envelope.fill",
                      android: "mail",
                      web: "mail",
                    }}
                    tintColor={theme.colors.foregroundSubtle}
                    size={11}
                  />

                  <Text
                    numberOfLines={1}
                    className="ml-2 min-w-0 flex-1 text-[9px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    {selected.learnerEmail}
                  </Text>
                </View>
              </View>
            ) : null}

            <SectionTitle
              eyebrow="Action"
              title="Type d’intervention"
              subtitle="Choisissez la nature de l’action à tracer"
              icon={{ ios: "square.grid.2x2.fill", android: "category", web: "category" }}
            />

            <View className="flex-row flex-wrap justify-between gap-y-2.5">
              {types.map((value) => {
                const active = type === value;

                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`Sélectionner le type ${typeLabel(value)}`}
                    accessibilityHint={
                      value === "CALL"
                        ? "Sélectionne le type Appel sans lancer d'appel téléphonique."
                        : undefined
                    }
                    accessibilityState={{ selected: active }}
                    onPress={() => setType(value)}
                    android_ripple={{ color: "transparent" }}
                    className="min-h-[72px] flex-row items-center rounded-[16px] border px-3"
                    style={{
                      width: value === "MANUAL_REVIEW" ? "100%" : "48.7%",
                      backgroundColor: active ? "#F3EEFF" : "#FFFFFF",
                      borderColor: active ? "#8B5CF6" : "#E6E0E9",
                      shadowColor: "#0F172A",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: active ? 0.04 : 0.02,
                      shadowRadius: 4,
                      elevation: active ? 1 : 0,
                    }}
                  >
                    <View
                      className="h-9 w-9 items-center justify-center rounded-[11px]"
                      style={{
                        backgroundColor: active ? "#E8DAFF" : "#F7F4F8",
                      }}
                    >
                      <SymbolView
                        name={typeIcon(value)}
                        tintColor={
                          active
                            ? theme.colors.accent
                            : theme.colors.foregroundSubtle
                        }
                        size={14}
                        weight="bold"
                      />
                    </View>

                    <View className="ml-2.5 min-w-0 flex-1">
                      <Text
                        numberOfLines={2}
                        className="text-[11px] font-black leading-[14px]"
                        style={{
                          color: active
                            ? theme.colors.accent
                            : theme.colors.foreground,
                        }}
                      >
                        {typeLabel(value)}
                      </Text>

                      <Text
                        numberOfLines={2}
                        className="mt-0.5 text-[8px] leading-[11px]"
                        style={{
                          color: active
                            ? "#7656A6"
                            : theme.colors.foregroundSubtle,
                        }}
                      >
                        {typeHelper(value)}
                      </Text>
                    </View>

                    <View
                      className="ml-1.5 h-5 w-5 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: active
                          ? theme.colors.accent
                          : "#F3F0F5",
                      }}
                    >
                      <SymbolView
                        name={{
                          ios: active ? "checkmark" : "circle",
                          android: active ? "check" : "radio_button_unchecked",
                          web: active ? "check" : "radio_button_unchecked",
                        }}
                        tintColor={
                          active
                            ? theme.colors.accentForeground
                            : theme.colors.foregroundSubtle
                        }
                        size={9}
                        weight="bold"
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {type === "CALL" ? (
              <View
                className="mt-2 flex-row items-center rounded-[12px] px-3 py-2"
                style={{ backgroundColor: "#F7F2FF" }}
              >
                <SymbolView
                  name={{
                    ios: "info.circle.fill",
                    android: "info",
                    web: "info",
                  }}
                  tintColor="#7C3AED"
                  size={11}
                  weight="bold"
                />

                <Text
                  className="ml-2 min-w-0 flex-1 text-[9px] leading-[13px]"
                  style={{ color: theme.colors.foregroundMuted }}
                >
                  Type « Appel » sélectionné : l’action sera tracée sans lancer l’application Téléphone.
                </Text>
              </View>
            ) : null}

            <View
              className="mt-5"
              onLayout={(event) => {
                noteTopRef.current = event.nativeEvent.layout.y;
              }}
            >
              <SectionTitle
                eyebrow="Note"
                title="Note d’accompagnement"
                subtitle="Décrivez l’objectif, l’action prévue ou le contexte"
                icon={{ ios: "square.and.pencil", android: "edit_note", web: "edit_note" }}
                compactTop
              />

              <View
                className="rounded-[18px] border bg-white p-3"
                style={{ borderColor: "#E5DFE8" }}
              >
                <View
                  className="mb-2.5 flex-row items-center rounded-[12px] px-3 py-2.5"
                  style={{ backgroundColor: "#F8F5FA" }}
                >
                  <View
                    className="h-8 w-8 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: "#F1E9FF" }}
                  >
                    <SymbolView
                      name={typeIcon(type)}
                      tintColor="#7C3AED"
                      size={12}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-2.5 min-w-0 flex-1">
                    <Text
                      className="text-[8px] font-black uppercase tracking-[0.5px]"
                      style={{ color: theme.colors.foregroundSubtle }}
                    >
                      Contexte de l’action
                    </Text>

                    <Text
                      className="mt-0.5 text-[10px] font-black"
                      style={{ color: theme.colors.foreground }}
                    >
                      {typeLabel(type)}
                    </Text>
                  </View>
                </View>

                <TextInput
                  value={note}
                  onChangeText={setNote}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({
                        y: Math.max(0, noteTopRef.current - 90),
                        animated: true,
                      });
                    }, 80);
                  }}
                  multiline
                  scrollEnabled
                  textAlignVertical="top"
                  placeholder="Objectif, action prévue, contexte..."
                  placeholderTextColor={theme.colors.foregroundSubtle}
                  className="h-[124px] rounded-[14px] border px-3.5 py-3 text-[12px] leading-[19px]"
                  style={{
                    backgroundColor: "#F8F6F9",
                    borderColor: "#E9E2ED",
                    color: theme.colors.foreground,
                  }}
                />

                <Text
                  className="mt-2 text-[9px] leading-[13px]"
                  style={{ color: theme.colors.foregroundSubtle }}
                >
                  Cette note est enregistrée comme contexte de l’intervention.
                </Text>
              </View>
            </View>

            <View className="mb-2 mt-4">
              {selected ? (
                <View
                  className="mb-2.5 flex-row items-center rounded-[13px] px-3 py-2.5"
                  style={{ backgroundColor: "#F3EEFF" }}
                >
                  <SymbolView
                    name={{
                      ios: "checkmark.circle.fill",
                      android: "check_circle",
                      web: "check_circle",
                    }}
                    tintColor="#7C3AED"
                    size={13}
                    weight="bold"
                  />

                  <Text
                    numberOfLines={2}
                    className="ml-2 min-w-0 flex-1 text-[10px] font-bold leading-[14px]"
                    style={{ color: "#6D4AA5" }}
                  >
                    {selected.learnerName} · {typeLabel(type)}
                  </Text>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: submitting || options.length === 0 }}
                disabled={submitting || options.length === 0}
                onPress={() => void submit()}
                android_ripple={{ color: "transparent" }}
                className="h-[52px] w-full flex-row items-center justify-center rounded-[14px]"
                style={{
                  backgroundColor: theme.colors.accent,
                  opacity: submitting || options.length === 0 ? 0.45 : 1,
                }}
              >
                <SymbolView
                  name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
                  tintColor={theme.colors.accentForeground}
                  size={16}
                  weight="bold"
                />
                <Text
                  className="ml-2 text-[12px] font-black"
                  style={{ color: theme.colors.accentForeground }}
                >
                  {submitting ? "Création..." : "Créer l’intervention"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function PaginationArrow({
    direction,
    disabled,
    onPress,
  }: {
    direction:
      | "previous"
      | "next";
    disabled: boolean;
    onPress: () => void;
  }) {
    const previous =
      direction === "previous";

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          previous
            ? "Page précédente"
            : "Page suivante"
        }
        accessibilityState={{
          disabled,
        }}
        disabled={disabled}
        onPress={onPress}
        android_ripple={{
          color: "transparent",
        }}
        className="h-8 w-8 items-center justify-center rounded-[10px] border"
        style={{
          backgroundColor: disabled
            ? "#F8F6F3"
            : theme.colors.surface,
          borderColor:
            theme.colors.border,
          opacity: disabled
            ? 0.45
            : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous
              ? "chevron.left"
              : "chevron.right",
            android: previous
              ? "chevron_left"
              : "chevron_right",
            web: previous
              ? "chevron_left"
              : "chevron_right",
          }}
          tintColor={
            disabled
              ? theme.colors
                  .foregroundSubtle
              : theme.colors.accent
          }
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }

  function SectionTitle({
    eyebrow,
    title,
    subtitle,
    icon,
    compactTop = false,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: SymbolName;
    compactTop?: boolean;
  }) {
    return (
      <View
        className={`${compactTop ? "mb-2.5" : "mb-2.5 mt-4"} flex-row items-center`}
      >
        <View
          className="h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: "#F1E9FF" }}
        >
          <SymbolView name={icon} tintColor="#7C3AED" size={13} weight="bold" />
        </View>

        <View className="ml-2.5 min-w-0 flex-1">
          <Text
            className="text-[8px] font-black uppercase tracking-[0.65px]"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            {eyebrow}
          </Text>
          <Text
            className="mt-0.5 text-[16px] font-black"
            style={{ color: theme.colors.foreground }}
          >
            {title}
          </Text>
          <Text
            className="mt-0.5 text-[9px] leading-[13px]"
            style={{ color: theme.colors.foregroundMuted }}
          >
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }
}
