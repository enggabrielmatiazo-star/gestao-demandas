import './globals.css'

export const metadata = {
  title: 'Ecominas | Central de Demandas',
  description: 'Gestão técnica operacional de demandas e monitoramento de jazidas minerárias.',
  icons: {
    icon: '/favicon.png', // Logo da árvore
    apple: '/apple-touch-icon.png', 
  },
  openGraph: {
    title: 'Ecominas - Central de Demandas',
    description: 'Portal de gestão técnica e monitoramento operacional.',
    url: 'https://gestao-demandas26.vercel.app',
    siteName: 'Ecominas Mineração',
    images: [
      {
        url: '/og-image.png', // Renomeie seu arquivo de og-image.png.png para og-image.png
        width: 1200,
        height: 630,
        alt: 'Ecominas Dashboard Preview',
      },
    ],
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}