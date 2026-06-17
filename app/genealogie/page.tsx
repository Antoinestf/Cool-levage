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
  const [cheptel, setCheptel] = useState<Lapin[]>([]);
  // LA GRANDE CORRECTION : On utilise l'ID invisible et unique au lieu du texte !
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const donnees = localStorage.getItem('ferme_cheptel');
    if (donnees) {
      const parsedCheptel = JSON.parse(donnees);
      setCheptel(parsedCheptel);
      
      const urlParams = new URLSearchParams(window.location.search);
      const tatouageDepuisUrl = urlParams.get('tatouage');
      
      if (tatouageDepuisUrl) {
        const matched = parsedCheptel.find((l: Lapin) => l.tatouage === tatouageDepuisUrl);
        if (matched) setSelectedId(matched.id);
      } else if (parsedCheptel.length > 0) {
        setSelectedId(parsedCheptel[0].id);
      }
    }
    setIsLoaded(true);
  }, []);

  // On modifie les liaisons pour être sûr de cibler le bon lapin via son ID
  const associerParent = (enfantId: number, parentTatouage: string, lien: 'pere' | 'mere') => {
    const nouveauCheptel = cheptel.map(lapin => {
      if (lapin.id === enfantId) {
        return { ...lapin, [lien]: parentTatouage };
      }
      return lapin;
    });
    setCheptel(nouveauCheptel);
    localStorage.setItem('ferme_cheptel', JSON.stringify(nouveauCheptel));
  };

  const retirerParent = (enfantId: number, lien: 'pere' | 'mere') => {
    const nouveauCheptel = cheptel.map(lapin => {
      if (lapin.id === enfantId) {
        const copieLapin = { ...lapin };
        delete copieLapin[lien];
        return copieLapin;
      }
      return lapin;
    });
    setCheptel(nouveauCheptel);
    localStorage.setItem('ferme_cheptel', JSON.stringify(nouveauCheptel));
  };

  // Logique de détective améliorée sans objet factice
  const trouverAncetre = (enfantId: number | undefined, lien: 'pere' | 'mere'): Lapin | null => {
    if (!enfantId) return null;
    const enfant = cheptel.find(l => l.id === enfantId);
    if (!enfant) return null;
    
    const tatouageAncetre = lien === 'pere' ? enfant.pere : enfant.mere;
    if (!tatouageAncetre) return null;
    
    return cheptel.find(l => l.tatouage === tatouageAncetre) || null;
  };

  const pivoterVersEnfant = (tatouageParent: string | undefined) => {
    if (!tatouageParent) return;
    const enfantDirect = cheptel.find(l => l.pere === tatouageParent || l.mere === tatouageParent);
    if (enfantDirect) {
      setSelectedId(enfantDirect.id); // On cible le VRAI lapin unique
    }
  };

  const aDesEnfants = (tatouage: string | undefined) => {
    if (!tatouage) return false;
    return cheptel.some(l => l.pere === tatouage || l.mere === tatouage);
  };

  if (!isLoaded) return <div className="p-8 text-gray-500 italic">Chargement...</div>;

  const cible = cheptel.find(l => l.id === selectedId);
  const pere = trouverAncetre(cible?.id, 'pere');
  const mere = trouverAncetre(cible?.id, 'mere');
  const gpp = trouverAncetre(pere?.id, 'pere'); 
  const gmp = trouverAncetre(pere?.id, 'mere'); 
  const gpm = trouverAncetre(mere?.id, 'pere'); 
  const gmm = trouverAncetre(mere?.id, 'mere'); 

  const analyserConsanguinite = () => {
    if (!pere || !mere) return { taux: '0%', style: 'bg-green-50 border-green-300 text-green-900', msg: '✅ Sécurité : Parenté incomplète ou croisement neuf.' };
    
    const tPere = pere.tatouage;
    const tMere = mere.tatouage;
    const tGpp = gpp ? gpp.tatouage : null;
    const tGmp = gmp ? gmp.tatouage : null;
    const tGpm = gpm ? gpm.tatouage : null;
    const tGmm = gmm ? gmm.tatouage : null;

    const sontFrereEtSoeur = (tGpp && tGpp === tGpm) || (tGmp && tGmp === tGmm);
    if (sontFrereEtSoeur || tPere === tGpm || tMere === tGpp || tPere === tMere) {
      return { taux: '25%', style: 'bg-red-50 border-red-300 text-red-900 ring-2 ring-red-500', msg: '❌ DANGER ABSOLU : Taux à 25% (Accouplement Frère/Sœur ou Parent/Enfant).' };
    }

    const gpsPaternels = [tGpp, tGmp].filter(Boolean);
    const gpsMaternels = [tGpm, tGmm].filter(Boolean);
    if (gpsPaternels.some(gp => gpsMaternels.includes(gp))) {
      return { taux: '6,25% à 12,5%', style: 'bg-amber-50 border-amber-300 text-amber-900', msg: '⚠️ ATTENTION : Grands-parents en commun (Cousins).' };
    }

    return { taux: '0%', style: 'bg-green-50 border-green-300 text-green-900', msg: '✅ SÉCURITÉ TOTALE : Taux de consanguinité à 0%.' };
  };

  const diagnostic = analyserConsanguinite();

  const CaseLapin = ({ 
    lapin, 
    role, 
    sexeRequis, 
    enfantId,
    estCible = false,
    onRetirer
  }: { 
    lapin: Lapin | null, 
    role: string,
    sexeRequis: 'M' | 'F',
    enfantId?: number,
    estCible?: boolean,
    onRetirer?: () => void
  }) => {
    
    if (!lapin) {
      if (!enfantId) {
        return (
          <div className="bg-gray-100 border border-gray-300 border-dashed rounded-xl p-4 text-center text-xs text-gray-400 min-h-[110px] flex flex-col justify-center">
            <p className="italic text-[11px]">Définir d'abord le dessous</p>
          </div>
        );
      }

      // On empêche de se choisir soi-même comme parent !
      const listOptions = cheptel.filter(l => l.sexe === sexeRequis && l.id !== enfantId && l.statut !== 'Vendu' && l.statut !== 'Mort');

      return (
        <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-3 text-center min-h-[110px] flex flex-col justify-center items-center">
          <p className="text-xs font-bold text-gray-500 mb-2">➕ {role}</p>
          <select
            onChange={(e) => {
              if (e.target.value) associerParent(enfantId, e.target.value, sexeRequis === 'M' ? 'pere' : 'mere');
            }}
            className="text-xs border border-gray-300 rounded p-1 bg-white max-w-full font-medium outline-none text-gray-700"
            defaultValue=""
          >
            <option value="" disabled>Choisir...</option>
            {listOptions.map(l => (
              <option key={l.id} value={l.tatouage}>{l.tatouage}</option>
            ))}
          </select>
        </div>
      );
    }

    const estMale = lapin.sexe === 'M';
    const possedeDesEnfants = aDesEnfants(lapin.tatouage);
    
    let cardStyle = estMale 
      ? 'bg-blue-50/60 border-gray-200 text-blue-900'
      : 'bg-purple-50/60 border-gray-200 text-purple-900';
    
    if (estCible) {
      cardStyle = 'ring-4 ring-indigo-600 bg-indigo-50 text-indigo-950 border-indigo-300';
    }
    
    return (
      <div className={`relative border rounded-xl p-3 text-center flex flex-col justify-center items-center h-full min-h-[110px] shadow-xs ${cardStyle}`}>
        
        {!estCible && onRetirer && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRetirer(); }}
            className="absolute top-1 right-1 bg-white hover:bg-gray-100 text-gray-400 hover:text-red-500 rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold border border-gray-200 z-10 cursor-pointer"
            title="Retirer le lien"
          >
            ✕
          </button>
        )}

        <span className="text-xl mb-1">{estMale ? '🐇' : '🐰'}</span>
        
        <p className="font-extrabold uppercase tracking-wider text-sm flex items-center gap-1">
          {lapin.tatouage} 
          <span className={`text-xs font-bold ${estMale ? 'text-blue-600' : 'text-rose-500'}`}>{estMale ? '♂' : '♀'}</span>
        </p>
        <p className="text-[10px] opacity-70 font-medium">{lapin.race || 'Race inc.'}</p>

        <div className="mt-2 flex gap-1 justify-center w-full">
          {!estCible && (
            <button
              onClick={(e) => { e.stopPropagation(); setSelectedId(lapin.id); }}
              className="text-[9px] bg-white border border-gray-300 px-2 py-1 rounded font-bold text-gray-600 hover:bg-gray-100 shadow-sm flex-1 cursor-pointer"
              title="Centrer l'arbre ici"
            >
              ⬆️ Centrer
            </button>
          )}

          {possedeDesEnfants && (
            <button
              onClick={(e) => { e.stopPropagation(); pivoterVersEnfant(lapin.tatouage); }}
              className={`text-[9px] border px-2 py-1 rounded font-bold shadow-sm flex-1 cursor-pointer ${estCible ? 'bg-indigo-50 border-indigo-400 text-indigo-700 hover:bg-indigo-100' : 'bg-white border-indigo-300 text-indigo-600 hover:bg-indigo-50'}`}
              title="Descendre d'une génération"
            >
              👶 Voir enfant
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="bg-white p-4 md:p-6 rounded-xl border border-gray-200 shadow-sm mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Généalogie Interactive</h1>
          <p className="text-gray-500 text-sm mt-1">Naviguez avec les boutons ⬆️ et 👶 pour explorer tout l'historique.</p>
        </div>
        <div className="flex gap-4 items-center">
          <label className="font-medium text-gray-700">Sujet cible :</label>
          <select value={selectedId || ''} onChange={(e) => setSelectedId(Number(e.target.value))} className="border border-gray-300 rounded-md p-3 font-bold bg-white outline-none">
            {cheptel.map(l => <option key={l.id} value={l.id}>{l.tatouage}</option>)}
          </select>
        </div>
      </div>

      <div className={`p-6 rounded-xl border mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 ${diagnostic.style}`}>
        <div className="flex-1"><p className="text-sm uppercase tracking-wider font-bold opacity-75">Analyse ADN</p><p className="font-medium mt-1">{diagnostic.msg}</p></div>
        <div className="text-center px-6 py-3 bg-white/40 rounded-xl min-w-[140px]"><p className="text-xs font-bold opacity-70">Taux</p><p className="text-2xl font-extrabold">{diagnostic.taux}</p></div>
      </div>

      {cheptel.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm flex flex-col gap-6 max-w-4xl mx-auto">
          
            {/* Grands-parents — 4 cols desktop, 2 cols mobile */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <CaseLapin lapin={gpp} role="Papi Pat." sexeRequis="M" enfantId={pere?.id} onRetirer={() => pere && retirerParent(pere.id, 'pere')} />
            <CaseLapin lapin={gmp} role="Mamie Pat." sexeRequis="F" enfantId={pere?.id} onRetirer={() => pere && retirerParent(pere.id, 'mere')} />
            <CaseLapin lapin={gpm} role="Papi Mat." sexeRequis="M" enfantId={mere?.id} onRetirer={() => mere && retirerParent(mere.id, 'pere')} />
            <CaseLapin lapin={gmm} role="Mamie Mat." sexeRequis="F" enfantId={mere?.id} onRetirer={() => mere && retirerParent(mere.id, 'mere')} />
          </div>

          <div className="hidden md:grid grid-cols-2 text-center text-gray-300 h-2 text-sm -my-2"><div>└───┬───┘</div><div>└───┬───┘</div></div>

          {/* Parents */}
          <div className="grid grid-cols-2 gap-3 md:gap-16 md:px-12">
            <CaseLapin lapin={pere} role="le Père" sexeRequis="M" enfantId={cible?.id} onRetirer={() => cible && retirerParent(cible.id, 'pere')} />
            <CaseLapin lapin={mere} role="la Mère" sexeRequis="F" enfantId={cible?.id} onRetirer={() => cible && retirerParent(cible.id, 'mere')} />
          </div>

          <div className="hidden md:block text-center text-gray-300 h-2 text-lg -my-2">└───┬───┘</div>

          {/* Sujet */}
          <div className="flex justify-center">
            <div className="w-1/2 max-w-[250px]">
              <CaseLapin lapin={cible || null} role="Sujet" sexeRequis="M" estCible={true} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-12 text-center rounded-xl text-gray-500 italic">Aucun animal disponible.</div>
      )}
    </div>
  );
}
