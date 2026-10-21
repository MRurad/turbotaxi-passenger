import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler } from 'react-native';

/**
 * Android back in booking mode returns to "Where to?" — only while Home is focused, so it
 * never steals back from the Search modal on top. Open sheets handle back first (see Sheet).
 */
export function useBackToWhereTo(onBack: () => void): void {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        onBack();
        return true;
      });
      return () => sub.remove();
    }, [onBack]),
  );
}
