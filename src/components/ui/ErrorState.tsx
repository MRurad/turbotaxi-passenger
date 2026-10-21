import { EmptyState } from './EmptyState';
import type { IconName } from './types';

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel: string;
  onRetry: () => void;
  icon?: IconName;
  testID?: string;
}

/** Failure placeholder with a retry action. Pass a translated `toApiError` message. */
export function ErrorState({
  title,
  message,
  retryLabel,
  onRetry,
  icon = 'cloud-offline-outline',
  testID,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={icon}
      tone="danger"
      title={title}
      message={message}
      actionLabel={retryLabel}
      onAction={onRetry}
      testID={testID}
    />
  );
}
