// Background service worker for NEXUS extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('NEXUS extension installed');
});

// Listen for messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'addToCortex') {
    // Handle adding to Cortex
    console.log('Adding to Cortex:', request.data);
    sendResponse({ success: true });
  }
});
