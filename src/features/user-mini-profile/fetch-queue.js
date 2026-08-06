import { USER_FETCH_CONCURRENCY } from '../../core/constants.js';
import { state } from './state.js';

export function enqueueFetch(fn) {
  return new Promise((resolve) => {
    const run = async () => {
      state.inFlightFetches += 1;
      try {
        resolve(await fn());
      } finally {
        state.inFlightFetches -= 1;
        const next = state.fetchQueue.shift();
        if (next) next();
      }
    };
    if (state.inFlightFetches < USER_FETCH_CONCURRENCY) run();
    else state.fetchQueue.push(run);
  });
}
