'use client'

import { useState, useEffect } from 'react'
import QRCode from 'react-qr-code'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Copy, Check, Smartphone, QrCode as QrIcon, ExternalLink } from 'lucide-react'
import { toast } from './ui/use-toast'
import { isMobile } from '../lib/wagmi-config'

interface WalletDeepLinkProps {
  uri?: string
  isOpen: boolean
  onClose: () => void
}

const WALLET_APPS = [
  {
    name: 'MetaMask',
    icon: '🦊',
    deepLink: (uri: string) => `metamask://wc?uri=${encodeURIComponent(uri)}`,
    downloadUrl: 'https://metamask.io/download/',
    color: 'bg-orange-500',
  },
  {
    name: 'Rainbow',
    icon: '🌈',
    deepLink: (uri: string) => `rainbow://wc?uri=${encodeURIComponent(uri)}`,
    downloadUrl: 'https://rainbow.me/',
    color: 'bg-gradient-to-r from-purple-500 to-pink-500',
  },
  {
    name: 'Trust Wallet',
    icon: '🛡️',
    deepLink: (uri: string) => `trust://wc?uri=${encodeURIComponent(uri)}`,
    downloadUrl: 'https://trustwallet.com/',
    color: 'bg-blue-500',
  },
  {
    name: 'Coinbase Wallet',
    icon: '💰',
    deepLink: (uri: string) => `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`,
    downloadUrl: 'https://www.coinbase.com/wallet',
    color: 'bg-blue-600',
  },
]

export function WalletDeepLink({ uri, isOpen, onClose }: WalletDeepLinkProps) {
  const [copied, setCopied] = useState(false)
  const [selectedWallet, setSelectedWallet] = useState<typeof WALLET_APPS[0] | null>(null)
  const [isMobileDevice, setIsMobileDevice] = useState(false)

  useEffect(() => {
    setIsMobileDevice(isMobile())
  }, [])

  const copyToClipboard = async () => {
    if (uri) {
      await navigator.clipboard.writeText(uri)
      setCopied(true)
      toast({
        title: "コピーしました",
        description: "WalletConnect URIをクリップボードにコピーしました",
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWalletConnect = (wallet: typeof WALLET_APPS[0]) => {
    if (!uri) return

    setSelectedWallet(wallet)
    
    if (isMobileDevice) {
      // モバイルの場合、ディープリンクで直接開く
      const deepLink = wallet.deepLink(uri)
      window.location.href = deepLink

      // フォールバック: 3秒後にダウンロードページへ
      setTimeout(() => {
        toast({
          title: "ウォレットアプリを開けませんでした",
          description: "アプリストアからインストールしてください",
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(wallet.downloadUrl, '_blank')}
            >
              ダウンロード
            </Button>
          ),
        })
      }, 3000)
    } else {
      // デスクトップの場合、QRコードを表示
      toast({
        title: "QRコードをスキャン",
        description: `${wallet.name}アプリでQRコードをスキャンしてください`,
      })
    }
  }

  if (!uri) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ウォレット接続</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={isMobileDevice ? "wallets" : "qr"} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="wallets">
              <Smartphone className="w-4 h-4 mr-2" />
              ウォレット選択
            </TabsTrigger>
            <TabsTrigger value="qr">
              <QrIcon className="w-4 h-4 mr-2" />
              QRコード
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="space-y-2 mt-4">
            <div className="text-sm text-muted-foreground mb-3">
              {isMobileDevice 
                ? "ウォレットアプリを選択して接続"
                : "モバイルデバイスでQRコードをスキャン"}
            </div>
            
            {WALLET_APPS.map((wallet) => (
              <Button
                key={wallet.name}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleWalletConnect(wallet)}
              >
                <span className="text-2xl mr-3">{wallet.icon}</span>
                <span className="flex-1 text-left">{wallet.name}</span>
                <ExternalLink className="w-4 h-4 opacity-50" />
              </Button>
            ))}

            {isMobileDevice && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 ウォレットアプリがインストールされていることを確認してください
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCode
                value={uri}
                size={240}
                className="w-full h-auto max-w-[240px] mx-auto"
                level="M"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1 truncate text-xs font-mono">
                {uri.slice(0, 30)}...
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                className="ml-2"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              モバイルウォレットアプリでこのQRコードをスキャンしてください
            </div>
          </TabsContent>
        </Tabs>

        {selectedWallet && !isMobileDevice && (
          <div className="mt-4 p-3 bg-muted rounded-lg flex items-center">
            <span className="text-2xl mr-3">{selectedWallet.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{selectedWallet.name}を使用中</p>
              <p className="text-xs text-muted-foreground">
                QRコードをスキャンして接続
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}