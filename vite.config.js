import fs from 'fs';
import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  css: {
    postcss: './postcss.config.js',
  },
  // server: {
  //   host: '0.0.0.0',
  //   https: {
  //     key: fs.readFileSync('./192.168.1.5-key.pem'),
  //     cert: fs.readFileSync('./192.168.1.5.pem'),
  //   },
  // },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.trycloudflare.com'
    ],
  },
})

