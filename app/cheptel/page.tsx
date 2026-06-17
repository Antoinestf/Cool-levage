"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Lapin {
  id: string;
  tatouage: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  race: string;
  pere?: string;
  mere?: string;
  soins?: { date: string; type: string; note: string }[];
}

export default function CheptelPage() {
  const [cheptel, setCheptel]   = useState<Lapin[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [nouveauLapin, setNouveauLapin] = useState<Omit<Lapin, 'id'>>({
    tatouage: '', sexe: 'M', dateNaissance: '', race: '', pere: '', mere: '', soins: [],
  });

  const [viewMode, setViewMode]     = useState<'liste' | 'bloc'>('bloc');
  const [showCareForm, setShowCareForm] = useState<Record<string, boolean>>({});
  const [showCareList, setShowCareList] = useState<Record<string, boolean>>({});
  const [newCare, setNewCare]       = useState({ date: '', type: '', note: '' });
  const [formOpen, setFormOpen]     = useState(false);

  useEffect(() => {
    const data = localStorage.getItem('ferme_cheptel');
    if (data) setCheptel(JSON.parse(data));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('ferme_cheptel', JSON.stringify(cheptel));
  }, [cheptel, isLoaded]);

  // ── Dictée vocale ──────────────────────────────────────────────────────────
  const formaterDateVocale = (texte: string) => {
    const moisMap: Record<string, string> = {
      'janvier':'01','février':'02','fevrier':'02','mars':'03','avril':'04',
      'mai':'05','juin':'06','juillet':'07','août':'08','aout':'08',
      'septembre':'09','octobre':'10','novembre':'11','décembre':'12','decembre':'12'
    };
    const anneeMatch = texte.match(/20\d{2}/);
    const annee = anneeMatch ? anneeMatch[0] : new Date().getFullYear().toString();
    const jourMatch = texte.match(/\d{1,2}/);
    const jour = jourMatch ? jourMatch[0].padStart(2, '0') : '01';
    let mois = '01';
    for (const [n, v] of Object.entries(moisMap)) {
      if (texte.includes(n)) { mois = v; break; }
    }
    return `${annee}-${mois}-${jour}`;
  };

  const toggleDictee = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    recognitionRef.current = r;
    r.lang = 'fr-FR';
    r.continuous = true;
    r.interimResults = false;
    r.onstart  = () => setIsListening(true);
    r.onend    = () => setIsListening(false);
    r.onerror  = () => setIsListening(false);
    r.onresult = (event: any) => {
      const phrase = event.results[event.results.length - 1][0].transcript.toLowerCase();
      setNouveauLapin(prev => {
        const maj = { ...prev };
        const stop = "(?=\\s+femelle|\\s+mâle|\\s+male|\\s+race|\\s+date|\\s+naissance|$)";
        const ms = phrase.match(/\b(femelle|mâle|male)\b/i);
        if (ms) maj.sexe = ms[0].toLowerCase() === 'femelle' ? 'F' : 'M';
        const mt = phrase.match(new RegExp(`tatouage\\s+(.*?)${stop}`, 'i'));
        if (mt?.[1]) maj.tatouage = mt[1].replace(/\s+/g, '').toUpperCase();
        const mr = phrase.match(new RegExp(`race\\s+(.*?)${stop}`, 'i'));
        if (mr?.[1]) maj.race = mr[1].trim();
        const md = phrase.match(new RegExp(`(?:date de naissance|naissance)\\s+(.*?)${stop}`, 'i'));
        if (md?.[1]) maj.dateNaissance = formaterDateVocale(md[1].trim());
        return maj;
      });
    };
    try { r.start(); } catch { setIsListening(false); }
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const ajouterLapin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nouveauLapin.tatouage.trim()) return;
    setCheptel(prev => [...prev, { ...nouveauLapin, id: Date.now().toString(), soins: [] }]);
    setNouveauLapin({ tatouage: '', sexe: 'M', dateNaissance: '', race: '', pere: '', mere: '', soins: [] });
    setFormOpen(false);
  };

  const supprimerLapin = (id: string) => {
    if (confirm("Supprimer ce lapin ?")) setCheptel(prev => prev.filter(l => l.id !== id));
  };

  const ajouterSoin = (lapinId: string) => {
    if (!newCare.date || !newCare.type) return;
    setCheptel(prev => prev.map(l =>
      l.id === lapinId
        ? { ...l, soins: [...(l.soins || []), newCare].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) }
        : l
    ));
    setNewCare({ date: '', type: '', note: '' });
    setShowCareForm(p => ({ ...p, [lapinId]: false }));
  };

  if (!isLoaded) return <div className="p-6 text-gray-500">Chargement…</div>;

  const males   = cheptel.filter(l => l.sexe === 'M').length;
  const femelles = cheptel.filter(l => l.sexe === 'F').length;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mon Cheptel</h1>
          <p className="text-xs text-gray-400 mt-0.5">{cheptel.length} animaux · {males}♂ {femelles}♀</p>
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow hover:bg-indigo-700 active:scale-95 transition-all shrink-0"
        >
          {formOpen ? '✕ Fermer' : '＋ Ajouter'}
        </button>
      </div>

      {/* ── Formulaire ajout ────────────────────────────────────────────── */}
      {formOpen && (
        <form onSubmit={ajouterLapin} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-5">
          <h2 className="font-bold text-gray-800 mb-4">Nouveau lapin</h2>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tatouage *</label>
              <input type="text" name="tatouage" value={nouveauLapin.tatouage}
                onChange={e => setNouveauLapin(p => ({ ...p, tatouage: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                required placeholder="Ex: A001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sexe</label>
              <select name="sexe" value={nouveauLapin.sexe}
                onChange={e => setNouveauLapin(p => ({ ...p, sexe: e.target.value as 'M' | 'F' }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="M">♂ Mâle</option>
                <option value="F">♀ Femelle</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Naissance *</label>
              <input type="date" value={nouveauLapin.dateNaissance}
                onChange={e => setNouveauLapin(p => ({ ...p, dateNaissance: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Race</label>
              <input type="text" value={nouveauLapin.race}
                onChange={e => setNouveauLapin(p => ({ ...p, race: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                placeholder="Ex: Fauve de Bourgogne" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tatouage Père</label>
              <input type="text" value={nouveauLapin.pere || ''}
                onChange={e => setNouveauLapin(p => ({ ...p, pere: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                placeholder="Facultatif" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Tatouage Mère</label>
              <input type="text" value={nouveauLapin.mere || ''}
                onChange={e => setNouveauLapin(p => ({ ...p, mere: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                placeholder="Facultatif" />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit"
              className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-indigo-700 active:scale-95 transition-all">
              ✅ Enregistrer
            </button>
            <button type="button" onClick={toggleDictee}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all ${isListening ? 'bg-red-500 animate-pulse' : 'bg-zinc-700 hover:bg-zinc-800'}`}>
              {isListening ? '⏹️' : '🎤'}
            </button>
          </div>
          {isListening && (
            <p className="text-xs text-red-500 text-center mt-2 animate-pulse">
              🔴 Dictée en cours… Parlez maintenant
            </p>
          )}
        </form>
      )}

      {/* ── Contrôles liste ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-600">{cheptel.length} animal{cheptel.length > 1 ? 'aux' : ''}</h2>
        <button onClick={() => setViewMode(m => m === 'liste' ? 'bloc' : 'liste')}
          className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50">
          {viewMode === 'liste' ? '⊞ Grille' : '☰ Liste'}
        </button>
      </div>

      {/* ── Liste des lapins ────────────────────────────────────────────── */}
      {cheptel.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
          <p className="text-4xl mb-3">🐇</p>
          <p className="font-medium">Aucun animal enregistré</p>
          <p className="text-sm mt-1">Appuyez sur « ＋ Ajouter » pour commencer</p>
        </div>
      ) : (
        <div className={viewMode === 'bloc'
          ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
          : 'space-y-2'}>
          {cheptel.map(lapin => {
            const estMale = lapin.sexe === 'M';
            const age = lapin.dateNaissance
              ? Math.floor((Date.now() - new Date(lapin.dateNaissance).getTime()) / 86400000 / 30)
              : null;

            return (
              <div key={lapin.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${estMale ? 'border-blue-100' : 'border-purple-100'}`}>

                {/* Card header */}
                <div className={`px-4 py-3 flex items-center justify-between ${estMale ? 'bg-blue-50' : 'bg-purple-50'}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg">{estMale ? '🐇' : '🐰'}</span>
                    <div className="min-w-0">
                      <p className="font-extrabold text-gray-900 uppercase leading-none truncate">{lapin.tatouage}</p>
                      <p className="text-[10px] text-gray-500">{lapin.race || 'Race inconnue'}{age !== null ? ` · ${age} mois` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${estMale ? 'bg-blue-200 text-blue-800' : 'bg-purple-200 text-purple-800'}`}>
                    {estMale ? '♂ M' : '♀ F'}
                  </span>
                </div>

                {/* Card body */}
                <div className="px-4 py-3 text-xs text-gray-600 space-y-0.5">
                  <p>🎂 {lapin.dateNaissance || '—'}</p>
                  <p>👨 Père : {lapin.pere || 'Inconnu'} · 👩 Mère : {lapin.mere || 'Inconnue'}</p>
                  {lapin.soins && lapin.soins.length > 0 && (
                    <p className="text-blue-600">💊 {lapin.soins.length} soin{lapin.soins.length > 1 ? 's' : ''}</p>
                  )}
                </div>

                {/* Boutons action */}
                <div className="px-3 pb-3 grid grid-cols-5 gap-1.5">
                  <Link href={`/genealogie?tatouage=${lapin.tatouage}`}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-emerald-600 text-white rounded-xl active:scale-95 transition-all text-center">
                    <span className="text-base leading-none">🌳</span>
                    <span className="text-[9px] font-bold leading-none">Généal.</span>
                  </Link>
                  <Link href={`/performances?lapin=${lapin.id}`}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-orange-500 text-white rounded-xl active:scale-95 transition-all text-center">
                    <span className="text-base leading-none">⚖️</span>
                    <span className="text-[9px] font-bold leading-none">Peser</span>
                  </Link>
                  <button onClick={() => setShowCareForm(p => ({ ...p, [lapin.id]: !p[lapin.id] }))}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-indigo-600 text-white rounded-xl active:scale-95 transition-all">
                    <span className="text-base leading-none">{showCareForm[lapin.id] ? '✕' : '+'}</span>
                    <span className="text-[9px] font-bold leading-none">Soin</span>
                  </button>
                  <button onClick={() => setShowCareList(p => ({ ...p, [lapin.id]: !p[lapin.id] }))}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-purple-600 text-white rounded-xl active:scale-95 transition-all">
                    <span className="text-base leading-none">📋</span>
                    <span className="text-[9px] font-bold leading-none">Histo.</span>
                  </button>
                  <button onClick={() => supprimerLapin(lapin.id)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-red-500 text-white rounded-xl active:scale-95 transition-all">
                    <span className="text-base leading-none">🗑️</span>
                    <span className="text-[9px] font-bold leading-none">Suppr.</span>
                  </button>
                </div>

                {/* Formulaire soin */}
                {showCareForm[lapin.id] && (
                  <div className="mx-4 mb-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                    <p className="text-xs font-bold text-indigo-800">Nouveau soin — {lapin.tatouage}</p>
                    <input type="date" value={newCare.date}
                      onChange={e => setNewCare(p => ({ ...p, date: e.target.value }))}
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs bg-white" />
                    <select value={newCare.type}
                      onChange={e => setNewCare(p => ({ ...p, type: e.target.value }))}
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs bg-white">
                      <option value="">-- Type de soin --</option>
                      <option value="Vaccin">Vaccin</option>
                      <option value="Traitement">Traitement</option>
                      <option value="Pesée">Pesée</option>
                      <option value="Autre">Autre</option>
                    </select>
                    <textarea value={newCare.note}
                      onChange={e => setNewCare(p => ({ ...p, note: e.target.value }))}
                      placeholder="Notes…" rows={2}
                      className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-xs bg-white resize-none" />
                    <button onClick={() => ajouterSoin(lapin.id)}
                      className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs active:scale-95">
                      Enregistrer le soin
                    </button>
                  </div>
                )}

                {/* Historique soins */}
                {showCareList[lapin.id] && (
                  <div className="mx-4 mb-3 p-3 bg-purple-50 border border-purple-200 rounded-xl">
                    <p className="text-xs font-bold text-purple-800 mb-2">Historique médical</p>
                    {lapin.soins && lapin.soins.length > 0 ? (
                      <ul className="space-y-1.5">
                        {lapin.soins.map((s, i) => (
                          <li key={i} className="text-[11px] border-b border-purple-100 pb-1 last:border-0">
                            <span className="font-bold text-gray-800">{s.date} · {s.type}</span>
                            {s.note && <p className="text-gray-600 mt-0.5">{s.note}</p>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-500 italic">Aucun soin enregistré.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
