import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Server-rendered on purpose: vote counts and the MRR ticker are live data
// baked into the HTML of every page (SEO requirement: no client-only content).
// SQLite reads are microseconds; rendering stays comfortably under a millisecond budget.
export default defineConfig({
  site: 'https://canivibecodeit.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { host: '127.0.0.1', port: 8095 },
});
