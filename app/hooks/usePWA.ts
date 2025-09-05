'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [isPWAInstalled, setIsPWAInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Service Workerの登録
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration)
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }

    // PWAインストール状態のチェック
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsPWAInstalled(true)
    }

    // インストールプロンプトのイベントリスナー
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // アプリインストール成功時のイベント
    window.addEventListener('appinstalled', () => {
      setIsPWAInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const installPWA = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      if (outcome === 'accepted') {
        console.log('PWA installed')
        setIsInstallable(false)
        setIsPWAInstalled(true)
      } else {
        console.log('PWA installation dismissed')
      }
    } catch (error) {
      console.error('Error installing PWA:', error)
    } finally {
      setDeferredPrompt(null)
    }
  }

  return {
    isInstallable,
    isPWAInstalled,
    installPWA,
  }
}