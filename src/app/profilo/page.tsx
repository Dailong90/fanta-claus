import ProfiloClientShell from "./ProfiloClientShell";

type ProfiloPageProps = {
  searchParams?: {
    playerId?: string;
  };
};

export const dynamic = "force-dynamic";

export default function ProfiloPage({ searchParams }: ProfiloPageProps) {
  const playerId = (searchParams?.playerId ?? "").trim();

  return <ProfiloClientShell playerId={playerId} />;
}
