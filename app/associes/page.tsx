"use client";
import React, { useState, useEffect } from 'react';

interface Transaction {
  date: string;
  type: string;
  description: string;
  montant: number;
}

export default function EspaceAssocies() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoaded, setIsLoaded] = useState(false); // Sécurité Hydration Next.js

  const [typeTransaction, setTypeTransaction] = useState('Dépense');
  const [description, setDescription] = useState('');
  const [montant, setMontant] = useState('');

  // 1. ÉTAPE CHARGEMENT : On récupère l'historique financier du téléphone
  useEffect(() => {
    const donneesSauvegardees = localStorage.getItem('ferme_finances');
    if (donneesSauvegardees) {
      setTransactions(JSON.parse(donneesSauvegardees));
    } else {
      // S'il n'y a aucune donnée historique, on met l'apport initial par défaut
      setTransactions([
        { date: '01/06/2026', type: 'Apport', description: 'Transfert initial', montant: 1000 }
      ]);
    }
    setIsLoaded(true);
  }, []);

  // 2. ÉTAPE SAUVEGARDE : On enregistre à chaque mouvement d'argent
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('ferme_finances', JSON.stringify(transactions));
    }
  }, [transactions, isLoaded]);

  // Calcul automatique du budget disponible
  const budgetDisponible = transactions.reduce((acc, operation) => {
    return operation.type === 'Apport' ? acc + operation.montant : acc - operation.montant;
  }, 0);

  const ajouterOperation = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(montant);
    if (!m || m <= 0) return;

    setTransactions([
      {
        date: new Date().toLocaleDateString('fr-FR'),
        type: typeTransaction,
        description: description,
        montant: m
      },
      ...transactions
    ]);
    
    setDescription('');
    setMontant('');
  };

  if (!isLoaded) {
    return <div className="p-8 text-gray-500 italic">Chargement des données financières...</div>;
  }

  const totalDepenses = transactions.filter(t => t.type === 'Dépense').reduce((s, t) => s + t.montant, 0);
  const totalApports  = transactions.filter(t => t.type === 'Apport').reduce((s, t) => s + t.montant, 0);

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl md:text-3xl font-bold mb-5 text-gray-900">Espace Associés</h1>

      {/* ── Budget ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center col-span-3 sm:col-span-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Solde</p>
          <p className={`text-3xl font-extrabold ${budgetDisponible >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {budgetDisponible.toFixed(0)} €
          </p>
        </div>
        <div className="bg-green-50 rounded-2xl border border-green-100 shadow-sm p-4 text-center">
          <p className="text-[10px] text-green-600 font-semibold uppercase mb-1">Apports</p>
          <p className="text-lg font-bold text-green-700">+{totalApports.toFixed(0)} €</p>
        </div>
        <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm p-4 text-center">
          <p className="text-[10px] text-red-600 font-semibold uppercase mb-1">Dépenses</p>
          <p className="text-lg font-bold text-red-600">−{totalDepenses.toFixed(0)} €</p>
        </div>
      </div>

      {/* ── Formulaire ──────────────────────────────────────────────────── */}
      <form onSubmit={ajouterOperation} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-5">
        <h2 className="font-bold text-gray-800 mb-3 text-sm">Nouvelle opération</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Type</label>
            <select value={typeTransaction} onChange={e => setTypeTransaction(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
              <option value="Dépense">📉 Dépense</option>
              <option value="Apport">📈 Apport</option>
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              placeholder="Ex: Achat aliments" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Montant (€)</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              placeholder="150" required />
          </div>
        </div>
        <button type="submit"
          className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-indigo-700 active:scale-95 transition-all">
          Enregistrer l'opération
        </button>
      </form>

      {/* ── Historique — tableau desktop / cartes mobile ─────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-sm">Historique</h2>
        </div>

        {/* Tableau visible sur grand écran */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.type === 'Apport' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.description}</td>
                  <td className={`px-4 py-3 font-bold text-right ${t.type === 'Apport' ? 'text-green-600' : 'text-red-500'}`}>
                    {t.type === 'Apport' ? '+' : '−'}{t.montant} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cartes visibles sur mobile */}
        <div className="sm:hidden divide-y divide-gray-50">
          {transactions.map((t, i) => (
            <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 truncate">{t.description}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{t.date}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-extrabold text-base ${t.type === 'Apport' ? 'text-green-600' : 'text-red-500'}`}>
                  {t.type === 'Apport' ? '+' : '−'}{t.montant} €
                </p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${t.type === 'Apport' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                  {t.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}