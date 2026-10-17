// Which tile layout the viewport gets (see TILE_MODES in dashboard-order.ts). Read from the window
// width, so the first paint already has the right sizes.
import { useSyncExternalStore } from 'react';
import { tileMode, type TileMode } from './dashboard-order';

const subscribe = (notify: () => void) => {
  window.addEventListener('resize', notify);
  return () => window.removeEventListener('resize', notify);
};

export function useTileMode(): TileMode {
  return useSyncExternalStore(subscribe, () => tileMode(window.innerWidth), () => 'desktop');
}
