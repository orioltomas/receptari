// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-04-01',
  ssr: false,

  devtools: { enabled: true },

  devServer: {
    port: Number(process.env.PORT) || 3001,
    host: '0.0.0.0',
  },

  app: {
    head: {
      title: 'Receptari Digital',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'El meu receptari digital' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Work+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
        },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:3000',
    },
  },

  // Order matters: tokens first, then the shared base, then one stylesheet per
  // area of the app.
  css: [
    '~/assets/css/tokens.css',
    '~/assets/css/base.css',
    '~/assets/css/shell.css',
    '~/assets/css/catalogue.css',
    '~/assets/css/detail.css',
    '~/assets/css/form.css',
  ],

  typescript: {
    strict: true,
  },
});
