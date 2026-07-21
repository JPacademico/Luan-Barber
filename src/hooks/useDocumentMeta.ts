import { useEffect } from 'react';

const FAVICON_ELEMENT_ID = 'app-favicon';
const MANIFEST_ELEMENT_ID = 'app-manifest';
const APPLE_ICON_ELEMENT_ID = 'app-apple-icon';

interface DocumentMeta {
  title: string;
  favicon: string;
  /** Per-route PWA manifest, so the public site and the admin panel install as separate apps. */
  manifest?: string;
  /** iOS home-screen icon. Must be a PNG — Safari ignores an SVG apple-touch-icon. */
  appleTouchIcon?: string;
  /** Name iOS puts under the home-screen icon. */
  appleTitle?: string;
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
export const useDocumentMeta = ({
  title,
  favicon,
  manifest,
  appleTouchIcon,
  appleTitle,
}: DocumentMeta): void => {
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

  /*
   * iOS reads these from the document it loaded and ignores later changes, which is why /admin is
   * served as its own document (admin.html) with them already correct. Keeping them in sync here
   * anyway covers client-side navigation between the two faces in an already-open tab.
   */
  useEffect(() => {
    if (!appleTouchIcon) return;
    setLink(APPLE_ICON_ELEMENT_ID, 'apple-touch-icon', appleTouchIcon);
  }, [appleTouchIcon]);

  useEffect(() => {
    if (!appleTitle) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'apple-mobile-web-app-title';
      document.head.appendChild(meta);
    }
    meta.content = appleTitle;
  }, [appleTitle]);
};
