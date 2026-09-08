import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import TrainingCard from "../../components/TrainingCard";
import { getTrainings } from "../../features/trainings/trainingService";
import { removeToken } from "../../storage/tokenStorage";



import { Training } from "../../types/training";

type TrainingListScreenProps = {
  onSelectTraining: (trainingId: number) => void;
  onOpenProgress: () => void;
  onLogout: () => void;
};

export default function TrainingListScreen({ onSelectTraining, onOpenProgress, onLogout }: TrainingListScreenProps) {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadTrainings() {
    try { setErrorMessage(""); setTrainings(await getTrainings()); }
    catch {
      setErrorMessage("Impossible de charger les formations. Vérifie le backend, la Gateway et le token.");
    } finally { setLoading(false); setRefreshing(false); }
  }

  async function handleRefresh() { setRefreshing(true); await loadTrainings(); }
  async function handleLogout() { await removeToken(); onLogout(); }
    useEffect(() => {
    let active = true;

    void getTrainings()
      .then((data) => {
        if (!active) {
          return;
        }

        setErrorMessage("");
        setTrainings(data);
      })
      .catch((error: any) => {
        if (!active) {
          return;
        }

        setErrorMessage(
          "Impossible de charger les formations. Reessaie dans quelques instants."
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
  }, []);

  if (loading) return <LoadingState message="Chargement des formations..." />;

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <SectionHeader title="Mes formations" subtitle="Consulte tes parcours disponibles et continue ton apprentissage." />
        <View style={styles.actions}>
          <AppButton title="Ma progression" onPress={onOpenProgress} variant="secondary" style={styles.actionButton} />
          <AppButton title="Déconnexion" onPress={handleLogout} variant="secondary" style={styles.actionButton} />
        </View>
      </View>
      {errorMessage ? <ErrorMessage message={errorMessage} onRetry={loadTrainings} /> : null}
      <FlatList
        data={trainings}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => <TrainingCard training={item} onPress={() => onSelectTraining(item.id)} />}
        ListEmptyComponent={<View style={styles.emptyState}><Text style={styles.emptyTitle}>Aucune formation disponible</Text><Text style={styles.emptyText}>Les formations créées dans training-service apparaîtront ici.</Text></View>}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  headerRow: { gap: 14, marginBottom: 14 },
  actions: { flexDirection: "row", gap: 8 },
  actionButton: { flex: 1 },
  emptyState: { backgroundColor: theme.colors.surface, padding: theme.shape.cardPadding, borderRadius: theme.shape.cardRadius, borderWidth: 1, borderColor: theme.colors.border },
  emptyTitle: { color: theme.colors.foreground, fontWeight: "800", fontSize: 17, marginBottom: 5 },
  emptyText: { color: theme.colors.foregroundMuted, lineHeight: 20 },
});
}
