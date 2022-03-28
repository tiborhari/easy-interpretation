import cookieSession from 'cookie-session';
import log from 'electron-log';
import express from 'express';
import expressWs from 'express-ws';
import fs from 'fs';
import http from 'http';
import https from 'https';
import Keygrip from 'keygrip';
import _ from 'lodash';
import path from 'path';
import secureCompare from 'secure-compare';
import tls from 'tls';
import { v4 as uuidV4 } from 'uuid';
import NodeWebSocket from 'ws';

import { ServerState } from '../gui/types';
import {
  addInterpreter, addListener, removeInterpreter, removeListener, serverStateChanged,
} from '../state/actions';
import { State } from '../state/types';
import { errorToString } from '../utils';
import store from './store';


declare const CLIENT_WEBPACK_ENTRY: string;
const STATIC_ROOT = path.dirname(CLIENT_WEBPACK_ENTRY.startsWith('file://') ? CLIENT_WEBPACK_ENTRY.substring(7) : CLIENT_WEBPACK_ENTRY);

const expressApp = express();

const httpServer = http.createServer(expressApp);
const httpsServer = https.createServer(expressApp);
const servers: {
  http: http.Server;
  https: https.Server;
} = <const>{
  http: httpServer,
  https: httpsServer,
};
const credentialsRef: {
  current: tls.SecureContextOptions | null;
} = { current: null };
const keyList: string[] = ['THIS_WILL_BE_REPLACED'];
const keys = Keygrip(keyList);

expressWs(expressApp, httpServer);
let { app } = expressWs(expressApp, httpsServer);

const webSockets: { [socketId: string]: NodeWebSocket } = {};

log.info(`Serving static files from ${STATIC_ROOT}`);
app = app.use(cookieSession({
  name: 'session',
  keys,
  // Cookie Options
  maxAge: 4 * 60 * 60 * 1000, // 4 hours
}));
app.use(express.static(STATIC_ROOT));
app.use(express.json());
app.use('/client', express.static(STATIC_ROOT)); // index.html referst to '../client/index.js'


const getAvailableLanguages = (state: State, req: express.Request) => {
  let languages = state.settings.languages.filter(language => language.enable);
  if (!req.session?.isInterpreter) {
    languages = languages.filter(language => language.public);
  }
  return languages;
};


const createServerResponse = (state: State, req: express.Request): ServerState => ({
  isLoggedIn: !!req.session?.isInterpreter,
  languages: getAvailableLanguages(state, req).map(language => ({
    id: language.id,
    live: state.liveState.languages[language.id]?.interpreterSocketId !== null,
    name: language.name,
  })),
});


app.get('/state', (req, res) => {
  const state = store.getState();
  res.json(createServerResponse(state, req));
});

app.post('/login', (req, res) => {
  const state = store.getState();
  if (
    !secureCompare(req.body.password, state.settings.interpreterPassword)
    || !state.settings.interpreterPassword
  ) {
    res.sendStatus(401);
    return;
  }
  if (!req.session) {
    req.session = {};
  }
  req.session.isInterpreter = true;
  res.json(createServerResponse(state, req));
});

app.post('/logout', (req, res) => {
  if (!req.session) {
    req.session = {};
  }
  req.session.isInterpreter = false;
  const state = store.getState();
  res.json(createServerResponse(state, req));
});

const getInterpreterSocket = (languageId: string) => {
  const state = store.getState();
  const language = state.liveState.languages[languageId];
  if (language) {
    const { interpreterSocketId } = language;
    if (interpreterSocketId && interpreterSocketId in webSockets) {
      return webSockets[interpreterSocketId];
    }
  }
  return null;
};

app.ws('/listen/:languageId', (ws, req) => {
  const { languageId } = req.params;
  const socketId = uuidV4();
  webSockets[socketId] = ws;
  log.info(`Listener connected for ${languageId} with socket: ${socketId}`);

  const state = store.getState();
  const language = getAvailableLanguages(state, req).find(lang => lang.id === languageId);
  if (!language) {
    ws.close(4404);
    return;
  }

  const { interpreterSocketId } = state.liveState.languages[language.id];
  if (interpreterSocketId) {
    ws.send(JSON.stringify({ type: 'newInterpreter', interpreterId: interpreterSocketId }));
  }

  store.dispatch(addListener({ languageId, socketId }));

  ws.on('message', (msg) => {
    const message = JSON.parse(msg.toString());
    if (message.type === 'signal') {
      const { interpreterId, signal } = message;
      // TODO: Sanity check for interpreterId
      if (interpreterId in webSockets) {
        webSockets[interpreterId].send(JSON.stringify({ type: 'signal', listenerId: socketId, signal }));
      }
    }
  });

  ws.on('close', () => {
    delete webSockets[socketId];
    store.dispatch(removeListener({ socketId }));
    const interpreterSocket = getInterpreterSocket(languageId);
    if (interpreterSocket) {
      interpreterSocket.send(JSON.stringify({ type: 'removeListener', listenerId: socketId }));
    }
    log.info(`Listener disconnected for ${languageId} with socket: ${socketId}`);
  });
});

app.ws('/interpret/:languageId', (ws, req) => {
  if (!req.session?.isInterpreter) {
    ws.close(4403);
    return;
  }
  const { languageId } = req.params;
  const socketId = uuidV4();
  webSockets[socketId] = ws;
  log.info(`Interpreter connected for ${languageId} with socket: ${socketId}`);

  const state = store.getState();
  const language = state.liveState.languages[languageId];

  if (!language) {
    ws.close(4404);
    return;
  } if (language.interpreterSocketId) {
    // Already interpreted by somebody else.
    ws.close(4409);
    return;
  }

  store.dispatch(addInterpreter({ languageId, socketId }));
  language.listeners.forEach((listenerId) => {
    if (listenerId in webSockets) {
      webSockets[listenerId].send(JSON.stringify({ type: 'newInterpreter', interpreterId: socketId }));
    }
  });

  ws.on('message', (msg) => {
    const message = JSON.parse(msg.toString());
    if (message.type === 'signal') {
      const { listenerId, signal } = message;
      // TODO: Sanity check for listenerId
      if (listenerId in webSockets) {
        webSockets[listenerId].send(JSON.stringify({ type: 'signal', interpreterId: socketId, signal }));
      }
    }
  });

  ws.on('close', () => {
    delete webSockets[socketId];
    store.dispatch(removeInterpreter({ socketId }));
    log.info(`Interpreter disconnected for ${languageId} with socket: ${socketId}`);
  });
});

// Subscribe to state changes, and close connections, that are not found in the state.
store.subscribe(() => {
  const state = store.getState();
  const socketIdsInState = new Set();
  Object.values(state.liveState.languages).forEach((language) => {
    socketIdsInState.add(language.interpreterSocketId);
    language.listeners.forEach(socketId => socketIdsInState.add(socketId));
  });

  Object.entries(webSockets)
    .filter(([socketId]) => !socketIdsInState.has(socketId))
    .forEach(([, ws]) => ws.close());
});


// Handle server events (close, error)
(<const>['http', 'https']).forEach((protocol) => {
  const server = servers[protocol];
  server.on('close', () => {
    log.info(`${protocol} server closed`);
    // Keep error status
    if (store.getState().liveState.server[protocol].status !== 'error') {
      store.dispatch(serverStateChanged({ protocol, state: { status: 'stopped' } }));
    }
  });
  server.on('error', (error) => {
    log.info(`${protocol} server error`);
    if (!server.listening) {
      store.dispatch(serverStateChanged({ protocol, state: { status: 'error', error: errorToString(error) } }));
      log.error(errorToString(error));
    }
  });
});

// Manage server startup/shutdown based on the state.
const manageServers = () => {
  const state = store.getState();
  const serversState = state.liveState.server;
  const serversSettings = state.settings.server;

  keyList[0] = state.settings.secretKey;

  const newCredentials = {
    cert: serversSettings.https.certPath, key: serversSettings.https.keyPath,
  };
  if (
    serversSettings.enable
    && serversSettings.https.enable
    && !_.isEqual(credentialsRef.current, newCredentials)
  ) {
    try {
      const privateKey = fs.readFileSync(newCredentials.key);
      const certificate = fs.readFileSync(newCredentials.cert);
      const secureContext = { key: privateKey, cert: certificate };
      httpsServer.setSecureContext(secureContext);
      credentialsRef.current = newCredentials;
    } catch (error) {
      store.dispatch(serverStateChanged({ protocol: 'https', state: { status: 'error', error: errorToString(error) } }));
      log.error(errorToString(error));
    }
  }

  (<const>['http', 'https']).forEach((protocol) => {
    const settings = serversSettings[protocol];
    const serverState = serversState[protocol];
    const server = servers[protocol];

    if (
      (settings.enable && serverState.status === 'stopped')
      || ('port' in serverState && settings.port !== serverState.port)
    ) {
      if (server.listening) {
        server.close();
        return;
      }
      store.dispatch(serverStateChanged({ protocol, state: { port: settings.port, status: 'starting' } }));
      try {
        log.info(`${protocol} server starting`);
        server.listen(settings.port, () => {
          log.info(`${protocol} server listening`);
          store.dispatch(serverStateChanged({ protocol, state: { port: settings.port, status: 'started' } }));
        });
      } catch (error) {
        store.dispatch(serverStateChanged({ protocol, state: { status: 'error', error: errorToString(error) } }));
        log.error(errorToString(error));
      }
    } else if (!settings.enable && (['started', 'starting'].includes(serverState.status) || server.listening)) {
      log.info(`${protocol} server stopping`);
      server.close();
    }
  });
};

const manageServersIsRunning = { current: false };
const manageServersWrapper = () => {
  if (manageServersIsRunning.current) {
    return;
  }
  manageServersIsRunning.current = true;
  try {
    manageServers();
  } finally {
    manageServersIsRunning.current = false;
  }
};

export const startServer = () => {
  store.subscribe(manageServersWrapper);
  manageServersWrapper();
};
