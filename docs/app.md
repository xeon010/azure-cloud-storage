# Simple file upload application for having fun with Azure Blob Storage

## Tools and tech explained

### Terraform (`terraform/`)
Terraform is Infrastructure as Code - it declaratively defines your Azure cloud resources and provisions them with `terraform apply`

**Checkout `main.tf` - Three Resources**
```
resource "azurerm_resource_group" "main" {
  name     = "student-rg"
  location = "West US"
}

resource "azurerm_storage_account" "files" {
  name                     = "troyschoolfiles"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_storage_container" "files" {
  name                  = "school-files"
  storage_account_name  = azurerm_storage_account.files.name
  container_access_type = "private"
}
```

1. Resource Group (student-rg, West US) The logical container in Azure that holds all your resources. Think of it like a folder in Azure.
2. Storage Account (`troyschoolfiles`) The actual Azure Storage account. `Standard Tier` + `LRS` (locally redundant storage) means your data is replicated 3x within a single datacenter - the cheapest/simplest replication option.
3. Blob Container (`school-files`) like a bucket inside the storage account. `container_access_type = "private"` means no one can access files without authentication (no public anonymous reads).

**`outputs.tf` - After Provisioning**
```
output "storage_account_name" {
  value = azurerm_storage_account.files.name
}
output "primary_connection_string" {
  value     = azurerm_storage_account.files.primary_connection_string
  sensitive = true
}
```
After `terraform apply` runs, it prints out:
* The storage account name (for reference)
* The connection string (marked `sensitive` so it's hidden in logs) - this is what you'd put in `.env.local` as `AZURE_STORAGE_CONNECTION_STRING`

### GitHub Actions Workflow (`.github/workflows/deploy.yml`)
Triggers on every push to `main` branch:

```
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm build

      # Later: add Terraform and Azure deployment steps here
```
Right now it does four things:
1. Checkout - pulls the code
2. Setup pnpm v8 - install ths package manager
3. Setup Node 20 - with pnpm caching so installs are fast
4. `pnpm install` + `pnpm build` - validates that the app compiles cleanly


### Application Code (`src/app/`)
Three API routes handle all Azure interactions via the `@azure/storage-blob` SDK:  
| Route | What it does |
|----|----|
| `POST /api/upload` | Accepts a file + folder name, timestamps the filename, uploads to the blob container |
| `GET /api/files?folder=xyz` | Lists blobs under a folder prefix, generates 1-hour SAS URLs for secure downloads |
| `GET /api/folders` | Discovers virtual folder prefixes using blob hierarchy listing |

**How it All Fits Together**
```
Developer pushes to main
        ↓
GitHub Actions: pnpm install + pnpm build
        ↓ (future)
Terraform provisions Azure (Resource Group → Storage Account → Blob Container)
        ↓
App reads AZURE_STORAGE_CONNECTION_STRING from env
        ↓
Next.js API routes talk to Azure Blob Storage via SDK
        ↓
Users upload/download files through the React UI
```