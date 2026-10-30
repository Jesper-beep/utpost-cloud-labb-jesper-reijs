import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // globals: true krävs för att Testing Library ska städa DOM:en mellan testerna.
      // Importera ändå it/expect/vi från 'vitest' i testfilerna – det är tydligare, och ESLint kräver det.
      globals: true,
      setupFiles: ['./src/test-setup.ts'],
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
    },
  }),
)
