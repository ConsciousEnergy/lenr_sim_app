# LENR Simulation App - Terraform Variables

variable "environment" {
  description = "Environment name (prod, staging, dev)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["prod", "staging", "dev"], var.environment)
    error_message = "Environment must be one of: prod, staging, dev"
  }
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
  default     = "conscious.energy"
}

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

variable "hostinger_api_token" {
  description = "Hostinger API token (required only when hostinger_vps_mode=create_new)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ssh_public_key" {
  description = "SSH public key for VPS access (ed25519 recommended; required for create_new)"
  type        = string
  default     = ""

  validation {
    condition = (
      var.ssh_public_key == ""
      || can(regex("^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256|ecdsa-sha2-nistp384|ecdsa-sha2-nistp521)", var.ssh_public_key))
    )
    error_message = "SSH public key must be empty or a valid format (ssh-rsa, ssh-ed25519, or ecdsa)"
  }
}

variable "vps_plan" {
  description = "Hostinger VPS plan ID"
  type        = string
  default     = "hostingercom-vps-kvm2-usd-1m"
  
  validation {
    condition = contains([
      "hostingercom-vps-kvm1-usd-1m",
      "hostingercom-vps-kvm2-usd-1m",
      "hostingercom-vps-kvm4-usd-1m"
    ], var.vps_plan)
    error_message = "VPS plan must be one of the supported Hostinger plans"
  }
}

variable "data_center_id" {
  description = "Hostinger data center ID (1=North America, 2=Europe, 3=Asia)"
  type        = number
  default     = 1
  
  validation {
    condition     = var.data_center_id >= 1 && var.data_center_id <= 3
    error_message = "Data center ID must be between 1 and 3"
  }
}

variable "github_owner" {
  description = "GitHub repository owner (for Cloudflare Pages)"
  type        = string
  default     = "ConsciousEnergy"
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
  default     = "lenr_sim_app"
}

variable "pages_production_branch" {
  description = "Cloudflare Pages production branch for v0.3.8-beta cutover (do not apply in 0.3.7)"
  type        = string
  default     = "lenr_sim_app_v0.3.8-beta"
}

variable "pages_hostname" {
  description = "DNS name for Pages SPA (never @ or www — keep WordPress on apex/www)"
  type        = string
  default     = "app"

  validation {
    condition     = !contains(["@", "www", ""], var.pages_hostname)
    error_message = "pages_hostname must not be empty, @, or www (marketing apex stays on WordPress.com)."
  }
}

variable "hostinger_vps_mode" {
  description = "disabled | import_existing | create_new — refuse blind create against live 185.211.4.66"
  type        = string
  default     = "disabled"

  validation {
    condition     = contains(["disabled", "import_existing", "create_new"], var.hostinger_vps_mode)
    error_message = "hostinger_vps_mode must be disabled, import_existing, or create_new"
  }
}

variable "confirm_hostinger_create" {
  description = "Must be I_CREATE_NEW_VPS when hostinger_vps_mode=create_new"
  type        = string
  default     = ""
}

variable "existing_vps_ipv4" {
  description = "Live Compose VPS IPv4 when not creating a new Hostinger VPS (default: current public beta)"
  type        = string
  default     = "185.211.4.66"
}

variable "manage_api_dns" {
  description = "When true, manage api.<domain> A record (off by default during prep)"
  type        = bool
  default     = false
}
