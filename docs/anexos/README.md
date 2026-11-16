# Anexo — Registro Bruto da Sessão de IA

Este diretório guarda as **evidências de uso de IA** no projeto. O JSON da sessão de
02/11/2026 é o registro bruto exportado diretamente pelo OpenCode; a sessão atual de
implementação/validação está documentada na seção 5.

| Arquivo | Descrição |
| --- | --- |
| `sessao-ia-2026-11-02.json` | Export integral da sessão (1,2 MB, 251 mensagens) |
| `transcricao-sessao-ia.md` | Transcrição legível do diálogo |
| `README.md` | Este documento |

O JSON é a evidência primária. A transcrição legível é derivada dele e está em
`docs/anexos/transcricao-sessao-ia.md`. O resumo do uso de IA no projeto está na
seção correspondente do `README.md` principal.

---

## 1. Proveniência

| Item | Valor |
| --- | --- |
| Sessão | `ses_e62ce1243ffehUBPioGsJzNz8C` |
| Título | Análise do Projeto_S07_NP2 |
| Início | 02/11/2026 13:57:37 |
| Última atualização no export | 02/11/2026 19:46:12 |
| Modelo | DeepSeek V4.1 Flash Free (`opencode/deepseek-v4.1-flash-free`) |
| Ambiente | OpenCode (agente de código em terminal) |
| Resultado | `succeeded` |
| Tokens | 312.526 entrada · 76.009 saída · 73.784 raciocínio |
| Custo | US$ 0,00 |
| Mensagens | 251 |
| Tamanho | 1.209.707 bytes |

---

## 2. Integridade

```
SHA-256  2c8a651032c4485acf571117b7905119dbdc5c146289c8349e15927a8cb99ddb
```

Para verificar que o arquivo não foi alterado:

```bash
sha256sum docs/anexos/sessao-ia-2026-11-02.json
```

Qualquer edição manual no JSON muda o hash — é o que permite tratar o arquivo como evidência e
não como narrativa.

---

## 3. Formato do arquivo

O JSON tem duas chaves:

```jsonc
{
  "info":     { /* metadados da sessão: modelo, tokens, custo, tempos */ },
  "messages": [ /* 251 registros, em ordem cronológica */ ]
}
```

Cada item de `messages` tem um campo `type`:

| `type` | Significado | Quantidade |
| --- | --- | --- |
| `user` | Mensagem do usuário | 21 |
| `assistant` | Resposta do agente (texto, ferramentas e raciocínio) | 198 |
| `idle` | Evento de estado (agente ocioso) | 20 |
| `synthetic` | Instruções internas do ambiente (system reminders) | 6 |
| `agent-switched` | Troca de agente (plan ↔ build) | 5 |
| `compaction` | Resumo automático de contexto | 1 |

Nas mensagens `assistant`, o campo `content` é uma lista de blocos:

| Bloco | Conteúdo |
| --- | --- |
| `text` | Resposta em linguagem natural |
| `tool` | Chamada de ferramenta com entrada, saída e status |
| `reasoning` | Raciocínio interno do modelo |

É nesse arquivo que estão as **saídas de ferramenta** omitidas da transcrição legível — por
exemplo, a saída de `npx playwright test`, os logs do `docker build` e as respostas HTTP do
Jenkins.

---

## 4. Como consultar

```bash
# Contar mensagens
python3 -c "import json;d=json.load(open('docs/anexos/sessao-ia-2026-11-02.json'));print(len(d['messages']))"

# Listar apenas as mensagens do usuário
jq -r '.messages[] | select(.type=="user") | .text' docs/anexos/sessao-ia-2026-11-02.json

# Ver as ferramentas executadas em um turno
jq -r '.messages[] | select(.type=="assistant") | .content[] | select(.type=="tool") | .name' \
  docs/anexos/sessao-ia-2026-11-02.json | sort | uniq -c | sort -rn

# Metadados da sessão
jq '.info' docs/anexos/sessao-ia-2026-11-02.json
```

---

## 5. Sessão atual — implementação e validação do NP2

Esta seção registra a sessão usada para analisar o projeto, implementar a camada
Docker/Jenkins e validar o pipeline. Os números foram consultados no OpenCode em
16/11/2026 e podem crescer enquanto a sessão estiver ativa.

| Item | Valor |
| --- | --- |
| Sessão | `ses_e4dbfd60effe6kp4Of9Us4wEPA` |
| Título | Análise do projeto |
| Início | 06/11/2026 16:05 (UTC-3) |
| Última atualização | 16/11/2026 20:55 (UTC-3) |
| Modelo | DeepSeek V4.1 Flash (`deepseek/deepseek-flash`, variante `max`) |
| Agente | `build` |
| Mensagens | 314 no momento da consulta |
| Tipos de mensagem | 232 `assistant`, 37 `user`, 36 `idle`, 7 `synthetic`, 2 `system`, 2 `agent-switched` |
| Tokens de entrada | 767.120 |
| Tokens de saída | 91.123 |
| Tokens de raciocínio | 248.573 |
| Cache lido | 76.335.232 |
| Custo | US$ 0,5479 |
| Resultado | Em andamento |
| Escopo | Análise do projeto, Docker Compose, Jenkins, correções e validação |

O JSON bruto desta sessão **não foi versionado** porque o diálogo contém
credenciais de teste (Gmail/Jenkins) e dados locais do ambiente. Para publicá-lo
como evidência, é necessário exportar e sanitizar as credenciais antes de fazer
o commit.
