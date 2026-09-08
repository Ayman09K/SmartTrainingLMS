import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  useSmartTrainingTheme,
} from "../../theme/provider/SmartTrainingThemeProvider";
import type {
  TrainerLearnerTrainingOption,
} from "../../types/trainerActionMobile";

type Props = {
  options: TrainerLearnerTrainingOption[];
  selected: TrainerLearnerTrainingOption | null;
  onSelect: (
    option: TrainerLearnerTrainingOption,
  ) => void;
};

export default function TrainerLearnerTrainingSelector({
  options,
  selected,
  onSelect,
}: Props) {
  const { theme } = useSmartTrainingTheme();

  if (options.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          {
            backgroundColor: theme.colors.surfaceSoft,
            borderRadius: theme.shape.cardRadius,
          },
        ]}
      >
        <Text
          style={[
            styles.emptyText,
            { color: theme.colors.foregroundMuted },
          ]}
        >
          Aucun couple apprenant / formation disponible.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const active =
          selected?.learnerId === option.learnerId &&
          selected?.trainingId === option.trainingId;

        return (
          <Pressable
            key={`${option.learnerId}-${option.trainingId}`}
            onPress={() => onSelect(option)}
            style={[
              styles.option,
              {
                backgroundColor: active
                  ? theme.colors.surfaceSoft
                  : theme.colors.surface,
                borderColor: active
                  ? theme.colors.accent
                  : theme.colors.border,
                borderRadius: theme.shape.cardRadius,
                borderWidth: active
                  ? Math.max(
                      2,
                      theme.shape.borderWidth,
                    )
                  : theme.shape.borderWidth,
                padding: theme.shape.cardPadding,
              },
            ]}
          >
            <Text
              style={[
                styles.name,
                { color: theme.colors.foreground },
              ]}
            >
              {option.learnerName}
            </Text>
            <Text
              style={[
                styles.email,
                { color: theme.colors.foregroundMuted },
              ]}
            >
              {option.learnerEmail}
            </Text>
            <Text
              style={[
                styles.training,
                { color: theme.colors.accent },
              ]}
            >
              {option.trainingTitle}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 10,
  },
  option: {},
  name: {
    fontSize: 15,
    fontWeight: "900",
  },
  email: {
    fontSize: 11,
    marginTop: 2,
  },
  training: {
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  empty: {
    padding: 16,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
  },
});