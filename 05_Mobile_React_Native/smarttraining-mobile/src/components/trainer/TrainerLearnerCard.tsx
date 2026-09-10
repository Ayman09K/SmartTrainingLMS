import { SymbolView } from "expo-symbols";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useSmartTrainingTheme } from "../../theme/provider/SmartTrainingThemeProvider";
import type { TrainerLearnerListItem } from "../../types/trainerLearnerMobile";

type Props = {
  item: TrainerLearnerListItem;
  onOpen: () => void;
};

function learnerName(item: TrainerLearnerListItem): string {
  const { identity } = item;

  return (
    identity.fullName ||
    [identity.firstName, identity.lastName].filter(Boolean).join(" ").trim() ||
    identity.email
  );
}

function initials(value: string): string {
  const parts = value.split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.length === 0
    ? "AP"
    : parts
        .map((part) => part.charAt(0).toLocaleUpperCase("fr"))
        .join("");
}

export default function TrainerLearnerCard({
  item,
  onOpen,
}: Props) {
  const { theme } = useSmartTrainingTheme();
  const name = learnerName(item);
  const progress = Math.max(0, Math.min(100, item.averageProgress));
  const total = item.trainingsCount;
  const completed = item.completedTrainings;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ouvrir le suivi 360 de ${name}`}
      onPress={onOpen}
      android_ripple={{ color: "transparent" }}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.identityRow}>
        {item.identity.avatarDataUrl ? (
          <Image
            source={{ uri: item.identity.avatarDataUrl }}
            style={styles.avatar}
          />
        ) : (
          <View
            style={[
              styles.avatarFallback,
              {
                backgroundColor: theme.colors.surfaceSoft,
                borderColor: "#E3D7FA",
              },
            ]}
          >
            <Text style={[styles.initials, { color: theme.colors.accent }]}>
              {initials(name)}
            </Text>
          </View>
        )}

        <View style={styles.identityCopy}>
          <Text
            numberOfLines={1}
            style={[styles.name, { color: theme.colors.foreground }]}
          >
            {name}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.email, { color: theme.colors.foregroundMuted }]}
          >
            {item.identity.email}
          </Text>
        </View>

        <View style={[styles.follow, { backgroundColor: theme.colors.surfaceSoft }]}>
          <Text style={[styles.followText, { color: theme.colors.accent }]}>
            Suivi 360
          </Text>
          <Text style={[styles.followArrow, { color: theme.colors.accent }]}>›</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric
          icon={{ ios: "book.closed.fill", android: "menu_book", web: "menu_book" }}
          value={String(total)}
          label="Formations"
          color={theme.colors.accent}
        />
        <Divider />
        <Metric
          icon={{ ios: "chart.bar.fill", android: "bar_chart", web: "bar_chart" }}
          value={`${progress}%`}
          label="Progression"
          color="#12A66A"
        />
        <Divider />
        <Metric
          icon={{
            ios: "checkmark.circle.fill",
            android: "check_circle",
            web: "check_circle",
          }}
          value={String(completed)}
          label="Terminées"
          color="#397BE8"
        />
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text
            style={[styles.progressLabel, { color: theme.colors.foregroundMuted }]}
          >
            Progression
          </Text>
          <Text style={[styles.progressValue, { color: theme.colors.accent }]}>
            {progress} %
          </Text>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progress}%`,
                backgroundColor: theme.colors.accent,
              },
            ]}
          />
        </View>

        <View style={styles.progressMeta}>
          <SymbolView
            name={{ ios: "graduationcap.fill", android: "school", web: "school" }}
            tintColor={theme.colors.accent}
            size={12}
          />
          <Text
            style={[styles.progressMetaText, { color: theme.colors.foregroundMuted }]}
          >
            {completed}/{total} formation{total > 1 ? "s" : ""} terminée
            {completed > 1 ? "s" : ""}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  function Metric({
    icon,
    value,
    label,
    color,
  }: {
    icon: React.ComponentProps<typeof SymbolView>["name"];
    value: string;
    label: string;
    color: string;
  }) {
    return (
      <View style={styles.metric}>
        <View style={styles.metricTop}>
          <SymbolView name={icon} tintColor={color} size={13} weight="bold" />
          <Text style={[styles.metricValue, { color: theme.colors.foreground }]}>
            {value}
          </Text>
        </View>
        <Text
          numberOfLines={1}
          style={[styles.metricLabel, { color: theme.colors.foregroundMuted }]}
        >
          {label}
        </Text>
      </View>
    );
  }

  function Divider() {
    return <View style={styles.divider} />;
  }
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 22,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 11,
  },
  avatar: { width: 50, height: 50, borderRadius: 17 },
  avatarFallback: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 15, fontWeight: "900" },
  identityCopy: { flex: 1, minWidth: 0, marginLeft: 11 },
  name: { fontSize: 15, lineHeight: 19, fontWeight: "900" },
  email: { fontSize: 9, marginTop: 3 },

  follow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginLeft: 7,
  },
  followText: { fontSize: 9, fontWeight: "900" },
  followArrow: { fontSize: 12, fontWeight: "900", marginLeft: 3 },

  metrics: {
    marginHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 17,
    backgroundColor: "#F8F6F3",
    paddingHorizontal: 8,
    paddingVertical: 11,
  },
  metric: { flex: 1, minWidth: 0, alignItems: "center" },
  metricTop: { flexDirection: "row", alignItems: "center" },
  metricValue: { fontSize: 13, fontWeight: "900", marginLeft: 5 },
  metricLabel: { fontSize: 8, fontWeight: "700", marginTop: 3 },
  divider: { width: 1, height: 30, backgroundColor: "#E4DEE8" },

  progressSection: { paddingHorizontal: 14, paddingTop: 11, paddingBottom: 14 },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  progressLabel: { fontSize: 9, fontWeight: "700" },
  progressValue: { fontSize: 10, fontWeight: "900" },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    borderRadius: 999,
    backgroundColor: "#ECE8F0",
  },
  progressFill: { height: "100%", borderRadius: 999 },
  progressMeta: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  progressMetaText: { fontSize: 9, marginLeft: 6 },
});
