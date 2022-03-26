import { CombinedState } from 'redux';


export interface LanguageLiveState {
  interpreterConnectCount: number;
  interpreterSocketId: string | null;
  listenerConnectCount: number;
  listeners: string[];
}

export type Protocol = 'http' | 'https';

interface HttpIdleState {
  status: 'stopped';
}
interface HttpOkState {
  port: number;
  status: 'starting' | 'started';
}
interface HttpErrorState {
  status: 'error';
  error: string;
}
export type HttpState = HttpIdleState | HttpOkState | HttpErrorState;

export interface ServerState {
  http: HttpState;
  https: HttpState;
}

interface LiveState {
  languages: { [languageId: string]: LanguageLiveState };
  server: ServerState;
}


export interface LanguageSettings {
  enable: boolean;
  id: string;
  name: string;
  public: boolean;
}

interface HttpSettings {
  enable: boolean;
  port: number;
}
interface HttpsSettings extends HttpSettings {
  certPath: string;
  keyPath: string;
}
interface ServerSettings {
  enable: boolean;
  http: HttpSettings;
  https: HttpsSettings;
}

export interface Settings {
  interpreterPassword: string;
  languages: LanguageSettings[];
  secretKey: string;
  server: ServerSettings;
}


export type State = CombinedState<{
  liveState: LiveState;
  settings: Settings;
}>;
