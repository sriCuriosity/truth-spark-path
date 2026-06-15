// Framework-agnostic <nexus-consent-gate> custom element

export class NexusConsentGate extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .gate-card {
          padding: 20px;
          background: rgba(18, 18, 18, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #FFF;
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }
        .gate-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 6px;
          color: #00f2fe;
          letter-spacing: 0.5px;
        }
        .gate-desc {
          font-size: 11px;
          color: #AAA;
          margin-bottom: 16px;
          line-height: 1.4;
        }
        .consent-option {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 11px;
          cursor: pointer;
          user-select: none;
        }
        .consent-option input {
          width: 14px;
          height: 14px;
          accent-color: #00f2fe;
        }
        .btn-connect {
          width: 100%;
          padding: 10px;
          background: #00f2fe;
          color: #000;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
          box-shadow: 0 0 10px rgba(0, 242, 254, 0.2);
        }
        .btn-connect:hover {
          opacity: 0.9;
          box-shadow: 0 0 15px rgba(0, 242, 254, 0.4);
        }
      </style>
      <div class="gate-card">
        <div class="gate-title">NEXUS Consent Gating</div>
        <div class="gate-desc">Configure your sovereign data access options before authorizing connection.</div>
        <div class="options">
          <label class="consent-option">
            <input type="checkbox" id="dataSharing" checked>
            <span>Allow Cortex index archiving</span>
          </label>
          <label class="consent-option">
            <input type="checkbox" id="aiTraining">
            <span>Opt-in to anonymous Socratic training</span>
          </label>
          <label class="consent-option">
            <input type="checkbox" id="publicVisibility">
            <span>Visible to public Learning Circles</span>
          </label>
        </div>
        <button class="btn-connect" id="connectBtn">Connect with OAuth2</button>
      </div>
    `;

    const connectBtn = this.shadowRoot.getElementById('connectBtn');
    connectBtn?.addEventListener('click', () => {
      const dataSharing = (this.shadowRoot?.getElementById('dataSharing') as HTMLInputElement)?.checked;
      const aiTraining = (this.shadowRoot?.getElementById('aiTraining') as HTMLInputElement)?.checked;
      const publicVisibility = (this.shadowRoot?.getElementById('publicVisibility') as HTMLInputElement)?.checked;

      this.dispatchEvent(new CustomEvent('consent-authorize', {
        detail: { dataSharing, aiTraining, publicVisibility }
      }));
    });
  }
}

if (typeof window !== 'undefined' && !customElements.get('nexus-consent-gate')) {
  customElements.define('nexus-consent-gate', NexusConsentGate);
}
