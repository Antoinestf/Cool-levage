"use client";
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import MeteoWidget from '@/components/MeteoWidget';

const ScannerModal = dynamic(() => import('@/components/ScannerModal'), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lapin {
  id: number;
  tatouage: string;
  sexe: string;
  statut: string;
  archive?: boolean;
  soins?: { date: string; type: string; note: string }[];
}

interface Saillie {
  id: string;
  tatouageFemelle: string;
  tatouageMale: string;
  dateSaillie: string;
  datePalpation: string;
  dateMiseBas: string;
  dateSevrage: string;
  statut: 'En attente' | 'Gestante' | 'Vide' | 'Mise-bas terminée';
  notes: string;
}

interface Stock {
  id: string;
  type: string;
  quantiteKg: number;
  seuilAlerte: number;
}

type NiveauAlerte = 'danger' | 'warning' | 'info';

interface Alerte {
  id: string;
  niveau: NiveauAlerte;
  titre: string;
  message: string;
  lien: string;
  lienLabel: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const diffJours = (dateStr: string): number => {
  const aujourd = new Date();
  aujourd.setHours(0, 0, 0, 0);
  const cible = new Date(dateStr);
  cible.setHours(0, 0, 0, 0);
  return Math.round((cible.getTime() - aujourd.getTime()) / 86400000);
};

const fmt = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

// ─── Composants UI ───────────────────────────────────────────────────────────

const StatCard = ({
  titre, valeur, sous, couleur, href
}: { titre: string; valeur: number | string; sous?: string; couleur: string; href: string }) => (
  <Link href={href} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow block group">
    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{titre}</p>
    <p className={`text-3xl font-black mt-1 ${couleur} group-hover:scale-105 transition-transform inline-block`}>{valeur}</p>
    {sous && <p className="text-gray-400 text-[10px] mt-1 font-medium">{sous}</p>}
  </Link>
);

const STYLES_ALERTE: Record<NiveauAlerte, { card: string; badge: string; icone: string }> = {
  danger:  { card: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-700',    icone: '🔴' },
  warning: { card: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700',icone: '🟠' },
  info:    { card: 'bg-blue-50 border-blue-200',   badge: 'bg-blue-100 text-blue-700',  icone: '🔵' },
};

const CarteAlerte = ({ alerte }: { alerte: Alerte }) => {
  const s = STYLES_ALERTE[alerte.niveau];
  return (
    <div className={`border rounded-2xl px-4 py-3 flex items-center gap-3 ${s.card}`}>
      <span className="text-base shrink-0">{s.icone}</span>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm leading-tight">{alerte.titre}</p>
        <p className="text-gray-500 text-xs mt-0.5 truncate">{alerte.message}</p>
      </div>
      <Link
        href={alerte.lien}
        className={`text-xs font-bold px-3 py-1.5 rounded-xl shrink-0 ${s.badge} hover:opacity-80 transition-opacity`}
      >
        Voir →
      </Link>
    </div>
  );
};

// ─── Widget rappels (état notifications) ─────────────────────────────────────
function NotifWidget() {
  const [monted, setMonted] = React.useState(false);
  const [perm, setPerm] = React.useState<string>('unknown');
  const [refus, setRefus] = React.useState(false);

  React.useEffect(() => { setMonted(true); }, []);

  React.useEffect(() => {
    if (!monted || typeof window === 'undefined' || !('Notification' in window)) return;
    setPerm(Notification.permission);
    setRefus(!!localStorage.getItem('ferme_notif_refus'));
  }, [monted]);

  const activer = async () => {
    if (!('Notification' in window)) return;
    localStorage.removeItem('ferme_notif_refus');
    const r = await Notification.requestPermission();
    setPerm(r);
    setRefus(false);
  };

  const desactiver = () => {
    localStorage.setItem('ferme_notif_refus', '1');
    setRefus(true);
  };

  // ── Export .ics — calendrier natif (Google / Apple) ───────────────────────
  const exporterAgenda = () => {
    const auj = new Date(); auj.setHours(0, 0, 0, 0);
    const saillies: Saillie[] = JSON.parse(localStorage.getItem('ferme_reproduction') || '[]');
    const dtstamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

    // Formate une date "YYYY-MM-DD" en "YYYYMMDD" pour l'ICS
    const toICS   = (d: string) => d.replace(/-/g, '');
    // Calcule le lendemain (DTEND exclusif pour les événements journée entière)
    const nextDay = (d: string) => {
      const dt = new Date(d); dt.setDate(dt.getDate() + 1);
      return dt.toISOString().slice(0, 10).replace(/-/g, '');
    };
    // Construit un bloc VEVENT avec alarme J-1
    const vevent = (uid: string, date: string, summary: string, desc: string) => [
      'BEGIN:VEVENT',
      `UID:${uid}@coolelevage`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${toICS(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',      // Rappel la veille
      'ACTION:DISPLAY',
      `DESCRIPTION:${summary}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');

    const events: string[] = [];
    for (const s of saillies) {
      // Palpation — saillies "En attente" avec date future
      if (s.statut === 'En attente' && s.datePalpation && new Date(s.datePalpation) >= auj)
        events.push(vevent(
          `palp-${s.id}`, s.datePalpation,
          `🔬 Palpation — ${s.tatouageFemelle}`,
          `Verifier la gestation de ${s.tatouageFemelle} x ${s.tatouageMale}`,
        ));
      // Mise-bas — gestantes avec date future
      if (s.statut === 'Gestante' && s.dateMiseBas && new Date(s.dateMiseBas) >= auj)
        events.push(vevent(
          `misebas-${s.id}`, s.dateMiseBas,
          `🍼 Mise-bas — ${s.tatouageFemelle}`,
          `Mise-bas prevue. Preparez la cage maternite.`,
        ));
      // Sevrage — gestantes ou mise-bas terminée avec date future
      if ((s.statut === 'Gestante' || s.statut === 'Mise-bas terminée') && s.dateSevrage && new Date(s.dateSevrage) >= auj)
        events.push(vevent(
          `sevrage-${s.id}`, s.dateSevrage,
          `✂️ Sevrage — ${s.tatouageFemelle}`,
          `Separer les lapereaux de ${s.tatouageFemelle}. Preparez les cages.`,
        ));
    }

    if (!events.length) {
      alert('Aucun événement futur à exporter.\nAjoutez des saillies dans la section Naissances.');
      return;
    }

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//CoolElevage//Calendrier//FR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Mon Elevage',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `elevage-${new Date().toISOString().slice(0, 10)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!monted || typeof window === 'undefined' || !('Notification' in window)) return null;

  const actifs = perm === 'granted' && !refus;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-gray-700">Rappels automatiques</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${actifs ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {actifs ? '🔔 Actifs' : '🔕 Inactifs'}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
        {actifs
          ? 'Vous recevrez des rappels pour les palpations, mises-bas, sevrages et stocks critiques.'
          : 'Activez les rappels pour ne jamais manquer une palpation ou une mise-bas.'}
      </p>
      {perm === 'denied' ? (
        <p className="text-[11px] text-amber-600 font-semibold">
          ⚠️ Bloqué par le navigateur. Allez dans les paramètres de votre navigateur pour autoriser les notifications pour ce site.
        </p>
      ) : actifs ? (
        <button onClick={desactiver}
          className="w-full py-2 text-xs font-bold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">
          Désactiver les rappels
        </button>
      ) : (
        <button onClick={activer}
          className="w-full py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 active:opacity-75 transition-colors">
          🔔 Activer les rappels
        </button>
      )}

      {/* ── Export agenda (toujours visible) ──────────────────────────────── */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        <button onClick={exporterAgenda}
          className="w-full py-2 text-xs font-bold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 active:opacity-75 transition-colors">
          📅 Exporter vers l&apos;Agenda
        </button>
        <p className="text-[10px] text-gray-400 text-center mt-1.5 leading-snug">
          Génère un fichier .ics · Compatible Google &amp; Apple Calendar
        </p>
      </div>
    </div>
  );
}

// ─── Page principale ─────────────────────────────────────────────────────────

export default function TableauDeBord() {
  const [cheptel, setCheptel]       = useState<Lapin[]>([]);
  const [saillies, setSaillies]     = useState<Saillie[]>([]);
  const [stocks, setStocks]         = useState<Stock[]>([]);
  const [isLoaded, setIsLoaded]     = useState(false);
  const [alerteChaleur, setAlerteChaleur] = useState<number | null>(null);
  const [scannerOuvert, setScannerOuvert] = useState(false);

  const handleChaleur = useCallback((tempMax: number) => {
    setAlerteChaleur(tempMax);
  }, []);

  useEffect(() => {
    const c = localStorage.getItem('ferme_cheptel');
    const r = localStorage.getItem('ferme_reproduction');
    const s = localStorage.getItem('ferme_stocks_v2');
    if (c) setCheptel(JSON.parse(c));
    if (r) setSaillies(JSON.parse(r));
    if (s) setStocks(JSON.parse(s));
    setIsLoaded(true);
  }, []);

  if (!isLoaded) return <div className="p-8 text-gray-400 italic">Chargement de la ferme…</div>;

  // ── Stats cheptel ──────────────────────────────────────────────────────────
  const actifs       = cheptel.filter(l => !l.archive);
  const males        = actifs.filter(l => l.sexe?.trim().toUpperCase() === 'M');
  const femelles     = actifs.filter(l => l.sexe?.trim().toUpperCase() === 'F');
  const reproducteurs= actifs.filter(l => l.statut === 'Reproducteur');
  const engraissement= actifs.filter(l => l.statut === 'Engraissement');
  const totalSoins   = actifs.reduce((acc, l) => acc + (l.soins?.length || 0), 0);

  // ── Stats reproduction ────────────────────────────────────────────────────
  const gestantes    = saillies.filter(s => s.statut === 'Gestante');
  const enAttente    = saillies.filter(s => s.statut === 'En attente');

  // ── Génération des alertes intelligentes ──────────────────────────────────
  const alertes: Alerte[] = [];

  // 1. PALPATIONS À FAIRE
  //    Saillies "En attente" dont la date de palpation est passée ou aujourd'hui
  enAttente
    .filter(s => diffJours(s.datePalpation) <= 0)
    .forEach(s => {
      const j = diffJours(s.datePalpation);
      const retard = j === 0 ? "aujourd'hui" : `en retard de ${Math.abs(j)}j`;
      alertes.push({
        id: `palp-${s.id}`,
        niveau: j < -2 ? 'danger' : 'warning',
        titre: `Palpation — ${s.tatouageFemelle}`,
        message: `${retard} · saillie du ${fmt(s.dateSaillie)} avec ♂ ${s.tatouageMale}`,
        lien: '/naissances',
        lienLabel: 'Naissances',
      });
    });

  // 2. MISES-BAS IMMINENTES
  //    Gestantes dont la mise-bas est dans ≤ 5 jours
  gestantes
    .filter(s => diffJours(s.dateMiseBas) <= 5)
    .forEach(s => {
      const j = diffJours(s.dateMiseBas);
      const quand = j === 0 ? "aujourd'hui" : j < 0 ? `en retard de ${Math.abs(j)}j` : `dans ${j}j`;
      alertes.push({
        id: `misebas-${s.id}`,
        niveau: j <= 0 ? 'danger' : 'warning',
        titre: `Mise-bas — ${s.tatouageFemelle}`,
        message: `${quand} · Préparez la cage maternité`,
        lien: '/naissances',
        lienLabel: 'Naissances',
      });
    });

  // 3. SEVRAGES À FAIRE
  //    Gestantes/mise-bas terminée dont la date de sevrage est passée ou dans ≤ 2 jours
  saillies
    .filter(s => (s.statut === 'Gestante' || s.statut === 'Mise-bas terminée') && diffJours(s.dateSevrage) <= 2)
    .forEach(s => {
      const j = diffJours(s.dateSevrage);
      const quand = j === 0 ? "aujourd'hui" : j < 0 ? `en retard de ${Math.abs(j)}j` : `dans ${j}j`;
      alertes.push({
        id: `sevrage-${s.id}`,
        niveau: j < 0 ? 'danger' : 'info',
        titre: `Sevrage — ${s.tatouageFemelle}`,
        message: `${quand} · Portée du ${fmt(s.dateMiseBas)}`,
        lien: '/naissances',
        lienLabel: 'Naissances',
      });
    });

  // 4. STOCKS CRITIQUES
  stocks
    .filter(s => s.seuilAlerte > 0 && s.quantiteKg <= s.seuilAlerte)
    .forEach(s => {
      const pct = Math.round((s.quantiteKg / s.seuilAlerte) * 100);
      alertes.push({
        id: `stock-${s.id}`,
        niveau: s.quantiteKg === 0 ? 'danger' : 'warning',
        titre: `Stock critique — ${s.type}`,
        message: `${s.quantiteKg} kg restants · seuil ${s.seuilAlerte} kg · Réapprovisionner`,
        lien: '/provende',
        lienLabel: 'Provende',
      });
    });

  // 5. RATIO MÂLE/FEMELLES
  if (males.length > 0 && femelles.length > 0) {
    const ratio = femelles.length / males.length;
    if (ratio < 5) {
      alertes.push({
        id: 'ratio-males',
        niveau: 'info',
        titre: `Ratio mâles/femelles déséquilibré`,
        message: `${males.length}♂ pour ${femelles.length}♀ (1:${ratio.toFixed(1)}) · Optimal : 1♂ pour 7–10♀`,
        lien: '/cheptel',
        lienLabel: 'Cheptel',
      });
    }
  }

  // 6. ALERTE CHALEUR (injectée depuis le widget météo via callback)
  if (alerteChaleur !== null && alerteChaleur >= 32) {
    const conseil = alerteChaleur >= 38
      ? "Refroidissement d'urgence : eau froide sur les oreilles, ventilateur direct, ombrage total."
      : alerteChaleur >= 34
      ? "Doublez l'eau fraîche, mouillez les toitures, suspendez les saillies."
      : "Augmentez l'apport en eau, mouillez les oreilles, renforcez la ventilation.";
    alertes.push({
      id: 'chaleur',
      niveau: alerteChaleur >= 34 ? 'danger' : 'warning',
      titre: `Chaleur — ${alerteChaleur}°C prévus`,
      message: conseil,
      lien: '/',
      lienLabel: 'Météo',
    });
  }

  // 7. CHEPTEL VIDE
  if (actifs.length === 0) {
    alertes.push({
      id: 'cheptel-vide',
      niveau: 'info',
      titre: 'Cheptel vide',
      message: 'Ajoutez vos premiers lapins pour activer le suivi automatique',
      lien: '/cheptel',
      lienLabel: 'Cheptel',
    });
  }

  // Trier : danger d'abord, puis warning, puis info
  const ordre: NiveauAlerte[] = ['danger', 'warning', 'info'];
  alertes.sort((a, b) => ordre.indexOf(a.niveau) - ordre.indexOf(b.niveau));

  // Prochaine action urgente (pour le bandeau résumé)
  const prochaineAction = saillies
    .filter(s => s.statut === 'En attente' || s.statut === 'Gestante')
    .map(s => {
      const d = s.statut === 'En attente' ? s.datePalpation : s.dateMiseBas;
      return { label: s.statut === 'En attente' ? `Palpation ${s.tatouageFemelle}` : `Mise-bas ${s.tatouageFemelle}`, date: d, j: diffJours(d) };
    })
    .filter(a => a.j >= 0)
    .sort((a, b) => a.j - b.j)[0];

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">

      {/* ── Modale scanner QR ─────────────────────────────────────────────── */}
      {scannerOuvert && <ScannerModal onClose={() => setScannerOuvert(false)} />}

      {/* ── FAB Scanner ───────────────────────────────────────────────────── */}
      <button
        onClick={() => setScannerOuvert(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-indigo-700 active:scale-95 active:opacity-90 transition-all"
        aria-label="Scanner un QR Code lapin"
        title="Scanner un QR Code"
      >
        📷
      </button>

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <header className="mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Tableau de Bord</h1>
        <p className="text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {/* ── Prochaine échéance ──────────────────────────────────────────── */}
      {prochaineAction && (
        <div className="bg-indigo-600 text-white rounded-2xl p-4 mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Prochaine échéance</p>
            <p className="font-bold text-lg">{prochaineAction.label}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-extrabold">{prochaineAction.j}j</p>
            <p className="text-indigo-200 text-xs">{fmt(prochaineAction.date)}</p>
          </div>
        </div>
      )}

      {/* ── Cartes stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard titre="Cheptel actif"   valeur={actifs.length}        sous={`${males.length}♂  ${femelles.length}♀`}  couleur="text-indigo-600"  href="/cheptel" />
        <StatCard titre="Reproducteurs"   valeur={reproducteurs.length} sous={`${gestantes.length} gestante${gestantes.length > 1 ? 's' : ''}`}    couleur="text-emerald-600" href="/cheptel" />
        <StatCard titre="En engraissement" valeur={engraissement.length} couleur="text-amber-600"  href="/cheptel" />
        <StatCard titre="Soins enregistrés" valeur={totalSoins}          couleur="text-blue-600"    href="/cheptel" />
      </div>

      {/* ── Contenu principal ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Alertes intelligentes */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-base font-bold text-gray-800">
              Alertes actives
              {alertes.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{alertes.length}</span>
              )}
            </h2>
          </div>

          {alertes.length === 0 ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
              <p className="text-3xl mb-2">✅</p>
              <p className="font-bold text-green-800">Tout est sous contrôle !</p>
              <p className="text-green-600 text-sm mt-1">Aucune action urgente détectée.</p>
            </div>
          ) : (
            alertes.map(a => <CarteAlerte key={a.id} alerte={a} />)
          )}
        </div>

        {/* Panneau latéral */}
        <div className="space-y-4">

          {/* Widget météo */}
          <MeteoWidget onChaleurExtrême={handleChaleur} />

          {/* Suivi reproduction */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Reproduction en cours</h3>
            {saillies.filter(s => s.statut !== 'Mise-bas terminée' && s.statut !== 'Vide').length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucune saillie active.</p>
            ) : (
              <div className="space-y-2">
                {saillies
                  .filter(s => s.statut !== 'Mise-bas terminée' && s.statut !== 'Vide')
                  .slice(0, 5)
                  .map(s => {
                    const prochaine = s.statut === 'En attente' ? s.datePalpation : s.dateMiseBas;
                    const j = diffJours(prochaine);
                    const label = s.statut === 'En attente' ? 'Palpation' : 'Mise-bas';
                    const couleur = j < 0 ? 'text-red-600' : j <= 3 ? 'text-amber-600' : 'text-gray-500';
                    return (
                      <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-gray-800">{s.tatouageFemelle}</p>
                          <p className="text-[10px] text-gray-400">{label}</p>
                        </div>
                        <span className={`text-xs font-extrabold ${couleur}`}>
                          {j === 0 ? "Auj." : j < 0 ? `−${Math.abs(j)}j` : `+${j}j`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
            <Link href="/naissances" className="block text-center text-xs font-bold text-indigo-600 mt-3 hover:underline">
              Voir toutes les reproductions →
            </Link>
          </div>

          {/* Stocks */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Stocks provende</h3>
            {stocks.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Aucun stock enregistré.</p>
            ) : (
              <div className="space-y-2">
                {stocks.slice(0, 5).map(s => {
                  const pct = s.seuilAlerte > 0 ? Math.min(100, Math.round((s.quantiteKg / (s.seuilAlerte * 3)) * 100)) : 50;
                  const critique = s.seuilAlerte > 0 && s.quantiteKg <= s.seuilAlerte;
                  return (
                    <div key={s.id}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-medium ${critique ? 'text-red-600' : 'text-gray-700'}`}>{s.type}</span>
                        <span className="font-bold text-gray-800">{s.quantiteKg} kg</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-colors ${critique ? 'bg-red-400' : 'bg-emerald-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Link href="/provende" className="block text-center text-xs font-bold text-indigo-600 mt-3 hover:underline">
              Gérer la provende →
            </Link>
          </div>

          {/* Rappels push */}
          <NotifWidget />

          {/* Répartition sexes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Répartition du cheptel</h3>
            <div className="space-y-3">
              {[
                { label: 'Mâles', count: males.length, color: 'bg-blue-400' },
                { label: 'Femelles', count: femelles.length, color: 'bg-purple-400' },
              ].map(({ label, count, color }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${color} h-full rounded-full`}
                      style={{ width: `${actifs.length > 0 ? (count / actifs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
