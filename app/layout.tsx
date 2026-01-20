// app/layout.tsx

export const metadata = {
  title: 'Ecominas | Central de Demandas',
  description: 'Gestão técnica operacional de demandas.',
  icons: {
    icon: '/favicon.png', // O logo da árvore que você enviou
    apple: '/apple-touch-icon.png', // Versão para dispositivos Apple (180x180)
  },
  openGraph: {
    title: 'Ecominas - Central de Demandas',
    description: 'Portal de gestão técnica e monitoramento operacional.',
    url: 'https://gestao-demandas26.vercel.app',
    siteName: 'Ecominas Mineração',
    images: [
      {
        url: '/og-image.png', // Imagem de 1200x630 pixels na pasta public
        width: 1200,
        height: 630,
        alt: 'Ecominas Dashboard Preview',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
}