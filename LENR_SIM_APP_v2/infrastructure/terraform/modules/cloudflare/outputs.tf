# Cloudflare Module - Outputs

output "pages_url" {
  description = "Cloudflare Pages deployment URL"
  value       = "https://${cloudflare_pages_project.frontend.subdomain}"
}

output "custom_domain_url" {
  description = "Custom domain URL for Cloudflare Pages"
  value       = var.environment == "prod" ? "https://${var.domain}" : "https://${var.environment}.${var.domain}"
}

output "r2_bucket_name" {
  description = "R2 bucket name for assets"
  value       = cloudflare_r2_bucket.assets.name
}

output "r2_simulations_bucket" {
  description = "R2 bucket name for simulation data"
  value       = cloudflare_r2_bucket.simulations.name
}
