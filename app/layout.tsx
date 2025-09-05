import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'xCockpit - Web3 IoT Control Dashboard',
  description: 'Control IoT devices with USDC payments on Base Network. Experience the future of Web3 + IoT integration.',
  metadataBase: new URL(process.env.NODE_ENV === 'production' 
    ? 'https://xcockpit.replit.app' 
    : 'http://localhost:3000'
  ),
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'xCockpit',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'xCockpit - Web3 IoT Control Dashboard',
    description: 'Control IoT devices with USDC payments on Base Network. Experience the future of Web3 + IoT integration.',
    type: 'website',
    images: ['/og-image.png'],
  },
  other: {
    // PWA Meta Tags
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'xCockpit',
    'application-name': 'xCockpit',
    'msapplication-TileColor': '#7c3aed',
    'msapplication-tap-highlight': 'no',
    'theme-color': '#7c3aed',
    
    // Farcaster Frame Meta Tags for Mini App
    'fc:frame': 'vNext',
    'fc:frame:image': '/frame-image.png',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': '🚀 Launch xCockpit',
    'fc:frame:button:1:action': 'link',
    'fc:frame:post_url': '/api/frame',
    
    // Mini App Metadata
    'miniapp:name': 'xCockpit',
    'miniapp:description': 'Web3 IoT Control Dashboard',
    'miniapp:icon': '🚀',
    'miniapp:version': '1.0.0',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}