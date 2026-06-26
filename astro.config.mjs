// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import preact from '@astrojs/preact';

// https://astro.build/config
export default defineConfig({
  // GitHub Pages project site. Update `site` to your GitHub username and `base`
  // to your repo name if they differ.
  site: 'https://avetavos.github.io',
  base: '/postgresql-from-zero-to-hero',
  output: 'static',
  integrations: [starlight({
      title: 'PostgreSQL — From Zero to Hero',
      defaultLocale: 'en',
      locales: {
        en: { label: 'English', lang: 'en' },
        th: { label: 'ไทย', lang: 'th' },
      },
      customCss: ['./src/styles/custom.css'],
      head: [
        { tag: 'script', attrs: { type: 'module', src: '/postgresql-from-zero-to-hero/enhance.js' } },
        { tag: 'link', attrs: { rel: 'manifest', href: '/postgresql-from-zero-to-hero/manifest.webmanifest' } },
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/postgresql-from-zero-to-hero/apple-touch-icon.png' } },
        { tag: 'link', attrs: { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/postgresql-from-zero-to-hero/icon-192.png' } },
        { tag: 'meta', attrs: { name: 'theme-color', content: '#336791' } },
        { tag: 'meta', attrs: { name: 'mobile-web-app-capable', content: 'yes' } },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' } },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' } },
        { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: "PostgreSQL" } },
        { tag: 'script', content: "if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/postgresql-from-zero-to-hero/sw.js',{scope:'/postgresql-from-zero-to-hero/'}).catch(function(){})})}" },
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/avetavos/postgresql-from-zero-to-hero' }],
      sidebar: [
        { label: 'Intro & Setup', collapsed: true, items: [{ autogenerate: { directory: 'intro-and-setup' } }] },
        { label: 'Tables & Types', collapsed: true, items: [{ autogenerate: { directory: 'tables-and-types' } }] },
        { label: 'CRUD & SQL', collapsed: true, items: [{ autogenerate: { directory: 'crud-and-sql' } }] },
        { label: 'Joins & Relationships', collapsed: true, items: [{ autogenerate: { directory: 'joins-and-relationships' } }] },
        { label: 'Indexes & Performance', collapsed: true, items: [{ autogenerate: { directory: 'indexes-and-performance' } }] },
        { label: 'Transactions & Concurrency', collapsed: true, items: [{ autogenerate: { directory: 'transactions-and-concurrency' } }] },
        { label: 'Advanced PostgreSQL', collapsed: true, items: [{ autogenerate: { directory: 'advanced-postgres' } }] },
        { label: 'Operations & Scaling', collapsed: true, items: [{ autogenerate: { directory: 'operations-and-scaling' } }] },
      ],
      }), preact()],
});