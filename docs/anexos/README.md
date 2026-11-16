# Anexo — Registro Bruto da Sessão de IA

Este diretório guarda a **evidência primária** do uso de IA no projeto: o registro completo da
sessão, exportado diretamente pelo OpenCode.

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
| Tamanho | 1.194.247 bytes |

---

## 2. Integridade

```
SHA-256  68133a53e08623a56cb6b93674b4799623123ac09c23c83c7856dfe9db282c1d
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
