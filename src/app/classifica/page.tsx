import LeaderboardPublic from "@/components/LeaderboardPublic";

export default function ClassificaPage() {
  return (
    <main className="page page-classifica">
      <header className="page-header">
        <h1>Classifica completa Fanta Claus</h1>
        <p>
          Classifica aggiornata di tutti i partecipanti al Fanta Claus.
        </p>
      </header>

      <section className="page-content">
        <LeaderboardPublic
          title="Classifica completa"
          variant="full"
          showViewAllLink={false} // qui siamo già nella pagina classifica
        />
      </section>
    </main>
  );
}
