import { useEffect } from 'react';

const FAVICON_ELEMENT_ID = 'app-favicon';

interface DocumentMeta {
  title: string;
  favicon: string;
}

/**
 * Drives the browser tab's title and icon per route, so the public site and the admin panel
 * read as separate products even when both are open side by side.
 */
export const useDocumentMeta = ({ title, favicon }: DocumentMeta): void => {
  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    let link = document.getElementById(FAVICON_ELEMENT_ID) as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.id = FAVICON_ELEMENT_ID;
      link.rel = 'icon';
      document.head.appendChild(link);
    }

    link.type = 'image/svg+xml';
    link.href = favicon;
  }, [favicon]);
};
