(function () {
  const sendData = () => {
    const pageData = (window as any).data;
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
    if (attempts >= 15 || (window as any).data) {
      clearInterval(interval);
    }
  }, 1000);
})();
