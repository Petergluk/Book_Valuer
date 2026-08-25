import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    base: './',
    define: {
      'process.env.API_KEY': JSON.stringify(
        process.env.GEMINI_API_KEY || 
        process.env.VITE_API_KEY || 
        process.env.API_KEY || 
        ''
      )
    }
  }
})
