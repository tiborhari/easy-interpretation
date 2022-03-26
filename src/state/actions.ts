import { HttpState, Protocol, Settings } from './types';

export const ADD_LISTENER = 'ADD_LISTENER';
export const addListener = ({
  languageId, socketId,
}: {
  languageId: string; socketId: string;
}) => (<const>{
  type: ADD_LISTENER, languageId, socketId,
});

export const REMOVE_LISTENER = 'REMOVE_LISTENER';
export const removeListener = ({
  socketId,
}: {
  socketId: string;
}) => (<const>{
  type: REMOVE_LISTENER, socketId,
});

export const ADD_INTERPRETER = 'ADD_INTERPRETER';
export const addInterpreter = ({
  languageId, socketId,
}: {
  languageId: string; socketId: string;
}) => (<const>{
  type: ADD_INTERPRETER, languageId, socketId,
});

export const REMOVE_INTERPRETER = 'REMOVE_INTERPRETER';
export const removeInterpreter = ({
  socketId,
}: {
  socketId: string;
}) => (<const>{
  type: REMOVE_INTERPRETER, socketId,
});


export const SERVER_STATE_CHANGED = 'SERVER_STATE_CHANGED';
export const serverStateChanged = ({
  protocol, state,
}: {
  protocol: Protocol; state: HttpState;
}) => (<const>{
  type: SERVER_STATE_CHANGED, protocol, state,
});

export const CHANGE_SETTINGS = 'CHANGE_SETTINGS';
export const changeSettings = ({
  newSettings,
}: {
  newSettings: Settings;
}) => (<const>{
  type: CHANGE_SETTINGS, newSettings,
});

export const RESET_SETTINGS = 'RESET_SETTINGS';
const resetSettings = () => (<const>{ type: RESET_SETTINGS });


export type Action =
ReturnType<typeof addListener>
| ReturnType<typeof removeListener>
| ReturnType<typeof addInterpreter>
| ReturnType<typeof removeInterpreter>
| ReturnType<typeof serverStateChanged>
| ReturnType<typeof changeSettings>
| ReturnType<typeof resetSettings>;
