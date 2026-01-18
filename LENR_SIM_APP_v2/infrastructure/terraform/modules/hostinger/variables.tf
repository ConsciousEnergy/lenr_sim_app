# Hostinger Module - Variables

variable "hostinger_api_token" {
  description = "Hostinger API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for VPS access"
  type        = string
}

variable "vps_plan" {
  description = "Hostinger VPS plan ID"
  type        = string
  default     = "hostingercom-vps-kvm2-usd-1m"
}

variable "data_center_id" {
  description = "Hostinger data center ID (1=North America, 2=Europe, 3=Asia)"
  type        = number
  default     = 1
}

variable "domain" {
  description = "Domain name for the application"
  type        = string
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
}
