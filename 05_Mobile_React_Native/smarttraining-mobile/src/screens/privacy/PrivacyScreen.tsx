import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Stack } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

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
  icon: SymbolViewProps["name"];
};

const sections: Section[] = [
  {
    title: "Données traitées",
    icon: { ios: "person.text.rectangle.fill", android: "badge", web: "badge" },
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
    icon: { ios: "scope", android: "track_changes", web: "track_changes" },
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
    icon: { ios: "person.2.badge.key.fill", android: "admin_panel_settings", web: "admin_panel_settings" },
    paragraphs: [
      "L’accès dépend du rôle et du besoin métier : l’apprenant consulte principalement ses propres données ; le formateur accède aux données pédagogiques des apprenants qu’il est autorisé à suivre ; l’administrateur dispose des accès nécessaires à l’administration de l’instance.",
      "Les échanges entre services sont limités aux besoins fonctionnels de la plateforme.",
    ],
  },
  {
    title: "Sécurité",
    icon: { ios: "lock.shield.fill", android: "security", web: "security" },
    paragraphs: [
      "SmartTraining utilise notamment une authentification par jeton, des contrôles de rôle et d’autorisation, des mots de passe stockés sous forme protégée, des liens de réinitialisation à durée limitée et à usage unique ainsi que des protections contre les tentatives répétées d’authentification.",
      "La sécurité du transport et de l’hébergement dépend également de la configuration du déploiement utilisé.",
    ],
  },
  {
    title: "Conservation",
    icon: { ios: "archivebox.fill", android: "inventory_2", web: "inventory_2" },
    paragraphs: [
      "Les données sont conservées aussi longtemps qu’elles sont nécessaires au fonctionnement du compte, au parcours de formation, au suivi pédagogique, à l’administration de l’instance et aux obligations applicables au déploiement concerné.",
      "SmartTraining n’affiche pas ici une durée générique qui ne serait pas démontrée par la configuration réelle.",
    ],
  },
  {
    title: "Demandes et suppression",
    icon: { ios: "trash.fill", android: "delete", web: "delete" },
    paragraphs: [
      "Vous pouvez demander des informations sur vos données ou la suppression de votre compte auprès de l’administrateur de votre instance SmartTraining.",
      "Selon le contexte, certaines données pédagogiques peuvent devoir être conservées ou anonymisées lorsqu’une exigence technique, pédagogique ou réglementaire l’impose. Le parcours de demande de suppression proposé dans l’application est traité séparément par la fonctionnalité dédiée.",
    ],
  },
  {
    title: "Contact",
    icon: { ios: "envelope.fill", android: "mail", web: "mail" },
    paragraphs: [
      "Pour une demande liée à la confidentialité, contactez l’administrateur de votre instance SmartTraining. Pour une application distribuée, les coordonnées développeur publiées avec l’application constituent également un point de contact.",
    ],
  },
];

export default function PrivacyScreen({ onBack }: Props) {
  const { theme } = useSmartTrainingTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Confidentialité",
          headerTitleAlign: "center",
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour"
              hitSlop={6}
              onPress={onBack}
              android_ripple={{ color: "transparent" }}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                marginLeft: 2,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: pressed
                  ? "rgba(255,255,255,0.18)"
                  : "rgba(255,255,255,0.10)",
              })}
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "chevron_left",
                  web: "chevron_left",
                }}
                tintColor={theme.colors.headerForeground}
                size={24}
                weight="bold"
              />
            </Pressable>
          ),
        }}
      />
      <ScreenContainer>
      <ScrollView
        className="flex-1"
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={{ paddingBottom: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="w-full self-center" style={{ maxWidth: 860 }}>
          <View
            className="overflow-hidden rounded-[22px] border"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: theme.shape.shadowOpacity,
              shadowRadius: 14,
              elevation: 2,
            }}
          >
            <View className="h-1.5" style={{ backgroundColor: theme.colors.accent }} />
            <View className="relative overflow-hidden px-4 py-3.5">
              <View
                className="absolute -right-12 -top-14 h-32 w-32 rounded-full"
                style={{ backgroundColor: theme.colors.surfaceSoft }}
              />
              <View className="flex-row items-center">
                <View
                  className="h-12 w-12 items-center justify-center rounded-[16px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <SymbolView
                    name={{ ios: "hand.raised.fill", android: "privacy_tip", web: "privacy_tip" }}
                    tintColor={theme.colors.accent}
                    size={22}
                    weight="bold"
                  />
                </View>
                <View className="ml-3 min-w-0 flex-1 pr-2">
                  <Text
                    className="text-[10px] font-black uppercase tracking-[0.9px]"
                    style={{ color: theme.colors.accent }}
                  >
                    Confidentialité
                  </Text>
                  <Text
                    className="mt-0.5 text-[22px] font-black leading-[27px]"
                    style={{ color: theme.colors.foreground }}
                  >
                    Vos données, en toute transparence
                  </Text>
                  <Text
                    className="mt-1 text-[12px] leading-[18px]"
                    style={{ color: theme.colors.foregroundMuted }}
                  >
                    Comprendre quelles données SmartTraining utilise, pourquoi elles sont nécessaires et comment elles sont protégées.
                  </Text>
                </View>
              </View>

              <View className="mt-3 flex-row flex-wrap gap-1.5">
                {["Données", "Sécurité", "Contrôle"].map((label) => (
                  <View
                    key={label}
                    className="rounded-full px-2.5 py-1"
                    style={{ backgroundColor: theme.colors.surfaceSoft }}
                  >
                    <Text
                      className="text-[10px] font-black"
                      style={{ color: theme.colors.accent }}
                    >
                      {label}
                    </Text>
                  </View>
                ))}
              </View>

              <Text
                className="mt-2.5 text-[10px] font-bold"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                Dernière mise à jour : 20 août 2026 · Web & Mobile
              </Text>
            </View>
          </View>

          <View
            className="mt-2.5 flex-row items-start rounded-[16px] border px-3.5 py-3"
            style={{
              backgroundColor: theme.colors.surfaceSoft,
              borderColor: theme.colors.border,
            }}
          >
            <View
              className="h-8 w-8 items-center justify-center rounded-[11px]"
              style={{ backgroundColor: theme.colors.surface }}
            >
              <SymbolView
                name={{ ios: "info.circle.fill", android: "info", web: "info" }}
                tintColor={theme.colors.info}
                size={15}
                weight="bold"
              />
            </View>
            <Text
              className="ml-2.5 flex-1 text-[10.5px] leading-[16px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Cette page décrit le fonctionnement actuel de SmartTraining AI. Les paramètres du déploiement réel et les services effectivement activés doivent rester cohérents avec cette politique.
            </Text>
          </View>

          <View className="mt-4 mb-0.5">
            <Text
              className="text-[18px] font-black"
              style={{ color: theme.colors.foreground }}
            >
              Politique de confidentialité
            </Text>
            <Text
              className="mt-1 text-[11px] leading-[17px]"
              style={{ color: theme.colors.foregroundMuted }}
            >
              Les informations ci-dessous reprennent le contenu fonctionnel actuel de SmartTraining.
            </Text>
          </View>

          {sections.map((section) => (
            <View
              key={section.title}
              className="mt-2 rounded-[18px] border p-3.5"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              }}
            >
              <View className="flex-row items-center">
                <View
                  className="h-9 w-9 items-center justify-center rounded-[12px]"
                  style={{ backgroundColor: theme.colors.surfaceSoft }}
                >
                  <SymbolView
                    name={section.icon}
                    tintColor={theme.colors.accent}
                    size={16}
                    weight="bold"
                  />
                </View>
                <Text
                  className="ml-2.5 flex-1 text-[16px] font-black leading-[21px]"
                  style={{ color: theme.colors.foreground }}
                >
                  {section.title}
                </Text>
              </View>

              <View className="mt-2">
                {section.paragraphs.map((paragraph) => (
                  <View key={paragraph} className="mt-1.5 flex-row items-start">
                    <View
                      className="mt-[7px] h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: theme.colors.accent }}
                    />
                    <Text
                      className="ml-2.5 flex-1 text-[11.5px] leading-[18px]"
                      style={{ color: theme.colors.foregroundMuted }}
                    >
                      {paragraph}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}

          <View
            className="mt-3 rounded-[16px] border px-3.5 py-3"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <View className="flex-row items-start">
              <SymbolView
                name={{ ios: "checkmark.shield.fill", android: "verified_user", web: "verified_user" }}
                tintColor={theme.colors.success}
                size={22}
                weight="bold"
              />
              <Text
                className="ml-2.5 flex-1 text-[10.5px] leading-[16px]"
                style={{ color: theme.colors.foregroundSubtle }}
              >
                Cette politique décrit les fonctions de la solution ; elle ne constitue pas, à elle seule, une déclaration de conformité juridique globale. Le déploiement, les prestataires réellement activés et les pratiques de l’organisation exploitante doivent rester cohérents avec les informations communiquées aux utilisateurs.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
      </ScreenContainer>
    </>
  );
}
