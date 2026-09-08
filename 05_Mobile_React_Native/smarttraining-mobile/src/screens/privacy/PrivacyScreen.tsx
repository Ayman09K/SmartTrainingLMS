import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ScreenContainer from "../../components/ScreenContainer";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";

type Props = {
  onBack: () => void;
};

type Section = {
  title: string;
  paragraphs: string[];
};

const sections: Section[] = [
  {
    title: "Données traitées",
    paragraphs: [
      "Compte et profil : prénom, nom, adresse e-mail, civilité, photo de profil, rôle, état du compte et préférences d’apparence lorsque ces informations sont renseignées.",
      "Parcours LMS : formations, inscriptions, invitations, groupes ou cohortes, accès aux contenus, progression, complétions et activité sur les modules, leçons et ressources.",
      "Quiz et évaluations : quiz proposés, tentatives, réponses, scores et résultats nécessaires au suivi pédagogique.",
      "Accompagnement : feedbacks, avis, demandes d’aide, réponses, alertes pédagogiques, interventions et séances d’accompagnement lorsque ces fonctions sont utilisées.",
      "Analytics et aide au suivi : indicateurs de progression, d’activité et de risque, statistiques et recommandations à partir des données disponibles. Ces indicateurs assistent le suivi pédagogique et ne constituent pas, à eux seuls, une décision humaine.",
    ],
  },
  {
    title: "Finalités",
    paragraphs: [
      "Créer, sécuriser et administrer les comptes SmartTraining.",
      "Donner accès aux formations et assurer le fonctionnement du LMS.",
      "Enregistrer la progression, les complétions, les quiz et les résultats.",
      "Permettre l’accompagnement pédagogique, les feedbacks et le support.",
      "Produire des statistiques, indicateurs et recommandations utiles au suivi.",
      "Prévenir les abus et protéger l’authentification.",
    ],
  },
  {
    title: "Accès aux données",
    paragraphs: [
      "L’accès dépend du rôle et du besoin métier : l’apprenant consulte principalement ses propres données ; le formateur accède aux données pédagogiques des apprenants qu’il est autorisé à suivre ; l’administrateur dispose des accès nécessaires à l’administration de l’instance.",
      "Les échanges entre services sont limités aux besoins fonctionnels de la plateforme.",
    ],
  },
  {
    title: "Sécurité",
    paragraphs: [
      "SmartTraining utilise notamment une authentification par jeton, des contrôles de rôle et d’autorisation, des mots de passe stockés sous forme protégée, des liens de réinitialisation à durée limitée et à usage unique ainsi que des protections contre les tentatives répétées d’authentification.",
      "La sécurité du transport et de l’hébergement dépend également de la configuration du déploiement utilisé.",
    ],
  },
  {
    title: "Conservation",
    paragraphs: [
      "Les données sont conservées aussi longtemps qu’elles sont nécessaires au fonctionnement du compte, au parcours de formation, au suivi pédagogique, à l’administration de l’instance et aux obligations applicables au déploiement concerné.",
      "SmartTraining n’affiche pas ici une durée générique qui ne serait pas démontrée par la configuration réelle.",
    ],
  },
  {
    title: "Demandes et suppression",
    paragraphs: [
      "Vous pouvez demander des informations sur vos données ou la suppression de votre compte auprès de l’administrateur de votre instance SmartTraining.",
      "Selon le contexte, certaines données pédagogiques peuvent devoir être conservées ou anonymisées lorsqu’une exigence technique, pédagogique ou réglementaire l’impose. Le parcours de demande de suppression proposé dans l’application est traité séparément par la fonctionnalité dédiée.",
    ],
  },
  {
    title: "Contact",
    paragraphs: [
      "Pour une demande liée à la confidentialité, contactez l’administrateur de votre instance SmartTraining. Pour une application distribuée, les coordonnées développeur publiées avec l’application constituent également un point de contact.",
    ],
  },
];

export default function PrivacyScreen({ onBack }: Props) {
  const { theme } = useSmartTrainingTheme();

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <AppButton
            title="Retour"
            onPress={onBack}
            variant="secondary"
            style={styles.backButton}
          />

          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>
              CONFIDENTIALITÉ
            </Text>
            <Text style={[styles.title, { color: theme.colors.foreground }]}>
              Politique de confidentialité
            </Text>
            <Text
              style={[
                styles.lead,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Comprendre quelles données SmartTraining utilise, pourquoi elles
              sont nécessaires et comment elles sont protégées.
            </Text>
            <Text
              style={[
                styles.updated,
                { color: theme.colors.foregroundSubtle },
              ]}
            >
              Dernière mise à jour : 20 août 2026 · Web & Mobile
            </Text>
          </View>

          <View
            style={[
              styles.notice,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.controlRadius,
                borderWidth: theme.shape.borderWidth,
              },
            ]}
          >
            <Text
              style={[
                styles.noticeText,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              Cette page décrit le fonctionnement actuel de SmartTraining AI.
              Les paramètres du déploiement réel et les services effectivement
              activés doivent rester cohérents avec cette politique.
            </Text>
          </View>

          {sections.map((section) => (
            <View
              key={section.title}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  borderRadius: theme.shape.cardRadius,
                  borderWidth: theme.shape.borderWidth,
                  padding: theme.shape.cardPadding,
                },
              ]}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                {section.title}
              </Text>

              {section.paragraphs.map((paragraph) => (
                <View key={paragraph} style={styles.paragraphRow}>
                  <View
                    style={[
                      styles.bullet,
                      { backgroundColor: theme.colors.accent },
                    ]}
                  />
                  <Text
                    style={[
                      styles.paragraph,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    {paragraph}
                  </Text>
                </View>
              ))}
            </View>
          ))}

          <Text
            style={[
              styles.disclaimer,
              { color: theme.colors.foregroundSubtle },
            ]}
          >
            Cette politique décrit les fonctions de la solution ; elle ne
            constitue pas, à elle seule, une déclaration de conformité
            juridique globale. Le déploiement, les prestataires réellement
            activés et les pratiques de l’organisation exploitante doivent
            rester cohérents avec les informations communiquées aux
            utilisateurs.
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    flexGrow: 1,
    padding: 18,
    paddingBottom: 48,
  },
  page: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 920,
    gap: 14,
  },
  backButton: {
    alignSelf: "flex-start",
    minWidth: 130,
  },
  hero: {
    width: "100%",
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 7,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
  },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 9,
  },
  updated: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
    fontWeight: "700",
  },
  notice: {
    padding: 14,
  },
  noticeText: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  card: {
    width: "100%",
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: "900",
    marginBottom: 10,
  },
  paragraphRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 8,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 999,
    marginTop: 7,
    flexShrink: 0,
  },
  paragraph: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  disclaimer: {
    fontSize: 11,
    lineHeight: 17,
    paddingHorizontal: 4,
  },
});