import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AppButton from "../../components/AppButton";
import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
import SectionHeader from "../../components/SectionHeader";
import {
  downloadMyCertificatePdf,
  getMyCertificates,
  issueMyCertificate,
} from "../../features/trainings/learnerCertificateService";
import {
  getMyLearnerTrainings,
} from "../../features/trainings/learnerTrainingService";
import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import { LearnerCertificate } from "../../types/learnerCertificate";
import { LearnerMyTraining } from "../../types/learnerTraining";

function isCompleted(training: LearnerMyTraining): boolean {
  return (
    training.enrollmentStatus === "COMPLETED" ||
    (training.progressPercentage ?? 0) >= 100
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "Date non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

export default function LearnerCertificatesScreen() {
  const { theme } = useSmartTrainingTheme();

  const [certificates, setCertificates] =
    useState<LearnerCertificate[]>([]);
  const [trainings, setTrainings] =
    useState<LearnerMyTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyTrainingId, setBusyTrainingId] =
    useState<number | null>(null);
  const [busyCertificateId, setBusyCertificateId] =
    useState<number | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    const [certificateItems, trainingItems] = await Promise.all([
      getMyCertificates(),
      getMyLearnerTrainings(),
    ]);

    setCertificates(certificateItems);
    setTrainings(trainingItems);
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyCertificates(),
      getMyLearnerTrainings(),
    ])
      .then(([certificateItems, trainingItems]) => {
        if (!active) return;

        setCertificates(certificateItems);
        setTrainings(trainingItems);
        setError("");
      })
      .catch(() => {
        if (active) {
          setError(
            "Impossible de charger tes certificats pour le moment.",
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
  }, []);

  const certificateByTraining = useMemo(
    () =>
      new Map(
        certificates.map((certificate) => [
          certificate.trainingId,
          certificate,
        ]),
      ),
    [certificates],
  );

  const completedTrainings = useMemo(
    () => trainings.filter(isCompleted),
    [trainings],
  );

  async function handleIssue(trainingId: number) {
    setBusyTrainingId(trainingId);
    setError("");
    setSuccess("");

    try {
      await issueMyCertificate(trainingId);
      await load();
      setSuccess(
        "Ton certificat est prêt. Tu peux maintenant ouvrir ou partager le PDF.",
      );
    }
    catch {
      setError(
        "Le certificat ne peut pas être délivré. Vérifie que la formation est réellement terminée.",
      );
    }
    finally {
      setBusyTrainingId(null);
    }
  }

  async function handleDownload(certificate: LearnerCertificate) {
    setBusyCertificateId(certificate.id);
    setError("");

    try {
      await downloadMyCertificatePdf(certificate);
    }
    catch {
      setError(
        "Impossible de télécharger ou partager le certificat.",
      );
    }
    finally {
      setBusyCertificateId(null);
    }
  }

  if (loading) {
    return <LoadingState message="Chargement de tes certificats..." />;
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
          <View
            style={[
              styles.hero,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <SectionHeader
              title="Mes certificats"
              subtitle={
                "Retrouve les certificats délivrés après la réussite complète de tes formations."
              }
            />

            <View
              style={[
                styles.infoPanel,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderRadius: theme.shape.controlRadius,
                },
              ]}
            >
              <Text
                style={[
                  styles.infoText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                {
                  "Le serveur vérifie automatiquement que la formation est réellement terminée avant de délivrer un certificat."
                }
              </Text>
            </View>
          </View>

          {error ? <ErrorMessage message={error} /> : null}

          {success ? (
            <View
              style={[
                styles.successPanel,
                {
                  backgroundColor: theme.colors.surfaceSoft,
                  borderColor: theme.colors.success,
                  borderRadius: theme.shape.controlRadius,
                  borderWidth: theme.shape.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.successText,
                  { color: theme.colors.success },
                ]}
              >
                {success}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.sectionTitle,
              { color: theme.colors.foreground },
            ]}
          >
            Certificats obtenus
          </Text>

          {certificates.length === 0 ? (
            <View
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
                  styles.cardTitle,
                  { color: theme.colors.foreground },
                ]}
              >
                Aucun certificat pour le moment
              </Text>
              <Text
                style={[
                  styles.cardText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Termine une formation éligible pour pouvoir générer ton
                certificat.
              </Text>
            </View>
          ) : (
            certificates.map((certificate) => (
              <View
                key={certificate.id}
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
                    styles.cardEyebrow,
                    { color: theme.colors.accent },
                  ]}
                >
                  CERTIFICAT
                </Text>

                <Text
                  style={[
                    styles.cardTitle,
                    { color: theme.colors.foreground },
                  ]}
                >
                  {certificate.trainingTitle}
                </Text>

                <Text
                  style={[
                    styles.cardText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  Délivré à {certificate.learnerDisplayName}
                </Text>

                <Text
                  style={[
                    styles.cardText,
                    { color: theme.colors.foregroundMuted },
                  ]}
                >
                  {formatDate(certificate.issuedAt)}
                </Text>

                <View
                  style={[
                    styles.codeBox,
                    {
                      backgroundColor: theme.colors.surfaceSoft,
                      borderRadius: theme.shape.controlRadius,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.codeLabel,
                      { color: theme.colors.foregroundSubtle },
                    ]}
                  >
                    CODE PUBLIC DE VÉRIFICATION
                  </Text>
                  <Text
                    selectable
                    style={[
                      styles.codeValue,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {certificate.publicCode}
                  </Text>
                </View>

                <AppButton
                  title={
                    busyCertificateId === certificate.id
                      ? "Préparation du PDF..."
                      : "Ouvrir ou partager le PDF"
                  }
                  onPress={() => void handleDownload(certificate)}
                  disabled={busyCertificateId === certificate.id}
                  style={styles.actionButton}
                />
              </View>
            ))
          )}

          <Text
            style={[
              styles.sectionTitle,
              styles.secondSection,
              { color: theme.colors.foreground },
            ]}
          >
            Formations terminées
          </Text>

          {completedTrainings.length === 0 ? (
            <View
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
                  styles.cardText,
                  { color: theme.colors.foregroundMuted },
                ]}
              >
                Aucune formation n’est encore terminée dans ton parcours.
              </Text>
            </View>
          ) : (
            completedTrainings.map((training) => {
              const certificate =
                certificateByTraining.get(training.id);

              return (
                <View
                  key={training.id}
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
                      styles.cardTitle,
                      { color: theme.colors.foreground },
                    ]}
                  >
                    {training.title}
                  </Text>

                  <Text
                    style={[
                      styles.cardText,
                      { color: theme.colors.foregroundMuted },
                    ]}
                  >
                    Formation terminée
                    {training.completedAt
                      ? ` le ${formatDate(training.completedAt)}`
                      : ""}
                  </Text>

                  {certificate ? (
                    <Text
                      style={[
                        styles.availableText,
                        { color: theme.colors.success },
                      ]}
                    >
                      Certificat disponible
                    </Text>
                  ) : (
                    <AppButton
                      title={
                        busyTrainingId === training.id
                          ? "Génération..."
                          : "Générer mon certificat"
                      }
                      onPress={() => void handleIssue(training.id)}
                      disabled={busyTrainingId === training.id}
                      style={styles.actionButton}
                    />
                  )}
                </View>
              );
            })
          )}
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
    maxWidth: 980,
    alignSelf: "center",
  },
  hero: {
    marginBottom: 20,
  },
  infoPanel: {
    marginTop: 14,
    padding: 14,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 21,
  },
  successPanel: {
    padding: 14,
    marginBottom: 18,
  },
  successText: {
    fontSize: 14,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 12,
  },
  secondSection: {
    marginTop: 18,
  },
  card: {
    marginBottom: 14,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: "900",
    marginBottom: 6,
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 5,
  },
  codeBox: {
    padding: 12,
    marginTop: 10,
    marginBottom: 14,
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  codeValue: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "monospace",
  },
  actionButton: {
    alignSelf: "stretch",
    marginTop: 8,
  },
  availableText: {
    fontSize: 13,
    fontWeight: "900",
    marginTop: 8,
  },
});
