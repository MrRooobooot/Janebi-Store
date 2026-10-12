import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { applyPageSeo, resetHeadSeo } from '../lib/headSeo';
import { matchRoute, NOT_FOUND_SEO } from '../lib/routeSeo';

/**
 * Head metadata for the route the user is on. Renders nothing.
 *
 * Static, admin and unknown URLs are written here from the route registry
 * (src/lib/routeSeo.ts). Catalogue, product and blog pages are owners: they write
 * their own head after their data has loaded, so this component leaves those
 * URLs alone. Whenever the route changes, the previous head is reset first.
 */
export default function RouteHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    const match = matchRoute(pathname);
    if (match.kind === 'static' || match.kind === 'admin') applyPageSeo(match.seo);
    else if (match.kind === 'notFound') applyPageSeo(NOT_FOUND_SEO);
    return () => resetHeadSeo();
  }, [pathname]);

  return null;
}
