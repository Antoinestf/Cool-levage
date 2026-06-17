"use client";
import React, { useState } from 'react';

// Structure d'une annonce
interface Annonce {
  id: number;
  nom: string;
  race: string;
  prix: number;
  age: string;
  description: string;
  image: string;
}

export default function Marketplace() {
  // Simulation de données (bientôt on pourra lier ça à ton cheptel !)
  const [annonces] = useState<Annonce[]>([
    { id: 1, nom: 'Lapin Géant', race: 'Géant des Flandres', prix: 8000, age: '4 mois', description: 'Très bonne croissance, prêt pour la reproduction.', image: '🐇' },
    { id: 2, nom: 'Lapine Naine', race: 'Bélier', prix: 5000, age: '2 mois', description: 'Calme et très docile.', image: '🐇' }
  ]);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
        <p className="text-gray-500">Découvrez les animaux disponibles à la vente.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {annonces.map((annonce) => (
          <div key={annonce.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="text-5xl mb-4">{annonce.image}</div>
            <h2 className="text-xl font-bold">{annonce.nom}</h2>
            <p className="text-indigo-600 font-bold mb-2">{annonce.race}</p>
            <p className="text-gray-600 text-sm mb-4">{annonce.description}</p>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-lg font-extrabold">{annonce.prix.toLocaleString()} FCFA</span>
              <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700">
                Contact
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}