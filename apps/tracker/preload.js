const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nexusAPI', {
  getRecentActivity: () => ipcRenderer.invoke('get-recent-activity'),
  onActivityUpdate: (callback) => ipcRenderer.on('activity-update', (event, data) => callback(data))
});
