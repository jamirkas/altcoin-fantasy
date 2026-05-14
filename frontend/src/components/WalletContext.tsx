'use client';
import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESS as DEPLOYED_ADDRESS, CONTRACT_ABI } from '@/app/contract';

const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_CHAIN_ID_HEX = '0x14a34';
const BASE_SEPOLIA = {
  chainId: BASE_SEPOLIA_CHAIN_ID_HEX,
  chainName: 'Base Sepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: ['https://sepolia.base.org'],
  blockExplorerUrls: ['https://sepolia.basescan.org'],
};

interface WalletState {
  account: string;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  isCorrectChain: boolean;
  connecting: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState>({
  account: '',
  chainId: null,
  provider: null,
  isCorrectChain: false,
  connecting: false,
  error: '',
  connect: async () => {},
  disconnect: () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState<number | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  const isCorrectChain = chainId === BASE_SEPOLIA_CHAIN_ID;

  // Try to reconnect on mount (if already authorized)
  useEffect(() => {
    const w = (window as any).ethereum;
    if (!w) return;

    const tryReconnect = async () => {
      try {
        const accounts = await w.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const prov = new ethers.BrowserProvider(w);
          const net = await prov.getNetwork();
          setAccount(accounts[0]);
          setChainId(Number(net.chainId));
          setProvider(prov);
        }
      } catch {}
    };
    tryReconnect();

    // Listen for external changes
    const handleChainChanged = () => window.location.reload();
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount('');
        setChainId(null);
        setProvider(null);
      } else {
        window.location.reload();
      }
    };
    w.on('chainChanged', handleChainChanged);
    w.on('accountsChanged', handleAccountsChanged);
    return () => {
      w.removeListener('chainChanged', handleChainChanged);
      w.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const w = (window as any).ethereum;
    if (!w) {
      setError('Install MetaMask or Rabby');
      return;
    }
    setConnecting(true);
    setError('');
    try {
      const prov = new ethers.BrowserProvider(w);
      const accounts = await prov.send('eth_requestAccounts', []);
      const net = await prov.getNetwork();
      const numericChainId = Number(net.chainId);

      if (numericChainId !== BASE_SEPOLIA_CHAIN_ID) {
        try {
          await w.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: BASE_SEPOLIA_CHAIN_ID_HEX }] });
        } catch (switchErr: any) {
          if (switchErr.code === 4902) {
            await w.request({ method: 'wallet_addEthereumChain', params: [BASE_SEPOLIA] });
          } else {
            throw switchErr;
          }
        }
        const freshProv = new ethers.BrowserProvider(w);
        const newNet = await freshProv.getNetwork();
        setAccount(accounts[0]);
        setChainId(Number(newNet.chainId));
        setProvider(freshProv);
      } else {
        setAccount(accounts[0]);
        setChainId(numericChainId);
        setProvider(prov);
      }
    } catch (e: any) {
      setError(e.message || 'Wallet connection failed');
    }
    setConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    setAccount('');
    setChainId(null);
    setProvider(null);
    setError('');
  }, []);

  return (
    <WalletContext.Provider value={{ account, chainId, provider, isCorrectChain, connecting, error, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}

// Helper: check if player has entered tournament
export async function checkPlayerEntry(prov: ethers.BrowserProvider, addr: string, tournamentId = 0): Promise<boolean> {
  try {
    const c = new ethers.Contract(DEPLOYED_ADDRESS, CONTRACT_ABI, prov);
    const filter = c.filters.Entered(tournamentId, addr);
    const events = await c.queryFilter(filter, 0, 'latest');
    return events.length > 0;
  } catch {
    return false;
  }
}
