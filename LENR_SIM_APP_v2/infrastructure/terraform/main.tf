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
  
  # Backend configuration - uncomment and configure for remote state
  # backend "s3" {
  #   bucket         = "lenr-sim-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   encrypt        = true
  # }
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
}

# ==============================================================================
# Hostinger VPS Module
# ==============================================================================

module "hostinger" {
  source = "./modules/hostinger"
  
  hostinger_api_token = var.hostinger_api_token
  ssh_public_key      = var.ssh_public_key
  vps_plan            = var.vps_plan
  data_center_id      = var.data_center_id
  domain              = var.domain
  environment         = var.environment
}

# ==============================================================================
# Cloudflare DNS Record for Backend API
# ==============================================================================

resource "cloudflare_record" "api" {
  zone_id = var.cloudflare_zone_id
  name    = "api"
  content = module.hostinger.vps_ipv4
  type    = "A"
  ttl     = 300
  proxied = false  # Direct traffic for WebSocket support
}

# ==============================================================================
# Outputs (defined in outputs.tf)
# ==============================================================================
