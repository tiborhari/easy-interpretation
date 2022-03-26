interface LanguageState {
  id: string;
  live: boolean;
  name: string;
}

export interface ServerState {
  isLoggedIn: boolean;
  languages: LanguageState[];
}
