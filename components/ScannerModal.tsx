"use client";

import { useState, useCallback, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { useRouter } from 'next/navigation';

interface Props { onClose: () => void; }

// Sous-type structurel — compatible IDetectedBarcode de la lib sans import fragile
interface DetectedCode { rawValue: string; }

type Etat = 'scanning' | 'found' | 'not_found' | 'error';

export default function ScannerModal({ onClose }: Props) {
  const router = useRouter();
  const [etat, setEtat] = useState<Etat>('scanning');
  const [erreurMsg, setErreurMsg] = useState('');

  // ── Détection QR ──────────────────────────────────────────────────────────
  const handleScan = useCallback((codes: DetectedCode[]) => {
    if (etat !== 'scanning' || codes.length === 0) return;

    const id = codes[0].rawValue.trim();
    const cheptel: Array<{ id: string }> = JSON.parse(
      localStorage.getItem('ferme_cheptel') || '[]'
    );

    if (cheptel.some(l => l.id === id)) {
      setEtat('found');
      // Laisse le temps d'afficher le feedback visuel avant de rediriger
      setTimeout(() => { onClose(); router.push(`/lapin/${id}`); }, 700);
    } else {
      setEtat('not_found');
    }
  }, [etat, onClose, router]);

  // ── Erreurs caméra ────────────────────────────────────────────────────────
  const handleError = useCallback((error: unknown) => {
    const name = error instanceof Error ? error.name : '';
    const MESSAGES: Record<string, string> = {
      NotAllowedError:  "Accès à la caméra refusé.\nAutorisez la caméra dans les paramètres du navigateur puis rechargez.",
      NotFoundError:    "Aucune caméra détectée sur cet appareil.",
      NotReadableError: "La caméra est déjà utilisée par une autre application.",
    };
    setErreurMsg(MESSAGES[name] ?? `Erreur : ${error instanceof Error ? error.message : 'inconnue'}`);
    setEtat('error');
  }, []);

  // ── Fermeture clavier ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* ── Barre titre ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">📷</span>
          <p className="text-white font-bold text-sm">Scanner un QR Code lapin</p>
        </div>
        <button
          onClick={onClose}
          className="bg-white/10 text-white font-bold px-4 py-2 rounded-xl text-sm active:opacity-75 hover:bg-white/20 transition-colors"
        >
          ✕ Fermer
        </button>
      </div>

      {/* ── Zone caméra / états ── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Caméra active — démonté automatiquement pour libérer le stream */}
        {etat === 'scanning' && (
          <>
            <Scanner
              onScan={handleScan}
              onError={handleError}
              constraints={{ facingMode: 'environment' }}
              formats={['qr_code']}
              styles={{ container: { width: '100%', height: '100%' } }}
              components={{ torch: true, finder: true }}
            />
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-black/60 backdrop-blur-sm text-white text-xs px-5 py-2.5 rounded-full">
                Pointez la caméra vers le QR Code sur la cage
              </div>
            </div>
          </>
        )}

        {/* ✅ QR détecté — feedback avant redirection */}
        {etat === 'found' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-xl mx-6">
              <p className="text-5xl mb-3">✅</p>
              <p className="font-extrabold text-gray-900 text-lg">QR détecté !</p>
              <p className="text-gray-500 text-sm mt-1">Ouverture de la fiche lapin…</p>
            </div>
          </div>
        )}

        {/* 🔍 Lapin introuvable */}
        {etat === 'not_found' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6">
            <div className="max-w-xs mx-auto text-center">
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-white font-bold text-xl mb-2">Lapin introuvable</p>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Ce QR code ne correspond à aucun animal de votre cheptel.
                Il a peut-être été supprimé ou vient d&apos;un autre élevage.
              </p>
              <button
                onClick={() => setEtat('scanning')}
                className="w-full mb-3 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm active:opacity-75 transition-colors"
              >
                🔄 Réessayer
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/10 text-white font-bold text-sm active:opacity-75"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* 📵 Erreur caméra */}
        {etat === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 p-6">
            <div className="max-w-xs mx-auto text-center">
              <p className="text-6xl mb-4">📵</p>
              <p className="text-white font-bold text-xl mb-2">Caméra inaccessible</p>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed whitespace-pre-line">
                {erreurMsg}
              </p>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-white text-gray-900 font-bold text-sm active:opacity-75"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
