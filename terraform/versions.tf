terraform {
  required_version = ">= 1.7"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.110"
    }
  }

  backend "azurerm" {
    resource_group_name  = "rg-lawrence-tfstate"
    storage_account_name = "tfstatelawrence"
    container_name       = "tfstate"
    key                  = "lawrence.tfstate"
  }
}

provider "azurerm" {
  features {}
}
