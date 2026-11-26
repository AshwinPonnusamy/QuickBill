// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  {
    ignores: ['dist/**', 'coverage/**', 'supabase/functions/**'],
  },
  expoConfig,
  {
    settings: {
      react: {
        version: '19.3',
      },
    },
  },
]);
