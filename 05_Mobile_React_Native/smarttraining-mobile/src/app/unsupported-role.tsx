import { useSmartTrainingTheme } from "../theme/provider/SmartTrainingThemeProvider";
type SmartTheme = ReturnType<typeof useSmartTrainingTheme>["theme"];
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import AppButton from "../components/AppButton";
import ScreenContainer from "../components/ScreenContainer";
import { removeToken } from "../storage/tokenStorage";




export default function UnsupportedRoleRoute() {
  const { theme } = useSmartTrainingTheme();
  const styles = makeStyles(theme);
  async function handleLogout() {
    await removeToken();
    router.replace("/");
  }

  return (
    <ScreenContainer>
      <View style={styles.card}>
        <Text style={styles.title}>Espace mobile apprenant</Text>
        <Text style={styles.text}>
          {"Cette version mobile ouvre actuellement l'espace apprenant. "}
          Les espaces formateur et administrateur seront separes dans leurs parcours dedies.
        </Text>
        <AppButton
          title="Changer de compte"
          onPress={() => void handleLogout()}
        />
      </View>
    </ScreenContainer>
  );
}

function makeStyles(theme: SmartTheme) {
  return StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.shape.cardRadius,
    padding: theme.shape.cardPadding,
    marginTop: theme.shape.cardPadding * 2,
  },
  title: {
    color: theme.colors.foreground,
    fontSize: 23,
    fontWeight: "900",
    marginBottom: 14,
  },
  text: {
    color: theme.colors.foregroundMuted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: theme.shape.cardPadding,
  },
});
}
