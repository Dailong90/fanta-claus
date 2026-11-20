# Fanta Claus — specifiche funzionali

## Allineamento tecnico B03+B04+B05 — 20 novembre 2026

Requisiti R26-01–R26-09 e decisioni D01–D11 **invariati**. Le indicazioni «non implementato» degli snapshot sottostanti sono storiche; per lo stato attuale valgono questa sezione, l'[architettura](ARCHITECTURE.md) e il [runbook](IDENTITY_EDITION_RUNBOOK.md).

- Implementati localmente Auth Magic Link/SSR, profilo, avatar validati, ruoli limitati per edizione e membership distinta dall'account. Accesso esistenti indipendente dalla chiusura; nuove creazioni/iscrizioni protette anche dal DB. D01 recupero/cambio email rimane aperta; guard e flusso reale GoTrue da collaudare.
- Modello nuovo separato dalle sette tabelle 2025; nessuna associazione per nome/owner e nessuna trasformazione dei valori storici. Solo 2026 nelle pagine ordinarie; accesso con vecchi codici ritirato. Vecchi flussi di squadre/voti/classifica preservati fuori instradamento, non trasferiti come regole 2026.
- Seed ufficiale 2026 **inattivo**, iscrizioni chiuse, nessuna scadenza inventata. Comando di attivazione manuale presente ma non eseguito su alcun servizio. Nessuna partita remota attivata. Le sole attivazioni delle suite sono temporanee su fixture locali.
- D03: scelta tecnica prudente implementata per edizione, senza ruolo globale o lettura assegnazioni. Concessione/revoca soltanto privilegiata; conferma funzionale dell'ambito ancora necessaria prima della pubblicazione.
- Solo strutture per future partite/simulazioni/Secret Santa; B06–B09 e le decisioni su squadre, punteggi, visibilità, sorteggio e ritiri restano fuori dall'implementazione corrente.
- Migrazioni versionate/RLS implementate e testate con PostgreSQL/PGlite; Auth/Data API reali, SMTP pubblico, schema legacy completo, integrità/backup/ripristino 2025 reale e configurazioni Supabase/Vercel ancora da verificare. La produzione non è modificata e i blocchi non sono dichiarati verificati integralmente.

## Aggiornamento tecnico B01+B02 — 20 novembre 2026

Requisiti R26-01–R26-09 e decisioni D01–D11 invariati. F01–F09 sotto restano la ricostruzione storica 2025; per il codice attuale valgono le seguenti correzioni tecniche e l'[architettura aggiornata](ARCHITECTURE.md).

- Identità UI da sessione verificata sul server, con player/ruolo autorevoli; logout navbar/profilo invalida lo stesso cookie. Nessuna Supabase Auth/Magic Link ancora implementata.
- Operazioni admin protette uniformemente; anteprima solo con `?preview=1` e sessione admin. Premi pubblici soggetti al flag; nessun dettaglio nominativo dei votanti nei payload pubblici. Le composizioni delle squadre restano pubbliche come nel 2025, in attesa della decisione 2026 D07.
- Squadre lette/salvate tramite API personale, con controlli server di titolarità/fase e vincoli già presenti nel builder 2025; rimosse scritture Supabase dal browser e ripristino automatico di cache. Scadenza assente/illeggibile sospende le modifiche; nessuna data 2026 inventata. Voti limitati dal server alla finestra 2025 già implementata nella UI.
- Autosave team con comandi sospesi durante la richiesta e conferma solo su persistenza; nessuna scrittura dopo errore iniziale. UI voti/gift distingue errore e ricevuta di salvataggio. Bonus gift salvato all'uscita dal campo, categoria al cambio; aggiornamenti preservano receiver/bonus omessi. Le opzioni di selezione vuota non promettono più una cancellazione inesistente: rimozioni funzionali da concordare.
- Il reset globale è disabilitato lato server e rimosso come azione UI per proteggere lo storico. Una nuova edizione non si apre tramite reset.
- Formula 2025, `santa_owner_id`/`receiver_owner_id`, numero massimo 7 e capitano x2 restano comportamento storico; non sono regole nuove 2026. Le fixture numeriche verificano equivalenza tecnica, non riconciliano i dati storici reali (D05).
- Tooling/test isolati e dipendenze aggiornati; `SUPABASE_URL` server a runtime con fallback pubblico preesistente. Nessuno schema, grant/RLS, migrazione o ambiente remoto creato. Serializzazione/versioni applicative non certificano atomicità distribuita.

Stato e limiti per ogni criticità in [AUDIT_REPORT.md](AUDIT_REPORT.md), B01/B02 nella [roadmap](ROADMAP.md). Prima delle nuove funzionalità servono schema/policy sanificati e prove DB isolate.

## Ricostruzione storica e requisiti approvati

Rilevazione del codice e consolidamento requisiti: **19 novembre 2026**, baseline commit `0b21649` del 16 dicembre 2025. Documento di requisiti e ricostruzione statica: la presenza del codice non certifica il funzionamento del servizio remoto. Vedere [architettura](ARCHITECTURE.md), [audit](AUDIT_REPORT.md) e [roadmap operativa](ROADMAP.md).

## Stato e confini

Le funzionalità seguenti sono confermate dai sorgenti 2025. Non sono stati eseguiti login, scritture, reset o verifiche sul database reale. Non risultano implementati registrazione email, modifica del profilo, sorteggio Secret Santa, iscrizioni a un evento o gestione di più edizioni.

Il termine `owner_id` identifica un partecipante applicativo, non un utente Supabase Auth verificato. L'elenco frontend contiene 32 partecipanti con ID `p1`–`p32`; non ne è stata verificata la corrispondenza con le righe remote di `players`.

Le sezioni F01–F09 ricostruiscono il codice 2025 e restano separate dai requisiti approvati R26-01–R26-09. Questi ultimi non sono implementati né verificati: l'aggiornamento documentale non risolve i problemi dell'audit. Le proposte tecniche e le decisioni rimandate sono elencate separatamente in fondo al documento.

## Funzionalità 2025 confermate

### F01 — Home e navigazione

- **Percorso e frontend:** `/`, `src/app/page.tsx`; navbar globale `MainNavbar`, podio `PodiumPublic`. CTA verso login/profilo e categorie; classifica raggiungibile anche senza login tramite URL e podio.
- **Backend e dati:** GET `/api/admin/team-deadline`, GET `/api/admin/leaderboard-publish`; se pubblicata, GET `/api/leaderboard`. Impostazioni `team_lock_deadline` e `leaderboard_published` in `game_settings`, squadre e punteggi derivati.
- **Validazione e permessi effettivi:** fasi visuali calcolate nel browser; le CTA leggono `fanta_owner_id` in localStorage. Nessuna sessione server richiesta per home e classifica pubblica.
- **Dipendenze:** scadenza squadre, chiusura voti fissa, pubblicazione manuale.
- **Fragilità:** fase memoizzata senza orologio reattivo; errori di lettura confusi con mancata pubblicazione; date scritte nei testi diverse dalle fonti di configurazione. La navbar usa un proprio stato locale, indipendente dal cookie.

Evidenze: `src/app/page.tsx:24,44,71,85,276`; `src/components/MainNavbar/MainNavbar.tsx:33,98`.

### F02 — Accesso con codice e sessione

- **Percorso e frontend:** `/login`, campo codice e invio; successo → `/profilo`. Errori e caricamento gestiti in `src/app/login/page.tsx`.
- **Backend e dati:** POST `/api/login` cerca in `players` il codice normalizzato con trim e maiuscolo; restituisce ID, nome (`display_name` con fallback ID) e ruolo. Firma JWT HS256 con `ownerId` e scadenza 30 giorni; cookie `fanta_session`, HttpOnly, SameSite=Lax, Secure in produzione. Nessun refresh token o provider email.
- **Validazione:** codice non vuoto lato server; campo frontend massimo 10 caratteri. Il limite e il tipo stringa non sono imposti dal server. Generazione, distribuzione, unicità ed entropia dei codici non verificabili.
- **Permessi:** `/profilo` verifica il JWT sul server e passa il suo owner ID al client. Le API admin protette interrogano anche `players.is_admin`. La sessione non è una sessione Supabase Auth.
- **Dipendenze:** `SESSION_SECRET`, client Supabase con service role, tabella `players`.
- **Fragilità:** nessun rate limit applicativo; nessun meccanismo applicativo di revoca dei singoli JWT; localStorage mantiene una seconda rappresentazione dell'accesso. Il logout dal profilo chiama POST `/api/logout`; il logout dalla navbar cancella soltanto localStorage e lascia valido il cookie.

Evidenze: `src/app/api/login/route.ts:13`; `src/lib/session.ts:6,13,30`; `src/app/profilo/page.tsx:5`; `src/app/profilo/ProfiloClientShell.tsx:487`; `src/components/MainNavbar/MainNavbar.tsx:57`.

### F03 — Profilo e riepilogo personale

- **Percorso e frontend:** `/profilo` → `ProfiloClientShell`; saluto, collegamento admin se indicato dal ruolo, composizione squadra prima della scadenza, riepilogo e punteggi dopo la chiusura.
- **Backend e dati:** browser legge `players(name,is_admin)` e `teams(members,captain_id)` tramite client pubblico; GET `/api/leaderboard` per punteggi; lettura deadline via API. Nessun endpoint per modificare nome, email o profilo.
- **Validazione e permessi:** il server protegge l'entry point con JWT; le successive letture dirette Supabase dipendono da grant/RLS remoti non verificati. Il ruolo letto nel browser serve alla visualizzazione del bottone.
- **Dipendenze:** identità, elenco statico partecipanti per risolvere i membri, squadre, configurazione e classifica.
- **Fragilità:** nome risolto da `name`, diversamente dal login; riepilogo caricato una volta anche prima del lock e non aggiornato dopo l'editing nella stessa visita; ID non presenti nell'elenco statico scompaiono dal riepilogo.

Evidenze: `src/app/profilo/ProfiloClientShell.tsx:237,354,387,426,655`.

### F04 — Squadre e capitano

- **Percorso e frontend:** profilo aperto → `TeamBuilder`; click sulle card o icone aggiunge/rimuove partecipanti; icona regalo assegna il capitano tra i selezionati. Default 7 membri. La UI non esclude il proprietario dall'elenco selezionabile.
- **Backend e dati:** lettura diretta `teams` per owner; fallback cache locale `fanta_claus_team_${playerId}` (supporta vecchio array e oggetto con capitano); a ogni modifica upsert diretto Supabase su `owner_id`, con `members` e `captain_id`. Non esiste un endpoint server per salvare la squadra.
- **Validazione:** la UI evita duplicati, limita il numero di membri e richiede che il capitano selezionato sia membro. Rimuovendolo lo deseleziona. Il database riceve anche squadre parziali e senza capitano; la conferma visiva è abilitata logicamente a squadra completa, ma non impone la persistenza.
- **Permessi:** owner passato dal componente server; autorizzazione delle scritture effettive e blocco temporale nel database non verificati. Il flag `isLocked` protegge soltanto il client.
- **Dipendenze:** login, partecipanti statici, deadline; classifica usa i membri salvati senza convalidare numerosità, duplicati o appartenenza del capitano.
- **Fragilità:** autosave concorrenti, fallback dopo errori di lettura, cache ripristinabile dopo reset, nessuna conferma della scrittura collegata al pulsante “Salva squadra”. Componenti utilizzabili mentre il primo caricamento non è completato.

Evidenze: `src/components/TeamBuilder.tsx:55,70,138,194,209,222,334`; `src/app/profilo/ProfiloClientShell.tsx:461,474,925`.

### F05 — Scadenze e fasi del gioco

- **Percorso e frontend:** admin imposta una data/ora; home e profilo leggono GET `/api/admin/team-deadline`. Il profilo aggiorna il countdown ogni secondo e, al superamento, sostituisce il builder con riepilogo e votazioni/attesa.
- **Backend e dati:** GET/POST `/api/admin/team-deadline`; `game_settings.key=team_lock_deadline`, `value={deadlineIso}`. Valore falso/vuoto nel POST cancella l'impostazione.
- **Validazione:** UI converte `datetime-local` in ISO; API non verifica che il valore sia una data valida. Assenza/errore di deadline lascia il builder aperto. Il confronto usa l'orologio del browser.
- **Permessi:** GET usata pubblicamente; POST senza verifica di sessione o ruolo. Non esiste controllo server della fase su squadre e voti.
- **Dipendenze:** configurazione globale; chiusura voti hardcoded `2025-12-16T13:00:00+01:00` in home e profilo. La data del 20 dicembre in `src/config/gameConfig.ts` non è importata.
- **Fragilità:** la finestra voti UI esiste solo se la deadline squadre precede quella dei voti; testi annunciano 15 dicembre 12:30 e pubblicazione 16 dicembre 15:00, ma la pubblicazione è manuale e non programmata.

Evidenze: `src/app/api/admin/team-deadline/route.ts:18,41`; `src/app/profilo/ProfiloClientShell.tsx:28,285,311,895`; `src/app/page.tsx:10,307`.

### F06 — Categorie e registrazione dei regali

- **Percorso e frontend:** `/categorie-regali` mostra le categorie con punti; `/admin` → `AdminRegaliClient` crea/modifica/elimina categorie e associa a ciascun partecipante categoria e bonus/malus, con filtri tutti/mancanti/assegnati.
- **Backend e dati:** GET `/api/categories`; POST/PUT/DELETE `/api/admin/categories`; GET/POST `/api/admin/gifts`; GET `/api/admin/base-data`. Tabelle `gift_categories`, `gifts`, `players`. Gift upsert su `santa_owner_id`; `receiver_owner_id` opzionale nell'API, non esposto né conservato nella mappa UI.
- **Validazione:** delete categoria controlla se esiste almeno un gift collegato (409 se in uso); payload categorie quasi privo di validazione runtime. Gift richiede santa e categoria non vuoti, converte bonus non finito a 0 e destinatario omesso a null; esistenza di riferimenti e vincoli sono delegati al DB non verificato.
- **Permessi:** base-data e gifts verificano JWT e ruolo nel database; categorie CRUD non lo fanno. La pagina categorie controlla soltanto localStorage e l'API di lettura è pubblica.
- **Dipendenze:** giocatori DB, categorie, calcolo classifica. Scelta manuale di una sola categoria per gift: nessun algoritmo per selezionare la categoria di maggior valore tra più categorie, anche se il testo lo annuncia.
- **Fragilità:** scegliere “Nessuna” cambia soltanto lo stato locale; mancato rollback su errori di salvataggio; update del bonus a ogni battuta; destinatario esistente sovrascritto con null; divergenza semantica regalo ricevuto/donato.

Evidenze: `src/app/categorie-regali/CategorieRegaliClient.tsx:33,121`; `src/app/api/admin/gifts/route.ts:17,60`; `src/app/api/admin/categories/route.ts:13,35,65`; `src/app/admin/AdminRegaliClient.tsx:241,363,396,417`.

### F07 — Votazioni dei pacchi

- **Percorso e frontend:** nel profilo, dopo il lock squadre e prima della chiusura voti, `VotingPanel` presenta tre select: `best_wrapping`, `worst_wrapping`, `most_fitting`. Le opzioni escludono il proprio ID.
- **Backend e dati:** GET `/api/votes?voter_owner_id=...`; POST `/api/votes` con votante, destinatario e tipo; tabella `package_votes`. Upsert con conflitto atteso `(voter_owner_id,vote_type)`: intende sostituire il voto precedente della stessa categoria.
- **Validazione:** server richiede campi truthy, tipo tra i tre ammessi e votante diverso dal destinatario. Non verifica tipi stringa, esistenza dei partecipanti, sessione, appartenenza, fase o scadenza. Il vincolo UNIQUE necessario all'upsert non è verificato.
- **Permessi:** le API accettano identità indicata dal chiamante anche senza cookie. I propri voti sono protetti soltanto per convenzione della UI; è possibile richiedere un altro voter ID.
- **Dipendenze:** partecipanti statici, fasi UI, impostazione punti votazioni per il calcolo finale.
- **Fragilità:** voto alterabile per altri utenti, voto tardivo accettato dal codice, scelta “Nessuno selezionato” invia una stringa vuota rifiutata dal backend senza ripristinare la UI. Non esiste DELETE voto.

Evidenze: `src/app/profilo/ProfiloClientShell.tsx:67,82,97,134,895`; `src/app/api/votes/route.ts:19,81`.

### F08 — Punteggi, premi, classifica e podio

- **Percorso e frontend:** `/classifica` mostra classifica, premi ed espansione membri; home mostra i primi tre quando il flag è pubblicato. Admin può generare un'anteprima e cambiare pubblicazione. Nessun job pianificato o salvataggio di uno snapshot risultati.
- **Backend e dati:** GET `/api/leaderboard` legge `game_settings`, `teams`, `players`, `gifts`, `gift_categories`, `package_votes`; GET `/api/awards` è filtrata dal flag, mentre GET `/api/admin/awards` non lo è. `/classifica` chiama quest'ultima anche prima di conoscere il flag. GET/POST `/api/admin/vote-points`; GET/POST `/api/admin/leaderboard-publish`.
- **Regola effettiva:** per partecipante, punti gift = punti categoria + bonus/malus, indicizzati da `santa_owner_id`. Ogni vincitore di una categoria voti riceve **una volta** il valore configurato per quella categoria; tutti gli ex aequo lo ricevono. Il numero di voti non moltiplica il premio. Per ogni membro della squadra si sommano gift e premi; il capitano moltiplica l'intera somma per 2, anche se negativa. Totale squadra = somma dei membri salvati.
- **Regole di presentazione:** ordinamento per totale decrescente; nessuno spareggio esplicito per squadre a pari punti, posizioni e podio assegnati per indice. Squadre senza membri escluse, squadre parziali incluse. Prima della pubblicazione, API pubblica restituisce tutte le squadre non vuote con membri/capitano e punti zero, ordinate per nome.
- **Permessi e validazione:** anteprima admin basata su header `x-fanta-owner-id` confrontato con `players.is_admin`, senza legame al cookie. Flag e punti modificabili senza sessione. Con pubblicazione attiva, `votingDetails` rivela anche chi ha votato chi a qualunque chiamante; anonimato dei voti non è un requisito 2025 verificato.
- **Dipendenze e fragilità:** dati globali e mutabili, nessun risultato congelato; letture separate possono produrre un insieme incoerente durante modifiche concorrenti. Errori lettura voti/config possono produrre classifica 200 incompleta. Endpoint awards usano nomi statici e normalizzazione diversa da leaderboard. Le etichette UI +5/-5/+10 non sono la configurazione autorevole, che ha default 0.

Evidenze: `src/app/api/leaderboard/route.ts:106,175,233,277,301,351,390,404`; `src/app/api/awards/route.ts:32`; `src/app/api/admin/awards/route.ts:26`; `src/app/classifica/page.tsx:60,87,109`; `src/components/PodiumPublic.tsx:81`.

### F09 — Gestione amministrativa e reset

- **Percorso e frontend:** `/admin` carica base-data; 401/403 → login; `AdminRegaliClient` gestisce gifts, categorie, punti votazioni, scadenza, anteprima/pubblicazione e reset con conferma del browser.
- **Backend e dati:** API elencate sopra, più POST `/api/admin/reset-game`: cancella `teams` con owner non nullo e poi `package_votes` con voter non nullo. Conserva players, gifts, categorie e game_settings, incluso il flag di pubblicazione.
- **Validazione e permessi:** la conferma del reset esiste solo nella UI; endpoint senza autenticazione e senza transazione. Solo base-data e gifts applicano realmente la verifica admin basata su sessione.
- **Dipendenze:** tutti i flussi di gioco; il pannello non offre gestione partecipanti, codici o edizioni.
- **Fragilità:** fallimento della seconda cancellazione lascia reset parziale; la UI svuota la mappa dei gifts che il server ha conservato; cache squadre non invalidata e potenzialmente ripersistita. Nessun registro amministrativo applicativo rilevato.

Evidenze: `src/app/admin/page.tsx:39`; `src/app/admin/AdminRegaliClient.tsx:757`; `src/app/api/admin/reset-game/route.ts:15`.

## Ruoli e permessi: intenzione e attuazione

| Attore | Comportamento disponibile | Limite reale |
| --- | --- | --- |
| Visitatore | Home, login; URL classifica e API pubbliche | Può anche invocare API prive di guard: è un difetto, non un permesso di business |
| Partecipante con cookie valido | Profilo, builder, voti secondo UI | Proprietà dei dati non verificata uniformemente nel backend |
| Amministratore (`players.is_admin`) | Pannello gestione | Verifica server effettiva soltanto su base-data e gifts; header classifica impersonabile |

Questi ruoli descrivono lo snapshot storico 2025 e non autorizzano a conservare le falle nel 2026. Matrice tecnica completa in [ARCHITECTURE.md](ARCHITECTURE.md).

## Requisiti funzionali 2026 approvati

### R26-01 — Edizione visibile e attivazione

- La web app deve mostrare esclusivamente l'edizione 2026. I dati 2025 devono essere conservati senza cancellazioni; non serve ora un'interfaccia di consultazione dello storico.
- La partita ufficiale 2026 sarà attivata manualmente dagli amministratori dopo il collaudo. Pubblicare un deployment e attivare la partita sono operazioni distinte.
- Separare dati e configurazioni per preservare lo storico; nessun reset globale per inaugurare il 2026. Il modello dati concreto resta una proposta da verificare, non una struttura già presente.

### R26-02 — Registrazione, autenticazione e profilo

- Sostituire i vecchi codici personali con **Supabase Auth e Magic Link tramite email**, senza password. Il metodo è scelto: password e OTP email non sono alternative funzionali ancora aperte.
- Registrazione autonoma, senza approvazione amministrativa e senza filtro sul dominio email. Il link della web app sarà condiviso nel gruppo WhatsApp aziendale: **la disponibilità del link non costituisce una restrizione tecnica agli utenti aziendali** e non verifica l'appartenenza all'azienda.
- Dopo la chiusura delle iscrizioni gli utenti già registrati devono continuare ad accedere. Il blocco di una nuova iscrizione non deve bloccare la richiesta/uso del Magic Link di un account esistente.
- Profilo con nome, cognome e avatar scelto da una raccolta predefinita. L'utente può modificare soltanto l'avatar; nome e cognome possono essere corretti dagli amministratori.
- Identità stabile ricavata da una sessione verificata sul server, condivisa da API e autorizzazioni database. ID in parametri, body, header o localStorage non identificano autorevolmente l'utente e non possono modificarne l'identità o i privilegi.
- L'eventuale associazione allo storico 2025 richiede una procedura verificata, senza dedurre identità dal nome o da ID forniti dal browser; la conservazione del 2025 non impone di esporlo nell'app.

### R26-03 — Iscrizioni e insieme dei partecipanti

- Gli amministratori configurano data e ora di chiusura delle iscrizioni.
- Tutti gli utenti regolarmente iscritti partecipano automaticamente al Secret Santa; gli iscritti costituiscono anche l'elenco dei partecipanti selezionabili per le squadre.
- La lista hardcoded dei 32 partecipanti resta un dato del codice 2025 e non sarà la fonte autorevole del 2026.
- Il sorteggio avviene dopo la chiusura delle iscrizioni. Dopo un sorteggio riuscito non sono consentite nuove iscrizioni, anche quando i risultati sono ancora bloccati. Non è approvata una riapertura implicita a seguito dell'annullamento di un sorteggio.
- Con meno di 2 iscritti il sorteggio non può riuscire; gli admin possono prorogare le iscrizioni e riprogrammarlo.

### R26-04 — Secret Santa: esecuzione e riservatezza

- Il sorteggio è programmato dagli amministratori; può essere anticipato manualmente soltanto rispettando la chiusura delle iscrizioni e il minimo di 2 partecipanti.
- Ogni partecipante ha esattamente un destinatario, ogni destinatario è assegnato una sola volta e nessuno può sorteggiare sé stesso.
- Generazione, verifica e salvataggio avvengono atomicamente sul server; errori, retry e concorrenza non devono produrre assegnazioni parziali o sovrascritture silenziose.
- I risultati restano segreti anche per gli amministratori attraverso l'applicazione. Il ruolo admin non permette di leggere la mappa completa né i destinatari degli altri; l'admin partecipante vede soltanto il proprio destinatario alle stesse condizioni degli altri.
- La visualizzazione richiede uno **sblocco manuale degli amministratori**. Prima dello sblocco nessun partecipante riceve il proprio risultato; dopo lo sblocco ciascuno può recuperare esclusivamente il proprio destinatario, anche dopo refresh o nuovo accesso.
- Nessuna assegnazione altrui in API, HTML/SSR/RSC, payload nascosti, browser, log o cache condivise. Proteggere anche tabelle, view/RPC ed eventuali esportazioni; non inviare tutte le coppie al client per filtrarle.
- Prima dello sblocco è consentito annullare e ripetere il sorteggio. Dopo la rivelazione non sono previsti nuovi sorteggi ordinari.
- La gestione dei ritiri eccezionali e delle assegnazioni divenute non valide è rimandata. È stato discusso un nuovo sorteggio completo dopo la rivelazione, ma condizioni e procedura non sono specificate: non è una funzionalità pronta da implementare e non autorizza riparazioni automatiche.

Non sono concordati divieti tra coppie, esclusioni di reparto, restrizioni fra anni, divieto di assegnazioni reciproche o altre regole aggiuntive. Non introdurle implicitamente. La riservatezza applicativa richiesta non equivale a una garanzia di inaccessibilità per chi possiede privilegi infrastrutturali sul database: quel confine deve essere valutato tecnicamente senza ampliare i permessi dell'admin nell'app.

### R26-05 — TeamBuilder e persistenza delle squadre

- Il TeamBuilder è disponibile soltanto dopo l'esecuzione riuscita del sorteggio, nella finestra di apertura/chiusura programmata dagli amministratori. L'esecuzione e lo sblocco dei risultati sono eventi distinti: non è richiesto di attendere lo sblocco per il builder.
- Il TeamBuilder 2025 è un riferimento funzionale. Numero di membri, capitano, moltiplicatori, autoselezione e nuove regole saranno definiti separatamente: non trasferire automaticamente i 7 membri o il capitano x2 nel 2026.
- Ogni modifica deve essere salvata automaticamente nel database. Il pulsante **«Salva squadra»** conferma esplicitamente il salvataggio corrente, con successo soltanto dopo conferma della persistenza; non introduce un sistema di bozze e conferme obbligatorie.
- Alla scadenza è valida l'ultima configurazione effettivamente persistita. Una scelta soltanto locale o una richiesta fallita non sono un salvataggio riuscito.
- Le squadre incomplete partecipano comunque alla classifica con i membri presenti. La gestione di una squadra senza membri e i dettagli di calcolo della classifica restano da definire.
- Dopo la chiusura soltanto gli amministratori possono modificare singole squadre; le operazioni devono rispettare i permessi e le regole approvate.
- Se un partecipante viene escluso, le squadre che lo contengono restano con un membro in meno: nessun rimpiazzo automatico. Questo non definisce come risolvere le sue assegnazioni Secret Santa.
- Il salvataggio deve proteggere dalle sovrascritture concorrenti, distinguere caricamento, salvataggio, errore e stato confermato, e permettere un recupero senza ripristini silenziosi di dati vecchi. La soluzione tecnica di concorrenza è da valutare.

### R26-06 — Amministrazione

- Supportare più amministratori, che partecipano normalmente al gioco.
- Gli admin gestiscono configurazioni, iscrizioni, tempistiche, programmazione/esecuzione del sorteggio, annullamento e ripetizione prima dello sblocco, sblocco dei risultati e correzioni delle singole squadre; correggono nome e cognome dei profili.
- Nessun potere di lettura delle assegnazioni altrui deriva dal ruolo. L'accesso alle simulazioni è riservato agli amministratori autorizzati.
- Verificare autorizzazioni e titolarità lato server e database per ogni operazione protetta. Nascondere una UI non protegge l'endpoint; l'utente non può assegnarsi il ruolo.
- Ambito globale/per edizione dei ruoli e procedura di concessione/revoca sono ancora da precisare; non ampliare implicitamente i poteri approvati.

### R26-07 — Simulazioni e collaudo

Requisito fondamentale prima dell'attivazione ufficiale:

- Ambiente di collaudo isolato dalla produzione, con accesso alle simulazioni limitato agli amministratori autorizzati.
- Possibilità di creare più partite di prova indipendenti con partecipanti fittizi e simulare fasi e relative scadenze, composizione squadre, votazioni e classifica.
- Sorteggi ripetibili come operazioni di prova, generando nuovi risultati casuali validi; non è richiesta la riproduzione deterministica delle stesse coppie. Le operazioni di prova non concedono nuovi sorteggi ordinari nella partita ufficiale dopo la rivelazione.
- Possibilità di eliminare una singola simulazione senza modificare le altre né i dati ufficiali o storici.
- Attivazione manuale della partita ufficiale 2026 dopo i test; nessuna simulazione deve attivarla automaticamente.

Le simulazioni funzionali, anche con utenti fittizi o tempo simulato, non sostituiscono i test reali di autenticazione, autorizzazione, RLS, transazioni e concorrenza sul database isolato. La simulazione di voti e classifica dipende dalla definizione delle relative regole 2026. Valutare una seconda istanza Supabase e un deployment di collaudo separato; non sono decisioni infrastrutturali già adottate. Non introdurre infrastrutture o nuove tabelle in questa fase documentale.

### R26-08 — Comunicazioni e pubblicazione

- Nessuna notifica email automatica di gioco. Restano necessarie le email Magic Link per l'autenticazione; l'assenza di notifiche non elimina il requisito di consegna affidabile di queste email.
- La web app sarà pubblicata su Vercel. Progetto, runtime, configurazione e meccanismo di programmazione del sorteggio devono essere verificati, senza presumere il deployment attuale.
- Valutare consegna email, necessità di SMTP per produzione e affidabilità dell'esecuzione programmata senza scegliere automaticamente servizi a pagamento.

### R26-09 — Interfaccia e animazioni

- Interfaccia responsive, progettata principalmente per smartphone; restyling completo in una fase successiva, con regole UX/UI dettagliate da definire separatamente.
- Asset Lottie già disponibili saranno la scelta prevalente per le animazioni elaborate. Nell'architettura rilevata non sono presenti player o asset Lottie nel repository: raccolta, compatibilità e integrazione sono attività future.
- Curare accessibilità, tastiera, feedback reali, movimento ridotto, caricamento e costi sul dispositivo. La fine di un'animazione non determina persistenza, punteggi o autorizzazioni.
- Homepage e navigazione 2026 non sono ancora specificate; F01 resta la sola ricostruzione del comportamento 2025.

## Proposte tecniche originarie e verifiche residue

I requisiti precedenti sono approvati. La tabella conserva le proposte tecniche originarie: per le parti ora implementate e le verifiche ancora aperte valgono l'allineamento tecnico iniziale e la [roadmap](ROADMAP.md); non attribuire alle proposte residue lo stato di funzionalità disponibile.

| ID | Proposta / verifica progettuale | Vincolo da dimostrare |
| --- | --- | --- |
| T01 | Separare identità, profilo, partecipazione, edizione e partita/simulazione; valutare modello concreto e migrazione additiva | Schema/grant/RLS reali prima della progettazione delle migrazioni; conservazione 2025 e nessuna contaminazione tra partite |
| T02 | Transazione DB, coordinamento per partita, vincoli e gestione retry per il sorteggio | Atomicità, unicità, nessuna autoassegnazione; concorrenza tra esecuzione programmata, manuale, annullamento e sblocco |
| T03 | Meccanismo affidabile per il sorteggio programmato su Vercel, con recupero degli errori | Verificare frequenza, puntualità, limiti, autenticazione del job, retry e costi; nessun provider o piano a pagamento scelto |
| T04 | Seconda istanza Supabase e deployment di collaudo separato | Isolamento effettivo di credenziali, dati, callback, job, cache e operazioni di eliminazione; più simulazioni indipendenti |
| T05 | Integrazione Supabase Auth con sessioni server, redirect/callback e consegna Magic Link; valutare SMTP e librerie necessarie | API/compatibilità correnti, limiti, consegna reale e accesso dopo chiusura; scelta del metodo già fissata a Magic Link |
| T06 | Controllo versione/serializzazione delle scritture e strategia per test E2E, tempo e partecipanti fittizi | Nessuna perdita da richieste fuori ordine o più tab; simulazioni distinte dai test reali di sicurezza e database |

## Registro decisioni e questioni funzionali rimandate

Gli ID D01–D10 sono conservati per non invalidare i riferimenti dell'audit. «Confermata» riguarda il requisito, non l'implementazione.

| ID | Stato dopo il consolidamento | Parte ancora da definire |
| --- | --- | --- |
| D01 | Confermati Magic Link Supabase, niente password, registrazione autonoma senza filtro dominio e accesso degli esistenti dopo chiusura | Eventuali casi eccezionali di recupero/cambio email; consegna e sessioni sono verifiche tecniche T05 |
| D02 | Aperta: eventuale collegamento verificato dei partecipanti 2025 alle email | Procedura e necessità di associazione; nessun legame dedotto dal nome e nessuna UI storico richiesta |
| D03 | Confermati più admin partecipanti, poteri R26-06 e nessuna lettura dei destinatari altrui | Ruolo globale/per edizione, concessione e revoca |
| D04 | Confermati finestra programmata dopo sorteggio, autosave più conferma facoltativa, squadre incomplete, correzioni admin ed effetto delle esclusioni | Nuove regole di composizione: numero, capitano, moltiplicatori, autoselezione e relativi vincoli; comportamento di squadre senza membri |
| D05 | Aperta: significato storico di `santa_owner_id` e destinatario dei punti | Campione 2025 approvato; regali, categorie e regole 2026 saranno definiti separatamente |
| D06 | Confermate configurazione delle scadenze da admin, programmazione sorteggio e sblocchi/attivazione manuali | Valori delle date, fuso orario ufficiale, altre riaperture e finestre/pubblicazione di voti e classifica |
| D07 | Confermata riservatezza Secret Santa anche rispetto agli admin applicativi; nessuna UI storico ora | Visibilità delle squadre e del dettaglio dei voti 2026 |
| D08 | Aperta: votazioni, punteggi e classifica finale | Regole, congelamento, ex aequo e correzioni dopo pubblicazione; non confermare automaticamente la formula 2025 |
| D09 | Confermati iscritti automatici, minimo 2, chiusura e blocco nuove iscrizioni dopo successo, ripetizione prima dello sblocco e assenza di nuovi sorteggi ordinari dopo rivelazione | Ritiri/eccezioni e assegnazioni non più valide; nuovo sorteggio completo post-rivelazione soltanto discusso, nessuna riparazione automatica approvata. Precisare l'effetto di annullamento/ripetizione su eventuali squadre già composte |
| D10 | Confermati sola edizione 2026 visibile, conservazione del 2025 e attivazione ufficiale manuale dopo collaudo | Eventuale futura consultazione/amministrazione dello storico, fuori ambito attuale |
| D11 | Rimandate homepage, navigazione e regole UX/UI dettagliate | Progettazione separata prima del restyling; smartphone e prevalenza Lottie già confermati |

Schema remoto, grant/policy, SMTP, programmazione su Vercel e isolamento del collaudo sono verifiche tecniche, non requisiti funzionali da inventare. Lo stato aggiornato dei problemi AUD-001–027 è nell'audit; le verifiche Q sul database e sui servizi remoti restano da eseguire.
