// Options page for NEXUS extension

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="padding: 24px; font-family: system-ui, -apple-system, sans-serif; max-width: 600px;">
        <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 600;">NEXUS Extension Settings</h1>
        <p style="margin: 0 0 24px 0; color: #666; font-size: 14px;">Configure your extension preferences</p>
        
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 500; margin-bottom: 12px;">Connection Status</h2>
          <div id="connectionStatus" style="padding: 12px; background: #f5f5f5; border-radius: 8px; font-size: 14px;">
            Checking...
          </div>
        </div>
 
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 16px; font-weight: 500; margin-bottom: 12px;">API Token</h2>
          <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <input 
              type="password" 
              id="apiToken" 
              placeholder="Enter your NEXUS API token"
              style="flex: 1; padding: 8px 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;"
            />
            <button id="saveToken" style="padding: 8px 16px; background: #4F46E5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              Save
            </button>
          </div>
          <p style="font-size: 12px; color: #666;">Get your API token from NEXUS settings</p>
        </div>

        <div>
          <h2 style="font-size: 16px; font-weight: 500; margin-bottom: 12px;">Auto-Capture Settings</h2>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 14px;">
            <input type="checkbox" id="autoCapture" style="width: 16px; height: 16px;" />
            <span>Automatically suggest Cortex entries for learning content</span>
          </label>
        </div>
      </div>
    `;

    // Load saved settings
    (chrome as any).storage.sync.get(['apiToken', 'autoCapture'], (result: any) => {
      if (result.apiToken) {
        const tokenInput = document.getElementById('apiToken') as HTMLInputElement;
        if (tokenInput) tokenInput.value = result.apiToken;
      }
      if (result.autoCapture) {
        const autoCaptureInput = document.getElementById('autoCapture') as HTMLInputElement;
        if (autoCaptureInput) autoCaptureInput.checked = result.autoCapture;
      }
      checkConnection();
    });

    // Save token
    document.getElementById('saveToken')?.addEventListener('click', () => {
      const token = (document.getElementById('apiToken') as HTMLInputElement).value;
      (chrome as any).storage.sync.set({ apiToken: token }, () => {
        checkConnection();
      });
    });

    // Save auto-capture setting
    document.getElementById('autoCapture')?.addEventListener('change', (e) => {
      const autoCapture = (e.target as HTMLInputElement).checked;
      (chrome as any).storage.sync.set({ autoCapture });
    });
  }

  function checkConnection() {
    const token = (document.getElementById('apiToken') as HTMLInputElement).value;
    const statusEl = document.getElementById('connectionStatus');
    
    if (statusEl) {
      if (token) {
        statusEl.innerHTML = '<span style="color: green;">✓ Connected to NEXUS</span>';
      } else {
        statusEl.innerHTML = '<span style="color: orange;">⚠ Not connected - enter API token</span>';
      }
    }
  }
});
