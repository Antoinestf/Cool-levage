"use client";

import { useState, useEffect } from 'react';

// Même interface étendue — compatible ancien (pere/mere = tatouage) et nouveau (pereId/mereId = ID)
interface Lapin {
  id: string;
  tatouage: string;
  sexe?: 'M' | 'F';
  race?: string;
  caracteristiques?: string;
  pere?: string;
  mere?: string;
  pereId?: string;
  mereId?: string;
}

// Résout un parent : cherche d'abord par ID, puis par tatouage (rétrocompatibilité)
function resoudreParent(
  id: string | undefined,
  tatouage: string | undefined,
  tous: Lapin[]
): Lapin | null {
  if (id) return tous.find(l => l.id === id) ?? null;
  if (tatouage) return tous.find(l => l.tatouage === tatouage) ?? null;
  return null;
}

// ── Mini-carte d'un ancêtre ────────────────────────────────────────────────────
function CarteAncetre({
  lapin, role, compact = false,
}: {
  lapin: Lapin | null; role: string; compact?: boolean;
}) {
  if (!lapin) {
    return (
      <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-2 flex flex-col items-center justify-center min-h-[60px]">
        <p className="text-[9px] text-gray-400 font-medium">{role}</p>
        <p className="text-[10px] text-gray-300">—</p>
      </div>
    );
  }

  const estMale = lapin.sexe === 'M';

  return (
    <div className={`rounded-xl border p-2 flex flex-col items-center justify-center text-center min-h-[60px] ${
      estMale ? 'bg-blue-50/70 border-blue-200' : 'bg-purple-50/70 border-purple-200'
    }`}>
      <p className="text-[9px] text-gray-400 font-medium mb-0.5">{role}</p>
      <p className="font-extrabold text-gray-900 text-[11px] uppercase leading-none">
        {lapin.tatouage}
        <span className={`ml-0.5 ${estMale ? 'text-blue-500' : 'text-rose-500'}`}>{estMale ? '♂' : '♀'}</span>
      </p>
      {!compact && lapin.race && (
        <p className="text-[9px] text-gray-400 truncate max-w-full mt-0.5">{lapin.race}</p>
      )}
    </div>
  );
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function ArbreGeneralogique({ lapinId }: { lapinId: string }) {
  const [tous, setTous] = useState<Lapin[]>([]);
  const [monted, setMonted] = useState(false);

  useEffect(() => {
    setTous(JSON.parse(localStorage.getItem('ferme_cheptel') || '[]'));
    setMonted(true);
  }, []);

  if (!monted) return null;

  const sujet = tous.find(l => l.id === lapinId);
  if (!sujet) return null;

  // Génération 1 — parents
  const pere = resoudreParent(sujet.pereId, sujet.pere, tous);
  const mere = resoudreParent(sujet.mereId, sujet.mere, tous);

  // Génération 2 — grands-parents
  const gpp = pere ? resoudreParent(pere.pereId, pere.pere, tous) : null;
  const gmp = pere ? resoudreParent(pere.mereId, pere.mere, tous) : null;
  const gpm = mere ? resoudreParent(mere.pereId, mere.pere, tous) : null;
  const gmm = mere ? resoudreParent(mere.mereId, mere.mere, tous) : null;

  const aDesParents      = pere || mere;
  const aDesGrandsParents = gpp || gmp || gpm || gmm;

  const estMale = sujet.sexe === 'M';
  const caracteristiques = sujet.caracteristiques
    || [sujet.sexe === 'M' ? 'Mâle' : sujet.sexe === 'F' ? 'Femelle' : null, sujet.race]
        .filter(Boolean).join(' · ');

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* En-tête */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">🌳 Arbre généalogique</p>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Génération 2 — Grands-parents ── */}
        {aDesGrandsParents && (
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">Grands-parents</p>
            <div className="grid grid-cols-4 gap-1.5">
              <CarteAncetre lapin={gpp} role="PP ♂" compact />
              <CarteAncetre lapin={gmp} role="MP ♀" compact />
              <CarteAncetre lapin={gpm} role="PM ♂" compact />
              <CarteAncetre lapin={gmm} role="MM ♀" compact />
            </div>
          </div>
        )}

        {/* Connecteur visuel */}
        {aDesGrandsParents && aDesParents && (
          <div className="grid grid-cols-2 text-center text-gray-300 text-xs -my-2 px-8">
            <span>└──┬──┘</span>
            <span>└──┬──┘</span>
          </div>
        )}

        {/* ── Génération 1 — Parents ── */}
        {aDesParents ? (
          <div>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">Parents</p>
            <div className="grid grid-cols-2 gap-2">
              <CarteAncetre lapin={pere} role="Père ♂" />
              <CarteAncetre lapin={mere} role="Mère ♀" />
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-gray-400 italic">
              Aucun parent renseigné.
              <br />
              Utilisez la page <span className="font-bold text-indigo-500">Généalogie</span> pour lier les parents.
            </p>
          </div>
        )}

        {/* Connecteur visuel */}
        {aDesParents && (
          <div className="text-center text-gray-300 text-xs -my-2">
            └────┬────┘
          </div>
        )}

        {/* ── Génération 0 — Sujet ── */}
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center">Sujet</p>
          <div className={`rounded-2xl border-2 p-4 text-center ring-4 ring-indigo-500 ${
            estMale ? 'bg-blue-50 border-blue-300' : 'bg-purple-50 border-purple-300'
          }`}>
            <p className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide">
              {sujet.tatouage}
              <span className={`ml-1.5 text-xl ${estMale ? 'text-blue-500' : 'text-rose-500'}`}>{estMale ? '♂' : '♀'}</span>
            </p>
            {caracteristiques && <p className="text-sm text-gray-500 mt-0.5">{caracteristiques}</p>}
          </div>
        </div>

      </div>
    </div>
  );
}
