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
    'fc:frame:image': '/api/frame/image',
    'fc:frame:image:aspect_ratio': '1.91:1',
    'fc:frame:button:1': '🚀 Launch xCockpit',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:2': '💰 Make Payment',
    'fc:frame:button:2:action': 'post',
    'fc:frame:post_url': '/api/frame',
    
    // Mini App Metadata for Farcaster
    'fc:miniapp': 'true',
    'fc:miniapp:name': 'xCockpit',
    'fc:miniapp:description': 'Web3 IoT Control Dashboard - Control ESP32 devices with USDC payments',
    'fc:miniapp:icon': '/icon.png',
    'fc:miniapp:version': '1.0.0',
    'fc:miniapp:manifest': '/.well-known/farcaster.json',
    
    // Additional Mini App Metadata
    'miniapp:name': 'xCockpit',
    'miniapp:description': 'Web3 IoT Control Dashboard',
    'miniapp:icon': '🚀',
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