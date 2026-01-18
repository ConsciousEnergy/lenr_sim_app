# Hostinger Module - Outputs

output "vps_id" {
  description = "VPS instance ID"
  value       = hostinger_vps.app.id
}

output "vps_ipv4" {
  description = "Public IPv4 address of the VPS"
  value       = hostinger_vps.app.ipv4_address
}

output "vps_hostname" {
  description = "VPS hostname"
  value       = hostinger_vps.app.hostname
}

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh -i ~/.ssh/lenr-sim-deploy root@${hostinger_vps.app.ipv4_address}"
}
