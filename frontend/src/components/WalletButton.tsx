'use client';
import { ethers } from 'ethers';

const BASE_SEPOLIA_CHAIN_ID = '0x14A34'; // 84532
const BASE_SEPOLIA = {
  chainId: BASE_SEPOLIA_CHAIN_ID,
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org'],
};

export const WRONG_NETWORK = 'Please switch to Base Sepolia';

interface Props {
  account: string;
  chainId: string | null;
  provider: ethers.BrowserProvider | null;
  onConnect: (account: string, chainId: string, provider: ethers.BrowserProvider) => void;
  onError: (msg: string) => void;
}

export default function WalletButton({ account, chainId, provider, onConnect, onError }: Props) {
  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID;

  const connect = async () => {
    const w = (window as any).ethereum;
    if (typeof window === 'undefined' || !w) {
      onError('Install MetaMask or Rabby');
      return;
    }
    try {
      const prov = new ethers.BrowserProvider(w);
      const accounts = await prov.send('eth_requestAccounts', []);
      const net = await prov.getNetwork();
      const currentChainId = '0x' + net.chainId.toString(16);

      // Switch to Base Sepolia if not already there
      if (Number(net.chainId) !== 84532) {
        try {
          await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_SEPOLIA_CHAIN_ID }] });
        } catch (switchErr: any) {
          // If chain not in wallet, add it
          if (switchErr.code === 4902) {
            await w.request({ method: 'wallet_addEthereumChain', params: [BASE_SEPOLIA] });
          } else {
            throw switchErr;
          }
        }
        // Re-fetch network after switch
        const newNet = await prov.getNetwork();
        const newChainId = '0x' + newNet.chainId.toString(16);
        onConnect(accounts[0], newChainId, new ethers.BrowserProvider(w));
      } else {
        onConnect(accounts[0], currentChainId, prov);
      }

      // Listen for network/account changes
      w.on('chainChanged', () => window.location.reload());
      w.on('accountsChanged', () => window.location.reload());
    } catch (e: any) {
      onError(e.message || 'Wallet connection failed');
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={connect}
        className={`px-4 py-2 rounded font-mono text-sm tracking-wider transition-all ${
          account && isCorrectChain
            ? 'border border-[#00FF41] text-[#00FF41] bg-[#0A1A0A]'
            : account && !isCorrectChain
            ? 'border border-[#FF1A40] text-[#FF1A40] bg-[#1A0A0A]'
            : 'btn-neon px-6'
        }`}
      >
        {account
          ? `${account.slice(0, 6)}...${account.slice(-4)}`
          : '[ CONNECT ]'}
      </button>
      {account && !isCorrectChain && (
        <span className="text-[10px] text-[#FF1A40] font-mono tracking-wider animate-pulse">
          ⚠ WRONG NETWORK — SWITCH TO BASE SEPOLIA
        </span>
      )}
      {account && isCorrectChain && (
        <span className="text-[10px] text-[#00FF41] font-mono tracking-wider">
          ◈ BASE SEPOLIA
        </span>
      )}
    </div>
  );
}
