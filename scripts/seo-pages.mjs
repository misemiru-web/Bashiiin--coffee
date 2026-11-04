// The single route definition for future production SEO. Preview builds stay independent.
export const SEO_PAGES = Object.freeze([
  { path: '/', file: 'index.html' },
  { path: '/about/', file: 'about/index.html' },
  { path: '/coffee/', file: 'coffee/index.html' },
  { path: '/contact/', file: 'contact/index.html' },
  { path: '/access/', file: 'access/index.html' },
].map(Object.freeze));
