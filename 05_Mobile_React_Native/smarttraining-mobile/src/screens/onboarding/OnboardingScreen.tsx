import { useRef, useState } from "react";
import {
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  StatusBar,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  completeOnboarding,
} from "../../storage/onboardingStorage";

type OnboardingSlide = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: number;
};

type OnboardingScreenProps = {
  onFinished: () => void;
};

const BACKGROUND_COLOR = "#F8F6F3";

const slides: OnboardingSlide[] = [
  {
    id: "learn",
    eyebrow: "APPRENDRE",
    title: "Apprenez à votre rythme",
    description:
      "Accédez à vos formations où que vous soyez et avancez à votre rythme.",
    image: require("../../../assets/onboarding/role-apprenant.png"),
  },
  {
    id: "progress",
    eyebrow: "PROGRESSER",
    title: "Suivez vos progrès",
    description:
      "Visualisez votre évolution et atteignez vos objectifs plus facilement.",
    image: require("../../../assets/onboarding/role-admin.png"),
  },
  {
    id: "collaboration",
    eyebrow: "COLLABORER",
    title: "Avancez ensemble",
    description:
      "Échangez avec vos formateurs et apprenants dans un environnement collaboratif.",
    image: require("../../../assets/onboarding/collaboration.png"),
  },
];

export default function OnboardingScreen({
  onFinished,
}: OnboardingScreenProps) {
  const { width, height } = useWindowDimensions();

  const listRef =
    useRef<FlatList<OnboardingSlide>>(null);

  const [slideIndex, setSlideIndex] =
    useState(0);

  const [finishing, setFinishing] =
    useState(false);

  const pageWidth = width;

  /*
   * Taille responsive.
   * Aucun fond/cadre n'est ajouté autour du PNG.
   */
  const illustrationWidth = Math.min(
    width - 44,
    400,
  );

  const illustrationHeight = Math.min(
    height * 0.42,
    360,
  );

  function goToSlide(index: number) {
    listRef.current?.scrollToIndex({
      index,
      animated: true,
    });

    setSlideIndex(index);
  }

  async function finish() {
    if (finishing) {
      return;
    }

    try {
      setFinishing(true);

      await completeOnboarding();

      onFinished();
    } finally {
      setFinishing(false);
    }
  }

  function handleNext() {
    if (slideIndex < slides.length - 1) {
      goToSlide(slideIndex + 1);
      return;
    }

    void finish();
  }

  function renderSlide({
    item,
  }: ListRenderItemInfo<OnboardingSlide>) {
    return (
      <View
        style={{
          width: pageWidth,
        }}
        className="flex-1 items-center px-6"
      >
        <View className="w-full flex-1 items-center justify-center">
          {/*
           * IMAGE
           *
           * IMPORTANT :
           * aucun bg-violet
           * aucun border
           * aucun rounded container
           * aucun shadow
           *
           * On affiche directement le PNG.
           */}
          <View
            style={{
              width: illustrationWidth,
              height: illustrationHeight,
            }}
            className="items-center justify-center"
          >
            <Image
              source={item.image}
              style={{
                width: illustrationWidth,
                height: illustrationHeight,
              }}
              resizeMode="contain"
              accessibilityLabel={item.title}
            />
          </View>

          {/*
           * CONTENU TEXTE
           */}
          <View className="mt-5 items-center px-4">
            <View className="mb-3 rounded-full bg-white px-3 py-1.5">
              <Text className="text-[11px] font-black tracking-[1.5px] text-violet-600">
                {item.eyebrow}
              </Text>
            </View>

            <Text className="text-center text-[28px] font-black tracking-tight text-slate-950">
              {item.title}
            </Text>

            <Text className="mt-3 max-w-[340px] text-center text-[15px] font-medium leading-6 text-slate-500">
              {item.description}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: BACKGROUND_COLOR,
      }}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={BACKGROUND_COLOR}
      />

      {/*
       * PASSER
       */}
      <View className="h-14 flex-row items-center justify-end px-6">
        <Pressable
          onPress={() => void finish()}
          disabled={finishing}
          accessibilityRole="button"
          accessibilityLabel="Passer l’onboarding"
          className="rounded-full px-3 py-2 active:bg-white/70"
        >
          <Text className="text-sm font-bold text-slate-500">
            Passer
          </Text>
        </Pressable>
      </View>

      {/*
       * SLIDES
       */}
      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(item) => item.id}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const offset =
            event.nativeEvent.contentOffset.x;

          const nextIndex = Math.round(
            offset / pageWidth,
          );

          setSlideIndex(
            Math.max(
              0,
              Math.min(
                nextIndex,
                slides.length - 1,
              ),
            ),
          );
        }}
        getItemLayout={(_, index) => ({
          length: pageWidth,
          offset: pageWidth * index,
          index,
        })}
      />

      {/*
       * PAGINATION + BOUTONS
       */}
      <View className="px-6 pb-4 pt-2">
        <View className="mb-6 flex-row items-center justify-center gap-2">
          {slides.map((slide, index) => (
            <View
              key={slide.id}
              className={
                index === slideIndex
                  ? "h-2 w-6 rounded-full bg-violet-600"
                  : "h-2 w-2 rounded-full bg-violet-200"
              }
            />
          ))}
        </View>

        <View className="flex-row items-center gap-3">
          {slideIndex > 0 ? (
            <Pressable
              onPress={() =>
                goToSlide(slideIndex - 1)
              }
              accessibilityRole="button"
              accessibilityLabel="Précédent"
              className="h-14 flex-1 flex-row items-center justify-center rounded-[18px] border border-slate-200 bg-white active:bg-slate-50"
            >
              <Text className="mr-2 text-xl font-semibold text-slate-500">
                ‹
              </Text>

              <Text className="text-[15px] font-black text-slate-700">
                Précédent
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={handleNext}
            disabled={finishing}
            accessibilityRole="button"
            accessibilityLabel={
              slideIndex === slides.length - 1
                ? "Commencer"
                : "Suivant"
            }
            className="h-14 flex-[1.15] flex-row items-center justify-center rounded-[18px] bg-violet-600 px-5 shadow-sm active:bg-violet-700"
          >
            <Text className="text-[15px] font-black text-white">
              {slideIndex ===
              slides.length - 1
                ? "Commencer"
                : "Suivant"}
            </Text>

            <Text className="ml-2 text-xl font-semibold text-white">
              ›
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}