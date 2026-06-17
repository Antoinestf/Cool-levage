"use client";

import { useState, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Ingredient {
  nom: string;
  quantite: number;
  note?: string;
}

interface Recette {
  id: string;
  nom: string;
  description?: string;
  ingredients: Ingredient[];
}

interface Stock {
  id: string;
  type: string;
  quantiteKg: number;
  seuilAlerte: number;
}

// ─── Base de prix par région (FCFA/kg ou équivalent) ─────────────────────────

type ZonePrix = "afrique_ouest" | "afrique_nord" | "afrique_est" | "afrique_centrale";

interface PrixIngredient {
  min: number;
  max: number;
  devise: string;
  note?: string;
}

const PRIX_PAR_ZONE: Record<ZonePrix, Record<string, PrixIngredient>> = {
  // ── Afrique de l'Ouest — FCFA/kg ─────────────────────────────────────────
  // Sources : SIMAGRI CI, Le Rural Bénin, Agence Ecofin, EspaceAgro (2025/2026)
  afrique_ouest: {
    "Maïs":                { min: 170, max: 260, devise: "FCFA/kg", note: "Moy. nationale Bénin 217 FCFA/kg (juin 2025) ; CI : 120–270 (pic soudure 500) ; Sénégal importé ~305 FCFA/kg" },
    "Soja":                { min: 260, max: 320, devise: "FCFA/kg", note: "Prix officiel Bénin 275 FCFA/kg 2024/25 ; CI EXW 260 FCFA/kg ; Burkina 275 FCFA/kg" },
    "Tourteau de soja":    { min: 300, max: 430, devise: "FCFA/kg", note: "Calculé FOB 555–670 USD/t ; CI gros ~300 FCFA/kg ; Sénégal détail jusqu'à 800 FCFA/kg" },
    "Son de blé":          { min: 190, max: 250, devise: "FCFA/kg", note: "~220 000 FCFA/tonne livré Sénégal/Bénin ; produit par minoteries locales" },
    "Orge":                { min: 230, max: 340, devise: "FCFA/kg", note: "Quasi inexistant localement, importé Europe/Argentine via ports" },
    "Luzerne déshydratée": { min: 420, max: 580, devise: "FCFA/kg", note: "100% importée (Maroc, Europe) ; coûts logistiques élevés" },
    "Foin":                { min: 120, max: 220, devise: "FCFA/kg", note: "Circuit informel, très saisonnier ; +30–40% en saison sèche" },
    "Prémix vitamines":    { min: 2500, max: 4000, devise: "FCFA/kg", note: "Importé Chine/Europe ; distribué via cabinets vétérinaires" },
    "Sel":                 { min: 55,  max: 90,   devise: "FCFA/kg", note: "Kaolack (Sénégal) = production locale ; sel bétail en sac 25 kg" },
    "Phosphate bicalcique":{ min: 560, max: 820,  devise: "FCFA/kg", note: "Importé principalement du Maroc (OCP) ; aussi Chine" },
    "Autre":               { min: 200, max: 420,  devise: "FCFA/kg" },
  },
  // ── Afrique du Nord — MAD/kg (Maroc référence) ────────────────────────────
  // Sources : EspaceAgro Maroc, OCP, Avifeed.ma, parités import (2025/2026)
  // NB Égypte : 1 EGP ≈ 0,35 MAD — prix Égypte très inférieurs (subventions)
  afrique_nord: {
    "Maïs":                { min: 2.5, max: 3.2, devise: "MAD/kg", note: "Maroc : partiellement importé ; Égypte subventionné ~8–11 EGP/kg (≈0,11–0,15 USD)" },
    "Soja":                { min: 3.5, max: 5.0, devise: "MAD/kg", note: "Surtout importé Argentine/Brésil" },
    "Tourteau de soja":    { min: 4.0, max: 6.0, devise: "MAD/kg", note: "Import ; Égypte : 12–18 EGP/kg (industrie avicole développée)" },
    "Son de blé":          { min: 2.0, max: 3.0, devise: "MAD/kg", note: "Produit localement (minoteries) ; très disponible Égypte et Maroc" },
    "Orge":                { min: 2.2, max: 3.2, devise: "MAD/kg", note: "Culture majeure Maroc ; subventionné partiellement" },
    "Luzerne déshydratée": { min: 2.5, max: 4.5, devise: "MAD/kg", note: "Produite localement (Maroc, Égypte Nil Delta) → prix avantageux" },
    "Foin":                { min: 2.0, max: 5.0, devise: "MAD/kg", note: "Variable : paille blé (bas) vs foin naturel (élevé)" },
    "Prémix vitamines":    { min: 30,  max: 60,  devise: "MAD/kg", note: "Avifeed.ma et importateurs locaux" },
    "Sel":                 { min: 1.0, max: 2.0, devise: "MAD/kg", note: "Production côtière Nador/Casablanca" },
    "Phosphate bicalcique":{ min: 6.0, max: 10.0,devise: "MAD/kg", note: "OCP = leader mondial → prix local très compétitif au Maroc" },
    "Autre":               { min: 3.0, max: 6.0, devise: "MAD/kg" },
  },
  // ── Afrique de l'Est — KES/kg (Kenya référence) ───────────────────────────
  // Sources : FAO GIEWS, tendances marchés Kenya/Tanzanie/Éthiopie (2025)
  afrique_est: {
    "Maïs":                { min: 45,  max: 80,  devise: "KES/kg", note: "Kenya : 50–70 KES/kg (2024) ; Éthiopie plus bas ; Tanzanie similaire" },
    "Soja":                { min: 100, max: 180, devise: "KES/kg", note: "Produit localement au Kenya/Tanzanie" },
    "Tourteau de soja":    { min: 150, max: 250, devise: "KES/kg", note: "Import ou transformation locale" },
    "Son de blé":          { min: 40,  max: 80,  devise: "KES/kg", note: "Très disponible Kenya (minoteries Nairobi)" },
    "Orge":                { min: 60,  max: 120, devise: "KES/kg", note: "Éthiopie : culture majeure ; Kenya import" },
    "Luzerne déshydratée": { min: 100, max: 200, devise: "KES/kg", note: "Souvent importée ou irrigation locale" },
    "Foin":                { min: 40,  max: 100, devise: "KES/kg", note: "Très saisonnier (saison sèche)" },
    "Prémix vitamines":    { min: 600, max: 1500,devise: "KES/kg", note: "Import Europe/Chine" },
    "Sel":                 { min: 20,  max: 50,  devise: "KES/kg", note: "Lac Magadi (Kenya) = production locale" },
    "Phosphate bicalcique":{ min: 300, max: 550, devise: "KES/kg", note: "Import Maroc/Chine via Mombasa" },
    "Autre":               { min: 80,  max: 200, devise: "KES/kg" },
  },
  // ── Afrique Centrale — FCFA/kg ────────────────────────────────────────────
  // Sources : EspaceAgro Cameroun, FSCluster bulletin marchés, Investir au Cameroun (2025)
  afrique_centrale: {
    "Maïs":                { min: 200, max: 240, devise: "FCFA/kg", note: "Cameroun : sac 100 kg = 20 000–23 000 FCFA ; pression haussière due à demande nigériane" },
    "Soja":                { min: 280, max: 390, devise: "FCFA/kg", note: "Production Cameroun/RDC ; qualité variable selon séchage" },
    "Tourteau de soja":    { min: 210, max: 290, devise: "FCFA/kg", note: "Cameroun FCA : ~220 000 FCFA/tonne (EspaceAgro 2025)" },
    "Son de blé":          { min: 180, max: 250, devise: "FCFA/kg", note: "Minoteries Douala ; disponible en sacs 50 kg" },
    "Orge":                { min: 260, max: 390, devise: "FCFA/kg", note: "Très peu cultivé, import quasi-exclusif" },
    "Luzerne déshydratée": { min: 450, max: 650, devise: "FCFA/kg", note: "Import (logistique difficile = surcoût)" },
    "Foin":                { min: 100, max: 210, devise: "FCFA/kg", note: "Disponible zones élevage (Adamaoua, Rwanda)" },
    "Prémix vitamines":    { min: 2500,max: 5000,devise: "FCFA/kg", note: "Import Chine/Europe via Douala" },
    "Sel":                 { min: 60,  max: 110, devise: "FCFA/kg", note: "Mines de sel Maroua (Cameroun)" },
    "Phosphate bicalcique":{ min: 600, max: 920, devise: "FCFA/kg", note: "Import Maroc/Chine" },
    "Autre":               { min: 230, max: 470, devise: "FCFA/kg" },
  },
};

const PAYS_PAR_ZONE: Record<string, ZonePrix> = {
  "Bénin": "afrique_ouest",
  "Sénégal": "afrique_ouest",
  "Mali": "afrique_ouest",
  "Burkina Faso": "afrique_ouest",
  "Côte d'Ivoire": "afrique_ouest",
  "Togo": "afrique_ouest",
  "Niger": "afrique_ouest",
  "Guinée": "afrique_ouest",
  "Ghana": "afrique_ouest",
  "Nigeria": "afrique_ouest",
  "Mauritanie": "afrique_ouest",
  "Gambie": "afrique_ouest",
  "Sierra Leone": "afrique_ouest",
  "Maroc": "afrique_nord",
  "Algérie": "afrique_nord",
  "Tunisie": "afrique_nord",
  "Égypte": "afrique_nord",
  "Libye": "afrique_nord",
  "Kenya": "afrique_est",
  "Tanzanie": "afrique_est",
  "Éthiopie": "afrique_est",
  "Ouganda": "afrique_est",
  "Rwanda": "afrique_est",
  "Madagascar": "afrique_est",
  "Cameroun": "afrique_centrale",
  "RD Congo": "afrique_centrale",
  "Congo": "afrique_centrale",
  "Gabon": "afrique_centrale",
  "Tchad": "afrique_centrale",
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const INGREDIENTS_PREDEFINIS = Object.keys(PRIX_PAR_ZONE.afrique_ouest);

const PAYS_LISTE = Object.keys(PAYS_PAR_ZONE).sort();

// ─── Composant Modal ──────────────────────────────────────────────────────────

function Modal({ isOpen, onClose, title, children }: {
  isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ProvendePage() {
  const [activeTab, setActiveTab] = useState<"Stocks" | "Recettes" | "Prix">("Stocks");

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [recettes, setRecettes] = useState<Recette[]>([]);

  // Modal recette
  const [modalRecetteOpen, setModalRecetteOpen] = useState(false);
  const [recNom, setRecNom] = useState("");
  const [recDesc, setRecDesc] = useState("");
  const [recIngredients, setRecIngredients] = useState<Ingredient[]>([{ nom: "Maïs", quantite: 0 }]);

  // Modal stock
  const [modalStockOpen, setModalStockOpen] = useState(false);
  const [stockType, setStockType] = useState(INGREDIENTS_PREDEFINIS[0]);
  const [stockQty, setStockQty] = useState("");
  const [stockSeuil, setStockSeuil] = useState("");

  // Onglet Prix
  const [prixRecetteId, setPrixRecetteId] = useState("");
  const [prixPays, setPrixPays] = useState("Bénin");

  useEffect(() => {
    setStocks(JSON.parse(localStorage.getItem("ferme_stocks_v2") || "[]"));
    setRecettes(JSON.parse(localStorage.getItem("ferme_recettes_v2") || "[]"));
  }, []);

  const saveStocks = (data: Stock[]) => {
    setStocks(data);
    localStorage.setItem("ferme_stocks_v2", JSON.stringify(data));
  };

  const saveRecettes = (data: Recette[]) => {
    setRecettes(data);
    localStorage.setItem("ferme_recettes_v2", JSON.stringify(data));
  };

  // ─── Recettes ────────────────────────────────────────────────────────────────

  const addIngredientLigne = () =>
    setRecIngredients([...recIngredients, { nom: "Maïs", quantite: 0 }]);

  const removeIngredientLigne = (i: number) =>
    setRecIngredients(recIngredients.filter((_, idx) => idx !== i));

  const updateIngredient = (i: number, field: keyof Ingredient, value: string | number) =>
    setRecIngredients(recIngredients.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));

  const ouvrirModalRecette = () => {
    setRecNom(""); setRecDesc("");
    setRecIngredients([{ nom: "Maïs", quantite: 0 }]);
    setModalRecetteOpen(true);
  };

  const enregistrerRecette = () => {
    if (!recNom.trim()) return;
    const ingredients = recIngredients.filter((i) => i.quantite > 0);
    if (!ingredients.length) return;
    saveRecettes([...recettes, {
      id: Date.now().toString(), nom: recNom.trim(),
      description: recDesc.trim() || undefined, ingredients,
    }]);
    setModalRecetteOpen(false);
  };

  const supprimerRecette = (id: string) => {
    if (!confirm("Supprimer cette recette ?")) return;
    saveRecettes(recettes.filter((r) => r.id !== id));
  };

  const totalKg = (ings: Ingredient[]) => ings.reduce((s, i) => s + (i.quantite || 0), 0);

  // ─── Stocks ──────────────────────────────────────────────────────────────────

  const ouvrirModalStock = () => {
    setStockType(INGREDIENTS_PREDEFINIS[0]); setStockQty(""); setStockSeuil("");
    setModalStockOpen(true);
  };

  const enregistrerStock = () => {
    const qty = parseFloat(stockQty);
    if (!qty || qty <= 0) return;
    const seuil = parseFloat(stockSeuil) || 0;
    const idx = stocks.findIndex((s) => s.type === stockType);
    if (idx >= 0) {
      const maj = [...stocks]; maj[idx].quantiteKg += qty; saveStocks(maj);
    } else {
      saveStocks([...stocks, { id: Date.now().toString(), type: stockType, quantiteKg: qty, seuilAlerte: seuil }]);
    }
    setModalStockOpen(false);
  };

  const niveauStock = (s: Stock) => {
    if (!s.seuilAlerte) return "ok";
    const pct = s.quantiteKg / (s.seuilAlerte * 3);
    return pct < 0.33 ? "danger" : pct < 0.66 ? "warning" : "ok";
  };

  // ─── Calcul prix ─────────────────────────────────────────────────────────────

  const calculerPrix = () => {
    const recette = recettes.find((r) => r.id === prixRecetteId);
    if (!recette) return null;
    const zone = PAYS_PAR_ZONE[prixPays] || "afrique_ouest";
    const prixZone = PRIX_PAR_ZONE[zone];
    const devise = prixZone["Maïs"].devise.split("/")[0].trim() + "/kg";

    let totalMin = 0;
    let totalMax = 0;
    const lignes = recette.ingredients.map((ing) => {
      const p = prixZone[ing.nom] || prixZone["Autre"];
      const coutMin = p.min * ing.quantite;
      const coutMax = p.max * ing.quantite;
      totalMin += coutMin;
      totalMax += coutMax;
      return { ing, p, coutMin, coutMax };
    });
    const poidsTotal = totalKg(recette.ingredients);
    return { lignes, totalMin, totalMax, poidsTotal, devise, zone };
  };

  const resultatPrix = prixRecetteId ? calculerPrix() : null;
  const recetteSelectionnee = recettes.find((r) => r.id === prixRecetteId);

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🌾 Gestion Provende</h1>
        <p className="text-gray-500 text-sm">Stocks, recettes d'aliments et estimation des coûts.</p>
      </header>

      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {(["Stocks", "Recettes", "Prix"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-800"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── STOCKS ── */}
      {activeTab === "Stocks" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-gray-900">Matières premières</h2>
            <button onClick={ouvrirModalStock}
              className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition">
              + Ajouter
            </button>
          </div>
          {stocks.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📦</p>
              <p className="text-sm">Aucun stock enregistré.</p>
              <p className="text-xs mt-1">Ajoutez vos premières matières premières.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {stocks.map((s) => {
                const niveau = niveauStock(s);
                const pct = s.seuilAlerte ? Math.min(100, Math.round((s.quantiteKg / (s.seuilAlerte * 3)) * 100)) : 100;
                const barColor = niveau === "danger" ? "bg-red-500" : niveau === "warning" ? "bg-amber-400" : "bg-emerald-500";
                return (
                  <div key={s.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 relative">
                    <button onClick={() => saveStocks(stocks.filter(x => x.id !== s.id))}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-xs">✕</button>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{s.type}</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">
                      {s.quantiteKg.toFixed(1)}<span className="text-sm font-normal text-gray-400 ml-1">kg</span>
                    </p>
                    {s.seuilAlerte > 0 && (
                      <p className={`text-xs mt-1 ${niveau === "danger" ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                        Alerte : {s.seuilAlerte} kg
                      </p>
                    )}
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── RECETTES ── */}
      {activeTab === "Recettes" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-base font-semibold text-gray-900">Mes recettes d'aliments</h2>
            <button onClick={ouvrirModalRecette}
              className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition">
              + Nouvelle recette
            </button>
          </div>
          {recettes.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-sm">Aucune recette enregistrée.</p>
              <p className="text-xs mt-1">Créez votre première recette d'aliment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recettes.map((recette) => (
                <div key={recette.id} className="border border-gray-100 rounded-xl p-4 border-l-4 border-l-indigo-500">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{recette.nom}</h3>
                      {recette.description && <p className="text-xs text-gray-500 mt-0.5">{recette.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                        {totalKg(recette.ingredients).toFixed(1)} kg
                      </span>
                      <button onClick={() => supprimerRecette(recette.id)}
                        className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition">
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {recette.ingredients.map((ing, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full border border-gray-200">
                        {ing.nom} · {ing.quantite} kg
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">{recette.ingredients.length} ingrédient{recette.ingredients.length > 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PRIX ── */}
      {activeTab === "Prix" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Estimation du coût par recette</h2>
            <p className="text-xs text-gray-400 mb-5">
              Prix moyens du marché 2024/2025 — mis à jour manuellement. Les fourchettes reflètent la variabilité saisonnière.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Recette</label>
                <select value={prixRecetteId} onChange={(e) => setPrixRecetteId(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">— Choisir une recette —</option>
                  {recettes.map((r) => <option key={r.id} value={r.id}>{r.nom}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Pays</label>
                <select value={prixPays} onChange={(e) => setPrixPays(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {PAYS_LISTE.map((p) => <option key={p}>{p}</option>)}
                </select>
              </div>
            </div>

            {recettes.length === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                ⚠️ Créez d'abord une recette dans l'onglet "Recettes".
              </p>
            )}

            {/* Résultat */}
            {resultatPrix && recetteSelectionnee && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{recetteSelectionnee.nom}</h3>
                  <span className="text-xs text-gray-400 capitalize">
                    Zone : {resultatPrix.zone.replace("_", " ")}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                        <th className="text-left px-4 py-3 font-medium">Ingrédient</th>
                        <th className="text-right px-4 py-3 font-medium">Qté</th>
                        <th className="text-right px-4 py-3 font-medium">Prix unitaire</th>
                        <th className="text-right px-4 py-3 font-medium">Coût min</th>
                        <th className="text-right px-4 py-3 font-medium">Coût max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultatPrix.lignes.map(({ ing, p, coutMin, coutMax }, i) => (
                        <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-800">{ing.nom}</td>
                          <td className="px-4 py-3 text-right text-gray-600">{ing.quantite} kg</td>
                          <td className="px-4 py-3 text-right text-gray-500 text-xs">{p.min}–{p.max} {p.devise}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{Math.round(coutMin).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-gray-700">{Math.round(coutMax).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-indigo-100 bg-indigo-50">
                        <td colSpan={3} className="px-4 py-3 font-semibold text-indigo-800">
                          Total ({resultatPrix.poidsTotal.toFixed(1)} kg)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-900">
                          {Math.round(resultatPrix.totalMin).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-indigo-900">
                          {Math.round(resultatPrix.totalMax).toLocaleString()}
                        </td>
                      </tr>
                      {resultatPrix.poidsTotal > 0 && (
                        <tr className="bg-emerald-50">
                          <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-emerald-800">
                            Coût au kg d'aliment produit
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-900">
                            {Math.round(resultatPrix.totalMin / resultatPrix.poidsTotal).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-900">
                            {Math.round(resultatPrix.totalMax / resultatPrix.poidsTotal).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tfoot>
                  </table>
                </div>

                <p className="text-xs text-gray-400 mt-3 italic">
                  ⚠️ Prix indicatifs basés sur les marchés 2024/2025. Les cours varient selon la saison, la région et les fournisseurs.
                </p>
              </div>
            )}
          </div>

          {/* Tableau de référence des prix */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              Référence des prix par zone — 2025/2026
            </h2>
            <p className="text-xs text-gray-400 mb-4">Fourchettes resserrées selon prix réels observés sur les marchés locaux (Bénin : SIMAGRI, Agence Ecofin, FAO, juin 2025).</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-3 py-2 font-medium">Ingrédient</th>
                    <th className="text-right px-3 py-2 font-medium">Afrique Ouest (FCFA)</th>
                    <th className="text-right px-3 py-2 font-medium">Afrique Nord (MAD)</th>
                    <th className="text-right px-3 py-2 font-medium">Afrique Est (KES)</th>
                    <th className="text-right px-3 py-2 font-medium">Afrique Centrale (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {INGREDIENTS_PREDEFINIS.filter(i => i !== "Autre").map((ing) => (
                    <tr key={ing} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-700">
                        {ing}
                        {PRIX_PAR_ZONE.afrique_ouest[ing]?.note && (
                          <span title={PRIX_PAR_ZONE.afrique_ouest[ing].note} className="ml-1 text-gray-400 cursor-help">ⓘ</span>
                        )}
                      </td>
                      {(["afrique_ouest","afrique_nord","afrique_est","afrique_centrale"] as ZonePrix[]).map((zone) => {
                        const p = PRIX_PAR_ZONE[zone][ing];
                        return (
                          <td key={zone} className="px-3 py-2 text-right text-gray-600">
                            {p.min}–{p.max}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Sources : SIMAGRI CI, Le Rural Bénin, Agence Ecofin, EspaceAgro, FSCluster, FAO GIEWS, OCP Maroc. Mis à jour juin 2025/2026. ⓘ Survolez le nom d&apos;un ingrédient pour la note de marché.
            </p>
          </div>
        </div>
      )}

      {/* ── Modal Recette ── */}
      <Modal isOpen={modalRecetteOpen} onClose={() => setModalRecetteOpen(false)} title="Créer une recette">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nom de la recette *</label>
            <input type="text" value={recNom} onChange={(e) => setRecNom(e.target.value)}
              placeholder="Ex: Aliment croissance lapereaux"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Description (facultatif)</label>
            <input type="text" value={recDesc} onChange={(e) => setRecDesc(e.target.value)}
              placeholder="Ex: Pour lapereaux 4-10 semaines"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium text-gray-700">Ingrédients</p>
            <button onClick={addIngredientLigne}
              className="text-xs text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1 hover:bg-indigo-50 transition">
              + Ajouter
            </button>
          </div>
          <div className="space-y-2">
            {recIngredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_auto] gap-2 items-center">
                <select value={ing.nom} onChange={(e) => updateIngredient(i, "nom", e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {INGREDIENTS_PREDEFINIS.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
                <div className="flex items-center gap-1">
                  <input type="number" min="0" step="0.1" value={ing.quantite || ""}
                    onChange={(e) => updateIngredient(i, "quantite", parseFloat(e.target.value) || 0)}
                    placeholder="kg"
                    className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  <span className="text-xs text-gray-400 whitespace-nowrap">kg</span>
                </div>
                <button onClick={() => removeIngredientLigne(i)} disabled={recIngredients.length === 1}
                  className="text-gray-300 hover:text-red-500 disabled:opacity-20 text-lg leading-none">✕</button>
              </div>
            ))}
          </div>
          {totalKg(recIngredients) > 0 && (
            <div className="flex justify-between bg-indigo-50 rounded-lg px-3 py-2 text-sm font-medium text-indigo-700">
              <span>Total recette</span>
              <span>{totalKg(recIngredients).toFixed(1)} kg</span>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => setModalRecetteOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Annuler
            </button>
            <button onClick={enregistrerRecette}
              disabled={!recNom.trim() || !recIngredients.some((i) => i.quantite > 0)}
              className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-40">
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Stock ── */}
      <Modal isOpen={modalStockOpen} onClose={() => setModalStockOpen(false)} title="Ajouter un stock">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Matière première</label>
            <select value={stockType} onChange={(e) => setStockType(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              {INGREDIENTS_PREDEFINIS.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Quantité (kg) *</label>
              <input type="number" min="0" value={stockQty} onChange={(e) => setStockQty(e.target.value)}
                placeholder="500"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Seuil d'alerte (kg)</label>
              <input type="number" min="0" value={stockSeuil} onChange={(e) => setStockSeuil(e.target.value)}
                placeholder="50"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button onClick={() => setModalStockOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Annuler
            </button>
            <button onClick={enregistrerStock}
              disabled={!stockQty || parseFloat(stockQty) <= 0}
              className="px-4 py-2 text-sm text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition disabled:opacity-40">
              Enregistrer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
