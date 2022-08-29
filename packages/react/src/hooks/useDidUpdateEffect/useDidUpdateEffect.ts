import { useRef, useEffect } from 'react';

/**
 * Will run callback only on args update and NOT on mount
 */
function useDidUpdateEffect(fn: () => any, args: any[]): void {
  const didMountRef = useRef(false);

  useEffect(() => {
    if (didMountRef.current) {
      // run callback if didMount is set to true
      fn();
    } else {
      // istead of running callback, set didMount to true
      didMountRef.current = true;
    }
    // eslint-disable-next-line
  }, args);
}

export default useDidUpdateEffect;
