"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { QRCodeCanvas } from 'qrcode.react';

// Chargement dynamique pour éviter les erreurs SSR (qrcode.react utilise le canvas)
const QrCodeLapin = dynamic(() => import('@/components/QrCodeLapin'), { ssr: false });

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
  statut: 'Reproducteur' | 'Engraissement' | 'Jeune' | 'Vente';
  dateNaissance: string;
  race: string;
  pere?: string;    // tatouage du père (ancien modèle)
  mere?: string;    // tatouage de la mère (ancien modèle)
  pereId?: string;  // ID du père (nouveau modèle — pour ArbreGeneralogique)
  mereId?: string;  // ID de la mère (nouveau modèle)
  caracteristiques?: string; // description libre, ex: "Femelle Papillon"
  soins?: { date: string; type: string; note: string }[];
}

export default function CheptelPage() {
  const [cheptel, setCheptel]   = useState<Lapin[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [nouveauLapin, setNouveauLapin] = useState<Omit<Lapin, 'id'>>({
    tatouage: '', sexe: 'M', statut: 'Reproducteur', dateNaissance: '', race: '', pere: '', mere: '', soins: [],
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode]     = useState<'liste' | 'bloc'>('bloc');
  const [showCareForm, setShowCareForm] = useState<Record<string, boolean>>({});
  const [showCareList, setShowCareList] = useState<Record<string, boolean>>({});
  const [newCare, setNewCare]       = useState({ date: '', type: '', note: '' });
  const [formOpen, setFormOpen]     = useState(false);
  const [qrLapinId, setQrLapinId]       = useState<string | null>(null);
  const [menuOuvertId, setMenuOuvertId] = useState<string | null>(null);
  const [menuPos, setMenuPos]           = useState<{ top: number; right: number } | null>(null);
  const [lapinASupprimer, setLapinASupprimer] = useState<string | null>(null);

  useEffect(() => {
    const data = localStorage.getItem('ferme_cheptel');
    if (data) setCheptel(JSON.parse(data));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem('ferme_cheptel', JSON.stringify(cheptel));
  }, [cheptel, isLoaded]);

  useEffect(() => {
    const fermer = () => setMenuOuvertId(null);
    document.addEventListener('click', fermer);
    return () => document.removeEventListener('click', fermer);
  }, []);

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
    setNouveauLapin({ tatouage: '', sexe: 'M', statut: 'Reproducteur', dateNaissance: '', race: '', pere: '', mere: '', soins: [] });
    setFormOpen(false);
  };

  const supprimerLapin = (id: string) => {
    setLapinASupprimer(id);
    setMenuOuvertId(null);
  };

  const confirmerSuppression = () => {
    if (lapinASupprimer) setCheptel(prev => prev.filter(l => l.id !== lapinASupprimer));
    setLapinASupprimer(null);
  };

  const ouvriMenu = (e: React.MouseEvent<HTMLButtonElement>, id: string) => {
    e.stopPropagation();
    if (menuOuvertId === id) { setMenuOuvertId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMenuOuvertId(id);
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

  const telechargerQR = (tatouage: string) => {
    const canvas = canvasContainerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `QRCode_Lapin_${tatouage}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isLoaded) return <div className="p-6 text-gray-500">Chargement…</div>;

  const males   = cheptel.filter(l => l.sexe === 'M').length;
  const femelles = cheptel.filter(l => l.sexe === 'F').length;

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* ── Modale QR Code ────────────────────────────────────────────────── */}
      {qrLapinId && (() => {
        const l = cheptel.find(lap => lap.id === qrLapinId);
        if (!l) return null;
        return (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={() => setQrLapinId(null)}>
            <div className="bg-white rounded-2xl shadow-md w-full max-w-xs"
              onClick={e => e.stopPropagation()}>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <p className="font-bold text-gray-800 text-sm">📱 QR Code — {l.tatouage}</p>
                <button onClick={() => setQrLapinId(null)}
                  className="text-gray-400 hover:text-gray-700 text-lg font-bold">✕</button>
              </div>
              <div className="p-5 flex flex-col items-center gap-3">
                <QrCodeLapin lapin={l} taille={200} />
                <p className="text-[11px] text-gray-400 text-center">
                  Imprimez et collez ce QR sur la cage.<br/>
                  Scannez pour ouvrir la fiche directement.
                </p>
                {/* Canvas haute résolution hors-écran — utilisé uniquement pour le téléchargement PNG */}
                <div ref={canvasContainerRef} className="sr-only">
                  <QRCodeCanvas value={l.id} size={400} bgColor="#ffffff" fgColor="#1e1b4b" level="H" marginSize={1} />
                </div>
                <button onClick={() => telechargerQR(l.tatouage)}
                  className="w-full py-2.5 rounded-xl bg-gray-800 text-white font-bold text-sm hover:bg-gray-900 active:opacity-75 transition-colors">
                  ⬇️ Télécharger le QR Code
                </button>
                <Link href={`/lapin/${l.id}`}
                  className="w-full text-center py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 active:opacity-75 transition-colors">
                  Voir la fiche complète →
                </Link>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Menu déroulant (dropdown) — positionné en fixed pour échapper au overflow-hidden ── */}
      {menuOuvertId && menuPos && (
        <div
          className="fixed z-[60] bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden w-44"
          style={{ top: menuPos.top, right: menuPos.right }}
          onClick={e => e.stopPropagation()}>
          <Link
            href={`/genealogie?tatouage=${cheptel.find(l => l.id === menuOuvertId)?.tatouage ?? ''}`}
            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
            onClick={() => setMenuOuvertId(null)}>
            <span>🌳</span> Généalogie
          </Link>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 text-left"
            onClick={() => {
              setShowCareList(p => ({ ...p, [menuOuvertId]: !p[menuOuvertId] }));
              setMenuOuvertId(null);
            }}>
            <span>📋</span> Historique
          </button>
          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left font-bold"
            onClick={() => supprimerLapin(menuOuvertId)}>
            <span>🗑️</span> Supprimer
          </button>
        </div>
      )}

      {/* ── Modale de confirmation de suppression ────────────────────────── */}
      {lapinASupprimer && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <p className="text-4xl mb-3">⚠️</p>
            <h3 className="font-bold text-gray-900 text-lg mb-2">Supprimer ce lapin ?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Cette action est irréversible. Toutes les données de ce lapin seront perdues.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setLapinASupprimer(null)}
                className="flex-1 py-2.5 border-2 border-gray-300 rounded-xl font-bold text-sm text-gray-700 hover:border-gray-400 transition-colors">
                Annuler
              </button>
              <button onClick={confirmerSuppression}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 rounded-xl font-bold text-sm text-white transition-colors">
                Oui, supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Mon Cheptel</h1>
          <p className="text-xs text-gray-400 mt-0.5">{cheptel.length} animaux · {males}♂ {femelles}♀</p>
        </div>
        <button
          onClick={() => setFormOpen(o => !o)}
          className="bg-indigo-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow hover:bg-indigo-700 active:opacity-75 transition-colors shrink-0"
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
              <label className="block text-xs font-semibold text-gray-500 mb-1">Rôle</label>
              <select value={nouveauLapin.statut}
                onChange={e => setNouveauLapin(p => ({ ...p, statut: e.target.value as Lapin['statut'] }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white">
                <option value="Reproducteur">🐇 Reproducteur</option>
                <option value="Engraissement">🌾 Engraissement</option>
                <option value="Jeune">🐣 Jeune</option>
                <option value="Vente">💰 À vendre</option>
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
              className="flex-1 bg-indigo-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-indigo-700 active:opacity-75 transition-colors">
              ✅ Enregistrer
            </button>
            <button type="button" onClick={toggleDictee}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-colors ${isListening ? 'bg-red-500 animate-pulse' : 'bg-zinc-700 hover:bg-zinc-800'}`}>
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
                      <p className="text-[10px] text-gray-500">{lapin.race || 'Race inconnue'}{age !== null ? ` · ${age} mois` : ''} · {lapin.statut || 'Reproducteur'}</p>
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
                <div className="px-3 pb-3 grid grid-cols-4 gap-1.5">
                  <Link href={`/performances?lapin=${lapin.id}`}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-orange-500 text-white rounded-xl active:opacity-75 transition-colors text-center">
                    <span className="text-base leading-none">⚖️</span>
                    <span className="text-[9px] font-bold leading-none">Peser</span>
                  </Link>
                  <button onClick={() => setShowCareForm(p => ({ ...p, [lapin.id]: !p[lapin.id] }))}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-indigo-600 text-white rounded-xl active:opacity-75 transition-colors">
                    <span className="text-base leading-none">{showCareForm[lapin.id] ? '✕' : '+'}</span>
                    <span className="text-[9px] font-bold leading-none">Soin</span>
                  </button>
                  <button onClick={() => setQrLapinId(lapin.id)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-zinc-700 text-white rounded-xl active:opacity-75 transition-colors">
                    <span className="text-base leading-none">📱</span>
                    <span className="text-[9px] font-bold leading-none">QR</span>
                  </button>
                  <button onClick={(e) => ouvriMenu(e, lapin.id)}
                    className="flex flex-col items-center justify-center gap-1 py-2.5 bg-gray-100 text-gray-500 rounded-xl active:opacity-75 transition-colors">
                    <span className="text-base leading-none font-extrabold">•••</span>
                    <span className="text-[9px] font-bold leading-none">Plus</span>
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
                      className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs active:opacity-75">
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
