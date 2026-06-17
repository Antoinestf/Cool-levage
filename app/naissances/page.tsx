"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lapin {
  id: string;
  tatouage: string;
  sexe: 'M' | 'F';
}

interface Saillie {
  id: string;
  idFemelle: string;
  tatouageFemelle: string;
  idMale?: string;
  tatouageMale?: string;
  dateSaillie: string;
  datePalpation: string;
  dateMiseBas: string;
  dateSevrage: string;
  statut: 'En attente' | 'Gestante' | 'Vide' | 'Mise-bas terminée';
  notes: string;
}

export default function ReproductionPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [cheptel, setCheptel] = useState<Lapin[]>([]);
  const [saillies, setSaillies] = useState<Saillie[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  
  const [nouvelleSaillie, setNouvelleSaillie] = useState({
    idFemelle: '',
    idMale: '',
    dateSaillie: '',
    notes: ''
  });

  // Chargement des données au démarrage
  useEffect(() => {
    const dataCheptel = localStorage.getItem('ferme_cheptel');
    if (dataCheptel) setCheptel(JSON.parse(dataCheptel));

    const dataSaillies = localStorage.getItem('ferme_reproduction');
    if (dataSaillies) setSaillies(JSON.parse(dataSaillies));

    setIsLoaded(true);
  }, []);

  // Sauvegarde automatique des saillies
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('ferme_reproduction', JSON.stringify(saillies));
    }
  }, [saillies, isLoaded]);

  // Filtrer les mâles et les femelles pour les menus déroulants
  const femelles = cheptel.filter(l => l.sexe === 'F');
  const males = cheptel.filter(l => l.sexe === 'M');

  // Fonction pour ajouter des jours à une date
  const ajouterJours = (dateString: string, jours: number) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    date.setDate(date.getDate() + jours);
    return date.toISOString().split('T')[0];
  };

  // NOUVELLE FONCTION : Formater la date en JJ/MM/AAAA pour l'affichage
  const formaterDate = (dateString: string) => {
    if (!dateString) return '';
    const [annee, mois, jour] = dateString.split('-');
    return `${jour}/${mois}/${annee}`;
  };

  const enregistrerSaillie = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 💡 CORRECTION 1 : On ne vérifie plus le mâle ici
    if (!nouvelleSaillie.idFemelle || !nouvelleSaillie.dateSaillie) {
      alert("Veuillez remplir au moins la femelle et la date.");
      return;
    }

    const femelle = femelles.find(f => f.id === nouvelleSaillie.idFemelle);
    const male = males.find(m => m.id === nouvelleSaillie.idMale);

    // 💡 CORRECTION 2 : On s'assure juste que la femelle existe
    if (!femelle) return;

    const nouvelle: Saillie = {
      id: Date.now().toString(),
      idFemelle: femelle.id,
      tatouageFemelle: femelle.tatouage,
      // 💡 CORRECTION 3 : Si le mâle existe on prend ses infos, sinon on ne met rien
      idMale: male?.id,
      tatouageMale: male?.tatouage,
      dateSaillie: nouvelleSaillie.dateSaillie,
      // Calculs automatiques des dates clés
      datePalpation: ajouterJours(nouvelleSaillie.dateSaillie, 14),
      dateMiseBas: ajouterJours(nouvelleSaillie.dateSaillie, 31),
      dateSevrage: ajouterJours(nouvelleSaillie.dateSaillie, 66),
      statut: 'En attente',
      notes: nouvelleSaillie.notes
    };

    setSaillies([...saillies, nouvelle].sort((a, b) => new Date(b.dateSaillie).getTime() - new Date(a.dateSaillie).getTime()));
    
    // Réinitialiser le formulaire
    setNouvelleSaillie({ idFemelle: '', idMale: '', dateSaillie: '', notes: '' });
  };

  const mettreAJourStatut = (id: string, nouveauStatut: Saillie['statut']) => {
    setSaillies(saillies.map(s => s.id === id ? { ...s, statut: nouveauStatut } : s));
  };

  const supprimerSaillie = (id: string) => {
    if(confirm("Supprimer cette fiche de reproduction ?")) {
      setSaillies(saillies.filter(s => s.id !== id));
    }
  };

  if (!isLoaded) return <div className="p-8 text-black font-bold">Chargement du module Maternité...</div>;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* En-tête */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">🍼 Reproduction</h1>
          <p className="text-xs text-gray-400 mt-0.5">{saillies.length} saillie{saillies.length > 1 ? 's' : ''} · {saillies.filter(s => s.statut === 'Gestante').length} gestante{saillies.filter(s => s.statut === 'Gestante').length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow hover:bg-indigo-700 active:scale-95 transition-all shrink-0">
          {formOpen ? '✕ Fermer' : '＋ Saillie'}
        </button>
      </div>

      {/* FORMULAIRE D'AJOUT — collapsible */}
      {formOpen && (
        <form onSubmit={(e) => { enregistrerSaillie(e); setFormOpen(false); }} className="mb-5 p-4 rounded-2xl shadow-sm bg-white border border-gray-200">
          <h2 className="text-sm font-bold mb-4 text-gray-700">Nouvelle saillie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">♀ Femelle (Mère) *</label>
              <select
                value={nouvelleSaillie.idFemelle}
                onChange={(e) => setNouvelleSaillie({...nouvelleSaillie, idFemelle: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              >
                <option value="">-- Sélectionner --</option>
                {femelles.map(f => <option key={f.id} value={f.id}>{f.tatouage}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">♂ Mâle (Père)</label>
              <select
                value={nouvelleSaillie.idMale}
                onChange={(e) => setNouvelleSaillie({...nouvelleSaillie, idMale: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                // 💡 CORRECTION 4 : On a retiré le "required" ici !
              >
                <option value="">-- Inconnu --</option>
                {males.map(m => <option key={m.id} value={m.id}>{m.tatouage}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">📅 Date de l'accouplement *</label>
              <input
                type="date"
                value={nouvelleSaillie.dateSaillie}
                onChange={(e) => setNouvelleSaillie({...nouvelleSaillie, dateSaillie: e.target.value})}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-sm">
            ✅ Calculer les dates & Enregistrer
          </button>
        </form>
      )}

      {/* LISTE DES REPRODUCTIONS */}
      <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">Calendrier des portées</h2>

      {saillies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p className="text-3xl mb-2">🐰</p>
          <p className="font-medium text-gray-600">Aucune saillie enregistrée</p>
          <p className="text-xs mt-1">Remplissez le formulaire ci-dessus pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {saillies.map((saillie) => {
            const statutStyle = {
              'En attente':       { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  badge: 'bg-amber-100 text-amber-800',  icone: '⏳' },
              'Gestante':         { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  badge: 'bg-green-100 text-green-800',  icone: '🤰' },
              'Vide':             { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    badge: 'bg-red-100 text-red-800',      icone: '❌' },
              'Mise-bas terminée':{ bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   badge: 'bg-blue-100 text-blue-800',    icone: '🍼' },
            }[saillie.statut] ?? { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-800', icone: '?' };

            return (
              <div key={saillie.id} className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${statutStyle.border}`}>

                {/* En-tête épuré */}
                <div className={`px-4 py-3 ${statutStyle.bg}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-gray-900 text-base">
                        {/* 💡 CORRECTION 5 : On affiche "Inconnu" si le tatouageMale est vide */}
                        ♀ {saillie.tatouageFemelle} <span className="text-gray-400 font-normal text-sm">×</span> ♂ {saillie.tatouageMale || 'Inconnu'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Saillie : {formaterDate(saillie.dateSaillie)}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${statutStyle.badge}`}>
                      {statutStyle.icone} {saillie.statut}
                    </span>
                  </div>
                </div>

                {/* Dates — format épuré sans séparateurs */}
                <div className="px-4 py-3 space-y-2">
                  {[
                    { label: 'Palpation',   date: saillie.datePalpation, color: 'text-amber-600' },
                    { label: 'Mise-bas',    date: saillie.dateMiseBas,   color: 'text-red-600'   },
                    { label: 'Sevrage',     date: saillie.dateSevrage,   color: 'text-blue-600'  },
                  ].map(({ label, date, color }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 font-medium">{label}</span>
                      <span className={`text-xs font-bold ${color}`}>{formaterDate(date)}</span>
                    </div>
                  ))}
                </div>

                {/* Sélecteur statut + suppression en bas */}
                <div className="px-3 pb-3 space-y-2">
                  <select
                    value={saillie.statut}
                    onChange={(e) => mettreAJourStatut(saillie.id, e.target.value as Saillie['statut'])}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    <option value="En attente">⏳ En attente — Palpation</option>
                    <option value="Gestante">🤰 Gestante confirmée</option>
                    <option value="Vide">❌ Saillie ratée (Vide)</option>
                    <option value="Mise-bas terminée">🍼 Mise-bas terminée</option>
                  </select>
                  <button
                    onClick={() => supprimerSaillie(saillie.id)}
                    className="w-full py-1.5 text-[11px] font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    Supprimer cette fiche
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}