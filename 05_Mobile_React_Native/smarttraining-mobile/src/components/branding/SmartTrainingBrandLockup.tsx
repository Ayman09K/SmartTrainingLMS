import { Image } from "expo-image";
import {
  StyleSheet,
  View,
} from "react-native";

const brandMark = require(
  "../../../assets/branding/SmartTraining_brand_mark.png",
);

const wordmark = require(
  "../../../assets/branding/SmartTraining_wordmark.png",
);

export default function SmartTrainingBrandLockup() {
  return (
    <View
      accessible
      accessibilityLabel="SmartTraining"
      style={styles.container}
    >
      <Image
        source={brandMark}
        contentFit="contain"
        style={styles.mark}
      />

      <Image
        source={wordmark}
        contentFit="contain"
        style={styles.wordmark}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
  mark: {
    height: 76,
    width: 76,
    marginBottom: 10,
  },
  wordmark: {
    height: 45,
    width: 240,
  },
});