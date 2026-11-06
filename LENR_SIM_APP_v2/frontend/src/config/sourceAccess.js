/**
 * Source-access honesty for invited beta.
 *
 * While the application repository is private, signed-out visitors must not be
 * steered to github.com/.../lenr_sim_app (404) or `git clone` / Issues CTAs.
 * Flip VITE_SOURCE_PUBLIC=true (or REACT_APP_SOURCE_PUBLIC=true) only after the
 * repo is public; until then prefer mailto + in-app /LICENSE (same pattern as #306).
 */

const readViteEnv = () => {
  try {
    // Avoid direct import.meta syntax so Jest/CommonJS can parse this file.
    return Function(
      'try { return (typeof import !== "undefined" && import.meta && import.meta.env) ? import.meta.env : {}; } catch (_) { return {}; }'
    )();
  } catch (_) {
    return {};
  }
};

const metaEnv = readViteEnv();

export const FEEDBACK_EMAIL = 'diadon@conscious.energy';
export const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}`;
export const LICENSE_HREF = '/LICENSE';
export const GITHUB_REPO_URL = 'https://github.com/ConsciousEnergy/lenr_sim_app';  // pragma: allowlist secret
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;

/**
 * True only when the operator explicitly marks the repository as public.
 * Default false keeps invited-beta surfaces email-first.
 */
export function isSourcePublic() {
  const flag =
    process.env.REACT_APP_SOURCE_PUBLIC ||
    metaEnv.VITE_SOURCE_PUBLIC ||
    '';
  return String(flag).toLowerCase() === 'true';
}
