#!/usr/bin/env bash
# Skapar pipelinens identitet i Azure (M6): en app registration med federerad identitet (OIDC),
# Contributor på resursgruppen – och inget lösenord. Körs EN gång, av en människa, efter skapa-staging.sh.
#
#   az login && gh auth status
#   REPO=<ägare>/<repo> RG=<resursgrupp> ./infra/azure/identitet.sh
#
# Azure litar på en token som GitHub signerar åt jobbet – bara om subject är exakt
# repo:<ägare>/<repo>:environment:azure-staging. Därför är id:na variabler, inte secrets.
# Går att köra om: det som redan finns skapas inte igen.
set -euo pipefail

: "${REPO:?Sätt REPO=<ägare>/<repo>}"
: "${RG:?Sätt RG=<resursgruppen från skapa-staging.sh>}"
APP="${APP:-utpost-staging}"
GH_ENV="${GH_ENV:-azure-staging}"
ISSUER="https://token.actions.githubusercontent.com"

# Repots exakta namn och id:n från GitHub (subjectet är skiftlägeskänsligt).
FULL_NAME="$(gh api "repos/${REPO}" --jq .full_name)"
REPO_ID="$(gh api "repos/${REPO}" --jq .id)"
OWNER_ID="$(gh api "repos/${REPO}" --jq .owner.id)"
OWNER="${FULL_NAME%%/*}"
NAME="$(echo "github-${FULL_NAME//\//-}-${GH_ENV}" | tr '[:upper:]' '[:lower:]')"

SUB_ID="$(az account show --query id --output tsv)"
TENANT_ID="$(az account show --query tenantId --output tsv)"
RG_ID="$(az group show --name "${RG}" --query id --output tsv)"
FQDN="$(az containerapp show --name "${APP}" --resource-group "${RG}" --query properties.configuration.ingress.fqdn --output tsv)"

echo "→ app registration ${NAME}"
CLIENT_ID="$(az ad app list --display-name "${NAME}" --query "[0].appId" --output tsv)"
if [ -z "${CLIENT_ID}" ]; then
  CLIENT_ID="$(az ad app create --display-name "${NAME}" --query appId --output tsv)"
fi
az ad sp show --id "${CLIENT_ID}" --output none 2>/dev/null || az ad sp create --id "${CLIENT_ID}" --output none
SP_ID="$(az ad sp show --id "${CLIENT_ID}" --query id --output tsv)"

# Två subject: klassiskt (ägare/repo) och med id:n (ägare@id/repo@id) – GitHub skickar ett av dem.
echo "→ federerad identitet för miljön ${GH_ENV}"
add_cred() {
  local cred_name="$1" subject="$2"
  if [ -z "$(az ad app federated-credential list --id "${CLIENT_ID}" --query "[?name=='${cred_name}'].name" --output tsv)" ]; then
    az ad app federated-credential create --id "${CLIENT_ID}" --output none --parameters \
      "{\"name\":\"${cred_name}\",\"issuer\":\"${ISSUER}\",\"subject\":\"${subject}\",\"audiences\":[\"api://AzureADTokenExchange\"]}"
  fi
  echo "  Subject: ${subject}"
}
add_cred "${GH_ENV}" "repo:${FULL_NAME}:environment:${GH_ENV}"
add_cred "${GH_ENV}-id" "repo:${OWNER}@${OWNER_ID}/${FULL_NAME#*/}@${REPO_ID}:environment:${GH_ENV}"

# Rollen på resursgruppen – inte på prenumerationen. Nyskapade service principals syns inte direkt.
echo "→ Contributor på ${RG}"
for i in 1 2 3 4 5 6; do
  if [ -n "$(az role assignment list --assignee "${SP_ID}" --scope "${RG_ID}" --role Contributor --query "[0].id" --output tsv 2>/dev/null)" ]; then
    break
  fi
  if az role assignment create --assignee-object-id "${SP_ID}" --assignee-principal-type ServicePrincipal \
       --role Contributor --scope "${RG_ID}" --output none 2>/dev/null; then
    break
  fi
  if [ "${i}" = 6 ]; then echo "FEL: rolltilldelningen gick inte igenom." >&2; exit 1; fi
  echo "  väntar 10 s, försök ${i}/6"
  sleep 10
done

echo
echo "Klart. Kör de här sju raderna (miljön på GitHub + sex variabler, inga secrets):"
echo
echo "gh api --method PUT repos/${FULL_NAME}/environments/${GH_ENV} --silent"
echo "gh variable set AZURE_CLIENT_ID --env ${GH_ENV} --repo ${FULL_NAME} --body ${CLIENT_ID}"
echo "gh variable set AZURE_TENANT_ID --env ${GH_ENV} --repo ${FULL_NAME} --body ${TENANT_ID}"
echo "gh variable set AZURE_SUBSCRIPTION_ID --env ${GH_ENV} --repo ${FULL_NAME} --body ${SUB_ID}"
echo "gh variable set AZURE_RG --env ${GH_ENV} --repo ${FULL_NAME} --body ${RG}"
echo "gh variable set AZURE_APP --env ${GH_ENV} --repo ${FULL_NAME} --body ${APP}"
echo "gh variable set STAGING_URL --env ${GH_ENV} --repo ${FULL_NAME} --body https://${FQDN}"
