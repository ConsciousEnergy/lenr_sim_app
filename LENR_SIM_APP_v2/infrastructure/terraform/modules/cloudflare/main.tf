# LENR Simulation App - Cloudflare Module
# Manages Cloudflare Pages, R2 Storage, and DNS

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# ==============================================================================
# Variables
# ==============================================================================

variable "cloudflare_api_token" {
  description = "Cloudflare API token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
}

variable "cloudflare_zone_id" {
  description = "Cloudflare zone ID for the domain"
  type        = string
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
}

variable "github_owner" {
  description = "GitHub repository owner (for Cloudflare Pages)"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

# ==============================================================================
# Provider Configuration
# ==============================================================================

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# ==============================================================================
# Cloudflare Pages Project
# ==============================================================================

resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = "lenr-sim-${var.environment}"
  production_branch = var.pages_production_branch
  
  source {
    type = "github"
    config {
      owner                         = var.github_owner
      repo_name                     = var.github_repo
      production_branch             = var.pages_production_branch
      deployments_enabled           = true
      production_deployment_enabled = true
      preview_deployment_setting    = "all"
      preview_branch_includes       = ["*"]
    }
  }
  
  build_config {
    build_command       = "cd LENR_SIM_APP_v2/frontend && npm ci && npm run build"
    destination_dir     = "LENR_SIM_APP_v2/frontend/dist"
    root_dir            = ""
    web_analytics_token = ""
  }
  
  deployment_configs {
    production {
      environment_variables = {
        REACT_APP_API_URL     = "https://api.${var.domain}"
        VITE_API_URL          = "https://api.${var.domain}"
        REACT_APP_ENVIRONMENT = "production"
        NODE_ENV              = "production"
      }
      compatibility_date = "2024-01-01"
    }
    preview {
      environment_variables = {
        REACT_APP_API_URL     = "https://api.${var.domain}"
        VITE_API_URL          = "https://api.${var.domain}"
        REACT_APP_ENVIRONMENT = "preview"
        NODE_ENV              = "production"
      }
      compatibility_date = "2024-01-01"
    }
  }
}

# ==============================================================================
# Custom Domain for Pages
# ==============================================================================

resource "cloudflare_pages_domain" "frontend" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.frontend.name
  domain       = var.environment == "prod" ? var.domain : "${var.environment}.${var.domain}"
}

# DNS record for custom domain
resource "cloudflare_record" "pages_cname" {
  zone_id = var.cloudflare_zone_id
  name    = var.environment == "prod" ? "@" : var.environment
  content = cloudflare_pages_project.frontend.subdomain
  type    = "CNAME"
  ttl     = 1  # Auto TTL
  proxied = true
}

# ==============================================================================
# R2 Bucket for Static Assets / Simulation Data
# ==============================================================================

resource "cloudflare_r2_bucket" "assets" {
  account_id = var.cloudflare_account_id
  name       = "lenr-sim-assets-${var.environment}"
  location   = "WNAM"  # Western North America
}

# R2 Bucket for Simulation Data Storage
resource "cloudflare_r2_bucket" "simulations" {
  account_id = var.cloudflare_account_id
  name       = "lenr-sim-data-${var.environment}"
  location   = "WNAM"
}

# ==============================================================================
# Security Rules
# ==============================================================================

# Rate limiting rule
resource "cloudflare_ruleset" "rate_limiting" {
  zone_id     = var.cloudflare_zone_id
  name        = "LENR Sim Rate Limiting"
  description = "Rate limiting for API endpoints"
  kind        = "zone"
  phase       = "http_ratelimit"
  
  rules {
    action = "block"
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 100
    }
    expression  = "(http.request.uri.path contains \"/api/\")"
    description = "API rate limit: 100 req/min per IP"
    enabled     = true
  }
}

# Managed WAF Ruleset (Cloudflare Managed Ruleset)
# Note: Using Cloudflare Managed Ruleset (ID: efb7b8c949ac4650a09736fc376e9aee)
# For OWASP Core Ruleset, use ID: 4814384a9e5d4991b9815dcfc25d2f1f
locals {
  # Cloudflare Managed Ruleset ID (default security rules)
  # Source: https://developers.cloudflare.com/waf/managed-rulesets/
  managed_waf_ruleset_id = "efb7b8c949ac4650a09736fc376e9aee"
}

resource "cloudflare_ruleset" "managed_waf" {
  zone_id     = var.cloudflare_zone_id
  name        = "LENR Sim Managed WAF"
  description = "Cloudflare Managed Ruleset (default security rules)"
  kind        = "zone"
  phase       = "http_request_firewall_managed"
  
  rules {
    action = "execute"
    action_parameters {
      id = local.managed_waf_ruleset_id
      overrides {
        enabled = true
      }
    }
    expression  = "true"
    description = "Enable Cloudflare Managed WAF (default security rules)"
    enabled     = true
  }
}

# Custom WAF Rule for additional protection
resource "cloudflare_ruleset" "waf" {
  zone_id     = var.cloudflare_zone_id
  name        = "LENR Sim Custom WAF"
  description = "Custom Web Application Firewall rules"
  kind        = "zone"
  phase       = "http_request_firewall_custom"
  
  rules {
    action     = "block"
    expression = "(http.request.uri.query contains \"<script\" or http.request.uri.query contains \"javascript:\")"
    description = "Block XSS attempts"
    enabled    = true
  }
}

# ==============================================================================
# Outputs
# ==============================================================================

output "pages_url" {
  description = "Cloudflare Pages URL"
  value       = "https://${cloudflare_pages_project.frontend.subdomain}"
}

output "custom_domain_url" {
  description = "Custom domain URL"
  value       = "https://${cloudflare_pages_domain.frontend.domain}"
}

output "r2_bucket_name" {
  description = "R2 bucket name for assets"
  value       = cloudflare_r2_bucket.assets.name
}

output "r2_simulations_bucket" {
  description = "R2 bucket name for simulation data"
  value       = cloudflare_r2_bucket.simulations.name
}
