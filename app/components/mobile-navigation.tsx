'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Wallet, QrCode, Settings, Menu } from 'lucide-react'
import { cn } from '../lib/utils'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import { Button } from './ui/button'
import { MobileWalletConnect } from './mobile-wallet-connect'
import { usePWA } from '../hooks/usePWA'
import { toast } from './ui/use-toast'

const navItems = [
  { href: '/', label: 'ホーム', icon: Home },
  { href: '/wallet', label: 'ウォレット', icon: Wallet },
  { href: '/scan', label: 'スキャン', icon: QrCode },
  { href: '/settings', label: '設定', icon: Settings },
]

export function MobileNavigation() {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const { isInstallable, installPWA } = usePWA()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleInstallPWA = async () => {
    await installPWA()
    toast({
      title: "アプリをインストールしました",
      description: "ホーム画面から起動できます",
    })
  }

  return (
    <>
      {/* ヘッダー（モバイル） */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b transition-all duration-200 md:hidden",
          isScrolled && "shadow-md"
        )}
      >
        <div className="flex items-center justify-between p-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <nav className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                        pathname === item.href
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
                
                {isInstallable && (
                  <Button
                    onClick={handleInstallPWA}
                    className="mt-4"
                    variant="outline"
                  >
                    アプリをインストール
                  </Button>
                )}
              </nav>
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-semibold">xCockpit</h1>

          <MobileWalletConnect />
        </div>
      </header>

      {/* ボトムナビゲーション（モバイル） */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* デスクトップヘッダー */}
      <header className="hidden md:block fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-xl font-bold">
                xCockpit
              </Link>
              <nav className="flex gap-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "transition-colors",
                      pathname === item.href
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              {isInstallable && (
                <Button
                  onClick={handleInstallPWA}
                  variant="outline"
                  size="sm"
                >
                  インストール
                </Button>
              )}
              <MobileWalletConnect />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}