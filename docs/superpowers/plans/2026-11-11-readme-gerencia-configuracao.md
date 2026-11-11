# README + alinhamento de CI — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reescrever o `README.md` para o estado real do projeto (um compose, 5 containers, Jenkins Multibranch) e adicionar a seção de gerência de configuração e evolução de software; alinhar `Jenkinsfile` e `.env.example` ao que o README passa a documentar.

**Architecture:** O README é a fonte de verdade da entrega. Cada afirmação sobre arquitetura, etapas e variáveis deve bater com `docker-compose.yml`, `Jenkinsfile` e `.env.example`. Duas pequenas mudanças de CI (ordem do `post` e limpeza de env) alinham o código ao texto.

**Tech Stack:** Markdown, Docker Compose, Jenkins declarativo (Groovy), Playwright/TypeScript.

**Spec:** `docs/superpowers/specs/2026-11-11-readme-gerencia-configuracao-design.md`

## Global Constraints

- Um único `docker-compose.yml`; o runner é puxado de `mgazzolaa/s07-playwright-runner:1.0.0` com `pull_policy: always`; o `jenkins` é buildado localmente.
- 5 containers: `jenkins`, `playwright-runner`, `postgres`, `relatorio-server`, `mailpit`.
- `MAIL_TRANSPORT` seleciona `mailpit` (padrão) ou `gmail`.
- Não alterar `tests/`, `pages/`, `fixtures/`, `docker/scripts/notify.sh`, a métrica do gate nem o schema do banco.
- Não referenciar `docker-compose.hub.yml` nem `docs/matriz-rastreabilidade.md` (apagados no working tree).
- Não reescrever `docs/plano-np2.md`.

## Review Focus

- O README cita `docs/uso-de-ia.md`? Não deve: o arquivo não existe. A evidência de IA é `docs/anexos/`.
- O README manda usar `docker-compose.hub.yml` ou `DOCKERHUB_USER`? Não deve.
- Alguma etapa do README contradiz o `Jenkinsfile` (nomes e ordem)? Não deve.
- A árvore de arquivos lista arquivos inexistentes ou omite os existentes? Não deve.
- O e-mail do pipeline aponta para `historico.html` antes de ele existir? Não deve (histórico antes da notificação).

---

### Task 1: Limpar `.env.example`

**Files:**
- Modify: `.env.example`

**Interfaces:**
- Produces: arquivo sem `DOCKERHUB_USER` e sem a linha solta `seu-email`, terminando com `MAIL_TRANSPORT=mailpit` e newline final.

- [ ] **Step 1: Substituir o conteúdo por**

```dotenv
# Notificação por e-mail (msmtp)
GMAIL_USER=seu-email@gmail.com
GMAIL_PASS=sua-senha-de-app
DESTINATARIO_EMAIL=destinatario@email.com

# Banco de dados (histórico de execuções)
POSTGRES_DB=s07
POSTGRES_USER=s07
POSTGRES_PASSWORD=troque-esta-senha

# Infraestrutura
JENKINS_URL=http://localhost:8080
RELATORIOS_URL=http://localhost:8081
TZ=America/Sao_Paulo

# E-mail: "mailpit" (testes locais) ou "gmail" (envio real)
MAIL_TRANSPORT=mailpit
```

- [ ] **Step 2: Verificar**

Run: `grep -nE "DOCKERHUB_USER|seu-email$" .env.example`
Expected: nenhuma saída.

Run: `grep -c "MAIL_TRANSPORT=mailpit" .env.example`
Expected: `1`

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore(env): remove variável não usada e linha inválida"
```

---

### Task 2: Ordem do `post` — histórico antes da notificação

**Files:**
- Modify: `Jenkinsfile:71-92`

**Interfaces:**
- Consumes: `scripts/store-result.js` e `docker/scripts/notify.sh` já existentes.
- Produces: no bloco `post { always { ... } }`, o `docker exec ... store-result.js` executa antes do `bash .../notify.sh`.

- [ ] **Step 1: Trocar a ordem dos dois blocos `catchError`**

O bloco com `node scripts/store-result.js` passa a vir primeiro; o bloco com `bash ${WS}/docker/scripts/notify.sh` vem depois. O conteúdo interno de cada bloco não muda.

- [ ] **Step 2: Verificar a ordem**

Run: `grep -nE "store-result\.js|notify\.sh" Jenkinsfile`
Expected: a linha de `store-result.js` tem número menor que a de `notify.sh`.

- [ ] **Step 3: Verificar que o pipeline continua íntegro**

Run: `docker exec -w /workspace/project playwright-runner node scripts/store-result.js`
Expected: `[OK] Resultado do build #local registrado...` (o `results/cobertura.json` já existe da execução validada).

Run: `docker exec -u jenkins -w /workspace/project jenkins bash docker/scripts/notify.sh SUCCESS http://localhost:8080/job/S07/job/main/ ""`
Expected: `[OK] E-mail de notificação enviado...`

- [ ] **Step 4: Commit**

```bash
git add Jenkinsfile
git commit -m "fix(pipeline): grava histórico antes da notificação"
```

---

### Task 3: README — visão geral, arquitetura e configuração

**Files:**
- Modify: `README.md:14-49` (visão geral e arquitetura)
- Modify: `README.md:89-99` (tabela de variáveis)

**Interfaces:**
- Produces: README descrevendo 5 containers e `MAIL_TRANSPORT`.

- [ ] **Step 1: Atualizar a lista "Visão geral" para**

```markdown
- **SUT:** SauceDemo (`https://www.saucedemo.com`)
- **Suíte:** 20 casos de teste (TC-001 a TC-020), com Page Object Model
- **Cobertura de testes:** 19/20 = **95%** (TC-020 é um defeito conhecido do SUT)
- **Gate mínimo:** 90% (`scripts/test-coverage.js`)
- **Pipeline:** Jenkins **Multibranch** em container, sem GitHub Actions
- **E-mail:** Mailpit (desenvolvimento) ou Gmail (envio real), via `MAIL_TRANSPORT`
- **Containers:** 5 serviços (Jenkins, runner, PostgreSQL, Nginx e Mailpit)
- **Relatórios:** Playwright HTML, JUnit, JSON e histórico em PostgreSQL
```

- [ ] **Step 2: Substituir o diagrama de arquitetura por**

```text
┌────────────────────── pipeline-net (bridge) ──────────────────────┐
│                                                                   │
│  ┌──────────────┐   docker.sock   ┌────────────────────────────┐  │
│  │   jenkins    │────────────────▶│     playwright-runner      │  │
│  │ Dockerfile   │   docker exec   │  mgazzolaa/s07-playwright- │  │
│  │   :8080      │                 │  runner:1.0.0              │  │
│  └──┬──────┬───┘                 └───────┬──────────┬─────────┘  │
│     │SMTP  │ SQL                        │relatorios│ workspace │
│     ▼      ▼                            ▼          │           │
│  ┌────────┐ ┌────────────┐      ┌──────────────┐   │           │
│  │mailpit │ │  postgres  │      │ relatorio-   │   │           │
│  │ :8025  │ │   :5432    │      │ server :8081 │   │           │
│  └────────┘ └────────────┘      └──────────────┘   │           │
│                                                                   │
│  volumes: jenkins-data · workspace · relatorios · pgdata          │
└───────────────────────────────────────────────────────────────────┘
```

- [ ] **Step 3: Atualizar a tabela de containers para**

```markdown
| Container | Origem | Porta | Papel |
|---|---|---|---|
| `jenkins` | Dockerfile local | 8080, 50000 | Orquestra o pipeline |
| `playwright-runner` | Docker Hub (`mgazzolaa/...`) | — | Executa testes e scripts |
| `postgres` | Docker Hub | interna | Histórico de execuções |
| `relatorio-server` | Docker Hub (nginx) | 8081 | Serve relatórios e histórico |
| `mailpit` | Docker Hub | 8025, 1025 | Mock de e-mail (SMTP + interface) |
```

- [ ] **Step 4: Na tabela "Configuração", remover a linha `DOCKERHUB_USER` e adicionar**

```markdown
| `MAIL_TRANSPORT` | `mailpit` (padrão) ou `gmail` |
```

- [ ] **Step 5: Verificar**

Run: `grep -nE "Multibranch|mailpit|MAIL_TRANSPORT" README.md`
Expected: pelo menos uma ocorrência de cada.

Run: `grep -n "DOCKERHUB_USER" README.md`
Expected: nenhuma saída.

---

### Task 4: README — execução com Compose, Docker Hub e troubleshooting

**Files:**
- Modify: `README.md:116-151` (Execução com Docker Compose)
- Modify: `README.md:204-213` (Docker Hub)
- Modify: `README.md:284-285` (Solução de problemas)

**Interfaces:**
- Produces: um único fluxo de subida; nenhuma referência a compose de entrega.

- [ ] **Step 1: Substituir as subseções "Desenvolvimento" e "Entrega" por**

```markdown
### Subida da stack

```bash
docker compose up -d
docker compose ps
```

O `jenkins` é construído localmente a partir de `docker/Dockerfile.jenkins`; o
`playwright-runner` é puxado do Docker Hub
(`mgazzolaa/s07-playwright-runner:1.0.0`, com `pull_policy: always`). Os demais
serviços vêm de imagens oficiais.

Após mudanças no `Dockerfile.jenkins`, reconstrua a imagem:

```bash
docker compose up -d --build jenkins
```

Serviços:

- Jenkins: `http://localhost:8080`
- Relatórios: `http://localhost:8081`
- Mailpit (e-mails de teste): `http://localhost:8025`
- PostgreSQL: acesso interno pelo runner

Para acompanhar os logs:

```bash
docker compose logs -f jenkins
docker compose logs -f playwright-runner
```
```

- [ ] **Step 2: Ajustar a seção "Docker Hub"**

Manter os comandos de `docker build`/`docker push`; acrescentar a frase:

```markdown
O `docker-compose.yml` consome exatamente essa imagem; por isso, depois de publicar
uma nova versão, rode `docker compose pull playwright-runner` antes do `up`.
```

- [ ] **Step 3: Corrigir o bullet "Imagem do Hub não encontrada"**

Substituir por:

```markdown
- **Runner não atualizado:** rode `docker compose pull playwright-runner` e
  `docker compose up -d playwright-runner`.
```

- [ ] **Step 4: Verificar**

Run: `grep -nE "docker-compose\.hub|imagens construídas localmente" README.md`
Expected: nenhuma saída.

---

### Task 5: README — Jenkins e etapas do pipeline

**Files:**
- Modify: `README.md:167-202`

**Interfaces:**
- Consumes: `Jenkinsfile` após a Task 2.

- [ ] **Step 1: Trocar o passo de criação do job**

Substituir o item 4 por:

```markdown
4. Crie um item **Multibranch Pipeline** apontando para o repositório Git. O Jenkins
   descobre as branches e executa o `Jenkinsfile` de cada uma; a interface gráfica é
   usada apenas para o checkout/SCM.
```

- [ ] **Step 2: Substituir a tabela "Etapas do pipeline" por**

```markdown
| Etapa | Tipo | O que faz |
|---|---|---|
| Checkout | stage | Limpa `/workspace/project` e faz checkout do repositório |
| Install | stage | Executa `npm ci` no runner |
| Testes | stage | Executa os 20 casos com Playwright |
| Cobertura | stage | Valida o gate de 90% e gera `results/cobertura.md` |
| Build | stage | Executa `tsc --noEmit`, cria `dist/` e empacota com `npm pack` |
| Artefatos | post | Publica `dist/**`, `results/**` e `playwright-report/**` |
| Histórico | post | Grava a execução no PostgreSQL e gera `relatorios/historico.html` |
| Notificação | post | Envia e-mail via `msmtp` com status, build, commit e links |
```

- [ ] **Step 3: Verificar**

Run: `grep -nE "Multibranch|Histórico \| post|Notificação \| post" README.md`
Expected: pelo menos uma ocorrência de cada.

---

### Task 6: README — relatórios e estrutura de arquivos

**Files:**
- Modify: `README.md:198-202` (Relatórios)
- Modify: `README.md:215-244` (Estrutura do projeto)

**Interfaces:**
- Produces: árvore que bate com o working tree.

- [ ] **Step 1: Em "Relatórios", adicionar o Mailpit**

```markdown
- Mailpit: `http://localhost:8025`
```

- [ ] **Step 2: Substituir a árvore por**

```text
.
├── docker/
│   ├── Dockerfile.jenkins
│   ├── Dockerfile.playwright
│   ├── jenkins/
│   │   ├── plugins.txt
│   │   ├── msmtprc.template
│   │   └── msmtprc.mailpit.template
│   ├── nginx/default.conf
│   └── scripts/
│       ├── jenkins-entrypoint.sh
│       └── notify.sh
├── docker-compose.yml
├── Jenkinsfile
├── pages/
├── tests/
├── fixtures/
├── scripts/
│   ├── test-coverage.js
│   └── store-result.js
├── docs/
│   ├── plano_de_testes.pdf
│   ├── plano-np2.md
│   ├── transcricao-sessao-ia.md
│   └── anexos/
├── .env.example
└── README.md
```

- [ ] **Step 3: Verificar**

Run: `grep -nE "docker-compose\.hub|matriz-rastreabilidade|msmtprc\.mailpit\.template" README.md`
Expected: somente a linha do `msmtprc.mailpit.template`.

---

### Task 7: README — nova seção de gerência de configuração

**Files:**
- Modify: `README.md` (inserir antes de `## Uso de Inteligência Artificial`, após `## Estrutura do projeto`)

**Interfaces:**
- Consumes: nomes de arquivos e variáveis definidos nas tasks anteriores.

- [ ] **Step 1: Inserir a seção**

```markdown
## Gerência de Configuração e Evolução de Software

### Controle de versão

- Repositório Git/GitHub único, com `main` como linha de entrega.
- Trabalho em branches `feat/*`, `fix/*` e `docs/*`, integradas por pull request.
- Commits no padrão `tipo(escopo): descrição` (ex.: `feat(pipeline): adiciona stage de cobertura`).
- `.gitattributes` força LF em scripts, Dockerfiles, Jenkinsfile e YAML, evitando quebra por CRLF.
- `.gitignore` exclui `node_modules/`, `results/`, `dist/`, relatórios e `.env`; apenas `.env.example` é versionado.

### Configuração como código

| Artefato | Papel |
|---|---|
| `docker/Dockerfile.jenkins` | Imagem do Jenkins: Node 22, Docker CLI (DooD), msmtp e plugins |
| `docker/Dockerfile.playwright` | Imagem do runner (Playwright 1.62.1) |
| `docker-compose.yml` | Stack completa: Jenkins local + runner do Hub + PostgreSQL + Nginx + Mailpit |
| `docker/jenkins/plugins.txt` | Plugins do Jenkins declarados como código |
| `docker/jenkins/msmtprc*.template` | Configuração de e-mail gerada em runtime, sem credenciais na imagem |
| `docker/nginx/default.conf` | Publicação dos relatórios |
| `.env.example` | Contrato das variáveis de ambiente |

Versões pinadas: `@playwright/test` = `1.62.1`, imagem
`mcr.microsoft.com/playwright:v1.62.1-noble` e runner
`mgazzolaa/s07-playwright-runner:1.0.0`.

### Integração e entrega contínuas

- Jenkins em container, em modo **Multibranch Pipeline** (job `S07`): descobre as
  branches e executa o `Jenkinsfile` de cada uma.
- Os comandos de build e teste rodam dentro do `playwright-runner` via `docker exec`,
  sobre o mesmo volume `workspace` em que o Jenkins fez o checkout.
- Sem GitHub Actions: o pipeline é 100% Jenkins.
- Artefatos publicados: pacote `.tgz`, `results/**` e `playwright-report/**`.
- Histórico persistido no PostgreSQL e publicado pelo Nginx.
- Imagem do runner publicada manualmente no Docker Hub (decisão do grupo, sem
  credencial de registry no Jenkins).

### Qualidade e rastreabilidade

- 20 casos (TC-001 a TC-020) em Playwright/TypeScript com Page Object Model.
- Gate de cobertura em `scripts/test-coverage.js`: mínimo de 90%; resultado atual 95%.
- TC-020 é um defeito conhecido do SUT, marcado com `test.fail()`; não conta como coberto.
- Relatórios HTML/JUnit/JSON, cobertura em Markdown/JSON e histórico consultável.

### Gestão de mudanças e evidências

- Toda mudança entra por pull request; o histórico do Git registra a evolução.
- O uso de IA está documentado em "Uso de Inteligência Artificial" e no registro bruto
  em `docs/anexos/`.
- Cada execução deixa evidência: build no Jenkins, e-mail, histórico no PostgreSQL e
  relatórios no Nginx.

### Evolução do projeto

- **Fase 1:** suíte E2E sobre o SauceDemo.
- **NP2:** containerização, Docker Compose, Jenkins, Docker Hub, PostgreSQL e Nginx,
  sem reescrever a suíte.
```

- [ ] **Step 2: Verificar**

Run: `grep -n "Gerência de Configuração e Evolução de Software" README.md`
Expected: `1`

---

### Task 8: Verificação final

**Files:**
- Verify only.

- [ ] **Step 1: Varredura de referências mortas**

Run: `grep -nE "docker-compose\.hub|matriz-rastreabilidade|4 containers|DOCKERHUB_USER|seu-email$" README.md .env.example`
Expected: nenhuma saída.

- [ ] **Step 2: Compose válido**

Run: `docker compose config -q`
Expected: sem saída (código 0).

- [ ] **Step 3: Containers e pipeline íntegros**

Run: `docker compose ps --format '{{.Name}} {{.Status}}'`
Expected: 5 containers, com `jenkins`, `postgres`, `relatorio-server` e `mailpit` saudáveis.

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8081/historico.html`
Expected: `200`.

Run: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8025/`
Expected: `200`.

- [ ] **Step 4: Commit final**

```bash
git add README.md docs/superpowers/
git commit -m "docs(readme): reescreve para o estado atual e adiciona gerência de configuração"
```
