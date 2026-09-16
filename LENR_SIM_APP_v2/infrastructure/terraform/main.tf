# LENR Simulation App - Terraform Root Configuration
# Provisions Cloudflare (DNS, Pages, R2) and Hostinger VPS

terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    hostinger = {
      source  = "hostinger/hostinger"
      version = ">= 0.1.18"
    }
  }

  # Partial backend: supply settings via
  #   terraform init -backend-config=backend.hcl
  # (see backend.hcl.example + docs/v0.3.8-beta/TERRAFORM_REMOTE_STATE.md).
  # Local validate: terraform init -backend=false
  backend "s3" {}
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

provider "hostinger" {
  api_token = var.hostinger_api_token
}

# ==============================================================================
# Variables (defined in variables.tf)
# ==============================================================================

# ==============================================================================
# Cloudflare Module
# ==============================================================================

module "cloudflare" {
  source = "./modules/cloudflare"
  
  cloudflare_api_token  = var.cloudflare_api_token
  cloudflare_account_id = var.cloudflare_account_id
  cloudflare_zone_id    = var.cloudflare_zone_id
  domain                = var.domain
  environment           = var.environment
  github_owner            = var.github_owner
  github_repo             = var.github_repo
  pages_production_branch = var.pages_production_branch
  pages_hostname          = var.pages_hostname
}

# ==============================================================================
# Hostinger VPS Module (disabled by default — do not blind-create vs live IP)
# ==============================================================================

module "hostinger" {
  count  = var.hostinger_vps_mode == "create_new" ? 1 : 0
  source = "./modules/hostinger"
  
  hostinger_api_token = var.hostinger_api_token
  ssh_public_key      = var.ssh_public_key
  vps_plan            = var.vps_plan
  data_center_id      = var.data_center_id
  domain              = var.domain
  environment         = var.environment
}

locals {
  # Prefer existing live Compose VPS when Hostinger create is disabled/import.
  vps_ipv4 = (
    var.hostinger_vps_mode == "create_new"
    ? module.hostinger[0].vps_ipv4
    : var.existing_vps_ipv4
  )
}

# Refuse accidental create_new without an explicit confirm string.
resource "terraform_data" "hostinger_create_guard" {
  count = var.hostinger_vps_mode == "create_new" ? 1 : 0

  lifecycle {
    precondition {
      condition     = var.confirm_hostinger_create == "I_CREATE_NEW_VPS"
      error_message = "hostinger_vps_mode=create_new requires confirm_hostinger_create=I_CREATE_NEW_VPS (refuse blind create against live 185.211.4.66)."
    }
  }
}

# ==============================================================================
# Cloudflare DNS Record for Backend API
# ==============================================================================

resource "cloudflare_record" "api" {
  count   = var.manage_api_dns ? 1 : 0
  zone_id = var.cloudflare_zone_id
  name    = "api"
  content = local.vps_ipv4
  type    = "A"
  ttl     = 300
  proxied = false  # Direct traffic for WebSocket support

  lifecycle {
    precondition {
      condition     = local.vps_ipv4 != ""
      error_message = "api DNS requires existing_vps_ipv4 when hostinger_vps_mode is not create_new."
    }
  }
}

# ==============================================================================
# Outputs (defined in outputs.tf)
# ==============================================================================
