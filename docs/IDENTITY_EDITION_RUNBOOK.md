# B03–B05 — configurazione, collaudo e migrazione controllata

Stato del 20 novembre 2026. **Nessuna operazione remota eseguita. Non è un'autorizzazione a migrare o pubblicare.** Le migrazioni sono implementate e provate sul motore PostgreSQL di PGlite; GoTrue, PostgREST, SMTP pubblico e recupero Supabase reale richiedono ancora collaudo. Lo stato conclusivo dei comandi è in [AUDIT_REPORT.md](AUDIT_REPORT.md).

## Fonti e limiti della baseline

Letti entrambi i CSV in `docs/db-audit`: colonne/default/nullabilità e vincoli/indici/grant/RLS delle sette tabelle. Gli indici indicano lo schema `public`. Confermati PK, FK e UNIQUE riportati nei CSV, inclusi `gifts_santa_owner_unique`, conflitto votante/tipo e `gift_assignments(giver_id text, category_id text)` senza FK documentata. Non si trasforma `gift_assignments` nel nuovo sorteggio.

Mancano DDL completo, proprietari, ACL di schema/colonne/sequenze, grant ereditati, definizioni delle policy, trigger ordinari/event trigger, view/RPC, estensioni/versioni complete, ruoli/default privilege di tutti i proprietari e campione dati/risultati 2025 approvato. I CSV non dimostrano l'assenza di questi oggetti. I nomi dei due schemi esposti non sono stati forniti; il secondo nome resta da rilevare nelle impostazioni Data API. `tests/sql/legacy-fixture.sql` ricostruisce soltanto le informazioni disponibili, con dati fittizi: **non è una baseline di produzione**. `supabase/inspect/preflight.sql` prepara un inventario di catalogo senza righe utente né corpi di funzioni; eventuale esecuzione remota richiederà autorizzazione e sanificazione dell'output.

## Modello e confini implementati

- `auth.users`: identità UUID/email verificata, gestita da Supabase Auth. Nessun collegamento al vecchio owner ID, nemmeno per nome uguale.
- `fc_private.profiles`: nome/cognome inizializzati una sola volta dopo verifica email; solo avatar modificabile dall'utente. Identificativi ammessi: `santa`, `reindeer`, `elf`, `snowman`. Nessun URL arbitrario.
- `editions`, `games`, `game_config`: edizione, partita ufficiale/simulazione e configurazione distinte; una sola ufficiale per anno. Il seed crea soltanto il 2026, **inattivo**, iscrizioni chiuse e nessuna scadenza presunta. Le simulazioni hanno un contenitore distinto ma non ancora API, personaggi o ciclo di gioco (B06).
- `participations`: membership per UUID/partita/edizione con FK composte; una partecipazione 2027 o a una simulazione non vale per l'ufficiale 2026. Registrare un account non iscrive automaticamente all'edizione: prima profilo, poi conferma esplicita di partecipazione.
- `edition_admins`: **proposta tecnica conservativa D03 implementata per edizione**, senza ruolo globale. Due o più admin possono iscriversi come tutti. Concessione/revoca soltanto da operatore DB, mai registrazione/metadata/API. Un admin 2026 corregge nomi solo di partecipanti all'ufficiale 2026. Il profilo personale è condiviso tra future edizioni: la correzione riguarda quel profilo, senza alterare dati di gioco o storico 2025. Confermare D03 prima della pubblicazione.
- `secret_assignments`: contenitore vuoto riservato a B07; FK su partecipazioni della stessa partita/edizione, unicità donatore/destinatario e divieto di autoassegnazione. **Nessun grant o endpoint di lettura/scrittura**, anche per admin applicativi. Sorteggio, rivelazione e poteri successivi non implementati.
- `auth_bootstrap`: autorizzazione infrastrutturale monouso e a scadenza per creare il primo account a iscrizioni chiuse. Non assegna ruolo, non iscrive alla partita e non è una lista di approvazione della registrazione ordinaria.

Tutte le otto tabelle private hanno RLS abilitata e forzata. `authenticated` legge direttamente solo il proprio profilo, le proprie membership e i propri ruoli; non ha DML diretto. Anonimo e service role non hanno grant sul nuovo dominio. Nessun client service role nel percorso 2026. `fc_api` espone soltanto RPC con proiezioni minime; i server client usano chiave pubblica e sessione utente, quindi la stessa autorizzazione DB vale anche per chiamate dirette.

Le RPC `SECURITY DEFINER` hanno `search_path=''`, riferimenti qualificati, identità da `auth.uid()` più email confermata letta in `auth.users`, controllo ruolo DB e input/vincoli. Nessun ID di edizione/partita selezionabile nelle RPC ordinarie. Le funzioni nuove non sono eseguibili da `PUBLIC`; per quelle amministrative il grant ad `authenticated` consente soltanto di raggiungere la verifica interna del ruolo.

Il proprietario delle migrazioni/RPC deve essere un ruolo infrastrutturale verificato con BYPASSRLS (o superuser); altrimenti la migrazione fallisce prima di creare oggetti. RLS forzata non viene aggirata attribuendo nuovi privilegi ai ruoli applicativi. Il ruolo reale di esecuzione sul servizio ospitato va ancora verificato.

**Default privilege:** la revoca per schema da sola non sottrae il default globale PostgreSQL `PUBLIC EXECUTE`. La prima migrazione revoca anche i default globali del ruolo che la esegue, per funzioni e tabelle future; gli oggetti futuri di quel proprietario, in qualunque schema, necessitano di grant espliciti. Non cambia retroattivamente le ACL degli altri oggetti. Altri proprietari e grant/default di schema vanno inventariati e corretti separatamente. Mantenere in hosting solo `fc_api` tra gli schemi applicativi esposti e disabilitare l'esposizione automatica delle nuove tabelle: il file locale non cambia il Dashboard remoto.

## Autenticazione e chiusura iscrizioni

`@supabase/ssr` gestisce PKCE, cookie e refresh con Next 16 App Router. `src/proxy.ts` aggiorna i cookie della richiesta e della risposta; pagine/API verificano `getUser()`, mai il solo oggetto di `getSession()`. Cookie HttpOnly, SameSite=Lax, Secure in produzione, Path=/; client Supabase solo server. Risposte personali e refresh non usano cache condivise. Logout usa `signOut({scope:'local'})`, revoca il refresh della sessione corrente e rimuove anche il vecchio cookie. Come previsto da Supabase, un access JWT già copiato può restare valido fino alla sua scadenza: non è una revoca istantanea di ogni JWT emesso.

- Accesso esistenti: `shouldCreateUser:false`, disponibile anche a iscrizioni chiuse.
- Creazione account: richiesta distinta con `shouldCreateUser:true`, verificata dall'app e dal trigger di INSERT su `auth.users`. Il trigger controlla il gate DB anche per richieste Auth dirette, con lock condiviso sulla configurazione; nessun filtro dominio.
- Profilo: inizializzazione separata, possibile anche dopo chiusura per account già creati; non comporta membership. Un account creato prima ma verificato dopo la scadenza non aggira la chiusura della membership.
- Iscrizione: RPC transazionale con lock sulla configurazione, tempo DB e retry idempotente. Richiede attivazione, apertura, scadenza futura e `enrollment_locked=false`. Membership esistente conservata alla chiusura. B07 dovrà impostare il blocco permanente nella stessa transazione del sorteggio, senza riapertura implicita all'annullamento.

Il template di conferma registrazione e quello Magic Link puntano a `/auth/confirm?token_hash=…&type=email`. La pagina non consuma il link al semplice GET: richiede un clic consapevole, poi POST same-origin; errori scaduto/riusato/invalido consentono un nuovo invio. L'URL viene ripulito dal browser al clic. Il fallback `/auth/callback` scambia solo un codice PKCE con destinazione fissa `/profilo`; nessun `next` arbitrario. Origin di ritorno esclusivamente da `APP_ORIGIN`, non da header forwarded/Host. Impostare no-referrer e non registrare query di callback/token nei log dell'hosting.

**Guard Auth da collaudare con GoTrue:** il sorgente corrente di Supabase crea un hash provvisorio durante Magic Link. La terza migrazione lo consente prima della verifica, lo elimina alla conferma e impedisce successive impostazioni di password/cambi email o UUID. Anche una richiesta pubblica di signup con password non abilita un accesso password dopo conferma. I test PostgreSQL verificano la transizione, ma non sostituiscono un ciclo reale GoTrue: è un criterio bloccante ancora da eseguire. Cambio email/recupero eccezionale restano D01, senza UI alternativa o modifica arbitraria dei campi Auth. Non abilitare altri provider senza un blocco concordato.

## Ambiente locale

Docker CLI presente ma daemon assente nella sessione; Supabase CLI e client PostgreSQL nativi non disponibili. Nessun avvio, collegamento o download implicito di stack/provider. PGlite è un motore PostgreSQL WASM reale: esegue DDL, ACL, ruoli, RLS, vincoli, trigger e ripristino della propria directory. `auth.users`, `auth.uid()` e l'impostazione del claim sono fixture dichiarate, non un Auth server; non verifica firme JWT, PostgREST, SMTP o concorrenza tra connessioni.

Con Docker operativo e CLI ufficiale **>=2.108 o v3** installata:

```text
npm run db:local -- start
npm run db:local -- migrate
npm run db:local -- configure
npm run dev
npm run test:supabase
```

Wrapper con comandi ammessi espliciti, nessun argomento URL/ref/progetto remoto, nessun `link`, `db push`, reset o deployment. `migrate` usa `--local`; `configure` verifica il loopback e crea `.env.local` soltanto se assente, senza stampare chiavi. Output CLI che potrebbe contenere chiavi non viene riportato nei log. `supabase/config.toml` usa solo `fc_api`, PostgreSQL 17, conferma email attiva, refresh rotation e Mailpit locale sulla porta 54324. `[local_smtp]` segue la documentazione corrente; nessuna connessione SMTP pubblica.

`npm run test:db` esegue la suite PostgreSQL/PGlite. `npm run test:supabase` si rifiuta di usare URL diversi dal loopback fisso e richiede uno stack locale dedicato, inattivo e senza profili. Usa solo utenti fittizi, root SQL nel container locale noto e Mailpit; ripristina le impostazioni e rimuove soltanto gli UUID creati dal test. Copre Magic Link/replay, più utenti/admin, chiusura/accesso esistenti, grant Data API, retry e refresh/logout. Il test attiva temporaneamente **soltanto lo stack di prova**, mai un progetto remoto. La suite completa non è stata eseguita per assenza dei prerequisiti. I test HTTP `test:smoke` usano invece uno stub locale e non contano come verifica Supabase.

Variabili 2026: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `APP_ORIGIN`. Compatibilità con `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e chiave anon preesistente. Nessun segreto necessario alla build isolata; service role e `SESSION_SECRET` appartengono soltanto al codice storico non instradato. La dipendenza SSR 0.12.7 richiede Supabase JS >=2.114: lock aggiornato a 2.119.2; PGlite 0.5.17 è solo tooling di test. Nessun servizio a pagamento introdotto.

## Primo amministratore e attivazione

Procedura soltanto privilegiata, sul collaudo prima e sull'ufficiale solo con autorizzazione separata:

1. Operatore DB registra un'email verificata fuori banda in `fc_private.auth_bootstrap`, normalizzata e con scadenza breve. Nessun ruolo in metadata.
2. Per richiedere il primo Magic Link usare l'endpoint Auth dell'ambiente controllato: la UI di registrazione ordinaria resta chiusa. Il trigger consuma l'autorizzazione monouso. Il proprietario dell'email conferma e completa il profilo; non è ancora un admin o un partecipante.
3. Operatore verifica l'UUID Auth e chiama `fc_private.set_edition_admin` con UUID, edizione e booleano. La procedura non ha EXECUTE per anon/authenticated/service role. Revoca con lo stesso identificativo e booleano falso; le RPC rileggono subito il ruolo.
4. L'admin accede al pannello, che non attiva nulla al caricamento. **Non premere attivazione ufficiale prima del collaudo B06–B11.** Per il solo test isolato si verifica il comando con conferma testuale `ATTIVA 2026`.
5. Attivazione e apertura iscrizioni sono azioni separate. Apertura richiede una data futura scelta esplicitamente; il form indica l'ora del dispositivo, il valore memorizzato è timestamptz e il riepilogo mostra UTC. Date/fuso ufficiale restano D06.

## Protezione legacy e piano di produzione

Migrazioni in ordine: `202611200001_identity_editions.sql` (modello/RPC/guard signup), `202611200002_quarantine_legacy.sql` (solo RLS/ACL sulle sette tabelle esistenti), `202611200003_auth_identity_guard.sql` (guard identità/password). Ogni file usa una transazione. La seconda tollera tabelle assenti in un DB vuoto ma non ne inventa il DDL. Non sposta o aggiorna righe, né cambia PK/FK/formule. Il legacy perde volutamente ogni accesso anon/authenticated/service role, inclusi TRUNCATE e TRIGGER; nessuna policy permissiva aggiunta.

I vecchi handler restituiscono 410, inclusi login con codice, reset, dati/punteggi 2025 e mutazioni. Pagine ordinarie espongono il 2026; squadre/voti/classifica non ereditano regole 2025. I sorgenti B01+B02 sono preservati in `src/legacy2025` e nei componenti/librerie storici non importati dal percorso ordinario; i test storici restano eseguibili. Non ripubblicare le vecchie route dopo la quarantena.

**Prima di considerare pronte le migrazioni di produzione:**

1. Autorizzazione separata; inventario completo sanificato e confronto con CSV. Identificare i due schemi esposti, tutti i proprietari, ACL/default, grant indiretti, view/RPC/event trigger. Un vecchio SECURITY DEFINER ancora eseguibile potrebbe aggirare la RLS sulle tabelle: la sola quarantena non certifica questi oggetti sconosciuti.
2. Backup manuale coerente e prova di ripristino descritti sotto; acquisire campione/riferimenti 2025 approvati, senza reinterpretare santa/receiver o associare nomi ad Auth.
3. Riprodurre su DB isolato reale schema originale, dati sanificati e versioni; eseguire tutte le migrazioni, test Supabase/browser e richieste dirette anon/A/B/più admin. Verificare anche identità/password guard, cookie persistenti/refresh, link cross-device e concorrenti, clock/scadenze, perdita rete e riuso link.
4. Preparare finestra di manutenzione e sospensione delle scritture legacy. Applicazione 2026 e chiusura degli accessi legacy devono essere coordinate; non esiste compatibilità operativa con i vecchi codici dopo la migrazione. Nessuna modifica ora.
5. Solo dopo ulteriore autorizzazione, applicare i file SQL validati, restringere gli schemi Data API a `fc_api`, disattivare autoesposizione e correggere grant degli altri proprietari/oggetti inventariati. Verificare realmente che vecchie chiavi e token non leggano o modifichino le sette tabelle.
6. Vercel: verificare progetto/branch/runtime, impostare le tre variabili per ambiente, progetto Supabase distinto per Preview/collaudo, nessuna credenziale ufficiale nelle preview. Rimuovere le variabili legacy dal nuovo deployment solo dopo l'inventario. Nessuna cache/ISR per dati personali o risposte con Set-Cookie.
7. Supabase Auth: Site URL con origin HTTPS esatto; Redirect URLs soltanto `/auth/confirm` e `/auth/callback` degli ambienti consentiti, niente wildcard indiscriminate; conferma email abilitata, template registrazione e Magic Link aggiornati, niente provider/password UI aggiuntivi. Se si usa temporaneamente il template PKCE standard, RedirectTo deve essere `/auth/callback`; quello versionato usa `/auth/confirm` e funziona anche su altro browser.
8. Configurare SMTP quando scelto dall'utente, con dominio/mittente autorizzati e limiti antispam adeguati; testare la consegna reale con destinatari esterni al team del progetto, spam, link e retry. Nessun provider scelto o attivato qui. L'SMTP predefinito Supabase è ristretto e non soddisfa l'accesso pubblico senza un collaudo/configurazione specifici.
9. Verificare l'inattività dell'ufficiale e l'assenza di iscritti o risultati fittizi. Eventuale pubblicazione e attivazione ufficiale sono autorizzazioni separate, quest'ultima solo manuale dopo collaudo completo.

## Backup manuale Free e recupero

Il piano Free dichiarato non ha backup automatici disponibili. Una copia del solo CSV non include vincoli, grant, trigger, assegnazioni e impostazioni. Eseguire la procedura **solo quando autorizzata**, con credenziali in un profilo PostgreSQL protetto/secret manager, senza passarle nel comando o riportarle nei log.

1. Operatore registra versioni PostgreSQL/Supabase, oggetti gestiti e applicativi, configurazione Auth/Data API/email, proprietari e grant. Bloccare scritture nella finestra concordata; mantenere l'originale consultabile con accesso privilegiato. Conservare snapshot originale delle ACL ma non ripristinare automaticamente i permessi pubblici insicuri.
2. Backup logico manuale con `pg_dump` in formato custom e snapshot coerente, più inventario ruoli senza password (`pg_dumpall --roles-only --no-role-passwords`). Usare un servizio PostgreSQL preconfigurato e protetto, non URL/password nei log. Verificare che il dump includa tutte le sette tabelle, dati, `gift_assignments`, default, indici, FK, trigger, policy e ACL; includere gli oggetti Auth/storage necessari se presenti. Fallimenti o esclusioni degli schemi gestiti devono essere risolti e registrati, non ignorati. Non presumere ripristinabile un dump completo in un nuovo Supabase senza verificare conflitti/versioni degli oggetti gestiti.
3. Stessa finestra/snapshot per un manifest con conteggi e digest canonici ordinati di **tutte le colonne** di ogni tabella (timezone UTC), schema/ACL e vincoli. Esportare anche riferimenti approvati di squadre, voti, risultati e campione con santa diverso dal receiver. Conservare dump/manifest cifrati fuori repository, con checksum del file e accesso limitato; contengono dati personali e vecchi codici.
4. Verificare catalogo del dump con `pg_restore --list`; ripristinare su database isolato compatibile con ruoli/estensioni corretti e `--exit-on-error`. Confrontare digest/conteggi, vincoli, `santa_owner_id`, `receiver_owner_id`, bonus/malus, moltiplicatori, voti, impostazioni e assegnazioni. Riconciliare i risultati 2025 approvati con il calcolo storico preservato.
5. Applicare le nuove migrazioni **sulla copia ripristinata**; ripetere il confronto integrale legacy e le prove RLS/Data API. Riportare durata, anomalie, versioni e risultato di recupero; finché questa prova manca, la migrazione ufficiale non è pronta.

Recupero preferito: sospendere il nuovo servizio, preservare anche i nuovi dati 2026 e ripristinare il backup in una destinazione isolata; verificare e decidere un recupero forward. Non fare restore distruttivo sopra produzione e non ripristinare automaticamente il deployment con codici o grant pubblici vulnerabili. `supabase/rollback/identity-local.sql` è un rollback **solo locale** con guard esplicita: elimina esclusivamente il nuovo dominio e i suoi trigger, lasciando intatti legacy e quarantena; prima esportare eventuali nuovi dati, perché lo schema 2026 viene rimosso. I default sicuri non vengono riaperti. Non è un piano di downgrade automatico di produzione.

PGlite verifica backup/ripristino della propria directory, rollback e riapplicazione senza cambiare i valori legacy fittizi. **Non è stata verificata la procedura pg_dump/pg_restore su Supabase reale né l'integrità dei dati 2025 reali.**

## Fonti tecniche consultate

- [Supabase SSR e Next](https://supabase.com/docs/guides/auth/server-side/creating-a-client): client per richiesta, proxy Next 16, verifica server e cache.
- [Magic Link](https://supabase.com/docs/guides/auth/auth-email-passwordless): `shouldCreateUser`, token hash, URL consentiti.
- [Sorgente GoTrue MagicLink](https://github.com/supabase/auth/blob/master/internal/api/magic_link.go): hash provvisorio durante signup da verificare sulla versione effettiva dello stack.
- [Data API](https://supabase.com/docs/guides/api/securing-your-api): schemi esposti, grant e RLS.
- [CLI v3](https://supabase.com/docs/guides/local-development/cli/migrating-to-v3), [configurazione](https://supabase.com/docs/guides/local-development/cli/config) e [Mailpit](https://supabase.com/docs/guides/auth/testing-auth-flows): target locale, `local_smtp`, conferme locali.
- [SMTP Supabase](https://supabase.com/docs/guides/auth/auth-smtp): servizio predefinito limitato ai destinatari autorizzati, SMTP esterno necessario per il rilascio pubblico richiesto.
