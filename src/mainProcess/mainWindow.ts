import { app, BrowserWindow, Menu } from 'electron';
import log from 'electron-log';

import { WINDOW_OPTIONS } from '../common';
import { isDev } from '../utils';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const isMac = process.platform === 'darwin';

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow: BrowserWindow | null = null;


export const send = (channel: string, ...data: unknown[]) => {
  if (mainWindow) {
    mainWindow.webContents.send(channel, ...data);
  }
};


export default () => new Promise<void>((resolve) => {
  log.info('createMainWindow');
  if (mainWindow !== null) {
    resolve();
    return;
  }

  // Create the browser window.
  mainWindow = new BrowserWindow({
    ...WINDOW_OPTIONS,
    webPreferences: {
      ...WINDOW_OPTIONS.webPreferences,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
  log.info('mainWindow.loadURL');
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    log.info('mainWindow.closed');
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;

    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    const menu = Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          isMac ? { role: 'close' } : { role: 'quit' },
        ],
      },
      {
        label: 'Edit',
        submenu: [
          { role: 'undo' },
          { role: 'redo' },
          { type: 'separator' },
          { role: 'cut' },
          { role: 'copy' },
          { role: 'paste' },
        ],
      },
      {
        label: 'View',
        submenu: [
          { role: 'toggleDevTools' },
          { type: 'separator' },
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' },
        ],
      },
    ]);
    Menu.setApplicationMenu(menu);
    resolve();
  });
});
