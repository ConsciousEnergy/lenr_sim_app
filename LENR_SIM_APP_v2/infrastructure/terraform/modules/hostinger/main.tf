# LENR Simulation App - Hostinger VPS Module
# Provisions Hostinger VPS with Ubuntu 24.04 LTS

terraform {
  required_providers {
    hostinger = {
      source  = "hostinger/hostinger"
      version = ">= 0.1.18"
    }
  }
}

# Variables live in variables.tf (do not redeclare here — Terraform rejects duplicates).

# Provider is configured by the root module (required for count/for_each on this module).

# ==============================================================================
# SSH Key
# ==============================================================================

resource "hostinger_vps_ssh_key" "deploy" {
  name = "lenr-sim-deploy-${var.environment}"
  key  = var.ssh_public_key
}

# ==============================================================================
# Post-Install Script
# ==============================================================================

resource "hostinger_vps_post_install_script" "initial_setup" {
  name    = "LENR Sim Initial Setup"
  content = <<-EOT
    #!/bin/bash
    set -e
    
    # ==========================================================================
    # LENR Simulation App - VPS Initial Setup Script
    # Configures firewall, fail2ban, and prepares for Ansible
    # ==========================================================================
    
    echo "Starting LENR Sim VPS initial setup..."
    
    # Set non-interactive mode for apt
    export DEBIAN_FRONTEND=noninteractive
    
    # Update system packages
    apt-get update && apt-get upgrade -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold"
    
    # Install essential packages
    apt-get install -y -o Dpkg::Options::="--force-confdef" -o Dpkg::Options::="--force-confold" \
      ufw \
      fail2ban \
      curl \
      wget \
      git \
      htop \
      unzip \
      ca-certificates \
      gnupg \
      lsb-release
    
    # ==========================================================================
    # Firewall Configuration (UFW)
    # ==========================================================================
    
    echo "Configuring UFW firewall..."
    
    # Reset UFW to default
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (port 22)
    ufw allow 22/tcp
    
    # Allow HTTP (port 80) - for Let's Encrypt challenges
    ufw allow 80/tcp
    
    # Allow HTTPS (port 443)
    ufw allow 443/tcp
    
    # Allow Docker Swarm ports (internal only, restricted later)
    # 2377/tcp - Cluster management
    # 7946/tcp+udp - Container network discovery
    # 4789/udp - Overlay network traffic
    # These will be restricted to VPN/internal after Ansible setup
    
    # Enable UFW
    ufw --force enable
    
    echo "UFW firewall configured and enabled"
    ufw status verbose
    
    # ==========================================================================
    # Fail2ban Configuration
    # ==========================================================================
    
    echo "Configuring fail2ban..."
    
    # Create custom jail.local
    cat > /etc/fail2ban/jail.local << 'FAIL2BAN'
    [DEFAULT]
    bantime = 1h
    findtime = 10m
    maxretry = 5
    backend = systemd
    
    [sshd]
    enabled = true
    port = ssh
    filter = sshd
    logpath = /var/log/auth.log
    maxretry = 3
    bantime = 24h
    
    FAIL2BAN
    
    # Enable and start fail2ban
    systemctl enable fail2ban
    systemctl restart fail2ban
    
    echo "Fail2ban configured and started"
    
    # ==========================================================================
    # Prepare for Ansible
    # ==========================================================================
    
    echo "Preparing for Ansible configuration..."
    
    # Create a marker file to indicate post-install completed
    touch /root/.lenr-sim-postinstall-complete
    
    echo "=========================================="
    echo "LENR Sim VPS initial setup complete!"
    echo "Server is ready for Ansible configuration"
    echo "=========================================="
  EOT
}

# ==============================================================================
# VPS Instance
# ==============================================================================

resource "hostinger_vps" "app" {
  plan                   = var.vps_plan
  data_center_id         = var.data_center_id
  template_id            = 1002  # Ubuntu 24.04 LTS
  hostname               = "lenr-sim-${var.environment}"
  ssh_key_ids            = [hostinger_vps_ssh_key.deploy.id]
  post_install_script_id = hostinger_vps_post_install_script.initial_setup.id
  
  # Note: Hostinger VPS takes a few minutes to provision
  # Wait for the server to be ready before proceeding with Ansible
}

