import Store from 'electron-store';
import { PreloadedState } from 'redux';

import { State } from './types';


const jsonStore = new Store<PreloadedState<State>>();


const getPersistedState = (state: State): Partial<State> => ({
  settings: state.settings,
});

let latestPersistedState: Partial<State> | null = null;
const shallowCompare = (obj1: { [key: string]: any }, obj2: { [key: string]: any }): boolean => (
  Object.keys(obj1).length === Object.keys(obj2).length
  && Object.keys(obj1).every(key => obj1[key] === obj2[key])
);

export const persistState = (state: State) => {
  const stateToPersist = getPersistedState(state);
  if (latestPersistedState && shallowCompare(latestPersistedState, stateToPersist)) {
    return;
  }
  latestPersistedState = stateToPersist;
  jsonStore.set(stateToPersist);
};

export const loadStore = () => jsonStore.store;
