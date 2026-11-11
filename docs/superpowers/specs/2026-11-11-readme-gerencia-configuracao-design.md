# README — Gerência de Configuração e Evolução de Software (desenho)

## Intenção

Reescrever o `README.md` para refletir o estado real do projeto depois do NP2 e
explicitar a camada de **gerência de configuração e evolução de software**: controle
de versão, configuração como código, CI/CD, qualidade/rastreabilidade, gestão de
mudanças e evolução.

## Por quê

O README atual descreve uma arquitetura que não existe mais (dois compose, runner
buildado localmente, 4 containers) e não cobre a dimensão de gerência de software da
disciplina. A entrega fica com evidências inconsistentes entre README, plano e CI.

## Goals

- README verdadeiro em relação ao working tree atual.
- Uma seção de topo "Gerência de Configuração e Evolução de Software".
- CI alinhado ao que o README passa a documentar.

## Non-goals

- Não alterar `tests/`, `pages/` nem `fixtures/`.
- Não alterar `docker/scripts/notify.sh` (data/hora), a métrica do gate de cobertura
  nem o schema do banco.
- Não reescrever `docs/plano-np2.md`.
- Não restaurar `docker-compose.hub.yml` nem `docs/matriz-rastreabilidade.md`.

## Constraints

- Um único `docker-compose.yml`; runner puxado de
  `mgazzolaa/s07-playwright-runner:1.0.0` (`pull_policy: always`) e Jenkins buildado
  localmente.
- 5 containers: `jenkins`, `playwright-runner`, `postgres`, `relatorio-server`,
  `mailpit`.
- E-mail selecionado por `MAIL_TRANSPORT` (`mailpit` padrão, `gmail` para envio real).
- Pipeline validado: 20/20 testes, 95% de cobertura, gate aprovado.

## Approaches consideradas

1. **Dois compose alinhados** — restaurar `docker-compose.hub.yml` e voltar o principal
   ao build local. Rejeitada pelo grupo: quer um compose só.
2. **Um compose só (escolhida)** — documentar Jenkins local + runner do Hub no mesmo
   arquivo; remover referências ao compose de entrega.
3. **Só documentar sem tocar no CI** — rejeitada: deixaria README e Jenkinsfile com a
   ordem de etapas errada e variáveis órfãs.

## Como (decidido)

- README: corrigir visão geral, arquitetura, variáveis, execução, Jenkins, etapas,
  relatórios, Docker Hub, árvore de arquivos e troubleshooting; adicionar a seção de
  gerência de configuração.
- `Jenkinsfile`: gravar histórico **antes** de notificar (o link do e-mail passa a
  funcionar).
- `.env.example`: remover `DOCKERHUB_USER` (imagem fixa) e a linha solta `seu-email`.
- Remover do README as referências a `docker-compose.hub.yml` e
  `docs/matriz-rastreabilidade.md` (arquivos apagados).

## O que fica com o construtor

- Redação final da seção de gerência (o plano fixa o conteúdo mínimo).
- Revisão de tom/consistência do restante do README após as trocas.
