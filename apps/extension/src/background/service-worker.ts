// Background service worker for NEXUS extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('NEXUS extension installed');
  // Set default settings
  chrome.storage.sync.set({ autoCapture: true });
});

// Helper to log page visit to local extension storage
async function logPageVisit(url: string, title: string) {
  try {
    const hostname = new URL(url).hostname;
    const today = new Date().toISOString().split('T')[0];
    
    const { activityLogs = [] } = await chrome.storage.local.get(['activityLogs']);
    const newLog = {
      timestamp: Date.now(),
      date: today,
      url,
      title,
      domain: hostname
    };
    
    activityLogs.push(newLog);
    // Keep last 200 logs
    const trimmedLogs = activityLogs.slice(-200);
    await chrome.storage.local.set({ activityLogs: trimmedLogs });
  } catch (e) {
    console.error('Failed to log page visit', e);
  }
}

// 1. Cross-connection check: search past captures for related keywords
async function findCrossConnections(title: string, url: string): Promise<string[]> {
  try {
    const { activityLogs = [] } = await chrome.storage.local.get(['activityLogs']);
    const currentKeywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    
    const matchedTitles: string[] = [];
    for (const log of activityLogs) {
      if (log.url === url) continue;
      const logKeywords = log.title.toLowerCase().split(/\s+/);
      const matches = currentKeywords.filter(k => logKeywords.includes(k));
      
      if (matches.length >= 2 && !matchedTitles.includes(log.title)) {
        matchedTitles.push(log.title);
      }
      if (matchedTitles.length >= 3) break;
    }
    
    return matchedTitles;
  } catch (err) {
    return [];
  }
}

// Track page visits
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && !tab.url.startsWith('chrome:')) {
    logPageVisit(tab.url, tab.title || '');

    // Check for related connections and alert content script
    findCrossConnections(tab.title || '', tab.url).then((connections) => {
      if (connections.length > 0) {
        // Wait a bit for page to stabilize
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            action: 'showCrossConnection',
            connections
          }).catch(() => {
            // Ignore error if content script not loaded
          });
        }, 3000);
      }
    });
  }
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request: any, sender: any, sendResponse: (response?: any) => void) => {
  if (request.action === 'addToCortex') {
    const payload = request.data;
    
    // 2. Forward capture to Supabase via API token if configured
    chrome.storage.sync.get(['apiToken'], async (result) => {
      const token = result.apiToken;
      
      if (!token) {
        console.warn('API token not set. Mocking successful capture.');
        // Log locally
        const { localCaptures = [] } = await chrome.storage.local.get(['localCaptures']);
        localCaptures.push({ ...payload, timestamp: Date.now() });
        await chrome.storage.local.set({ localCaptures });
        
        sendResponse({ success: true, mocked: true });
        return;
      }

      try {
        // Retrieve Supabase URL from default environment (fallback to standard local or hosted URL)
        const supabaseUrl = 'https://bmysxukoqzwunmxhhrah.supabase.co'; // Default VITE_SUPABASE_URL
        
        const response = await fetch(`${supabaseUrl}/functions/v1/cortex-entry`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            entry_type: 'action',
            title: payload.title,
            body: `Captured from extension: ${payload.url}\n\nSnippet:\n${payload.content_snippet || ''}`,
            domains: payload.meta_keywords || ['web_capture'],
            is_public: false,
            happened_at: new Date().toISOString()
          })
        });

        if (response.ok) {
          // Log locally too
          const { localCaptures = [] } = await chrome.storage.local.get(['localCaptures']);
          localCaptures.push({ ...payload, timestamp: Date.now() });
          await chrome.storage.local.set({ localCaptures });
          
          sendResponse({ success: true });
        } else {
          const errText = await response.text();
          console.error('Supabase save failed:', errText);
          sendResponse({ success: false, error: errText });
        }
      } catch (err: any) {
        console.error('Failed to post to Supabase:', err);
        sendResponse({ success: false, error: err.message });
      }
    });
    
    return true; // Keep message channel open for asynchronous sendResponse
  }
});

 