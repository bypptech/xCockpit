'use client'

import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { ArrowLeft, RefreshCw, Wallet, AlertTriangle } from 'lucide-react'
import { useWalletAutoReturn } from '../hooks/useWalletAutoReturn'

export function WalletReturnHelper() {
  const { isWalletOpened, connectionAttempts, forceReturn } = useWalletAutoReturn()
  const [timeElapsed, setTimeElapsed] = useState(0)

  // タイマー
  useEffect(() => {
    if (!isWalletOpened) {
      setTimeElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1)
    }, 1000)

    return () => clearInterval(interval)
  }, [isWalletOpened])

  // ウォレットが開かれていない場合は何も表示しない
  if (!isWalletOpened) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 20秒以上経過した場合に戻るボタンを表示
  if (timeElapsed >= 20) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                  ウォレットから戻ってきましたか？
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  経過時間: {formatTime(timeElapsed)} | 試行: {connectionAttempts}/3
                </p>
              </div>
              <Button
                size="sm"
                onClick={forceReturn}
                className="flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 通常の待機状態表示
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="relative">
                <Wallet className="h-5 w-5 text-blue-600" />
                <RefreshCw className="absolute -top-1 -right-1 h-3 w-3 text-blue-600 animate-spin" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                ウォレットで接続を承認してください
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                経過時間: {formatTime(timeElapsed)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // ウォレットアプリを再度開く
                const coinbaseDeepLink = 'https://go.cb-w.com/dapp'
                window.open(coinbaseDeepLink, '_self')
              }}
              className="flex-shrink-0"
            >
              <Wallet className="h-4 w-4 mr-1" />
              開く
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}