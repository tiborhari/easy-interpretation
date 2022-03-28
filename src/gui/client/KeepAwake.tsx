import React from 'react';


const KeepAwake = ({ active }: { active: boolean }) => {
  const wakeLockRef = React.useRef<WakeLockSentinel>();

  const requestWakeLock = () => {
    console.debug('Requesting Wake Lock');
    navigator.wakeLock.request('screen').then((wakeLock) => {
      console.debug('Wake Lock received');
      wakeLockRef.current = wakeLock;
      wakeLockRef.current.addEventListener('release', () => {
        console.debug('Wake Lock released');
      });
    }).catch((error) => {
      console.error('Cannot get Wake Lock', error);
      wakeLockRef.current = undefined;
    });
  };

  React.useEffect(() => {
    if (!active || !('wakeLock' in navigator)) {
      return undefined;
    }
    if (!('wakeLock' in navigator)) {
      console.error('Wake Lock API is unavailable');
      return undefined;
    }
    requestWakeLock();
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().then(() => {
          wakeLockRef.current = undefined;
        });
      }
    };
  }, [active]);

  const handleVisibilitychange = () => {
    if (wakeLockRef.current && document.visibilityState === 'visible') {
      requestWakeLock();
    }
  };

  React.useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilitychange);
    return () => document.removeEventListener('visibilitychange', handleVisibilitychange);
  }, []);

  return null;
};

export default KeepAwake;
