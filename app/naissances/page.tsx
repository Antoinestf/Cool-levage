"use client";

import { useState, useEffect } from 'react';

interface Lapin {
  id: string;
  tatouage: string;
  sexe: 'M' | 'F';
}

interface Saillie {
  id: string;
  idFemelle: string;
  idMale: string;
  tatouageFemelle: string;
  tatouageMale: string;
  dateSaillie: string;
  datePalpation: string;
  dateMiseBas: string;
  dateSevrage: string;
  statut: 'En attente' | 'Gestante' | 'Vide' | 'Mise-bas terminée';
  notes: string;
  nbNes?: number;
  nbMorts?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function ajouterJours(dateStr: string, jours: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  d.setDate(d.getDate() + jours);
  return d.toISOString().split('T')[0];
}

function fmt(dateStr: string): string {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function diffJours(dateStr: string): number {
  const auj = new Date(); auj.setHours(0,0,0,0);
  const cib = new Date(dateStr); cib.setHours(0,0,0,0);
  return Math.round((cib.getTime() - auj.getTime()) / 86400000);
}

const STATUT_STYLE: Record<Saillie['statut'], { bg: string; badge: string; icone: string; border: string }> = {
  'En attente':        { bg: 'bg-amber-50',  badge: 'bg-amber-100 text-amber-800',  icone: '⏳', border: 'border-amber-200' },
  'Gestante':          { bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800',  icone: '🤰', border: 'border-green-200' },
  'Vide':              { bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800',      icone: '❌', border: 'border-red-200'   },
  'Mise-bas terminée': { bg: 'bg-blue-50',   badge: 'bg-blue-100 text-blue-800',    icone: '🍼', border: 'border-blue-200'  },
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function NaissancesPage() {
  const [isLoaded, setIsLoaded]   = useState(false);
  const [cheptel, setCheptel]     = useState<Lapin[]>([]);
  const [saillies, setSaillies]   = useState<Saillie[]>([]);
  const [formOpen, setFormOpen]   = useState(false);

  // Saisie de la nouvelle saillie
  const [form, setForm] = useState({ idFemelle: '', idMale: '', dateSaillie: '' });

  // ID de la saillie pour laquelle le formulaire lapereaux est ouvert
  const [saillieEnCours, setSaillieEnCours] = useState<string | null>(null);
  // Valeurs temporaires du formulaire lapereaux (avant confirmation)
  const [nbNesTemp, setNbNesTemp]   = useState('');
  const [nbMortsTemp, setNbMortsTemp] = useState('0');

  useEffect(() => {
    const c = localStorage.getItem('ferme_cheptel');
    const s = localStorage.getItem('ferme_reproduction');
    if (c) setCheptel(JSON.parse(c));
    if (s) setSaillies(JSON.parse(s));
    setIsLoaded(true);
  }, []);

  const sauvegarder = (data: Saillie[]) => {
    localStorage.setItem('ferme_reproduction', JSON.stringify(data));
    setSaillies(data);
  };

  const enregistrerSaillie = (e: React.FormEvent) => {
    e.preventDefault();
    const femelle = femelles.find(f => f.id === form.idFemelle);
    const male    = males.find(m => m.id === form.idMale);
    if (!femelle || !form.dateSaillie) return;

    const nouvelle: Saillie = {
      id: Date.now().toString(),
      idFemelle: femelle.id,
      idMale: male?.id ?? '',
      tatouageFemelle: femelle.tatouage,
      tatouageMale: male?.tatouage ?? 'Inconnu',
      dateSaillie: form.dateSaillie,
      datePalpation: ajouterJours(form.dateSaillie, 14),
      dateMiseBas:   ajouterJours(form.dateSaillie, 31),
      dateSevrage:   ajouterJours(form.dateSaillie, 66),
      statut: 'En attente',
      notes: '',
    };
    sauvegarder([nouvelle, ...saillies]);
    setForm({ idFemelle: '', idMale: '', dateSaillie: '' });
    setFormOpen(false);
  };

  const changerStatut = (id: string, statut: Saillie['statut']) => {
    sauvegarder(saillies.map(s => s.id === id ? { ...s, statut } : s));
    // Si on passe à "Mise-bas terminée", ouvrir le formulaire lapereaux
    if (statut === 'Mise-bas terminée') {
      setSaillieEnCours(id);
      setNbNesTemp('');
      setNbMortsTemp('0');
    } else {
      // Si on revient en arrière, fermer le formulaire lapereaux si ouvert pour cette saillie
      if (saillieEnCours === id) setSaillieEnCours(null);
    }
  };

  const confirmerLapereaux = (id: string) => {
    const nes   = parseInt(nbNesTemp) || 0;
    const morts = parseInt(nbMortsTemp) || 0;
    sauvegarder(saillies.map(s => s.id === id ? { ...s, nbNes: nes, nbMorts: morts } : s));
    setSaillieEnCours(null);
  };

  const annulerLapereaux = (id: string) => {
    // Annuler = remettre le statut à "Gestante" (c'était une faute de frappe)
    sauvegarder(saillies.map(s => s.id === id ? { ...s, statut: 'Gestante' } : s));
    setSaillieEnCours(null);
  };

  const supprimerSaillie = (id: string) => {
    if (confirm('Supprimer cette fiche de reproduction ?')) {
      sauvegarder(saillies.filter(s => s.id !== id));
      if (saillieEnCours === id) setSaillieEnCours(null);
    }
  };

  if (!isLoaded) return <div className="p-6 text-gray-400">Chargement…</div>;

  const femelles = cheptel.filter(l => l.sexe === 'F');
  const males    = cheptel.filter(l => l.sexe === 'M');

  const nbGestantes  = saillies.filter(s => s.statut === 'Gestante').length;
  const nbEnAttente  = saillies.filter(s => s.statut === 'En attente').length;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">🍼 Reproduction</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {saillies.length} saillie{saillies.length > 1 ? 's' : ''}
            {nbGestantes > 0 && ` · ${nbGestantes} gestante${nbGestantes > 1 ? 's' : ''}`}
            {nbEnAttente > 0 && ` · ${nbEnAttente} palpation${nbEnAttente > 1 ? 's' : ''} à faire`}
          </p>
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow hover:bg-indigo-700 active:scale-95 transition-all shrink-0">
          {formOpen ? '✕ Fermer' : '＋ Saillie'}
        </button>
      </div>

      {/* ── Formulaire nouvelle saillie ──────────────────────────────────────── */}
      {formOpen && (
        <form onSubmit={enregistrerSaillie} className="mb-5 p-4 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <h2 className="text-sm font-bold text-gray-700 mb-4">Nouvelle saillie</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">♀ Femelle (Mère)</label>
              <select value={form.idFemelle}
                onChange={e => setForm(p => ({ ...p, idFemelle: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required>
                <option value="">-- Sélectionner --</option>
                {femelles.map(f => <option key={f.id} value={f.id}>{f.tatouage}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">♂ Mâle (Père) <span className="text-gray-400 font-normal">— facultatif</span></label>
              <select value={form.idMale}
                onChange={e => setForm(p => ({ ...p, idMale: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">-- Non renseigné --</option>
                {males.map(m => <option key={m.id} value={m.id}>{m.tatouage}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">📅 Date de l'accouplement</label>
              <input type="date" value={form.dateSaillie}
                onChange={e => setForm(p => ({ ...p, dateSaillie: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                required />
            </div>
          </div>
          <button type="submit"
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-sm">
            ✅ Calculer les dates & Enregistrer
          </button>
        </form>
      )}

      {/* ── Liste des saillies ───────────────────────────────────────────────── */}
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Calendrier des portées</p>

      {saillies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
          <p className="text-4xl mb-2">🐰</p>
          <p className="font-medium text-gray-600">Aucune saillie enregistrée</p>
          <p className="text-xs mt-1">Appuyez sur « ＋ Saillie » pour commencer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {saillies.map(saillie => {
            const st = STATUT_STYLE[saillie.statut];
            const formulaireOuvert = saillieEnCours === saillie.id;

            return (
              <div key={saillie.id} className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${st.border}`}>

                {/* En-tête de la carte */}
                <div className={`px-4 py-3 ${st.bg}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-extrabold text-gray-900">
                        ♀ {saillie.tatouageFemelle} <span className="text-gray-400 font-normal">×</span> ♂ {saillie.tatouageMale}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">Saillie : {fmt(saillie.dateSaillie)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${st.badge}`}>
                      {st.icone} {saillie.statut}
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="px-4 py-3 space-y-2">
                  {[
                    { label: 'Palpation',  date: saillie.datePalpation, color: 'text-amber-600', diff: diffJours(saillie.datePalpation) },
                    { label: 'Mise-bas',   date: saillie.dateMiseBas,   color: 'text-red-600',   diff: diffJours(saillie.dateMiseBas)   },
                    { label: 'Sevrage',    date: saillie.dateSevrage,    color: 'text-blue-600',  diff: diffJours(saillie.dateSevrage)   },
                  ].map(({ label, date, color, diff }) => (
                    <div key={label} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <div className="flex items-center gap-2">
                        {diff >= -3 && diff <= 3 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${diff <= 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {diff === 0 ? 'Auj.' : diff < 0 ? `−${Math.abs(diff)}j` : `+${diff}j`}
                          </span>
                        )}
                        <span className={`text-xs font-bold ${color}`}>{fmt(date)}</span>
                      </div>
                    </div>
                  ))}

                  {/* Résultat lapereaux si déjà saisi */}
                  {saillie.statut === 'Mise-bas terminée' && saillie.nbNes !== undefined && (
                    <div className="mt-1 pt-2 border-t border-gray-100 flex gap-3">
                      <div className="flex-1 bg-green-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-400">Nés vivants</p>
                        <p className="font-black text-green-700 text-lg leading-none">{saillie.nbNes - (saillie.nbMorts || 0)}</p>
                      </div>
                      {(saillie.nbMorts ?? 0) > 0 && (
                        <div className="flex-1 bg-red-50 rounded-xl p-2 text-center">
                          <p className="text-[10px] text-gray-400">Mort-nés</p>
                          <p className="font-black text-red-600 text-lg leading-none">{saillie.nbMorts}</p>
                        </div>
                      )}
                      <button
                        onClick={() => { setSaillieEnCours(saillie.id); setNbNesTemp(String(saillie.nbNes ?? '')); setNbMortsTemp(String(saillie.nbMorts ?? 0)); }}
                        className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 self-center px-1">
                        ✏️ Modifier
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Formulaire lapereaux — s'ouvre quand Mise-bas terminée ── */}
                {formulaireOuvert && (
                  <div className="mx-3 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <p className="text-sm font-bold text-blue-900 mb-1">🐣 Combien de lapereaux sont nés ?</p>
                    <p className="text-[11px] text-blue-600 mb-3">Portée de ♀ {saillie.tatouageFemelle} — {fmt(saillie.dateMiseBas)}</p>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-blue-700 mb-1">Total nés *</label>
                        <input
                          type="number" inputMode="numeric" min={0} max={20}
                          value={nbNesTemp}
                          onChange={e => setNbNesTemp(e.target.value)}
                          placeholder="Ex : 8"
                          className="w-full border-2 border-blue-200 rounded-xl px-3 py-2.5 text-lg font-black text-center focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-700 mb-1">Mort-nés</label>
                        <input
                          type="number" inputMode="numeric" min={0} max={20}
                          value={nbMortsTemp}
                          onChange={e => setNbMortsTemp(e.target.value)}
                          placeholder="0"
                          className="w-full border-2 border-blue-200 rounded-xl px-3 py-2.5 text-lg font-black text-center focus:outline-none focus:border-blue-500 bg-white text-gray-900"
                        />
                      </div>
                    </div>

                    {nbNesTemp && parseInt(nbNesTemp) > 0 && (
                      <p className="text-xs text-blue-700 font-semibold text-center mb-3">
                        ✅ {parseInt(nbNesTemp) - (parseInt(nbMortsTemp) || 0)} lapereau(x) vivant(s)
                      </p>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => annulerLapereaux(saillie.id)}
                        className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-600 font-bold text-sm bg-white hover:bg-blue-50 active:scale-95 transition-all">
                        Annuler — c'était une erreur
                      </button>
                      <button
                        onClick={() => confirmerLapereaux(saillie.id)}
                        disabled={!nbNesTemp || parseInt(nbNesTemp) < 0}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                        ✅ Confirmer
                      </button>
                    </div>
                  </div>
                )}

                {/* Sélecteur statut + suppression */}
                <div className="px-3 pb-3 space-y-2">
                  <select value={saillie.statut}
                    onChange={e => changerStatut(saillie.id, e.target.value as Saillie['statut'])}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="En attente">⏳ En attente — Palpation</option>
                    <option value="Gestante">🤰 Gestante confirmée</option>
                    <option value="Vide">❌ Saillie ratée (Vide)</option>
                    <option value="Mise-bas terminée">🍼 Mise-bas terminée</option>
                  </select>
                  <button onClick={() => supprimerSaillie(saillie.id)}
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
