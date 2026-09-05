import type { RouterConfig } from '@nuxt/schema';

/**
 * The catalogue used to live at /cerca and now serves the front page. The old
 * path is kept as a redirect so existing links and bookmarks still work.
 */
export default {
  routes: (routes) => [...routes, { name: 'cerca-redirect', path: '/cerca', redirect: '/' }],
} satisfies RouterConfig;
