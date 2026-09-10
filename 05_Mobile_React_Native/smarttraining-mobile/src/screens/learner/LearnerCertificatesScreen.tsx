/* eslint-disable react-hooks/set-state-in-effect */
import { SymbolView } from "expo-symbols";
import {
  type ComponentProps,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import ErrorMessage from "../../components/ErrorMessage";
import LoadingState from "../../components/LoadingState";
import ScreenContainer from "../../components/ScreenContainer";
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

type SymbolName = ComponentProps<typeof SymbolView>["name"];
type PaginationItem = number | "ellipsis";

const PAGE_SIZE = 5;

function isCompleted(
  training: LearnerMyTraining,
): boolean {
  return (
    training.enrollmentStatus === "COMPLETED" ||
    (training.progressPercentage ?? 0) >= 100
  );
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return "Date non disponible";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
  }).format(date);
}

function certificateStatus(
  certificate: LearnerCertificate,
): {
  label: string;
  tint: string;
  soft: string;
} {
  if (certificate.status === "REVOKED") {
    return {
      label: "Révoqué",
      tint: "#DC2626",
      soft: "#FEF2F2",
    };
  }

  return {
    label: "Actif",
    tint: "#16A36A",
    soft: "#ECFDF3",
  };
}


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
    return [
      1,
      2,
      3,
      "ellipsis",
      totalPages,
    ];
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

export default function LearnerCertificatesScreen() {
  const { theme } =
    useSmartTrainingTheme();

  const [
    certificates,
    setCertificates,
  ] = useState<
    LearnerCertificate[]
  >([]);

  const [
    trainings,
    setTrainings,
  ] = useState<
    LearnerMyTraining[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busyTrainingId,
    setBusyTrainingId,
  ] = useState<
    number | null
  >(null);

  const [
    busyCertificateId,
    setBusyCertificateId,
  ] = useState<
    number | null
  >(null);

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const [
    page,
    setPage,
  ] = useState(1);

  async function load() {
    const [
      certificateItems,
      trainingItems,
    ] = await Promise.all([
      getMyCertificates(),
      getMyLearnerTrainings(),
    ]);

    setCertificates(
      certificateItems,
    );

    setTrainings(
      trainingItems,
    );
  }

  useEffect(() => {
    let active = true;

    void Promise.all([
      getMyCertificates(),
      getMyLearnerTrainings(),
    ])
      .then(
        ([
          certificateItems,
          trainingItems,
        ]) => {
          if (!active) {
            return;
          }

          setCertificates(
            certificateItems,
          );

          setTrainings(
            trainingItems,
          );

          setError("");
        },
      )
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

  const certificateByTraining =
    useMemo(
      () =>
        new Map(
          certificates.map(
            (certificate) => [
              certificate.trainingId,
              certificate,
            ],
          ),
        ),
      [certificates],
    );

  const completedTrainings =
    useMemo(
      () =>
        trainings.filter(
          isCompleted,
        ),
      [trainings],
    );

  const pendingCertificates =
    useMemo(
      () =>
        completedTrainings.filter(
          (training) =>
            !certificateByTraining.has(
              training.id,
            ),
        ),
      [
        certificateByTraining,
        completedTrainings,
      ],
    );


  const paginatableItems = useMemo(
    () => [
      ...certificates.map(
        (certificate) => ({
          kind: "certificate" as const,
          certificate,
        }),
      ),
      ...pendingCertificates.map(
        (training) => ({
          kind: "pending" as const,
          training,
        }),
      ),
    ],
    [
      certificates,
      pendingCertificates,
    ],
  );

  const paginationTotal =
    paginatableItems.length;

  const totalPages = Math.max(
    1,
    Math.ceil(
      paginationTotal / PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    Math.max(page, 1),
    totalPages,
  );

  const pageStart =
    (currentPage - 1) *
    PAGE_SIZE;

  const visiblePageItems =
    paginatableItems.slice(
      pageStart,
      pageStart + PAGE_SIZE,
    );

  const visibleCertificates =
    visiblePageItems.flatMap(
      (item) =>
        item.kind === "certificate"
          ? [item.certificate]
          : [],
    );

  const visiblePendingTrainings =
    visiblePageItems.flatMap(
      (item) =>
        item.kind === "pending"
          ? [item.training]
          : [],
    );

  const firstVisible =
    paginationTotal === 0
      ? 0
      : pageStart + 1;

  const lastVisible = Math.min(
    pageStart + PAGE_SIZE,
    paginationTotal,
  );

  const paginationItems = useMemo(
    () =>
      buildPagination(
        currentPage,
        totalPages,
      ),
    [currentPage, totalPages],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  async function handleIssue(
    trainingId: number,
  ) {
    setBusyTrainingId(
      trainingId,
    );

    setError("");
    setSuccess("");

    try {
      await issueMyCertificate(
        trainingId,
      );

      await load();

      setSuccess(
        "Ton certificat est prêt. Tu peux maintenant ouvrir ou partager le PDF.",
      );
    } catch {
      setError(
        "Le certificat ne peut pas être délivré. Vérifie que la formation est réellement terminée.",
      );
    } finally {
      setBusyTrainingId(null);
    }
  }

  async function handleDownload(
    certificate: LearnerCertificate,
  ) {
    setBusyCertificateId(
      certificate.id,
    );

    setError("");

    try {
      await downloadMyCertificatePdf(
        certificate,
      );
    } catch {
      setError(
        "Impossible de télécharger ou partager le certificat.",
      );
    } finally {
      setBusyCertificateId(
        null,
      );
    }
  }

  if (loading) {
    return (
      <LoadingState message="Chargement de tes certificats..." />
    );
  }

  return (
    <ScreenContainer
      style={{
      padding: 0,
      backgroundColor: "#F8F6F3",
    }}
    >
      <ScrollView
        className="flex-1 min-h-[0px]"
        contentContainerClassName="grow px-[14px] pt-[12px] pb-[18px]"
        showsVerticalScrollIndicator={
          false
        }
      >
        <View
          className="w-full max-w-[760px] self-center"
        >
          <View
            className="overflow-hidden rounded-[26px] border bg-[#FFFFFF] p-[16px]" style={[{ shadowOpacity: 0.05, shadowRadius: 12, shadowOffset: {
        width: 0,
        height: 4,
      }, elevation: 2 }, {
                borderColor:
                  theme.colors.border,
                shadowColor:
                  theme.colors.shadow,
              }]}
          >
            <View
              className="absolute w-[180px] h-[180px] rounded-[90px] right-[-80px] top-[-90px] bg-[#F3EEFF]"
            />
            <View
              className="absolute w-[76px] h-[76px] rounded-[38px] right-[28px] top-[-34px] bg-[#E2D4FF] opacity-[0.82]"
            />

            <View
              className="flex-row items-center"
            >
              <View
                className="w-[48px] h-[48px] rounded-[15px] bg-[#FAF8F5] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "medal.fill",
                    android: "workspace_premium",
                    web: "workspace_premium",
                  }}
                  tintColor="#7C3AED"
                  size={23}
                  weight="bold"
                />
              </View>

              <View
                className="ml-[10px] min-h-[28px] px-[11px] rounded-full bg-[#F3EEFF] items-center justify-center"
              >
                <Text
                  className="text-[#7C3AED] text-[11px] font-black tracking-[0.75px]"
                >
                  RÉUSSITES
                </Text>
              </View>
            </View>

            <Text
              className="mt-[14px] text-[#111827] text-[24px] leading-[29px] font-black tracking-[-0.6px]"
            >
              Mes certificats
            </Text>

            <Text
              className="mt-[5px] max-w-[92%] text-[#667085] text-[14px] leading-[20px]"
            >
              Retrouve les
              certificats délivrés
              après la réussite
              complète de tes
              formations.
            </Text>

            <View
              className="mt-[16px] overflow-hidden rounded-[20px] border border-[#E9E4EC] bg-[#FCFBFD] py-[10px] px-[5px] flex-row"
            >
              <StatItem
                label="Obtenus"
                value={
                  certificates.length
                }
                icon={{
                  ios: "medal.fill",
                  android: "workspace_premium",
                  web: "workspace_premium",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
                divider
              />

              <StatItem
                label="Révoqués"
                value={
                  certificates.filter(
                    (certificate) =>
                      certificate.status === "REVOKED",
                  ).length
                }
                icon={{
                  ios: "xmark.seal.fill",
                  android: "cancel",
                  web: "cancel",
                }}
                tint="#DC2626"
                background="#FEF2F2"
                divider
              />

              <StatItem
                label="À générer"
                value={
                  pendingCertificates.length
                }
                icon={{
                  ios: "doc.badge.plus",
                  android: "note_add",
                  web: "note_add",
                }}
                tint="#D97706"
                background="#FFF7ED"
              />
            </View>
          </View>

          <View
            className="mt-[14px] min-h-[72px] rounded-[18px] border border-[#DDD2EC] bg-[#FAF7FF] p-[11px] flex-row items-center"
          >
            <View
              className="w-[40px] h-[40px] rounded-[13px] mr-[10px] bg-[#FFFFFF] items-center justify-center"
            >
              <SymbolView
                name={{
                  ios: "shield.checkered",
                  android: "verified_user",
                  web: "verified_user",
                }}
                tintColor="#7C3AED"
                size={17}
                weight="bold"
              />
            </View>

            <View
              className="flex-1 min-w-[0px]"
            >
              <Text
                className="text-[#4C1D95] text-[13px] leading-[17px] font-black"
              >
                Certification vérifiée
              </Text>

              <Text
                className="mt-[3px] text-[#667085] text-[11px] leading-[16px]"
              >
                Le serveur vérifie
                automatiquement que la
                formation est réellement
                terminée avant de
                délivrer un certificat.
              </Text>
            </View>
          </View>

          {error ? (
            <View
              className="mt-[14px]"
            >
              <ErrorMessage
                message={error}
              />
            </View>
          ) : null}

          {success ? (
            <View
              className="mt-[14px] min-h-[70px] rounded-[18px] border border-[#BBF7D0] bg-[#ECFDF3] p-[11px] flex-row items-center"
            >
              <View
                className="w-[40px] h-[40px] rounded-[13px] mr-[10px] bg-[#FFFFFF] items-center justify-center"
              >
                <SymbolView
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "check_circle",
                    web: "check_circle",
                  }}
                  tintColor="#16A36A"
                  size={18}
                  weight="bold"
                />
              </View>

              <View
                className="flex-1 min-w-[0px]"
              >
                <Text
                  className="text-[#15803D] text-[13px] font-black"
                >
                  Certificat prêt
                </Text>

                <Text
                  className="mt-[3px] text-[#475467] text-[11px] leading-[16px]"
                >
                  {success}
                </Text>
              </View>
            </View>
          ) : null}

          <View
            className="mt-[25px]"
          >
            <SectionHeading
              title="Mes certificats"
              subtitle="Tes certificats déjà délivrés et disponibles."
              count={
                certificates.length
              }
              icon={{
                ios: "doc.text.fill",
                android: "description",
                web: "description",
              }}
              tint="#7C3AED"
              background="#F3EEFF"
            />

            {certificates.length ===
            0 ? (
              <EmptyState
                title="Aucun certificat pour le moment"
                description="Tes certificats déjà générés apparaîtront ici."
                icon={{
                  ios: "medal",
                  android: "workspace_premium",
                  web: "workspace_premium",
                }}
                tint="#7C3AED"
                background="#F3EEFF"
              />
            ) : visibleCertificates.length ===
              0 ? (
              <PageEmptyState
                label="Aucun certificat obtenu sur cette page"
              />
            ) : (
              <View
                className="gap-[11px]"
              >
                {visibleCertificates.map(
                  (
                    certificate,
                  ) => (
                    <CertificateCard
                      key={
                        certificate.id
                      }
                      certificate={
                        certificate
                      }
                      busy={
                        busyCertificateId ===
                        certificate.id
                      }
                      onDownload={() =>
                        void handleDownload(
                          certificate,
                        )
                      }
                    />
                  ),
                )}
              </View>
            )}
          </View>

          <View
            className="mt-[25px]"
          >
            <SectionHeading
              title="Certificats à générer"
              subtitle="Formations terminées dont le certificat n’a pas encore été créé."
              count={
                pendingCertificates.length
              }
              icon={{
                ios: "doc.badge.plus",
                android: "note_add",
                web: "note_add",
              }}
              tint="#D97706"
              background="#FFF7ED"
            />

            {pendingCertificates.length ===
            0 ? (
              <EmptyState
                title="Aucun certificat à générer"
                description="Tous les certificats disponibles ont déjà été générés."
                icon={{
                  ios: "checkmark.seal.fill",
                  android: "verified",
                  web: "verified",
                }}
                tint="#16A36A"
                background="#ECFDF3"
              />
            ) : visiblePendingTrainings.length ===
              0 ? (
              <PageEmptyState
                label="Aucun certificat à générer sur cette page"
              />
            ) : (
              <View
                className="gap-[11px]"
              >
                {visiblePendingTrainings.map(
                  (training) => (
                    <CompletedTrainingCard
                      key={
                        training.id
                      }
                      training={
                        training
                      }
                      issuing={
                        busyTrainingId ===
                        training.id
                      }
                      onIssue={() =>
                        void handleIssue(
                          training.id,
                        )
                      }
                    />
                  ),
                )}
              </View>
            )}
          </View>

          {paginationTotal > 0 ? (
            <View className="mt-[16px] mb-[2px]">
              <TrainerPagination
                firstVisible={firstVisible}
                lastVisible={lastVisible}
                total={paginationTotal}
                currentPage={currentPage}
                totalPages={totalPages}
                items={paginationItems}
                onChangePage={setPage}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatItem({
  label,
  value,
  icon,
  tint,
  background,
  divider = false,
}: {
  label: string;
  value: number;
  icon: SymbolName;
  tint: string;
  background: string;
  divider?: boolean;
}) {
  return (
    <View
      className="relative flex-1 min-w-[0px] min-h-[76px] px-[10px] justify-center"
    >
      <View
        className="flex-row items-center justify-between"
      >
        <View
          className="w-[34px] h-[34px] rounded-[11px] items-center justify-center" style={{
              backgroundColor:
                background,
            }}
        >
          <SymbolView
            name={icon}
            tintColor={tint}
            size={15}
            weight="bold"
          />
        </View>

        <Text
          className="text-[#111827] text-[21px] leading-[24px] font-black tracking-[-0.5px]"
        >
          {value}
        </Text>
      </View>

      <Text
        className="mt-[7px] text-[#667085] text-[11px] leading-[14px] font-extrabold"
      >
        {label}
      </Text>

      <View
        className="w-[24px] h-[3px] mt-[7px] rounded-full" style={{
            backgroundColor:
              tint,
          }}
      />

      {divider ? (
        <View
          className="absolute top-[10px] right-[0px] bottom-[10px] w-[1px] bg-[#E9E4EC]"
        />
      ) : null}
    </View>
  );
}

function SectionHeading({
  title,
  subtitle,
  count,
  icon,
  tint,
  background,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  return (
    <View
      className="mb-[12px] flex-row items-center"
    >
      <View
        className="w-[42px] h-[42px] rounded-[14px] mr-[10px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={17}
          weight="bold"
        />
      </View>

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          className="text-[#111827] text-[20px] leading-[24px] font-black"
        >
          {title}
        </Text>

        <Text
          className="mt-[2px] text-[#667085] text-[12px] leading-[17px]"
        >
          {subtitle}
        </Text>
      </View>

      <View
        className="min-w-[34px] h-[30px] px-[9px] rounded-full items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <Text
          className="text-[11px] font-black" style={{
              color: tint,
            }}
        >
          {count}
        </Text>
      </View>
    </View>
  );
}

function CertificateCard({
  certificate,
  busy,
  onDownload,
}: {
  certificate: LearnerCertificate;
  busy: boolean;
  onDownload: () => void;
}) {
  const { theme } =
    useSmartTrainingTheme();

  const status =
    certificateStatus(
      certificate,
    );

  return (
    <View
      className="overflow-hidden rounded-[22px] border bg-[#FFFFFF] p-[12px]" style={[{ shadowOpacity: 0.035, shadowRadius: 8, shadowOffset: {
        width: 0,
        height: 3,
      }, elevation: 1 }, {
          borderColor:
            theme.colors.border,
          shadowColor:
            theme.colors.shadow,
        }]}
    >
      <View
        className="flex-row items-start"
      >
        <View
          className="w-[46px] h-[46px] rounded-[15px] mr-[10px] bg-[#F3EEFF] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: "medal.fill",
              android: "workspace_premium",
              web: "workspace_premium",
            }}
            tintColor="#7C3AED"
            size={21}
            weight="bold"
          />
        </View>

        <View
          className="flex-1 min-w-[0px] pt-[1px]"
        >
          <Text
            className="text-[#7C3AED] text-[9px] leading-[11px] font-black tracking-[0.65px]"
          >
            CERTIFICAT SMARTTRAINING
          </Text>

          <Text
            numberOfLines={2}
            className="mt-[3px] text-[16px] leading-[21px] font-black" style={{
                color:
                  theme.colors.foreground,
              }}
          >
            {
              certificate.trainingTitle
            }
          </Text>
        </View>

        <View
          className="min-h-[28px] ml-[8px] px-[8px] rounded-full flex-row items-center" style={{
              backgroundColor:
                status.soft,
            }}
        >
          <View
            className="w-[6px] h-[6px] rounded-[3px] mr-[5px]" style={{
                backgroundColor:
                  status.tint,
              }}
          />

          <Text
            className="text-[10px] font-black" style={{
                color:
                  status.tint,
              }}
          >
            {status.label}
          </Text>
        </View>
      </View>

      <View
        className="h-[1px] my-[11px] bg-[#EEE9F0]"
      />

      <View
        className="flex-row gap-[7px]"
      >
        <MetaItem
          label="Délivré à"
          value={
            certificate.learnerDisplayName
          }
          icon={{
            ios: "person.fill",
            android: "person",
            web: "person",
          }}
          tint="#7C3AED"
          background="#F3EEFF"
        />

        <MetaItem
          label="Date"
          value={formatDate(
            certificate.issuedAt,
          )}
          icon={{
            ios: "calendar",
            android: "event",
            web: "event",
          }}
          tint="#2563EB"
          background="#EFF6FF"
        />
      </View>

      <View
        className="mt-[9px] min-h-[60px] rounded-[14px] border border-[#E5D9F5] bg-[#FAF7FF] p-[8px] flex-row items-center"
      >
        <View
          className="w-[38px] h-[38px] rounded-[12px] mr-[8px] bg-[#FFFFFF] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: "qrcode",
              android: "qr_code_2",
              web: "qr_code_2",
            }}
            tintColor="#7C3AED"
            size={17}
            weight="bold"
          />
        </View>

        <View
          className="flex-1 min-w-[0px]"
        >
          <Text
            className="text-[#7C3AED] text-[9px] leading-[11px] font-black tracking-[0.45px]"
          >
            CODE PUBLIC DE
            VÉRIFICATION
          </Text>

          <Text
            selectable
            numberOfLines={2}
            className="mt-[3px] text-[#344054] text-[11px] leading-[15px] font-mono font-bold"
          >
            {
              certificate.publicCode
            }
          </Text>
        </View>
      </View>

      <CertificateAction
        eyebrow="CERTIFICAT PDF"
        label={
          busy
            ? "Préparation du PDF..."
            : "Ouvrir ou partager"
        }
        icon={{
          ios: "square.and.arrow.up.fill",
          android: "ios_share",
          web: "ios_share",
        }}
        busy={busy}
        onPress={onDownload}
      />
    </View>
  );
}

function MetaItem({
  label,
  value,
  icon,
  tint,
  background,
}: {
  label: string;
  value: string;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  return (
    <View
      className="flex-1 min-w-[0px] min-h-[54px] rounded-[13px] border border-[#EEE9F0] bg-[#FBFAFC] px-[7px] flex-row items-center"
    >
      <View
        className="w-[30px] h-[30px] rounded-[10px] mr-[7px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={12}
          weight="bold"
        />
      </View>

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          className="text-[#98A2B3] text-[9px] leading-[11px] font-extrabold"
        >
          {label}
        </Text>

        <Text
          numberOfLines={2}
          className="mt-[1px] text-[#344054] text-[10px] leading-[13px] font-black"
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

function CompletedTrainingCard({
  training,
  issuing,
  onIssue,
}: {
  training: LearnerMyTraining;
  issuing: boolean;
  onIssue: () => void;
}) {
  const { theme } =
    useSmartTrainingTheme();

  return (
    <View
      className="rounded-[20px] border bg-[#FFFFFF] p-[11px]" style={[{ shadowOpacity: 0.03, shadowRadius: 7, shadowOffset: {
        width: 0,
        height: 3,
      }, elevation: 1 }, {
          borderColor:
            theme.colors.border,
          shadowColor:
            theme.colors.shadow,
        }]}
    >
      <View
        className="flex-row items-center"
      >
        <View
          className="w-[42px] h-[42px] rounded-[14px] mr-[9px] bg-[#ECFDF3] items-center justify-center"
        >
          <SymbolView
            name={{
              ios: "checkmark.seal.fill",
              android: "verified",
              web: "verified",
            }}
            tintColor="#16A36A"
            size={18}
            weight="bold"
          />
        </View>

        <View
          className="flex-1 min-w-[0px]"
        >
          <Text
            numberOfLines={2}
            className="text-[15px] leading-[20px] font-black" style={{
                color:
                  theme.colors.foreground,
              }}
          >
            {training.title}
          </Text>

          <Text
            className="mt-[3px] text-[#667085] text-[11px] leading-[15px]"
          >
            Formation terminée
            {training.completedAt
              ? ` le ${formatDate(
                  training.completedAt,
                )}`
              : ""}
          </Text>
        </View>

        <View
          className="min-h-[29px] ml-[7px] px-[8px] rounded-full justify-center bg-[#FFF7ED]"
        >
          <Text
            className="text-[9px] font-black text-[#B45309]"
          >
            À générer
          </Text>
        </View>
      </View>

      <CertificateAction
        eyebrow="CERTIFICAT"
        label={
          issuing
            ? "Génération..."
            : "Générer mon certificat"
        }
        icon={{
          ios: "doc.badge.plus",
          android: "note_add",
          web: "note_add",
        }}
        busy={issuing}
        onPress={onIssue}
      />
    </View>
  );
}

function CertificateAction({
  eyebrow,
  label,
  icon,
  busy,
  tone = "primary",
  onPress,
}: {
  eyebrow: string;
  label: string;
  icon: SymbolName;
  busy?: boolean;
  tone?: "primary" | "consult";
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        disabled: busy,
      }}
      disabled={busy}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className={`mt-[10px] min-h-[52px] rounded-[15px] border px-[7px] flex-row items-center ${(tone === "consult" ? "border-[#5B21B6] bg-[#5B21B6]" : "border-[#7C3AED] bg-[#7C3AED]")} ${(busy ? "opacity-[0.5]" : "")}`}
    >
      <View
        className="w-[36px] h-[36px] rounded-[12px] mr-[9px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
      >
        {busy ? (
          <ActivityIndicator
            size="small"
            color="#FFFFFF"
          />
        ) : (
          <SymbolView
            name={icon}
            tintColor="#FFFFFF"
            size={13}
            weight="bold"
          />
        )}
      </View>

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          numberOfLines={1}
          className="text-[rgba(255,255,255,0.78)] text-[9px] leading-[11px] font-black tracking-[0.45px]"
        >
          {eyebrow}
        </Text>

        <Text
          numberOfLines={1}
          className="mt-[2px] text-[#FFFFFF] text-[12px] leading-[16px] font-black"
        >
          {label}
        </Text>
      </View>

      <View
        className="w-[30px] h-[30px] rounded-[15px] bg-[rgba(255,255,255,0.16)] items-center justify-center"
      >
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          tintColor="#FFFFFF"
          size={11}
          weight="bold"
        />
      </View>
    </Pressable>
  );
}

function EmptyState({
  title,
  description,
  icon,
  tint,
  background,
}: {
  title: string;
  description: string;
  icon: SymbolName;
  tint: string;
  background: string;
}) {
  const { theme } =
    useSmartTrainingTheme();

  return (
    <View
      className="min-h-[94px] rounded-[19px] border bg-[#FFFFFF] p-[12px] flex-row items-center" style={{
          borderColor:
            theme.colors.border,
        }}
    >
      <View
        className="w-[44px] h-[44px] rounded-[14px] mr-[10px] items-center justify-center" style={{
            backgroundColor:
              background,
          }}
      >
        <SymbolView
          name={icon}
          tintColor={tint}
          size={18}
          weight="bold"
        />
      </View>

      <View
        className="flex-1 min-w-[0px]"
      >
        <Text
          className="text-[#111827] text-[14px] leading-[18px] font-black"
        >
          {title}
        </Text>

        <Text
          className="mt-[3px] text-[#667085] text-[12px] leading-[17px]"
        >
          {description}
        </Text>
      </View>
    </View>
  );
}


function PageEmptyState({
  label,
}: {
  label: string;
}) {
  return (
    <View className="min-h-[68px] rounded-[16px] border border-[#E7E2EB] bg-[#FFFFFF] px-[12px] flex-row items-center justify-center gap-[8px]">
      <SymbolView
        name={{
          ios: "tray",
          android: "inbox",
          web: "inbox",
        }}
        tintColor="#98A2B3"
        size={16}
        weight="bold"
      />

      <Text className="text-[#667085] text-[11px] font-extrabold">
        {label}
      </Text>
    </View>
  );
}

function TrainerPagination({
  firstVisible,
  lastVisible,
  total,
  currentPage,
  totalPages,
  items,
  onChangePage,
}: {
  firstVisible: number;
  lastVisible: number;
  total: number;
  currentPage: number;
  totalPages: number;
  items: PaginationItem[];
  onChangePage: (page: number) => void;
}) {
  const { theme } =
    useSmartTrainingTheme();

  return (
    <View
      className="rounded-[22px] border bg-[#FFFFFF] p-[12px]" style={{
          borderColor:
            theme.colors.border,
        }}
    >
      <View className="mb-[12px] flex-row items-center justify-between">
        <Text
          className="text-[13px] font-bold" style={{
              color:
                theme.colors.foregroundMuted,
            }}
        >
          {firstVisible}–{lastVisible} sur {total}
        </Text>

        <View className="rounded-full bg-[#F3EEFF] px-[10px] py-[4px]">
          <Text className="text-[#7C3AED] text-[12px] font-black">
            Page {currentPage} / {totalPages}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-[6px]">
        <PaginationArrow
          previous
          disabled={currentPage === 1}
          onPress={() =>
            onChangePage(currentPage - 1)
          }
        />

        {items.map((item, index) =>
          item === "ellipsis" ? (
            <View
              key={`ellipsis-${index}`}
              className="w-[24px] h-[36px] items-center justify-center"
            >
              <Text className="text-[#98A2B3] text-[15px] font-bold">
                …
              </Text>
            </View>
          ) : (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{
                selected:
                  item === currentPage,
              }}
              onPress={() =>
                onChangePage(item)
              }
              android_ripple={{
                color: "transparent",
              }}
              className={`w-[36px] h-[36px] rounded-[12px] border border-[#E7E2EB] bg-[#FFFFFF] items-center justify-center ${(item === currentPage ? "border-[#7C3AED] bg-[#7C3AED]" : "")}`}
            >
              <Text
                className={`text-[#667085] text-[13px] font-black ${(item === currentPage ? "text-[#FFFFFF]" : "")}`}
              >
                {item}
              </Text>
            </Pressable>
          ),
        )}

        <PaginationArrow
          disabled={
            currentPage === totalPages
          }
          onPress={() =>
            onChangePage(currentPage + 1)
          }
        />
      </View>
    </View>
  );
}

function PaginationArrow({
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
      accessibilityRole="button"
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{
        color: "transparent",
      }}
      className={`w-[36px] h-[36px] rounded-[12px] border border-[#E7E2EB] bg-[#FFFFFF] items-center justify-center ${(disabled ? "bg-[#F8F6F3] opacity-[0.45]" : "")}`}
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
            ? "#C8C2CB"
            : "#7C3AED"
        }
        size={13}
        weight="bold"
      />
    </Pressable>
  );
}
