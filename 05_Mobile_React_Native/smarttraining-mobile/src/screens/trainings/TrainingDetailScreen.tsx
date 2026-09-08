import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import InfoRow from "../../components/InfoRow";
import LoadingState from "../../components/LoadingState";
import ModuleCard from "../../components/ModuleCard";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import StatusBadge from "../../components/StatusBadge";
import { getTrainingFullDetails } from "../../features/trainings/trainingService";



import { FullTraining } from "../../types/training";

type TrainingDetailScreenProps = {
  trainingId: number;
  onBack: () => void;
  onOpenQuizzes: () => void;
};

export default function TrainingDetailScreen({
  trainingId,
  onBack,
  onOpenQuizzes,
}: TrainingDetailScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [training, setTraining] = useState<FullTraining | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTrainingDetails() {
    try {
      setLoading(true);
      setErrorMessage("");

      const data = await getTrainingFullDetails(trainingId);
      setTraining(data);
    } catch {
      setErrorMessage(
        "Impossible de charger le détail de la formation. Réessaie dans quelques instants."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    void getTrainingFullDetails(trainingId)
      .then((data) => {
        if (active) {
          setTraining(data);
        }
      })
      .catch((error: any) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          "Impossible de charger le detail de la formation. Reessaie dans quelques instants."
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [trainingId]);

  if (loading) {
    return <LoadingState message="Chargement du parcours..." />;
  }

  if (errorMessage.length > 0) {
    return (
      <ScreenContainer>
        <AppButton title="Retour" onPress={onBack} variant="secondary" />
        <View style={styles.spacer} />
        <ErrorMessage message={errorMessage} onRetry={loadTrainingDetails} />
      </ScreenContainer>
    );
  }

  if (!training) {
    return (
      <ScreenContainer>
        <AppButton title="Retour" onPress={onBack} variant="secondary" />
        <View style={styles.spacer} />
        <ErrorMessage message="Formation introuvable." />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppButton
          title="Retour aux formations"
          onPress={onBack}
          variant="secondary"
        />

        <View style={styles.hero}>
          <View style={styles.badgeRow}>
            <StatusBadge
              label={training.status === "PUBLISHED" ? "Publiée" : training.status === "DRAFT" ? "Brouillon" : "Archivée"}
              variant={training.status === "PUBLISHED" ? "success" : "warning"}
            />
          </View>

          <Text style={styles.title}>{training.title}</Text>

          <Text style={styles.description}>
            {training.description || "Aucune description renseignée."}
          </Text>

          <View style={styles.infoGrid}>
            <InfoRow label="Niveau" value={training.level} />
            <InfoRow
              label="Durée"
              value={`${training.estimatedDurationHours ?? 0} h`}
            />
            <InfoRow
              label="Modules"
              value={`${training.modules.length}`}
            />
          </View>

          {training.objectives && (
            <View style={styles.objectivesBox}>
              <Text style={styles.objectivesTitle}>Objectifs pédagogiques</Text>
              <Text style={styles.objectivesText}>{training.objectives}</Text>
            </View>
          )}
        </View>

        <AppButton title="Voir les quiz" onPress={onOpenQuizzes} />

        <View style={styles.spacer} />

        <SectionHeader
          title="Parcours pédagogique"
          subtitle="Découvre les modules, leçons et ressources associés à cette formation."
        />

        {training.modules.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Aucun module disponible</Text>
            <Text style={styles.emptyText}>
              Cette formation ne contient pas encore de modules.
            </Text>
          </View>
        )}

        {training.modules.map((module) => (
          <ModuleCard key={module.id} module={module} />
        ))}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  spacer: {
    height: 14,
  },
  hero: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginTop: 14,
    marginBottom: theme.shape.cardPadding,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 5,
    },
    elevation: 3,
  },
  badgeRow: {
    marginBottom: 14,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 8,
  },
  description: {
    color: theme.colors.foregroundMuted,
    lineHeight: 22,
    marginBottom: 18,
  },
  infoGrid: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
    marginBottom: 18,
  },
  objectivesBox: {
    backgroundColor: theme.colors.surfaceSoft,
    borderRadius: theme.shape.cardRadius,
    padding: 18,
  },
  objectivesTitle: {
    color: theme.colors.accent,
    fontWeight: "900",
    marginBottom: 8,
  },
  objectivesText: {
    color: theme.colors.foregroundMuted,
    lineHeight: 21,
  },
  emptyState: {
    backgroundColor: theme.colors.surface,
    padding: theme.shape.cardPadding,
    borderRadius: theme.shape.cardRadius,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyTitle: {
    color: theme.colors.foreground,
    fontWeight: "900",
    fontSize: 17,
    marginBottom: 5,
  },
  emptyText: {
    color: theme.colors.foregroundMuted,
    lineHeight: 20,
  },
  bottomSpace: {
    height: theme.shape.cardPadding * 2,
  },
});
}
