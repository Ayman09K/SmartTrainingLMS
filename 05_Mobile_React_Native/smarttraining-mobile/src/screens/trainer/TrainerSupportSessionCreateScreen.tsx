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

import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import {
  createTrainerSupportSession,
  getTrainerLearnerTrainingOptions,
} from "../../features/trainer/trainerActionService";
import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerTrainingOption,
  TrainerSupportSessionResponse,
} from "../../types/trainerActionMobile";

type Props = {
  trainerId: number;
  onCreated: (session: TrainerSupportSessionResponse) => void;
};

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 10;

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validLink(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

function initials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AP";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function buildPagination(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 2) return [1, 2, 3, "ellipsis", totalPages];
  if (currentPage >= totalPages - 1) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", currentPage, "ellipsis", totalPages];
}


type PremiumFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: "none" | "sentences";
  optional?: boolean;
  onEdited?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
};

function PremiumField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  autoCapitalize = "sentences",
  optional = false,
  onEdited,
  onFocus,
  onBlur,
}: PremiumFieldProps) {
  const { theme } = useSmartTrainingTheme();

  return (
    <View className="mb-3">
      <View className="mb-1.5 flex-row items-center">
        <Text
          className="text-[10px] font-black"
          style={{ color: theme.colors.foreground }}
        >
          {label}
        </Text>

        {optional ? (
          <Text
            className="ml-1.5 text-[8px] font-bold"
            style={{ color: theme.colors.foregroundSubtle }}
          >
            Optionnel
          </Text>
        ) : null}
      </View>

      <TextInput
        value={value}
        onChangeText={(nextValue) => {
          onEdited?.();
          onChangeText(nextValue);
        }}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.foregroundSubtle}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCapitalize !== "none"}
        className={`rounded-[14px] border px-3.5 text-[12px] ${
          multiline ? "min-h-[105px] py-3" : "h-[48px]"
        }`}
        style={{
          backgroundColor: "#FCFBFD",
          borderColor: "#E5DFE8",
          color: theme.colors.foreground,
        }}
      />
    </View>
  );
}

export default function TrainerSupportSessionCreateScreen({
  trainerId,
  onCreated,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  const scrollRef = useRef<ScrollView | null>(null);
  const noteTopRef = useRef(0);
  const noteFocusedRef = useRef(false);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [options, setOptions] = useState<TrainerLearnerTrainingOption[]>([]);
  const [selected, setSelected] = useState<TrainerLearnerTrainingOption | null>(null);
  const [page, setPage] = useState(1);
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [trainerId]);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios"
        ? "keyboardWillShow"
        : "keyboardDidShow";

    const hideEvent =
      Platform.OS === "ios"
        ? "keyboardWillHide"
        : "keyboardDidHide";

    const showSubscription = Keyboard.addListener(
      showEvent,
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);

        if (!noteFocusedRef.current) {
          return;
        }

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, noteTopRef.current - 150),
            animated: true,
          });
        }, 80);

        setTimeout(() => {
          scrollRef.current?.scrollTo({
            y: Math.max(0, noteTopRef.current - 150),
            animated: true,
          });
        }, 260);
      },
    );

    const hideSubscription = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardHeight(0);
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const totalPages = Math.max(1, Math.ceil(options.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  const visibleOptions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return options.slice(start, start + PAGE_SIZE);
  }, [currentPage, options]);

  const paginationItems = useMemo(
    () => buildPagination(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const firstVisible =
    options.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastVisible = Math.min(currentPage * PAGE_SIZE, options.length);

  async function submit() {
    if (!selected) {
      setError("Sélectionnez un apprenant et une formation.");
      return;
    }

    if (!title.trim() || !objective.trim()) {
      setError("Renseignez le titre et l’objectif de la séance.");
      return;
    }

    if (!validDate(date) || !validTime(time)) {
      setError("Utilisez la date AAAA-MM-JJ et l’heure HH:MM.");
      return;
    }

    if (!validLink(meetingLink)) {
      setError("Le lien de réunion doit commencer par http:// ou https://.");
      return;
    }

    const scheduledAt = `${date}T${time}:00`;
    const parsed = new Date(scheduledAt);

    if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      setError("La séance doit être planifiée dans le futur.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const created = await createTrainerSupportSession({
        learnerId: selected.learnerId,
        trainingId: selected.trainingId,
        title: title.trim(),
        objective: objective.trim(),
        scheduledAt,
        meetingLink: meetingLink.trim(),
        note: note.trim() || undefined,
      });

      onCreated(created);
    } catch {
      setError("La séance n’a pas pu être planifiée.");
    } finally {
      setSubmitting(false);
    }
  }

  function changePage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 1), totalPages));
  }

  if (loading) {
    return <LoadingState message="Préparation de la séance..." />;
  }

  return (
    <ScreenContainer
      edges={["left", "right", "bottom"]}
      style={{ padding: 0, backgroundColor: "#F8F6F3" }}
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === "android" &&
              keyboardHeight > 0
                ? keyboardHeight + 24
                : 48,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios"
              ? "interactive"
              : "on-drag"
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[760px] px-4">
            <View
              className="mt-4 overflow-hidden rounded-[22px] border bg-white"
              style={{
                borderColor: "#E5DFE8",
                shadowColor: "#0F172A",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.045,
                shadowRadius: 9,
                elevation: 2,
              }}
            >
              <View className="h-1.5" style={{ backgroundColor: "#7C3AED" }} />
              <View className="p-4">
                <View className="flex-row items-center">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-[14px]"
                    style={{ backgroundColor: "#F1E9FF" }}
                  >
                    <SymbolView
                      name={{ ios: "calendar.badge.plus", android: "event_available", web: "event_available" }}
                      tintColor="#7C3AED"
                      size={18}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text className="text-[10px] font-black uppercase tracking-[0.7px]" style={{ color: theme.colors.accent }}>
                      Nouvelle séance
                    </Text>
                    <Text className="mt-1 text-[12px] leading-[17px]" style={{ color: theme.colors.foregroundMuted }}>
                      Planifiez un rendez-vous pédagogique clair et traçable.
                    </Text>
                  </View>
                </View>

                <View className="mt-4 flex-row gap-2">
                  {[
                    ["1", "Cible"],
                    ["2", "Séance"],
                    ["3", "Lien"],
                  ].map(([number, label]) => (
                    <View key={number} className="min-w-0 flex-1 flex-row items-center rounded-[13px] bg-[#F8F5FA] px-2.5 py-2">
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-[#E9DCFF]">
                        <Text className="text-[9px] font-black text-[#7C3AED]">{number}</Text>
                      </View>
                      <Text numberOfLines={1} className="ml-2 min-w-0 flex-1 text-[10px] font-black" style={{ color: theme.colors.foreground }}>
                        {label}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <SectionTitle
              eyebrow="Étape 1"
              title="Apprenant et formation"
              subtitle="Choisissez le suivi concerné."
              icon={{ ios: "person.crop.circle.fill", android: "person_search", web: "person_search" }}
            />

            {options.length === 0 ? (
              <View className="items-center rounded-[20px] border bg-white px-5 py-7" style={{ borderColor: "#E5DFE8" }}>
                <SymbolView
                  name={{ ios: "person.crop.circle.badge.exclamationmark", android: "person_off", web: "person_off" }}
                  tintColor="#7C3AED"
                  size={22}
                  weight="bold"
                />
                <Text className="mt-3 text-[13px] font-black" style={{ color: theme.colors.foreground }}>
                  Aucun suivi disponible
                </Text>
              </View>
            ) : (
              <>
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
                        onPress={() => {
                          setSelected(option);
                          if (error) {
                            setError("");
                          }
                        }}
                        android_ripple={{ color: "transparent" }}
                        className="flex-row items-center rounded-[16px] border px-3 py-2.5"
                        style={{
                          borderColor: active ? "#8B5CF6" : "#E5DFE8",
                          backgroundColor: active ? "#F7F2FF" : "#FFFFFF",
                        }}
                      >
                        <View className="h-10 w-10 items-center justify-center rounded-[12px] bg-[#F1E9FF]">
                          <Text className="text-[10px] font-black text-[#7C3AED]">
                            {initials(option.learnerName)}
                          </Text>
                        </View>

                        <View className="ml-3 min-w-0 flex-1">
                          <Text numberOfLines={1} className="text-[12px] font-black" style={{ color: theme.colors.foreground }}>
                            {option.learnerName}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 text-[9px]" style={{ color: theme.colors.foregroundMuted }}>
                            {option.learnerEmail}
                          </Text>
                          <Text numberOfLines={1} className="mt-1 text-[10px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
                            {option.trainingTitle}
                          </Text>
                        </View>

                        <View
                          className="ml-2 h-8 w-8 items-center justify-center rounded-[11px]"
                          style={{ backgroundColor: active ? theme.colors.accent : "#F3F0F5" }}
                        >
                          <SymbolView
                            name={{
                              ios: active ? "checkmark" : "circle",
                              android: active ? "check" : "radio_button_unchecked",
                              web: active ? "check" : "radio_button_unchecked",
                            }}
                            tintColor={active ? theme.colors.accentForeground : theme.colors.foregroundSubtle}
                            size={10}
                            weight="bold"
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {options.length > PAGE_SIZE ? (
                  <View className="mt-3 rounded-[17px] border bg-white px-3 py-2.5" style={{ borderColor: theme.colors.border }}>
                    <View className="mb-2.5 flex-row items-center justify-between">
                      <Text className="text-[10px] font-bold" style={{ color: theme.colors.foregroundMuted }}>
                        {firstVisible}–{lastVisible} sur {options.length}
                      </Text>
                      <Text className="text-[9px] font-black text-[#7C3AED]">
                        Page {currentPage} / {totalPages}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-center gap-1.5">
                      <PageArrow
                        previous
                        disabled={currentPage === 1}
                        onPress={() => changePage(currentPage - 1)}
                      />

                      {paginationItems.map((item, index) =>
                        item === "ellipsis" ? (
                          <Text key={`e-${index}`} className="w-5 text-center text-[14px]" style={{ color: theme.colors.foregroundSubtle }}>
                            …
                          </Text>
                        ) : (
                          <Pressable
                            key={item}
                            onPress={() => changePage(item)}
                            android_ripple={{ color: "transparent" }}
                            className="h-8 w-8 items-center justify-center rounded-[10px] border"
                            style={{
                              backgroundColor: item === currentPage ? theme.colors.accent : theme.colors.surface,
                              borderColor: item === currentPage ? theme.colors.accent : theme.colors.border,
                            }}
                          >
                            <Text
                              className="text-[10px] font-black"
                              style={{
                                color: item === currentPage ? theme.colors.accentForeground : theme.colors.foregroundMuted,
                              }}
                            >
                              {item}
                            </Text>
                          </Pressable>
                        ),
                      )}

                      <PageArrow
                        disabled={currentPage === totalPages}
                        onPress={() => changePage(currentPage + 1)}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            )}

            <SectionTitle
              eyebrow="Étape 2"
              title="Informations de la séance"
              subtitle="Définissez le contenu et le créneau."
              icon={{ ios: "square.and.pencil", android: "edit_note", web: "edit_note" }}
            />

            <View className="rounded-[20px] border bg-white p-3.5" style={{ borderColor: "#E5DFE8" }}>
              <PremiumField
                onEdited={() => {
                  if (error) setError("");
                }}
                label="Titre"
                value={title}
                onChangeText={setTitle}
                placeholder="Point d’accompagnement"
              />
              <PremiumField
                onEdited={() => {
                  if (error) setError("");
                }}
                label="Objectif"
                value={objective}
                onChangeText={setObjective}
                placeholder="Faire le point sur la progression et les difficultés"
                multiline
              />

              <View className="flex-row gap-2.5">
                <View className="min-w-0 flex-1">
                  <PremiumField
                    onEdited={() => {
                      if (error) setError("");
                    }}
                    label="Date"
                    value={date}
                    onChangeText={setDate}
                    placeholder="2026-08-20"
                    autoCapitalize="none"
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <PremiumField
                    onEdited={() => {
                      if (error) setError("");
                    }}
                    label="Heure"
                    value={time}
                    onChangeText={setTime}
                    placeholder="15:30"
                    autoCapitalize="none"
                  />
                </View>
              </View>
            </View>

            <SectionTitle
              eyebrow="Étape 3"
              title="Réunion et note"
              subtitle="Ajoutez le lien et le contexte utile."
              icon={{ ios: "video.fill", android: "video_call", web: "video_call" }}
            />

            <View
              className="rounded-[20px] border bg-white p-3.5"
              style={{ borderColor: "#E5DFE8" }}
            >
              <PremiumField
                onEdited={() => {
                  if (error) setError("");
                }}
                label="Lien de réunion"
                value={meetingLink}
                onChangeText={setMeetingLink}
                placeholder="https://meet.google.com/..."
                autoCapitalize="none"
              />
            </View>

            <View
              className="mt-3"
              onLayout={(event) => {
                noteTopRef.current = event.nativeEvent.layout.y;
              }}
            >
              <View
                className="rounded-[20px] border bg-white p-3.5"
                style={{ borderColor: "#E5DFE8" }}
              >
                <PremiumField
                  onEdited={() => {
                    if (error) setError("");
                  }}
                  onFocus={() => {
                    noteFocusedRef.current = true;

                    setTimeout(() => {
                      scrollRef.current?.scrollTo({
                        y: Math.max(0, noteTopRef.current - 150),
                        animated: true,
                      });
                    }, 50);
                  }}
                  onBlur={() => {
                    noteFocusedRef.current = false;
                  }}
                  label="Note interne"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Préparation ou contexte de la séance"
                  multiline
                  optional
                />
              </View>
            </View>

            {selected ? (
              <View className="mt-4 flex-row items-center rounded-[14px] bg-[#F3EEFF] px-3 py-2.5">
                <SymbolView
                  name={{ ios: "checkmark.seal.fill", android: "verified", web: "verified" }}
                  tintColor="#7C3AED"
                  size={13}
                  weight="bold"
                />
                <Text numberOfLines={2} className="ml-2 min-w-0 flex-1 text-[10px] font-bold text-[#6D4AA5]">
                  {selected.learnerName} · {selected.trainingTitle}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View
                className="mt-3 overflow-hidden rounded-[16px] border"
                style={{
                  backgroundColor: "#FFF8F7",
                  borderColor: "#F3C7C2",
                }}
              >
                <View className="flex-row items-start px-3.5 py-3">
                  <View
                    className="h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                    style={{ backgroundColor: "#FDE8E6" }}
                  >
                    <SymbolView
                      name={{
                        ios: "exclamationmark.triangle.fill",
                        android: "error",
                        web: "error",
                      }}
                      tintColor="#C2413A"
                      size={14}
                      weight="bold"
                    />
                  </View>

                  <View className="ml-3 min-w-0 flex-1">
                    <Text
                      className="text-[10px] font-black"
                      style={{ color: "#9F302A" }}
                    >
                      Vérification requise
                    </Text>

                    <Text
                      className="mt-1 text-[10px] leading-[15px]"
                      style={{ color: "#7A3E3A" }}
                    >
                      {error}
                    </Text>
                  </View>
                </View>

                <View
                  className="h-1 w-full"
                  style={{ backgroundColor: "#D95B52" }}
                />
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting || options.length === 0}
              onPress={() => {
                Keyboard.dismiss();
                void submit();
              }}
              android_ripple={{ color: "transparent" }}
              className="mb-2 mt-3 h-[54px] w-full flex-row items-center justify-center rounded-[15px]"
              style={{
                backgroundColor: theme.colors.accent,
                opacity: submitting || options.length === 0 ? 0.5 : 1,
              }}
            >
              <SymbolView
                name={{ ios: "calendar.badge.plus", android: "event_available", web: "event_available" }}
                tintColor={theme.colors.accentForeground}
                size={15}
                weight="bold"
              />
              <Text className="ml-2 text-[11px] font-black" style={{ color: theme.colors.accentForeground }}>
                {submitting ? "Planification..." : "Planifier la séance"}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );

  function SectionTitle({
    eyebrow,
    title: sectionTitle,
    subtitle,
    icon,
  }: {
    eyebrow: string;
    title: string;
    subtitle: string;
    icon: SymbolName;
  }) {
    return (
      <View className="mb-2.5 mt-5 flex-row items-center">
        <View className="h-8 w-8 items-center justify-center rounded-[10px] bg-[#F1E9FF]">
          <SymbolView name={icon} tintColor="#7C3AED" size={13} weight="bold" />
        </View>
        <View className="ml-2.5 min-w-0 flex-1">
          <Text className="text-[8px] font-black uppercase tracking-[0.6px]" style={{ color: theme.colors.foregroundSubtle }}>
            {eyebrow}
          </Text>
          <Text className="mt-0.5 text-[16px] font-black" style={{ color: theme.colors.foreground }}>
            {sectionTitle}
          </Text>
          <Text className="mt-0.5 text-[9px] leading-[13px]" style={{ color: theme.colors.foregroundMuted }}>
            {subtitle}
          </Text>
        </View>
      </View>
    );
  }


  function PageArrow({
    previous = false,
    disabled,
    onPress,
  }: {
    previous?: boolean;
    disabled: boolean;
    onPress: () => void;
  }) {
    return (
      <Pressable
        disabled={disabled}
        onPress={onPress}
        android_ripple={{ color: "transparent" }}
        className="h-8 w-8 items-center justify-center rounded-[10px] border"
        style={{
          backgroundColor: disabled ? "#F8F6F3" : theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: disabled ? 0.45 : 1,
        }}
      >
        <SymbolView
          name={{
            ios: previous ? "chevron.left" : "chevron.right",
            android: previous ? "chevron_left" : "chevron_right",
            web: previous ? "chevron_left" : "chevron_right",
          }}
          tintColor={disabled ? theme.colors.foregroundSubtle : theme.colors.accent}
          size={14}
          weight="bold"
        />
      </Pressable>
    );
  }
}
