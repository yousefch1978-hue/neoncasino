import { useCallback, useRef } from 'react';

// Sound URLs - using reliable CDN sources
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  lose: 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3',
  coin: 'https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3',
  cashout: 'https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3',
  explosion: 'https://assets.mixkit.co/active_storage/sfx/2006/2006-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2007/2007-preview.mp3',
  message: 'https://assets.mixkit.co/active_storage/sfx/2008/2008-preview.mp3',
};

export function useSound() {
  const enabledRef = useRef(true);

  const play = useCallback((soundName: keyof typeof SOUNDS) => {
    if (!enabledRef.current) return;

    try {
      const url = SOUNDS[soundName];
      if (!url) return;

      // Create new audio instance for overlapping sounds
      const audio = new Audio(url);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore autoplay errors
      });
    } catch (error) {
      console.error('Sound play error:', error);
    }
  }, []);

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current;
    return enabledRef.current;
  }, []);

  const isEnabled = useCallback(() => {
    return enabledRef.current;
  }, []);

  return { play, toggle, isEnabled };
}

export default useSound;
