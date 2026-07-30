import { useSyncExternalStore } from 'react';
import { translations } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const STORAGE_KEY = 'beatbubble-locale';
const LOCALE_CHANGE_EVENT = 'beatbubble-locale-change';

function getStoredLocale(): Locale {
  const savedLocale = localStorage.getItem(STORAGE_KEY);
  return savedLocale === 'en' ? 'en' : 'ja';
}

function getServerLocale(): Locale {
  return 'ja';
}

function subscribeToLocale(onStoreChange: () => void) {
  const handleChange = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== STORAGE_KEY) return;
    onStoreChange();
  };

  window.addEventListener('storage', handleChange);
  window.addEventListener(LOCALE_CHANGE_EVENT, handleChange);
  return () => {
    window.removeEventListener('storage', handleChange);
    window.removeEventListener(LOCALE_CHANGE_EVENT, handleChange);
  };
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribeToLocale, getStoredLocale, getServerLocale);

  const changeLocale = (next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  };

  return { locale, t: translations[locale], changeLocale };
}
