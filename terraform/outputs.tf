output "server_fqdn" {
  value = azurerm_postgresql_flexible_server.chatbot.fqdn
}

output "database_name" {
  value = azurerm_postgresql_flexible_server_database.chatbot.name
}

output "admin_user" {
  value = var.pg_admin_user
}
