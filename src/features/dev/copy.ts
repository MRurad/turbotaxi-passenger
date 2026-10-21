/**
 * Dev-only copy (English, never shipped: the dev routes are stripped from release bundles).
 * User-facing strings belong in src/i18n/locales instead.
 */
export const DEV_INSPECTOR_COPY = {
  tabs: { realtime: 'Realtime', network: 'Network' },
  network: {
    title: 'Network',
    subtitle: 'HTTP log (API + Google)',
    requests: (count: number) => `Requests (${count})`,
    clear: 'Clear',
    filterAll: 'All',
    filterErrors: 'Errors only',
    empty: 'No requests yet.',
    emptyErrors: 'No failed requests.',
    filterLabel: 'Filter requests',
    url: 'URL',
    headers: 'Request headers',
    request: 'Request body',
    response: 'Response body',
    noBody: '(empty)',
    duration: (ms: number, time: string) => `${ms} ms · ${time}`,
    rowLabel: (method: string, path: string, status: string, ms: number | null) =>
      `${method} ${path}, status ${status}${ms === null ? '' : `, ${ms} milliseconds`}`,
    expandHint: 'Shows headers and bodies',
    collapseHint: 'Hides headers and bodies',
  },
  tabsLabel: 'Inspector section',
} as const;
