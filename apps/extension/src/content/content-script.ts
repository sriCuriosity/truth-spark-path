// Content script for NEXUS extension

console.log('NEXUS content script loaded');

// Helper to check if page is appropriate for injection
function shouldInject(): boolean {
  const url = window.location.href;
  const hostname = window.location.hostname;

  // White list for educational/development sites
  const activeDomains = [
    'wikipedia.org',
    'github.com',
    'stackoverflow.com',
    'medium.com',
    'youtube.com',
    'substack.com',
    'arxiv.org',
    'dev.to',
    'reddit.com'
  ];

  const matchesDomain = activeDomains.some(domain => hostname.includes(domain));
  const matchesKeyword = /\/(wiki|learn|course|tutorial|doc|paper|article|guide|edu|blog)\//i.test(url);

  return matchesDomain || matchesKeyword;
}

// 1. Text density estimation and word count parser
function analyzePageMetrics() {
  const paragraphs = document.querySelectorAll('p');
  let totalParagraphTextLength = 0;
  paragraphs.forEach(p => {
    totalParagraphTextLength += (p.textContent || '').trim().length;
  });

  const bodyTextLength = (document.body.innerText || '').length || 1;
  const textRatio = totalParagraphTextLength / bodyTextLength;
  
  // Word count estimation
  const words = (document.body.innerText || '').split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  return {
    wordCount,
    densityScore: Math.round(textRatio * 100) / 10, // range 0 to 10
    estimatedReadingTime: Math.max(1, Math.ceil(wordCount / 220)) // 220 wpm avg
  };
}

// 2. Main content extraction (Mozilla Readability pattern)
function extractMainContent(): string {
  const selectors = [
    'article',
    'main',
    '[role="main"]',
    '#content',
    '.content',
    '#main',
    '.main',
    '.post-content',
    '.entry-content'
  ];

  for (const s of selectors) {
    const el = document.querySelector(s);
    if (el) {
      const text = (el as HTMLElement).innerText || '';
      if (text.trim().length > 300) {
        return text.trim();
      }
    }
  }

  // Fallback: search for DIV with most paragraphs
  const divs = document.querySelectorAll('div');
  let bestDiv: HTMLDivElement | null = null;
  let maxPCount = 0;

  divs.forEach(div => {
    const pCount = div.querySelectorAll('p').length;
    if (pCount > maxPCount) {
      maxPCount = pCount;
      bestDiv = div;
    }
  });

  if (bestDiv && (bestDiv as HTMLDivElement).innerText.trim().length > 300) {
    return (bestDiv as HTMLDivElement).innerText.trim();
  }

  return (document.body.innerText || '').trim();
}

function getMetaAuthor(): string {
  const authorEl = document.querySelector('meta[name="author"]') || 
                   document.querySelector('meta[property="article:author"]');
  return authorEl ? authorEl.getAttribute('content') || 'Unknown Author' : 'Unknown Author';
}

function getMetaKeywords(): string[] {
  const keywordsEl = document.querySelector('meta[name="keywords"]') ||
                     document.querySelector('meta[name="news_keywords"]');
  if (keywordsEl) {
    const content = keywordsEl.getAttribute('content') || '';
    return content.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// 3. Inject premium floating capture panel
function injectCapturePanel() {
  if (document.getElementById('nexus-capture-root')) return;

  const metrics = analyzePageMetrics();
  const author = getMetaAuthor();
  const keywords = getMetaKeywords();

  // Create UI container
  const container = document.createElement('div');
  container.id = 'nexus-capture-root';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 999999;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  // Create style element for animations and styling
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    .nexus-trigger-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      background: rgba(18, 18, 18, 0.85);
      border: 1px border-color: rgba(255, 255, 255, 0.1);
      border-radius: 99px;
      color: #FFF;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .nexus-trigger-btn:hover {
      background: rgba(18, 18, 18, 0.95);
      border-color: #00f2fe;
      box-shadow: 0 0 15px rgba(0, 242, 254, 0.4);
    }
    .nexus-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00f2fe;
      box-shadow: 0 0 8px #00f2fe;
    }
    .nexus-popover {
      position: absolute;
      bottom: 50px;
      right: 0;
      width: 260px;
      padding: 16px;
      background: rgba(18, 18, 18, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #FFF;
      backdrop-filter: blur(16px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      opacity: 0;
      transform: translateY(10px) scale(0.95);
      pointer-events: none;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #nexus-capture-root:hover .nexus-popover {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    .nexus-popover-title {
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #FFF, #00f2fe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .nexus-metric-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-bottom: 6px;
      color: #AAA;
      font-family: monospace;
    }
    .nexus-metric-val {
      color: #FFF;
      font-weight: bold;
    }
    .nexus-chip-container {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 8px;
    }
    .nexus-mini-chip {
      font-size: 9px;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      color: #ccc;
    }
  `;

  document.head.appendChild(styleEl);

  // Build structure
  container.innerHTML = `
    <div class="nexus-popover">
      <div class="nexus-popover-title">Cortex Insights</div>
      <div class="nexus-metric-row">
        <span>Est. Focus Time:</span>
        <span class="nexus-metric-val">${metrics.estimatedReadingTime} min</span>
      </div>
      <div class="nexus-metric-row">
        <span>Word Count:</span>
        <span class="nexus-metric-val">${metrics.wordCount}</span>
      </div>
      <div class="nexus-metric-row">
        <span>Read Density:</span>
        <span class="nexus-metric-val">${metrics.densityScore}/10</span>
      </div>
      ${author !== 'Unknown Author' ? `
        <div class="nexus-metric-row">
          <span>Author:</span>
          <span class="nexus-metric-val">${author}</span>
        </div>
      ` : ''}
      <div class="nexus-chip-container">
        ${keywords.slice(0, 4).map(k => `<span class="nexus-mini-chip">${k}</span>`).join('')}
      </div>
    </div>
    <button class="nexus-trigger-btn">
      <span class="nexus-dot"></span>
      <span>Add to Cortex</span>
    </button>
  `;

  const triggerBtn = container.querySelector('.nexus-trigger-btn') as HTMLButtonElement;
  const dot = container.querySelector('.nexus-dot') as HTMLElement;

  triggerBtn.addEventListener('click', () => {
    triggerBtn.disabled = true;
    triggerBtn.textContent = 'Analyzing content...';
    
    // Extract main text content snippet
    const mainContent = extractMainContent();

    (chrome as any).runtime.sendMessage({
      action: 'addToCortex',
      data: {
        url: window.location.href,
        title: document.title,
        content_snippet: mainContent.slice(0, 1500),
        word_count: metrics.wordCount,
        reading_time_mins: metrics.estimatedReadingTime,
        density_score: metrics.densityScore,
        author: author,
        meta_keywords: keywords
      }
    }, (response: any) => {
      if (response && response.success) {
        triggerBtn.innerHTML = '✓ Marked in Cortex';
        triggerBtn.style.color = '#10B981';
        triggerBtn.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.4)';
      } else {
        triggerBtn.innerHTML = '✗ Error Saving';
        triggerBtn.style.color = '#EF4444';
        triggerBtn.disabled = false;
        setTimeout(() => {
          triggerBtn.innerHTML = `<span class="nexus-dot"></span><span>Add to Cortex</span>`;
          triggerBtn.style.color = '#FFF';
          triggerBtn.style.boxShadow = '';
        }, 3000);
      }
    });
  });

  document.body.appendChild(container);
}

if (shouldInject()) {
  injectCapturePanel();
}

// 4. Listen for cross-connection context matches from background worker
(chrome as any).runtime.onMessage.addListener((message: any) => {
  if (message.action === 'showCrossConnection') {
    const connections: string[] = message.connections;
    
    // Create connection notification toast
    const toastEl = document.createElement('div');
    toastEl.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 9999999;
      width: 300px;
      padding: 16px;
      background: rgba(18, 18, 18, 0.95);
      border: 1px solid #00f2fe;
      border-radius: 12px;
      color: #FFF;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 0 20px rgba(0, 242, 254, 0.3);
      backdrop-filter: blur(12px);
      transform: translateX(350px);
      transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;

    toastEl.innerHTML = `
      <div style="font-size: 13px; font-weight: bold; color: #00f2fe; margin-bottom: 4px;">NEXUS Connection Found</div>
      <div style="font-size: 11px; color: #AAA; line-height: 1.4; margin-bottom: 8px;">
        This page relates to past things you captured in your Cortex:
      </div>
      <div style="font-size: 11px; font-style: italic; color: #FFF; border-left: 2px solid #00f2fe; padding-left: 8px; margin-bottom: 8px; max-height: 100px; overflow-y: auto;">
        ${connections.map(c => `• ${c}`).join('<br/>')}
      </div>
      <div style="display: flex; justify-content: flex-end;">
        <button id="nexus-toast-close" style="background: none; border: none; color: #AAA; font-size: 10px; cursor: pointer; text-transform: uppercase; letter-spacing: 0.5px;">Dismiss</button>
      </div>
    `;

    document.body.appendChild(toastEl);
    
    // Slide in
    setTimeout(() => {
      toastEl.style.transform = 'translateX(0)';
    }, 100);

    const closeBtn = toastEl.querySelector('#nexus-toast-close');
    closeBtn?.addEventListener('click', () => {
      toastEl.style.transform = 'translateX(350px)';
      setTimeout(() => toastEl.remove(), 400);
    });

    // Auto dismiss after 10 seconds
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.style.transform = 'translateX(350px)';
        setTimeout(() => toastEl.remove(), 400);
      }
    }, 10000);
  }
});


