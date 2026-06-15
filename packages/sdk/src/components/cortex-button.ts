// Framework-agnostic <nexus-cortex-button> custom element for OAuth2 PKCE flow

export class NexusCortexButton extends HTMLElement {
  static get observedAttributes() {
    return ['client-id', 'redirect-uri', 'supabase-url', 'scope'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  // Helper to generate PKCE cryptographically secure random string
  private generateRandomString(length: number): string {
    const dec2hex = (dec: number) => ('0' + dec.toString(16)).slice(-2);
    const arr = new Uint8Array(length / 2);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, dec2hex).join('');
  }

  // Helper to hash a code verifier for SHA-256 PKCE challenge
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async initiatePKCE() {
    const clientId = this.getAttribute('client-id');
    const redirectUri = this.getAttribute('redirect-uri');
    const supabaseUrl = this.getAttribute('supabase-url') || 'https://bmysxukoqzwunmxhhrah.supabase.co';
    const scope = this.getAttribute('scope') || 'cortex:write';

    if (!clientId || !redirectUri) {
      console.error('<nexus-cortex-button> error: client-id and redirect-uri attributes are required.');
      return;
    }

    try {
      const codeVerifier = this.generateRandomString(64);
      localStorage.setItem('pkce_code_verifier', codeVerifier);

      const codeChallenge = await this.generateCodeChallenge(codeVerifier);
      const state = this.generateRandomString(16);
      localStorage.setItem('pkce_state', state);

      // Build OAuth2 PKCE Authorize URL
      const authUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
      authUrl.searchParams.append('provider', 'google'); // Defaulting to Google OAuth or general provider
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('code_challenge_method', 'S256');
      authUrl.searchParams.append('code_challenge', codeChallenge);
      authUrl.searchParams.append('state', state);
      authUrl.searchParams.append('scope', scope);

      this.dispatchEvent(new CustomEvent('nexus-pkce-initiated', {
        detail: { authUrl: authUrl.toString() }
      }));

      // Redirect user to authorization endpoint
      window.location.href = authUrl.toString();
    } catch (e) {
      console.error('Error initiating PKCE Flow:', e);
    }
  }

  render() {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: inline-block;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .nexus-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
          color: #000;
          font-weight: 700;
          font-size: 13px;
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 0 12px rgba(0, 242, 254, 0.3);
        }
        .nexus-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 0 20px rgba(0, 242, 254, 0.6);
        }
        .nexus-btn:active {
          transform: translateY(1px);
        }
        .nexus-icon {
          width: 16px;
          height: 16px;
          fill: currentColor;
        }
      </style>
      <button class="nexus-btn" id="cortexBtn">
        <svg class="nexus-icon" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
        </svg>
        <span>Connect to NEXUS Cortex</span>
      </button>
    `;

    const btn = this.shadowRoot.getElementById('cortexBtn');
    btn?.addEventListener('click', () => this.initiatePKCE());
  }
}

if (typeof window !== 'undefined' && !customElements.get('nexus-cortex-button')) {
  customElements.define('nexus-cortex-button', NexusCortexButton);
}
