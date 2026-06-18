import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PwaProvider from "@/components/PwaProvider";
import NotifManager from "@/components/NotifManager";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coolélevage",
  description: "Application de gestion d'élevage cunicole — fonctionne sans internet",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Coolélevage" },
  icons: { icon: "/icons/icon-192.svg", apple: "/icons/icon-192.svg" },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const NAV_LINKS = [
  { href: "/",             icon: "📊", label: "Bord"      },
  { href: "/cheptel",      icon: "🐇", label: "Cheptel"   },
  { href: "/naissances",   icon: "🍼", label: "Repro"     },
  { href: "/provende",     icon: "🌾", label: "Provende"  },
  { href: "/performances", icon: "📈", label: "Perfs"     },
  { href: "/genealogie",   icon: "🌳", label: "Généal"    },
  { href: "/export",       icon: "📤", label: "Export"    },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body style={{ fontFamily: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" }}>
        <PwaProvider />
        <NotifManager />

        {/* ── Wrapper global ──────────────────────────────────────────────── */}
        <div className="flex h-screen bg-gray-100">

          {/* ── Sidebar — visible uniquement ≥ md ────────────────────────── */}
          <aside className="hidden md:flex w-64 bg-zinc-900 text-white flex-col shadow-xl shrink-0">
            <div className="p-5 border-b border-zinc-800">
              <h2 className="text-xl font-bold tracking-tight">Coolélevage</h2>
              <p className="text-zinc-500 text-[10px] mt-0.5">Fonctionne sans internet 📵</p>
            </div>

            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_LINKS.map(({ href, icon, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-3 py-2.5 px-3 rounded-lg transition-colors hover:bg-zinc-800 font-medium text-sm"
                >
                  <span className="text-base">{icon}</span>
                  <span>{
                    label === "Bord"    ? "Tableau de bord"     :
                    label === "Repro"   ? "Naissances & Sevrage":
                    label === "Généal"  ? "Généalogie"          :
                    label === "Export"  ? "Export & Rapports"   :
                    label
                  }</span>
                </Link>
              ))}
            </nav>

            <div className="p-3 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
              v1.0 · Données locales
            </div>
          </aside>

          {/* ── Contenu principal ─────────────────────────────────────────── */}
          {/* pb-20 sur mobile pour éviter que le contenu passe sous la bottom nav */}
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>

        {/* ── Bottom Navigation — visible uniquement < md ───────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-700 safe-area-pb">
          <div className="flex items-stretch h-16">
            {NAV_LINKS.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 text-zinc-400 hover:text-white active:text-indigo-400 transition-colors min-w-0 px-1"
              >
                <span className="text-xl leading-none">{icon}</span>
                <span className="text-[9px] font-medium leading-none truncate w-full text-center">{label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </body>
    </html>
  );
}