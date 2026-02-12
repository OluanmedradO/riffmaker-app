# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.0] - 2026-02-11

### ✨ Adicionado

#### Funcionalidades Core
- Criação de riffs com nome, BPM, afinação e notas
- Gravação de áudio de alta qualidade (até 60 segundos)
- Reprodução de áudio gravado
- Edição de riffs com autosave
- Busca de riffs por nome, notas ou afinação
- Favoritos para marcar riffs importantes
- Duplicação de riffs
- Deleção com confirmação

#### Interface & UX
- Tema escuro/claro automático
- Animações suaves (fade-in, slide)
- Feedback háptico em ações importantes
- Skeleton loaders durante carregamento
- Estados vazios informativos
- Validação de formulários com feedback visual
- Limite de caracteres em campos de texto
- Indicador de salvamento automático

#### Organização
- Ordenação por: data (mais recente/antigo), nome (A-Z/Z-A), BPM
- Presets de afinação (Standard, Drop D, etc.)
- Afinação customizada
- Busca inteligente com filtros

#### Configurações
- Tela de configurações
- Opção de limpar todos os dados
- Link para política de privacidade
- Informações da versão

#### Arquitetura & Código
- Error Boundary para prevenir crashes
- Retry logic em operações assíncronas
- TypeScript strict mode
- ESLint e Prettier configurados
- Estrutura de pastas organizada (hooks, utils, constants, components)
- Componentes reutilizáveis (LoadingSpinner, SkeletonLoader, ErrorBoundary)
- Custom hooks (useHaptic, useDebounce)
- Utilities (formatters, async helpers, riff utils)

#### Segurança & Privacidade
- Armazenamento local com AsyncStorage
- Sem coleta de dados externos
- Política de privacidade completa
- Permissões explicadas claramente
- Validação de entrada do usuário

#### Play Store Ready
- Configuração AAB (Android App Bundle)
- versionCode configurado
- Bundle identifiers definidos
- Descrições de permissões (NSMicrophoneUsageDescription)
- README com descrições para store listing
- EAS Build configurado

### 🔧 Técnico
- React Native 0.81.5
- Expo SDK 54
- TypeScript 5.9.2
- Expo Router 6 (file-based routing)
- Expo AV para áudio
- AsyncStorage para persistência
- Expo Haptics para feedback tátil

### 📝 Documentação
- README completo com guia de uso
- PRIVACY_POLICY.md detalhado
- Descrição completa para Play Store
- Comentários em código onde necessário

---

## [Não Lançado]

### 🚀 Planejado para v1.1.0
- [ ] Exportar/Importar backup de riffs (JSON)
- [ ] Compartilhar riffs via compartilhamento nativo
- [ ] Visualizador de forma de onda de áudio
- [ ] Modo de metrônomo integrado
- [ ] Undo/Redo para deleções

### 🎯 Planejado para v1.2.0
- [ ] Tags personalizadas
- [ ] Filtros avançados
- [ ] Estatísticas (total de riffs, tempo gravado, etc.)
- [ ] Widget para Android
- [ ] Atalhos rápidos

### 🌟 Planejado para v2.0.0
- [ ] Suporte a múltiplos instrumentos
- [ ] Temas customizáveis
- [ ] Integração opcional com cloud storage
- [ ] Colaboração com outros músicos
- [ ] Exportar para formatos de áudio padrão

---

## Como Contribuir

Para sugerir novas funcionalidades ou reportar bugs:
1. Abra uma issue no GitHub
2. Descreva detalhadamente a sugestão/bug
3. Adicione screenshots se aplicável

[1.0.0]: https://github.com/OluanmedradO/riffmaker-app/releases/tag/v1.0.0
