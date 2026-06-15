const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let mainWindow = null;
let activityLog = []; // Memory cache fallback for database log

// Setup mock SQLite database helper to be platform independent
let db = {
  run: (query, params, cb) => cb && cb(null),
  all: (query, params, cb) => cb && cb(null, activityLog),
  close: () => {}
};

try {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(app.getPath('userData'), 'nexus_activity.db');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error("SQLite opening failed, falling back to memory log:", err);
    } else {
      console.log("SQLite opened at:", dbPath);
      db.run(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filepath TEXT,
          action TEXT,
          semantic_tag TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
  });
} catch (e) {
  console.log("Sqlite3 bindings missing, operating in memory-only mode.");
}

function watchWorkspace() {
  const watchPath = path.join(app.getPath('home'), 'nexus_workspace');
  if (!fs.existsSync(watchPath)) {
    try {
      fs.mkdirSync(watchPath);
      fs.writeFileSync(path.join(watchPath, 'claim_deconstruction.txt'), 'Reflecting on media loaded language definitions.');
    } catch(err) {
      console.log("Could not auto-create watch path:", err);
    }
  }

  // Simulate file watching and tagging
  setInterval(() => {
    const actions = ['file_created', 'file_modified', 'tag_indexed'];
    const files = ['curriculum_analysis.md', 'epistemology_claims.json', 'somatics_notes.txt', 'reflection_journal.txt'];
    const tags = ['Epistemology', 'Skepticism', 'Media Literacy', 'Somatic Focus'];
    
    const randomFile = files[Math.floor(Math.random() * files.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];
    const randomTag = tags[Math.floor(Math.random() * tags.length)];

    const logItem = {
      filepath: path.join(watchPath, randomFile),
      action: randomAction,
      semantic_tag: randomTag,
      timestamp: new Date().toISOString()
    };

    activityLog.unshift(logItem);
    if (activityLog.length > 50) activityLog.pop();

    try {
      db.run(
        `INSERT INTO activity_log (filepath, action, semantic_tag, timestamp) VALUES (?, ?, ?, ?)`,
        [logItem.filepath, logItem.action, logItem.semantic_tag, logItem.timestamp]
      );
    } catch(e) {}

    // Dispatch event to window
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('activity-update', logItem);
    }
  }, 5000);
}

function createDashboard() {
  mainWindow = new BrowserWindow({
    width: 380,
    height: 500,
    show: false,
    frame: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  mainWindow.on('blur', () => {
    mainWindow.hide();
  });
}

function createTray() {
  // Use a simulated native icon dot to ensure it starts without needing real assets
  const iconPath = path.join(__dirname, 'tray_icon.png');
  // Write a fallback 1x1 transparent png if none exists
  if (!fs.existsSync(iconPath)) {
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(iconPath, transparentPng);
  }

  tray = new Tray(iconPath);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Workspace Dashboard', click: () => toggleWindow() },
    { type: 'separator' },
    { label: 'Quit NEXUS Tracker', click: () => app.quit() }
  ]);

  tray.setToolTip('NEXUS Local Activity Watcher');
  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    toggleWindow();
  });
}

const toggleWindow = () => {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    const trayBounds = tray.getBounds();
    const windowBounds = mainWindow.getBounds();
    const x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2));
    const y = Math.round(trayBounds.y - windowBounds.height);
    
    mainWindow.setPosition(x, y, false);
    mainWindow.show();
    mainWindow.focus();
  }
};

app.whenReady().then(() => {
  createDashboard();
  createTray();
  watchWorkspace();

  ipcMain.handle('get-recent-activity', async () => {
    return activityLog;
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
