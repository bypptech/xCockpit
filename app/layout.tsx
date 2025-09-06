import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'xCockpit - Web3 IoT Control Dashboard',
  description: 'Control IoT devices with USDC payments on Base Network. Experience the future of Web3 + IoT integration.',
  metadataBase: new URL(process.env.NODE_ENV === 'production' 
    ? 'https://202509vibecodingminihackerson.bypp.tech' 
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
    'fc:frame:image': '/api/frame/image',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': '🚀 Launch xCockpit',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:2': '💰 Make Payment',
    'fc:frame:button:2:action': 'post',
    'fc:frame:post_url': '/api/frame',
    
    // Mini App Metadata for Farcaster (following official spec)
    'fc:miniapp': JSON.stringify({
      "name": "Nagesen Gacha Live",
      "description": "Live-streamed Gacha machine controllable via USDC tipping",
      "icon": "https://202509vibecodingminihackerson.bypp.tech/icon.png",
      "homeUrl": "https://202509vibecodingminihackerson.bypp.tech",
      "manifestVersion": "1.0.0"
    }),
    
    // Additional Mini App Metadata
    'miniapp:name': 'Nagesen Gacha Live',
    'miniapp:description': 'Live-streamed Gacha machine controllable via USDC tipping',
    'miniapp:icon': '🎰',
    'miniapp:version': '1.0.0',
    'miniapp:dimensions': '424x695',
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

import React from 'react';

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