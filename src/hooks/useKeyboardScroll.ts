import { useEffect } from 'react';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

export const useKeyboardScroll = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handleKeyboardShow = () => {
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        setTimeout(() => {
          activeElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
        }, 100);
      }
    };

    Keyboard.addListener('keyboardWillShow', handleKeyboardShow);

    return () => {
      Keyboard.removeAllListeners();
    };
  }, []);
};
