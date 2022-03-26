import { app, protocol } from 'electron';
import log from 'electron-log';

import createMainWindow from './mainWindow';
import { startServer } from './server';
import { sendState } from './store';


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  log.transports.file.inspectOptions.depth = 5;
  log.info('app.ready');
  startServer();

  createMainWindow().then(() => {
    log.info('createMainWindow.resolved');
    sendState();
  });

  protocol.registerFileProtocol('media', (request, callback) => {
    // On Windows we only have 2 slashes in 'media://'.
    const pathname = decodeURIComponent(request.url.replace('media:///', '').replace('media://', ''));
    callback(pathname);
  });
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
