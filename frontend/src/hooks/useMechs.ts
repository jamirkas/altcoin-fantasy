'use client';
import { useState, useEffect, useCallback } from 'react';

export interface SavedMech {
  id: string;
  name: string;
  parts: Record<string, string>; // slot -> tokenId
  stats: { winRate: number; sharpe: number; tier: string };
  deployedAt: number; // timestamp
  wins: number;
  losses: number;
  battles: number;
}

const STORAGE_KEY = 'altfantasy_mechs';

function loadMechs(): SavedMech[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveMechs(mechs: SavedMech[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mechs));
}

export function useMechs() {
  const [mechs, setMechs] = useState<SavedMech[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setMechs(loadMechs());
    setLoaded(true);
  }, []);

  const addMech = useCallback((name: string, parts: Record<string, string>, stats: { winRate: number; sharpe: number; tier: string }) => {
    const newMech: SavedMech = {
      id: `mech_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name, parts, stats,
      deployedAt: Date.now(),
      wins: 0, losses: 0, battles: 0,
    };
    const updated = [...mechs, newMech];
    setMechs(updated);
    saveMechs(updated);
    return newMech;
  }, [mechs]);

  const recordBattle = useCallback((mechId: string, won: boolean) => {
    const updated = mechs.map(m => {
      if (m.id !== mechId) return m;
      return { ...m, battles: m.battles + 1, wins: m.wins + (won ? 1 : 0), losses: m.losses + (won ? 0 : 1) };
    });
    setMechs(updated);
    saveMechs(updated);
  }, [mechs]);

  const getTopMechs = useCallback((limit = 5) => {
    return [...mechs].sort((a, b) => {
      const aScore = a.battles > 0 ? a.wins / a.battles : a.stats.winRate;
      const bScore = b.battles > 0 ? b.wins / b.battles : b.stats.winRate;
      return bScore - aScore;
    }).slice(0, limit);
  }, [mechs]);

  return { mechs, loaded, addMech, recordBattle, getTopMechs };
}
