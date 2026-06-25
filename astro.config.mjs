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
      ],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/avetavos/postgresql-from-zero-to-hero' }],
      sidebar: [
        { label: 'Intro & Setup', items: [{ autogenerate: { directory: 'intro-and-setup' } }] },
        { label: 'Tables & Types', items: [{ autogenerate: { directory: 'tables-and-types' } }] },
        { label: 'CRUD & SQL', items: [{ autogenerate: { directory: 'crud-and-sql' } }] },
        { label: 'Joins & Relationships', items: [{ autogenerate: { directory: 'joins-and-relationships' } }] },
        { label: 'Indexes & Performance', items: [{ autogenerate: { directory: 'indexes-and-performance' } }] },
        { label: 'Transactions & Concurrency', items: [{ autogenerate: { directory: 'transactions-and-concurrency' } }] },
        { label: 'Advanced PostgreSQL', items: [{ autogenerate: { directory: 'advanced-postgres' } }] },
        { label: 'Operations & Scaling', items: [{ autogenerate: { directory: 'operations-and-scaling' } }] },
      ],
      }), preact()],
});