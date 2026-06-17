"use client";

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Lapin {
  id: string;
  tatouage: string;
  sexe: 'M' | 'F';
  race: string;
  dateNaissance: string;
}

interface Pesee {
  id: string;
  lapinId: string;
  date: string;     // YYYY-MM-DD
  poids: number;    // grammes
}

interface Saillie {
  id: string;
  idFemelle: string;
  tatouageFemelle: string;
  statut: string;
  dateSaillie: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function diffJours(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function fmt(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function gmq(pesees: Pesee[]): number | null {
  if (pesees.length < 2) return null;
  const triees = [...pesees].sort((a, b) => a.date.localeCompare(b.date));
  const debut = triees[0];
  const fin = triees[triees.length - 1];
  const jours = diffJours(debut.date) - diffJours(fin.date);
  if (jours <= 0) return null;
  return Math.round((fin.poids - debut.poids) / jours);
}

function ageJours(dateNaissance: string): number {
  return diffJours(dateNaissance);
}

// Couleur du badge GMQ selon la valeur
function couleurGmq(v: number): string {
  if (v >= 35) return 'bg-green-100 text-green-800 border-green-200';
  if (v >= 20) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  return 'bg-red-100 text-red-800 border-red-200';
}

// ── Composant mini-graphe en barres CSS ────────────────────────────────────────
function MiniGraphe({ pesees }: { pesees: Pesee[] }) {
  const triees = [...pesees].sort((a, b) => a.date.localeCompare(b.date)).slice(-8);
  if (triees.length < 2) return null;
  const max = Math.max(...triees.map(p => p.poids));
  const min = Math.min(...triees.map(p => p.poids));
  const range = max - min || 1;

  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wide">Courbe de poids</p>
      <div className="flex items-end gap-1 h-14 bg-gray-50 rounded-xl px-2 py-1.5">
        {triees.map((p, i) => {
          const hPct = 20 + ((p.poids - min) / range) * 75;
          return (
            <div key={i} className="flex flex-col items-center flex-1 h-full justify-end gap-0.5">
              <span className="text-[8px] text-gray-400 leading-none">{Math.round(p.poids / 100) / 10}kg</span>
              <div
                className="w-full rounded-t bg-indigo-400 transition-all"
                style={{ height: `${hPct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-0.5 px-1">
        <span className="text-[9px] text-gray-400">{fmt(triees[0].date)}</span>
        <span className="text-[9px] text-gray-400">{fmt(triees[triees.length - 1].date)}</span>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────
function PerformancesInner() {
  const searchParams = useSearchParams();
  const lapinIdParam = searchParams.get('lapin');
  const [isLoaded, setIsLoaded]     = useState(false);
  const [cheptel, setCheptel]       = useState<Lapin[]>([]);
  const [pesees, setPesees]         = useState<Pesee[]>([]);
  const [saillies, setSaillies]     = useState<Saillie[]>([]);

  // Formulaire pesée
  const [lapinSelId, setLapinSelId] = useState(lapinIdParam || '');
  const [poids, setPoids]           = useState('');
  const [datePesee, setDatePesee]   = useState(new Date().toISOString().split('T')[0]);
  const [confirm, setConfirm]       = useState(false);

  // Onglet actif — si on arrive avec ?lapin=, on ouvre directement l'onglet peser
  const [onglet, setOnglet]         = useState<'peser' | 'suivi' | 'prolificite'>(lapinIdParam ? 'peser' : 'peser');

  // Détail lapin ouvert
  const [lapinOuvert, setLapinOuvert] = useState<string | null>(null);

  useEffect(() => {
    const c = localStorage.getItem('ferme_cheptel');
    const p = localStorage.getItem('ferme_pesees');
    const s = localStorage.getItem('ferme_reproduction');
    if (c) setCheptel(JSON.parse(c));
    if (p) setPesees(JSON.parse(p));
    if (s) setSaillies(JSON.parse(s));
    setIsLoaded(true);
  }, []);

  const sauvegarderPesees = (nouvelles: Pesee[]) => {
    localStorage.setItem('ferme_pesees', JSON.stringify(nouvelles));
    setPesees(nouvelles);
  };

  // ── Ajouter une pesée ──────────────────────────────────────────────────────
  const ajouterPesee = () => {
    const poidsNum = parseInt(poids);
    if (!lapinSelId || !poidsNum || poidsNum < 100 || poidsNum > 8000) return;

    const nouvelle: Pesee = {
      id: crypto.randomUUID(),
      lapinId: lapinSelId,
      date: datePesee,
      poids: poidsNum,
    };
    sauvegarderPesees([...pesees, nouvelle]);
    setPoids('');
    setConfirm(true);
    setTimeout(() => setConfirm(false), 2000);
  };

  const supprimerPesee = (id: string) => {
    sauvegarderPesees(pesees.filter(p => p.id !== id));
  };

  // ── Calculs par lapin ──────────────────────────────────────────────────────
  const peseesParLapin = useMemo(() => {
    const map = new Map<string, Pesee[]>();
    for (const p of pesees) {
      const arr = map.get(p.lapinId) || [];
      arr.push(p);
      map.set(p.lapinId, arr);
    }
    return map;
  }, [pesees]);

  // ── Prolificité femelles ───────────────────────────────────────────────────
  const femelles = cheptel.filter(l => l.sexe === 'F');
  const prolificite = femelles.map(f => {
    const ses = saillies.filter(s => s.idFemelle === f.id);
    const avecNaissance = ses.filter(s => s.statut === 'Mise-bas terminée');
    return {
      lapin: f,
      total: ses.length,
      reussies: avecNaissance.length,
      taux: ses.length > 0 ? Math.round((avecNaissance.length / ses.length) * 100) : null,
    };
  });

  const lapinSel = cheptel.find(l => l.id === lapinSelId);
  const peseesLapinSel = lapinSel ? (peseesParLapin.get(lapinSel.id) || []).sort((a,b) => a.date.localeCompare(b.date)) : [];
  const dernierePeseeSel = peseesLapinSel[peseesLapinSel.length - 1];
  const gmqSel = gmq(peseesLapinSel);

  if (!isLoaded) return <div className="p-6 text-gray-500">Chargement…</div>;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* ── En-tête ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">📈 Performances</h1>
          <p className="text-xs text-gray-400 mt-0.5">{pesees.length} pesée{pesees.length > 1 ? 's' : ''} · {cheptel.length} animaux</p>
        </div>
        <Link href="/cheptel"
          className="text-xs px-3 py-2 bg-zinc-800 text-white font-bold rounded-xl">
          ← Cheptel
        </Link>
      </div>

      {/* ── Onglets ───────────────────────────────────────────────────────────── */}
      <div className="flex bg-white rounded-2xl border border-gray-200 p-1 mb-5 gap-1">
        {([
          { key: 'peser',       label: '⚖️ Peser',        desc: 'Enregistrer' },
          { key: 'suivi',       label: '📊 Suivi GMQ',    desc: 'Performances' },
          { key: 'prolificite', label: '🐣 Prolificité',  desc: 'Femelles' },
        ] as const).map(({ key, label }) => (
          <button key={key}
            onClick={() => setOnglet(key)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${onglet === key ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET 1 — PESER                                                      */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {onglet === 'peser' && (
        <div className="space-y-4">

          {/* Étape 1 — Choisir le lapin */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Étape 1 — Quel lapin ?
            </p>

            {cheptel.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <p className="text-3xl mb-2">🐇</p>
                <p className="text-sm">Aucun animal dans le cheptel.</p>
                <Link href="/cheptel" className="text-indigo-600 font-bold text-sm">→ Ajouter des lapins</Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {cheptel.map(l => {
                  const estMale = l.sexe === 'M';
                  const selectionne = lapinSelId === l.id;
                  const derPesee = (peseesParLapin.get(l.id) || []).sort((a,b) => b.date.localeCompare(a.date))[0];
                  return (
                    <button key={l.id}
                      onClick={() => setLapinSelId(selectionne ? '' : l.id)}
                      className={`rounded-xl border-2 p-3 text-left transition-all active:scale-95 ${
                        selectionne
                          ? 'border-indigo-500 bg-indigo-50'
                          : estMale
                            ? 'border-blue-100 bg-blue-50 hover:border-blue-300'
                            : 'border-purple-100 bg-purple-50 hover:border-purple-300'
                      }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-gray-900 text-sm uppercase">{l.tatouage}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${estMale ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'}`}>
                          {estMale ? '♂' : '♀'}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{l.race || 'Race inconnue'}</p>
                      {derPesee && (
                        <p className="text-[10px] font-semibold text-indigo-600 mt-1">
                          Dernière : {(derPesee.poids / 1000).toFixed(2)} kg
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Étape 2 — Saisir le poids (s'affiche une fois un lapin sélectionné) */}
          {lapinSel && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Étape 2 — Poids de <span className="text-indigo-700">{lapinSel.tatouage}</span>
              </p>

              {/* Contexte : dernière pesée + GMQ */}
              {dernierePeseeSel && (
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-[10px] text-gray-500">Dernière pesée</p>
                    <p className="font-bold text-gray-800 text-sm">{(dernierePeseeSel.poids / 1000).toFixed(2)} kg</p>
                    <p className="text-[9px] text-gray-400">{fmt(dernierePeseeSel.date)}</p>
                  </div>
                  {gmqSel !== null && (
                    <div className={`flex-1 rounded-xl p-2 text-center border ${couleurGmq(gmqSel)}`}>
                      <p className="text-[10px]">GMQ actuel</p>
                      <p className="font-bold text-sm">{gmqSel} g/j</p>
                      <p className="text-[9px]">{gmqSel >= 35 ? 'Excellent ✅' : gmqSel >= 20 ? 'Correct ⚠️' : 'Faible ❌'}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Saisie */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Poids (grammes) *</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={100} max={8000} step={10}
                    value={poids}
                    onChange={e => setPoids(e.target.value)}
                    placeholder="Ex : 2450"
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-lg font-bold text-center focus:outline-none focus:border-indigo-400 bg-white"
                  />
                  <p className="text-[10px] text-gray-400 text-center mt-1">
                    {poids ? `= ${(parseInt(poids || '0') / 1000).toFixed(2)} kg` : 'Entrez en grammes'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={datePesee}
                    onChange={e => setDatePesee(e.target.value)}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-sm font-bold focus:outline-none focus:border-indigo-400 bg-white"
                  />
                </div>
              </div>

              <button
                onClick={ajouterPesee}
                disabled={!poids || parseInt(poids) < 100}
                className={`w-full py-3.5 rounded-xl font-bold text-base transition-all active:scale-95 ${
                  confirm
                    ? 'bg-green-500 text-white'
                    : !poids || parseInt(poids) < 100
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                }`}>
                {confirm ? '✅ Pesée enregistrée !' : '⚖️ Enregistrer la pesée'}
              </button>

              {/* Mini-historique du lapin sélectionné */}
              {peseesLapinSel.length > 0 && (
                <div className="mt-4">
                  <MiniGraphe pesees={peseesLapinSel} />
                  <div className="mt-3 space-y-1 max-h-40 overflow-y-auto">
                    {[...peseesLapinSel].reverse().map(p => (
                      <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                        <span className="text-gray-500">{fmt(p.date)}</span>
                        <span className="font-bold text-gray-800">{(p.poids / 1000).toFixed(2)} kg</span>
                        <button onClick={() => supprimerPesee(p.id)}
                          className="text-red-400 hover:text-red-600 text-[11px] font-bold ml-2">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* État vide si aucune pesée du tout */}
          {!lapinSel && pesees.length === 0 && cheptel.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
              <p className="text-4xl mb-3">⚖️</p>
              <p className="font-medium text-gray-700">Aucune pesée enregistrée</p>
              <p className="text-sm mt-1">Sélectionnez un lapin ci-dessus pour commencer</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET 2 — SUIVI GMQ                                                  */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {onglet === 'suivi' && (
        <div className="space-y-3">
          {cheptel.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">🐇</p>
              <p>Aucun animal dans le cheptel</p>
            </div>
          ) : (
            <>
              {/* Légende GMQ */}
              <div className="flex gap-2 text-[10px] font-bold mb-1">
                <span className="bg-green-100 text-green-800 border border-green-200 rounded-full px-2 py-0.5">≥35g/j Excellent</span>
                <span className="bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-full px-2 py-0.5">20–34g/j Correct</span>
                <span className="bg-red-100 text-red-800 border border-red-200 rounded-full px-2 py-0.5">{'<'}20g/j Faible</span>
              </div>

              {cheptel.map(l => {
                const ps = (peseesParLapin.get(l.id) || []).sort((a, b) => a.date.localeCompare(b.date));
                const g = gmq(ps);
                const dernier = ps[ps.length - 1];
                const estMale = l.sexe === 'M';
                const ouvert = lapinOuvert === l.id;
                const agej = l.dateNaissance ? ageJours(l.dateNaissance) : null;

                return (
                  <div key={l.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${estMale ? 'border-blue-100' : 'border-purple-100'}`}>
                    <button
                      className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
                      onClick={() => setLapinOuvert(ouvert ? null : l.id)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-lg">{estMale ? '🐇' : '🐰'}</span>
                        <div className="min-w-0">
                          <p className="font-extrabold text-gray-900 uppercase">{l.tatouage}</p>
                          <p className="text-[10px] text-gray-400">
                            {l.race || 'Race inconnue'}
                            {agej !== null ? ` · ${Math.round(agej / 30)} mois` : ''}
                            {dernier ? ` · Dernière : ${(dernier.poids / 1000).toFixed(2)} kg` : ' · Aucune pesée'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {g !== null ? (
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${couleurGmq(g)}`}>
                            {g} g/j
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 font-medium italic">—</span>
                        )}
                        <span className="text-gray-400 text-xs">{ouvert ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {ouvert && (
                      <div className="px-4 pb-4 border-t border-gray-50">
                        {ps.length < 2 ? (
                          <p className="text-sm text-gray-400 italic pt-3">
                            Enregistrez au moins 2 pesées pour voir la courbe.
                          </p>
                        ) : (
                          <>
                            <MiniGraphe pesees={ps} />
                            {/* Détail pesées */}
                            <div className="mt-3 space-y-1">
                              {[...ps].reverse().slice(0, 6).map((p, i, arr) => {
                                const prev = arr[i + 1];
                                const diff = prev ? p.poids - prev.poids : null;
                                return (
                                  <div key={p.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-1.5">
                                    <span className="text-gray-500">{fmt(p.date)}</span>
                                    <span className="font-bold text-gray-800">{(p.poids / 1000).toFixed(2)} kg</span>
                                    {diff !== null && (
                                      <span className={`font-bold text-xs ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {diff > 0 ? '+' : ''}{diff}g
                                      </span>
                                    )}
                                    <button onClick={() => supprimerPesee(p.id)}
                                      className="text-red-400 text-[11px] font-bold">✕</button>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        <button
                          onClick={() => { setOnglet('peser'); setLapinSelId(l.id); }}
                          className="mt-3 w-full py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs rounded-xl active:scale-95">
                          ⚖️ Ajouter une pesée pour {l.tatouage}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ONGLET 3 — PROLIFICITÉ                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {onglet === 'prolificite' && (
        <div className="space-y-3">
          {femelles.length === 0 ? (
            <div className="bg-white rounded-2xl border p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">🐰</p>
              <p>Aucune femelle dans le cheptel</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 bg-white rounded-xl border border-gray-100 px-3 py-2">
                Taux basé sur les saillies marquées <strong>« Mise-bas terminée »</strong> dans l'onglet Reproduction.
              </p>
              {prolificite.map(({ lapin, total, reussies, taux }) => (
                <div key={lapin.id} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🐰</span>
                      <div>
                        <p className="font-extrabold text-gray-900 uppercase">{lapin.tatouage}</p>
                        <p className="text-[10px] text-gray-400">{lapin.race || 'Race inconnue'}</p>
                      </div>
                    </div>
                    {taux !== null ? (
                      <span className={`text-sm font-bold px-3 py-1 rounded-full border ${
                        taux >= 70 ? 'bg-green-100 text-green-800 border-green-200' :
                        taux >= 40 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-red-100 text-red-800 border-red-200'
                      }`}>
                        {taux}%
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Pas de données</span>
                    )}
                  </div>

                  <div className="flex gap-3 text-center">
                    <div className="flex-1 bg-gray-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-400">Saillies</p>
                      <p className="font-bold text-gray-800 text-base">{total}</p>
                    </div>
                    <div className="flex-1 bg-green-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-400">Mise-bas</p>
                      <p className="font-bold text-green-700 text-base">{reussies}</p>
                    </div>
                    <div className="flex-1 bg-red-50 rounded-xl p-2">
                      <p className="text-[10px] text-gray-400">Échecs</p>
                      <p className="font-bold text-red-600 text-base">{total - reussies}</p>
                    </div>
                  </div>

                  {/* Barre de prolificité */}
                  {taux !== null && (
                    <div className="mt-3">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${taux >= 70 ? 'bg-green-500' : taux >= 40 ? 'bg-yellow-400' : 'bg-red-500'}`}
                          style={{ width: `${taux}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1 text-right">
                        {taux >= 70 ? 'Excellente reproductrice ✅' : taux >= 40 ? 'Reproductrice correcte ⚠️' : 'Faible reproductrice ❌'}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PerformancesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-500">Chargement…</div>}>
      <PerformancesInner />
    </Suspense>
  );
}
