import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AccessibilityInfo } from 'react-native';

import { TOAST_DURATION_MS } from '@/constants/timeouts';
import { triggerHaptic } from '@/lib/haptics';

import { ToastView, type ToastTone } from './ToastView';

export interface ToastOptions {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
}

interface ToastState extends Required<ToastOptions> {
  id: number;
}

interface ToastContextValue {
  show: (options: ToastOptions) => void;
  hide: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const HAPTIC_BY_TONE = {
  info: 'none',
  success: 'success',
  warning: 'warning',
  danger: 'warning',
} as const;

/** Shows one toast at a time; a new toast replaces the current one. */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(0);

  const hide = useCallback(() => setToast(null), []);

  const show = useCallback(
    ({ message, tone = 'info', durationMs = TOAST_DURATION_MS }: ToastOptions) => {
      nextId.current += 1;
      setToast({ id: nextId.current, message, tone, durationMs });
      triggerHaptic(HAPTIC_BY_TONE[tone]);
      AccessibilityInfo.announceForAccessibility(message);
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(hide, toast.durationMs);
    return () => clearTimeout(timer);
  }, [toast, hide]);

  const value = useMemo(() => ({ show, hide }), [show, hide]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <ToastView key={toast.id} message={toast.message} tone={toast.tone} onDismiss={hide} />
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
