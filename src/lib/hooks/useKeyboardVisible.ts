import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS fires "will" events (in step with the animation); Android only "did".
const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** True while the software keyboard is (about to be) on screen. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(SHOW_EVENT, () => setVisible(true));
    const hide = Keyboard.addListener(HIDE_EVENT, () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}
