import log from 'electron-log';
import passwordGenerator from 'generate-password';
import _ from 'lodash';
import { v4 as uuidV4 } from 'uuid';

import { generateSecretKey } from '../utils';
import {
  Action, ADD_INTERPRETER, ADD_LISTENER, CHANGE_SETTINGS, REMOVE_INTERPRETER, REMOVE_LISTENER,
  RESET_SETTINGS, SERVER_STATE_CHANGED,
} from './actions';
import { State } from './types';


const initialLanguageId = uuidV4();

const initialLanguageLiveState = {
  interpreterConnectCount: 0,
  interpreterSocketId: null,
  listenerConnectCount: 0,
  listeners: [],
};

export const initialState: State = {
  liveState: {
    languages: {
      [initialLanguageId]: initialLanguageLiveState,
    },
    server: {
      http: {
        status: 'stopped',
      },
      https: {
        status: 'stopped',
      },
    },
  },
  settings: {
    interpreterPassword: passwordGenerator.generate({
      length: 16, numbers: true, uppercase: false, excludeSimilarCharacters: true,
    }),
    languages: [{
      enable: true,
      id: initialLanguageId,
      name: 'English',
      public: true,
    }],
    secretKey: generateSecretKey(),
    server: {
      enable: true,
      http: {
        enable: true,
        port: 8080,
      },
      https: {
        enable: false,
        port: 8443,
        certPath: '',
        keyPath: '',
      },
    },
  },
};


export const reconcileState = (state: State): State => ({
  ...state,
  liveState: {
    ...state.liveState,
    languages: state.settings.languages
      .filter(language => language.enable)
      .reduce((all, language) => ({
        ...all,
        [language.id]: {
          ...initialLanguageLiveState,
          ...state.liveState.languages[language.id],
        },
      }), {}),
    server: _.mapValues(state.liveState.server, (server, protocol) => {
      if (
        server.status === 'error'
        && !state.settings.server[protocol as keyof typeof state.liveState.server].enable
      ) {
        return <const>{ status: 'stopped' };
      }
      return server;
    }),
  },
});


const languageEnabled = (state: State, languageId: string) => (
  !state.settings.languages
    .some(language => language.id === languageId && language.enable)
);


// eslint-disable-next-line @typescript-eslint/default-param-last
const reducer = (oldState: State = initialState, action: Action): State => {
  const state = reconcileState(oldState);
  switch (action.type) {
    case ADD_INTERPRETER: {
      if (languageEnabled(state, action.languageId)) {
        log.info(`Cannot interpret for non-available language: ${action.languageId}`);
        return state;
      }
      const language = state.liveState.languages[action.languageId];
      if (language.interpreterSocketId) {
        log.info(`Cannot interpret for a language, that is already being interpreted: ${action.languageId}`);
      }
      return reconcileState({
        ...state,
        liveState: {
          ...state.liveState,
          languages: {
            ...state.liveState.languages,
            [action.languageId]: {
              ...language,
              interpreterConnectCount: language.interpreterConnectCount + 1,
              interpreterSocketId: action.socketId,
            },
          },
        },
      });
    }
    case ADD_LISTENER: {
      if (languageEnabled(state, action.languageId)) {
        log.info(`Cannot listen for non-available language: ${action.languageId}`);
        return state;
      }
      const language = state.liveState.languages[action.languageId];
      return reconcileState({
        ...state,
        liveState: {
          ...state.liveState,
          languages: {
            ...state.liveState.languages,
            [action.languageId]: {
              ...language,
              listeners: language.listeners.includes(action.socketId)
                ? language.listeners
                : [...language.listeners, action.socketId],
            },
          },
        },
      });
    }
    case REMOVE_INTERPRETER:
      return reconcileState({
        ...state,
        liveState: {
          ...state.liveState,
          languages: _.mapValues(
            state.liveState.languages,
            language => (
              language.interpreterSocketId === action.socketId
                ? { ...language, interpreterSocketId: null }
                : language
            ),
          ),
        },
      });
    case REMOVE_LISTENER:
      return reconcileState({
        ...state,
        liveState: {
          ...state.liveState,
          languages: _.mapValues(
            state.liveState.languages,
            language => ({
              ...language,
              listeners: language.listeners.filter(listener => listener !== action.socketId),
            }),
          ),
        },
      });
    case SERVER_STATE_CHANGED:
      return reconcileState({
        ...state,
        liveState: {
          ...state.liveState,
          server: {
            ...state.liveState.server,
            [action.protocol]: action.state,
          },
        },
      });
    case CHANGE_SETTINGS:
      return reconcileState({
        ...state,
        settings: { ...state.settings, ...action.newSettings },
      });
    case RESET_SETTINGS:
      return reconcileState(initialState);
    default:
      return state;
  }
};

export default reducer;
