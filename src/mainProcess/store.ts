import { ipcMain } from 'electron';
import log from 'electron-log';
import internalIp from 'internal-ip';
import { Middleware } from 'redux';

import { stateChanged } from '../state/actions';
import { getSubjectName } from '../state/certInfo';
import partialSubscribe from '../state/partialSubscribe';
import { loadStore, persistState } from '../state/persist';
import createStore from '../state/store';
import { send } from './mainWindow';

log.catchErrors();

const stateVersion = { current: 0 };

const mainEnhancer: Middleware = ({ getState }) => next => (action) => {
  stateVersion.current += 1;
  const result = next(action);
  send('newState', stateVersion.current, getState());
  return result;
};

const store = createStore({
  preloadedState: loadStore(), middlewares: [mainEnhancer], logger: log,
});
persistState(store.getState());
store.subscribe(() => persistState(store.getState()));


const updateIpAddressNow = async () => {
  const ipAddress = await internalIp.v4();
  const state = store.getState();
  if (ipAddress && ipAddress !== state.liveState.localIpAddress) {
    store.dispatch(stateChanged({ localIpAddress: ipAddress }));
  }
};
updateIpAddressNow();
setInterval(updateIpAddressNow, 10000);


partialSubscribe(
  store,
  state => state.settings.server.https.certPath,
  certPath => getSubjectName(certPath).then(domain => store.dispatch(stateChanged({ domain }))),
);


ipcMain.on('action', (event, version, action) => {
  store.dispatch(action);
  // eslint-disable-next-line no-param-reassign
  event.returnValue = store.getState();
});

export const sendState = () => {
  send('newState', stateVersion.current, store.getState());
};

export default store;
