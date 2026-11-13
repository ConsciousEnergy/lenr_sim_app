import {
  DONATIONS_URL,
  FEEDBACK_EMAIL,
  PUBLIC_GITHUB_MAIN,
  PUBLIC_GITHUB_README,
  PUBLIC_GITHUB_REPO,
  PUBLIC_GITHUB_REPO_LABEL,
} from './publicLinks';

describe('publicLinks', () => {
  it('points at the public GitHub main tree and donations page', () => {
    expect(PUBLIC_GITHUB_REPO).toMatch(/^https:\/\/github\.com\/.+\/lenr_sim_app$/);
    expect(PUBLIC_GITHUB_MAIN).toBe(`${PUBLIC_GITHUB_REPO}/tree/main`);
    expect(PUBLIC_GITHUB_README).toBe(`${PUBLIC_GITHUB_REPO}/blob/main/README.md`);
    expect(PUBLIC_GITHUB_REPO_LABEL).toBe(`${PUBLIC_GITHUB_REPO.split('/')[3]}/lenr_sim_app`);
    expect(DONATIONS_URL).toBe('https://conscious.energy/donations/');
    expect(FEEDBACK_EMAIL).toBe('mailto:diadon@conscious.energy');
  });
});
