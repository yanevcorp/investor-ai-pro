import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// React's ErrorBoundary only catches errors thrown synchronously during
// render/lifecycle methods. It cannot catch errors thrown inside async
// callbacks — e.g. a ResizeObserver or requestAnimationFrame callback deep
// inside a charting library — which instead surface here as an uncaught
// exception or unhandled rejection with no boundary fallback shown at all.
// Logged with the same shape as ErrorBoundary's log so both paths are
// searchable together.
window.addEventListener('error', (event) => {
  console.error('Uncaught window error:', {
    message: event.error?.message || event.message,
    stack: event.error?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', {
    message: event.reason?.message || String(event.reason),
    stack: event.reason?.stack,
    url: window.location.href,
    userAgent: navigator.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date().toISOString(),
  });
});

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Registers the service worker so the app can be installed and used
// offline. Opts into PWA behavior (see serviceWorkerRegistration.js).
//
// By default a newly installed service worker sits in "waiting" state
// until every open tab of the app is closed, which on mobile (backgrounded
// tabs, installed PWAs) can mean a device never picks up a new deploy.
// Force the waiting worker to activate immediately and reload once it does,
// so a fix like this one actually reaches phones on their next load.
serviceWorkerRegistration.register({
  onUpdate: (registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  },
});

if ('serviceWorker' in navigator) {
  // service-worker.js calls clientsClaim(), which makes a service worker
  // take control of the current tab immediately on its *first* activation
  // too — not just when a new version replaces an old one. That fires this
  // same controllerchange event on literally every first-ever visit, ~1s
  // after the page loads. Reloading unconditionally meant a brand-new
  // visitor's page could reload itself out from under them (wiping
  // whatever they'd already started typing) for no reason — nothing was
  // stale yet, there was nothing to pick up. Only reload when this page
  // load was already being served by a *previous* controller, which means
  // a genuinely new version just took over from it.
  const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadControllerOnLoad || refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
