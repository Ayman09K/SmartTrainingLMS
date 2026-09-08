import { Image } from "expo-image";

const brandMark = require(
  "../../../assets/branding/SmartTraining_brand_mark.png",
);

type Props = {
  size?: number;
};

export default function SmartTrainingBrandMark({
  size = 56,
}: Props) {
  return (
    <Image
      source={brandMark}
      contentFit="contain"
      accessible
      accessibilityLabel="SmartTraining"
      style={{
        height: size,
        width: size,
      }}
    />
  );
}