# Terraform — Lawrence Chatbot Infrastructure

Provisions an Azure PostgreSQL Flexible Server (`B_Standard_B1ms`) for the chatbot.  
State is stored in Azure Blob Storage. CI runs on every push to `main`.

---

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Contributor role on the target subscription
- A GitHub repo with Actions enabled

---

## One-time bootstrap

### 1. Create the Terraform state storage

```bash
./terraform/bootstrap.sh
```

### 2. Create a service principal for GitHub Actions

```bash
az ad sp create-for-rbac \
  --name "lawrence-github-actions" \
  --role Contributor \
  --scopes /subscriptions/<your-subscription-id> \
  --sdk-auth
```

Note the output — you need it in the next step:

```json
{
  "clientId":       "...",   → ARM_CLIENT_ID
  "clientSecret":   "...",   → ARM_CLIENT_SECRET
  "tenantId":       "...",   → ARM_TENANT_ID
  "subscriptionId": "..."    → ARM_SUBSCRIPTION_ID
}
```

### 3. Grant the SP access to the state storage account

```bash
az role assignment create \
  --assignee <clientId> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/<subscriptionId>/resourceGroups/rg-lawrence-tfstate/providers/Microsoft.Storage/storageAccounts/stlawrencetfstate
```

### 4. Add GitHub Actions secrets

Go to **repo → Settings → Secrets and variables → Actions** and add:

| Secret name | Value |
|---|---|
| `ARM_CLIENT_ID` | `clientId` from step 2 |
| `ARM_CLIENT_SECRET` | `clientSecret` from step 2 |
| `ARM_TENANT_ID` | `tenantId` from step 2 |
| `ARM_SUBSCRIPTION_ID` | `subscriptionId` from step 2 |
| `TF_VAR_PG_ADMIN_PASSWORD` | a strong password of your choice |

---

## Local usage

```bash
cd terraform

export ARM_CLIENT_ID=...
export ARM_CLIENT_SECRET=...
export ARM_TENANT_ID=...
export ARM_SUBSCRIPTION_ID=...
export TF_VAR_pg_admin_password=...

terraform init
terraform plan
terraform apply
```

---

## Outputs

After apply:

```bash
terraform output server_fqdn    # PG hostname for .env / chatbot config
terraform output database_name  # "lawrence"
terraform output admin_user     # "lawrenceadmin"
```

---

## Notes

- The client secret expires after 1 year by default — rotate it in Azure and update the GitHub secret before expiry.
- OIDC federated credentials are the preferred long-term auth method; blocked by corporate Conditional Access in the current environment.
- The migration (`db/migrations/001_init_postgres.sql`) and CSV seed run on every pipeline execution — add `IF NOT EXISTS` guards to the DDL once past initial deploy to make them idempotent.
