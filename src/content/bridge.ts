// BookingMotor declares its search context as `let data = JSON.parse(...)` at the
// top level of a classic script. A top-level `let`/`const` creates a *global
// lexical binding* that is reachable as a bare identifier from another classic
// script in the same realm (this bridge), but is NOT exposed as `window.data`.
// Hence we must read the bare `data`, with `window.data` kept as a fallback for
// older pages that used `var data`.
declare const data: any;

(function () {
  const readPageData = (): any => {
    const fromWindow = (window as any).data;
    if (fromWindow) return fromWindow;
    try {
      if (typeof data !== 'undefined' && data) return data;
    } catch (_e) {
      // `data` not defined yet
    }
    return null;
  };

  const sendData = () => {
    const pageData = readPageData();
    if (pageData) {
      window.postMessage(
        {
          source: 'tce-bridge',
          type: 'TCE_BRIDGE_DATA',
          payload: pageData,
        },
        '*'
      );
    }
  };

  // Listen for on-demand requests from the content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === 'TCE_REQUEST_DATA') {
      sendData();
    }
  });

  // Execute immediately
  sendData();

  // Poll configuration changes or late variables (max 15 attempts, every 1s)
  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    sendData();
    if (attempts >= 15 || readPageData()) {
      clearInterval(interval);
    }
  }, 1000);
})();
