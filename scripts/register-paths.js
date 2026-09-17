// Registers the `@/*` path alias for the COMPILED output (dist/), used by
// the production start command. tsconfig-paths/register alone would read
// tsconfig.json's `paths` ("@/*": ["src/*"]) verbatim against `dist/`,
// which is wrong post-build — this overrides it to resolve against `dist`
// directly instead.
const path = require('node:path');
const tsConfigPaths = require('tsconfig-paths');

tsConfigPaths.register({
  baseUrl: path.join(__dirname, '..', 'dist', 'src'),
  paths: { '@/*': ['*'] },
});
