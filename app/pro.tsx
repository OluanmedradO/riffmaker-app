import { useTheme } from "@/components/ThemeProvider";
import { useTranslation } from "@/src/i18n";
import { getRiffs } from "@/src/storage/riffs";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Check, Crown, Export, Minus, Playlist, Repeat, X } from "phosphor-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Intl.NumberFormat — disponível no Hermes, sem dependência externa
const currencyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatBRL(value: number) {
  return currencyFmt.format(value);
}

// Arredondamento explícito para evitar floats estranhos em exibição mensal
function monthlyEquivalent(annual: number): number {
  return Math.floor((annual / 12) * 100) / 100;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const FEATURE_MESSAGES: Record<string, string> = {
  compare: "pro.feature.compare",
  loop: "pro.feature.loop",
  export: "pro.feature.export",
  projects: "pro.feature.projects",
};

function resolveHeroMessage(t: any, message?: string): string {
  if (!message) return t("pro.hero.default");
  const key = FEATURE_MESSAGES[message];
  return key ? t(key as any) : message;
}

// ─────────────────────────────────────────────────────────────────────────────
// Animated Waveform Bar
// ─────────────────────────────────────────────────────────────────────────────
const WaveformBar = React.memo(function WaveformBar({
  index,
  color,
  enabled,
}: {
  index: number;
  color: string;
  enabled: boolean;
}) {
  const height = useSharedValue(10);

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(height);
      height.value = withTiming(10, { duration: 180 });
      return;
    }

    const baseHeight = [28, 40, 20, 48, 32, 24, 36][index % 7];

    height.value = withDelay(
      index * 90,
      withRepeat(
        withSequence(
          withTiming(baseHeight, { duration: 620, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: 620, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(height);
      height.value = withTiming(10, { duration: 160 });
    };
  }, [enabled, index, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 4,
          borderRadius: 2,
          backgroundColor: color,
          marginHorizontal: 3,
          opacity: enabled ? 1 : 0.65,
        },
        animatedStyle,
      ]}
    />
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Hero Section
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection({
  theme,
  t,
  message,
  animEnabled,
  dominantType,
}: {
  theme: ReturnType<typeof useTheme>;
  t: any;
  message?: string;
  animEnabled: boolean;
  dominantType?: string;
}) {
  // Emoji personalizado pelo instrumento mais gravado
  const typeEmoji: Record<string, string> = {
    Guitar: "🎸",
    Beat: "🥁",
    Vocal: "🎤",
    Melody: "🎵",
    Bass: "🎸",
    Other: "🎼",
  };
  const emoji = dominantType ? (typeEmoji[dominantType] ?? "🎸") : "🎸";

  const purple = theme.proPurple ?? "#7C3AED";
  const badgeBg = (theme.background ?? "#000") + "22";

  return (
    <Animated.View
      entering={FadeInDown.duration(520).delay(80)}
      style={[
        styles.heroCard,
        {
          backgroundColor: theme.proSurface ?? theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={[styles.heroGlow, { backgroundColor: purple, opacity: 0.24, top: -24 }]} />

      <View style={[styles.heroBadge, { borderColor: purple + "55", backgroundColor: badgeBg }]}>
        <Crown size={14} color={purple} weight="fill" />
        <Text style={[styles.heroBadgeText, { color: purple }]}>PRO</Text>
      </View>

      <View style={styles.waveformContainer} accessibilityLabel="Animação de waveform">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <WaveformBar key={i} index={i} color={purple} enabled={animEnabled} />
        ))}
      </View>

      <Text style={styles.heroEmoji}>{emoji}</Text>

      <Text style={[styles.heroTitle, { color: theme.foreground }]} numberOfLines={3} maxFontSizeMultiplier={1.15}>
        {resolveHeroMessage(t, message)}
      </Text>

      <Text
        style={[styles.heroDescription, { color: theme.mutedForeground }]}
        numberOfLines={3}
        maxFontSizeMultiplier={1.2}
      >
        {t("pro.hero.desc")}
      </Text>

      <View style={styles.trustRow}>
        {[
          t("pro.trust.store", { store: Platform.OS === "android" ? "Google Play" : "App Store" }),
          t("pro.trust.cancel"),
          t("pro.trust.no_ads"),
        ].map((label) => (
          <View key={label} style={[styles.trustPill, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.trustText, { color: theme.mutedForeground }]}>{label}</Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Card
// ─────────────────────────────────────────────────────────────────────────────
function FeatureCard({
  theme,
  icon,
  title,
  items,
  delay,
}: {
  theme: ReturnType<typeof useTheme>;
  icon: React.ReactNode;
  title: string;
  items: string[];
  delay: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(delay)}
      style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.featureHeader}>
        {icon}
        <Text style={[styles.featureTitle, { color: theme.foreground }]}>{title}</Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.featureItem}>
          <Check size={16} color={theme.proPurple ?? "#7C3AED"} weight="bold" />
          <Text style={[styles.featureItemText, { color: theme.mutedForeground }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {item}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

function FeaturesSection({ theme, t }: { theme: ReturnType<typeof useTheme>; t: any }) {
  const purple = theme.proPurple ?? "#7C3AED";
  return (
    <View style={styles.featuresContainer}>
      <FeatureCard
        theme={theme}
        icon={<Playlist size={22} color={purple} weight="duotone" />}
        title={t("pro.feat.org.title")}
        items={[
          t("pro.feat.org.item1"),
          t("pro.feat.org.item2"),
          t("pro.feat.org.item3"),
          t("pro.feat.org.item4"),
        ]}
        delay={260}
      />
      <FeatureCard
        theme={theme}
        icon={<Repeat size={22} color={purple} weight="duotone" />}
        title={t("pro.feat.tools.title")}
        items={[
          t("pro.feat.tools.item1"),
          t("pro.feat.tools.item2"),
          t("pro.feat.tools.item3"),
        ]}
        delay={380}
      />
      <FeatureCard
        theme={theme}
        icon={<Export size={22} color={purple} weight="duotone" />}
        title={t("pro.feat.export.title")}
        items={[
          t("pro.feat.export.item1"),
          t("pro.feat.export.item2"),
          t("pro.feat.export.item3"),
        ]}
        delay={500}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison Table
// ─────────────────────────────────────────────────────────────────────────────
function ComparisonTable({ theme, t }: { theme: ReturnType<typeof useTheme>; t: any }) {
  const COMPARISON_ROWS = [
    { feature: t("pro.comp.row1"), free: true, pro: true },
    { feature: t("pro.comp.row2"), free: true, pro: true },
    { feature: t("pro.comp.row3"), free: true, pro: true },
    { feature: t("pro.comp.row4"), free: false, pro: true },
    { feature: t("pro.comp.row5"), free: false, pro: true },
    { feature: t("pro.comp.row6"), free: false, pro: true },
    { feature: t("pro.comp.row7"), free: false, pro: true },
  ];

  const purple = theme.proPurple ?? "#7C3AED";
  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(640)}
      style={[styles.comparisonContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.comparisonRow}>
        <Text style={[styles.comparisonHeaderCell, { color: theme.mutedForeground, flex: 2 }]}>{t("pro.comp.resource")}</Text>
        <Text style={[styles.comparisonHeaderCell, { color: theme.mutedForeground }]}>{t("pro.comp.free")}</Text>
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={[styles.recommendedBadge, { backgroundColor: purple }]}>
            <Text style={styles.recommendedBadgeText}>{t("pro.comp.most_popular")}</Text>
          </View>
          <Text style={[styles.comparisonHeaderCell, { color: purple }]}>{t("pro.comp.pro")}</Text>
        </View>
      </View>

      <View style={[styles.comparisonDivider, { backgroundColor: theme.border }]} />

      {COMPARISON_ROWS.map((row, idx) => {
        const isProOnly = !row.free && row.pro;
        return (
          <View
            key={row.feature}
            style={[
              styles.comparisonRow,
              idx < COMPARISON_ROWS.length - 1 && {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.borderSubtle ?? theme.border,
              },
              isProOnly && {
                backgroundColor: purple + "0B",
                marginHorizontal: -18,
                paddingHorizontal: 18,
                borderRadius: 10,
              },
            ]}
          >
            <Text style={[styles.comparisonFeatureCell, { color: theme.foreground }]} numberOfLines={1} maxFontSizeMultiplier={1.15}>
              {row.feature}
            </Text>
            <View style={styles.comparisonValueCell}>
              {row.free ? <Check size={18} color={theme.mutedForeground} weight="bold" /> : <Minus size={18} color={theme.border} weight="bold" />}
            </View>
            <View style={styles.comparisonValueCell}>
              {row.pro ? <Check size={18} color={purple} weight="bold" /> : <Minus size={18} color={theme.border} weight="bold" />}
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Section
// ─────────────────────────────────────────────────────────────────────────────
type Plan = "monthly" | "annual";

const ANNUAL_PRICE = 119.9;
const MONTHLY_PRICE = 14.9;

function PricingSection({
  theme,
  t,
  selectedPlan,
  onChange,
}: {
  theme: ReturnType<typeof useTheme>;
  t: any;
  selectedPlan: Plan;
  onChange: (p: Plan) => void;
}) {
  const purple = theme.proPurple ?? "#7C3AED";

  const annualMonthlyEquivalent = useMemo(() => monthlyEquivalent(ANNUAL_PRICE), []);
  const monthlyTotalYear = useMemo(() => MONTHLY_PRICE * 12, []);
  const savings = useMemo(() => clamp(monthlyTotalYear - ANNUAL_PRICE, 0, 9999), [monthlyTotalYear]);
  const savingsPct = useMemo(() => clamp((savings / monthlyTotalYear) * 100, 0, 95), [savings, monthlyTotalYear]);

  return (
    <Animated.View entering={FadeInDown.duration(420).delay(760)} style={styles.pricingContainer}>
      <Pressable
        onPress={() => onChange("annual")}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedPlan === "annual" }}
        accessibilityLabel="Selecionar plano anual"
        style={[
          styles.pricingCard,
          selectedPlan === "annual" && styles.pricingCardSelected,
          {
            backgroundColor: selectedPlan === "annual" ? purple + "16" : theme.card,
            borderColor: selectedPlan === "annual" ? purple : theme.border,
            borderWidth: selectedPlan === "annual" ? 2 : 1,
            paddingVertical: selectedPlan === "annual" ? 22 : 18,
          },
        ]}
      >
        <View style={[styles.pricingBadge, { backgroundColor: purple }]}>
          <Text style={styles.pricingBadgeText}>{t("pro.plan.badge")}</Text>
        </View>
        <Text style={[styles.pricingPlanName, { color: theme.foreground }]}>{t("pro.plan.annual")}</Text>
        <View style={styles.pricingRow}>
          <Text style={[styles.pricingAmount, { color: theme.foreground }]}>{formatBRL(ANNUAL_PRICE)}</Text>
          <Text style={[styles.pricingPeriod, { color: theme.mutedForeground }]}>{t("pro.plan.year")}</Text>
        </View>
        <Text style={[styles.pricingMonthly, { color: theme.mutedForeground }]}>{t("pro.plan.annual_equiv", { price: formatBRL(annualMonthlyEquivalent) })}</Text>
        <View style={[styles.savingsPill, { borderColor: purple + "55" }]}>
          <Text style={[styles.savingsText, { color: purple }]}>
            {t("pro.plan.savings", { amount: formatBRL(savings), percent: Math.round(savingsPct).toString() })}
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onChange("monthly")}
        accessibilityRole="button"
        accessibilityState={{ selected: selectedPlan === "monthly" }}
        accessibilityLabel="Selecionar plano mensal"
        style={[
          styles.pricingCard,
          {
            backgroundColor: selectedPlan === "monthly" ? purple + "16" : theme.card,
            borderColor: selectedPlan === "monthly" ? purple : theme.border,
            borderWidth: selectedPlan === "monthly" ? 2 : 1,
            paddingVertical: selectedPlan === "monthly" ? 22 : 18,
          },
        ]}
      >
        <Text style={[styles.pricingPlanName, { color: theme.foreground, marginTop: 12 }]}>{t("pro.plan.monthly")}</Text>
        <View style={styles.pricingRow}>
          <Text style={[styles.pricingAmount, { color: theme.foreground }]}>{formatBRL(MONTHLY_PRICE)}</Text>
          <Text style={[styles.pricingPeriod, { color: theme.mutedForeground }]}>{t("pro.plan.month")}</Text>
        </View>
        <Text style={[styles.pricingMonthly, { color: theme.mutedForeground }]} numberOfLines={2}>
          {t("pro.plan.trial")}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Social Proof
// ─────────────────────────────────────────────────────────────────────────────
function SocialProof({ theme, t, riffCount }: { theme: ReturnType<typeof useTheme>; t: any; riffCount: number }) {
  if (riffCount < 1) return null;

  const headline = riffCount === 1 ? t("pro.proof.single") : t("pro.proof.plural", { count: riffCount.toString() });

  return (
    <Animated.View
      entering={FadeInDown.duration(420).delay(880)}
      style={[styles.socialProof, { backgroundColor: (theme.proPurple ?? "#7C3AED") + "12" }]}
    >
      <Crown size={20} color={theme.proPurple ?? "#7C3AED"} weight="fill" />
      <Text style={[styles.socialProofText, { color: theme.mutedForeground }]} maxFontSizeMultiplier={1.15}>
        <Text style={{ color: theme.foreground, fontWeight: "900" }}>{headline}</Text>
        {t("pro.proof.desc")}
      </Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky CTA
// ─────────────────────────────────────────────────────────────────────────────
function StickyCTA({
  theme,
  t,
  plan,
  animEnabled,
  isPurchasing,
  onSubscribe,
}: {
  theme: ReturnType<typeof useTheme>;
  t: any;
  plan: Plan;
  animEnabled: boolean;
  isPurchasing: boolean;
  onSubscribe: () => void;
}) {
  const purple = theme.proPurple ?? "#7C3AED";
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animEnabled || isPurchasing) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 0 });
      return;
    }

    scale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );

    return () => cancelAnimation(scale);
  }, [animEnabled, isPurchasing, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: isPurchasing ? 0.85 : 1,
  }));

  const priceLabel = plan === "annual" ? `${formatBRL(ANNUAL_PRICE)}/ano` : `${formatBRL(MONTHLY_PRICE)}/mês`;
  const planLabel = plan === "annual" ? "Plano anual" : "Plano mensal";

  return (
    <View style={[styles.stickyWrap, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
      <View style={[styles.stickyFade, { backgroundColor: theme.background }]} />

      <View style={styles.stickyInner}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stickyTitle, { color: theme.foreground }]} numberOfLines={1}>
            {t("pro.cta.title")}
          </Text>
          <Text style={[styles.stickySubtitle, { color: theme.mutedForeground }]} numberOfLines={1}>
            {plan === "annual" ? t("pro.cta.subtitle_annual") : t("pro.cta.subtitle_monthly")}
          </Text>
        </View>

        <Pressable
          onPress={onSubscribe}
          disabled={isPurchasing}
          accessibilityRole="button"
          accessibilityLabel={`Ativar PRO por ${priceLabel}`}
          accessibilityState={{ disabled: isPurchasing }}
          style={({ pressed }) => [styles.ctaPressable, { opacity: pressed ? 0.92 : 1 }]}
        >
          <Animated.View style={[styles.ctaButton, { backgroundColor: purple }, animatedStyle]}>
            <Crown size={18} color="#fff" weight="fill" style={{ marginRight: 6 }} />
            <Text style={styles.ctaButtonText}>{isPurchasing ? t("pro.cta.button_processing") : t("pro.cta.button", { price: priceLabel })}</Text>
          </Animated.View>
        </Pressable>
      </View>

      <Text style={[styles.ctaFineprint, { color: theme.mutedForeground }]}>
        {Platform.OS === "android"
          ? t("pro.cta.fineprint_android")
          : t("pro.cta.fineprint_ios")}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ProScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { message } = useLocalSearchParams<{ message?: string }>();

  const [riffCount, setRiffCount] = useState(0);
  const [dominantType, setDominantType] = useState<string | undefined>();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("annual");
  const [isPurchasing, setIsPurchasing] = useState(false);

  const [reduceMotion, setReduceMotion] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [isScrolling, setIsScrolling] = useState(false);

  const animEnabled = useMemo(() => isFocused && !isScrolling && !reduceMotion, [isFocused, isScrolling, reduceMotion]);

  // Reduce motion
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => mounted && setReduceMotion(!!v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v) => setReduceMotion(!!v));
    return () => {
      mounted = false;
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  // Focus + refresh data
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      let alive = true;

      getRiffs()
        .then((riffs) => {
          if (!alive) return;

          setRiffCount(riffs.length);

          if (riffs.length > 0) {
            const typeCounts: Record<string, number> = {};
            for (const riff of riffs) {
              if (riff.type) typeCounts[riff.type] = (typeCounts[riff.type] ?? 0) + 1;
            }
            const top = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];
            setDominantType(top?.[0]);
          } else {
            setDominantType(undefined);
          }
        })
        .catch(() => {});

      return () => {
        alive = false;
        setIsFocused(false);
      };
    }, [])
  );

  const handleSubscribe = useCallback(async () => {
    if (isPurchasing) return;
    setIsPurchasing(true);
    try {
      // TODO: integrar IAP real (RevenueCat / expo-in-app-purchases / react-native-iap)
      await new Promise((r) => setTimeout(r, 700));
      router.back();
    } catch {
      // TODO: toast de erro
    } finally {
      setIsPurchasing(false);
    }
  }, [isPurchasing, router]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <Animated.View entering={FadeInDown.duration(360)} style={styles.header}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={[styles.headerTitle, { color: theme.foreground }]} numberOfLines={1}>
            {t("pro.header.title")} <Text style={{ color: theme.proPurple ?? "#7C3AED" }}>PRO</Text>
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.mutedForeground }]} numberOfLines={2} maxFontSizeMultiplier={1.15}>
            {t("pro.header.subtitle")}
          </Text>
        </View>

        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          style={[styles.closeButton, { backgroundColor: theme.secondary }]}
        >
          <X size={18} color={theme.mutedForeground} weight="bold" />
        </Pressable>
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        overScrollMode="never"
        onScrollBeginDrag={() => setIsScrolling(true)}
        onScrollEndDrag={() => setIsScrolling(false)}
        onMomentumScrollBegin={() => setIsScrolling(true)}
        onMomentumScrollEnd={() => setIsScrolling(false)}
        scrollEventThrottle={16}
      >
        <HeroSection theme={theme} t={t} message={message} animEnabled={animEnabled} dominantType={dominantType} />
        <FeaturesSection theme={theme} t={t} />
        <ComparisonTable theme={theme} t={t} />
        <PricingSection theme={theme} t={t} selectedPlan={selectedPlan} onChange={setSelectedPlan} />
        <SocialProof theme={theme} t={t} riffCount={riffCount} />
        <View style={{ height: 24 }} />
      </ScrollView>

      <StickyCTA
        theme={theme}
        t={t}
        plan={selectedPlan}
        animEnabled={animEnabled}
        isPurchasing={isPurchasing}
        onSubscribe={handleSubscribe}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },

  // Hero
  heroCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    left: -40,
    right: -40,
    height: 150,
    borderRadius: 110,
  },
  heroBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    marginBottom: 12,
    marginTop: 10,
  },
  heroEmoji: {
    fontSize: 34,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  heroDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  trustRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  trustPill: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  trustText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Features
  featuresContainer: {
    gap: 12,
    marginBottom: 20,
  },
  featureCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  featureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 5,
  },
  featureItemText: {
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
    flex: 1,
  },

  // Comparison
  comparisonContainer: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  comparisonHeaderCell: {
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  comparisonDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  comparisonFeatureCell: {
    flex: 2,
    fontSize: 14,
  },
  comparisonValueCell: {
    flex: 1,
    alignItems: "center",
  },
  recommendedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 4,
  },
  recommendedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  // Pricing
  pricingContainer: {
    gap: 12,
    marginBottom: 16,
  },
  pricingCard: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    overflow: "hidden",
  },
  pricingCardSelected: {
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  pricingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  pricingBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "900",
  },
  pricingPlanName: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  pricingAmount: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
  },
  pricingPeriod: {
    fontSize: 14,
  },
  pricingMonthly: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
    width: "100%",
    flexShrink: 1,
    paddingHorizontal: 6,
  },
  savingsPill: {
    marginTop: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  savingsText: {
    fontSize: 12,
    fontWeight: "900",
  },

  // Social proof
  socialProof: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginTop: 6,
  },
  socialProofText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },

  // Sticky CTA
  stickyWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 22 : 14,
  },
  stickyFade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -22,
    height: 22,
    opacity: 0.96,
  },
  stickyInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
  },
  stickyTitle: {
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  stickySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  ctaPressable: {
    alignItems: "stretch",
    justifyContent: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    minWidth: Math.min(200, SCREEN_WIDTH - 180),
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  ctaFineprint: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 8,
    opacity: 0.9,
  },
});