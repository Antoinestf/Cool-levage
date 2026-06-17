"use client";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaProvider() {
  const [estHorsLigne, setEstHorsLigne] = useState(false);
  const [promptInstall, setPromptInstall] = useState<BeforeInstallPromptEvent | null>(null);
  const [installee, setInstallee]         = useState(false);
  const [swActif, setSwActif]             = useState(false);

  // ── Enregistrement du Service Worker ──────────────────────────────────────
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          setSwActif(true);
          // Vérifie les mises à jour toutes les 60 secondes quand en ligne
          setInterval(() => reg.update(), 60_000);
        })
        .catch(() => {/* SW non supporté sur cet appareil */});
    }
  }, []);

  // ── Détection Online / Offline ─────────────────────────────────────────────
  useEffect(() => {
    const aller    = () => setEstHorsLigne(false);
    const partir   = () => setEstHorsLigne(true);

    setEstHorsLigne(!navigator.onLine);
    window.addEventListener("online",  aller);
    window.addEventListener("offline", partir);
    return () => {
      window.removeEventListener("online",  aller);
      window.removeEventListener("offline", partir);
    };
  }, []);

  // ── Capturer le prompt d'installation (Android Chrome) ────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPromptInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Détecter si l'app est déjà installée (mode standalone)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstallee(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const installerApp = async () => {
    if (!promptInstall) return;
    await promptInstall.prompt();
    const { outcome } = await promptInstall.userChoice;
    if (outcome === "accepted") {
      setInstallee(true);
      setPromptInstall(null);
    }
  };

  return (
    <>
      {/* ── Bandeau Hors-Ligne ─────────────────────────────────────────────── */}
      <div
        className={`
          fixed top-0 left-0 right-0 z-[9999]
          flex items-center justify-center gap-2
          px-4 py-2 text-xs font-bold text-white
          transition-transform duration-300 ease-in-out
          ${estHorsLigne ? "translate-y-0 bg-amber-500" : "-translate-y-full bg-emerald-500"}
        `}
        role="status"
        aria-live="polite"
      >
        {estHorsLigne ? (
          <>
            <span className="animate-pulse">📵</span>
            Mode hors-ligne — Vos données sont sauvegardées localement
          </>
        ) : (
          <>
            <span>✅</span>
            Connexion rétablie
          </>
        )}
      </div>

      {/* ── Bouton d'installation (Android/Chrome) ────────────────────────── */}
      {promptInstall && !installee && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9998] w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-indigo-700 text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">📲</span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">Installer l'application</p>
              <p className="text-indigo-200 text-xs">Fonctionne sans internet</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setPromptInstall(null)}
                className="text-indigo-300 hover:text-white text-xs px-2 py-1"
              >
                Plus tard
              </button>
              <button
                onClick={installerApp}
                className="bg-white text-indigo-700 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-50"
              >
                Installer
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
