# Plano de Execução — Projeto S07 / NP2

**Disciplina:** S07 — Gerência de Configuração e Evolução de Software
**Entrega:** NP2 — Aplicando DevOps na prática
**Repositório:** https://github.com/generoso28/s07--qualidade-gerencia
**Equipe:** Lucas Caixeta Generoso · Matheus Moreira Franco Gazzola · Rafael Braga Santos
**Documento de referência:** `Projeto_S07_NP2.pdf`

---

## 1. Contexto

O NP2 exige demonstrar domínio da cadeia DevOps completa em torno do projeto desenvolvido na
fase 1 da disciplina:

- containerização com Docker;
- automação de CI/CD com Jenkins (sem interface gráfica para as etapas);
- orquestração de múltiplos serviços com Docker Compose;
- publicação de imagem no Docker Hub;
- cobertura de testes ≥ 90%;
- infraestrutura 100% como código.

O sistema entregue continua sendo **a suíte de automação construída na fase 1** (Playwright +
TypeScript sobre o SauceDemo). O NP2 adiciona a camada de infraestrutura, pipeline e operação
em volta dela — não há reescrita do sistema.

---

## 2. Escopo

### 2.1 O que é o "sistema"

| Item | Descrição |
|---|---|
| SUT (alvo) | SauceDemo (`https://www.saucedemo.com`) — ambiente herdado da fase 1 |
| Sistema entregue | Suíte de automação E2E em Playwright/TypeScript |
| Casos de teste | 20 (TC-001 a TC-020), documentados em `docs/plano_de_testes.pdf` |
| Padrão de projeto | Page Object Model (`pages/`) + fixtures de dados (`fixtures/testData.json`) |

### 2.2 Cobertura de testes

O edital pede **cobertura de testes**, não cobertura de código instrumentado. A métrica adotada é:

```
cobertura = casos aprovados / casos mapeados no plano de testes × 100
```

Situação atual: **19 de 20 casos = 95%**. O único caso que não passa é o TC-020, que evidencia
um **defeito real do SUT** (ver seção 7).

### 2.3 Fora de escopo

- Reescrever a aplicação ou criar um SUT próprio.
- Medir cobertura de código (instrumentação de `src/`, Vitest).
- GitHub Actions (explicitamente proibido pelo edital).

---

## 3. Decisões de projeto

| # | Decisão | Escolha | Justificativa |
|---|---|---|---|
| 1 | Sistema | Manter a suíte da fase 1 | Continuidade do escopo definido pelo professor |
| 2 | Cobertura | Cobertura de testes (casos aprovados / total) | Interpretação do edital; 95% já comprovado |
| 3 | TC-020 | `test.fail()` — defeito conhecido | Pipeline não quebra por bug de terceiro; defeito fica documentado |
| 4 | Execução dos testes | Container runner dedicado + `docker exec` | Padrão do repositório de referência da disciplina |
| 5 | Imagens | `jenkins` (Dockerfile local) + `playwright-runner` (Docker Hub) | Atende ao mix local + Hub exigido |
| 6 | Compose | 4 containers | Mínimo do edital (≥ 4) |
| 7 | Persistência | Postgres + 4 volumes nomeados | Histórico de execuções e persistência comprovável |
| 8 | E-mail | `msmtp` + Gmail via App Password | Padrão da disciplina; entrega real comprovável |
| 9 | Push no Docker Hub | Manual, fora do pipeline | Decisão do grupo; evita credencial de registry no Jenkins |
| 10 | Criação do job | Interface gráfica apontando para o `Jenkinsfile` | Permitido pelo edital ("checkout é permitido") |
| 11 | Plugins | `plugins.txt` + `jenkins-plugin-cli` | Infrastructure as Code |

---

## 4. Conformidade com o edital

| # | Critério avaliado | Como será atendido | Evidência |
|---|---|---|---|
| 1 | Aplicação funcional com testes ≥ 90% | Suíte de 20 casos, gate automático de 90% | `results/cobertura.md` (95%) |
| 2 | Dockerfile | `Dockerfile.jenkins` + `Dockerfile.playwright` reprodutíveis | Build limpo + `jenkins-data` persistindo |
| 3 | Jenkinsfile — etapas obrigatórias | Testes, build e notificação por e-mail | Execução verde no Jenkins |
| 4 | Artefatos no Jenkins | `.tgz`, `cobertura.md`, `junit-e2e.xml`, relatório HTML | Aba "Build Artifacts" |
| 5 | Variável de ambiente para e-mail | `DESTINATARIO_EMAIL`, `GMAIL_USER`, `GMAIL_PASS` via `.env` | `.env.example` + print do e-mail |
| 6 | Docker Hub | Imagem do runner publicada manualmente | Link + print da página |
| 7 | Docker Compose — 4+ containers | 4 serviços (2 locais + 2 do Hub) | `docker compose ps` |
| 8 | Comunicação entre containers | exec no runner, SQL no Postgres, SMTP no Gmail | Logs do pipeline |
| 9 | Volumes | `jenkins-data`, `workspace`, `relatorios`, `pgdata` | `down`/`up` preservando dados |
| 10 | Versionamento e contribuições | Commits de todos os integrantes | `git shortlog -sne` |
| 11 | README completo | Instalação, execução, uso, funcionalidades | `README.md` |
| 12 | Uso transparente de IA | Modelos, prompts, aceitos/descartados, o que foi manual | Seção "Uso de IA" |
| 13 | Defesa Q&A | Todos os integrantes dominam o conjunto | Ensaio de 20 min |
| 14 | DevOps geral | Código, infra, pipeline e testes coerentes | Demonstração ao vivo |

### Regras transversais

- **Não usar GitHub Actions** → `.github/workflows/playwright.yml` será removido.
- **Jenkins em container**, nunca instalado na máquina.
- **Nenhuma etapa do pipeline criada pela GUI** (somente o job/checkout).
- **Nenhum endereço de e-mail hardcoded**.
- **Nenhum software do pipeline instalado manualmente** — tudo via Dockerfile/script.

---

## 5. Arquitetura

### 5.1 Diagrama

```
┌─────────────────────── pipeline-net (bridge) ───────────────────────┐
│                                                                     │
│  ┌──────────────┐  docker.sock    ┌──────────────────────────────┐  │
│  │   jenkins    │────────────────►│     playwright-runner        │  │
│  │ Dockerfile   │  docker exec    │  mcr.microsoft.com/          │  │
│  │   .jenkins   │                 │  playwright:1.62.1-noble     │  │
│  │  :8080       │                 └───────┬──────────┬───────────┘  │
│  └──┬────────┬──┘                         │          │              │
│     │ SMTP   │ SQL                        │relatorios│ workspace    │
│     ▼        ▼                            ▼          │              │
│  ┌────────┐ ┌────────────┐        ┌──────────────┐   │              │
│  │ Gmail  │ │  postgres  │        │    nginx     │   │              │
│  │ (ext.) │ │  :5432     │        │    :8081     │   │              │
│  └────────┘ └────────────┘        └──────────────┘   │              │
│                                                                     │
│  volumes: jenkins-data · workspace · relatorios · pgdata             │
└─────────────────────────────────────────────────────────────────────┘
```

### 5.2 Containers

| Container | Origem | Porta | Papel |
|---|---|---|---|
| `jenkins` | **Dockerfile local** | 8080, 50000 | Orquestração: checkout, `docker exec`, artefatos, e-mail |
| `playwright-runner` | **Docker Hub** (`<user>/s07-playwright-runner:1.0.0`) | — | Executa `npm ci`, Playwright, gate de cobertura, `npm pack`, histórico |
| `postgres` | `postgres:16-alpine` (Hub) | interna | Histórico das execuções |
| `relatorio-server` | `nginx:alpine` (Hub) | 8081 | Serve relatórios, cobertura e histórico |

### 5.3 Volumes

| Volume | Montagens | Conteúdo persistido |
|---|---|---|
| `jenkins-data` | `/var/jenkins_home` | Jobs, credenciais, histórico de builds |
| `workspace` | `/workspace` (jenkins + runner) | Código em execução — permite o `docker exec` no mesmo checkout |
| `relatorios` | `/relatorios` (jenkins + runner), `/usr/share/nginx/html` (nginx) | Relatório HTML, cobertura, histórico |
| `pgdata` | `/var/lib/postgresql/data` | Histórico de execuções |

### 5.4 Comunicação entre containers

| Canal | Origem → Destino | Tecnologia |
|---|---|---|
| 1 | `jenkins` → `playwright-runner` | `docker.sock` + `docker exec` |
| 2 | `playwright-runner` → `postgres` | TCP 5432 (driver `pg`) |
| 3 | `playwright-runner` → `nginx` | Volume compartilhado `relatorios` |
| 4 | `jenkins` → Gmail | SMTP 587 (STARTTLS, `msmtp`) |

### 5.5 Por que o volume `workspace`

O repositório de referência da disciplina monta o código como read-only no Jenkins, o que
impede um `checkout scm` ali e faz com que os runners nunca sejam realmente usados.

Aqui o volume `workspace` é montado em `/workspace` **nos dois containers**: o Jenkins faz o
checkout nele e o runner executa os comandos sobre exatamente o mesmo código. Assim os
containers de teste deixam de ser decorativos.

---

## 6. Estrutura de arquivos

```
.
├── docker/
│   ├── Dockerfile.jenkins          # jenkins lts-jdk21 + node 22 + docker CLI + msmtp
│   ├── Dockerfile.playwright       # mcr.microsoft.com/playwright:v1.62.1-noble
│   ├── jenkins/
│   │   ├── plugins.txt
│   │   └── msmtprc.template
│   ├── nginx/
│   │   └── default.conf
│   └── scripts/
│       ├── jenkins-entrypoint.sh   # substitui placeholders do msmtprc + ajusta socket
│       └── notify.sh               # envia e-mail via msmtp
├── docker-compose.yml              # build local (desenvolvimento)
├── docker-compose.hub.yml          # runner puxado do Docker Hub (demonstração)
├── Jenkinsfile
├── scripts/
│   ├── test-coverage.js            # gate de 90% + geração de cobertura.md
│   └── store-result.js             # grava no Postgres + gera historico.html
├── docs/
│   ├── plano_de_testes.pdf
│   ├── matriz-rastreabilidade.md
│   └── plano-np2.md                # este documento
├── tests/                          # auth.spec.ts, cart.spec.ts, checkout.spec.ts
├── pages/                          # LoginPage, InventoryPage, CartPage, CheckoutPage
├── fixtures/testData.json
├── .env.example
└── README.md
```

---

## 7. Cobertura de testes e o TC-020

### 7.1 Casos por domínio

| Domínio | Casos | Qtd |
|---|---|---|
| Autenticação e Sessão | TC-001, TC-002, TC-003, TC-011, TC-012, TC-013, TC-014 | 7 |
| Catálogo e Carrinho | TC-004, TC-005, TC-006, TC-007, TC-008, TC-010, TC-015, TC-016 | 8 |
| Checkout | TC-009, TC-017, TC-018, TC-019, TC-020 | 5 |
| **Total** | | **20** |

### 7.2 O defeito do TC-020

O SauceDemo **não aplica `trim`** nos campos do checkout: valores compostos apenas por espaços
(`"   "`) são aceitos e o fluxo avança indevidamente para o Step 2.

O teste está correto; o SUT está errado. A correção é **documentar o defeito sem deixar a
pipeline vermelha**, usando a anotação nativa do Playwright:

```ts
test('TC-020: Validação de campos obrigatórios com espaços em branco', async ({ page }) => {
  // DEFEITO CONHECIDO DO SUT: o SauceDemo não aplica trim nos campos,
  // então "   " é aceito e o fluxo avança indevidamente para o Step 2.
  test.fail(true, 'SauceDemo aceita campos compostos apenas por espaços');

  const checkoutPage = new CheckoutPage(page);
  await checkoutPage.fillInformation('   ', '   ', '   ');
  await checkoutPage.clickContinue();

  await expect(page).toHaveURL(/.*checkout-step-one\.html/);
  await expect(checkoutPage.errorMessage).toBeVisible();
});
```

Consequências:

- o caso passa a ser reportado como **expected failure** e não derruba o build;
- se o SauceDemo corrigir o bug, o caso vira *unexpected pass* e o build **falha** — alerta de mudança;
- o defeito é contabilizado como **não coberto**, preservando o número real de 95%.

### 7.3 Gate de cobertura (`scripts/test-coverage.js`)

1. Lê `results/e2e.json` (reporter JSON do Playwright).
2. Conta casos mapeados, aprovados, falhos e *expected failures*.
3. Calcula `cobertura = aprovados / mapeados × 100`.
4. Gera `results/cobertura.md` (matriz caso × status × evidência) e `results/cobertura.json`.
5. Encerra com código ≠ 0 se `cobertura < 90`.

---

## 8. Pipeline

### 8.1 Etapas

```
Checkout → Install → Testes → Cobertura (≥90%) → Build → Artefatos → Histórico → Notificação
```

### 8.2 Jenkinsfile (referência)

```groovy
pipeline {
  agent any
  options {
    timeout(time: 30, unit: 'MINUTES')
    timestamps()
    ansiColor('xterm')
    buildDiscarder(logRotator(numToKeepStr: '10', artifactNumToKeepStr: '10'))
  }
  environment {
    RUNNER = 'playwright-runner'
    WS     = '/workspace'
  }
  stages {
    stage('Checkout')  { steps { dir(WS) { deleteDir(); checkout scm } } }
    stage('Install')   { steps { sh "docker exec -w ${WS} ${RUNNER} npm ci" } }
    stage('Testes')    { steps { sh "docker exec -w ${WS} ${RUNNER} npx playwright test" } }
    stage('Cobertura') { steps { sh "docker exec -w ${WS} ${RUNNER} node scripts/test-coverage.js 90" } }
    stage('Build')     { steps {
      sh "docker exec -w ${WS} ${RUNNER} npx tsc --noEmit"
      sh "docker exec -w ${WS} ${RUNNER} npm pack --pack-destination dist"
    } }
  }
  post {
    always {
      dir(WS) {
        junit 'results/*.xml'
        archiveArtifacts artifacts: 'dist/**, results/**, playwright-report/**', allowEmptyArchive: true
        publishHTML(target: [reportDir: 'playwright-report', reportFiles: 'index.html', reportName: 'E2E'])
      }
      sh "docker exec -w ${WS} ${RUNNER} node scripts/store-result.js"
      sh "docker/scripts/notify.sh '${currentBuild.currentResult}' '${env.BUILD_URL}' '${env.DESTINATARIO_EMAIL}'"
    }
  }
}
```

### 8.3 Notificação por e-mail

`docker/scripts/notify.sh` recebe três argumentos:

```bash
./notify.sh <SUCESSO|FALHA> <BUILD_URL> <DESTINATARIO>
```

O corpo do e-mail inclui status, número do build, data/hora, duração e links para o Jenkins e
para os relatórios (nginx `:8081`).

Configuração do `msmtp`:

- `docker/jenkins/msmtprc.template` contém os placeholders `GMAIL_USER_PLACEHOLDER` e
  `GMAIL_PASS_PLACEHOLDER`;
- `docker/scripts/jenkins-entrypoint.sh` substitui os placeholders por `sed` em runtime e grava
  `/etc/msmtprc` com permissão `600`;
- as credenciais chegam por variável de ambiente (`.env` → compose → container), **nunca** pelo
  Dockerfile (ficaria no histórico da imagem).

### 8.4 Variáveis de ambiente (`.env.example`)

```dotenv
# Notificação
GMAIL_USER=seu-email@gmail.com
GMAIL_PASS=sua-senha-de-app
DESTINATARIO_EMAIL=destinatario@email.com

# Banco de dados
POSTGRES_DB=s07
POSTGRES_USER=s07
POSTGRES_PASSWORD=troque-esta-senha

# Infra
DOCKERHUB_USER=seu-usuario
JENKINS_URL=http://localhost:8080
RELATORIOS_URL=http://localhost:8081
```

### 8.5 Plugins (`docker/jenkins/plugins.txt`)

```
workflow-aggregator
pipeline-stage-view
pipeline-utility-steps
git
github
docker-workflow
docker-plugin
junit
htmlpublisher
credentials-binding
plain-credentials
ansicolor
timestamper
build-timeout
```

---

## 9. Imagens e Docker Hub

### 9.1 Dockerfile.jenkins

Base `jenkins/jenkins:lts-jdk21` + Node 22 (NodeSource) + `docker-ce-cli` + `msmtp` + `gosu`.
Sem `runSetupWizard`. Plugins instalados em build time. Entrypoint próprio para configurar
`msmtprc` e permissões do socket.

### 9.2 Dockerfile.playwright

Base `mcr.microsoft.com/playwright:v1.62.1-noble` + `git`. `CMD ["tail", "-f", "/dev/null"]`
para permanecer ativo e receber `docker exec`.

> **Ponto crítico:** a tag da imagem deve casar com a versão do `@playwright/test`. O lock está
> em **1.62.1**, portanto o `package.json` deve usar a versão exata (sem `^`) e a imagem deve ser
> `v1.62.1-noble`. Caso contrário o Chromium embutido fica incompatível com o driver.

### 9.3 Publicação (manual)

```bash
docker build -f docker/Dockerfile.playwright -t <DOCKERHUB_USER>/s07-playwright-runner:1.0.0 .
docker push <DOCKERHUB_USER>/s07-playwright-runner:1.0.0
```

O link da imagem vai no README e na entrega do Teams.

### 9.4 Dois arquivos de compose

- `docker-compose.yml` — runner com `build:` (desenvolvimento local).
- `docker-compose.hub.yml` — runner com `image:` do Docker Hub (demonstração do item 3.3:
  "subir a imagem do Docker Hub e executar o pipeline completo").

---

## 10. Banco de dados

Tabela `execucoes`:

| Coluna | Tipo | Origem |
|---|---|---|
| `id` | serial PK | automático |
| `build_number` | text | `BUILD_NUMBER` |
| `status` | text | `currentBuild.currentResult` |
| `commit_sha` | text | `GIT_COMMIT` |
| `duracao_ms` | bigint | `currentBuild.duration` |
| `cobertura` | numeric(5,2) | `results/cobertura.json` |
| `casos_total` | int | idem |
| `casos_aprovados` | int | idem |
| `executado_em` | timestamptz | `now()` |

`scripts/store-result.js` insere a linha e regenera `relatorios/historico.html` a partir da
tabela, de modo que o nginx publique o histórico sem precisar de um serviço extra.

---

## 11. Ajustes na suíte existente

| Arquivo | Mudança |
|---|---|
| `package.json` | `@playwright/test` → `1.62.1` exato; adicionar `typescript`; scripts `test`, `coverage`, `build` |
| `playwright.config.ts` | reporters `html` + `junit` (`results/junit-e2e.xml`) + `json` (`results/e2e.json`) |
| `tests/checkout.spec.ts` | `test.fail()` no TC-020 |
| `.github/workflows/playwright.yml` | **remover** (GitHub Actions proibido) |
| `.gitignore` | adicionar `results/`, `dist/`, `.env` |
| `README.md` | reescrever conforme seção 12 |

---

## 12. README

Estrutura planejada, seguindo o formato do repositório de referência da disciplina:

1. Visão geral e integrantes
2. Funcionalidades cobertas pela suíte
3. Pré-requisitos
4. Instalação
5. Execução dos testes (local e via Docker)
6. Pipeline com Jenkins e Docker
   - Arquitetura
   - Estrutura de arquivos
   - Como usar (passo a passo)
7. Explicação dos arquivos (Dockerfiles, compose, Jenkinsfile, scripts)
8. Cobertura de testes e defeito conhecido (TC-020)
9. Link da imagem no Docker Hub
10. **Uso de IA** — modelos, finalidade, ≥ 3 prompts reais com respostas aceitas/ajustadas/
    descartadas, dinâmica de uso e o que foi feito manualmente

---

## 13. Fases de execução

| # | Fase | Entregáveis | Dias |
|---|---|---|---|
| 0 | Limpeza e preparação | Remover `.github/workflows`; pinar Playwright em 1.62.1; adicionar `typescript`; `.env.example`; ajustar `.gitignore` | 0,5 |
| 1 | Suíte e cobertura | `test.fail()` no TC-020; reporters html/junit/json; `scripts/test-coverage.js`; `docs/matriz-rastreabilidade.md` | 0,5 |
| 2 | Imagens | `docker/Dockerfile.jenkins`; `docker/Dockerfile.playwright`; `plugins.txt`; `msmtprc.template`; `jenkins-entrypoint.sh` | 1,5 |
| 3 | Pipeline | `Jenkinsfile`; `docker/scripts/notify.sh`; `scripts/store-result.js` | 1 |
| 4 | Compose e Hub | `docker-compose.yml`; `docker-compose.hub.yml`; `docker/nginx/default.conf`; push manual no Docker Hub; teste de persistência | 1 |
| 5 | Entrega | README completo; seção "Uso de IA"; prints das evidências; ensaio de Q&A | 1 |

**Total estimado:** ~5 dias de trabalho, paralelizável entre os três integrantes.

---

## 14. Checklist de aceite

- [ ] `.github/workflows/` removido
- [ ] `@playwright/test` pinado em `1.62.1` e imagem `v1.62.1-noble`
- [ ] TC-020 convertido em `test.fail()` com justificativa
- [ ] `results/cobertura.md` gerado com 95% e gate de 90% ativo
- [ ] `Dockerfile.jenkins` e `Dockerfile.playwright` buildando sem erro
- [ ] `Jenkinsfile` executando Testes, Build e Notificação
- [ ] Artefatos publicados (`.tgz`, `cobertura.md`, `junit-e2e.xml`, relatório HTML)
- [ ] E-mail recebido no Gmail com status, build e links
- [ ] `DESTINATARIO_EMAIL` vindo de variável de ambiente
- [ ] Imagem publicada no Docker Hub com link documentado
- [ ] `docker compose ps` mostrando 4 containers
- [ ] Comunicação comprovada: exec no runner, SQL no Postgres, SMTP
- [ ] `docker compose down` + `up` preservando `pgdata`, `jenkins-data` e `relatorios`
- [ ] `historico.html` acessível em `:8081`
- [ ] README completo com seção "Uso de IA"
- [ ] Commits relevantes dos três integrantes
- [ ] Ensaio de Q&A com todos respondendo

---

## 15. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| App Password do Gmail expirar ou falhar na defesa | Alto | Testar no dia anterior; ter print/vídeo de execução bem-sucedida |
| SauceDemo fora do ar ou sem internet | Alto | `retries` já configurado; gravar execução de referência |
| Tag da imagem Playwright divergente do driver | Alto | Pinar `1.62.1` sem `^` |
| `docker compose` ausente na máquina | Médio | Instalar `docker-compose-plugin` |
| `docker.sock` expõe poder de root no host | Médio | Documentar como DooD (mesma abordagem da referência da disciplina) |
| Runner não responder ao `docker exec` | Médio | `depends_on` + healthcheck + `timeout` de 30 min no pipeline |
| Cobertura interpretada como cobertura de código | Médio | Documentar a métrica adotada e a matriz de rastreabilidade |
| Discrepância de contribuição entre integrantes | Alto (eliminatório) | Dividir fases e registrar commits significativos de todos |

---

## 16. Referência: repositório do professor

Análise de `https://github.com/chrislima-inatel/S07`, usada como padrão de arquitetura.

### 16.1 O que replicamos

- Jenkins controller com `docker.sock` + `docker exec` em containers runners.
- Runners long-lived (`tail -f /dev/null`) com `Dockerfile` dedicado por tecnologia.
- Volume compartilhado de relatórios servido por `nginx:alpine` com `autoindex`.
- `plugins.txt` + `jenkins-plugin-cli` para plugins como código.
- `msmtp` na imagem do Jenkins, com `msmtprc` gerado a partir de template e variáveis de ambiente.
- Rede bridge dedicada e `depends_on` com `condition: service_healthy`.
- Job criado pela interface gráfica apontando para o `Jenkinsfile` (permitido pelo edital).

### 16.2 O que melhoramos

| Ponto na referência | Melhoria neste projeto |
|---|---|
| O `Jenkinsfile` não usa `docker exec`; os runners ficam ociosos | O pipeline executa de fato no runner via `docker exec` |
| `..:/workspace:ro` impede `checkout scm` no diretório montado | Volume `workspace` gravável e compartilhado entre Jenkins e runner |
| Sem persistência de resultados além do build history | Postgres com histórico consultável + `historico.html` |
| `version: '3.8'` obsoleto no Compose v2 | Compose sem a chave `version` |
| Cobertura não medida | Gate de cobertura de testes de 90% |
| Repositório mantém `.github/workflows` | GitHub Actions removido |

---

## 17. Convenções

- **Branches:** `main` protegida; trabalho em `feat/*`, `fix/*`, `docs/*`; merge via pull request.
- **Commits:** padrão `tipo(escopo): descrição` — ex.: `feat(pipeline): adiciona stage de cobertura`.
- **Commits de todos:** cada integrante assina as próprias entregas; sem commits vazios ou de fachada.
- **Segredos:** `.env` nunca versionado; apenas `.env.example`.
- **IA:** todo uso registrado na seção "Uso de IA" do README, com prompts reais.
