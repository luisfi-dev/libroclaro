// Babel solo para Jest (Vite usa esbuild en dev/build, no este archivo).
//
// Vite expone variables vía `import.meta.env`, que no existe bajo Jest/CommonJS.
// Este plugin inline reemplaza cualquier `import.meta` por el global
// `globalThis.__IMPORT_META__`, que definimos en test/setupTests.ts con un
// `env` simulado. Así módulos como src/api/client.ts se cargan sin romperse.
function replaceImportMeta() {
  return {
    visitor: {
      MetaProperty(path) {
        if (path.node.meta?.name === 'import' && path.node.property?.name === 'meta') {
          path.replaceWithSourceString('globalThis.__IMPORT_META__');
        }
      },
    },
  };
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [replaceImportMeta],
};
