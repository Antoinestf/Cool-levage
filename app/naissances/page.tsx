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
  idMale: string;
  tatouageMale: string;
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
    if (!nouvelleSaillie.idFemelle || !nouvelleSaillie.idMale || !nouvelleSaillie.dateSaillie) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    const femelle = femelles.find(f => f.id === nouvelleSaillie.idFemelle);
    const male = males.find(m => m.id === nouvelleSaillie.idMale);

    if (!femelle || !male) return;

    const nouvelle: Saillie = {
      id: Date.now().toString(),
      idFemelle: femelle.id,
      tatouageFemelle: femelle.tatouage,
      idMale: male.id,
      tatouageMale: male.tatouage,
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
      <div className="flex flex-wrap gap-3 items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Maternité & Reproduction</h1>
        <Link href="/cheptel" className="text-xs px-3 py-2 bg-zinc-800 text-white font-bold rounded-xl">
          ← Cheptel
        </Link>
      </div>

      {/* FORMULAIRE D'AJOUT */}
      <form onSubmit={enregistrerSaillie} className="mb-5 p-4 md:p-6 rounded-2xl shadow-sm bg-white border border-gray-200">
        <h2 className="text-base font-bold mb-4 text-gray-800">Enregistrer une saillie</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-sm font-bold text-black mb-1">Femelle (Mère)</label>
            <select
              value={nouvelleSaillie.idFemelle}
              onChange={(e) => setNouvelleSaillie({...nouvelleSaillie, idFemelle: e.target.value})}
              className="w-full border-2 border-gray-400 rounded-md p-2 text-black font-semibold bg-white"
              required
            >
              <option value="">-- Sélectionner --</option>
              {femelles.map(f => <option key={f.id} value={f.id}>{f.tatouage}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">Mâle (Père)</label>
            <select
              value={nouvelleSaillie.idMale}
              onChange={(e) => setNouvelleSaillie({...nouvelleSaillie, idMale: e.target.value})}
              className="w-full border-2 border-gray-400 rounded-md p-2 text-black font-semibold bg-white"
              required
            >
              <option value="">-- Sélectionner --</option>
              {males.map(m => <option key={m.id} value={m.id}>{m.tatouage}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">Date de l'accouplement</label>
            <input
              type="date"
              value={nouvelleSaillie.dateSaillie}
              onChange={(e) => setNouvelleSaillie({...nouvelleSaillie, dateSaillie: e.target.value})}
              className="w-full border-2 border-gray-400 rounded-md p-2 text-black font-semibold bg-white"
              required
            />
          </div>
        </div>

        <button type="submit" className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-sm">
          Calculer les dates & Enregistrer
        </button>
      </form>

      {/* LISTE DES REPRODUCTIONS */}
      <h2 className="text-base font-bold text-gray-800 mb-4">Calendrier des portées</h2>
      
      {saillies.length === 0 ? (
        <p className="text-gray-800 font-bold p-4 bg-white border-2 border-gray-300 rounded-xl">Aucune saillie enregistrée pour le moment.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {saillies.map((saillie) => (
            <div key={saillie.id} className="border-2 border-gray-300 rounded-xl bg-white shadow-sm overflow-hidden">
              
              {/* En-tête de la carte avec couleur selon statut */}
              <div className={`p-3 border-b-2 border-gray-300 ${
                saillie.statut === 'En attente' ? 'bg-yellow-100' :
                saillie.statut === 'Gestante' ? 'bg-green-100' :
                saillie.statut === 'Vide' ? 'bg-red-100' : 'bg-blue-100'
              }`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-black uppercase text-lg">
                    ♀ {saillie.tatouageFemelle} <span className="text-gray-500 mx-1">x</span> ♂ {saillie.tatouageMale}
                  </h3>
                  <select
                    value={saillie.statut}
                    onChange={(e) => mettreAJourStatut(saillie.id, e.target.value as Saillie['statut'])}
                    className="border-2 border-gray-400 text-black font-bold p-1 rounded text-sm bg-white"
                  >
                    <option value="En attente">En attente (Palpation)</option>
                    <option value="Gestante">Gestante confirmée</option>
                    <option value="Vide">Ratée (Vide)</option>
                    <option value="Mise-bas terminée">Mise-bas terminée</option>
                  </select>
                </div>
              </div>

              {/* Corps de la carte : Les dates (Maintenant formatées via formaterDate) */}
              <div className="p-4 space-y-3">
                <div className="flex justify-between border-b pb-1">
                  <span className="font-bold text-gray-700">Date Saillie :</span>
                  <span className="font-black text-black">{formaterDate(saillie.dateSaillie)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-bold text-gray-700">Palpation (+14j) :</span>
                  <span className="font-black text-orange-600">{formaterDate(saillie.datePalpation)}</span>
                </div>
                <div className="flex justify-between border-b pb-1">
                  <span className="font-bold text-gray-700">Mise-bas prévue :</span>
                  <span className="font-black text-red-600">{formaterDate(saillie.dateMiseBas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-gray-700">Sevrage (+35j) :</span>
                  <span className="font-black text-blue-700">{formaterDate(saillie.dateSevrage)}</span>
                </div>

                <div className="mt-4 pt-3 border-t-2 border-gray-200 text-right">
                  <button onClick={() => supprimerSaillie(saillie.id)} className="text-xs font-black text-red-600 uppercase hover:underline">
                    Supprimer la fiche
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}