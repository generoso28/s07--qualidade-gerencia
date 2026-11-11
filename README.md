# S07 — Qualidade e Gerência | NP2 DevOps

Projeto de testes automatizados ponta a ponta (E2E) para a aplicação **SauceDemo**,
desenvolvido com **Playwright + TypeScript**, agora com a camada de infraestrutura do
NP2: **Docker, Docker Compose, Jenkins em container, PostgreSQL, Nginx e publicação
de imagem no Docker Hub**.

## Integrantes

- Lucas Caixeta Generoso
- Matheus Moreira Franco Gazzola
- Rafael Braga Santos

## Visão geral

- **SUT:** SauceDemo (`https://www.saucedemo.com`)
- **Suíte:** 20 casos de teste (TC-001 a TC-020), com Page Object Model
- **Cobertura de testes:** 19/20 = **95%** (TC-020 é um defeito conhecido do SUT)
- **Gate mínimo:** 90% (`scripts/test-coverage.js`)
- **Pipeline:** Jenkins **Multibranch** em container, sem GitHub Actions
- **E-mail:** Mailpit (desenvolvimento) ou Gmail (envio real), via `MAIL_TRANSPORT`
- **Containers:** 5 serviços (Jenkins, runner, PostgreSQL, Nginx e Mailpit)
- **Relatórios:** Playwright HTML, JUnit, JSON e histórico em PostgreSQL

## Arquitetura

```
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

| Container | Origem | Porta | Papel |
|---|---|---|---|
| `jenkins` | Dockerfile local | 8080, 50000 | Orquestra o pipeline |
| `playwright-runner` | Docker Hub (`mgazzolaa/...`) | — | Executa testes e scripts |
| `postgres` | Docker Hub | interna | Histórico de execuções |
| `relatorio-server` | Docker Hub (nginx) | 8081 | Serve relatórios e histórico |
| `mailpit` | Docker Hub | 8025, 1025 | Mock de e-mail (SMTP + interface) |

## Funcionalidades cobertas

- **Autenticação e sessão:** login válido, usuário com latência, logout, senha
  incorreta, usuário bloqueado, campos vazios e retorno pelo histórico do navegador.
- **Catálogo e carrinho:** adição de um ou vários itens, remoção pela vitrine e pelo
  carrinho, ordenação por preço e por nome.
- **Checkout:** fluxo completo e validações de First Name, Last Name e Postal Code.
- **Segurança de rotas:** acesso direto a `/inventory.html` e `/cart.html` sem sessão.

O plano completo está em `docs/plano_de_testes.pdf`.

## Pré-requisitos

- Node.js 22 ou superior
- Docker Engine ou Docker Desktop com Docker Compose V2
- Git
- Portas `8080` (Jenkins), `8081` (relatórios) e `8025` (Mailpit) livres
- Para envio real de e-mail, uma conta Gmail com **senha de app**. No fluxo padrão
  (`MAIL_TRANSPORT=mailpit`) as mensagens ficam no Mailpit, sem sair da máquina

## Instalação local

```bash
git clone https://github.com/generoso28/s07--qualidade-gerencia.git
cd s07--qualidade-gerencia
npm ci
npx playwright install --with-deps
```

## Configuração

Copie o arquivo de exemplo e preencha os valores:

```bash
cp .env.example .env
```

| Variável | Descrição |
|---|---|
| `GMAIL_USER` | Conta Gmail usada como remetente |
| `GMAIL_PASS` | Senha de app do Gmail |
| `DESTINATARIO_EMAIL` | Destinatário da notificação (não fica hardcoded) |
| `POSTGRES_DB` | Nome do banco |
| `POSTGRES_USER` | Usuário do banco |
| `POSTGRES_PASSWORD` | Senha do banco |
| `JENKINS_URL` | URL do Jenkins usada nos e-mails |
| `RELATORIOS_URL` | URL pública dos relatórios |
| `TZ` | Fuso horário dos containers |
| `MAIL_TRANSPORT` | `mailpit` (padrão) ou `gmail` |

O arquivo `.env` é ignorado pelo Git. Nunca versione credenciais.

## Execução local dos testes

```bash
npm test           # executa os 20 casos
npm run coverage   # gera results/cobertura.md e valida o gate de 90%
npm run build      # tsc --noEmit
npm run report     # abre o relatório HTML do Playwright
```

O TC-020 está marcado com `test.fail()`: ele representa um defeito conhecido do
SauceDemo (ausência de `trim` nos campos do checkout). Por isso a execução fica
verde, mas o caso **não** conta como coberto. O resultado esperado é 19/20 = 95%.

## Execução com Docker Compose

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

### Persistência

| Volume | Conteúdo |
|---|---|
| `jenkins-data` | Configuração, jobs e histórico do Jenkins |
| `workspace` | Código compartilhado entre Jenkins e runner |
| `relatorios` | Relatórios, cobertura e histórico servidos pelo Nginx |
| `pgdata` | Dados do PostgreSQL |

```bash
docker compose down      # para os containers, preserva volumes
docker compose down -v   # remove também os volumes (reset)
```

## Jenkins

1. Suba a stack e acesse `http://localhost:8080`.
2. Obtenha a senha inicial:

```bash
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

3. Conclua o assistente inicial. Os plugins do pipeline já estão na imagem via
   `docker/jenkins/plugins.txt`; não é necessário instalá-los manualmente.
4. Crie um item **Multibranch Pipeline** apontando para o repositório Git. O Jenkins
   descobre as branches e executa o `Jenkinsfile` de cada uma; a interface gráfica é
   usada apenas para o checkout/SCM.

### Etapas do pipeline

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

O pipeline usa `docker exec` no container `playwright-runner`, graças ao socket do
Docker montado no Jenkins (Docker-outside-of-Docker).

### Relatórios

- Playwright: `http://localhost:8081/playwright-report/index.html`
- Cobertura: `http://localhost:8081/cobertura.md`
- Histórico: `http://localhost:8081/historico.html`
- Mailpit: `http://localhost:8025`

## Docker Hub

Construa e publique a imagem do runner:

```bash
docker build -f docker/Dockerfile.playwright -t mgazzolaa/s07-playwright-runner:1.0.0 .
docker push mgazzolaa/s07-playwright-runner:1.0.0
```

Link da imagem: `https://hub.docker.com/r/mgazzolaa/s07-playwright-runner`

O `docker-compose.yml` consome exatamente essa imagem; por isso, depois de publicar
uma nova versão, rode `docker compose pull playwright-runner` antes do `up`.

## Estrutura do projeto

```
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
│   └── anexos/
│       ├── README.md
│       ├── sessao-ia-2026-11-02.json
│       └── transcricao-sessao-ia.md
├── .env.example
└── README.md
```

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

## Uso de Inteligência Artificial

Utilizou-se ferramentas de Inteligência Artificial, Gemini e Antigravity, como fonte
de pesquisa e auxílio nos seguintes moldes:

- Escolhida a ferramenta (Playwright) e o site que seria testado (SauceDemo),
  elaboramos um rascunho do plano de testes e, posteriormente, enviamos esse rascunho
  para que o Antigravity verificasse se o escopo era válido e sugerisse ajustes. Como
  objeto de resposta recebemos um arquivo de texto que analisamos e decidimos o que
  fazia sentido ou não entrar para o documento.
- Ainda no âmbito da pesquisa, utilizou-se o Gemini para entender qual era a
  estrutura de diretórios padrão do Playwright (fixtures, pages, tests...) para que
  já iniciássemos os testes com a organização recomendada.
  [Histórico do chat](https://share.gemini.google/bbIefiIs8GnF)
- Por fim, a versão da fase 1 deste README, com exceção da seção de uso de IA, foi
  gerada com a ferramenta Antigravity, da Google. A atualização do NP2 (Docker,
  Jenkins e Compose) foi apoiada por IA e revisada pelo grupo.

Obs.: Todo conteúdo sugerido pelas ferramentas foi revisado e manipulado para que se
garantisse a qualidade da entrega final. O Antigravity não possui opção de exportação
de conversas; dessa forma, para as interações com esta ferramenta segue o link com as
capturas de tela do chat.
[Capturas de tela - Antigravity](https://drive.google.com/drive/folders/1awJr1E-LtrqUhCBxQNGmG5psjrLZJS81?usp=sharing)

## Solução de problemas

- **Docker não encontrado:** inicie o Docker Desktop e confirme com `docker version`.
- **Porta ocupada:** altere `8080`/`8081` no `docker-compose.yml` ou pare o serviço
  que está usando a porta.
- **Jenkins não sobe:** verifique `docker compose logs jenkins`; o volume
  `jenkins-data` pode ter sido criado com permissões antigas. Use `docker compose down -v`
  para recomeçar.
- **E-mail não enviado:** confira `MAIL_TRANSPORT` (`mailpit` ou `gmail`), os dados
  de `GMAIL_USER`, `GMAIL_PASS` e `DESTINATARIO_EMAIL` no `.env`, recrie o Jenkins
  para regenerar o msmtp (`docker compose up -d --force-recreate jenkins`) e veja
  `docker compose logs jenkins`. Com `mailpit`, a mensagem aparece em
  `http://localhost:8025`.
- **Runner não encontrado:** confirme `docker compose ps` e o nome
  `playwright-runner`.
- **Runner não atualizado:** rode `docker compose pull playwright-runner` e
  `docker compose up -d playwright-runner`.
