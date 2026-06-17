"use client";

import { useState, useEffect } from 'react';

// ── Interfaces ────────────────────────────────────────────────────────────────
interface LapinCheptel {
  id: string;
  tatouage: string;
  sexe: 'M' | 'F';
  statut: string;
  dateNaissance: string;
  race: string;
  pere?: string;
  mere?: string;
  soins: { date: string; type: string; note: string }[];
}

interface LapinCheptelMin {
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

interface Portee {
  id: string;
  idSaillie: string;
  tatouageMere: string;
  tatouagePere: string;
  dateNaissance: string;
  dateSevrage: string;
  nbVivants: number;
  nbMorts: number;
  statut: 'Allaitement' | 'Sevrée';
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
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const cib = new Date(dateStr); cib.setHours(0, 0, 0, 0);
  return Math.round((cib.getTime() - auj.getTime()) / 86400000);
}

function ageJours(dateNaissance: string): number {
  const auj = new Date(); auj.setHours(0, 0, 0, 0);
  const nais = new Date(dateNaissance); nais.setHours(0, 0, 0, 0);
  return Math.round((auj.getTime() - nais.getTime()) / 86400000);
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
  const [cheptel, setCheptel]     = useState<LapinCheptelMin[]>([]);
  const [saillies, setSaillies]   = useState<Saillie[]>([]);
  const [portees, setPortees]     = useState<Portee[]>([]);
  const [formOpen, setFormOpen]   = useState(false);

  const [form, setForm] = useState({ idFemelle: '', idMale: '', dateSaillie: '' });

  const [saillieEnCours, setSaillieEnCours] = useState<string | null>(null);
  const [nbNesTemp, setNbNesTemp]     = useState('');
  const [nbMortsTemp, setNbMortsTemp] = useState('0');

  // Confirmation de sevrage (ID de la portée)
  const [sevrageEnCours, setSevrageEnCours] = useState<string | null>(null);

  useEffect(() => {
    const c = localStorage.getItem('ferme_cheptel');
    const s = localStorage.getItem('ferme_reproduction');
    const p = localStorage.getItem('ferme_naissances');
    if (c) setCheptel(JSON.parse(c));
    if (s) setSaillies(JSON.parse(s));
    if (p) setPortees(JSON.parse(p));
    setIsLoaded(true);
  }, []);

  // ── Sauvegarde ──────────────────────────────────────────────────────────────
  const sauvegarderSaillies = (data: Saillie[]) => {
    localStorage.setItem('ferme_reproduction', JSON.stringify(data));
    setSaillies(data);
  };

  const sauvegarderPortees = (data: Portee[]) => {
    localStorage.setItem('ferme_naissances', JSON.stringify(data));
    setPortees(data);
  };

  // ── Saillies ────────────────────────────────────────────────────────────────
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
    sauvegarderSaillies([nouvelle, ...saillies]);
    setForm({ idFemelle: '', idMale: '', dateSaillie: '' });
    setFormOpen(false);
  };

  const changerStatut = (id: string, statut: Saillie['statut']) => {
    sauvegarderSaillies(saillies.map(s => s.id === id ? { ...s, statut } : s));
    if (statut === 'Mise-bas terminée') {
      setSaillieEnCours(id);
      setNbNesTemp('');
      setNbMortsTemp('0');
    } else {
      if (saillieEnCours === id) setSaillieEnCours(null);
    }
  };

  const confirmerLapereaux = (id: string) => {
    const nes   = parseInt(nbNesTemp) || 0;
    const morts = parseInt(nbMortsTemp) || 0;
    const vivants = Math.max(0, nes - morts);

    // Met à jour la saillie
    const saillie = saillies.find(s => s.id === id);
    sauvegarderSaillies(saillies.map(s => s.id === id ? { ...s, nbNes: nes, nbMorts: morts } : s));

    // Crée ou met à jour la portée dans ferme_naissances
    if (saillie) {
      const porteeExistante = portees.find(p => p.idSaillie === id);
      if (porteeExistante) {
        sauvegarderPortees(portees.map(p =>
          p.idSaillie === id ? { ...p, nbVivants: vivants, nbMorts: morts } : p
        ));
      } else {
        const nouvellePortee: Portee = {
          id: `portee-${Date.now()}`,
          idSaillie: id,
          tatouageMere: saillie.tatouageFemelle,
          tatouagePere: saillie.tatouageMale,
          dateNaissance: saillie.dateMiseBas,
          dateSevrage: saillie.dateSevrage,
          nbVivants: vivants,
          nbMorts: morts,
          statut: 'Allaitement',
        };
        sauvegarderPortees([...portees, nouvellePortee]);
      }
    }

    setSaillieEnCours(null);
  };

  const annulerLapereaux = (id: string) => {
    sauvegarderSaillies(saillies.map(s => s.id === id ? { ...s, statut: 'Gestante' } : s));
    setSaillieEnCours(null);
  };

  const supprimerSaillie = (id: string) => {
    if (confirm('Supprimer cette fiche de reproduction ?')) {
      sauvegarderSaillies(saillies.filter(s => s.id !== id));
      if (saillieEnCours === id) setSaillieEnCours(null);
    }
  };

  // ── Sevrage ─────────────────────────────────────────────────────────────────
  const severPortee = (portee: Portee) => {
    const today = new Date().toISOString().split('T')[0];

    // Lire le cheptel complet (avec tous les champs) pour ne pas perdre de données
    const cheptelComplet: LapinCheptel[] = JSON.parse(
      localStorage.getItem('ferme_cheptel') || '[]'
    );

    // Créer un lapin par lapereau vivant
    const nouveauxLapins: LapinCheptel[] = Array.from({ length: portee.nbVivants }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      tatouage: `${portee.tatouageMere}-${i + 1}`,
      sexe: 'M' as const,       // sexe à préciser plus tard
      statut: 'Jeune',
      dateNaissance: portee.dateNaissance,
      race: '',
      pere: portee.tatouagePere !== 'Inconnu' ? portee.tatouagePere : '',
      mere: portee.tatouageMere,
      soins: [],
    }));

    const cheptelMaj = [...cheptelComplet, ...nouveauxLapins];
    localStorage.setItem('ferme_cheptel', JSON.stringify(cheptelMaj));

    // Marquer la portée comme sevrée
    sauvegarderPortees(portees.map(p =>
      p.id === portee.id ? { ...p, statut: 'Sevrée' } : p
    ));

    setSevrageEnCours(null);
  };

  if (!isLoaded) return <div className="p-6 text-gray-400">Chargement…</div>;

  const femelles = cheptel.filter(l => l.sexe === 'F');
  const males    = cheptel.filter(l => l.sexe === 'M');

  const nbGestantes = saillies.filter(s => s.statut === 'Gestante').length;
  const nbEnAttente = saillies.filter(s => s.statut === 'En attente').length;
  const porteesActives = portees.filter(p => p.statut === 'Allaitement');
  const porteesSevrees = portees.filter(p => p.statut === 'Sevrée');

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
            {porteesActives.length > 0 && ` · ${porteesActives.length} portée${porteesActives.length > 1 ? 's' : ''} en cours`}
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

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1 — PORTÉES EN COURS (ferme_naissances)                       */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {portees.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            🐣 Portées — {porteesActives.length} en allaitement · {porteesSevrees.length} sevrée{porteesSevrees.length > 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {portees.map(portee => {
              const age    = ageJours(portee.dateNaissance);
              const jSevrage = diffJours(portee.dateSevrage);
              const sevragePrevu = jSevrage <= 0;
              const estSevree  = portee.statut === 'Sevrée';
              const confirmer  = sevrageEnCours === portee.id;

              // Couleur badge âge
              const ageCouleur = estSevree
                ? 'bg-gray-100 text-gray-500'
                : age < 21
                  ? 'bg-red-100 text-red-700'
                  : age < 35
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-green-100 text-green-700';

              return (
                <div key={portee.id}
                  className={`rounded-2xl bg-white border shadow-sm overflow-hidden ${estSevree ? 'border-gray-200 opacity-70' : 'border-indigo-200'}`}>

                  {/* En-tête */}
                  <div className={`px-4 py-3 ${estSevree ? 'bg-gray-50' : 'bg-indigo-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-extrabold text-gray-900">
                          ♀ {portee.tatouageMere}
                          {portee.tatouagePere !== 'Inconnu' && (
                            <span className="font-normal text-gray-400"> × ♂ {portee.tatouagePere}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Nés le {fmt(portee.dateNaissance)}</p>
                      </div>
                      {/* Badge âge */}
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-full shrink-0 ${ageCouleur}`}>
                        {estSevree ? '✅ Sevrée' : `${age}j`}
                      </span>
                    </div>
                  </div>

                  {/* Corps */}
                  <div className="px-4 py-3 space-y-2">
                    {/* Lapereaux */}
                    <div className="flex gap-2">
                      <div className="flex-1 bg-green-50 rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-gray-400 font-medium">Vivants</p>
                        <p className="font-black text-green-700 text-xl leading-none">{portee.nbVivants}</p>
                      </div>
                      {portee.nbMorts > 0 && (
                        <div className="flex-1 bg-red-50 rounded-xl p-2.5 text-center">
                          <p className="text-[10px] text-gray-400 font-medium">Mort-nés</p>
                          <p className="font-black text-red-600 text-xl leading-none">{portee.nbMorts}</p>
                        </div>
                      )}
                    </div>

                    {/* Sevrage prévu */}
                    {!estSevree && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Sevrage prévu</span>
                        <div className="flex items-center gap-2">
                          {jSevrage >= -3 && jSevrage <= 5 && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${jSevrage <= 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {jSevrage === 0 ? 'Auj.' : jSevrage < 0 ? `En retard` : `+${jSevrage}j`}
                            </span>
                          )}
                          <span className="text-xs font-bold text-blue-600">{fmt(portee.dateSevrage)}</span>
                        </div>
                      </div>
                    )}

                    {/* Barre progression âge */}
                    {!estSevree && (
                      <div>
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                          <span>0j</span>
                          <span className="font-semibold text-gray-600">{age}j / 35j</span>
                          <span>35j</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${age >= 35 ? 'bg-green-500' : age >= 21 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${Math.min(100, Math.round((age / 35) * 100))}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 text-center">
                          {age < 21
                            ? `Trop jeune — encore ${21 - age}j minimum`
                            : age < 35
                              ? `Sevrage possible dans ${35 - age}j`
                              : '✅ Prêt à sevrer'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Formulaire de confirmation sevrage ── */}
                  {confirmer && (
                    <div className="mx-3 mb-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                      <p className="text-sm font-bold text-emerald-900 mb-1">✂️ Confirmer le sevrage ?</p>
                      <p className="text-[11px] text-emerald-700 mb-3">
                        {portee.nbVivants} lapereau{portee.nbVivants > 1 ? 'x' : ''} vont être ajouté{portee.nbVivants > 1 ? 's' : ''} au cheptel avec les tatouages&nbsp;:
                        <strong> {portee.tatouageMere}-1</strong>
                        {portee.nbVivants > 1 && <>, <strong>{portee.tatouageMere}-2</strong></>}
                        {portee.nbVivants > 2 && <>, … <strong>{portee.tatouageMere}-{portee.nbVivants}</strong></>}
                      </p>
                      <p className="text-[10px] text-emerald-600 bg-emerald-100 rounded-lg px-2 py-1 mb-3">
                        💡 Sexe par défaut ♂ — modifiable dans la fiche Cheptel
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSevrageEnCours(null)}
                          className="flex-1 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 font-bold text-sm bg-white hover:bg-emerald-50 active:scale-95 transition-all">
                          Annuler
                        </button>
                        <button
                          onClick={() => severPortee(portee)}
                          className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 active:scale-95 transition-all">
                          ✅ Sevrer & créer les lapins
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Bouton Sevrer */}
                  {!estSevree && !confirmer && (
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => setSevrageEnCours(portee.id)}
                        disabled={age < 21}
                        className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                          age >= 35
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                            : age >= 21
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}>
                        {age < 21
                          ? `✂️ Trop tôt — ${21 - age}j restants`
                          : '✂️ Sevrer la portée'}
                      </button>
                    </div>
                  )}

                  {estSevree && (
                    <div className="px-3 pb-3">
                      <p className="text-center text-xs text-gray-400 font-medium py-1">
                        Portée sevrée · Lapins ajoutés au cheptel
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2 — SAILLIES (ferme_reproduction)                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Calendrier des saillies</p>

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

                {/* En-tête */}
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
                    { label: 'Palpation', date: saillie.datePalpation, color: 'text-amber-600', diff: diffJours(saillie.datePalpation) },
                    { label: 'Mise-bas',  date: saillie.dateMiseBas,   color: 'text-red-600',   diff: diffJours(saillie.dateMiseBas)   },
                    { label: 'Sevrage',   date: saillie.dateSevrage,   color: 'text-blue-600',  diff: diffJours(saillie.dateSevrage)   },
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

                  {/* Résumé lapereaux */}
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
                        ✏️
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Formulaire lapereaux ── */}
                {formulaireOuvert && (
                  <div className="mx-3 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl">
                    <p className="text-sm font-bold text-blue-900 mb-1">🐣 Combien de lapereaux sont nés ?</p>
                    <p className="text-[11px] text-blue-600 mb-3">♀ {saillie.tatouageFemelle} — {fmt(saillie.dateMiseBas)}</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs font-semibold text-blue-700 mb-1">Total nés *</label>
                        <input type="number" inputMode="numeric" min={0} max={20}
                          value={nbNesTemp} onChange={e => setNbNesTemp(e.target.value)}
                          placeholder="Ex : 8" autoFocus
                          className="w-full border-2 border-blue-200 rounded-xl px-3 py-2.5 text-lg font-black text-center focus:outline-none focus:border-blue-500 bg-white text-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-700 mb-1">Mort-nés</label>
                        <input type="number" inputMode="numeric" min={0} max={20}
                          value={nbMortsTemp} onChange={e => setNbMortsTemp(e.target.value)}
                          placeholder="0"
                          className="w-full border-2 border-blue-200 rounded-xl px-3 py-2.5 text-lg font-black text-center focus:outline-none focus:border-blue-500 bg-white text-gray-900" />
                      </div>
                    </div>
                    {nbNesTemp && parseInt(nbNesTemp) > 0 && (
                      <p className="text-xs text-blue-700 font-semibold text-center mb-3">
                        ✅ {parseInt(nbNesTemp) - (parseInt(nbMortsTemp) || 0)} lapereau(x) vivant(s)
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button onClick={() => annulerLapereaux(saillie.id)}
                        className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-600 font-bold text-sm bg-white hover:bg-blue-50 active:scale-95 transition-all">
                        Annuler
                      </button>
                      <button onClick={() => confirmerLapereaux(saillie.id)}
                        disabled={!nbNesTemp || parseInt(nbNesTemp) < 0}
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-40">
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
