# Fase 1 - Checklist de Release

Objetivo: validar estabilidade obrigatoria antes de release.

## 1) Gate automatizado

- [ ] `npm run release:check` executa com sucesso.
- [ ] Build Android debug concluido (`android:build`).
- [ ] Testes criticos concluido (`test:critical`): 3 suites / 8 testes.

## 2) Gravacao robusta (manual)

- [ ] Iniciar gravacao e parar normalmente salva riff com audio valido.
- [ ] Cancelar gravacao nao deixa lixo (sem riff invalido).
- [ ] Quick record salva corretamente e nao colide com recorder principal.
- [ ] Navegar entre telas durante gravacao nao corrompe estado.
- [ ] App em background durante gravacao dispara stop seguro.
- [ ] Retornar do background nao deixa sessao travada.
- [ ] Permissao negada mostra erro e cleanup correto.
- [ ] Interrupcao de audio (app externo) nao quebra a sessao.
- [ ] Toques rapidos start/stop nao geram corrida.
- [ ] Repetir ciclo gravar/apagar/regravar 5x sem regressao.

## 3) Backup / Restore / Reset (manual)

- [ ] Export de backup gera JSON valido.
- [ ] Restore de backup valido recupera projetos e riffs.
- [ ] Restore de JSON invalido falha com mensagem clara (sem corromper dados).
- [ ] Reset limpa DB e namespace do app sem apagar storage global.
- [ ] Restore apos reset recompõe dados sem inconsistencias.

## 4) Ambiente de release

- [ ] Rota `dev` nao aparece em producao.
- [ ] Fluxo de app sobe apos install debug sem crash inicial.

## 5) Telemetria / Loja

- [ ] `EXPO_PUBLIC_SENTRY_DSN` configurado no ambiente de release.
- [ ] `EXPO_PUBLIC_POSTHOG_KEY` configurado no ambiente de release.
- [ ] `EXPO_PUBLIC_PRIVACY_POLICY_URL` definido quando houver URL publica.
- [ ] Build `preview` publica no channel `preview`.
- [ ] Build `production` publica no channel `production`.
- [ ] Politica de privacidade revisada para refletir analytics, erros e OTA.

## Resultado

- [ ] GO
- [ ] NO-GO

Notas:

- Data:
- Responsavel:
- Evidencias (prints/logs):
