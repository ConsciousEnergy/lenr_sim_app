describe('sourceAccess', () => {
  const ORIGINAL_REACT = process.env.REACT_APP_SOURCE_PUBLIC;

  afterEach(() => {
    if (ORIGINAL_REACT === undefined) {
      delete process.env.REACT_APP_SOURCE_PUBLIC;
    } else {
      process.env.REACT_APP_SOURCE_PUBLIC = ORIGINAL_REACT;
    }
    jest.resetModules();
  });

  it('defaults to private (email-first) when the public flag is unset', () => {
    delete process.env.REACT_APP_SOURCE_PUBLIC;
    jest.resetModules();
    const { isSourcePublic, FEEDBACK_MAILTO, LICENSE_HREF, GITHUB_REPO_URL } =
      require('./sourceAccess');
    expect(isSourcePublic()).toBe(false);
    expect(FEEDBACK_MAILTO).toBe('mailto:diadon@conscious.energy');
    expect(LICENSE_HREF).toBe('/LICENSE');
    expect(GITHUB_REPO_URL).toContain('lenr_sim_app');
  });

  it('enables public GitHub CTAs only when SOURCE_PUBLIC=true', () => {
    process.env.REACT_APP_SOURCE_PUBLIC = 'true';
    jest.resetModules();
    const { isSourcePublic } = require('./sourceAccess');
    expect(isSourcePublic()).toBe(true);
  });
});
