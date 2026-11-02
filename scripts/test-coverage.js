#!/usr/bin/env node
'use strict';

/**
 * Gate de cobertura de testes.
 *
 * Lê o relatório JSON do Playwright (results/e2e.json), classifica cada caso
 * mapeado no plano de testes e calcula:
 *
 *   cobertura = casos cobertos / casos mapeados * 100
 *
 * Um caso marcado com test.fail() (defeito conhecido do SUT) NÃO conta como
 * coberto: o comportamento esperado não foi entregue pela aplicação.
 *
 * Saídas:
 *   results/cobertura.md    -> relatório legível (artefato do Jenkins)
 *   results/cobertura.json  -> dados para o histórico no Postgres
 *
 * Uso:
 *   node scripts/test-coverage.js [threshold]
 *
 * Encerra com código 1 quando a cobertura fica abaixo do threshold.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_FILE = path.join(ROOT, 'results', 'e2e.json');
const OUTPUT_MD = path.join(ROOT, 'results', 'cobertura.md');
const OUTPUT_JSON = path.join(ROOT, 'results', 'cobertura.json');

const THRESHOLD = Number(process.argv[2] ?? process.env.MIN_COVERAGE ?? 90);

/** Severidade usada ao consolidar o mesmo caso em múltiplos projetos. */
const SEVERITY = {
  aprovado: 0,
  'defeito conhecido': 1,
  ignorado: 2,
  instavel: 3,
  falha: 4,
};

function collectSpecs(suite, acc = []) {
  for (const spec of suite.specs ?? []) {
    acc.push(spec);
  }
  for (const child of suite.suites ?? []) {
    collectSpecs(child, acc);
  }
  return acc;
}

/**
 * Classifica um spec a partir do status real e do status esperado.
 *
 * status "expected" + expectedStatus "failed" => test.fail() (defeito conhecido)
 * status "expected" + expectedStatus "passed" => aprovado
 */
function classifyTest(test) {
  const status = test.status;
  const expected = test.expectedStatus;

  if (status === 'skipped') return 'ignorado';
  if (status === 'unexpected') return 'falha';
  if (status === 'flaky') return 'instavel';
  if (expected === 'failed') return 'defeito conhecido';
  return 'aprovado';
}

function classifySpec(spec) {
  const tests = spec.tests ?? [];
  if (tests.length === 0) return 'ignorado';

  return tests
    .map(classifyTest)
    .reduce((worst, current) =>
      SEVERITY[current] > SEVERITY[worst] ? current : worst
    );
}

function extractCaseId(title) {
  const match = /^(TC-\d+)/i.exec(title ?? '');
  return match ? match[1].toUpperCase() : '—';
}

function fail(message) {
  console.error(`\n[ERRO] ${message}\n`);
  process.exit(1);
}

function main() {
  if (!fs.existsSync(RESULTS_FILE)) {
    fail(
      `Relatório do Playwright não encontrado em ${path.relative(ROOT, RESULTS_FILE)}.\n` +
        '        Execute "npx playwright test" antes do gate de cobertura.'
    );
  }

  let report;
  try {
    report = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
  } catch (error) {
    fail(`Não foi possível ler ${RESULTS_FILE}: ${error.message}`);
  }

  const specs = (report.suites ?? []).flatMap((suite) => collectSpecs(suite));

  if (specs.length === 0) {
    fail('Nenhum caso de teste encontrado no relatório do Playwright.');
  }

  // Consolida por caso (arquivo + título), mantendo o pior status.
  const byCase = new Map();
  for (const spec of specs) {
    const key = `${spec.file ?? '?'}::${spec.title}`;
    const status = classifySpec(spec);
    const previous = byCase.get(key);
    if (!previous || SEVERITY[status] > SEVERITY[previous.status]) {
      byCase.set(key, {
        id: extractCaseId(spec.title),
        title: spec.title,
        file: spec.file ?? '—',
        status,
      });
    }
  }

  const cases = [...byCase.values()].sort((a, b) =>
    a.id.localeCompare(b.id, 'pt-BR', { numeric: true })
  );

  const total = cases.length;
  const count = (status) => cases.filter((c) => c.status === status).length;

  const aprovados = count('aprovado');
  const instaveis = count('instavel');
  const defeitos = count('defeito conhecido');
  const ignorados = count('ignorado');
  const falhas = count('falha');

  const cobertos = aprovados + instaveis;
  const cobertura = (cobertos / total) * 100;
  const aprovado = cobertura >= THRESHOLD;

  const resultado = {
    geradoEm: new Date().toISOString(),
    threshold: THRESHOLD,
    total,
    cobertos,
    aprovados,
    instaveis,
    defeitosConhecidos: defeitos,
    ignorados,
    falhas,
    cobertura: Number(cobertura.toFixed(2)),
    aprovado,
    casos: cases,
  };

  fs.mkdirSync(path.dirname(OUTPUT_MD), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(resultado, null, 2)}\n`);

  const linhas = [
    '# Cobertura de Testes',
    '',
    `Gerado em: ${resultado.geradoEm}`,
    `Threshold mínimo: ${THRESHOLD}%`,
    '',
    '## Resumo',
    '',
    '| Métrica | Valor |',
    '| --- | --- |',
    `| Casos mapeados | ${total} |`,
    `| Casos cobertos | ${cobertos} |`,
    `| Aprovados | ${aprovados} |`,
    `| Instáveis (aprovados com retry) | ${instaveis} |`,
    `| Defeitos conhecidos do SUT | ${defeitos} |`,
    `| Ignorados | ${ignorados} |`,
    `| Falhas | ${falhas} |`,
    `| **Cobertura** | **${cobertura.toFixed(2)}%** |`,
    `| Resultado do gate | ${aprovado ? 'APROVADO' : 'REPROVADO'} |`,
    '',
    '## Casos',
    '',
    '| Caso | Status | Arquivo |',
    '| --- | --- | --- |',
    ...cases.map((c) => `| ${c.id} | ${c.status} | \`${c.file}\` |`),
    '',
  ];

  fs.writeFileSync(OUTPUT_MD, linhas.join('\n'));

  console.log('=================================================');
  console.log('  COBERTURA DE TESTES');
  console.log('=================================================');
  console.log(`  Casos mapeados : ${total}`);
  console.log(`  Casos cobertos : ${cobertos}`);
  console.log(`  Defeitos       : ${defeitos}`);
  console.log(`  Falhas         : ${falhas}`);
  console.log(`  Cobertura      : ${cobertura.toFixed(2)}% (mínimo ${THRESHOLD}%)`);
  console.log(`  Gate           : ${aprovado ? 'APROVADO' : 'REPROVADO'}`);
  console.log('=================================================');

  if (!aprovado) {
    console.error(
      `\n[FALHA] Cobertura de ${cobertura.toFixed(2)}% abaixo do mínimo de ${THRESHOLD}%.\n`
    );
    process.exit(1);
  }
}

main();
