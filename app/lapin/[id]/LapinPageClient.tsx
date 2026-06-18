"use client";

import Link from 'next/link';
import FicheProfilLapin from '@/components/FicheProfilLapin';
import ArbreGeneralogique from '@/components/ArbreGeneralogique';
import QrCodeLapin from '@/components/QrCodeLapin';
import { useState, useEffect } from 'react';

interface LapinMin { id: string; tatouage: string; }

export default function LapinPageClient({ lapinId }: { lapinId: string }) {
  const [lapin, setLapin] = useState<LapinMin | null>(null);

  useEffect(() => {
    const cheptel: LapinMin[] = JSON.parse(localStorage.getItem('ferme_cheptel') || '[]');
    setLapin(cheptel.find(l => l.id === lapinId) ?? null);
  }, [lapinId]);

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen max-w-xl mx-auto">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-gray-900">🐇 Fiche Lapin</h1>
        <Link href="/cheptel"
          className="text-xs px-3 py-2 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 active:opacity-75 transition-colors">
          ← Cheptel
        </Link>
      </div>

      {/* Fiche profil */}
      <div className="mb-4">
        <FicheProfilLapin lapinId={lapinId} />
      </div>

      {/* Arbre généalogique */}
      <div className="mb-4">
        <ArbreGeneralogique lapinId={lapinId} />
      </div>

      {/* QR Code (pour réimprimer depuis la fiche) */}
      {lapin && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">📱 QR Code de ce lapin</p>
          </div>
          <div className="p-4 flex justify-center">
            <QrCodeLapin lapin={lapin} taille={160} />
          </div>
        </div>
      )}
    </div>
  );
}
