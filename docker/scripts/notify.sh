#!/bin/bash
# ---------------------------------------------------------------------------
# Notificação de fim de pipeline via msmtp.
#
# Uso:
#   notify.sh <STATUS> <BUILD_URL> <DESTINATARIO>
#
# O destinatário nunca é fixo no código: vem do argumento ou da variável de
# ambiente DESTINATARIO_EMAIL, configurada no .env e repassada pelo Compose.
# ---------------------------------------------------------------------------
set -euo pipefail

STATUS="${1:-UNKNOWN}"
BUILD_URL="${2:-}"
TO="${3:-${DESTINATARIO_EMAIL:-}}"

if [[ -z "${TO}" ]]; then
    echo "[ERRO] Destinatário de e-mail não informado."
    echo "       Defina DESTINATARIO_EMAIL no .env ou passe como terceiro argumento."
    exit 1
fi

if ! command -v msmtp >/dev/null 2>&1; then
    echo "[ERRO] msmtp não encontrado na imagem do Jenkins."
    exit 1
fi

BUILD_NUMBER="${BUILD_NUMBER:-?}"
JOB_NAME="${JOB_NAME:-S07}"
GIT_COMMIT="${GIT_COMMIT:-}"
BUILD_DURATION="${BUILD_DURATION:-0}"
JENKINS_URL="${JENKINS_URL:-http://localhost:8080}"
RELATORIOS_URL="${RELATORIOS_URL:-http://localhost:8081}"
FROM_ADDRESS="${GMAIL_USER:-jenkins@localhost}"
COMMIT_SHORT="${GIT_COMMIT:0:8}"

if [[ -z "${COMMIT_SHORT}" ]]; then
    COMMIT_SHORT="—"
fi

DURATION_SECONDS=$(( BUILD_DURATION / 1000 ))
if (( DURATION_SECONDS >= 60 )); then
    DURATION="${DURATION_SECONDS}s ($(( DURATION_SECONDS / 60 ))m)"
else
    DURATION="${DURATION_SECONDS}s"
fi

case "${STATUS}" in
    SUCCESS)   COLOR="#047857" ;;
    UNSTABLE)  COLOR="#b45309" ;;
    *)         COLOR="#b91c1c" ;;
esac

BODY=$(cat <<HTML
From: ${FROM_ADDRESS}
To: ${TO}
Subject: [S07] Pipeline ${STATUS} - build #${BUILD_NUMBER}
Content-Type: text/html; charset=UTF-8

<!doctype html>
<html lang="pt-BR">
<body style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
  <h2 style="margin: 0 0 1rem; color: ${COLOR};">Pipeline ${STATUS}</h2>
  <p>O pipeline <strong>${JOB_NAME}</strong> terminou com o status
     <strong style="color: ${COLOR};">${STATUS}</strong>.</p>
  <table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
    <tr><td><strong>Build</strong></td><td>#${BUILD_NUMBER}</td></tr>
    <tr><td><strong>Commit</strong></td><td><code>${COMMIT_SHORT}</code></td></tr>
    <tr><td><strong>Duração</strong></td><td>${DURATION}</td></tr>
    <tr><td><strong>Jenkins</strong></td><td><a href="${BUILD_URL:-${JENKINS_URL}}">abrir build</a></td></tr>
    <tr><td><strong>Relatórios</strong></td><td><a href="${RELATORIOS_URL}/historico.html">histórico e cobertura</a></td></tr>
  </table>
  <p style="margin-top: 1.5rem; color: #6b7280; font-size: 0.9rem;">
    Mensagem automática gerada pelo pipeline S07.
  </p>
</body>
</html>
HTML
)

printf '%s\n' "${BODY}" | msmtp "${TO}"
echo "[OK] E-mail de notificação enviado para ${TO}."
