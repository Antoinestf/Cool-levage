"use client";
import React, { useState, useEffect } from 'react';

interface Lapin {
  id: number;
  tatouage: string;
  race: string;
  sexe: 'M' | 'F';
  statut: string;
  pere?: string;
  mere?: string;
}

export default function ArbreGenealogique() {
  const [cheptel, setCheptel]     = useState<Lapin[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded]   = useState(false);

  useEffect(() => {
    const donnees = localStorage.getItem('ferme_cheptel');
    if (donnees) {
      const parsed: Lapin[] = JSON.parse(donnees);
      setCheptel(parsed);
      const urlParams = new URLSearchParams(window.location.search);
      const tatouageUrl = urlParams.get('tatouage');
      if (tatouageUrl) {
        const matched = parsed.find(l => l.tatouage === tatouageUrl);
        if (matched) { setSelectedId(matched.id); return; }
      }
      if (parsed.length > 0) setSelectedId(parsed[0].id);
    }
    setIsLoaded(true);
  }, []);

  const associerParent = (enfantId: number, parentTatouage: string, lien: 'pere' | 'mere') => {
    const maj = cheptel.map(l => l.id === enfantId ? { ...l, [lien]: parentTatouage } : l);
    setCheptel(maj);
    localStorage.setItem('ferme_cheptel', JSON.stringify(maj));
  };

  const retirerParent = (enfantId: number, lien: 'pere' | 'mere') => {
    const maj = cheptel.map(l => {
      if (l.id !== enfantId) return l;
      const c = { ...l }; delete c[lien]; return c;
    });
    setCheptel(maj);
    localStorage.setItem('ferme_cheptel', JSON.stringify(maj));
  };

  const trouverAncetre = (enfantId: number | undefined, lien: 'pere' | 'mere'): Lapin | null => {
    if (!enfantId) return null;
    const enfant = cheptel.find(l => l.id === enfantId);
    if (!enfant) return null;
    const tatouage = lien === 'pere' ? enfant.pere : enfant.mere;
    if (!tatouage) return null;
    return cheptel.find(l => l.tatouage === tatouage) || null;
  };

  const pivoterVersEnfant = (tatouage: string | undefined) => {
    if (!tatouage) return;
    const enfant = cheptel.find(l => l.pere === tatouage || l.mere === tatouage);
    if (enfant) setSelectedId(enfant.id);
  };

  const aDesEnfants = (tatouage: string | undefined) =>
    !!tatouage && cheptel.some(l => l.pere === tatouage || l.mere === tatouage);

  if (!isLoaded) return <div className="p-6 text-gray-400">Chargement…</div>;

  const cible = cheptel.find(l => l.id === selectedId);
  const pere  = trouverAncetre(cible?.id, 'pere');
  const mere  = trouverAncetre(cible?.id, 'mere');
  const gpp   = trouverAncetre(pere?.id, 'pere');
  const gmp   = trouverAncetre(pere?.id, 'mere');
  const gpm   = trouverAncetre(mere?.id, 'pere');
  const gmm   = trouverAncetre(mere?.id, 'mere');

  const analyserConsanguinite = () => {
    if (!pere || !mere) return { taux: '—', style: 'bg-green-50 border-green-300 text-green-900', msg: '✅ Parenté incomplète — pas de risque détecté.' };
    const [tPere, tMere] = [pere.tatouage, mere.tatouage];
    const tGpp = gpp?.tatouage ?? null, tGmp = gmp?.tatouage ?? null;
    const tGpm = gpm?.tatouage ?? null, tGmm = gmm?.tatouage ?? null;
    const freresoeur = (tGpp && tGpp === tGpm) || (tGmp && tGmp === tGmm);
    if (freresoeur || tPere === tGpm || tMere === tGpp || tPere === tMere)
      return { taux: '25%', style: 'bg-red-50 border-red-300 text-red-900 ring-2 ring-red-500', msg: '❌ DANGER : Frère/Sœur ou Parent/Enfant — accouplement à éviter absolument.' };
    const gpPat = [tGpp, tGmp].filter(Boolean);
    const gpMat = [tGpm, tGmm].filter(Boolean);
    if (gpPat.some(gp => gpMat.includes(gp)))
      return { taux: '6–12%', style: 'bg-amber-50 border-amber-300 text-amber-900', msg: '⚠️ Grands-parents communs — cousins germains, à limiter.' };
    return { taux: '0%', style: 'bg-green-50 border-green-300 text-green-900', msg: '✅ Aucune consanguinité détectée.' };
  };

  const diagnostic = analyserConsanguinite();

  // ── Carte lapin ─────────────────────────────────────────────────────────────
  const CaseLapin = ({
    lapin, role, sexeRequis, enfantId, estCible = false, onRetirer,
  }: {
    lapin: Lapin | null; role: string; sexeRequis: 'M' | 'F';
    enfantId?: number; estCible?: boolean; onRetirer?: () => void;
  }) => {
    if (!lapin) {
      if (!enfantId) {
        return (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-2 text-center flex items-center justify-center min-h-[72px] md:min-h-[100px]">
            <p className="text-[10px] text-gray-400 italic">Définir d'abord le niveau inférieur</p>
          </div>
        );
      }
      const options = cheptel.filter(l => l.sexe === sexeRequis && l.id !== enfantId && l.statut !== 'Vendu' && l.statut !== 'Mort');
      return (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-2 text-center flex flex-col justify-center items-center min-h-[72px] md:min-h-[100px] gap-1.5">
          <p className="text-[10px] font-bold text-gray-500">➕ {role}</p>
          <select
            onChange={e => { if (e.target.value) associerParent(enfantId, e.target.value, sexeRequis === 'M' ? 'pere' : 'mere'); }}
            className="text-[11px] border border-gray-300 rounded-lg px-1.5 py-1 bg-white w-full font-medium text-gray-700 focus:outline-none"
            defaultValue=""
          >
            <option value="" disabled>Choisir…</option>
            {options.map(l => <option key={l.id} value={l.tatouage}>{l.tatouage}</option>)}
          </select>
        </div>
      );
    }

    const estMale = lapin.sexe === 'M';
    const possedeEnfants = aDesEnfants(lapin.tatouage);

    let cardStyle = estMale
      ? 'bg-blue-50/70 border-blue-100 text-blue-900'
      : 'bg-purple-50/70 border-purple-100 text-purple-900';
    if (estCible) cardStyle = 'ring-4 ring-indigo-600 bg-indigo-50 border-indigo-300 text-indigo-950';

    return (
      <div className={`relative border rounded-xl p-2 md:p-3 flex flex-col justify-center items-center min-h-[72px] md:min-h-[100px] shadow-sm ${cardStyle}`}>

        {!estCible && onRetirer && (
          <button
            onClick={e => { e.stopPropagation(); onRetirer(); }}
            className="absolute top-1 right-1 bg-white/80 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[9px] font-bold border border-gray-200 z-10"
            title="Retirer le lien"
          >✕</button>
        )}

        {/* Tatouage + sexe sur une ligne */}
        <p className="font-extrabold uppercase tracking-wide text-sm leading-tight flex items-center gap-1">
          <span className="text-base">{estMale ? '🐇' : '🐰'}</span>
          {lapin.tatouage}
          <span className={`text-xs font-black ${estMale ? 'text-blue-500' : 'text-rose-500'}`}>{estMale ? '♂' : '♀'}</span>
        </p>
        <p className="text-[10px] opacity-60 font-medium truncate max-w-full px-1">{lapin.race || 'Race ?'}</p>

        {/* Boutons navigation */}
        {!estCible && (
          <div className="mt-1.5 flex gap-1 w-full">
            <button
              onClick={e => { e.stopPropagation(); setSelectedId(lapin.id); }}
              className="flex-1 text-[9px] md:text-[10px] bg-white/80 border border-gray-300 py-1 rounded-lg font-bold text-gray-600 hover:bg-gray-50 active:scale-95"
              title="Centrer l'arbre ici"
            >
              <span className="md:hidden">⬆️</span>
              <span className="hidden md:inline">⬆️ Centrer</span>
            </button>
            {possedeEnfants && (
              <button
                onClick={e => { e.stopPropagation(); pivoterVersEnfant(lapin.tatouage); }}
                className={`flex-1 text-[9px] md:text-[10px] border py-1 rounded-lg font-bold active:scale-95 ${estCible ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white/80 border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                title="Descendre vers un enfant"
              >
                <span className="md:hidden">👶</span>
                <span className="hidden md:inline">👶 Enfant</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3 md:p-6 bg-gray-50 min-h-screen">

      {/* ── En-tête compact ──────────────────────────────────────────────────── */}
      <div className="bg-white px-4 py-3 md:p-5 rounded-2xl border border-gray-200 shadow-sm mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 leading-tight">🌳 Généalogie</h1>
          <p className="text-gray-400 text-[11px] md:text-sm mt-0.5 truncate">Naviguez avec ⬆️ Centrer et 👶 Enfant pour explorer.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Sujet :</span>
          <select
            value={selectedId || ''}
            onChange={e => setSelectedId(Number(e.target.value))}
            className="border border-gray-300 rounded-xl px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 max-w-[160px] sm:max-w-none"
          >
            {cheptel.map(l => <option key={l.id} value={l.id}>{l.tatouage} {l.sexe === 'M' ? '♂' : '♀'}</option>)}
          </select>
        </div>
      </div>

      {/* ── Diagnostic consanguinité ─────────────────────────────────────────── */}
      <div className={`px-4 py-3 md:p-5 rounded-2xl border mb-4 shadow-sm flex items-center gap-3 ${diagnostic.style}`}>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-60 mb-0.5">Analyse consanguinité</p>
          <p className="text-sm font-semibold leading-snug">{diagnostic.msg}</p>
        </div>
        <div className="text-center px-4 py-2 bg-white/50 rounded-xl shrink-0">
          <p className="text-[10px] font-bold opacity-60">Taux</p>
          <p className="text-xl font-extrabold leading-tight">{diagnostic.taux}</p>
        </div>
      </div>

      {/* ── Arbre généalogique ───────────────────────────────────────────────── */}
      {cheptel.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-3 md:p-8 shadow-sm flex flex-col gap-3 md:gap-6 max-w-4xl mx-auto">

          {/* Grands-parents */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Grands-parents</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <CaseLapin lapin={gpp} role="Papi Pat." sexeRequis="M" enfantId={pere?.id} onRetirer={() => pere && retirerParent(pere.id, 'pere')} />
              <CaseLapin lapin={gmp} role="Mamie Pat." sexeRequis="F" enfantId={pere?.id} onRetirer={() => pere && retirerParent(pere.id, 'mere')} />
              <CaseLapin lapin={gpm} role="Papi Mat." sexeRequis="M" enfantId={mere?.id} onRetirer={() => mere && retirerParent(mere.id, 'pere')} />
              <CaseLapin lapin={gmm} role="Mamie Mat." sexeRequis="F" enfantId={mere?.id} onRetirer={() => mere && retirerParent(mere.id, 'mere')} />
            </div>
          </div>

          {/* Connecteur desktop */}
          <div className="hidden md:grid grid-cols-2 text-center text-gray-300 text-sm -my-3">
            <div>└───┬───┘</div><div>└───┬───┘</div>
          </div>

          {/* Parents */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Parents</p>
            <div className="grid grid-cols-2 gap-2 md:gap-12 md:px-16">
              <CaseLapin lapin={pere} role="le Père" sexeRequis="M" enfantId={cible?.id} onRetirer={() => cible && retirerParent(cible.id, 'pere')} />
              <CaseLapin lapin={mere} role="la Mère" sexeRequis="F" enfantId={cible?.id} onRetirer={() => cible && retirerParent(cible.id, 'mere')} />
            </div>
          </div>

          {/* Connecteur desktop */}
          <div className="hidden md:block text-center text-gray-300 text-lg -my-3">└───┬───┘</div>

          {/* Sujet */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 text-center">Sujet</p>
            <div className="flex justify-center">
              <div className="w-1/2 max-w-[220px]">
                <CaseLapin lapin={cible || null} role="Sujet" sexeRequis="M" estCible={true} />
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white p-10 text-center rounded-2xl border border-gray-100 text-gray-400">
          <p className="text-3xl mb-2">🌳</p>
          <p className="font-medium text-gray-500">Aucun animal enregistré</p>
          <p className="text-xs mt-1">Ajoutez des lapins dans Cheptel pour commencer</p>
        </div>
      )}
    </div>
  );
}
