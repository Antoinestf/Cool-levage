// Composant serveur — reçoit params (Promise en Next.js 16) et passe l'ID au client
import LapinPageClient from './LapinPageClient';

export default async function LapinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LapinPageClient lapinId={id} />;
}
