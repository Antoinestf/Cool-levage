"use client";

import { QRCodeSVG } from 'qrcode.react';

interface Props {
  lapin: { id: string; tatouage: string };
  taille?: number;
}

export default function QrCodeLapin({ lapin, taille = 180 }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-gray-200">
      {/* QR code — contient strictement l'ID unique du lapin */}
      <div className="p-3 bg-white rounded-xl border-2 border-gray-100">
        <QRCodeSVG
          value={lapin.id}
          size={taille}
          bgColor="#ffffff"
          fgColor="#1e1b4b"
          level="H"
          marginSize={1}
        />
      </div>

      <div className="text-center">
        <p className="font-extrabold text-gray-900 uppercase tracking-widest text-base">{lapin.tatouage}</p>
        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{lapin.id}</p>
      </div>

      <p className="text-[10px] text-gray-400 text-center max-w-[180px] leading-relaxed">
        Collez ce QR sur la cage. Scannez pour ouvrir la fiche de ce lapin.
      </p>
    </div>
  );
}
