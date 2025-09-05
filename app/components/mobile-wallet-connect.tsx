'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useDisconnect } from 'wagmi'
import { Button } from './ui/button'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from './ui/drawer'
import { useState, useEffect } from 'react'
import { isMobile } from '../lib/wagmi-config'
import { QrCode, Wallet, LogOut, Copy, Check, ArrowLeft } from 'lucide-react'
import { toast } from './ui/use-toast'
import { useWalletAutoReturn } from '../hooks/useWalletAutoReturn'

export function MobileWalletConnect() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  
  // 自動復帰システムを使用
  const { isWalletOpened, showReturnButton, connectionAttempts } = useWalletAutoReturn({
    timeoutMs: 45000, // 45秒でタイムアウト
    checkIntervalMs: 2000, // 2秒ごとにチェック
    maxRetries: 5 // 最大5回まで再試行
  })

  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast({
        title: "アドレスをコピーしました",
        description: address.slice(0, 6) + "..." + address.slice(-4),
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted
          const connected = ready && account && chain

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <Button
                      onClick={openConnectModal}
                      className="flex items-center gap-2 relative"
                      size={isMobileDevice ? "sm" : "default"}
                    >
                      <Wallet className="w-4 h-4" />
                      <span className="hidden sm:inline">ウォレット接続</span>
                      <span className="sm:hidden">接続</span>
                      {isMobileDevice && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </Button>
                  )
                }

                if (chain.unsupported) {
                  return (
                    <Button onClick={openChainModal} variant="destructive" size="sm">
                      ネットワーク切替
                    </Button>
                  )
                }

                return (
                  <div className="flex gap-2 items-center">
                    <Button
                      onClick={openChainModal}
                      variant="outline"
                      size="sm"
                      className="hidden sm:flex items-center gap-2"
                    >
                      {chain.hasIcon && chain.iconUrl && (
                        <img
                          alt={chain.name ?? 'Chain icon'}
                          src={chain.iconUrl}
                          className="w-4 h-4"
                        />
                      )}
                      {chain.name}
                    </Button>

                    <Button
                      onClick={() => setDrawerOpen(true)}
                      variant="outline"
                      size={isMobileDevice ? "sm" : "default"}
                      className="flex items-center gap-2"
                    >
                      {account.displayBalance && (
                        <span className="hidden sm:inline text-xs">
                          {account.displayBalance}
                        </span>
                      )}
                      <span className="font-mono text-xs">
                        {formatAddress(account.address)}
                      </span>
                    </Button>
                  </div>
                )
              })()}
            </div>
          )
        }}
      </ConnectButton.Custom>
    )
  }

  return (
    <>
      <Button
        onClick={() => setDrawerOpen(true)}
        variant="outline"
        size={isMobileDevice ? "sm" : "default"}
        className="flex items-center gap-2"
      >
        <Wallet className="w-4 h-4" />
        <span className="font-mono text-xs">
          {address && formatAddress(address)}
        </span>
      </Button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="h-[50vh]">
          <DrawerHeader>
            <DrawerTitle>ウォレット管理</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">接続中のアドレス</p>
                  <p className="font-mono text-sm mt-1">{address}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyAddress}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  // QRコード表示機能
                  toast({
                    title: "QRコード表示",
                    description: "この機能は近日公開予定です",
                  })
                }}
                className="flex items-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                QRコード
              </Button>
              
              <Button
                variant="destructive"
                onClick={() => {
                  disconnect()
                  setDrawerOpen(false)
                }}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                切断
              </Button>
            </div>

            {isMobileDevice && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 ヒント: ホーム画面に追加すると、アプリのように使えます
                </p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}