'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'
import { Badge } from './ui/badge'
import { ArrowLeft, RefreshCw, Wallet, AlertCircle } from 'lucide-react'
import { toast } from './ui/use-toast'

interface WalletConnectionStatusProps {
  isWalletOpened: boolean
  connectionAttempts: number
  onForceReturn: () => void
}

export function WalletConnectionStatus({ 
  isWalletOpened, 
  connectionAttempts,
  onForceReturn 
}: WalletConnectionStatusProps) {
  const { isConnected, isConnecting } = useAccount()
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

  // ウォレットアプリが開かれていない場合は表示しない
  if (!isWalletOpened) {
    return null
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = () => {
    if (isConnected) return 'bg-green-500'
    if (isConnecting) return 'bg-yellow-500'
    if (connectionAttempts > 2) return 'bg-red-500'
    return 'bg-blue-500'
  }

  const getStatusText = () => {
    if (isConnected) return '接続完了'
    if (isConnecting) return '接続中...'
    if (connectionAttempts > 2) return '接続エラー'
    return 'ウォレット待機中'
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="p-6 text-center space-y-4">
          {/* ステータスアイコン */}
          <div className="relative mx-auto w-16 h-16">
            <div className={`absolute inset-0 rounded-full ${getStatusColor()} opacity-20 animate-ping`} />
            <div className={`relative w-16 h-16 rounded-full ${getStatusColor()} flex items-center justify-center`}>
              {isConnected ? (
                <Wallet className="w-8 h-8 text-white" />
              ) : connectionAttempts > 2 ? (
                <AlertCircle className="w-8 h-8 text-white" />
              ) : (
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              )}
            </div>
          </div>

          {/* ステータステキスト */}
          <div className="space-y-2">
            <Badge variant="secondary" className={`${getStatusColor()} text-white border-0`}>
              {getStatusText()}
            </Badge>
            
            <p className="text-sm text-muted-foreground">
              経過時間: {formatTime(timeElapsed)}
            </p>
            
            {connectionAttempts > 0 && (
              <p className="text-xs text-muted-foreground">
                再試行回数: {connectionAttempts}
              </p>
            )}
          </div>

          {/* メッセージ */}
          <div className="space-y-2">
            {isConnected ? (
              <p className="text-sm text-green-600">
                🎉 ウォレット接続が完了しました！
              </p>
            ) : isConnecting ? (
              <p className="text-sm">
                ウォレットアプリで接続を承認してください
              </p>
            ) : connectionAttempts > 2 ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600">
                  接続に問題があります
                </p>
                <p className="text-xs text-muted-foreground">
                  ウォレットアプリで接続を完了するか、やり直してください
                </p>
              </div>
            ) : (
              <p className="text-sm">
                ウォレットアプリで接続を承認してください
              </p>
            )}
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 pt-2">
            {isConnected ? (
              <Button
                onClick={onForceReturn}
                className="flex-1"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                アプリに戻る
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const coinbaseDeepLink = 'https://go.cb-w.com/dapp'
                    window.open(coinbaseDeepLink, '_self')
                  }}
                  className="flex-1"
                  size="sm"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  ウォレットを開く
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => {
                    toast({
                      title: "手動で戻る",
                      description: "接続完了後にこのボタンを押してください",
                      action: (
                        <Button
                          size="sm"
                          onClick={onForceReturn}
                        >
                          戻る
                        </Button>
                      )
                    })
                  }}
                  size="sm"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  戻る
                </Button>
              </>
            )}
          </div>

          {/* 緊急時のリセット */}
          {timeElapsed > 30 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => window.location.reload()}
              className="w-full mt-2"
            >
              ページを再読み込み
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}