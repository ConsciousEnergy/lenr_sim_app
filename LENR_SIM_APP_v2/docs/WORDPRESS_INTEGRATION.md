# WordPress Integration Guide

**Version:** 0.3.6-beta  
**Last Updated:** August 2026

---

## Overview

This guide explains how to integrate the LENR Simulation App into a WordPress site at `www.conscious.energy`.

---

## Integration Options

### Option 1: Iframe Embed (Recommended)

**Live DNS note (2026-08-31):** `conscious.energy` apex is currently the WordPress.com marketing site. Do **not** iframe `https://conscious.energy` until the SPA lives on a Pages host. Iframe the Cloudflare Pages origin (or `app.conscious.energy` after that CNAME is cut over), never `api.conscious.energy`.


#### Step 1: Create a New Page in WordPress

1. Go to **Pages → Add New**
2. Title: "LENR Simulation Platform"
3. Switch to HTML/Code editor

#### Step 2: Add the Embed Code

```html
<!-- LENR Simulation App Embed -->
<div class="lenr-sim-wrapper" style="position: relative; width: 100%; padding-bottom: 75%; height: 0; overflow: hidden;">
  <iframe 
    src="https://conscious.energy"
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
<!-- Full Page LENR Sim -->
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
    src="https://conscious.energy" 
    title="LENR Simulation Platform"
    allowfullscreen>
  </iframe>
</body>
</html>
```

---

### Option 2: Subdomain Integration

Point a subdomain to the React app while keeping WordPress on the main domain.

#### DNS Configuration

Add these DNS records in Cloudflare:

| Type | Name | Value | Proxy |
|------|------|-------|-------|
| CNAME | `app` | `lenr-sim-prod.pages.dev` | Yes |
| CNAME | `www` | `conscious.energy` | Yes |

#### WordPress Menu Link

Add a menu item linking to `https://app.conscious.energy`

---

### Option 3: WordPress Plugin (Advanced)

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
        
        $base_url = 'https://conscious.energy';
        
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

---

## Security Considerations

### CORS Configuration

The backend is configured to allow requests from your WordPress domain:

```python
# backend/app/core/config.py
CORS_ORIGINS = [
    "https://conscious.energy",
    "https://www.conscious.energy",
]
```

### Content Security Policy

Add to WordPress `.htaccess` or nginx config:

```apache
# .htaccess
<IfModule mod_headers.c>
    Header set Content-Security-Policy "frame-ancestors 'self' https://conscious.energy https://www.conscious.energy"
</IfModule>
```

### X-Frame-Options (Legacy - Deprecated)

**Note:** The `X-Frame-Options: ALLOW-FROM` directive is deprecated and not supported by modern browsers. Use `Content-Security-Policy: frame-ancestors` instead (see above).

For legacy browser compatibility, you may use:
```
X-Frame-Options: SAMEORIGIN
```

However, the `Content-Security-Policy: frame-ancestors` header (configured above) is the recommended modern approach and provides better control over iframe embedding.

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

Track simulation usage with events:

```javascript
// Add to your WordPress theme
window.addEventListener('message', function(event) {
    if (event.origin !== 'https://conscious.energy') return;
    
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

1. Check browser console for CORS errors
2. Verify `X-Frame-Options` header allows your domain
3. Ensure HTTPS is used everywhere

### Mobile Display Issues

1. Use responsive wrapper CSS provided above
2. Test on multiple devices
3. Consider separate mobile-optimized page

### Performance Issues

1. Enable lazy loading
2. Use browser caching
3. Consider preconnect hints:

```html
<link rel="preconnect" href="https://conscious.energy">
<link rel="dns-prefetch" href="https://api.conscious.energy">
```

---

## Support

For integration issues, contact: diadon@conscious.energy

---

**Document maintained by:** LENR Simulation Platform Development Team
