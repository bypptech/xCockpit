'use client'

import { useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { toast } from '../components/ui/use-toast'

export function useWalletReturnDetection() {
  const { isConnected, isConnecting } = useAccount()

  // アプリに戻ったときの処理
  const handleAppReturn = useCallback(() => {
    if (document.visibilityState === 'visible' && !document.hidden) {
      console.log('User returned to app')
      
      // 接続プロセス中の場合は接続完了を待つ
      if (isConnecting) {
        toast({
          title: "接続処理中...",
          description: "ウォレット接続を完了しています",
        })
        return
      }

      // 接続完了の場合
      if (isConnected) {
        toast({
          title: "ウォレット接続完了！",
          description: "正常に接続されました",
        })
        return
      }

      // 接続されていない場合は再試行を提案
      setTimeout(() => {
        if (!isConnected && !isConnecting) {
          toast({
            title: "接続が完了していません",
            description: "再度接続ボタンを押してください",
            variant: "destructive",
          })
        }
      }, 2000)
    }
  }, [isConnected, isConnecting])

  // アプリフォーカス検出
  const handleWindowFocus = useCallback(() => {
    console.log('Window focused')
    handleAppReturn()
  }, [handleAppReturn])

  // ページ可視性変更の検出
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      handleAppReturn()
    }
  }, [handleAppReturn])

  useEffect(() => {
    // イベントリスナーを設定
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // iOS Safariでの特別な処理
    if (/iPhone|iPad/.test(navigator.userAgent)) {
      // iOS では pageshow イベントも監視
      window.addEventListener('pageshow', handleAppReturn)
    }

    // Android Chrome での特別な処理
    if (/Android/.test(navigator.userAgent)) {
      // Android では resume イベントも監視（可能な場合）
      document.addEventListener('resume', handleAppReturn)
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pageshow', handleAppReturn)
      document.removeEventListener('resume', handleAppReturn)
    }
  }, [handleWindowFocus, handleVisibilityChange, handleAppReturn])

  // 手動で接続状態をチェックする関数
  const checkConnectionStatus = useCallback(() => {
    if (isConnected) {
      toast({
        title: "接続確認完了",
        description: "ウォレットは正常に接続されています",
      })
    } else {
      toast({
        title: "接続されていません",
        description: "ウォレット接続を行ってください",
        variant: "destructive",
      })
    }
  }, [isConnected])

  return {
    checkConnectionStatus,
    isConnected,
    isConnecting,
  }
}

// Coinbase Wallet 専用のリダイレクト処理
export function useCoinbaseWalletRedirect() {
  useEffect(() => {
    const handleCoinbaseReturn = () => {
      const urlParams = new URLSearchParams(window.location.search)
      const isFromCoinbase = urlParams.get('cb_wallet') === 'true'
      
      if (isFromCoinbase) {
        console.log('Returned from Coinbase Wallet')
        toast({
          title: "Coinbase Walletから戻りました",
          description: "接続状態を確認中...",
        })

        // URLパラメータをクリア
        const url = new URL(window.location.href)
        url.searchParams.delete('cb_wallet')
        window.history.replaceState({}, '', url.toString())
      }
    }

    handleCoinbaseReturn()
  }, [])
}