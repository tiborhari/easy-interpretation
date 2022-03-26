
export const websocketOptions = <const>{
  maxReconnectionDelay: 3000 + Math.random() * 1000,
  minReconnectionDelay: 1000 + Math.random() * 1000,
};

export const getWebSocketURL = () => (
  `ws${window.location.protocol === 'https:' ? 's' : ''}://${window.location.host}`
);
