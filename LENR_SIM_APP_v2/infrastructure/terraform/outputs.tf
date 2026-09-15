# LENR Simulation App - Terraform Outputs

output "frontend_url" {
  description = "Frontend deployment URL (Cloudflare Pages)"
  value       = module.cloudflare.pages_url
}

output "frontend_custom_domain" {
  description = "Frontend custom domain URL"
  value       = module.cloudflare.custom_domain_url
}

output "api_url" {
  description = "Backend API URL"
  value       = "https://api.${var.domain}"
}

output "vps_ip" {
  description = "VPS public IPv4 address (existing live IP unless create_new)"
  value       = local.vps_ipv4
  sensitive   = false
}

output "vps_hostname" {
  description = "VPS hostname (create_new only; else empty)"
  value       = try(module.hostinger[0].vps_hostname, "")
}

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh -i ~/.ssh/lenr-sim-deploy root@${local.vps_ipv4}"
}

output "r2_bucket_name" {
  description = "R2 bucket name for assets"
  value       = module.cloudflare.r2_bucket_name
}

output "r2_simulations_bucket" {
  description = "R2 bucket name for simulation data"
  value       = module.cloudflare.r2_simulations_bucket
}

output "terraform_state_info" {
  description = "Information about Terraform state"
  value = {
    environment         = var.environment
    domain              = var.domain
    hostinger_vps_mode  = var.hostinger_vps_mode
    pages_hostname      = var.pages_hostname
    region              = "global"
  }
}
