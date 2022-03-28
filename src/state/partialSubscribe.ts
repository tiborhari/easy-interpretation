import { Store } from 'redux';


export default <T, S>(
  store: Store<S>,
  stateTransform: (state: S) => T,
  callback: (partialState: T, state: S) => void,
) => {
  const previousValue: { current: T | undefined } = { current: undefined };

  const handleChange = () => {
    const state = store.getState();
    const newValue = stateTransform(state);
    if (newValue !== previousValue.current) {
      callback(newValue, state);
    }
    previousValue.current = newValue;
  };

  handleChange();
  store.subscribe(handleChange);
};
