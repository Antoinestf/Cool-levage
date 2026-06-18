"use client";

import { useState, useEffect } from 'react';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface Lapin {
  id: string; tatouage: string; sexe: 'M' | 'F'; statut: string;
  dateNaissance: string; race: string; pere?: string; mere?: string;
}
interface Saillie {
  id: string; tatouageFemelle: string; tatouageMale: string;
  dateSaillie: string; dateMiseBas: string; dateSevrage: string;
  statut: string; nbNes?: number; nbMorts?: number;
}
interface Portee {
  tatouageMere: string; tatouagePere: string; dateNaissance: string;
  dateSevrage: string; nbVivants: number; nbMorts: number; statut: string;
}
interface Stock {
  id: string; ingredient: string; quantite: number; unite: string; seuilAlerte: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d: string) {
  if (!d) return '—';
  const [y, m, j] = d.split('-'); return `${j}/${m}/${y}`;
}

function ageJours(dateNaissance: string): number {
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const nais = new Date(dateNaissance); nais.setHours(0, 0, 0, 0);
  return Math.round((auj.getTime() - nais.getTime()) / 86400000);
}

function ageMois(dateNaissance: string): string {
  const j = ageJours(dateNaissance);
  if (j < 30) return `${j}j`;
  return `${Math.floor(j / 30)} mois`;
}

function exportCsv(filename: string, rows: string[][]) {
  const content = rows
    .map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ExportPage() {
  const [monted, setMonted]   = useState(false);
  const [cheptel, setCheptel] = useState<Lapin[]>([]);
  const [saillies, setSaillies] = useState<Saillie[]>([]);
  const [portees, setPortees] = useState<Portee[]>([]);
  const [stocks, setStocks]   = useState<Stock[]>([]);

  useEffect(() => {
    setCheptel(JSON.parse(localStorage.getItem('ferme_cheptel') || '[]'));
    setSaillies(JSON.parse(localStorage.getItem('ferme_reproduction') || '[]'));
    setPortees(JSON.parse(localStorage.getItem('ferme_naissances') || '[]'));
    setStocks(JSON.parse(localStorage.getItem('ferme_stocks_v2') || '[]'));
    setMonted(true);
  }, []);

  if (!monted) return <div className="p-6 text-gray-400">Chargement…</div>;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const males          = cheptel.filter(l => l.sexe === 'M');
  const femelles       = cheptel.filter(l => l.sexe === 'F');
  const reproducteurs  = cheptel.filter(l => l.statut === 'Reproducteur');
  const gestantes      = saillies.filter(s => s.statut === 'Gestante');
  const porteesActives = portees.filter(p => p.statut === 'Allaitement');
  const stocksCritiques = stocks.filter(s => s.seuilAlerte > 0 && s.quantite <= s.seuilAlerte);

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  // ── CSV ────────────────────────────────────────────────────────────────────
  const exporterCheptel = () => {
    exportCsv(`cheptel_${new Date().toISOString().split('T')[0]}.csv`, [
      ['Tatouage', 'Sexe', 'Race', 'Statut', 'Date naissance', 'Âge', 'Père', 'Mère'],
      ...cheptel.map(l => [
        l.tatouage,
        l.sexe === 'M' ? 'Mâle' : 'Femelle',
        l.race || '',
        l.statut || '',
        fmt(l.dateNaissance),
        l.dateNaissance ? ageMois(l.dateNaissance) : '',
        l.pere || '',
        l.mere || '',
      ]),
    ]);
  };

  const exporterReproduction = () => {
    exportCsv(`reproduction_${new Date().toISOString().split('T')[0]}.csv`, [
      ['Femelle', 'Mâle', 'Date saillie', 'Date mise-bas', 'Date sevrage', 'Statut', 'Nés total', 'Mort-nés', 'Vivants'],
      ...saillies.map(s => [
        s.tatouageFemelle,
        s.tatouageMale,
        fmt(s.dateSaillie),
        fmt(s.dateMiseBas),
        fmt(s.dateSevrage),
        s.statut,
        String(s.nbNes ?? ''),
        String(s.nbMorts ?? ''),
        String((s.nbNes ?? 0) - (s.nbMorts ?? 0)),
      ]),
    ]);
  };

  return (
    <>
      {/* ── Print CSS — masque nav/sidebar, ne garde que le rapport ─────── */}
      <style>{`
        @media print {
          aside, nav, .no-print { display: none !important; }
          main { padding: 0 !important; overflow: visible !important; height: auto !important; }
          body { background: white !important; }
          #rapport-print { padding: 24px !important; box-shadow: none !important; border: none !important; border-radius: 0 !important; }
          .print-table th, .print-table td { padding: 4px 8px !important; font-size: 11px !important; }
        }
      `}</style>

      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto space-y-4">

          {/* ── En-tête ── */}
          <div className="no-print">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">📤 Export & Rapports</h1>
            <p className="text-xs text-gray-400 mt-1">Toutes les données restent sur votre appareil · 100% hors-ligne</p>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 1 — RAPPORT IMPRIMABLE                                           */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Bouton imprimer — masqué à l'impression */}
            <div className="no-print px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-indigo-900 text-sm">📄 Rapport d'élevage complet</p>
                <p className="text-xs text-indigo-500 mt-0.5">Cheptel · Reproduction · Stocks — prêt à imprimer ou sauvegarder en PDF</p>
              </div>
              <button
                onClick={() => window.print()}
                className="bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-indigo-700 active:opacity-75 transition-colors shrink-0 shadow-sm">
                🖨️ PDF / Imprimer
              </button>
            </div>

            {/* ── Contenu du rapport ── */}
            <div id="rapport-print" className="p-4 md:p-6 space-y-6">

              {/* En-tête rapport */}
              <div className="border-b-2 border-gray-900 pb-3">
                <h2 className="text-xl font-extrabold text-gray-900 uppercase tracking-wide">Coolélevage</h2>
                <p className="text-sm font-semibold text-gray-700">Rapport de gestion d'élevage cunicole</p>
                <p className="text-xs text-gray-400 mt-1">Généré le {today}</p>
              </div>

              {/* ── Cheptel ── */}
              <div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">🐇 Cheptel</h3>

                {/* Résumé chiffré */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { label: 'Total', val: cheptel.length },
                    { label: 'Mâles ♂', val: males.length },
                    { label: 'Femelles ♀', val: femelles.length },
                    { label: 'Reprod.', val: reproducteurs.length },
                  ].map(({ label, val }) => (
                    <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                      <p className="text-2xl font-black text-gray-900 leading-none">{val}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Tableau cheptel */}
                {cheptel.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="print-table w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {['Tatouage', 'Sexe', 'Race', 'Statut', 'Âge'].map(h => (
                            <th key={h} className="text-left px-2 py-2 font-bold text-gray-700 border border-gray-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cheptel.map((l, i) => (
                          <tr key={l.id} className={i % 2 === 0 ? '' : 'bg-gray-50/60'}>
                            <td className="px-2 py-1.5 font-extrabold border border-gray-200">{l.tatouage}</td>
                            <td className="px-2 py-1.5 border border-gray-200">{l.sexe === 'M' ? '♂ Mâle' : '♀ Femelle'}</td>
                            <td className="px-2 py-1.5 border border-gray-200">{l.race || '—'}</td>
                            <td className="px-2 py-1.5 border border-gray-200">{l.statut || '—'}</td>
                            <td className="px-2 py-1.5 border border-gray-200">{l.dateNaissance ? ageMois(l.dateNaissance) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {cheptel.length === 0 && <p className="text-xs text-gray-400 italic">Aucun animal enregistré.</p>}
              </div>

              {/* ── Reproduction ── */}
              <div>
                <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">🍼 Reproduction</h3>
                {gestantes.length === 0 && porteesActives.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Aucune activité reproductive en cours.</p>
                ) : (
                  <div className="space-y-2">
                    {gestantes.length > 0 && (
                      <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                        <p className="text-[11px] font-bold text-green-800 mb-2">🤰 Femelles gestantes ({gestantes.length})</p>
                        <table className="print-table w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-green-100/60">
                              <th className="text-left px-2 py-1 font-bold text-green-900 border border-green-200">Femelle</th>
                              <th className="text-left px-2 py-1 font-bold text-green-900 border border-green-200">Mâle</th>
                              <th className="text-left px-2 py-1 font-bold text-green-900 border border-green-200">Mise-bas prévue</th>
                              <th className="text-left px-2 py-1 font-bold text-green-900 border border-green-200">Sevrage prévu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {gestantes.map(s => (
                              <tr key={s.id}>
                                <td className="px-2 py-1 font-bold border border-green-200">♀ {s.tatouageFemelle}</td>
                                <td className="px-2 py-1 border border-green-200">♂ {s.tatouageMale}</td>
                                <td className="px-2 py-1 border border-green-200">{fmt(s.dateMiseBas)}</td>
                                <td className="px-2 py-1 border border-green-200">{fmt(s.dateSevrage)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {porteesActives.length > 0 && (
                      <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                        <p className="text-[11px] font-bold text-blue-800 mb-2">🐣 Portées en allaitement ({porteesActives.length})</p>
                        <table className="print-table w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-blue-100/60">
                              <th className="text-left px-2 py-1 font-bold text-blue-900 border border-blue-200">Mère</th>
                              <th className="text-left px-2 py-1 font-bold text-blue-900 border border-blue-200">Nés</th>
                              <th className="text-left px-2 py-1 font-bold text-blue-900 border border-blue-200">Vivants</th>
                              <th className="text-left px-2 py-1 font-bold text-blue-900 border border-blue-200">Date naissance</th>
                              <th className="text-left px-2 py-1 font-bold text-blue-900 border border-blue-200">Âge</th>
                            </tr>
                          </thead>
                          <tbody>
                            {porteesActives.map((p, i) => (
                              <tr key={i}>
                                <td className="px-2 py-1 font-bold border border-blue-200">♀ {p.tatouageMere}</td>
                                <td className="px-2 py-1 border border-blue-200">{p.nbVivants + p.nbMorts}</td>
                                <td className="px-2 py-1 font-bold text-green-700 border border-blue-200">{p.nbVivants}</td>
                                <td className="px-2 py-1 border border-blue-200">{fmt(p.dateNaissance)}</td>
                                <td className="px-2 py-1 border border-blue-200">{ageJours(p.dateNaissance)}j</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Stocks ── */}
              {stocks.length > 0 && (
                <div>
                  <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">🌾 Stocks provende</h3>
                  {stocksCritiques.length > 0 && (
                    <p className="text-xs font-bold text-red-600 mb-2">⚠️ {stocksCritiques.length} stock{stocksCritiques.length > 1 ? 's' : ''} sous le seuil d'alerte</p>
                  )}
                  <table className="print-table w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        {['Ingrédient', 'Quantité', 'Seuil alerte', 'État'].map(h => (
                          <th key={h} className="text-left px-2 py-2 font-bold text-gray-700 border border-gray-200">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {stocks.map((s, i) => {
                        const critique = s.seuilAlerte > 0 && s.quantite <= s.seuilAlerte;
                        return (
                          <tr key={s.id} className={i % 2 === 0 ? '' : 'bg-gray-50/60'}>
                            <td className="px-2 py-1.5 font-medium border border-gray-200">{s.ingredient}</td>
                            <td className="px-2 py-1.5 border border-gray-200">{s.quantite} {s.unite}</td>
                            <td className="px-2 py-1.5 border border-gray-200">{s.seuilAlerte > 0 ? `${s.seuilAlerte} ${s.unite}` : '—'}</td>
                            <td className={`px-2 py-1.5 font-bold border border-gray-200 ${critique ? 'text-red-600' : 'text-green-700'}`}>
                              {critique ? '⚠️ Critique' : '✅ OK'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pied de page */}
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-[10px] text-gray-400">
                <span>Coolélevage · Rapport du {today}</span>
                <span>Données 100% locales · Aucun serveur</span>
              </div>

            </div>
          </div>

          {/* ════════════════════════════════════════════════════════════════ */}
          {/* 2 — EXPORTS CSV                                                  */}
          {/* ════════════════════════════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden no-print">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
              <p className="font-bold text-gray-800 text-sm">📊 Exports CSV</p>
              <p className="text-xs text-gray-400 mt-0.5">Compatible Excel · Google Sheets · LibreOffice</p>
            </div>
            <div className="p-4 space-y-3">

              {/* Cheptel */}
              <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">🐇 Cheptel complet</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cheptel.length > 0 ? `${cheptel.length} animal${cheptel.length > 1 ? 'x' : ''} — tatouage, sexe, race, statut, âge` : 'Aucun animal enregistré'}
                  </p>
                </div>
                <button
                  onClick={exporterCheptel}
                  disabled={cheptel.length === 0}
                  className="shrink-0 bg-zinc-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-700 active:opacity-75 transition-colors disabled:opacity-40">
                  ⬇️ CSV
                </button>
              </div>

              {/* Reproduction */}
              <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-800">🍼 Historique reproduction</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {saillies.length > 0 ? `${saillies.length} saillie${saillies.length > 1 ? 's' : ''} — dates, statuts, résultats` : 'Aucune saillie enregistrée'}
                  </p>
                </div>
                <button
                  onClick={exporterReproduction}
                  disabled={saillies.length === 0}
                  className="shrink-0 bg-zinc-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-zinc-700 active:opacity-75 transition-colors disabled:opacity-40">
                  ⬇️ CSV
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </>
  );
}
