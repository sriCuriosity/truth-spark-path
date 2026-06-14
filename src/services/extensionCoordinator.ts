// Handles communication between the NEXUS web app and the browser extension
// Uses window.postMessage protocol (same origin) when popup is embedded
// Uses BroadcastChannel for cross-tab coordination

export const ExtensionCoordinator = {
  sendAuthToExtension(token: string) {
    window.postMessage({ type: "NEXUS_AUTH_TOKEN", token }, "*");
  },

  onActivitySubmitted(callback: (data: any) => void) {
    window.addEventListener("message", (event) => {
      if (event.data?.type === "NEXUS_ACTIVITY_SUBMITTED") {
        callback(event.data.payload);
      }
    });
  },

  notifyCortexUpdated(entry: any) {
    const channel = new BroadcastChannel("nexus_cortex");
    channel.postMessage({ type: "CORTEX_ENTRY_CREATED", entry });
    channel.close();
  },
};
