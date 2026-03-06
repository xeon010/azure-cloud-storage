output "storage_account_name" {
  value = azurerm_storage_account.files.name
}

output "primary_connection_string" {
  value     = azurerm_storage_account.files.primary_connection_string
  sensitive = true
}