#!/bin/bash
# ---------------------------------------------------------------------------
# Entrypoint do container Jenkins.
#
# Responsabilidades:
#   1. Gerar /etc/msmtprc a partir do template, injetando as credenciais que
#      chegam por variável de ambiente (nunca gravadas na imagem).
#   2. Ajustar as permissões do volume de relatórios.
#   3. Ajustar a permissão do socket do Docker (DooD).
#   4. Iniciar o Jenkins como usuário `jenkins` (não como root).
# ---------------------------------------------------------------------------
set -euo pipefail

echo "=========================================="
echo "  S07 — Iniciando container Jenkins"
echo "=========================================="

# Escapa caracteres especiais para uso seguro no sed
sed_escape() {
    printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'
}

# ---------------------------------------------------------------------------
# 1. E-mail (msmtp)
# ---------------------------------------------------------------------------
if [[ -n "${GMAIL_USER:-}" && -n "${GMAIL_PASS:-}" ]]; then
    USER_ESCAPED="$(sed_escape "${GMAIL_USER}")"
    PASS_ESCAPED="$(sed_escape "${GMAIL_PASS}")"

    sed -e "s|GMAIL_USER_PLACEHOLDER|${USER_ESCAPED}|g" \
        -e "s|GMAIL_PASS_PLACEHOLDER|${PASS_ESCAPED}|g" \
        /etc/msmtprc.template > /etc/msmtprc

    chown jenkins:jenkins /etc/msmtprc
    chmod 600 /etc/msmtprc
    echo "[OK] /etc/msmtprc configurado."
else
    echo "[AVISO] GMAIL_USER/GMAIL_PASS não definidos."
    echo "        O envio de e-mail ficará indisponível até que sejam configurados."
fi

# ---------------------------------------------------------------------------
# 2. Volumes compartilhados
#
# O volume `workspace` é escrito pelo Jenkins (UID 1000) e pelo runner, que usa
# o usuário `ubuntu` (também UID 1000) na imagem Playwright. Garantir o dono
# aqui evita arquivos de root que o Jenkins não conseguiria remover no build
# seguinte (deleteDir).
# ---------------------------------------------------------------------------
mkdir -p /relatorios /workspace
chown -R jenkins:jenkins /relatorios /workspace
chmod 755 /relatorios
echo "[OK] Permissões de /relatorios e /workspace ajustadas."

# ---------------------------------------------------------------------------
# 3. Socket do Docker (Docker-outside-of-Docker)
# ---------------------------------------------------------------------------
if [[ -S /var/run/docker.sock ]]; then
    chmod 666 /var/run/docker.sock
    echo "[OK] Permissão do socket do Docker ajustada."
else
    echo "[AVISO] /var/run/docker.sock não encontrado."
    echo "        Verifique o volume no docker-compose.yml."
fi

# ---------------------------------------------------------------------------
# 4. Inicia o Jenkins como usuário jenkins
# ---------------------------------------------------------------------------
echo "[INFO] Iniciando Jenkins..."
exec gosu jenkins /usr/bin/tini -- /usr/local/bin/jenkins.sh "$@"
