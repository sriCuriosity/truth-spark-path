// Content script for NEXUS extension

console.log('NEXUS content script loaded');

// Inject "Add to Cortex" button on appropriate pages
function injectAddButton() {
  if (document.querySelector('.nexus-add-button')) return;

  const button = document.createElement('button');
  button.className = 'nexus-add-button';
  button.textContent = 'Add to Cortex';
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 10000;
    padding: 12px 24px;
    background: #4F46E5;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  `;

  button.addEventListener('click', () => {
    chrome.runtime.sendMessage({
      action: 'addToCortex',
      data: {
        url: window.location.href,
        title: document.title,
      }
    });
  });

  document.body.appendChild(button);
}

// Check if page is appropriate for injection
function shouldInject() {
  const url = window.location.href;
  // Add logic to determine if this is a learning-related page
  return true;
}

if (shouldInject()) {
  injectAddButton();
}
