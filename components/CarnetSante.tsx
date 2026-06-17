"use client";

import { useState } from "react";

export interface Soin {
  date: string;
  type: "Vaccin" | "Traitement" | "Pesée" | "Autre";
  note: string;
}

interface Lapin {
  id: string;
  nom: string;
  soins?: Soin[];
}

interface CarnetSanteProps {
  lapin: Lapin;
  onUpdateLapin: (lapin: Lapin) => void;
}

export default function CarnetSante({
  lapin,
  onUpdateLapin,
}: CarnetSanteProps) {
  const [date, setDate] = useState("");
  const [type, setType] = useState<Soin["type"]>("Vaccin");
  const [note, setNote] = useState("");

  const ajouterSoin = () => {
    if (!date || !note.trim()) return;

    const nouveauSoin: Soin = {
      date,
      type,
      note,
    };

    const lapinMisAJour: Lapin = {
      ...lapin,
      soins: [...(lapin.soins || []), nouveauSoin],
    };

    onUpdateLapin(lapinMisAJour);

    setDate("");
    setType("Vaccin");
    setNote("");
  };

  const supprimerSoin = (index: number) => {
    const nouveauxSoins = [...(lapin.soins || [])];
    nouveauxSoins.splice(index, 1);

    const lapinMisAJour: Lapin = {
      ...lapin,
      soins: nouveauxSoins,
    };

    onUpdateLapin(lapinMisAJour);
  };

  const soinsTries = [...(lapin.soins || [])].sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">
        Carnet de santé - {lapin.nom}
      </h2>

      {/* Formulaire */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-gray-700 mb-4">
          Ajouter un soin
        </h3>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as Soin["type"])
              }
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300 focus:outline-none"
            >
              <option value="Vaccin">Vaccin</option>
              <option value="Traitement">Traitement</option>
              <option value="Pesée">Pesée</option>
              <option value="Autre">Autre</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex : Vaccin VHD effectué"
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-300 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={ajouterSoin}
          className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition"
        >
          Ajouter le soin
        </button>
      </div>

      {/* Liste des soins */}
      <div>
        <h3 className="font-medium text-gray-700 mb-4">
          Historique des soins
        </h3>

        {soinsTries.length === 0 ? (
          <div className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">
            Aucun soin enregistré.
          </div>
        ) : (
          <div className="space-y-3">
            {soinsTries.map((soin, index) => (
              <div
                key={`${soin.date}-${index}`}
                className="bg-white border border-gray-100 rounded-lg shadow-sm p-4 flex justify-between items-start"
              >
                <div>
                  <div className="flex gap-2 items-center mb-2">
                    <span className="font-medium text-gray-800">
                      {soin.type}
                    </span>

                    <span className="text-sm text-gray-500">
                      {new Date(soin.date).toLocaleDateString(
                        "fr-FR"
                      )}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm">
                    {soin.note}
                  </p>
                </div>

                <button
                  onClick={() => supprimerSoin(index)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}