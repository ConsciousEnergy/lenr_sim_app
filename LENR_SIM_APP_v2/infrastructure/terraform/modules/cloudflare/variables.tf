# Cloudflare Module - Variables

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
  description = "GitHub repository owner"
  type        = string
  default     = "ConsciousEnergy"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "lenr_sim_app"
}

variable "pages_production_branch" {
  description = "Git branch Cloudflare Pages treats as production (ship branch, not stale main)"
  type        = string
  default     = "lenr_sim_app_v0.3.8-beta"
}

variable "pages_hostname" {
  description = "Subdomain for Pages SPA (never @ or www)"
  type        = string
  default     = "app"

  validation {
    condition     = !contains(["@", "www", ""], var.pages_hostname)
    error_message = "pages_hostname must not be empty, @, or www."
  }
}

variable "enable_api_rate_limit" {
  description = "Create host-scoped http_ratelimit ruleset for api + api-staging"
  type        = bool
  default     = true
}

variable "extra_api_rate_limit_hosts" {
  description = "Additional FQDNs to include in the host-scoped API rate-limit expression"
  type        = list(string)
  default     = []
}

variable "api_rate_limit_period" {
  description = "Rate-limit window seconds (Free plan: only 10 is entitled)"
  type        = number
  default     = 10
}

variable "api_rate_limit_requests_per_period" {
  description = "Max requests per IP per period (~100/min ≈ 17/10s; default 20/10s)"
  type        = number
  default     = 20
}

variable "api_rate_limit_mitigation_timeout" {
  description = "Seconds to block after rate-limit threshold (Cloudflare block action)"
  type        = number
  default     = 10
}

variable "enable_zone_waf" {
  description = "Opt-in zone managed+custom WAF rulesets (default off; not part of host-scoped RL)"
  type        = bool
  default     = false
}
