Projeto de testes automatizados ponta a ponta (E2E) desenvolvido com Playwright e TypeScript para a aplicação SauceDemo.

## Pré-requisitos

- Node.js (v22 ou superior)

## Instalação

1. Clone o repositório e acesse o diretório do projeto:

```bash
gh repo clone generoso28/s07--qualidade-gerencia
cd s07--qualidade-gerencia
```

2. Instale as dependências do projeto:

```bash
npm install
```

3. Instale os navegadores gerenciados pelo Playwright:

```bash
npx playwright install --with-deps
```

## Execução dos Testes

Os comandos abaixo estão configurados no arquivo package.json:

### 1. Executar todos os testes em modo headless

Executa os testes no terminal sem interface gráfica. Ideal para execução local rápida e pipelines de integração contínua (CI/CD):

```bash
npm test
```

### 2. Executar testes com navegador visível (headed)

Executa os testes abrindo a janela do navegador em tempo real para acompanhamento visual:

```bash
npm run test:headed
```

### 3. Apenas visualizar o último relatório gerado

Abre o relatório HTML gerado na última execução sem executar novamente os testes:

```bash
npm run report
```

### 4. Executar testes em modo interativo (UI Mode)
Abre a interface gráfica interativa do Playwright, permitindo visualizar a execução passo a passo, inspecionar seletores e depurar cenários:

```bash
npm run test:ui
```

## Estrutura do Projeto

- fixtures/: Massa de dados utilizada nos cenários de teste.
- pages/: Implementação do padrão Page Object Model (POM).
- tests/: Arquivos de especificação de testes automatizados.
- playwright.config.ts: Arquivo principal de configuração do Playwright.
- .github/workflows/: Pipeline de CI/CD para execução automática no GitHub Actions.

## Sobre uso de Inteligência Artificial
Utilizou-se ferramentas de Inteligência Artificial, Gemini e Antigravity, como fonte de pesquisa e auxílio nos seguintes moldes:
- Escolhida a ferramenta (Playwright) e o site que seria testado (Saucedemo), elaboramos um rascunho do plano de testes e, posteriormente, enviamos esse rascunho para que o Antigravity verificasse se o escopo era válido e sugerisse ajustes. Como objeto de resposta recebemos um arquivo de texto que analisamos e decidimos o que fazia sentido ou não entrar para o documento. 
- Ainda no âmbito da pesquisa, utilizou-se o Gemini para entender qual era a estrutura de diretórios padrão do Playwright (fixtures, pages, tests...) para que já iniciássemos os testes com a organização recomendada. [Histórico do chat](https://share.gemini.google/bbIefiIs8GnF)
- Por fim, este readme, com excessão dessa parte final referente ao uso de IA, foi gerado integralmente com a ferramenta Antigravity, da Google.

Obs.: Todo conteúdo sugerido pelas ferramentas foram revisados e manipulados para que se garantisse a qualidade da entrega final. O Antigravity não possui opção de exportação de conversas, dessa forma, para as interações com esta ferramenta segue o link com as capturas de tela do chat. [Capturas de tela - Antigravity](https://drive.google.com/drive/folders/1awJr1E-LtrqUhCBxQNGmG5psjrLZJS81?usp=sharing)
