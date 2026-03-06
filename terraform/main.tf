terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "student-rg"
  location = "West US"
}

resource "azurerm_storage_account" "files" {
  name                     = "troystudentfiles"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "files" {
  name                  = "student-files"
  storage_account_name  = azurerm_storage_account.files.name
  container_access_type = "private"
}