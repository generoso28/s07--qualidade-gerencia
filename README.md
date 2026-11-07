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
- **Pipeline:** Jenkins em container, sem GitHub Actions
- **Relatórios:** Playwright HTML, JUnit, JSON e histórico em PostgreSQL

## Arquitetura

```
┌────────────────────── pipeline-net (bridge) ──────────────────────┐
│                                                                   │
│  ┌──────────────┐   docker.sock   ┌────────────────────────────┐  │
│  │   jenkins    │────────────────▶│     playwright-runner      │  │
│  │ Dockerfile   │   docker exec   │  mcr.microsoft.com/        │  │
│  │   :8080      │                 │  playwright:1.62.1-noble   │  │
│  └──┬────────┬──┘                 └───────┬──────────┬─────────┘  │
│     │ SMTP   │ SQL                        │relatorios│ workspace │
│     ▼        ▼                            ▼          │           │
│  ┌────────┐ ┌────────────┐        ┌──────────────┐   │           │
│  │ Gmail  │ │  postgres  │        │ relatorio-   │   │           │
│  │ (ext.) │ │   :5432    │        │ server :8081 │   │           │
│  └────────┘ └────────────┘        └──────────────┘   │           │
│                                                                   │
│  volumes: jenkins-data · workspace · relatorios · pgdata          │
└───────────────────────────────────────────────────────────────────┘
```

| Container | Origem | Porta | Papel |
|---|---|---|---|
| `jenkins` | Dockerfile local | 8080, 50000 | Orquestra o pipeline |
| `playwright-runner` | Dockerfile local ou Docker Hub | — | Executa testes e scripts |
| `postgres` | Docker Hub | interna | Histórico de execuções |
| `relatorio-server` | Docker Hub (nginx) | 8081 | Serve relatórios e histórico |

## Funcionalidades cobertas

- **Autenticação e sessão:** login válido, usuário com latência, logout, senha
  incorreta, usuário bloqueado, campos vazios e retorno pelo histórico do navegador.
- **Catálogo e carrinho:** adição de um ou vários itens, remoção pela vitrine e pelo
  carrinho, ordenação por preço e por nome.
- **Checkout:** fluxo completo e validações de First Name, Last Name e Postal Code.
- **Segurança de rotas:** acesso direto a `/inventory.html` e `/cart.html` sem sessão.

O plano completo está em `docs/plano_de_testes.pdf` e a rastreabilidade em
`docs/matriz-rastreabilidade.md`.

## Pré-requisitos

- Node.js 22 ou superior
- Docker Engine ou Docker Desktop com Docker Compose V2
- Git
- Portas `8080` (Jenkins) e `8081` (relatórios) livres
- Uma conta Gmail com **senha de app** para a notificação por e-mail (opcional para
  execução local; necessária para demonstrar o envio real)

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
| `DOCKERHUB_USER` | Usuário do Docker Hub |
| `JENKINS_URL` | URL do Jenkins usada nos e-mails |
| `RELATORIOS_URL` | URL pública dos relatórios |

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

### Desenvolvimento — imagens construídas localmente

```bash
docker compose up -d --build
docker compose ps
```

Serviços:

- Aplicação de testes: execução via Jenkins, sem porta pública
- Jenkins: `http://localhost:8080`
- Relatórios: `http://localhost:8081`
- PostgreSQL: acesso interno pelo runner

Para acompanhar os logs:

```bash
docker compose logs -f jenkins
docker compose logs -f playwright-runner
```

### Entrega — runner puxado do Docker Hub

Depois de publicar a imagem do runner:

```bash
docker compose -f docker-compose.hub.yml pull playwright-runner
docker compose -f docker-compose.hub.yml up -d
```

O Compose de entrega usa a imagem
`${DOCKERHUB_USER}/s07-playwright-runner:1.0.0`, enquanto o Jenkins continua sendo
construído pelo Dockerfile local. Assim o requisito de ter um container local e
outro vindo do Docker Hub é atendido.

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
4. Crie um job **Pipeline** apontando para o repositório Git e para o `Jenkinsfile`.
   A interface gráfica é usada apenas para o checkout/SCM; todas as etapas estão no
   `Jenkinsfile`.

### Etapas do pipeline

| Etapa | O que faz |
|---|---|
| Checkout | Limpa `/workspace` e faz checkout do repositório |
| Install | Executa `npm ci` no runner |
| Testes | Executa os 20 casos com Playwright |
| Cobertura | Valida o gate de 90% e gera `results/cobertura.md` |
| Build | Executa `tsc --noEmit`, cria `dist/` e empacota com `npm pack` |
| Artefatos | Publica `dist/**`, `results/**` e `playwright-report/**` no Jenkins |
| Histórico | Grava a execução no PostgreSQL e gera `relatorios/historico.html` |
| Notificação | Envia e-mail via `msmtp` com status, build, commit e links |

O pipeline usa `docker exec` no container `playwright-runner`, graças ao socket do
Docker montado no Jenkins (Docker-outside-of-Docker).

### Relatórios

- Playwright: `http://localhost:8081/playwright-report/index.html`
- Cobertura: `http://localhost:8081/cobertura.md`
- Histórico: `http://localhost:8081/historico.html`

## Docker Hub

Construa e publique a imagem do runner:

```bash
docker build -f docker/Dockerfile.playwright -t ${DOCKERHUB_USER}/s07-playwright-runner:1.0.0 .
docker push ${DOCKERHUB_USER}/s07-playwright-runner:1.0.0
```

Link da imagem: `https://hub.docker.com/r/${DOCKERHUB_USER}/s07-playwright-runner`
(substitua pelo usuário real do grupo após a publicação).

## Estrutura do projeto

```
.
├── docker/
│   ├── Dockerfile.jenkins
│   ├── Dockerfile.playwright
│   ├── jenkins/
│   │   ├── plugins.txt
│   │   └── msmtprc.template
│   ├── nginx/default.conf
│   └── scripts/
│       ├── jenkins-entrypoint.sh
│       └── notify.sh
├── docker-compose.yml
├── docker-compose.hub.yml
├── Jenkinsfile
├── pages/
├── tests/
├── fixtures/
├── scripts/
│   ├── test-coverage.js
│   └── store-result.js
├── docs/
│   ├── plano_de_testes.pdf
│   ├── matriz-rastreabilidade.md
│   └── plano-np2.md
├── .env.example
└── README.md
```

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
- **E-mail não enviado:** confira `GMAIL_USER`, `GMAIL_PASS` e
  `DESTINATARIO_EMAIL` no `.env`, recrie o Jenkins para regenerar o msmtp
  (`docker compose up -d --force-recreate jenkins`) e veja
  `docker compose logs jenkins`.
- **Runner não encontrado:** confirme `docker compose ps` e o nome
  `playwright-runner`.
- **Imagem do Hub não encontrada:** publique o runner antes de usar
  `docker-compose.hub.yml` ou use o `docker-compose.yml` para build local.
