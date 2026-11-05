import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // Relative asset paths, so the build works at https://<user>.github.io/<repo>/
  base: './',
})
