'use client'

import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { 
  baseSepolia
} from 'wagmi/chains'
import { http } from 'wagmi'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID'

// アプリのURL（自動復帰用）
const appUrl = typeof window !== 'undefined' 
  ? window.location.origin 
  : process.env.NEXT_PUBLIC_APP_URL || 'https://202509vibecodingminihackerson.bypp.tech'

// Coinbase Wallet復帰問題を解決するための設定 - Base Sepoliaのみ
export const config = getDefaultConfig({
  appName: 'xCockpit',
  projectId: projectId,
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(),
  },
  ssr: true,
})

// モバイル検出ユーティリティ
export const isMobile = () => {
  if (typeof window === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768
}

// 拡張ディープリンク生成（リダイレクト付き）
export const generateDeepLinkWithRedirect = (walletName: string, uri: string) => {
  const encodedUri = encodeURIComponent(uri)
  const redirectUrl = encodeURIComponent(appUrl)
  
  const links: Record<string, string> = {
    metamask: `metamask://wc?uri=${encodedUri}`,
    trust: `trust://wc?uri=${encodedUri}`,
    rainbow: `rainbow://wc?uri=${encodedUri}`,
    // Coinbase Walletはリダイレクトパラメータをサポート
    coinbase: `https://go.cb-w.com/wc?uri=${encodedUri}&redirectUrl=${redirectUrl}`,
  }
  return links[walletName] || uri
}

// Universal Links設定（iOS向け）
export const setupUniversalLinks = () => {
  if (typeof window === 'undefined') return

  // アプリに戻るためのリスナー設定
  window.addEventListener('focus', () => {
    console.log('App regained focus')
    // 接続状態をチェックして必要に応じて更新
  })

  // Page Visibility API を使用
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      console.log('Page became visible - user returned')
      // 接続完了を確認
      checkWalletConnection()
    }
  })
}

// 接続状態の確認と自動リフレッシュ
const checkWalletConnection = async () => {
  // 接続状態を確認して必要に応じてUIを更新
  const connected = localStorage.getItem('walletconnect')
  if (connected) {
    console.log('Wallet connected successfully')
    // 必要に応じてページをリロード
    window.location.reload()
  }
}