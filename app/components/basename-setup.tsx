'use client';

import { useState } from 'react';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

interface BasenameSetupProps {
  address: string;
  ownedBasename: string | null;
  hasReverseRecord: boolean;
  onBasenameSet?: (basename: string) => void;
  className?: string;
}

// Simple toast function for Node.js version (instead of useToast hook)
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`${type === 'success' ? '✅' : '❌'} ${message}`);
  // In a real app, you might want to implement proper toast notifications
  alert(message);
};

export function BasenameSetup({ 
  address, 
  ownedBasename,
  hasReverseRecord,
  onBasenameSet,
  className = '' 
}: BasenameSetupProps) {
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  // プライマリ名設定のトランザクション実行
  const handleSetPrimaryName = async () => {
    if (!ownedBasename) {
      showToast('No Basename found', 'error');
      return;
    }

    setIsSettingPrimary(true);

    try {
      // MetaMask/Coinbase Walletのプロバイダーを取得
      if (!window.ethereum) {
        throw new Error('Wallet not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Base Mainnetに接続していることを確認
      const network = await provider.getNetwork();
      console.log('Current network:', network);
      
      if (network.chainId !== 8453n) {
        console.log('Switching to Base Mainnet...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }], // Base Mainnet
          });
          
          showToast('Switching to Base Mainnet...');
          
          // Wait for network switch
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Network not added, add it
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2105',
                chainName: 'Base Mainnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }

      const signer = await provider.getSigner();

      // Base MainnetのReverseRegistrar（正確なアドレス）
      const REVERSE_REGISTRAR = '0x79ea96012eea67a83431f1701b3dff7e37f9e282';

      // ReverseRegistrar ABI
      const reverseRegistrarABI = [
        'function setName(string calldata name) returns (bytes32)'
      ];

      console.log('🚀 Setting primary name:', ownedBasename);
      console.log('Address:', address);
      console.log('ReverseRegistrar:', REVERSE_REGISTRAR);

      // コントラクト呼び出し
      const reverseRegistrar = new ethers.Contract(REVERSE_REGISTRAR, reverseRegistrarABI, signer);
      
      // ガス見積もり
      let gasEstimate;
      try {
        gasEstimate = await reverseRegistrar.setName.estimateGas(ownedBasename);
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (gasError) {
        console.warn('Gas estimation failed:', gasError);
        gasEstimate = 150000n; // フォールバック
      }

      // トランザクション実行
      const tx = await reverseRegistrar.setName(ownedBasename, {
        gasLimit: gasEstimate + 50000n // バッファを追加
      });

      console.log('Transaction sent:', tx.hash);

      showToast(`Transaction Sent: ${tx.hash.substring(0, 10)}...`);

      // トランザクション完了を待機
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      showToast(`✅ Primary Name Set! ${ownedBasename} is now your primary name`);

      // 親コンポーネントに通知
      onBasenameSet?.(ownedBasename);

    } catch (error: any) {
      console.error('❌ SetName transaction failed:', error);
      
      let errorMessage = 'Failed to set primary name';
      if (error.message?.includes('user rejected')) {
        errorMessage = 'Transaction cancelled by user';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds for gas';
      } else if (error.code === 4001) {
        errorMessage = 'Transaction cancelled by user';
      }

      showToast(errorMessage, 'error');
    } finally {
      setIsSettingPrimary(false);
    }
  };

  // プライマリ名が既に設定されている場合
  if (hasReverseRecord && ownedBasename) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className}`}>
        <CardHeader>
          <CardTitle className="text-green-800 text-lg">
            <CheckCircle className="inline-block w-5 h-5 mr-2" />
            Basename Active!
          </CardTitle>
          <CardDescription className="text-green-700">
            Your primary name is set and working
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div>
              <p className="font-medium text-gray-900">{ownedBasename}</p>
              <p className="text-sm text-gray-500">Your primary Basename</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={() => window.open('https://www.base.org/names', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage on Base Names
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Basenameが見つからない場合
  if (!ownedBasename) {
    return (
      <Card className={`border-amber-200 bg-amber-50 ${className}`}>
        <CardHeader>
          <CardTitle className="text-amber-800 text-lg">
            <AlertCircle className="inline-block w-5 h-5 mr-2" />
            Get Your Basename
          </CardTitle>
          <CardDescription className="text-amber-700">
            No Basename found for your address
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700 mb-4">
            Register a Base Name (.base.eth) to display a memorable name instead of your wallet address.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            variant="outline" 
            className="border-amber-400 text-amber-800 hover:bg-amber-100"
            onClick={() => window.open('https://www.base.org/names', '_blank')}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Register Basename
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Basename所有しているが、プライマリ名未設定
  return (
    <Card className={`border-blue-200 bg-blue-50 ${className}`}>
      <CardHeader>
        <CardTitle className="text-blue-800 text-lg">
          <CheckCircle className="inline-block w-5 h-5 mr-2" />
          Basename Found!
        </CardTitle>
        <CardDescription className="text-blue-700">
          Set your Basename as primary to enable display
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div>
            <p className="font-medium text-gray-900">{ownedBasename}</p>
            <p className="text-sm text-gray-500">Your owned Basename</p>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Verified Owner
          </Badge>
        </div>
        
        <div className="text-sm text-blue-700">
          <p className="mb-2">Setting as primary name will:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Display your Basename instead of wallet address</li>
            <li>Automatically show in other dApps</li>
            <li>Enable reverse lookup (address → name)</li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter className="flex gap-2">
        <Button 
          onClick={handleSetPrimaryName}
          disabled={isSettingPrimary}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSettingPrimary ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Setting...
            </>
          ) : (
            <>
              Set as Primary Name
            </>
          )}
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => window.open('https://www.base.org/names', '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Manage on Base Names
        </Button>
      </CardFooter>
    </Card>
  );
}