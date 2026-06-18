"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Interface complète — compatible ancien et nouveau modèle de données
export interface Lapin {
  id: string;
  tatouage: string;
  sexe?: 'M' | 'F';
  race?: string;
  caracteristiques?: string; // champ libre optionnel, ex: "Femelle Papillon"
  statut?: string;
  dateNaissance?: string;
  pere?: string;   // tatouage du père (ancien modèle)
  mere?: string;   // tatouage de la mère (ancien modèle)
  pereId?: string; // ID du père (nouveau modèle)
  mereId?: string; // ID de la mère (nouveau modèle)
}

function ageMois(dateNaissance: string): number {
  return Math.floor((Date.now() - new Date(dateNaissance).getTime()) / (86400000 * 30));
}

function fmt(d: string) {
  if (!d) return '—';
  const [y, m, j] = d.split('-'); return `${j}/${m}/${y}`;
}

export default function FicheProfilLapin({ lapinId }: { lapinId: string }) {
  const [lapin, setLapin] = useState<Lapin | null>(null);
  const [monted, setMonted]   = useState(false);

  useEffect(() => {
    const cheptel: Lapin[] = JSON.parse(localStorage.getItem('ferme_cheptel') || '[]');
    setLapin(cheptel.find(l => l.id === lapinId) ?? null);
    setMonted(true);
  }, [lapinId]);

  if (!monted) return <div className="p-6 text-gray-400 text-center">Chargement…</div>;

  if (!lapin) return (
    <div className="p-8 text-center rounded-2xl border border-gray-100 bg-white">
      <p className="text-4xl mb-3">🔍</p>
      <p className="font-semibold text-gray-600">Lapin introuvable</p>
      <p className="text-xs text-gray-400 font-mono mt-2 break-all">{lapinId}</p>
      <Link href="/cheptel"
        className="mt-4 inline-block text-xs font-bold text-indigo-600 hover:underline">
        ← Retour au cheptel
      </Link>
    </div>
  );

  const estMale = lapin.sexe === 'M';
  const caracteristiques = lapin.caracteristiques
    || [lapin.sexe === 'M' ? 'Mâle' : lapin.sexe === 'F' ? 'Femelle' : null, lapin.race]
        .filter(Boolean).join(' · ')
    || 'Caractéristiques non renseignées';

  const age = lapin.dateNaissance ? ageMois(lapin.dateNaissance) : null;

  return (
    <div className={`rounded-2xl border-2 overflow-hidden shadow-sm ${estMale ? 'border-blue-200' : 'border-purple-200'}`}>

      {/* ── En-tête ── */}
      <div className={`px-5 py-4 ${estMale ? 'bg-blue-50' : 'bg-purple-50'}`}>
        <div className="flex items-center gap-4">
          <span className="text-5xl">{estMale ? '🐇' : '🐰'}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide leading-none">
              {lapin.tatouage}
            </h2>
            <p className={`text-sm font-semibold mt-0.5 ${estMale ? 'text-blue-700' : 'text-purple-700'}`}>
              {caracteristiques}
            </p>
          </div>
          <span className={`text-3xl font-black shrink-0 ${estMale ? 'text-blue-400' : 'text-rose-400'}`}>
            {estMale ? '♂' : '♀'}
          </span>
        </div>
      </div>

      {/* ── Détails ── */}
      <div className="px-5 py-3 bg-white space-y-2 border-b border-gray-100">
        {[
          { label: 'Tatouage',    val: lapin.tatouage },
          { label: 'Statut',      val: lapin.statut },
          { label: 'Race',        val: lapin.race },
          { label: 'Âge',         val: age !== null ? `${age} mois` : null },
          { label: 'Né(e) le',    val: lapin.dateNaissance ? fmt(lapin.dateNaissance) : null },
          { label: 'Père',        val: lapin.pere || lapin.pereId },
          { label: 'Mère',        val: lapin.mere || lapin.mereId },
        ].filter(r => r.val).map(({ label, val }) => (
          <div key={label} className="flex items-center justify-between gap-4">
            <span className="text-xs text-gray-400 font-medium">{label}</span>
            <span className="text-sm font-bold text-gray-900 text-right truncate max-w-[180px]">{val}</span>
          </div>
        ))}
      </div>

      {/* ── Actions ── */}
      <div className="px-4 py-3 bg-white grid grid-cols-2 gap-2">
        <Link href={`/genealogie?tatouage=${lapin.tatouage}`}
          className="py-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs text-center hover:bg-indigo-100 active:opacity-75 transition-colors">
          🌳 Généalogie
        </Link>
        <Link href={`/performances?lapin=${lapin.id}`}
          className="py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-bold text-xs text-center hover:bg-gray-100 active:opacity-75 transition-colors">
          📈 Performances
        </Link>
      </div>
    </div>
  );
}
