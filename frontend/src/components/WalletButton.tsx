'use client';
import { ethers } from 'ethers';

interface Props {
  account: string;
  provider: ethers.BrowserProvider | null;
  onConnect: (account: string, provider: ethers.BrowserProvider) => void;
  onError: (msg: string) => void;
}

export default function WalletButton({ account, provider, onConnect, onError }: Props) {
  const connect = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      onError('Install MetaMask or Rabby');
      return;
    }
    try {
      const prov = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await prov.send('eth_requestAccounts', []);
      onConnect(accounts[0], prov);

      // Listen for network changes
      (window as any).ethereum.on('chainChanged', () => window.location.reload());
      (window as any).ethereum.on('accountsChanged', () => window.location.reload());
    } catch {
      onError('Wallet connection failed');
    }
  };

  return (
    <button
      onClick={connect}
      className={`px-4 py-2 rounded font-mono text-sm tracking-wider transition-all ${
        account
          ? 'border border-[#00FF41] text-[#00FF41] bg-[#0A1A0A]'
          : 'btn-neon px-6'
      }`}
    >
      {account
        ? `${account.slice(0, 6)}...${account.slice(-4)}`
        : '[ CONNECT ]'}
    </button>
  );
}
