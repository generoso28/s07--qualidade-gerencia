# Matriz de Rastreabilidade — Plano de Testes × Suíte Automatizada

Documento de apoio ao NP2. Relaciona cada caso do plano de testes (`docs/plano_de_testes.pdf`)
com a especificação automatizada correspondente e com o resultado obtido na execução de
referência.

- **Total de casos mapeados:** 20
- **Casos cobertos:** 19
- **Defeitos conhecidos do SUT:** 1 (TC-020)
- **Cobertura de testes:** 95%
- **Gate mínimo:** 90% (`scripts/test-coverage.js`)

---

## 1. Autenticação e Sessão

Arquivo: `tests/auth.spec.ts` · Page Object: `pages/LoginPage.ts`, `pages/InventoryPage.ts`

| Caso | Funcionalidade | Dados de entrada | Resultado esperado | Status |
| --- | --- | --- | --- | --- |
| TC-001 | Login com credenciais válidas | `standard_user` / `secret_sauce` | Redireciona para `/inventory.html` e exibe o título "Products" | Aprovado |
| TC-002 | Login com usuário com latência | `performance_glitch_user` / `secret_sauce` | Carregamento assíncrono conclui sem estourar timeout | Aprovado |
| TC-003 | Logout | Sessão ativa | Menu lateral → Logout → retorna para a tela de login (`/`) | Aprovado |
| TC-011 | Login com senha incorreta | `standard_user` / `senha_invalida_123` | Mensagem "Username and password do not match any user in this service" | Aprovado |
| TC-012 | Login com usuário bloqueado | `locked_out_user` / `secret_sauce` | Mensagem "Sorry, this user has been locked out." | Aprovado |
| TC-013 | Login com campos vazios | `""` / `""` | Mensagem "Username is required" | Aprovado |
| TC-014 | Retroceder navegador após logout | Sessão encerrada | Acesso a `/inventory.html` pelo histórico é bloqueado | Aprovado |

**Técnica aplicada:** partições de equivalência em credenciais (classe válida, senha inválida,
usuário bloqueado, campos vazios) e verificação de controle de sessão.

---

## 2. Catálogo e Carrinho

Arquivo: `tests/cart.spec.ts` · Page Objects: `pages/InventoryPage.ts`, `pages/CartPage.ts`

| Caso | Funcionalidade | Dados de entrada | Resultado esperado | Status |
| --- | --- | --- | --- | --- |
| TC-004 | Adicionar um item pela vitrine | `Sauce Labs Backpack` | Botão muda para "Remove" e o badge exibe `1` | Aprovado |
| TC-005 | Adicionar múltiplos itens | Backpack, Bike Light, Bolt T-Shirt | Três botões "Remove" e badge `3` | Aprovado |
| TC-006 | Remover item pela vitrine | Backpack já adicionado | Botão volta para "Add to cart" e o badge é atualizado | Aprovado |
| TC-007 | Ordenar por preço (menor → maior) | `lohi` | Lista de preços em ordem crescente | Aprovado |
| TC-008 | Ordenar por nome (Z → A) | `za` | Lista de nomes em ordem alfabética decrescente | Aprovado |
| TC-010 | Remover item dentro do carrinho | Backpack no carrinho | Item sai da lista e o badge é atualizado | Aprovado |
| TC-015 | Bypass de URL — `/inventory.html` | Sem sessão | Erro "You can only access '/inventory.html' when you are logged in." | Aprovado |
| TC-016 | Bypass de URL — `/cart.html` | Sem sessão | Erro "You can only access '/cart.html' when you are logged in." | Aprovado |

**Técnica aplicada:** análise de valores-limite no carrinho (0, 1 e N itens), verificação de
ordenação pelo primeiro e último elemento e controle de acesso por rota.

---

## 3. Checkout

Arquivo: `tests/checkout.spec.ts` · Page Objects: `pages/CartPage.ts`, `pages/CheckoutPage.ts`

| Caso | Funcionalidade | Dados de entrada | Resultado esperado | Status |
| --- | --- | --- | --- | --- |
| TC-009 | Fluxo completo de checkout | Lucas / Silva / 37540-000 | Avança até `/checkout-complete.html` com "Thank you for your order!" | Aprovado |
| TC-017 | Checkout sem First Name | `""` / Silva / 37540-000 | Mensagem "First Name is required" e permanência no Step 1 | Aprovado |
| TC-018 | Checkout sem Last Name | Lucas / `""` / 37540-000 | Mensagem "Last Name is required" e permanência no Step 1 | Aprovado |
| TC-019 | Checkout sem Postal Code | Lucas / Silva / `""` | Mensagem "Postal Code is required" e permanência no Step 1 | Aprovado |
| TC-020 | Campos preenchidos apenas com espaços | `"   "` / `"   "` / `"   "` | Deveria exigir os campos e permanecer no Step 1 | **Defeito conhecido** |

**Técnica aplicada:** omissão individual de cada campo obrigatório e submissão de valores
compostos exclusivamente por espaços em branco.

---

## 4. Defeito conhecido — TC-020

### Descrição

O SauceDemo **não aplica `trim`** nos campos `First Name`, `Last Name` e `Postal Code`.
Valores compostos apenas por espaços são tratados como preenchimento válido, e o fluxo avança
indevidamente para `/checkout-step-two.html`.

### Evidência

```
Error: expect(page).toHaveURL(expected) failed
Expected pattern: /.*checkout-step-one\.html/
Received string:  "https://www.saucedemo.com/checkout-step-two.html"
```

Artefatos da execução: `test-results/.../test-failed-1.png` e `test-results/.../trace.zip`.

### Tratamento

O caso é marcado com `test.fail(true, '...')` no `tests/checkout.spec.ts`:

- a execução fica verde (não quebra a pipeline por um bug de terceiro);
- o caso é reportado como **expected failure**;
- o gate de cobertura **não o contabiliza como coberto**, preservando os 95% reais;
- se o SUT corrigir o comportamento, o caso vira *unexpected pass* e o build falha,
  sinalizando a mudança.

---

## 5. Rastreabilidade com o gate de cobertura

O `scripts/test-coverage.js` lê `results/e2e.json` e classifica cada caso:

| Classificação | Critério | Conta como coberto? |
| --- | --- | --- |
| `aprovado` | `status = expected` e `expectedStatus = passed` | Sim |
| `instavel` | `status = flaky` (passou após retry) | Sim |
| `defeito conhecido` | `status = expected` e `expectedStatus = failed` | Não |
| `ignorado` | `status = skipped` | Não |
| `falha` | `status = unexpected` | Não |

```
cobertura = (aprovados + instáveis) / casos mapeados × 100
```

Resultado da execução de referência:

```
Casos mapeados : 20
Casos cobertos : 19
Defeitos       : 1
Falhas         : 0
Cobertura      : 95.00% (mínimo 90%)
Gate           : APROVADO
```

Artefatos gerados: `results/cobertura.md` e `results/cobertura.json`.
