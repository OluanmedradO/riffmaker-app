import { useTheme } from "@/components/ThemeProvider";
import { useAccess } from "@/src/access/AccessProvider";
import { useRouter } from "expo-router";
import {
    ArrowCounterClockwise,
    Crown,
    Eye,
    EyeSlash,
    ShieldCheck,
    User,
    X,
} from "phosphor-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function DevAccessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { access, setAccess, planEffective } = useAccess();

  const isAdmin = access.role === "admin";

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>
          Dev Access
        </Text>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          style={[styles.closeBtn, { backgroundColor: theme.secondary }]}
        >
          <X size={18} color={theme.mutedForeground} weight="bold" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Current State */}
        <View
          style={[styles.stateCard, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
            Estado Atual
          </Text>
          <View style={styles.stateRow}>
            <Text style={[styles.stateLabel, { color: theme.mutedForeground }]}>
              Role:
            </Text>
            <Text
              style={[
                styles.stateValue,
                { color: isAdmin ? "#eab308" : theme.foreground },
              ]}
            >
              {access.role}
            </Text>
          </View>
          <View style={styles.stateRow}>
            <Text style={[styles.stateLabel, { color: theme.mutedForeground }]}>
              Plan:
            </Text>
            <Text
              style={[
                styles.stateValue,
                {
                  color:
                    access.plan === "pro" ? theme.proPurple : theme.foreground,
                },
              ]}
            >
              {access.plan}
            </Text>
          </View>
          <View style={styles.stateRow}>
            <Text style={[styles.stateLabel, { color: theme.mutedForeground }]}>
              Effective:
            </Text>
            <Text
              style={[
                styles.stateValue,
                {
                  color:
                    planEffective === "pro"
                      ? theme.proPurple
                      : theme.foreground,
                  fontWeight: "900",
                },
              ]}
            >
              {planEffective}
            </Text>
          </View>
          {access.simulatePlan !== undefined && (
            <View style={styles.stateRow}>
              <Text
                style={[styles.stateLabel, { color: theme.mutedForeground }]}
              >
                Simulating:
              </Text>
              <Text style={[styles.stateValue, { color: "#eab308" }]}>
                {access.simulatePlan}
              </Text>
            </View>
          )}
        </View>

        {/* Toggle Admin */}
        <Pressable
          onPress={() =>
            setAccess({ ...access, role: isAdmin ? "user" : "admin" })
          }
          style={[
            styles.actionBtn,
            {
              backgroundColor: isAdmin
                ? "#eab308" + "20"
                : theme.card,
              borderColor: isAdmin ? "#eab308" : theme.border,
            },
          ]}
        >
          <ShieldCheck
            size={20}
            color={isAdmin ? "#eab308" : theme.foreground}
            weight="fill"
          />
          <Text
            style={[
              styles.actionText,
              { color: isAdmin ? "#eab308" : theme.foreground },
            ]}
          >
            {isAdmin ? "Admin ON" : "Toggle Admin"}
          </Text>
        </Pressable>

        {/* Simulation controls (admin only) */}
        {isAdmin && (
          <View style={styles.simSection}>
            <Text
              style={[styles.sectionTitle, { color: theme.mutedForeground }]}
            >
              Simular Plano
            </Text>

            <View style={styles.simRow}>
              <Pressable
                onPress={() =>
                  setAccess({ ...access, simulatePlan: "free" })
                }
                style={[
                  styles.simBtn,
                  {
                    backgroundColor:
                      access.simulatePlan === "free"
                        ? theme.destructive + "20"
                        : theme.card,
                    borderColor:
                      access.simulatePlan === "free"
                        ? theme.destructive
                        : theme.border,
                  },
                ]}
              >
                <EyeSlash
                  size={16}
                  color={
                    access.simulatePlan === "free"
                      ? theme.destructive
                      : theme.foreground
                  }
                />
                <Text
                  style={{
                    color:
                      access.simulatePlan === "free"
                        ? theme.destructive
                        : theme.foreground,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  Free
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setAccess({ ...access, simulatePlan: "pro" })
                }
                style={[
                  styles.simBtn,
                  {
                    backgroundColor:
                      access.simulatePlan === "pro"
                        ? theme.proPurple + "20"
                        : theme.card,
                    borderColor:
                      access.simulatePlan === "pro"
                        ? theme.proPurple
                        : theme.border,
                  },
                ]}
              >
                <Eye
                  size={16}
                  color={
                    access.simulatePlan === "pro"
                      ? theme.proPurple
                      : theme.foreground
                  }
                />
                <Text
                  style={{
                    color:
                      access.simulatePlan === "pro"
                        ? theme.proPurple
                        : theme.foreground,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  Pro
                </Text>
              </Pressable>

              <Pressable
                onPress={() =>
                  setAccess({ ...access, simulatePlan: undefined })
                }
                style={[
                  styles.simBtn,
                  {
                    backgroundColor:
                      access.simulatePlan === undefined
                        ? theme.primary + "20"
                        : theme.card,
                    borderColor:
                      access.simulatePlan === undefined
                        ? theme.primary
                        : theme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      access.simulatePlan === undefined
                        ? theme.primary
                        : theme.foreground,
                    fontWeight: "bold",
                    fontSize: 13,
                  }}
                >
                  OFF
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground, marginTop: 24 }]}>
          Ações Rápidas
        </Text>

        <Pressable
          onPress={() => setAccess({ ...access, plan: "pro" })}
          style={[
            styles.actionBtn,
            { backgroundColor: theme.proPurple + "15", borderColor: theme.proPurple },
          ]}
        >
          <Crown size={20} color={theme.proPurple} weight="fill" />
          <Text style={[styles.actionText, { color: theme.proPurple }]}>
            Ativar Pro (local)
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setAccess({ role: "user", plan: "free", simulatePlan: undefined })
          }
          style={[
            styles.actionBtn,
            { backgroundColor: theme.destructive + "15", borderColor: theme.destructive },
          ]}
        >
          <ArrowCounterClockwise
            size={20}
            color={theme.destructive}
            weight="bold"
          />
          <Text style={[styles.actionText, { color: theme.destructive }]}>
            Reset (Free + User)
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setAccess({ role: "user", plan: "free", simulatePlan: undefined })
          }
          style={[
            styles.actionBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <User size={20} color={theme.foreground} />
          <Text style={[styles.actionText, { color: theme.foreground }]}>
            Simular Usuário Normal
          </Text>
        </Pressable>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  stateCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  stateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  stateLabel: {
    fontSize: 14,
  },
  stateValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  simSection: {
    marginTop: 20,
  },
  simRow: {
    flexDirection: "row",
    gap: 10,
  },
  simBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
});
