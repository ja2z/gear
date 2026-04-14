#!/usr/bin/env bash
set -e

PSQL=/usr/local/opt/libpq/bin/psql
ENV_FILE="$(dirname "$0")/../backend/.env"

# Load DATABASE_URL from backend/.env
DATABASE_URL=$(grep -v '^#' "$ENV_FILE" | grep '^DATABASE_URL=' | head -1 | cut -d'=' -f2-)

if [[ -z "$DATABASE_URL" ]]; then
  echo "Error: DATABASE_URL not found in backend/.env"
  exit 1
fi

echo "=== Email Whitespace Audit ==="
echo ""

# Show affected rows
AFFECTED=$("$PSQL" "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM users WHERE email != trim(email);")
AFFECTED=$(echo "$AFFECTED" | tr -d ' ')

if [[ "$AFFECTED" -eq 0 ]]; then
  echo "No emails with leading/trailing whitespace found. Nothing to do."
  exit 0
fi

echo "Emails with whitespace padding ($AFFECTED row(s)):"
echo ""
"$PSQL" "$DATABASE_URL" -c \
  "SELECT id,
          '\"' || email || '\"'           AS email_raw,
          '\"' || trim(email) || '\"'     AS email_trimmed
   FROM users
   WHERE email != trim(email)
   ORDER BY last_name, first_name;"

echo ""
read -r -p "Proceed with trimming all $AFFECTED email(s)? (y/N): " answer
if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
  echo "Aborted. No changes written."
  exit 0
fi

"$PSQL" "$DATABASE_URL" -c \
  "UPDATE users SET email = trim(email) WHERE email != trim(email);"

echo ""
echo "Done. $AFFECTED email(s) updated."
