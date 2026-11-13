import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render } from '@testing-library/react';
import AppLayoutFixed from './AppLayoutFixed';

jest.mock('./BetaNotice', () => () => <div data-testid="beta-notice-stub" />);

const theme = createTheme({ palette: { mode: 'dark' } });

beforeAll(() => {
  // jsdom does not implement Element.scrollTo
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = function scrollToPolyfill() {};
  }
});

function renderLayout(initialPath = '/') {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AppLayoutFixed darkMode>
          <Routes>
            <Route
              path="/"
              element={(
                <div>
                  <p>Dashboard page</p>
                  <Link to="/about">Go about</Link>
                </div>
              )}
            />
            <Route path="/about" element={<div>About page</div>} />
          </Routes>
        </AppLayoutFixed>
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function mockMainScrollMetrics(main, { scrollTop = 0, clientHeight = 400 } = {}) {
  let currentScrollTop = scrollTop;
  Object.defineProperty(main, 'scrollTop', {
    configurable: true,
    get: () => currentScrollTop,
    set: (value) => {
      currentScrollTop = value;
    },
  });
  Object.defineProperty(main, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
  main.scrollTo = jest.fn(({ top = 0 } = {}) => {
    currentScrollTop = top;
  });
  return {
    setScrollTop: (value) => {
      currentScrollTop = value;
    },
  };
}

describe('AppLayoutFixed documentation nav', () => {
  it('exposes Overview under Documentation pointing at /documentation', async () => {
    renderLayout('/');
    fireEvent.click(screen.getByRole('button', { name: /Documentation/i }));
    const overview = await screen.findByRole('link', { name: /Overview/i });
    expect(overview).toHaveAttribute('href', '/documentation');
    expect(screen.getByRole('link', { name: /Theory Paper/i })).toHaveAttribute('href', '/theory-paper');
    expect(screen.getByRole('link', { name: /Theory Guide/i })).toHaveAttribute('href', '/theory');
  });
});

describe('AppLayoutFixed scroll UX', () => {
  it('resets Main scroll on pathname change', async () => {
    renderLayout('/');
    const main = document.querySelector('main');
    expect(main).toBeTruthy();
    mockMainScrollMetrics(main, { scrollTop: 900, clientHeight: 400 });

    await act(async () => {
      fireEvent.click(screen.getByRole('link', { name: 'Go about' }));
    });

    await waitFor(() => {
      expect(screen.getByText('About page')).toBeInTheDocument();
    });

    expect(main.scrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  });

  it('shows back-to-top FAB after two viewport heights and scrolls Main smoothly', async () => {
    renderLayout('/');
    const main = document.querySelector('main');
    expect(main).toBeTruthy();
    const { setScrollTop } = mockMainScrollMetrics(main, {
      scrollTop: 0,
      clientHeight: 400,
    });

    expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();

    await act(async () => {
      setScrollTop(800);
      fireEvent.scroll(main);
    });

    const fab = await screen.findByRole('button', { name: 'Back to top' });
    fireEvent.click(fab);

    expect(main.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('hides back-to-top FAB near the top of Main', async () => {
    renderLayout('/');
    const main = document.querySelector('main');
    const { setScrollTop } = mockMainScrollMetrics(main, {
      scrollTop: 900,
      clientHeight: 400,
    });

    await act(async () => {
      fireEvent.scroll(main);
    });
    expect(await screen.findByRole('button', { name: 'Back to top' })).toBeInTheDocument();

    await act(async () => {
      setScrollTop(0);
      fireEvent.scroll(main);
    });

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Back to top' })).not.toBeInTheDocument();
    });
  });
});
