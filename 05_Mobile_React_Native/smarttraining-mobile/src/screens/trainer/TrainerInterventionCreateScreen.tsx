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
  createTrainerIntervention,
  getTrainerLearnerTrainingOptions,
} from "../../features/trainer/trainerActionService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerInterventionResponse,
  TrainerInterventionType,
  TrainerLearnerTrainingOption,
} from "../../types/trainerActionMobile";

type Props = {
  trainerId: number;
  onCreated: (
    intervention: TrainerInterventionResponse,
  ) => void;
};

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

export default function TrainerInterventionCreateScreen({
  trainerId,
  onCreated,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const [options, setOptions] =
    useState<TrainerLearnerTrainingOption[]>([]);
  const [selected, setSelected] =
    useState<TrainerLearnerTrainingOption | null>(null);
  const [type, setType] =
    useState<TrainerInterventionType>("FOLLOW_UP");
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

    if (!note.trim()) {
      setError(
        "Ajoutez une note d’accompagnement.",
      );
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
      setError(
        "L’intervention n’a pas pu être créée.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <LoadingState message="Préparation de l’intervention..." />
    );
  }

  const types: TrainerInterventionType[] = [
    "FOLLOW_UP",
    "MESSAGE",
    "CALL",
    "SUPPORT_SESSION",
    "MANUAL_REVIEW",
  ];

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
            title="Nouvelle intervention"
            subtitle="Choisissez un apprenant réellement suivi puis tracez l’action pédagogique."
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

          <Text
            style={[
              styles.label,
              { color: theme.colors.foreground },
            ]}
          >
            Type d’intervention
          </Text>

          <View style={styles.types}>
            {types.map((value) => {
              const active = type === value;

              return (
                <Text
                  key={value}
                  onPress={() => setType(value)}
                  style={[
                    styles.type,
                    {
                      backgroundColor: active
                        ? theme.colors.accent
                        : theme.colors.surfaceSoft,
                      color: active
                        ? theme.colors.background
                        : theme.colors.foreground,
                      borderColor: active
                        ? theme.colors.accent
                        : theme.colors.border,
                      borderWidth: theme.shape.borderWidth,
                    },
                  ]}
                >
                  {typeLabel(value)}
                </Text>
              );
            })}
          </View>

          <Text
            style={[
              styles.label,
              { color: theme.colors.foreground },
            ]}
          >
            Note d’accompagnement
          </Text>

          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            textAlignVertical="top"
            placeholder="Objectif, action prévue, contexte..."
            placeholderTextColor={theme.colors.foregroundSubtle}
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                color: theme.colors.foreground,
              },
            ]}
          />

          <AppButton
            title={
              submitting
                ? "Création..."
                : "Créer l’intervention"
            }
            onPress={() => void submit()}
            disabled={submitting || options.length === 0}
            style={styles.submit}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
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
    marginTop: 20,
    marginBottom: 9,
  },
  types: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  type: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
  },
  input: {
    minHeight: 130,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
  },
  submit: {
    marginTop: 18,
  },
});