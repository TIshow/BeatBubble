const SIDE_DIALOG_MEDIA = '(min-width: 900px)';

export function usesSideDiscoveryDialog(): boolean {
  return window.matchMedia(SIDE_DIALOG_MEDIA).matches;
}
