import { useEffect, useRef } from 'react';

/**
 * Hook that runs functions ONCE on mount
 * @param args comma separated functions
 */
function useMount(...args: Array<() => any>): void {
  const result = useRef();
  useEffect(() => {
    args.forEach(arg => {
      if (typeof arg === 'function') {
        result.current = arg();
      }
    });

    if (typeof result.current === 'function') {
      return result.current;
    }
  }, []);
}

export default useMount;
