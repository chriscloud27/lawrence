#!/usr/bin/env bash
# Run once before the first `terraform init`.
# Provisions the Azure Blob Storage backend for Terraform state.
# The OIDC service principal must have Storage Blob Data Contributor on stlawrencetfstate.
set -euo pipefail

LOCATION="westeurope"
RG="rg-lawrence-tfstate"
SA="stlawrencetfstate"
CONTAINER="tfstate"

az group create -n "$RG" -l "$LOCATION"
az storage account create -n "$SA" -g "$RG" --sku Standard_LRS --allow-blob-public-access false
az storage container create -n "$CONTAINER" --account-name "$SA"

echo "Backend ready: storage_account=$SA container=$CONTAINER"
