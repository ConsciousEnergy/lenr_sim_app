# WordPress Integration Guide

**Version:** 0.3.9-beta (docs; SPA host is live Compose 0.3.8 until Swarm cutover)  
**Last Updated:** October 2026

---

## Overview

This guide explains how to integrate the LENR Simulation App into the WordPress site at `https://conscious.energy` / `https://www.conscious.energy`.

**SPA embed host (current):** `https://lenr-sim-beta.conscious.energy`  
**Never iframe the marketing apex** `https://conscious.energy` — that host is WordPress, not the Sim SPA.  
**Future optional host:** `https://app.conscious.energy` (after CNAME cutover).  
**Never iframe the API** (`api.*` / backend origin).

Compose → Swarm cutover may keep the same SPA hostname (`lenr-sim-beta.conscious.energy`); Traefik same-origin SPA+API does not require changing WordPress iframe `src` solely for that cutover.

---

## Preferred integration (until framing is verified)

**Prefer a link-out** (menu / CTA / button) to `https://lenr-sim-beta.conscious.energy` until operators verify live response headers after Swarm (or after a Compose hotfix that ships the nginx framing change):

- SPA must **not** send `X-Frame-Options: SAMEORIGIN` / `DENY` (legacy XFO can win over CSP allowlists).
- SPA should send  
  `Content-Security-Policy: frame-ancestors 'self' https://conscious.energy https://www.conscious.energy`
- API must keep `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`.

Verify before relying on an iframe:

```bash
curl -sI https://lenr-sim-beta.conscious.energy/ | grep -iE 'x-frame-options|content-security-policy'
```

Expect: no blocking `X-Frame-Options`, and `frame-ancestors` listing the WordPress origins.

---

## Integration Options

### Option 1: Link-out (recommended now)

Add a WordPress menu item or button:

| Label | URL |
|-------|-----|
| Open LENR Simulation | `https://lenr-sim-beta.conscious.energy` |

Optional future label target: `https://app.conscious.energy` once that host serves the SPA.

---

### Option 2: Iframe Embed (after framing verified)

Use only after the header probe above succeeds. Iframe the **beta SPA host** (or future `app.`), never apex WordPress and never the API.

#### Step 1: Create a New Page in WordPress

1. Go to **Pages → Add New**
2. Title: "LENR Simulation Platform"
3. Switch to HTML/Code editor

#### Step 2: Add the Embed Code

```html
<!-- LENR Simulation App Embed — SPA host only; never conscious.energy apex -->
<div class="lenr-sim-wrapper" style="position: relative; width: 100%; padding-bottom: 75%; height: 0; overflow: hidden;">
  <iframe 
    src="https://lenr-sim-beta.conscious.energy"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    title="LENR Simulation Platform"
    allowfullscreen
    loading="lazy">
  </iframe>
</div>

<style>
/* Responsive iframe container */
.lenr-sim-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

/* Adjust height for different viewports */
@media (max-width: 768px) {
  .lenr-sim-wrapper {
    padding-bottom: 100%; /* Taller on mobile */
  }
}
</style>
```

#### Step 3: Alternative - Full-Page Embed

For a dedicated simulation page without WordPress chrome:

```html
<!-- Full Page LENR Sim — src must be the SPA host, not marketing apex -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LENR Simulation Platform - Conscious Energies</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      height: 100%;
      overflow: hidden;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
    }
  </style>
</head>
<body>
  <iframe 
    src="https://lenr-sim-beta.conscious.energy" 
    title="LENR Simulation Platform"
    allowfullscreen>
  </iframe>
</body>
</html>
```

---

### Option 3: Subdomain Integration (`app.`)

Optional later: point `app.conscious.energy` at the SPA while WordPress stays on apex/`www`.

#### DNS Configuration (operator; not Terraform in this guide)

| Type | Name | Value | Notes |
|------|------|-------|-------|
| CNAME | `app` | SPA target (Pages or same host as beta after cutover) | Do **not** point apex away from WordPress in this flow |

Compose → Swarm may keep `lenr-sim-beta` as the public SPA URL; `app.` is optional polish, not required for cutover.

#### WordPress Menu Link

Prefer linking to `https://lenr-sim-beta.conscious.energy` now; switch menu to `https://app.conscious.energy` only after that host serves the SPA.

---

### Option 4: WordPress Plugin (Advanced)

Create a custom WordPress plugin for deeper integration.

#### Plugin Structure

```
wp-content/plugins/lenr-sim-integration/
├── lenr-sim-integration.php
├── assets/
│   └── style.css
└── templates/
    └── simulation-page.php
```

#### Plugin Code

**lenr-sim-integration.php:**

```php
<?php
/**
 * Plugin Name: LENR Simulation Integration
 * Description: Integrates LENR Simulation Platform with WordPress
 * Version: 1.0.0
 * Author: Conscious Energies
 */

if (!defined('ABSPATH')) exit;

class LENR_Sim_Integration {
    
    public function __construct() {
        add_shortcode('lenr_sim', array($this, 'render_simulation'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_styles'));
    }
    
    public function render_simulation($atts) {
        $atts = shortcode_atts(array(
            'height' => '800px',
            'width' => '100%',
            'page' => ''
        ), $atts);
        
        // SPA host only — never marketing apex https://conscious.energy
        $base_url = 'https://lenr-sim-beta.conscious.energy';
        
        // Sanitize and validate page parameter to prevent path traversal and injection
        $page = isset($atts['page']) ? sanitize_text_field($atts['page']) : '';
        
        // Whitelist allowed page patterns (alphanumeric, hyphens, forward slashes only)
        // Reject any input containing path traversal patterns, URL schemes, or special characters
        if (!empty($page)) {
            // Remove any path traversal attempts
            $page = str_replace(array('..', '//', '\\'), '', $page);
            
            // Validate against safe slug pattern (alphanumeric, hyphens, forward slashes)
            if (!preg_match('/^[a-zA-Z0-9\-\/]+$/', $page)) {
                // Invalid input - fall back to base URL
                $page = '';
            }
        }
        
        $src = $page ? $base_url . '/' . $page : $base_url;
        
        ob_start();
        ?>
        <div class="lenr-sim-container">
            <iframe 
                src="<?php echo esc_url($src); ?>"
                style="width: <?php echo esc_attr($atts['width']); ?>; height: <?php echo esc_attr($atts['height']); ?>;"
                frameborder="0"
                allowfullscreen
                title="LENR Simulation Platform">
            </iframe>
        </div>
        <?php
        return ob_get_clean();
    }
    
    public function enqueue_styles() {
        wp_enqueue_style(
            'lenr-sim-integration',
            plugin_dir_url(__FILE__) . 'assets/style.css',
            array(),
            '1.0.0'
        );
    }
}

new LENR_Sim_Integration();
```

#### Usage

```
[lenr_sim height="900px"]
[lenr_sim page="unified-theory"]
[lenr_sim page="theory-paper" width="100%" height="1200px"]
```

Use shortcodes only after framing is verified; otherwise prefer Option 1 (link-out).

---

## Security Considerations

### CORS Configuration

The backend should allow requests from the WordPress domain (and the SPA origin when browsers call the API):

```python
# backend/app/core/config.py (illustrative)
CORS_ORIGINS = [
    "https://conscious.energy",
    "https://www.conscious.energy",
    "https://lenr-sim-beta.conscious.energy",
]
```

### Who may iframe the SPA

Framing policy belongs on the **SPA** host (`nginx.frontend.conf` / Pages `_headers`), not on WordPress `.htaccess`:

```
Content-Security-Policy: frame-ancestors 'self' https://conscious.energy https://www.conscious.energy
```

Do **not** set `X-Frame-Options: SAMEORIGIN` or `DENY` on the SPA — those conflict with a CSP allowlist that includes WordPress.

### API must remain unframed

Backend `SecureHeadersMiddleware` keeps:

- `X-Frame-Options: DENY`
- CSP `frame-ancestors 'none'`

Never embed `api.*` in WordPress.

### X-Frame-Options (legacy)

`ALLOW-FROM` is deprecated. Prefer CSP `frame-ancestors` on the SPA. Omit XFO on the SPA so the CSP allowlist can win.

---

## Recommended WordPress Setup

### Theme Compatibility

The embed works best with themes that support full-width pages:

1. **Astra** - Use "Starter Templates" for full-width
2. **GeneratePress** - Set page to "No Sidebar, Full Width"
3. **Kadence** - Use "Full Width Stretched" layout

### Page Template

Create a full-width template for the simulation page:

**page-lenr-simulation.php:**

```php
<?php
/**
 * Template Name: LENR Simulation Full Width
 */

get_header('minimal'); // Uses a minimal header
?>

<main class="lenr-sim-main">
    <?php
    while (have_posts()) :
        the_post();
        the_content();
    endwhile;
    ?>
</main>

<?php get_footer('minimal'); ?>
```

---

## Performance Optimization

### Lazy Loading

The iframe uses `loading="lazy"` to defer loading until visible.

### Caching

Configure caching to exclude the simulation page:

**WP Super Cache:**
```
# Add to wp-content/cache/wp-cache-config.php
$wp_cache_not_cache = array('/lenr-simulation/');
```

**W3 Total Cache:**
Add `/lenr-simulation/` to "Never cache the following pages"

---

## Analytics Integration

### Google Analytics

Track simulation usage with events (postMessage `origin` must match the SPA host):

```javascript
// Add to your WordPress theme
window.addEventListener('message', function(event) {
    if (event.origin !== 'https://lenr-sim-beta.conscious.energy') return;
    
    if (event.data.type === 'simulation_started') {
        gtag('event', 'simulation_started', {
            'event_category': 'LENR Simulation',
            'event_label': event.data.simulation_type
        });
    }
});
```

---

## Troubleshooting

### Iframe Not Loading

1. Prefer link-out until framing is verified post-Swarm (or Compose nginx hotfix)
2. `curl -sI` the SPA: ensure **no** blocking `X-Frame-Options` and CSP `frame-ancestors` lists WordPress
3. Confirm `src` is `https://lenr-sim-beta.conscious.energy` (or future `app.`), **not** apex `https://conscious.energy`
4. Ensure HTTPS is used everywhere; never iframe the API

### Mobile Display Issues

1. Use responsive wrapper CSS provided above
2. Test on multiple devices
3. Consider separate mobile-optimized page

### Performance Issues

1. Enable lazy loading
2. Use browser caching
3. Consider preconnect hints:

```html
<link rel="preconnect" href="https://lenr-sim-beta.conscious.energy">
```

---

## Support

For integration issues, contact: diadon@conscious.energy

---

**Document maintained by:** LENR Simulation Platform Development Team
