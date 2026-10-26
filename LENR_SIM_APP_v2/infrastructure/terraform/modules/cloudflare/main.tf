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

# Variables live in variables.tf (do not redeclare here — Terraform rejects duplicates).

# Provider is configured by the root module (required for count/for_each on this module).

# ==============================================================================
# Cloudflare Pages Project
# ==============================================================================

locals {
  # Staging SPA must call api-staging; prod/cutover uses api.
  pages_api_base_url = (
    var.environment == "staging"
    ? "https://api-staging.${var.domain}"
    : "https://api.${var.domain}"
  )

  # Edge rate-limit hosts only — never zone-wide path contains "/api/"
  # (that would hit Compose share PathPrefix). Draft api. for 0.3.9 cutover.
  api_rate_limit_hosts = distinct(concat(
    ["api-staging.${var.domain}", "api.${var.domain}"],
    var.extra_api_rate_limit_hosts,
  ))
  api_rate_limit_host_expression = join(
    " or ",
    [for host in local.api_rate_limit_hosts : "(http.host eq \"${host}\")"]
  )
}

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
  
  # CF Pages often injects NODE_ENV=production before install; that omits
  # devDependencies (vite). Always --include=dev so `npm run build` finds vite.
  build_config {
    build_command       = "cd LENR_SIM_APP_v2/frontend && npm ci --include=dev && npm run build"
    destination_dir     = "LENR_SIM_APP_v2/frontend/dist"
    root_dir            = ""
    web_analytics_token = ""
  }
  
  deployment_configs {
    # Do not set NODE_ENV here — it makes `npm ci` skip vite (devDependency).
    # Vite sets production mode during `vite build`.
    production {
      environment_variables = {
        REACT_APP_API_URL     = local.pages_api_base_url
        VITE_API_URL          = local.pages_api_base_url
        REACT_APP_ENVIRONMENT = var.environment == "staging" ? "staging" : "production"
      }
      compatibility_date = "2024-01-01"
    }
    preview {
      environment_variables = {
        REACT_APP_API_URL     = local.pages_api_base_url
        VITE_API_URL          = local.pages_api_base_url
        REACT_APP_ENVIRONMENT = "preview"
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
  # Never bind Pages to apex/www — WordPress.com keeps marketing hosts.
  domain = "${var.pages_hostname}.${var.domain}"
}

# DNS record for custom domain (subdomain only; refuse @ / www via variable validation)
resource "cloudflare_record" "pages_cname" {
  zone_id = var.cloudflare_zone_id
  name    = var.pages_hostname
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

# Host-scoped edge rate limit (api-staging + draft api. only).
# Requires cf.colo.id in characteristics (CF error 20155).
# Edge enforcement only for orange-cloud (proxied) hosts; DNS-only
# api-staging remains origin/Traefik-protected until intentionally proxied.
resource "cloudflare_ruleset" "rate_limiting" {
  count = var.enable_api_rate_limit ? 1 : 0

  zone_id     = var.cloudflare_zone_id
  name        = "LENR Sim API Host Rate Limiting"
  description = "Host-scoped rate limiting for api-staging and api (not zone-wide /api/)"
  kind        = "zone"
  phase       = "http_ratelimit"

  rules {
    action = "block"
    ratelimit {
      characteristics     = ["cf.colo.id", "ip.src"]
      # Free plan entitlement: period may only be 10 (not 60).
      period              = var.api_rate_limit_period
      requests_per_period = var.api_rate_limit_requests_per_period
      mitigation_timeout  = var.api_rate_limit_mitigation_timeout
    }
    expression  = "(${local.api_rate_limit_host_expression})"
    description = "API host rate limit: ${var.api_rate_limit_requests_per_period} req/${var.api_rate_limit_period}s per IP (api + api-staging only)"
    enabled     = true
  }
}

# Managed + custom WAF stay opt-in (default off). Zone-wide WAF is out of
# scope for H2 host-scoped rate-limit; enable only with explicit operator go.
locals {
  # Cloudflare Managed Ruleset ID (default security rules)
  # Source: https://developers.cloudflare.com/waf/managed-rulesets/
  managed_waf_ruleset_id = "efb7b8c949ac4650a09736fc376e9aee"
}

resource "cloudflare_ruleset" "managed_waf" {
  count = var.enable_zone_waf ? 1 : 0

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

resource "cloudflare_ruleset" "waf" {
  count = var.enable_zone_waf ? 1 : 0

  zone_id     = var.cloudflare_zone_id
  name        = "LENR Sim Custom WAF"
  description = "Custom Web Application Firewall rules"
  kind        = "zone"
  phase       = "http_request_firewall_custom"

  rules {
    action      = "block"
    expression  = "(http.request.uri.query contains \"<script\" or http.request.uri.query contains \"javascript:\")"
    description = "Block XSS attempts"
    enabled     = true
  }
}

