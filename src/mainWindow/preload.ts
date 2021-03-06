import { contextBridge, ipcRenderer, shell } from 'electron';
import log from 'electron-log';


const api = <const>{
  log: <const>{
    debug: log.debug,
    error: log.error,
    info: log.info,
    warn: log.warn,
  },
  onNewState: (callback: Parameters<typeof ipcRenderer.on>[1]) => ipcRenderer.on('newState', callback),
  openLinkInBrowser: (url: string) => {
    try {
      shell.openExternal(url);
    } catch (error) {
      log.error('Error in shell.openExternal', error);
    }
  },
  sendAction: (version: unknown, action: unknown) => ipcRenderer.sendSync('action', version, action),
};

export type API = typeof api;


contextBridge.exposeInMainWorld('api', api);
