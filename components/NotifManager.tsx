"use client";

/**
 * NotifManager — Rappels automatiques pour l'éleveur
 *
 * Stratégie 100% hors-ligne :
 *  - Demande la permission une seule fois, avec un bandeau non-intrusif
 *  - À chaque ouverture / retour sur l'app, scanne les données localStorage
 *  - Envoie des notifications navigateur pour les événements du jour et demain
 *  - Stocke les IDs déjà notifiés (par date) pour ne pas répéter
 */

import { useEffect, useState, useCallback } from "react";

const NOTIFS_VUES_KEY   = "ferme_notifs_vues";   // { "YYYY-MM-DD": string[] }
const PERMISSION_KEY     = "ferme_notif_refus";   // "1" si l'éleveur a dit non
const NOTIF_ICON         = "/icons/icon-192.svg";

// ── Types minimaux pour lire localStorage ─────────────────────────────────────
interface Lapin  { id: string; tatouage: string; statut?: string; }
interface Saillie {
  id: string; tatouageFemelle: string; tatouageMale: string;
  datePalpation: string; dateMiseBas: string; dateSevrage: string;
  statut: string;
}
interface Stock  { id: string; ingredient: string; quantite: number; seuilAlerte: number; }

// ── Helpers date ───────────────────────────────────────────────────────────────
function today(): string { return new Date().toISOString().split("T")[0]; }
function tomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}
function fmt(s: string) {
  if (!s) return "—";
  const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`;
}
function diffJours(dateStr: string): number {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

// ── Génère la liste des alertes du jour ───────────────────────────────────────
interface Alerte { id: string; titre: string; corps: string; lien: string; }

function genererAlertes(): Alerte[] {
  const alertes: Alerte[] = [];
  const td = today();
  const tm = tomorrow();

  try {
    const cheptel: Lapin[]  = JSON.parse(localStorage.getItem("ferme_cheptel")  || "[]");
    const saillies: Saillie[] = JSON.parse(localStorage.getItem("ferme_reproduction") || "[]");
    const stocks: Stock[]   = JSON.parse(localStorage.getItem("ferme_stocks_v2") || "[]");

    // Palpations
    for (const s of saillies) {
      if (s.statut !== "En attente") continue;
      if (s.datePalpation === td) {
        alertes.push({
          id: `palpation-${s.id}-${td}`,
          titre: "🔬 Palpation aujourd'hui",
          corps: `♀ ${s.tatouageFemelle} × ♂ ${s.tatouageMale} — Vérifiez la gestation`,
          lien: "/naissances",
        });
      } else if (s.datePalpation === tm) {
        alertes.push({
          id: `palpation-dem-${s.id}-${td}`,
          titre: "🔬 Palpation demain",
          corps: `♀ ${s.tatouageFemelle} × ♂ ${s.tatouageMale} — Préparez-vous`,
          lien: "/naissances",
        });
      }
    }

    // Mises-bas
    for (const s of saillies) {
      if (s.statut !== "Gestante") continue;
      const diff = diffJours(s.dateMiseBas);
      if (diff === 0) {
        alertes.push({
          id: `misebas-${s.id}-${td}`,
          titre: "🍼 Mise-bas prévue aujourd'hui !",
          corps: `♀ ${s.tatouageFemelle} — Préparez la maternité`,
          lien: "/naissances",
        });
      } else if (diff === 1) {
        alertes.push({
          id: `misebas-dem-${s.id}-${td}`,
          titre: "🍼 Mise-bas demain",
          corps: `♀ ${s.tatouageFemelle} — Vérifiez le nid et les matériaux`,
          lien: "/naissances",
        });
      } else if (diff === 3) {
        alertes.push({
          id: `misebas-j3-${s.id}-${td}`,
          titre: "🍼 Mise-bas dans 3 jours",
          corps: `♀ ${s.tatouageFemelle} — Préparez la caisse à nid`,
          lien: "/naissances",
        });
      }
    }

    // Sevrages
    for (const s of saillies) {
      if (s.statut !== "Mise-bas terminée") continue;
      const diff = diffJours(s.dateSevrage);
      if (diff === 0) {
        alertes.push({
          id: `sevrage-${s.id}-${td}`,
          titre: "✂️ Sevrage aujourd'hui",
          corps: `Portée de ♀ ${s.tatouageFemelle} — Séparez les jeunes de la mère`,
          lien: "/naissances",
        });
      } else if (diff === 2) {
        alertes.push({
          id: `sevrage-j2-${s.id}-${td}`,
          titre: "✂️ Sevrage dans 2 jours",
          corps: `Portée de ♀ ${s.tatouageFemelle} — Préparez les cages`,
          lien: "/naissances",
        });
      }
    }

    // Stocks critiques
    for (const stock of stocks) {
      if (stock.quantite > 0 && stock.seuilAlerte > 0 && stock.quantite <= stock.seuilAlerte) {
        alertes.push({
          id: `stock-${stock.id}-${td}`,
          titre: "⚠️ Stock critique",
          corps: `${stock.ingredient} : il ne reste que ${stock.quantite} kg — Réapprovisionner`,
          lien: "/provende",
        });
      }
    }

    // Cheptel vide
    if (cheptel.length === 0) {
      alertes.push({
        id: `cheptel-vide-${td}`,
        titre: "🐇 Cheptel vide",
        corps: "Aucun lapin enregistré. Commencez par ajouter votre cheptel.",
        lien: "/cheptel",
      });
    }

  } catch {
    // Si localStorage inaccessible, on ne plante pas
  }

  return alertes;
}

// ── Envoi d'une notification via le SW (meilleure compatibilité mobile) ────────
async function envoyerNotif(alerte: Alerte) {
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(alerte.titre, {
      body:  alerte.corps,
      icon:  NOTIF_ICON,
      badge: NOTIF_ICON,
      tag:   alerte.id,           // remplace une notif existante avec le même tag
      data:  { lien: alerte.lien },
      requireInteraction: false,
    });
  } else {
    new Notification(alerte.titre, {
      body: alerte.corps,
      icon: NOTIF_ICON,
      tag:  alerte.id,
    });
  }
}

// ── Marquer des alertes comme vues (pour ne pas répéter) ─────────────────────
function marquerVues(ids: string[]) {
  try {
    const store: Record<string, string[]> = JSON.parse(localStorage.getItem(NOTIFS_VUES_KEY) || "{}");
    const td = today();
    store[td] = [...new Set([...(store[td] || []), ...ids])];
    // On garde seulement les 7 derniers jours pour ne pas polluer localStorage
    const cles = Object.keys(store).sort().slice(-7);
    const propre: Record<string, string[]> = {};
    for (const k of cles) propre[k] = store[k];
    localStorage.setItem(NOTIFS_VUES_KEY, JSON.stringify(propre));
  } catch {}
}

function dejaVues(ids: string[]): string[] {
  try {
    const store: Record<string, string[]> = JSON.parse(localStorage.getItem(NOTIFS_VUES_KEY) || "{}");
    const td = today();
    const vues = store[td] || [];
    return ids.filter(id => vues.includes(id));
  } catch { return []; }
}

// ── Composant principal ────────────────────────────────────────────────────────
export default function NotifManager() {
  const [monted, setMonted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [bandeauVisible, setBandeauVisible] = useState(false);
  const [notifEnvoyees, setNotifEnvoyees] = useState(0);

  // Montage client uniquement
  useEffect(() => { setMonted(true); }, []);

  // Vérifie la permission au montage
  useEffect(() => {
    if (!monted || !("Notification" in window)) return;
    const refus = localStorage.getItem(PERMISSION_KEY);
    if (refus) return; // L'éleveur a explicitement refusé — on n'insiste plus
    setPermission(Notification.permission);
    if (Notification.permission === "default") {
      // Attend 3 secondes avant d'afficher le bandeau (UX : pas intrusif au chargement)
      const t = setTimeout(() => setBandeauVisible(true), 3000);
      return () => clearTimeout(t);
    }
  }, []);

  // Scan et envoi des alertes
  const scanEtNotifier = useCallback(async () => {
    if (Notification.permission !== "granted") return;
    const alertes = genererAlertes();
    if (!alertes.length) return;
    const vues = dejaVues(alertes.map(a => a.id));
    const nouvelles = alertes.filter(a => !vues.includes(a.id));
    if (!nouvelles.length) return;

    // On envoie toutes les nouvelles alertes (max 5 pour ne pas spammer)
    const aEnvoyer = nouvelles.slice(0, 5);
    for (const alerte of aEnvoyer) {
      await envoyerNotif(alerte);
    }
    marquerVues(aEnvoyer.map(a => a.id));
    setNotifEnvoyees(aEnvoyer.length);
  }, [monted]);

  // Scan au montage si permission déjà accordée
  useEffect(() => {
    if (!monted) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      scanEtNotifier();
    }
  }, [monted, scanEtNotifier]);

  // Scan quand l'app repasse au premier plan (éleveur revient sur l'app)
  useEffect(() => {
    const handler = () => { if (!document.hidden) scanEtNotifier(); };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [scanEtNotifier]);

  const demanderPermission = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
    setBandeauVisible(false);
    if (result === "denied") {
      localStorage.setItem(PERMISSION_KEY, "1");
    } else if (result === "granted") {
      scanEtNotifier();
    }
  };

  const refuserDefinitivement = () => {
    localStorage.setItem(PERMISSION_KEY, "1");
    setBandeauVisible(false);
  };

  if (!monted || typeof window === "undefined" || !("Notification" in window)) return null;

  return (
    <>
      {/* ── Bandeau demande de permission ─────────────────────────────────── */}
      {bandeauVisible && permission === "default" && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-[9996] w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-zinc-900 text-white rounded-2xl shadow-2xl p-4">
            <div className="flex gap-3 items-start mb-3">
              <span className="text-2xl shrink-0">🔔</span>
              <div>
                <p className="font-bold text-sm">Activer les rappels ?</p>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Recevez un rappel chaque matin pour les palpations, mises-bas, sevrages et stocks critiques — même si l'app est fermée.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={refuserDefinitivement}
                className="flex-1 py-2 rounded-xl text-zinc-400 text-xs font-bold border border-zinc-700 hover:bg-zinc-800"
              >
                Non merci
              </button>
              <button
                onClick={demanderPermission}
                className="flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all"
              >
                ✅ Activer les rappels
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirmation discrète quand des notifs ont été envoyées ──────── */}
      {notifEnvoyees > 0 && (
        <div
          className="fixed top-12 left-1/2 -translate-x-1/2 z-[9996] bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg transition-all"
          onClick={() => setNotifEnvoyees(0)}
        >
          🔔 {notifEnvoyees} rappel{notifEnvoyees > 1 ? "s" : ""} envoyé{notifEnvoyees > 1 ? "s" : ""}
        </div>
      )}
    </>
  );
}
