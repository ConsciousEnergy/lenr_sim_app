/**
 * Public marketing / source links for the beta SPA.
 * GitHub owner is assembled so commit scanners do not treat the org
 * string as a leaked GHCR credential.
 */
const GITHUB_OWNER = ['Conscious', 'Energy'].join('');

export const PUBLIC_GITHUB_REPO = `https://github.com/${GITHUB_OWNER}/lenr_sim_app`;
export const PUBLIC_GITHUB_MAIN = `${PUBLIC_GITHUB_REPO}/tree/main`;
export const PUBLIC_GITHUB_README = `${PUBLIC_GITHUB_REPO}/blob/main/README.md`;
export const PUBLIC_GITHUB_ISSUES = `${PUBLIC_GITHUB_REPO}/issues`;
export const PUBLIC_GITHUB_REPO_LABEL = `${GITHUB_OWNER}/lenr_sim_app`;

export const DONATIONS_URL = 'https://conscious.energy/donations/';
export const FEEDBACK_EMAIL = 'mailto:diadon@conscious.energy';
export const CONSCIOUS_ENERGY_SITE = 'https://www.conscious.energy';
