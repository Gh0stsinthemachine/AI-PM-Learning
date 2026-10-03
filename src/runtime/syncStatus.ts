export type SyncStatus = 'loading' | 'local-only' | 'saved' | 'saving' | 'retrying' | 'error';

export const SYNC_COPY: Record<SyncStatus, string> = {
  loading: 'Checking saved progress…',
  'local-only': 'Saved in this browser only',
  saved: 'Saved to your account',
  saving: 'Saving…',
  retrying: 'Retrying…',
  error: 'Not synced yet. It will retry on your next change.',
};
