"use client";
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeteoData {
  tempC: number;
  ressentiC: number;
  humidite: number;
  vent: number;
  description: string;
  maxC: number;
  minC: number;
  ville: string;
  pays: string;
  horodatage: number; // timestamp ms pour le cache
}

interface Props {
  onChaleurExtrême?: (tempMax: number) => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CACHE_KEY   = "ferme_meteo_cache";
const CONFIG_KEY  = "ferme_config";
const CACHE_DUREE = 30 * 60 * 1000; // 30 minutes
const SEUIL_ALERTE = 32; // °C — critique pour les lapins

// ─── Helpers ─────────────────────────────────────────────────────────────────

const chargerVille = (): string => {
  try {
    const cfg = localStorage.getItem(CONFIG_KEY);
    return cfg ? JSON.parse(cfg).ville || "" : "";
  } catch { return ""; }
};

const sauvegarderVille = (ville: string) => {
  try {
    const cfg = localStorage.getItem(CONFIG_KEY);
    const base = cfg ? JSON.parse(cfg) : {};
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...base, ville }));
  } catch { /**/ }
};

const chargerCache = (): MeteoData | null => {
  try {
    const c = localStorage.getItem(CACHE_KEY);
    if (!c) return null;
    const data: MeteoData = JSON.parse(c);
    if (Date.now() - data.horodatage > CACHE_DUREE) return null;
    return data;
  } catch { return null; }
};

const sauvegarderCache = (data: MeteoData) => {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /**/ }
};

const conseilsChaleur = (t: number): { icone: string; couleur: string; msg: string } => {
  if (t >= 38) return {
    icone: "🔥",
    couleur: "bg-red-600 text-white border-red-700",
    msg: "DANGER VITAL — Refroidissement d'urgence : eau froide sur les oreilles, ventilateur direct, ombrage total. Mortalité possible.",
  };
  if (t >= 34) return {
    icone: "⚠️",
    couleur: "bg-orange-500 text-white border-orange-600",
    msg: "Chaleur critique — Doublez l'eau fraîche, mouillez les toitures, évitez toute manipulation. Suspendez les saillies.",
  };
  return {
    icone: "🌡️",
    couleur: "bg-amber-400 text-amber-900 border-amber-500",
    msg: "Chaleur élevée — Augmentez l'apport en eau, mouillez les oreilles des lapins, renforcez la ventilation.",
  };
};

// ─── Composant ───────────────────────────────────────────────────────────────

export default function MeteoWidget({ onChaleurExtrême }: Props) {
  const [meteo, setMeteo]           = useState<MeteoData | null>(null);
  const [ville, setVille]           = useState("");
  const [villeInput, setVilleInput] = useState("");
  const [editMode, setEditMode]     = useState(false);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur]         = useState("");
  const [depuisCache, setDepuisCache] = useState(false);

  // ── Chargement météo via wttr.in (pas de clé API requise) ─────────────────
  const fetchMeteo = useCallback(async (nomVille: string, forcer = false) => {
    if (!nomVille.trim()) return;

    // Vérifie le cache d'abord (sauf si on force le rechargement)
    if (!forcer) {
      const cached = chargerCache();
      if (cached) {
        setMeteo(cached);
        setDepuisCache(true);
        if (cached.maxC >= SEUIL_ALERTE) onChaleurExtrême?.(cached.maxC);
        return;
      }
    }

    setChargement(true);
    setErreur("");
    setDepuisCache(false);

    try {
      // wttr.in : API météo gratuite, sans clé, données OpenStreetMap + OpenWeatherMap
      const res = await fetch(
        `https://wttr.in/${encodeURIComponent(nomVille.trim())}?format=j1`,
        { signal: AbortSignal.timeout(8000) }
      );

      if (!res.ok) throw new Error("Ville introuvable");

      const json = await res.json();
      const cond   = json.current_condition?.[0];
      const auj    = json.weather?.[0];
      const zone   = json.nearest_area?.[0];

      if (!cond) throw new Error("Données indisponibles");

      const data: MeteoData = {
        tempC:      parseInt(cond.temp_C),
        ressentiC:  parseInt(cond.FeelsLikeC),
        humidite:   parseInt(cond.humidity),
        vent:       parseInt(cond.windspeedKmph),
        description: cond.weatherDesc?.[0]?.value || "",
        maxC:       parseInt(auj?.maxtempC || cond.temp_C),
        minC:       parseInt(auj?.mintempC || cond.temp_C),
        ville:      zone?.areaName?.[0]?.value || nomVille,
        pays:       zone?.country?.[0]?.value || "",
        horodatage: Date.now(),
      };

      sauvegarderCache(data);
      setMeteo(data);
      if (data.maxC >= SEUIL_ALERTE) onChaleurExtrême?.(data.maxC);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur réseau";
      // Si erreur réseau → tenter le cache périmé
      const stale = localStorage.getItem(CACHE_KEY);
      if (stale) {
        const parsed: MeteoData = JSON.parse(stale);
        setMeteo(parsed);
        setDepuisCache(true);
        setErreur("Réseau indisponible — données en cache");
      } else {
        setErreur(msg === "Ville introuvable" ? "Ville non trouvée, vérifiez l'orthographe." : "Pas de réseau. Saisissez votre ville dès que possible.");
      }
    } finally {
      setChargement(false);
    }
  }, [onChaleurExtrême]);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const v = chargerVille();
    if (v) {
      setVille(v);
      setVilleInput(v);
      fetchMeteo(v);
    } else {
      setEditMode(true); // Aucune ville → on affiche le champ de saisie
    }
  }, [fetchMeteo]);

  const validerVille = () => {
    if (!villeInput.trim()) return;
    sauvegarderVille(villeInput.trim());
    setVille(villeInput.trim());
    setEditMode(false);
    fetchMeteo(villeInput.trim(), true);
  };

  // ── Affichage ─────────────────────────────────────────────────────────────

  const ageCache = meteo
    ? Math.round((Date.now() - meteo.horodatage) / 60_000)
    : 0;

  const iconeMeteo = (desc: string): string => {
    const d = desc.toLowerCase();
    if (d.includes("thunder") || d.includes("orage")) return "⛈️";
    if (d.includes("rain") || d.includes("pluie") || d.includes("drizzle")) return "🌧️";
    if (d.includes("cloud") || d.includes("nuage") || d.includes("overcast")) return "☁️";
    if (d.includes("fog") || d.includes("mist") || d.includes("brume")) return "🌫️";
    if (d.includes("snow") || d.includes("neige")) return "❄️";
    if (d.includes("partly")) return "⛅";
    return "☀️";
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">🌤️</span>
          <span className="text-white font-bold text-sm">Météo locale</span>
          {depuisCache && (
            <span className="bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded font-medium">
              cache {ageCache}min
            </span>
          )}
        </div>
        <button
          onClick={() => { setEditMode(!editMode); setVilleInput(ville); }}
          className="text-white/70 hover:text-white text-xs transition-colors"
          title="Changer de ville"
        >
          ✏️
        </button>
      </div>

      <div className="p-4">

        {/* ── Saisie de ville ─────────────────────────────────────────── */}
        {editMode ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={villeInput}
              onChange={e => setVilleInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && validerVille()}
              placeholder="Ex: Cotonou, Dakar, Abidjan…"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-300"
              autoFocus
            />
            <button
              onClick={validerVille}
              disabled={!villeInput.trim() || chargement}
              className="bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-sky-600 disabled:opacity-50"
            >
              OK
            </button>
          </div>
        ) : chargement ? (
          <div className="flex items-center gap-2 py-2 text-gray-400 text-xs">
            <span className="animate-spin inline-block">⟳</span>
            Chargement météo…
          </div>
        ) : erreur && !meteo ? (
          <div className="text-xs text-gray-500 italic py-2">{erreur}</div>
        ) : meteo ? (
          <>
            {/* ── Données météo ──────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">
                  {meteo.tempC}°C
                  <span className="text-xs font-normal text-gray-400 ml-1">ressenti {meteo.ressentiC}°C</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">{meteo.description}</p>
                <p className="text-[10px] text-gray-400">{meteo.ville}{meteo.pays ? `, ${meteo.pays}` : ""}</p>
              </div>
              <span className="text-4xl">{iconeMeteo(meteo.description)}</span>
            </div>

            {/* Min/Max du jour */}
            <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500 mb-3">
              <div className="bg-gray-50 rounded-lg py-1.5">
                <p className="font-bold text-gray-800">↑ {meteo.maxC}°</p>
                <p>Max</p>
              </div>
              <div className="bg-gray-50 rounded-lg py-1.5">
                <p className="font-bold text-gray-800">↓ {meteo.minC}°</p>
                <p>Min</p>
              </div>
              <div className="bg-gray-50 rounded-lg py-1.5">
                <p className="font-bold text-gray-800">{meteo.humidite}%</p>
                <p>Humidité</p>
              </div>
            </div>

            {/* ── Alerte chaleur lapins ─────────────────────────────── */}
            {meteo.maxC >= SEUIL_ALERTE && (() => {
              const c = conseilsChaleur(meteo.maxC);
              return (
                <div className={`rounded-xl p-3 border text-xs ${c.couleur}`}>
                  <p className="font-extrabold mb-1">{c.icone} Alerte élevage — {meteo.maxC}°C</p>
                  <p className="leading-relaxed opacity-90">{c.msg}</p>
                </div>
              );
            })()}

            {/* Bouton refresh */}
            <button
              onClick={() => fetchMeteo(ville, true)}
              className="mt-2 w-full text-[10px] text-gray-400 hover:text-sky-500 transition-colors text-center"
            >
              ↺ Actualiser
            </button>

            {erreur && (
              <p className="text-[10px] text-amber-500 mt-1 text-center">{erreur}</p>
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400 italic py-2">
            Renseignez votre ville pour afficher la météo locale.
          </p>
        )}
      </div>
    </div>
  );
}
