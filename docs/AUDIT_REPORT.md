# Fanta Claus — audit tecnico

## Aggiornamento B03+B04+B05 — 20 novembre 2026

Prevale sugli snapshot successivi nel file. Nuovo percorso 2026 implementato; **verifica integrale e pubblicazione ancora bloccate dai controlli esterni indicati sotto**. Branch esistente `codex/b01-b02`, lavoro B01+B02 conservato, nessun commit/push/deployment o accesso a produzione. Migrazioni solo su database di test in memoria. Dettagli e procedure nel [runbook](IDENTITY_EDITION_RUNBOOK.md).

| Ambito | Risultato ed evidenza | Limite residuo |
| --- | --- | --- |
| Identità/sessioni (AUD-016/017) | Vecchi codici/cookie non accettati dalle route correnti; Magic Link SSR, getUser server, refresh proxy, logout Supabase, Origin/redirect fissi e no-store. Test handler e HTTP con SDK SSR reale/stub Auth. | GoTrue/email reali non eseguiti; JWT copiati hanno scadenza standard Supabase. SMTP pubblico e hosting da configurare/provare. |
| Grant/RLS (AUD-005/012, Q01/Q02) | Tre migrazioni SQL, otto tabelle private con RLS forzata, grant minimi, RPC controllate, nessuna service role nel percorso 2026. PostgreSQL/PGlite verifica anon/A/B/più admin, negazioni dirette, auto-promozione, profili, Secret Santa negato anche agli admin e default di nuovi oggetti. | Catalogo legacy incompleto; proprietari/grant indiretti, view/RPC/event trigger e nomi dei due schemi esposti non acquisiti. Nessuna Data API remota modificata o certificata. |
| Edizioni/storico (AUD-019, Q03) | App normale solo 2026; vincoli composti, account/membership distinti; nessuna mappatura per nome. Snapshot completo delle sette tabelle fixture identico dopo migrazioni, operazioni, ripristino, rollback e riapplicazione. Endpoint storici 410. | Campione/risultati 2025 approvati e backup/restore Supabase reale mancanti. Nessuna reinterpretazione di santa/receiver, formula, moltiplicatori o assegnazioni. |
| Chiusura/atomicità (AUD-006/011) | Gate di creazione Auth nel DB, join transazionale con row lock e retry, tempo DB, login esistenti separato. Configurazione iniziale inattiva/chiusa; attivazione esplicita distinta dall'apertura. | Concorrenza multi-connessione/multiistanza da provare con Supabase; squadre/voti 2026 non implementati. I lock B02 del legacy non diventano una garanzia distribuita. |
| Profili/admin | Nome/cognome solo alla prima creazione o correzione amministrativa di partecipanti 2026; avatar enum/CHECK. Ruoli per edizione da procedura privilegiata e nessun grant applicativo sulle assegnazioni. Test metadata e payload manipolati. | D03 per-edizione è una scelta tecnica prudente da confermare; recupero/cambio email D01 non implementati. Guard sui campi Auth necessita prova GoTrue reale. |
| Tooling/dipendenze (AUD-007/022) | SSR 0.12.7, Supabase JS 2.119.2 per peer richiesto, PGlite 0.5.17 dev; npm/lock preservati. Audit npm senza fix: 0 vulnerabilità. | Artefatto Vercel/config effettivi non verificati. Nessun servizio a pagamento o SMTP scelto. |

### Evidenze dell'intervento

- **176 test Vitest in 6 file superati**: 145 regressioni B01+B02 conservate sui sorgenti storici, 26 test handler 2026 e 5 test UI 2026. Il test classifica è ora indirizzato alla pagina storica archiviata; non viene rimosso o contato come verifica della classifica 2026 futura. Mock Auth/HTTP dichiarati, rete esterna disabilitata.
- **180 controlli PostgreSQL/PGlite superati**: migrazioni, FK/UNIQUE/CHECK, RLS e ACL reali sul motore PostgreSQL WASM, utenti fixture, più admin/revoca, isolamento, confine temporale, tutti i privilegi diretti (inclusi TRUNCATE/TRIGGER), default privilege, conservazione legacy, copia/ripristino directory e rollback/riapplicazione. Fixture solo per le primitive Auth/gateway; non è una prova GoTrue/PostgREST, né di connessioni concorrenti o dati remoti.
- Lint e TypeScript senza emissione superati; `npm run build:isolated` completata con credenziali inerti/loopback e nessun accesso remoto previsto. Le pagine personali e Auth sono dinamiche. `test:smoke`: **29 controlli HTTP/SSR** sull'app compilata con stub loopback; cookie HttpOnly/Secure/SameSite, persistenza, refresh scaduto, logout, negazioni e nessuna query alle tabelle storiche. Non equivale a consegna email o RLS Data API.
- `npm audit --package-lock-only --ignore-scripts`: **0 vulnerabilità**, senza fix automatici. `npm ls --depth=0` riuscito, peer Supabase soddisfatto; restano i tre binding opzionali extraneous già documentati da B01, non nuove dipendenze fuori lock.
- `npm run test:supabase`: **non eseguito oltre il preflight, exit 1** per CLI/stack assenti. Docker CLI rilevato, daemon non disponibile; client psql/pg_dump e Supabase CLI non presenti. Config locale e suite GoTrue/Mailpit/PostgREST predisposte, nessun collegamento remoto. Consegna email pubblica non testata.
- `git diff --check` superato; verifica conclusiva anche sui nuovi file e link documentali. Nessun commit, reset Git, push, cambio branch o deployment.

Controllo statico dei 55 moduli raggiungibili da pagine/route/layout/proxy: nessun import di archivio 2025, lista statica, JWT legacy o client service role. Un controllo aggiuntivo su tutti i file ha rilevato spazi finali preesistenti in `CategorieRegaliClient.tsx` e `ProfiloClientShell.tsx`: non modificati incidentalmente. Nessun nuovo errore whitespace/link; normalizzata soltanto la copia nuova della home archiviata.

Problemi trovati e corretti durante le verifiche: primo download SSR negato dalla rete sandbox, ripetuto nell'ambito autorizzato; apostrofi JSX; test UI MUI con asterisco `required`; fixture del nuovo endpoint admin inizialmente non allineata al contratto; default `PUBLIC EXECUTE` globale non sottratto dalla sola revoca per schema (aggiunta revoca globale del proprietario); guard password iniziale incompatibile con l'hash temporaneo di Magic Link, corretto dopo lettura del sorgente GoTrue. I tentativi falliti non sono conteggiati come verifiche superate.

### Blocchi ancora necessari prima della pubblicazione

1. Supabase locale reale: migrazioni/versioni/trigger Auth, Magic Link completo via Mailpit, link scaduti/riusati e cross-device, sessioni/refresh/logout e Data API anon/A/B/più admin; concorrenza con chiusura e retry reali. QA browser/mobile/idratazione non svolta.
2. Schema sanificato completo e inventario dei due schemi esposti, grant di tutti i proprietari/ruoli e vecchi oggetti SECURITY DEFINER. Le vulnerabilità legacy dichiarate dall'utente **persistono sulla produzione finché non viene autorizzata e applicata una protezione verificata**.
3. Backup manuale Free e ripristino verificato su copia isolata, manifest integrità di tutte le sette tabelle e riconciliazione 2025 (D02/D05/Q03). La prova PGlite non chiude questo requisito bloccante.
4. SMTP pubblico, URL/template Auth, config Supabase/Vercel distinti dal collaudo, conferma D03 e calendario D06. Nessun deployment o attivazione ufficiale autorizzati in questa sessione. B06–B11 e regole di gioco ancora da realizzare.

## Aggiornamento implementativo B01+B02 — 20 novembre 2026

Questo stato prevale sul registro storico sotto riportato. Branch di lavoro `codex/b01-b02`; nessun accesso a produzione, migrazione, commit, push o deployment. Le posizioni di riga e i comandi dell'audit iniziale restano evidenze della baseline, non del codice modificato.

**Evidenze attuali:** installazione iniziale e finale dal lockfile; lint e TypeScript; build con configurazione inerte; 145 test Vitest con fixture/mocks; 33 controlli HTTP su app compilata e stub PostgREST locale. Audit finale lockfile: **0 vulnerabilità**, contro 18 iniziali (1 critical, 12 high, 4 moderate, 1 low). Nessuna di queste prove certifica PostgreSQL, RLS, grant, trigger o hosting reali.

| ID | Stato attuale | Intervento, evidenza e limite |
| --- | --- | --- |
| AUD-001 | Risolto e verificato nel perimetro applicativo | Guard admin; reset restituisce 410 anche all'admin. Nessuna query distruttiva nel codice. Matrice anon/A/B/admin e smoke HTTP. |
| AUD-002 | Risolto e verificato nel perimetro applicativo | Guard unica da cookie verificato e ruolo DB su tutte le mutazioni; input validati. Rifiuti senza mutazioni nelle fixture. Letture pubbliche necessarie conservate. |
| AUD-003 | Mitigato | Votante esclusivamente dalla sessione; body/query altrui rifiutati, header ignorato; test propri voti e retry. UNIQUE e concorrenza DB non verificati. |
| AUD-004 | Risolto e verificato nel perimetro applicativo | Anteprima esplicita `?preview=1` con guard; awards admin protetti; pubblico con gate comune. Nessun dettaglio nominativo dei votanti nel JSON pubblico, anche dopo pubblicazione. Test payload e HTTP. D07 resta aperta per il 2026. |
| AUD-005 | Mitigato, Q01/Q02 aperte | Eliminato client Supabase browser; team e profilo via server. Le credenziali pubbliche già distribuite e la Data API reale non sono revocate/protette da questo intervento: grant e RLS ancora da verificare. |
| AUD-006 | Mitigato | Fase verificata sul server per team/voti, anche subito prima della scrittura; configurazione assente/invalida sospende le mutazioni. Test prima/esattamente/dopo e pubblicato. Mancano vincoli atomici DB sul tempo di commit. |
| AUD-007 | Risolto nel lockfile verificato | Next 16.4.6, React/DOM 19.2.9, lint allineato e aggiornamenti transitivi mirati compatibili; audit 0, build e test. Artefatto effettivamente pubblicato non verificato né aggiornato. |
| AUD-008 | Aperto | Formula storica conservata su `santa_owner_id`; fixture indipendenti con receiver distinto, malus, capitano e pareggi. Non sostituiscono campioni e risultati 2025 approvati (D05/Q03). |
| AUD-009 | Risolto e verificato con fixture e HTTP | UPDATE dei soli campi presenti; receiver e bonus omessi preservati; null esplicito ammesso. Test modifica categoria/bonus, null e creazione. Nessuna reinterpretazione dei campi. |
| AUD-010 | Risolto per disabilitazione dell'operazione | Rimossi cancellazioni, comando UI e azzeramenti locali incoerenti. Un futuro reset isolato/atomico richiede semantica, DDL e piano di recupero. |
| AUD-011 | Mitigato | Nessun autosave dopo lettura fallita; niente ripristino cache; UI impedisce scritture sovrapposte; versioni team e lock per processo, PATCH gift per campo. Test StrictMode, retry e due richieste concorrenti nel medesimo processo. Nessuna garanzia distribuita tra istanze. |
| AUD-012 | Aperto | Nessun DDL/grant/RLS disponibile; non inventati né migrati. Fixture e stub non sono uno schema Supabase. |
| AUD-013 | Risolto nel perimetro UI/API verificato | Conferma team subordinata a persistenza; gift con stato salvato/errore e rollback; voto aggiornato dopo successo. Test UI positivi/negativi. Restano E2E browser e DB reali. |
| AUD-014 | Risolto nella UI esistente | Opzioni vuote disabilitate: nessuna promessa di cancellazione non implementata. Si può sostituire una scelta. Nuove regole di rimozione rinviate, senza nuovi DELETE speculativi. |
| AUD-015 | Mitigato | Validatori condivisi: oggetti JSON, campi ammessi, tipi, limiti tecnici, numeri finiti, ISO con fuso, riferimenti, team e identità. Payload invalidi testati senza scritture. Vincoli DB ed edizioni restano Q01/B03/B05. |
| AUD-016 | Mitigato | Codice stringa massimo 10 caratteri; limite per codice e globale in memoria, senza fidarsi di header IP. Soglie, ripristino e 429 testati. Limite per processo aggirabile su più istanze; limite globale può penalizzare accessi legittimi sotto attacco. Nessun nuovo archivio sessioni legacy. |
| AUD-017 | Mitigato | Logout comune con cancellazione cookie, stato client da API sessione, sessione rilegge player/ruolo, HS256 esplicito, env validate e server-only. Cookie/token 30 giorni coerenti. Test cookie alterato/scaduto, env e login/logout. Token copiati non revocabili individualmente: migrazione B04 ancora necessaria. |
| AUD-018 | Mitigato | Calcolo unico per classifica/premi, flag e alias comuni; errori di voti/config/dati necessari falliscono esplicitamente. Classifica UI legge un solo risultato e mostra errore distinto. Fault injection e casi numerici indipendenti superati. Letture DB non sono snapshot atomico; completezza sopra limite Data API da verificare. |
| AUD-019 | Aperto | Nessuno scoping annuale inventato; niente reset/migrazioni. Non iniziare il 2026 riusando i conflitti globali prima di B03/B05. |
| AUD-020 | Mitigato | Estratti auth, validatori, settings/fasi, risultati/premi, contratti e VotingPanel; componenti grandi conservati per la parte di presentazione. Nessuna riscrittura del design. |
| AUD-021 | Mitigato | Deadline voti storica unica; clock UI, polling configurazione/pubblicazione, riepilogo ricaricato al lock e dopo ricevute tardive, nessun builder prima della configurazione valida. Date 2026 non scelte. Transizioni reali browser e impostazioni DB concorrenti ancora da collaudare. |
| AUD-022 | Mitigato; tooling verificato | Node/npm dichiarati, script typecheck/test/build isolata e smoke, installazione riproducibile, fixture senza rete esterna. DB isolato reale e CI non predisposti. |
| AUD-023 | Aperto, miglioramento circoscritto | Nomi accessibili per le icone builder toccate. QA tastiera/screen reader/movimento e resto dei controlli rinviati. |
| AUD-024 | Aperto | Eliminati triplo caricamento e calcolo duplicato nella pagina classifica. Mancano misure, paginazione esplicita e verifiche del limite Data API. |
| AUD-025 | Aperto | Rimossi soltanto client browser non più utilizzato e deadline incoerente, durante i fix pertinenti. Nessuna pulizia generale o modifica del README template. |
| AUD-026 | Aperto | Nessun restyling o certificazione MUI/SSR/contrasto. |
| AUD-027 | Aperto | Asset preservati; nessuna misura o ottimizzazione richiesta dal blocco strutturale. |

### Verifiche e limiti dell'intervento

- `npm ci --ignore-scripts --no-audit --cache .npm-cache`: installazione dal lock senza script di dipendenze; cache ignorata da Git. Nessun `audit fix`, `--force` o cambio package manager.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:isolated`, `npm run test:smoke`, audit lockfile e `git diff --check`: esiti conclusivi registrati dopo l'ultima esecuzione. Lint, TypeScript e 145 test in 4 file superati; build isolata e 33 controlli HTTP superati. Audit completo e `--omit=dev`: 0 vulnerabilità. `git diff --check` superato.
- `npm ls --depth=0`: exit 0, nessun peer invalido; segnala come extraneous tre binding opzionali già presenti nel lock (`@emnapi/runtime`, `@img/sharp-wasm32`, `@tybys/wasm-util`) dopo `npm ci`. Nessuna dipendenza estranea al lock introdotta.
- La suite usa anonimo, A, B e admin fittizi. Il fake registra operazioni e contenuto delle tabelle, verifica rifiuti senza cambiamenti, errori iniziali, riferimenti, confini, versioni, retry e formula 2025. Rete esterna disabilitata nei test; smoke vincolato a loopback, con credenziali inerti.
- Problemi emersi e corretti: installazione iniziale non avviabile con cache esterna; peer types Node 20 incompatibili con Vitest 5 (allineati a Node 24); opzione esbuild superata in Vitest 5; regole lint React; timeout di un test MUI durante build concorrente (rerun dedicato superato e timeout UI proporzionato); URL NEXT_PUBLIC incorporato nella build (aggiunto `SUPABASE_URL` server a runtime); test di transizione al lock inizialmente fallito perché i membri visualizzati provenivano dalla classifica precedente (ricaricati anche i punteggi dopo la ricevuta, cancellate risposte superate). Nessuno di questi tentativi falliti è contato come verifica superata.
- Prima di usare la candidata con servizi reali: Q01/Q02/Q03, DB isolato con schema reale, prove multiistanza/transaction/commit oltre scadenza, recupero e riconciliazione 2025. Nessuna verifica manuale su browser reale/mobile, idratazione, screen reader, Vercel o Supabase è dichiarata superata.

## Audit storico del 19 novembre 2026

**Data:** 19 novembre 2026, Europe/Rome. **Baseline:** `main`, commit `0b21649` (16 dicembre 2025). **Ambito:** analisi e documentazione, senza modifiche applicative, installazioni, aggiornamenti, accessi ai dati remoti o deployment.

**Nota di consolidamento requisiti, 19 novembre 2026:** aggiornati [PROJECT_SPEC.md](PROJECT_SPEC.md) e [ROADMAP.md](ROADMAP.md), senza nuovi fix o verifiche applicative. Alla data dello snapshot tutti i **27 problemi AUD-001–027 risultavano aperti**; le evidenze, priorità, limiti e verifiche storiche di questo audit sono preservati. Sono ora approvati Magic Link, poteri admin e riservatezza Secret Santa anche rispetto agli admin applicativi: questo chiarisce requisiti prima aperti, ma non dimostra sicurezza o risolve le verifiche Q. I resoconti di comandi e consegna in fondo si riferiscono all'audit iniziale.

## Valutazione e metodo

MVP leggibile e di dimensioni gestibili, con le funzioni principali del gioco presenti. Non è pronto per una nuova release pubblica: il confine di autorizzazione è discontinuo e alcune operazioni privilegiate sono esposte senza guard. Lo stack può essere mantenuto; servono correzioni mirate e una base di verifica prima delle nuove funzioni.

Letti configurazioni, manifest/lockfile, tutti i file sorgente, route e componenti, documentazione esistente e inventario asset/Git. Il README preesistente è il template create-next-app: preservato, ma non usato come descrizione affidabile del prodotto. Non esistevano AGENTS.md o documenti di progetto nei percorsi verificati.

Classificazione delle evidenze:

- **V — verificato nel codice:** controllo mancante o comportamento direttamente osservabile dai sorgenti; non implica exploit eseguito o conferma sul deployment.
- **R — rischio potenziale:** meccanismo presente, ma effetto dipendente da policy, dati, concorrenza o configurazione non disponibili.
- **Q — verifica incompleta:** informazione esterna mancante; elencata separatamente, senza considerarla un difetto dimostrato del servizio.

Priorità: P0 blocco/rischio grave immediato; P1 da risolvere prima della release; P2 significativo; P3 secondario. Le priorità considerano la release, mentre la sfruttabilità in produzione resta condizionata al deployment effettivo. Nessuna richiesta di prova è stata inviata agli endpoint del gioco.

| Priorità | Problemi | ID |
| --- | ---: | --- |
| P0 | 2 | AUD-001–002 |
| P1 | 10 | AUD-003–012 |
| P2 | 12 | AUD-013–024 |
| P3 | 3 | AUD-025–027 |
| Totale | **27** | Le verifiche Q e i 18 pacchetti npm non si sommano a questo conteggio |

## Registro dei problemi

### AUD-001 — Reset privilegiato senza autenticazione

- **P0 · Security · V. Posizione:** `src/app/api/admin/reset-game/route.ts:15–37`.
- **Problema:** POST esegue cancellazioni con service role senza leggere la sessione o controllare un amministratore. Il `window.confirm` del pannello non protegge l'API.
- **Conseguenza:** se l'handler è pubblicamente servito e configurato, una richiesta anonima può cancellare squadre e voti. Nessuna policy RLS utente compensa la chiamata privilegiata.
- **Soluzione consigliata:** autorizzazione server obbligatoria e rimozione/limitazione dell'operazione distruttiva secondo il requisito concordato; progettare recupero e ambito edizione. Non invocare l'endpoint reale per dimostrare il difetto.
- **Regressione:** alta, coinvolge amministrazione e dati. **Verifiche:** su DB isolato, anonimo/partecipante rifiutati senza query distruttive, admin autorizzato, controlli della richiesta e audit dell'operazione; atomicità in AUD-010.

### AUD-002 — Mutazioni amministrative pubbliche

- **P0 · Security · V. Posizioni:** `api/admin/categories/route.ts:13,35,65`, `api/admin/team-deadline/route.ts:41`, `api/admin/vote-points/route.ts:41`, `api/admin/leaderboard-publish/route.ts:13`, sotto `src/app/`.
- **Problema:** creazione/modifica/cancellazione categorie e modifiche di scadenza, punti e pubblicazione usano service role senza sessione o ruolo.
- **Conseguenza:** alterazione anonima delle regole, dei punteggi derivati e della disponibilità dei risultati. La protezione di `/api/admin/base-data` non si estende a questi handler.
- **Soluzione consigliata:** guard server comune per ogni mutazione, con ruolo dal database e validazione. Definire separatamente le letture pubbliche usate da home/profilo; non bloccarle incidentalmente.
- **Regressione:** alta. **Verifiche:** matrice anonimo/A/B/admin per ogni metodo, body manipolati, mantenimento delle letture pubbliche necessarie e assenza di scritture su rifiuto.

### AUD-003 — Identità del votante controllata dal chiamante

- **P1 · Security · V. Posizione:** `src/app/api/votes/route.ts:19–60,81–106`.
- **Problema:** POST usa `voter_owner_id` nel body e GET usa il parametro omonimo, senza sessione o verifica di titolarità.
- **Conseguenza:** inserimento/sostituzione del voto di altri e lettura dei loro voti; il controllo di non autovoto è relativo all'identità dichiarata dall'attaccante. L'upsert impedisce duplicati solo se il UNIQUE remoto esiste, non impedisce impersonificazione.
- **Soluzione consigliata:** derivare il votante dalla sessione verificata, validare target e appartenenza; non accettare un owner arbitrario come autorità. Verificare UNIQUE e vincoli nel DB.
- **Regressione:** alta. **Verifiche:** utente A non può leggere/scrivere come B; anonimo rifiutato; aggiornamento del proprio voto, ripetizioni concorrenti, target invalido e autovoto.

### AUD-004 — Anteprima risultati e premi aggirabili

- **P1 · Security · V. Posizioni:** `src/app/api/leaderboard/route.ts:106–120,175–176,233–249`; `src/app/api/admin/awards/route.ts:26`; `src/app/classifica/page.tsx:109–139`; `src/app/admin/AdminRegaliClient.tsx:640–649`.
- **Problema:** l'anteprima classifica identifica l'admin da `x-fanta-owner-id`, copiato da localStorage, senza verificare chi invia l'header. L'endpoint admin awards è privo di guard e non rispetta il gate pubblico; la pagina pubblica lo richiede anche quando il risultato sarà nascosto.
- **Conseguenza:** un owner ID admin valido consente di ottenere risultati e dettaglio voti anticipati; i vincitori dei premi sono comunque leggibili senza header.
- **Soluzione consigliata:** sessione server e ruolo per anteprime; vista pubblica da endpoint con gate coerente, proiezione minima dei dati. Non considerare il gate React una protezione.
- **Regressione:** alta. **Verifiche:** non pubblicato con anonimo/A/header falsificato, admin reale, pubblicato/nascosto; ispezionare JSON e RSC oltre alla UI.

### AUD-005 — Scritture squadre anonime rispetto a Supabase Auth; RLS sconosciuta

- **P1 · Security · R/Q. Posizioni:** `src/lib/supabaseClient.ts:2–15`; `src/components/TeamBuilder.tsx:77–81,159–170`; `src/app/profilo/ProfiloClientShell.tsx:354–424`.
- **Problema:** il login applicativo non crea una sessione Supabase Auth; il client pubblico legge players/teams e scrive teams fornendo owner ID. Nessuna policy/grant è versionata.
- **Conseguenza:** se anon può eseguire queste operazioni senza una diversa identità verificata, può manipolare altri owner o righe; se RLS richiede `auth.uid()`, il normale login non la soddisfa e il flusso fallisce. **Non è stato dimostrato che RLS sia disabilitata o aperta.** Anche un'eventuale esposizione di access_code/is_admin via Data API resta da verificare.
- **Soluzione consigliata:** unico modello di identità e autorizzazione coerente tra API e RLS; operazioni critiche server o client autenticato con policy di titolarità, fase e invarianti verificati.
- **Regressione:** alta. **Verifiche:** schema/grant/RLS reali sanificati, prove DB isolate anon/A/B/admin su ogni tabella e colonna, inclusa lettura credenziali e promozione ruolo.

### AUD-006 — Fasi e scadenze non imposte alle votazioni

- **P1 · Security · V; copertura DB Q. Posizioni:** `src/app/api/votes/route.ts:19–60`; `src/app/profilo/ProfiloClientShell.tsx:28,311–352,895–913`; `src/components/TeamBuilder.tsx:150–170`.
- **Problema:** API voti non verifica apertura/chiusura, mentre la UI nasconde il pannello secondo date e orologio locali. Per le squadre il solo controllo visibile è `isLocked` nel browser; il builder viene montato anche mentre la deadline deve ancora essere caricata e può avviare l'autosave prima di conoscerla. Eventuali trigger/policy DB non verificati.
- **Conseguenza:** l'handler consente voti fuori finestra, anche dopo pubblicazione; i risultati sono mutabili. Blocco squadre non certificabile contro richieste dirette.
- **Soluzione consigliata:** tempo server, configurazione per edizione e controlli sulla stessa operazione che persiste; gestire confini e concorrenza con la chiusura.
- **Regressione:** alta. **Verifiche:** prima/esattamente/dopo scadenza, clock browser alterato, richiesta iniziata prima e conclusa dopo, configurazione mancante/invalida e retry.

### AUD-007 — Dipendenze con advisory di sicurezza

- **P1 · Security · V per versioni e audit; R/Q per raggiungibilità. Posizioni:** `package.json:11–28`, `package-lock.json`, `next.config.ts:3`.
- **Problema:** audit lockfile del 19/11/2026 segnala 18 pacchetti, incluso Next 16.0.7 classificato critical. Advisory e condizioni descritti sotto; non equivalgono a 18 exploit dell'app.
- **Conseguenza:** esposizione a bug noti di runtime/toolchain; DoS RSC pertinente all'App Router, altre vulnerabilità dipendono da funzionalità e hosting. Non è dimostrata una RCE sul deployment.
- **Soluzione consigliata:** blocco autorizzato di aggiornamento mirato con matrice di compatibilità Next/React/MUI/Node, nuovo audit e regressione. Nessun `audit fix --force` automatico e nessun aggiornamento effettuato qui.
- **Regressione:** alta, framework e lockfile. **Verifiche:** build, rendering/idratazione, auth/cookie, API e punteggi, advisory runtime/dev separati e verifica artefatto effettivamente deployato.

### AUD-008 — Contratto regalo ricevuto/donato incoerente

- **P1 · Bug · V per incoerenza; correttezza storica Q. Posizioni:** `src/app/api/leaderboard/route.ts:252–254,396–419`; `src/app/page.tsx:312–322`; `src/app/classifica/page.tsx:286`; `src/app/api/admin/gifts/route.ts:90–99`.
- **Problema:** i testi attribuiscono punti ai regali ricevuti, ma il calcolo indicizza il regalo con `santa_owner_id` e non legge il destinatario. Non si può sapere dal repository se i dati 2025 abbiano usato quel campo col significato letterale o come destinatario di fatto.
- **Conseguenza:** rischio di attribuire punti alla persona sbagliata o di migrare dati con significato invertito.
- **Soluzione consigliata:** chiarire D05 su schema e campione sanificato; approvare esempi con due persone distinte prima di correggere o rinominare/migrare. Non invertire autonomamente il calcolo.
- **Regressione:** alta, storico e classifiche. **Verifiche:** donatore diverso dal ricevente, bonus/malus, premio, capitano, risultati 2025 di riferimento approvati.

### AUD-009 — Modifica regalo azzera destinatario esistente

- **P1 · Bug · V per payload; presenza dati interessati Q. Posizioni:** `src/app/admin/AdminRegaliClient.tsx:63–69,251–257,372–379`; `src/app/api/admin/gifts/route.ts:85–99`.
- **Problema:** il client scarta receiver dalla lettura e non lo reinvia; il POST converte l'omissione in null e lo include nell'upsert.
- **Conseguenza:** modificando categoria/bonus, un eventuale receiver non nullo viene sovrascritto. Il campo opzionale del contratto non distingue omissione da cancellazione.
- **Soluzione consigliata:** contratto update esplicito che preservi i campi omessi e distingua reset intenzionale, dopo chiarimento semantico AUD-008.
- **Regressione:** alta. **Verifiche:** riga con receiver esistente, modifica di sola categoria o bonus, destinatario esplicito, null intenzionale e create senza destinatario.

### AUD-010 — Reset non atomico e stato incoerente

- **P1 · Bug · V/R. Posizioni:** `src/app/api/admin/reset-game/route.ts:19–43`; `src/app/admin/AdminRegaliClient.tsx:779–789`; `src/components/TeamBuilder.tsx:96–136,138–191`.
- **Problema:** due delete separati senza rollback; gifts e flag pubblicazione restano, ma UI azzera giftMap; cache locali delle squadre restano valide.
- **Conseguenza:** fallimento a metà produce reset parziale; pannello mostra gifts mancanti inesistenti come problema; una cache locale può ricreare squadre cancellate se il builder torna editabile e l'upsert è permesso. Pubblicazione resta attiva su dati resettati.
- **Soluzione consigliata:** definire prima la semantica del reset, transazione e recupero; coerenza UI/DB, invalidazione cache con versione server/edizione. Evitare reset globale per cambiare anno.
- **Regressione:** alta. **Verifiche:** errore fra cancellazioni, richieste concorrenti, refresh pannello, browser con cache preesistente e classifica già pubblicata; solo ambiente isolato.

### AUD-011 — Autosave può sovrascrivere stato più recente o dati validi

- **P1 · Bug · R. Posizioni:** `src/components/TeamBuilder.tsx:70–136,138–192,334–360`; `src/app/admin/AdminRegaliClient.tsx:396–440`.
- **Problema:** richieste complete non serializzate/versionate; un errore lettura team porta al fallback cache/array vuoto e, terminato loading, a un upsert. Il builder accetta click durante il load. Salvataggi gift chiamati dentro updater React, che deve essere puro.
- **Conseguenza:** risposta fuori ordine, cache vecchia o lettura transitoriamente fallita possono sovrascrivere dati più recenti; replay updater in sviluppo può duplicare side effect.
- **Soluzione consigliata:** separare stato remoto confermato e stato locale in attesa di persistenza, interrompere scritture su errore iniziale, serializzare o usare controllo versione; side effect fuori dagli updater. Definire politica multi-tab. Questa separazione tecnica non introduce un flusso funzionale di bozze o conferme obbligatorie: per il 2026 sono approvati autosave e pulsante di conferma del salvataggio corrente (R26-05).
- **Regressione:** alta. **Verifiche:** rete lenta/fallita, due update fuori ordine, due tab, click durante load, StrictMode e recupero senza ripristino silenzioso di dati vecchi.

### AUD-012 — Schema e garanzie DB non riproducibili

- **P1 · Architecture · V per assenza locale; DB Q. Posizioni:** repository privo di SQL/migrazioni/tipi DB; `src/components/TeamBuilder.tsx:170`, `src/app/api/votes/route.ts:58`, `src/app/api/admin/gifts/route.ts:99`, `src/app/api/admin/categories/route.ts:76–106`.
- **Problema:** codice presume UNIQUE e relazioni senza schema versionato. Integrità di array membri, FK, no-autovoto e race delete-categoria non verificabili.
- **Conseguenza:** ambiente non ricostruibile fedelmente; migrazioni e fix possono rompere dati o contare duplicati/orfani. Non si afferma che i vincoli remoti manchino.
- **Soluzione consigliata:** acquisire DDL/grant/RLS sanificati, verificare dati e vincoli, poi versionare baseline/migrazioni autorizzate; protezioni atomiche nel DB, senza sostituire controlli di servizio.
- **Regressione:** alta per future migrazioni. **Verifiche:** ricostruzione isolata, UNIQUE richiesti, FK/delete behavior, duplicati membri, capitano estraneo, riferimenti inesistenti, concorrenza controllo-utilizzo/delete.

### AUD-013 — Feedback di successo scollegato dalla persistenza

- **P2 · UX · V. Posizioni:** `src/app/profilo/ProfiloClientShell.tsx:474–478,925–950`; `src/app/admin/AdminRegaliClient.tsx:382–393,1610–1622`; `src/app/profilo/ProfiloClientShell.tsx:134–160`.
- **Problema:** “Salva squadra” cambia solo un booleano; “Salvato” gifts deriva da categoria presente, anche dopo errore; voti aggiornati ottimisticamente senza rollback.
- **Conseguenza:** utente crede persistita una scelta respinta o ancora in volo; pulsante visivamente attenuato non usa `disabled` quando canSave=false.
- **Soluzione consigliata:** stato di scrittura confermato, errori visibili e retry; rendere coerente la semantica del pulsante con autosave o salvataggio esplicito concordato.
- **Regressione:** media. **Verifiche:** errore/rete lenta, navigazione immediata, retry, messaggio solo dopo conferma DB, stato disabilitato accessibile.

### AUD-014 — Opzioni di cancellazione selezione non persistono

- **P2 · Bug · V. Posizioni:** `src/app/admin/AdminRegaliClient.tsx:363–368,396–413,1586–1588`; `src/app/profilo/ProfiloClientShell.tsx:134–153,201–203`; `src/app/api/votes/route.ts:24`.
- **Problema:** categoria “Nessuna” svuota UI ma saveGift ritorna senza richiesta; voto “Nessuno selezionato” invia target vuoto che l'API rifiuta. Non esiste un endpoint DELETE per questi casi.
- **Conseguenza:** al refresh ricompare la scelta precedente; una UI apparentemente valida diverge dal server.
- **Soluzione consigliata:** concordare se rimuovere è consentito; implementare operazione esplicita con guard o eliminare l'opzione fuorviante. Non dedurre una regola 2026 dall'opzione esistente.
- **Regressione:** media. **Verifiche:** scelta vuota dopo una persistita, refresh e punteggio conseguente; comportamento in fase chiusa.

### AUD-015 — Validazione runtime incompleta

- **P2 · Security · V. Posizioni:** `src/app/api/admin/categories/route.ts:14–20,36–49`; `admin/team-deadline/route.ts:44–78`; `admin/vote-points/route.ts:53–58`; `admin/gifts/route.ts:69–88`; `votes/route.ts:21–24` (percorsi sotto `src/app/api`).
- **Problema:** cast senza validazione, coercizioni permissive, date arbitrarie e JSON null non gestito uniformemente; punti non limitati né sempre finiti; riferimenti non verificati applicativamente.
- **Conseguenza:** 500 su richieste malformate, configurazioni inutilizzabili, dati inattesi e punteggi errati, condizionati ai vincoli DB.
- **Soluzione consigliata:** schemi runtime/validatori condivisi con limiti concordati, errori 400 coerenti, controlli di riferimenti ed edizione. La scelta di una libreria richiede motivazione, non è automatica.
- **Regressione:** media. **Verifiche:** null, array, tipi errati, stringhe vuote/lunghe, numeri non finiti, ID inesistenti, ISO invalida e proprietà mancanti.

### AUD-016 — Accesso con codice senza difese applicative contro tentativi ripetuti

- **P2 · Security · V per assenza locale; esposizione R/Q. Posizione:** `src/app/api/login/route.ts:15–32`; `src/app/login/page.tsx:165–166`.
- **Problema:** confronto diretto con access_code normalizzato, senza hashing applicativo, limite server di lunghezza o rate limiting/monitoraggio dei tentativi. Codici statici hanno autorità di accesso.
- **Conseguenza:** forza bruta o riuso di un codice conosciuto, a seconda di entropia, distribuzione e protezioni esterne non verificate. Nessun codice reale è stato letto.
- **Soluzione consigliata:** mitigazione mirata durante la transizione e sostituzione con email verificata; verificare limiti infrastrutturali e gestione errori senza enumerazione aggiuntiva.
- **Regressione:** media. **Verifiche:** soglie/ripristino, accessi legittimi, input enorme o non stringa e inventario sicuro della generazione/distribuzione codici.

### AUD-017 — Sessioni, logout e configurazione non governati uniformemente

- **P2 · Security · V/R. Posizioni:** `src/components/MainNavbar/MainNavbar.tsx:57–66`; `src/lib/session.ts:6,13–26,30–45`; `src/lib/supabaseAdmin.ts:3–6`; `src/lib/supabaseClient.ts:4–15`.
- **Problema:** logout navbar non cancella cookie; JWT senza revoca individuale; configurazione a import-time non validata. SESSION_SECRET assente produce un array di byte vuoto, non un errore di configurazione esplicito prima dell'uso crittografico.
- **Conseguenza:** utente apparentemente uscito può tornare al profilo; token sottratto resta valido fino a scadenza; env incomplete causano guasti runtime. Non è dimostrato un bypass crittografico né una chiave esposta.
- **Soluzione consigliata:** logout unificato lato server e modello sessioni coerente con futura auth; validazione env e confine server-only; durata/revoca deliberate.
- **Regressione:** alta sull'accesso. **Verifiche:** logout da entrambi i percorsi, navigazione diretta dopo logout, cookie scaduto/alterato, utente rimosso, env mancanti, scope cookie e protezioni Origin/CSRF.

### AUD-018 — Classifica può restituire un successo incompleto o incoerente

- **P2 · Bug · V/R. Posizioni:** `src/app/api/leaderboard/route.ts:277–298,315–388`; `src/app/api/admin/vote-points/route.ts:23–28`; `src/app/api/awards/route.ts:77–82`; `src/app/api/admin/awards/route.ts:49–54`.
- **Problema:** errore voti omette i bonus ma restituisce classifica 200; errore configurazione usa zeri. Awards accetta un cast VoteType senza controllo runtime, mentre leaderboard normalizza alias; nomi da lista statica invece di players; flag pubblicazione interpretato diversamente.
- **Conseguenza:** punteggi apparentemente definitivi ma incompleti, premi diversi tra viste; tipo inatteso nel DB può causare errore di aggregazione negli awards. Presenza di tali dati legacy non verificata.
- **Soluzione consigliata:** servizio di calcolo deterministico condiviso, contratto canonico e fallimento esplicito sui dati necessari; distinguere configurazione assente da errore. Concordare D08 per snapshot/pubblicazione.
- **Regressione:** alta. **Verifiche:** fault injection per ogni lettura, formati legacy se realmente esistenti, tipo ignoto, pareggi/zeri/malus, coerenza tra profilo, classifica, premi e admin.

### AUD-019 — Dati globali e conflitti non separati per edizione

- **P2 · Architecture · V/R. Posizioni:** `src/components/TeamBuilder.tsx:68,170`; `src/app/api/admin/gifts/route.ts:99`; `src/app/api/votes/route.ts:58`; route game_settings e reset.
- **Problema:** ID e upsert sono globali, senza anno/edizione; impostazioni singleton e reset delle tabelle intere.
- **Conseguenza:** riusare il modello nel 2026 rischia sovrascritture o perdita dello storico; impossibile gestire due edizioni indipendenti con i contratti attuali.
- **Soluzione consigliata:** distinguere identità, partecipazione e dati annuali; migrazione additiva e scoping coerente, dopo inventario DB e decisione su storico.
- **Regressione:** alta. **Verifiche:** stesso utente in due edizioni, vincoli composti, API/RLS/cache isolate, consultazione 2025 invariata e assenza di reset storico.

### AUD-020 — Responsabilità concentrate e contratti duplicati

- **P2 · Maintainability · V. Posizioni:** `src/app/admin/AdminRegaliClient.tsx:153–1721`; `src/app/profilo/ProfiloClientShell.tsx:82–216,237–966`; `src/app/api/leaderboard/route.ts:175–452`; i due endpoint awards.
- **Problema:** componenti gestiscono UI, rete, persistenza e regole; VoteType e contratti punteggi ripetuti; identità/nomi da fonti diverse. Controlli admin non condivisi hanno già divergenze concrete.
- **Conseguenza:** fix di sicurezza o punteggi applicati a un percorso possono lasciare incoerenti gli altri; difficile testare logica isolata. Non sono stati trovati `any` espliciti nei sorgenti, ma createClient non usa tipi DB generati e molti cast danno falsa sicurezza.
- **Soluzione consigliata:** estrazioni solo durante interventi pertinenti: guard auth, contratti validati, calcolo e accesso dati; sezioni UI admin/profilo per responsabilità. Conservare framework e convenzioni utili.
- **Regressione:** media/alta. **Verifiche:** equivalenza dei casi di riferimento prima/dopo, tutti i chiamanti, dipendenze client/server e nessun segreto nel bundle.

### AUD-021 — Date, fasi e riepiloghi possono restare obsoleti

- **P2 · Bug · V/R. Posizioni:** `src/app/page.tsx:10,71–83,307–326`; `src/app/profilo/ProfiloClientShell.tsx:28,387–424`; `src/config/gameConfig.ts:4`.
- **Problema:** home calcola la fase con useMemo dipendente solo da deadlineIso; nessun timer la aggiorna. Riepilogo team caricato prima delle modifiche e non ricaricato al lock. Scadenza voti 2025 duplicata, testi fissi e deadline non usata differente; caricamenti pubblicazione non si aggiornano nella pagina aperta.
- **Conseguenza:** UI invita a un'azione scaduta o mostra una squadra precedente; la data attuale del 2026 non aggiorna da sola regole hardcoded.
- **Soluzione consigliata:** fonte configurazione unica per edizione, tempo autorevole server, aggiornamento UI alle transizioni e invalidazione dati confermati; nessuna nuova data scelta qui.
- **Regressione:** media. **Verifiche:** pagina aperta attraverso i confini, modifica subito prima del lock, pubblicazione/nascondimento, fusi orari differenti, deadline nulla/invalida.

### AUD-022 — Verifica automatica e ambiente non riproducibili completamente

- **P2 · Maintainability · V/Q. Posizioni:** `package.json:5–9,22–28`, `tsconfig.json`, `eslint.config.mjs`; nessun test/workflow rilevato.
- **Problema:** mancano test e script typecheck, dichiarazione runtime e CI; checkout senza dipendenze e env di test. L'assenza di node_modules non è un bug applicativo, ma impedisce la certificazione attuale.
- **Conseguenza:** modifiche critiche senza regressione misurabile; build e lint non certificati, possibili divergenze dal deployment.
- **Soluzione consigliata:** predisporre baseline riproducibile autorizzata, script/CI e test critici prima dei refactor; definire ambiente DB isolato e fixture sanificate.
- **Regressione:** bassa per tooling, media per aggiornamenti connessi. **Verifiche:** clean install autorizzata, tsc/lint/build separati, casi auth/voti/punteggi, comandi eseguibili senza credenziali produzione.

### AUD-023 — Controlli interattivi senza nome accessibile

- **P2 · UX · V per markup; esperienza runtime Q. Posizioni:** `src/components/TeamBuilder.tsx:358–360,421–469`; `src/components/MainNavbar/MainNavbar.tsx:218–227`; `src/app/admin/AdminRegaliClient.tsx:984,1454–1467`.
- **Problema:** pulsanti con sola icona senza aria-label esplicita; card cliccabili senza semantica/tastiera equivalente per l'intera area. Mancano preferenze reduced-motion per animazioni esistenti.
- **Conseguenza:** azioni difficili da distinguere con screen reader; funzionalità accessibile da tastiera solo parzialmente tramite icone non nominate.
- **Soluzione consigliata:** nomi contestuali, controlli semantici con stato selezionato, focus e tastiera; limitare il movimento secondo preferenza. Intervento tecnico distinto dal restyling estetico.
- **Regressione:** bassa/media. **Verifiche:** tastiera, screen reader, focus Drawer/dialog, touch, zoom e movimento ridotto. Non è stata dichiarata conformità WCAG.

### AUD-024 — Letture complete ripetute e nessuna paginazione esplicita

- **P2 · Performance · V per richieste; impatto R/Q. Posizioni:** `src/app/api/leaderboard/route.ts:202–304`; `src/app/api/awards/route.ts:54–57`; `src/app/classifica/page.tsx:60–139`; `src/components/PodiumPublic.tsx:35–61`.
- **Problema:** leaderboard legge intere tabelle con richieste sequenziali; classifica carica tre endpoint con elaborazioni duplicate; podio recupera tutta la leaderboard per mostrarne tre. Nessuna paginazione per voti/squadre/players.
- **Conseguenza:** latenza e dati trasferiti superflui; sopra il limite di righe configurato dalla Data API risultati possono essere troncati. Non è dimostrato un problema di scala con i 32 partecipanti statici.
- **Soluzione consigliata:** misurare, riusare risultati e parallelizzare letture indipendenti; proiezioni minime e paginazione/aggregazione server dove necessarie. Non introdurre cache condivise per dati privati senza separazione identità/edizione.
- **Regressione:** media. **Verifiche:** conteggi rete/query, dataset sopra il limite reale, completezza punteggi, consistenza durante scritture e assenza di dati sensibili in risposte pubbliche.

### AUD-025 — Residui e documentazione template fuorviante

- **P3 · Maintainability · V per riferimenti locali. Posizioni:** `src/components/LeaderboardPublic.tsx:41`; `src/data/giftCategories.ts:11`; `src/config/gameConfig.ts:4`; `src/app/page.module.css`; `README.md:19–21`; SVG template e wall-clock.
- **Problema:** nessun utilizzo rilevato per componenti/config/esempi/CSS elencati; README indica app/page.tsx invece di src e font Geist non configurato. Commenti di layout/navbar discordano sul nascondere la navbar in home.
- **Conseguenza:** modifiche future nella fonte sbagliata e manutenzione inutile; duplicati possono essere riattivati inconsapevolmente.
- **Soluzione consigliata:** pulizia documentata in blocco separato dopo conferma degli usi; README essenziale con rinvii ai documenti. Nessun file cancellato in questa sessione.
- **Regressione:** bassa ma verificare riferimenti dinamici/esterni. **Verifiche:** ricerca import, build e inventario route/asset prima di rimuovere.

### AUD-026 — Tema e CSS non completamente coerenti

- **P3 · UX · V per configurazione; impatto visuale Q. Posizioni:** `src/theme/theme.ts:3,21–28`; `src/components/AppThemeProvider.tsx:7–11`; `src/app/globals.css:40–43`; `src/app/login/page.tsx:108`; `src/app/admin/AdminRegaliClient.tsx:813–815`.
- **Problema:** override CssBaseline senza CssBaseline montato, color-scheme dark globale con tema light, font nominato non caricato e stili/colori ripetuti o ereditati.
- **Conseguenza:** possibili contrasti o controlli browser incoerenti; non misurati e non classificati come errore visuale certo.
- **Soluzione consigliata:** consolidare token e reset durante il blocco UI, verificando prima comportamento MUI/SSR. Nessuna sostituzione del design system necessaria per principio.
- **Regressione:** media visiva. **Verifiche:** dispositivi/temi, contrasto misurato, focus, loading e idratazione/ordine stili.

### AUD-027 — Asset principale sovradimensionato alla sorgente

- **P3 · Performance · V per dimensione; impatto Q. Posizioni:** `public/logo/fantaclaus.png` (1.715.933 byte); `src/components/MainNavbar/MainNavbar.tsx:142–151`; `src/app/page.tsx:214–220`; `src/components/PodiumPublic.tsx:107–113`.
- **Problema:** PNG grande usato per logo piccolo e illustrazione, con priority in più contesti; immagini responsive senza dichiarazione sizes esplicita in questi utilizzi.
- **Conseguenza:** potenziale costo di trasferimento/decodifica e priorità superflua. next/image già ottimizza il file: il peso sorgente non è il peso necessariamente trasferito.
- **Soluzione consigliata:** misurare output effettivo, dimensionare varianti e preload in base all'uso, prima di convertire asset.
- **Regressione:** bassa. **Verifiche:** Network, LCP/CLS, resa su schermi densi e mobile. Nessun benchmark eseguito qui.

## Sicurezza: confini delle conclusioni

La falsificazione dell'header admin, le API senza guard e l'uso dell'identità dal body sono difetti verificati nel sorgente. L'effettiva esposizione pubblica della versione esaminata non è stata verificata. Non sono stati usati endpoint remoti, richieste manipolate reali o dati di partecipanti per dimostrarli.

La service role è referenziata soltanto in un modulo server importato dai Route Handler; non sono emersi valori segreti nel sorgente corrente esaminato. Non è stato effettuato uno scan completo della storia Git, dei bundle prodotti o dei log remoti. La chiave anon pubblica è prevista dallo stack e non costituisce da sola una fuga di segreti.

La pubblicazione rende già pubblici i dettagli nominativi dei voti e, prima della pubblicazione, la leaderboard restituisce composizione e capitano delle squadre. È un comportamento verificato; stabilire se debba essere permesso è D07, non una regola di anonimato inventata dall'audit. Anche l'elenco statico dei partecipanti è distribuito nei componenti client: valutare il perimetro di visibilità approvato.

Non risultano SQL dinamico, eval o rendering HTML da input utente tramite dangerouslySetInnerHTML. Non è una certificazione generale contro injection/XSS: la revisione runtime non è stata eseguita.

## Dipendenze: risultato e applicabilità

`npm audit --package-lock-only --ignore-scripts --json` completato con accesso di rete autorizzato, senza installazioni, fix o cambiamenti al lockfile. Exit 1 **per advisory rilevati**, distinto dal primo tentativo fallito per rete. Risultato npm: **18 pacchetti: 1 critical, 12 high, 4 moderate, 1 low**. Il numero conta pacchetti segnalati, non CVE uniche né vulnerabilità sfruttate. Il suggerimento npm per Next era 16.4.6 al momento del controllo; non costituisce una selezione definitiva di versione.

| Gravità npm | Pacchetti segnalati |
| --- | --- |
| Critical | next |
| High | brace-expansion, browserslist, flatted, js-yaml, minimatch, nanoid, picomatch, postcss, sharp, source-map-js, ws, zod |
| Moderate | @humanfs/node, ajv, baseline-browser-mapping, yaml |
| Low | @babel/core |

Next è una dipendenza diretta; gli altri pacchetti segnalati sono transitivi. Non assumere che ogni high sia esposto al traffico pubblico: alcuni appartengono a lint/build, altri a runtime o dipendenze condivise. Dopo l'aggiornamento autorizzato servirà una nuova analisi del grafo e dell'artefatto.

Fonti primarie consultate:

- Next 16.0.7 include la correzione iniziale React2Shell del dicembre 2025. Non attribuire automaticamente quella RCE a questa versione solo perché `react` è 19.2.0: i pacchetti RSC e il framework hanno distribuzione propria. [Advisory Next originale](https://github.com/vercel/next.js/security/advisories/GHSA-9qr9-h5gf-34mp).
- La versione resta nei range di advisory successivi DoS RSC e source exposure. App Router è presente; source exposure legata a Server Functions non è stata dimostrata, non risultando `use server` nel repository. [Aggiornamento dicembre 2025, con addendum](https://nextjs.org/blog/security-update-2025-12-11).
- Audit segnala anche RCE condizionali Windows hosting, ottimizzazione immagini e Cache Components. Il checkout è Windows, ma non prova che lo sia il server di produzione; non risultano `use cache` o Cache Components configurati. L'uso di next/image è presente, mentre backend immagini e raggiungibilità di input malevoli richiedono verifica. [Aggiornamento upstream ottobre 2026](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
- Sono state consultate anche le ulteriori correzioni di novembre, senza attribuire al progetto funzioni cache/Edge assenti dai sorgenti. [Release sicurezza novembre 2026](https://nextjs.org/blog/november-2026-security-release).

## Verifiche completate, fallite e non eseguibili

| Controllo/comando | Esito | Significato |
| --- | --- | --- |
| `git status --short --branch`, `git branch --show-current`, `git log -1` | Completati | main, inizialmente pulito, commit 0b21649 |
| `git -c core.excludesFile=NUL rev-list --left-right --count HEAD...origin/main` | Completato: 0 / 0 | Allineato al riferimento locale origin/main; nessun fetch effettuato |
| `rg --files --hidden ...`, lettura sorgenti numerata e ricerche riferimenti | Completati | Inventario, flussi e riferimenti riportati; nessuna query remota |
| Parsing JSON manifest/lock con Node; confronto dipendenze root | Superato | Lock v3 valido, root allineata, 447 pacchetti; primo tentativo ConvertFrom-Json PowerShell fallito sulla chiave vuota del lock, risolto con Node |
| `node --version`, `npm --version` | Completati | v24.14.0 / 11.11.1 |
| `npm run lint` | Non avviabile, exit 1 | Binario eslint assente; nessuna diagnosi ESLint sul sorgente |
| `npm run build` | Non avviabile, exit 1 | Binario next assente; build non certificata |
| TypeScript: presenza `node_modules/typescript/bin/tsc` | Non eseguibile | Compiler assente; comando tsc non lanciato, nessuna installazione via npx |
| `npm test -- --runInBand` | Non avviabile, exit 1 | Script test assente; nessuna suite presente, nessun test passato |
| npm audit lockfile, primo tentativo | Fallito per rete | Non era un responso di sicurezza |
| npm audit lockfile, ripetizione autorizzata e riepilogo | Completato, exit npm 1 | 18 pacchetti segnalati; la shell del riepilogo termina 0, il responso npm registrato è 1 |
| `TextEncoder().encode(undefined)` con Node | Completato: 0 byte | Conferma assenza fail-fast su SESSION_SECRET; non prova falsificabilità JWT |
| Risoluzione URL `api/admin/awards` su `/classifica` con Node URL | Completata: `/api/admin/awards` | Il percorso relativo attuale risolve correttamente senza trailing slash; non classificato come 404 dimostrato |
| `git diff --check` | Superato sulla baseline e dopo la documentazione | Nessun errore whitespace nei diff tracciati; nuovi Markdown verificati separatamente |
| QA Markdown finale | Superata | Cinque documenti, riferimenti locali e posizioni nel sorgente controllati, registro di 27 ID coerente |
| Scansione limitata sorgenti tracciati per segreti con Node | Nessuna corrispondenza | Pattern per chiavi private, token JWT letterali, chiavi Supabase segrete e assegnazioni letterali dei due segreti; non copre tutti i formati né la storia |
| `git diff --stat`, `git diff --name-only`, `git status --short --branch --untracked-files=all` | Completati | Nessun file tracciato modificato; soltanto i cinque Markdown nuovi |

Non è stata avviata l'app: mancano dipendenze e configurazione locale. Non eseguiti test E2E, integrazione DB, screenshot mobile, screen reader, Lighthouse o analisi bundle. Questi sono controlli **non completati**, non fallimenti dimostrati dell'applicazione.

## Verifiche esterne ancora necessarie

| ID | Verifica Q | Evidenza richiesta, senza segreti |
| --- | --- | --- |
| Q01 | DDL reale e integrità | Schema sanificato, PK/FK/UNIQUE/CHECK/indici, trigger e comportamenti di cancellazione; dati di prova coerenti |
| Q02 | RLS e grant su tutte le tabelle esposte | Policy e ruoli anon/authenticated, protezione access_code/is_admin, test positivi/negativi separati; eventuali view/RPC |
| Q03 | Significato gift e dati 2025 | Campione sanificato e risultati approvati per D05; corrispondenza tra players e lista statica |
| Q04 | Vercel e versione realmente pubblicata | Progetto/branch/runtime/versioni effettivi, backend immagini, header, protezioni esterne, cache e ambiente preview/produzione |
| Q05 | Configurazione e operatività | Presenza/robustezza/rotazione segreti, policy codici e sessioni, limiti richieste, log sicuri, backup e prova recupero |
| Q06 | Comportamento runtime | Build/lint/tsc con dipendenze autorizzate; auth/API con DB isolato; visuale mobile, accessibilità, idratazione MUI e performance |
| Q07 | Confidenzialità prevista e sua attuazione | Visibilità squadre e dettaglio nominativo voti ancora da definire. Per Secret Santa è ora approvato che neppure gli admin applicativi leggano assegnazioni altrui: verificare realmente questo vincolo e i poteri R26-06 su API/DB/cache/log; nessuna verifica tecnica chiusa |

L'assenza di strumenti o credenziali remoti non è un'autorizzazione a interrogare la produzione. L'audit del database e delle policy resta esplicitamente **non completato**.

## Parti sane e riutilizzabili

- App Router e Route Handler standard, TypeScript strict e alias coerenti: base adeguata, nessun motivo di riscrittura totale.
- Cookie firmato, HttpOnly, SameSite e Secure in produzione: protezioni reali da preservare o migliorare durante la migrazione.
- Guard server di base-data/gifts controlla ruolo nel DB; è un esempio utile per uniformare gli altri endpoint, con test e semantica errori coerenti.
- Query Supabase con selezioni generalmente esplicite e filtri strutturati; nessuna SQL concatenata rilevata.
- Upsert con conflitti dichiarati esprime intenzioni utili di unicità: vanno verificate contro DDL, non eliminate.
- Separazione client pubblico/admin già presente e service role non importata dai componenti browser rilevati.
- Formula capitano e gestione ex aequo premi già identificabili; possono diventare funzioni pure con casi di riferimento prima di cambiarne il contratto.
- MUI, tema/palette, componenti podio e builder, layout responsive e diversi loading/error/empty state sono recuperabili.
- Delete categoria riconosce dipendenze dai gifts e risponde 409: preservarne l'intento, rendendo la garanzia atomica tramite vincoli verificati.
- Lockfile allineato e working tree inizialmente pulito consentono una baseline documentabile. Nessuna dipendenza diretta è risultata palesemente superflua.

## Preparazione 2026 e ordine operativo

Conservare stack, route e componenti utili; correggere prima identità/autorizzazioni e consistenza. Valutare una riprogettazione circoscritta del confine auth/dati, del modello annuale e del servizio di calcolo, non dell'intera UI. Secret Santa richiede un dominio separato dalle righe gifts esistenti: queste non dimostrano né unicità dei destinatari né riservatezza.

Autenticazione email ed edizioni sono prerequisiti per un sorteggio sicuro. Restyling e Lottie sono compatibili con React client, ma non risolvono accesso e integrità e non devono precedere quei blocchi. Decisioni funzionali in [PROJECT_SPEC.md](PROJECT_SPEC.md), dettaglio interventi in [ROADMAP.md](ROADMAP.md).

## Git e consegna documentale

Branch `main`, upstream locale `origin/main`, inizialmente nessuna modifica. Nessun commit, push, merge, fetch o deployment effettuato. Git segnala impossibilità di leggere l'ignore globale fuori workspace. Il tentativo con `-c core.excludesFile=NUL` funziona per rev-list, ma fallisce su status con “cannot use NUL as an exclude file”; i controlli finali con i comandi originali sono riusciti, conservando il solo avviso sull'ignore globale. Nessuna configurazione Git modificata.

Creati soltanto `AGENTS.md`, `docs/PROJECT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/AUDIT_REPORT.md`, `docs/ROADMAP.md`. README e file applicativi preservati. Stato finale atteso e verificato con untracked completi:

```text
## main...origin/main
?? AGENTS.md
?? docs/ARCHITECTURE.md
?? docs/AUDIT_REPORT.md
?? docs/PROJECT_SPEC.md
?? docs/ROADMAP.md
```

Non sono necessari altri Markdown ora: specifiche, architettura, registro problemi e roadmap coprono i ruoli senza duplicazioni di stato. Eventuali decisioni future possono essere registrate nei documenti pertinenti; aggiungere ADR separati solo quando una decisione complessa lo giustifica.
