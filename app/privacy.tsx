import { hasPrivacyPolicyUrl, publicConfig } from "@/src/lib/appConfig";
import { trackEvent } from "@/src/lib/observability";
import { getPrivacyPolicy } from "@/src/legal/privacyPolicy";
import { useTranslation } from "@/src/i18n";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { Screen } from "@/src/shared/ui/Screen";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ArrowSquareOut } from "phosphor-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function PrivacyScreen() {
  const theme = useTheme();
  const { language, t } = useTranslation();
  const policy = getPrivacyPolicy(language);
  const lastUpdatedLabel =
    language === "en-US" ? "Last updated" : "Ultima atualizacao";
  const publicPolicyLabel =
    language === "en-US" ? "Open public URL" : "Abrir URL publica";

  async function handleOpenExternalPolicy() {
    if (!hasPrivacyPolicyUrl()) {
      return;
    }

    trackEvent("privacy_policy_opened", { source: "external" });
    await WebBrowser.openBrowserAsync(publicConfig.privacyPolicyUrl);
  }

  return (
    <Screen background={theme.background}>
      <Stack.Screen options={{ title: t("settings.privacy") }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <ScreenHeader
          title={policy.title}
          subtitle={`${lastUpdatedLabel}: ${policy.lastUpdated}`}
          style={{ paddingHorizontal: 0, paddingTop: 16 }}
        />

        <View style={styles.container}>
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.summaryText, { color: theme.foreground }]}>
              {policy.summary}
            </Text>

            {hasPrivacyPolicyUrl() && (
              <Pressable
                onPress={handleOpenExternalPolicy}
                style={({ pressed }) => [
                  styles.linkButton,
                  {
                    backgroundColor: theme.input,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <ArrowSquareOut size={16} color={theme.foreground} />
                <Text
                  style={[styles.linkButtonText, { color: theme.foreground }]}
                >
                  {publicPolicyLabel}
                </Text>
              </Pressable>
            )}
          </View>

          {policy.sections.map((section) => (
            <View
              key={section.title}
              style={[
                styles.section,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
                {section.title}
              </Text>

              {section.body.map((paragraph) => (
                <Text
                  key={paragraph}
                  style={[styles.paragraph, { color: theme.mutedForeground }]}
                >
                  {paragraph}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  summaryText: {
    fontSize: 15,
    lineHeight: 23,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
  },
  linkButton: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  linkButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
