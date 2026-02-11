import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { Stack, useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  Linking,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useState } from "react";
import { STORAGE_KEYS } from "@/src/constants/app";

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);

  async function handleClearData() {
    Alert.alert(
      "Limpar todos os dados?",
      "Esta ação irá deletar TODOS os seus riffs e não pode ser desfeita. Tem certeza?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar Tudo",
          style: "destructive",
          onPress: async () => {
            setClearing(true);
            try {
              await AsyncStorage.clear();
              Alert.alert("Sucesso", "Todos os dados foram removidos.");
              router.back();
            } catch (error) {
              Alert.alert("Erro", "Não foi possível limpar os dados.");
            } finally {
              setClearing(false);
            }
          },
        },
      ],
    );
  }

  function handlePrivacyPolicy() {
    Alert.alert(
      "Política de Privacidade",
      "O Riff Maker não coleta ou compartilha seus dados. Tudo fica armazenado localmente no seu dispositivo.\n\nPara mais detalhes, consulte PRIVACY_POLICY.md no repositório.",
    );
  }

  async function handleExportData() {
    Alert.alert(
      "Em desenvolvimento",
      "A funcionalidade de exportação de dados estará disponível em breve!",
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Configurações",
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
        }}
      />

      <Screen background={theme.background}>
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.primary, marginTop: 8 },
          ]}
        >
          Dados
        </Text>

        <Pressable
          onPress={handleExportData}
          style={[styles.item, { backgroundColor: theme.card }]}
        >
          <FontAwesome name="download" size={20} color={theme.foreground} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            Exportar riffs
          </Text>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={theme.mutedForeground}
          />
        </Pressable>

        <Pressable
          onPress={handleClearData}
          disabled={clearing}
          style={[styles.item, { backgroundColor: theme.card }]}
        >
          <FontAwesome name="trash" size={20} color={theme.destructive} />
          <Text style={[styles.itemText, { color: theme.destructive }]}>
            {clearing ? "Limpando..." : "Limpar todos os dados"}
          </Text>
        </Pressable>

        <Text style={[styles.sectionTitle, { color: theme.primary }]}>
          Informações
        </Text>

        <Pressable
          onPress={handlePrivacyPolicy}
          style={[styles.item, { backgroundColor: theme.card }]}
        >
          <FontAwesome name="shield" size={20} color={theme.foreground} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            Política de Privacidade
          </Text>
          <FontAwesome
            name="chevron-right"
            size={16}
            color={theme.mutedForeground}
          />
        </Pressable>

        <View style={[styles.item, { backgroundColor: theme.card }]}>
          <FontAwesome name="info-circle" size={20} color={theme.foreground} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            Versão
          </Text>
          <Text style={[styles.versionText, { color: theme.mutedForeground }]}>
            1.0.0
          </Text>
        </View>

        <Text
          style={[styles.footer, { color: theme.mutedForeground }]}
        >
          Feito com ❤️ para músicos
        </Text>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
  },
  versionText: {
    fontSize: 14,
  },
  footer: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 13,
  },
});
