export default defineConfig({
  base: '/adminpage/',

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