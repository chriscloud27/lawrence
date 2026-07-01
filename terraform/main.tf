resource "azurerm_resource_group" "chatbot" {
  name     = "rg-lawrence-${var.env}"
  location = var.location
}

resource "azurerm_user_assigned_identity" "github_oidc" {
  name                = "mi-lawrence-github-oidc"
  resource_group_name = azurerm_resource_group.chatbot.name
  location            = azurerm_resource_group.chatbot.location
}

resource "azurerm_federated_identity_credential" "github_main" {
  name                = "fc-github-main"
  resource_group_name = azurerm_resource_group.chatbot.name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  parent_id           = azurerm_user_assigned_identity.github_oidc.id
  subject             = "repo:chriscloud27/lawrence:ref:refs/heads/main"
}

resource "azurerm_federated_identity_credential" "github_pr" {
  name                = "fc-github-pr"
  resource_group_name = azurerm_resource_group.chatbot.name
  audience            = ["api://AzureADTokenExchange"]
  issuer              = "https://token.actions.githubusercontent.com"
  parent_id           = azurerm_user_assigned_identity.github_oidc.id
  subject             = "repo:chriscloud27/lawrence:pull_request"
}

resource "azurerm_postgresql_flexible_server" "chatbot" {
  name                   = "psql-lawrence-${var.env}"
  resource_group_name    = azurerm_resource_group.chatbot.name
  location               = azurerm_resource_group.chatbot.location
  version                = "16"
  administrator_login    = var.pg_admin_user
  administrator_password = var.pg_admin_password

  sku_name   = "B_Standard_B1ms"
  storage_mb = 32768

  backup_retention_days        = 7
  geo_redundant_backup_enabled = false
}

resource "azurerm_postgresql_flexible_server_database" "chatbot" {
  name      = "lawrence"
  server_id = azurerm_postgresql_flexible_server.chatbot.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Allow connections from Azure-hosted services (GitHub Actions hosted runners use Azure IPs)
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure" {
  name             = "AllowAllAzureIPs"
  server_id        = azurerm_postgresql_flexible_server.chatbot.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}
