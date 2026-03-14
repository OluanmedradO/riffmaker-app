import type { Language } from "@/src/i18n";

type PrivacySection = {
  title: string;
  body: string[];
};

type PrivacyDocument = {
  title: string;
  lastUpdated: string;
  summary: string;
  sections: PrivacySection[];
};

const ptBR: PrivacyDocument = {
  title: "Politica de Privacidade",
  lastUpdated: "13 de marco de 2026",
  summary:
    "O Riff Maker foi pensado para funcionar sem conta e com seus riffs salvos localmente, mas o app pode enviar eventos tecnicos e diagnosticos para analytics, monitoramento de erros e distribuicao de atualizacoes quando essas integracoes estiverem configuradas.",
  sections: [
    {
      title: "1. Dados que ficam no dispositivo",
      body: [
        "Seus riffs, notas, BPM, afinacoes, projetos, backups e gravacoes de audio ficam armazenados localmente no seu dispositivo.",
        "Nao exigimos cadastro para usar o app.",
      ],
    },
    {
      title: "2. Dados tecnicos que podem ser enviados",
      body: [
        "Quando configurados, Sentry e PostHog podem receber diagnosticos tecnicos, falhas, eventos de uso do produto, versao do app, build, canal de update, plataforma, idioma e informacoes basicas do dispositivo.",
        "Esses dados sao usados para estabilidade, analise de uso e melhoria do produto. Nao usamos esses eventos para vender dados pessoais.",
      ],
    },
    {
      title: "3. Permissoes",
      body: [
        "Microfone: usado somente para gravar audio quando voce inicia uma gravacao.",
        "Armazenamento e compartilhamento de arquivos: usados para exportar, restaurar e compartilhar backups e audios quando voce aciona essas funcoes.",
      ],
    },
    {
      title: "4. Atualizacoes e distribuicao",
      body: [
        "O app pode usar Expo Updates para baixar atualizacoes remotas compativeis com sua build.",
        "Essas verificacoes podem incluir identificadores tecnicos da atualizacao, runtime version e canal de distribuicao.",
      ],
    },
    {
      title: "5. Compartilhamento com terceiros",
      body: [
        "Podemos usar provedores tecnicos para operar o app, incluindo Expo (atualizacoes), Sentry (monitoramento) e PostHog (analytics), quando configurados.",
        "Nao vendemos seus riffs, gravacoes ou dados pessoais.",
      ],
    },
    {
      title: "6. Seus controles",
      body: [
        "Voce pode apagar seus dados no app, exportar backup e desinstalar o aplicativo para remover o conteudo armazenado localmente.",
        "Se voce decidir nao configurar analytics ou Sentry na distribuicao, esses servicos permanecem desativados.",
      ],
    },
    {
      title: "7. Menores de idade",
      body: [
        "O app nao foi criado para coletar deliberadamente dados pessoais de criancas.",
      ],
    },
    {
      title: "8. Contato",
      body: [
        "Publique um email ou canal oficial de suporte na pagina da loja antes do lancamento publico.",
      ],
    },
  ],
};

const enUS: PrivacyDocument = {
  title: "Privacy Policy",
  lastUpdated: "March 13, 2026",
  summary:
    "Riff Maker is designed to work without an account and keeps your riffs locally by default, but the app can send technical events and diagnostics to analytics, error monitoring, and update delivery services when those integrations are configured.",
  sections: [
    {
      title: "1. Data stored on device",
      body: [
        "Your riffs, notes, BPM, tunings, projects, backups, and audio recordings are stored locally on your device.",
        "You do not need an account to use the app.",
      ],
    },
    {
      title: "2. Technical data that may be sent",
      body: [
        "When configured, Sentry and PostHog may receive crash diagnostics, product usage events, app version, build, update channel, platform, locale, and basic device information.",
        "This data is used for reliability, product analytics, and app improvements. We do not sell personal data.",
      ],
    },
    {
      title: "3. Permissions",
      body: [
        "Microphone: used only when you start an audio recording.",
        "File access and sharing: used when you export, restore, or share backups and audio files.",
      ],
    },
    {
      title: "4. Updates and delivery",
      body: [
        "The app may use Expo Updates to download remote updates that are compatible with your installed build.",
        "Those checks can include technical update identifiers, runtime version, and release channel.",
      ],
    },
    {
      title: "5. Third-party processors",
      body: [
        "We may rely on technical providers to operate the app, including Expo for updates, Sentry for monitoring, and PostHog for analytics, when configured.",
        "We do not sell your riffs, recordings, or personal data.",
      ],
    },
    {
      title: "6. Your controls",
      body: [
        "You can delete your data inside the app, export a backup, and uninstall the app to remove locally stored content.",
        "If analytics or Sentry credentials are not configured for a release, those services remain disabled.",
      ],
    },
    {
      title: "7. Children",
      body: [
        "The app is not designed to intentionally collect personal data from children.",
      ],
    },
    {
      title: "8. Contact",
      body: [
        "Publish a support email or official support channel on the store listing before public release.",
      ],
    },
  ],
};

export function getPrivacyPolicy(language: Language): PrivacyDocument {
  return language === "en-US" ? enUS : ptBR;
}
