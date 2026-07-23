#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_dir="$(cd -- "${script_dir}/.." && pwd)"
cd "${repo_dir}"

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
contents_dir="${PM_TOOL_CONTENTS_DIR:-../pm-tool-contents}"
backup_dir="${contents_dir}/backups/${timestamp}"

mkdir -p "${backup_dir}"

docker compose exec -T db pg_dump -U "${POSTGRES_USER:-pm_tool}" "${POSTGRES_DB:-pm_tool}" > "${backup_dir}/database.sql"

if [ -d "${contents_dir}/uploads" ]; then
  tar -czf "${backup_dir}/uploads.tar.gz" -C "${contents_dir}" uploads
fi

echo "Backup erstellt: ${backup_dir}"
