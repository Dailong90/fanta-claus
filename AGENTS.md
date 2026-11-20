# Fanta Claus — istruzioni per Codex

## Scopo e fonti

Web app del gioco natalizio Fanta Claus, utilizzata nel 2025 e da preparare per il 2026. Lo stack rilevato è Next.js App Router, React, TypeScript, Material UI e Supabase. Non presumere che versioni, schema remoto o configurazione di deployment coincidano con una sessione precedente.

- [Specifiche funzionali](docs/PROJECT_SPEC.md): comportamento 2025, requisiti 2026 e decisioni aperte.
- [Architettura](docs/ARCHITECTURE.md): struttura e flussi effettivamente rilevati.
- [Audit](docs/AUDIT_REPORT.md): problemi, evidenze, verifiche e limiti dell'analisi.
- [Roadmap](docs/ROADMAP.md): blocchi di lavoro, dipendenze e criteri di completamento.

Il codice corrente è autorevole per il comportamento implementato. I documenti descrivono requisiti, decisioni e stato: non sostituiscono la lettura dei file reali. Le proposte 2026 non sono funzionalità già disponibili.

## Regole permanenti

1. Prima di modificare codice esistente, leggere i file reali aggiornati e ricostruire il flusso coinvolto, inclusi chiamanti, API e dati.
2. Non introdurre modifiche speculative; segnalare i requisiti mancanti prima di implementare il comportamento che ne dipende.
3. Non eseguire refactor gratuiti: motivare ogni intervento con un problema tecnico concreto.
4. Preservare le funzionalità già operative e rendere esplicite le variazioni intenzionali del comportamento.
5. Trattare autenticazione, dati, votazioni, punteggi e sorteggio come flussi critici.
6. Richiedere ed eseguire test mirati per ogni intervento sui flussi critici. Senza evidenze adeguate, riportare il lavoro come non verificato.
7. Non introdurre dipendenze senza una motivazione tecnica; discutere impatto, compatibilità e alternative già disponibili.
8. Non inserire segreti nel codice, nei log, nei test o nella documentazione; documentare soltanto i nomi delle variabili.
9. Aggiornare i documenti pertinenti quando cambiano requisiti, architettura o funzionalità.
10. Non eseguire commit, push, merge o deployment senza richiesta esplicita.
11. Procedere per blocchi piccoli, verificabili e indipendenti, entro l'ambito concordato.
12. Non dichiarare una funzionalità completata senza verifiche adeguate; distinguere implementato da verificato.
13. Evitare output inutilmente verbosi e diff integrali nei report.
14. Segnalare errori, rischi o scelte architetturali non ottimali, anche se derivano da implementazioni precedenti.

## Workflow di una sessione

1. Leggere questo file e controllare branch, stato Git e modifiche locali. Preservare il lavoro esistente.
2. Consultare specifiche, architettura, problemi di audit e blocco di roadmap pertinenti.
3. Leggere nuovamente i file coinvolti e ricostruire il percorso UI → API → database; verificare le assunzioni dei documenti.
4. Valutare impatto, permessi, dati storici, concorrenza, regressioni e verifiche necessarie.
5. Implementare esclusivamente il blocco concordato. Se la sessione è di analisi, modificare soltanto la documentazione autorizzata.
6. Eseguire i controlli disponibili e i test mirati; registrare anche errori e controlli non eseguibili.
7. Aggiornare i soli documenti interessati e lo stato della roadmap sulla base delle evidenze.
8. Fornire il report compatto descritto sotto.

## Convenzioni e organizzazione

- Usare TypeScript rigoroso, tipi espliciti per contratti e dominio, `unknown` con validazione per dati esterni. Un cast TypeScript non valida un payload.
- Seguire le convenzioni del file esistente: alias `@/`, componenti React in PascalCase, route App Router in `src/app`, elementi condivisi in `src/components`, integrazioni in `src/lib`, tema in `src/theme`.
- Mantenere vicino alla route i componenti usati soltanto da quella pagina. Estrarre componenti e servizi quando riducono duplicazioni reali o isolano logica critica; non creare livelli vuoti preventivi.
- Separare UI, accesso ai dati e regole di business nei blocchi che lo richiedono. Non propagare query privilegiate nei componenti client.
- Riutilizzare MUI e i token esistenti quando appropriato. Loading, errori e stati vuoti devono essere distinguibili; il successo deve seguire una conferma di persistenza.
- Curare nomi accessibili, tastiera, mobile e preferenze di movimento ridotto. Le animazioni non devono determinare salvataggi, punteggi o autorizzazioni.
- Non inventare le regole squadre 2026, le restrizioni del Secret Santa o i poteri amministrativi ancora da concordare.

## Sicurezza

- Ricavare l'identità da una sessione verificata sul server. `localStorage`, parametri, body e header con ID utente non costituiscono prova dell'identità.
- Verificare ruolo e titolarità in ogni operazione protetta; proteggere gli endpoint anche quando la UI li nasconde.
- Validare lato server tipi, valori ammessi, appartenenza all'edizione, scadenze e invarianti; applicare i vincoli anche nel database dove necessario.
- Tenere la service role Supabase esclusivamente sul server e usarla con privilegi minimi e controlli espliciti. La chiave pubblica non sostituisce le policy RLS.
- Non dichiarare sicuro un accesso diretto Supabase senza aver verificato grant e policy reali con utenti distinti e richieste anonime.
- Per Secret Santa restituire al partecipante soltanto il proprio destinatario: nessuna mappa completa nel browser, nei payload nascosti, nelle cache condivise o nei log.
- Non provare endpoint distruttivi contro servizi reali durante audit o verifiche locali.

## Dipendenze e verifiche

Il repository usa npm e `package-lock.json`. Non cambiare package manager o rigenerare il lockfile incidentalmente. Installazioni e aggiornamenti richiedono un ambito autorizzato; un audit non autorizza `npm audit fix`.

Dopo modifiche applicative, con dipendenze già disponibili:

- `npm run lint` senza correzioni automatiche non concordate.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` per il controllo TypeScript.
- Test automatici pertinenti, quando presenti; al 19 novembre 2026 non esiste uno script `test`.
- `npm run build` in un ambiente isolato con configurazione idonea, verificando prima possibili accessi remoti durante la build.
- Per dipendenze: `npm audit --package-lock-only --ignore-scripts`, senza fix automatici; separare gravità del pacchetto e raggiungibilità nell'app.
- `git diff --check` e controllo finale dei file modificati.

Per flussi critici aggiungere verifiche positive e negative: anonimo, utente A, utente B e amministratore; payload manipolati; confini temporali; retry, errori e concorrenza. Per i punteggi usare esempi indipendenti dalla formula implementata, includendo malus, capitano ed ex aequo. Per sorteggi verificare unicità, assenza di autoassegnazioni, atomicità e riservatezza anche con richieste manipolate.

Se mancano dipendenze, credenziali di test o strumenti, dichiararlo: non installare implicitamente tramite `npx` e non confondere un comando non avviato con un errore del sorgente.

## Database e migrazioni

- Non presumere l'esistenza di PK, FK, indici, trigger, transazioni, vincoli o RLS non documentati da DDL reale.
- Prima di progettare una migrazione acquisire uno schema sanificato e una verifica di grant/policy. Versionare le migrazioni quando la loro implementazione è autorizzata.
- Preparare validazioni, piano di rollback/recupero e prove su database isolato. Non applicare migrazioni remote o modificare dati di produzione senza esplicita autorizzazione.
- Proteggere storico e separazione delle edizioni; non riutilizzare reset globali per inaugurare un nuovo anno.
- Eseguire operazioni composte critiche in una transazione e coprire retry e concorrenza; una sequenza di chiamate Supabase non è una transazione.

## Git e report finale

Non annullare, sovrascrivere o includere incidentalmente modifiche dell'utente. Non cambiare branch, creare commit o aggiornare riferimenti remoti senza necessità e autorizzazione. Per lavori implementativi futuri usare un branch dedicato concordato; nessun formato di commit è imposto dal repository attuale.

Report finale in italiano, compatto: esito e ambito; file modificati; verifiche con esito; rischi/limiti e decisioni aperte; branch e stato Git; prossimo blocco consigliato. Segnalare chiaramente operazioni non eseguite e motivi. Non riportare segreti o diff completi.
