import { useEffect } from 'react';

const FAVICON_ELEMENT_ID = 'app-favicon';
const MANIFEST_ELEMENT_ID = 'app-manifest';

interface DocumentMeta {
  title: string;
  favicon: string;
  /** Per-route PWA manifest, so the public site and the admin panel install as separate apps. */
  manifest?: string;
}

const setLink = (id: string, rel: string, href: string, type?: string): void => {
  let link = document.getElementById(id) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    document.head.appendChild(link);
  }

  if (type) link.type = type;
  link.href = href;
};

/**
 * Drives the browser tab's title, icon and PWA manifest per route, so the public site and the
 * admin panel read — and install — as separate products even when both are open side by side.
 */
export const useDocumentMeta = ({ title, favicon, manifest }: DocumentMeta): void => {
  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    setLink(FAVICON_ELEMENT_ID, 'icon', favicon, 'image/svg+xml');
  }, [favicon]);

  useEffect(() => {
    if (!manifest) return;
    setLink(MANIFEST_ELEMENT_ID, 'manifest', manifest);
  }, [manifest]);
};
