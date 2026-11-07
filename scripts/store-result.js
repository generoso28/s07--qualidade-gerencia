#!/usr/bin/env node
'use strict';

/**
 * Persiste o resultado da execução no PostgreSQL e gera o histórico HTML
 * servido pelo container `relatorio-server`.
 *
 * Variáveis de ambiente esperadas (injetadas pelo Jenkinsfile):
 *   BUILD_NUMBER, BUILD_STATUS, GIT_COMMIT, BUILD_DURATION, BUILD_URL
 *   PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 *   RELATORIOS_DIR (opcional; padrão: /relatorios)
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.resolve(__dirname, '..');
const RESULTS_DIR = path.join(ROOT, 'results');
const RELATORIOS_DIR = process.env.RELATORIOS_DIR || '/relatorios';
const COVERAGE_FILE = path.join(RESULTS_DIR, 'cobertura.json');

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    console.error(`[AVISO] Não foi possível ler ${file}: ${error.message}`);
    return null;
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(Number(ms) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function copyIfExists(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyDirIfExists(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.rmSync(destination, { recursive: true, force: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS execucoes (
      id            serial PRIMARY KEY,
      build_number  text NOT NULL,
      status        text NOT NULL,
      commit_sha    text,
      duracao_ms    bigint,
      cobertura     numeric(5,2),
      casos_total   integer,
      casos_aprovados integer,
      executado_em  timestamptz NOT NULL DEFAULT now()
    )
  `);
}

function renderHistory(rows) {
  const linhas = rows
    .map((row) => {
      const status = String(row.status || 'UNKNOWN');
      const classe = status === 'SUCCESS' ? 'ok' : status === 'UNSTABLE' ? 'warn' : 'fail';
      const cobertura = row.cobertura === null ? '—' : `${Number(row.cobertura).toFixed(2)}%`;
      const casos = row.casos_total === null ? '—' : `${row.casos_aprovados ?? 0}/${row.casos_total}`;
      const commit = row.commit_sha ? String(row.commit_sha).slice(0, 8) : '—';
      const data = row.executado_em
        ? new Date(row.executado_em).toLocaleString('pt-BR')
        : '—';
      return `
        <tr>
          <td>#${escapeHtml(row.build_number)}</td>
          <td class="${classe}">${escapeHtml(status)}</td>
          <td>${cobertura}</td>
          <td>${casos}</td>
          <td><code>${escapeHtml(commit)}</code></td>
          <td>${formatDuration(row.duracao_ms)}</td>
          <td>${escapeHtml(data)}</td>
        </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>S07 — Histórico de execuções</title>
  <style>
    :root { color-scheme: light; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    body { margin: 0; padding: 2rem; background: #f5f7fa; color: #1f2937; }
    main { max-width: 1100px; margin: 0 auto; background: #fff; padding: 1.5rem 2rem; border-radius: 12px; box-shadow: 0 8px 30px rgba(15, 23, 42, .08); }
    h1 { margin-top: 0; font-size: 1.4rem; }
    p { color: #4b5563; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: .65rem .75rem; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: .92rem; }
    th { background: #f9fafb; font-size: .8rem; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
    tr:hover td { background: #f9fafb; }
    code { background: #f3f4f6; padding: .1rem .3rem; border-radius: 4px; }
    .ok { color: #047857; font-weight: 600; }
    .warn { color: #b45309; font-weight: 600; }
    .fail { color: #b91c1c; font-weight: 600; }
    .links { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.25rem; }
    .links a { color: #1d4ed8; text-decoration: none; }
    .links a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <main>
    <h1>S07 — Histórico de execuções</h1>
    <p>Últimas execuções registradas pelo pipeline Jenkins.</p>
    <table>
      <thead>
        <tr>
          <th>Build</th><th>Status</th><th>Cobertura</th><th>Casos</th>
          <th>Commit</th><th>Duração</th><th>Executado em</th>
        </tr>
      </thead>
      <tbody>${linhas || '<tr><td colspan="7">Nenhuma execução registrada.</td></tr>'}</tbody>
    </table>
    <div class="links">
      <a href="cobertura.md">Relatório de cobertura</a>
      <a href="playwright-report/index.html">Relatório E2E (Playwright)</a>
    </div>
  </main>
</body>
</html>
`;
}

async function main() {
  const coverage = readJson(COVERAGE_FILE);
  if (!coverage) {
    console.error(`[ERRO] Arquivo de cobertura não encontrado: ${COVERAGE_FILE}`);
    process.exit(1);
  }

  const client = new Client({
    host: process.env.PGHOST || 'postgres',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 's07',
    password: process.env.PGPASSWORD || '',
    database: process.env.PGDATABASE || 's07',
  });

  await client.connect();
  try {
    await ensureSchema(client);

    await client.query(
      `INSERT INTO execucoes
         (build_number, status, commit_sha, duracao_ms, cobertura,
          casos_total, casos_aprovados)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        process.env.BUILD_NUMBER || 'local',
        process.env.BUILD_STATUS || 'UNKNOWN',
        process.env.GIT_COMMIT || null,
        Number(process.env.BUILD_DURATION || 0),
        coverage.cobertura ?? null,
        coverage.total ?? null,
        coverage.cobertos ?? null,
      ]
    );

    const { rows } = await client.query(
      `SELECT build_number, status, commit_sha, duracao_ms, cobertura,
              casos_total, casos_aprovados, executado_em
         FROM execucoes
        ORDER BY executado_em DESC, id DESC
        LIMIT 20`
    );

    fs.mkdirSync(RELATORIOS_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(RELATORIOS_DIR, 'historico.html'),
      renderHistory(rows),
      'utf8'
    );

    copyIfExists(
      path.join(RESULTS_DIR, 'cobertura.md'),
      path.join(RELATORIOS_DIR, 'cobertura.md')
    );
    copyIfExists(
      path.join(RESULTS_DIR, 'cobertura.json'),
      path.join(RELATORIOS_DIR, 'cobertura.json')
    );
    copyDirIfExists(
      path.join(ROOT, 'playwright-report'),
      path.join(RELATORIOS_DIR, 'playwright-report')
    );

    console.log(
      `[OK] Resultado do build #${process.env.BUILD_NUMBER || 'local'} ` +
        `registrado. Histórico: ${path.join(RELATORIOS_DIR, 'historico.html')}`
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[ERRO] Falha ao registrar o resultado: ${error.message}`);
  process.exit(1);
});
