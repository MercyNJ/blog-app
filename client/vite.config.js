import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

/*
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
	  port: 5000,
  },
})
*/

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    define: {
      'process.env.REACT_APP_BASE_URL': JSON.stringify(env.REACT_APP_BASE_URL)
    },
    plugins: [react()],
  }
})
