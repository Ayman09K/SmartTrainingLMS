import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import TrainerLearnerTrainingSelector from "../../components/trainer/TrainerLearnerTrainingSelector";
import {
  createTrainerSupportSession,
  getTrainerLearnerTrainingOptions,
} from "../../features/trainer/trainerActionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerTrainingOption,
  TrainerSupportSessionResponse,
} from "../../types/trainerActionMobile";

type Props = {
  trainerId: number;
  onCreated: (
    session: TrainerSupportSessionResponse,
  ) => void;
};

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function validTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validLink(value: string): boolean {
  return /^https?:\/\/\S+$/i.test(value.trim());
}

export default function TrainerSupportSessionCreateScreen({
  trainerId,
  onCreated,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [options, setOptions] =
    useState<TrainerLearnerTrainingOption[]>([]);
  const [selected, setSelected] =
    useState<TrainerLearnerTrainingOption | null>(null);
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
          setError("");
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger vos apprenants suivis.",
          );
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

  async function submit() {
    if (!selected) {
      setError(
        "Sélectionnez un apprenant et une formation.",
      );
      return;
    }

    if (!title.trim() || !objective.trim()) {
      setError(
        "Renseignez le titre et l’objectif de la séance.",
      );
      return;
    }

    if (!validDate(date) || !validTime(time)) {
      setError(
        "Utilisez la date AAAA-MM-JJ et l’heure HH:MM.",
      );
      return;
    }

    if (!validLink(meetingLink)) {
      setError(
        "Le lien de réunion doit commencer par http:// ou https://.",
      );
      return;
    }

    const scheduledAt = `${date}T${time}:00`;
    const parsed = new Date(scheduledAt);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getTime() <= Date.now()
    ) {
      setError(
        "La séance doit être planifiée dans le futur.",
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const created =
        await createTrainerSupportSession({
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
      setError(
        "La séance n’a pas pu être planifiée.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Préparation de la séance..." />
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: theme.shape.cardPadding * 2,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <SectionHeader
            title="Planifier une séance"
            subtitle="Créez un rendez-vous d’accompagnement avec un lien de visioconférence."
          />

          {error ? (
            <ErrorMessage message={error} />
          ) : null}

          <Text
            style={[
              styles.label,
              { color: theme.colors.foreground },
            ]}
          >
            Apprenant et formation
          </Text>

          <TrainerLearnerTrainingSelector
            options={options}
            selected={selected}
            onSelect={setSelected}
          />

          <Field
            label="Titre"
            value={title}
            onChangeText={setTitle}
            placeholder="Point d’accompagnement"
          />

          <Field
            label="Objectif"
            value={objective}
            onChangeText={setObjective}
            placeholder="Faire le point sur la progression et les difficultés"
            multiline
          />

          <View style={styles.row}>
            <View style={styles.half}>
              <Field
                label="Date"
                value={date}
                onChangeText={setDate}
                placeholder="2026-08-20"
              />
            </View>
            <View style={styles.half}>
              <Field
                label="Heure"
                value={time}
                onChangeText={setTime}
                placeholder="15:30"
              />
            </View>
          </View>

          <Field
            label="Lien de réunion"
            value={meetingLink}
            onChangeText={setMeetingLink}
            placeholder="https://meet.google.com/..."
            autoCapitalize="none"
          />

          <Field
            label="Note interne"
            value={note}
            onChangeText={setNote}
            placeholder="Préparation ou contexte de la séance"
            multiline
          />

          <AppButton
            title={
              submitting
                ? "Planification..."
                : "Planifier la séance"
            }
            onPress={() => void submit()}
            disabled={submitting || options.length === 0}
            style={styles.submit}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );

  function Field({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    autoCapitalize = "sentences",
  }: {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder: string;
    multiline?: boolean;
    autoCapitalize?: "none" | "sentences";
  }) {
    return (
      <View style={styles.field}>
        <Text
          style={[
            styles.label,
            { color: theme.colors.foreground },
          ]}
        >
          {label}
        </Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.foregroundSubtle}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          autoCapitalize={autoCapitalize}
          style={[
            styles.input,
            multiline && styles.multiline,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderRadius: theme.shape.cardRadius,
              borderWidth: theme.shape.borderWidth,
              color: theme.colors.foreground,
            },
          ]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  scrollArea: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
  },
  page: {
    width: "100%",
    maxWidth: 900,
    alignSelf: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "900",
    marginTop: 18,
    marginBottom: 8,
  },
  field: {},
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 100,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  half: {
    flexGrow: 1,
    flexBasis: 180,
    minWidth: 0,
  },
  submit: {
    marginTop: 20,
  },
});