'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAccount } from 'wagmi'

export function useWalletAutoReturn() {
  const { isConnected, isConnecting } = useAccount()
  const [isWalletOpened, setIsWalletOpened] = useState(false)
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  // ウォレットアプリが開いた時の処理
  const handleWalletOpened = useCallback(() => {
    console.log('Wallet app opened')
    setIsWalletOpened(true)
  }, [])

  // 成功時の復帰処理
  const handleSuccessfulReturn = useCallback(() => {
    console.log('Successfully returned from wallet')
    setIsWalletOpened(false)
    setConnectionAttempts(0)
    
    // 接続成功のフィードバック
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('walletConnected', {
        detail: { success: true }
      })
      window.dispatchEvent(event)
    }
  }, [])

  // アプリに戻ってきた時の検出
  const handleAppReturn = useCallback(() => {
    if (!isWalletOpened) return

    console.log('User returned to app')

    // 少し待ってから接続状態をチェック
    setTimeout(() => {
      if (isConnected) {
        handleSuccessfulReturn()
      } else if (!isConnecting) {
        // 接続されていない場合は試行回数を増やす
        setConnectionAttempts(prev => prev + 1)
        
        // 3回以上失敗した場合
        if (connectionAttempts >= 2) {
          const event = new CustomEvent('walletConnectionFailed', {
            detail: { attempts: connectionAttempts + 1 }
          })
          window.dispatchEvent(event)
        }
      }
    }, 2000) // 2秒待ってからチェック
  }, [isWalletOpened, isConnected, isConnecting, connectionAttempts, handleSuccessfulReturn])

  // イベントリスナーの設定
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleAppReturn()
      } else if (document.visibilityState === 'hidden' && !isWalletOpened) {
        handleWalletOpened()
      }
    }

    const handleFocus = () => {
      handleAppReturn()
    }

    const handleBlur = () => {
      if (!isWalletOpened) {
        handleWalletOpened()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // クリーンアップ
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [handleAppReturn, handleWalletOpened, isWalletOpened])

  // 接続完了時の自動クリーンアップ
  useEffect(() => {
    if (isConnected && isWalletOpened) {
      handleSuccessfulReturn()
    }
  }, [isConnected, isWalletOpened, handleSuccessfulReturn])

  // 強制復帰関数
  const forceReturn = useCallback(() => {
    setIsWalletOpened(false)
    setConnectionAttempts(0)
  }, [])

  return {
    isWalletOpened,
    connectionAttempts,
    handleWalletOpened,
    handleSuccessfulReturn,
    forceReturn,
  }
}