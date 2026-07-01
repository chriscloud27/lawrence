output "server_fqdn" {
  value = azurerm_postgresql_flexible_server.chatbot.fqdn
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.chatbot.name
}

output "admin_user" {
  value = var.pg_admin_user
}

output "github_oidc_client_id" {
  value       = azurerm_user_assigned_identity.github_oidc.client_id
  description = "Client ID for GitHub OIDC - add as ARM_CLIENT_ID secret"
}
