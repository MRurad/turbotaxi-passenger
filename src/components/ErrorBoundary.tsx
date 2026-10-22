import * as SplashScreen from 'expo-splash-screen';
import { Component, Fragment, type ErrorInfo, type PropsWithChildren } from 'react';

import { logger } from '@/lib/logger';

import { CrashScreen } from './CrashScreen';

interface State {
  error: Error | null;
  /** Bumped on restart: re-mounts the whole tree below with fresh component state. */
  generation: number;
}

/**
 * Last line of defence: a render error anywhere below shows a friendly screen with Restart
 * instead of a blank / red screen. Restart re-mounts the app tree (stores and cache survive).
 */
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { error: null, generation: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // A crash in the first render would otherwise stay hidden under the native splash.
    SplashScreen.hideAsync().catch(() => undefined);
    // No PII: the message and where it happened.
    logger.warn('app: render error', {
      message: error.message,
      componentStack: info.componentStack?.split('\n').slice(0, 5).join('\n'),
    });
  }

  private restart = () =>
    this.setState((state) => ({ error: null, generation: state.generation + 1 }));

  render() {
    if (this.state.error) return <CrashScreen onRestart={this.restart} />;
    return <Fragment key={this.state.generation}>{this.props.children}</Fragment>;
  }
}
