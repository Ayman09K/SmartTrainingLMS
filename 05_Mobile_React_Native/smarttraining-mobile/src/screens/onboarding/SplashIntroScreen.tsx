/* eslint-disable react-hooks/refs */
import { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  StatusBar,
  Text,
  View,
} from "react-native";

export default function SplashIntroScreen() {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 450,
        useNativeDriver: true,
      }),

      Animated.spring(scale, {
        toValue: 1,
        damping: 14,
        stiffness: 115,
        mass: 0.8,
        useNativeDriver: true,
      }),

      Animated.timing(translateY, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity, scale, translateY]);

  return (
    <View
  className="flex-1 items-center justify-center px-8"
  style={{ backgroundColor: "#F8F6F3" }}
>
     <StatusBar
  barStyle="dark-content"
  backgroundColor="#F8F6F3"
/>

      {/* Décor arrière-plan */}
      <View className="absolute -right-28 -top-20 h-80 w-80 rounded-full bg-violet-50" />

      <View className="absolute -bottom-24 -left-28 h-72 w-72 rounded-full bg-indigo-50" />

      <Animated.View
        className="items-center"
        style={{
          opacity,
          transform: [
            { scale },
            { translateY },
          ],
        }}
      >
        <View className="mb-7 h-32 w-32 items-center justify-center rounded-[36px] border border-violet-100 bg-white shadow-sm">
          <Image
            source={require("../../../assets/onboarding/SmartTraining_brand_mark.png")}
            className="h-28 w-28"
            resizeMode="contain"
            accessibilityLabel="Logo SmartTraining"
          />
        </View>

        <Text className="text-center text-[34px] font-black tracking-tight text-slate-950">
          SmartTraining
        </Text>

        <Text className="mt-2 text-center text-[15px] font-medium text-slate-500">
            Apprenez. Progressez. Réussissez.

        </Text>
      </Animated.View>

      <View className="absolute bottom-14 items-center">
        <View className="h-1.5 w-20 overflow-hidden rounded-full bg-violet-100">
          <Animated.View
            className="h-full w-14 rounded-full bg-violet-600"
            style={{
              opacity,
            }}
          />
        </View>

        <Text className="mt-3 text-xs font-semibold text-slate-400">
          Chargement...
        </Text>
      </View>
    </View>
  );
}