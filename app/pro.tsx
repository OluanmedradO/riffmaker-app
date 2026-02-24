import { useTheme } from "@/components/ThemeProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  Check,
  Crown,
  Export,
  Minus,
  Playlist,
  Repeat,
  X
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
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

// ─── Animated Waveform Bar ─────────────────────────────────────────────────
function WaveformBar({ index, color }: { index: number; color: string }) {
  const height = useSharedValue(12);

  useEffect(() => {
    const baseHeight = [28, 40, 20, 48, 32, 24, 36][index % 7];
    height.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(baseHeight, { duration: 600, easing: Easing.inOut(Easing.sin) }),
          withTiming(10, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        true,
      ),
    );
  }, [height, index]);

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
        },
        animatedStyle,
      ]}
    />
  );
}

// ─── Hero Section ──────────────────────────────────────────────────────────
function HeroSection({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(600).delay(100)}
      style={[styles.heroCard, { backgroundColor: theme.proSurface }]}
    >
      {/* Glow overlay */}
      <View
        style={[
          styles.heroGlow,
          { backgroundColor: theme.proGlow },
        ]}
      />

      {/* Waveform animation */}
      <View style={styles.waveformContainer}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <WaveformBar key={i} index={i} color={theme.proPurple} />
        ))}
      </View>

      <Text style={[styles.heroEmoji]}>🎸</Text>
      <Text style={[styles.heroTitle, { color: theme.foreground }]}>
        Desbloqueie seus superpoderes criativos
      </Text>
      <Text style={[styles.heroDescription, { color: theme.mutedForeground }]}>
        Loop avançado • Combinação inteligente{"\n"}
        Exportações profissionais • Organização avançada
      </Text>
    </Animated.View>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────────────
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
      entering={FadeInDown.duration(500).delay(delay)}
      style={[styles.featureCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.featureHeader}>
        {icon}
        <Text style={[styles.featureTitle, { color: theme.foreground }]}>
          {title}
        </Text>
      </View>
      {items.map((item) => (
        <View key={item} style={styles.featureItem}>
          <Check size={16} color={theme.proPurple} weight="bold" />
          <Text style={[styles.featureItemText, { color: theme.mutedForeground }]}>
            {item}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Features Section ──────────────────────────────────────────────────────
function FeaturesSection({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.featuresContainer}>
      <FeatureCard
        theme={theme}
        icon={<Playlist size={22} color={theme.proPurple} weight="duotone" />}
        title="Organização Inteligente"
        items={[
          "Compatibilidade automática de riffs",
          "Sugestões de combinação",
          "Estatísticas criativas",
          "Tags ilimitadas",
        ]}
        delay={300}
      />
      <FeatureCard
        theme={theme}
        icon={<Repeat size={22} color={theme.proPurple} weight="duotone" />}
        title="Ferramentas Avançadas"
        items={[
          "Loop com marcação precisa",
          "Controle de velocidade",
          "Reprocessamento inteligente",
        ]}
        delay={450}
      />
      <FeatureCard
        theme={theme}
        icon={<Export size={22} color={theme.proPurple} weight="duotone" />}
        title="Exportações Profissionais"
        items={[
          "Exportar projeto completo",
          "Metadados automáticos",
          "Backup avançado",
        ]}
        delay={600}
      />
    </View>
  );
}

// ─── Comparison Table ──────────────────────────────────────────────────────
const COMPARISON_ROWS = [
  { feature: "Gravar ideias", free: true, pro: true },
  { feature: "BPM inteligente", free: true, pro: true },
  { feature: "Loop avançado", free: false, pro: true },
  { feature: "Combinar riffs", free: false, pro: true },
  { feature: "Estatísticas", free: false, pro: true },
  { feature: "Export completo", free: false, pro: true },
];

function ComparisonTable({ theme }: { theme: ReturnType<typeof useTheme> }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(700)}
      style={[styles.comparisonContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      {/* Header row */}
      <View style={styles.comparisonRow}>
        <Text style={[styles.comparisonHeaderCell, { color: theme.mutedForeground, flex: 2 }]}>
          Recurso
        </Text>
        <Text style={[styles.comparisonHeaderCell, { color: theme.mutedForeground }]}>
          Free
        </Text>
        <Text style={[styles.comparisonHeaderCell, { color: theme.proPurple }]}>
          PRO
        </Text>
      </View>

      <View style={[styles.comparisonDivider, { backgroundColor: theme.border }]} />

      {COMPARISON_ROWS.map((row, idx) => (
        <View
          key={row.feature}
          style={[
            styles.comparisonRow,
            idx < COMPARISON_ROWS.length - 1 && {
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.borderSubtle,
            },
          ]}
        >
          <Text
            style={[styles.comparisonFeatureCell, { color: theme.foreground }]}
            numberOfLines={1}
          >
            {row.feature}
          </Text>
          <View style={styles.comparisonValueCell}>
            {row.free ? (
              <Check size={18} color={theme.mutedForeground} weight="bold" />
            ) : (
              <Minus size={18} color={theme.border} weight="bold" />
            )}
          </View>
          <View style={styles.comparisonValueCell}>
            {row.pro ? (
              <Check size={18} color={theme.proPurple} weight="bold" />
            ) : (
              <Minus size={18} color={theme.border} weight="bold" />
            )}
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

// ─── Pricing Section ───────────────────────────────────────────────────────
function PricingSection({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(800)}
      style={styles.pricingContainer}
    >
      {/* Annual — Highlighted */}
      <Pressable
        onPress={() => setSelectedPlan("annual")}
        style={[
          styles.pricingCard,
          {
            backgroundColor: selectedPlan === "annual" ? theme.proPurple + "18" : theme.card,
            borderColor: selectedPlan === "annual" ? theme.proPurple : theme.border,
            borderWidth: selectedPlan === "annual" ? 1.5 : 1,
          },
        ]}
      >
        {/* Badge */}
        <View style={[styles.pricingBadge, { backgroundColor: theme.proPurple }]}>
          <Text style={styles.pricingBadgeText}>2 meses grátis</Text>
        </View>
        <Text style={[styles.pricingPlanName, { color: theme.foreground }]}>
          Anual
        </Text>
        <View style={styles.pricingRow}>
          <Text style={[styles.pricingAmount, { color: theme.foreground }]}>
            R$ 119,90
          </Text>
          <Text style={[styles.pricingPeriod, { color: theme.mutedForeground }]}>
            / ano
          </Text>
        </View>
        <Text style={[styles.pricingMonthly, { color: theme.mutedForeground }]}>
          ≈ R$ 9,99/mês
        </Text>
      </Pressable>

      {/* Monthly */}
      <Pressable
        onPress={() => setSelectedPlan("monthly")}
        style={[
          styles.pricingCard,
          {
            backgroundColor: selectedPlan === "monthly" ? theme.proPurple + "18" : theme.card,
            borderColor: selectedPlan === "monthly" ? theme.proPurple : theme.border,
            borderWidth: selectedPlan === "monthly" ? 1.5 : 1,
          },
        ]}
      >
        <Text style={[styles.pricingPlanName, { color: theme.foreground, marginTop: 12 }]}>
          Mensal
        </Text>
        <View style={styles.pricingRow}>
          <Text style={[styles.pricingAmount, { color: theme.foreground }]}>
            R$ 14,90
          </Text>
          <Text style={[styles.pricingPeriod, { color: theme.mutedForeground }]}>
            / mês
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ─── Social Proof ──────────────────────────────────────────────────────────
function SocialProof({ theme, riffCount }: { theme: ReturnType<typeof useTheme>; riffCount: number }) {
  if (riffCount < 3) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(900)}
      style={[styles.socialProof, { backgroundColor: theme.proPurple + "12" }]}
    >
      <Crown size={20} color={theme.proPurple} weight="fill" />
      <Text style={[styles.socialProofText, { color: theme.mutedForeground }]}>
        Você já criou{" "}
        <Text style={{ color: theme.foreground, fontWeight: "bold" }}>{riffCount} ideias</Text>.
        {"\n"}PRO ajuda a transformar elas em músicas.
      </Text>
    </Animated.View>
  );
}

// ─── CTA Button ────────────────────────────────────────────────────────────
function CTAButton({ theme }: { theme: ReturnType<typeof useTheme> }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.duration(500).delay(1000)}
      style={styles.ctaContainer}
    >
      <Pressable onPress={() => {}}>
        <Animated.View
          style={[
            styles.ctaButton,
            { backgroundColor: theme.proPurple },
            animatedStyle,
          ]}
        >
          <Crown size={22} color="#fff" weight="fill" style={{ marginRight: 8 }} />
          <Text style={styles.ctaButtonText}>Ativar PRO</Text>
        </Animated.View>
      </Pressable>
      <Text style={[styles.ctaSubtext, { color: theme.mutedForeground }]}>
        Cancele quando quiser.
      </Text>
    </Animated.View>
  );
}

// ─── Main PRO Screen ───────────────────────────────────────────────────────
export default function ProScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [riffCount, setRiffCount] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem("@riffs").then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          setRiffCount(Array.isArray(parsed) ? parsed.length : 0);
        } catch {
          setRiffCount(0);
        }
      }
    });
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: "#0A0A0B" }]}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={styles.header}
      >
        <View>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>
            Riff Maker{" "}
            <Text style={{ color: theme.proPurple }}>PRO</Text>
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.mutedForeground }]}>
            Transforme ideias soltas em música estruturada.
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={[styles.closeButton, { backgroundColor: theme.secondary }]}
        >
          <X size={18} color={theme.mutedForeground} weight="bold" />
        </Pressable>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <HeroSection theme={theme} />
        <FeaturesSection theme={theme} />
        <ComparisonTable theme={theme} />
        <PricingSection theme={theme} />
        <SocialProof theme={theme} riffCount={riffCount} />
        <CTAButton theme={theme} />

        {/* Bottom breathing space */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Header
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
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 24,
  },
  heroGlow: {
    position: "absolute",
    top: -40,
    left: -40,
    right: -40,
    height: 140,
    borderRadius: 100,
    opacity: 0.6,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 36,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.3,
    marginBottom: 12,
  },
  heroDescription: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },

  // Features
  featuresContainer: {
    gap: 12,
    marginBottom: 24,
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
    marginBottom: 14,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "bold",
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
  },

  // Comparison
  comparisonContainer: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  comparisonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  comparisonHeaderCell: {
    flex: 1,
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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

  // Pricing
  pricingContainer: {
    gap: 12,
    marginBottom: 24,
  },
  pricingCard: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    overflow: "hidden",
  },
  pricingBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  pricingBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  pricingPlanName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  pricingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  pricingAmount: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  pricingPeriod: {
    fontSize: 14,
  },
  pricingMonthly: {
    fontSize: 13,
    marginTop: 4,
  },

  // Social Proof
  socialProof: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
  },
  socialProofText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },

  // CTA
  ctaContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 16,
    minWidth: SCREEN_WIDTH - 80,
  },
  ctaButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  ctaSubtext: {
    fontSize: 13,
    marginTop: 10,
  },
});
