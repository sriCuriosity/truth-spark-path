// Popup UI for NEXUS extension

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <h1 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">NEXUS</h1>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #666;">Capture learning evidence</p>
        <button id="captureBtn" style="
          width: 100%;
          padding: 12px;
          background: #4F46E5;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        ">Add Current Page to Cortex</button>
      </div>
    `;

    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
      captureBtn.addEventListener('click', () => {
        (chrome as any).tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => {
          const tab = tabs[0];
          if (tab.url) {
            (chrome as any).runtime.sendMessage({
              action: 'addToCortex',
              data: {
                url: tab.url,
                title: tab.title,
              }
            });
          }
        });
      });
    }
  }
});
 