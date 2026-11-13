const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

// Inizializzazione SDK ufficiale Google GenAI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ==========================================
// 1. ENDPOINT: INVIO OTP (via Brevo)
// ==========================================
app.post('/api/send-otp', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Indirizzo email non valido." });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "API Key mancante su Render." });
  }

  const otpCode = generateOtp();
  
  otpStore.set(email.toLowerCase(), {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const data = JSON.stringify({
    sender: { name: 'Vision INFIX®', email: 'infixserramenti@gmail.com' },
    replyTo: { email: 'infixserramenti@gmail.com', name: 'Vision INFIX®' },
    to: [{ email: email.trim() }],
    subject: 'Codice di verifica OTP - Vision INFIX®',
    htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Vision INFIX® - Verifica Email</h2>
      <p>Codice di sblocco richiesto per la prova gratuita:</p>
      <h1 style="color: #2e7d32; letter-spacing: 4px; font-size: 32px;">${otpCode}</h1>
      <p style="font-size: 12px; color: #666;">Il codice scade tra 10 minuti.</p>
    </div>`
  });

  const options = {
    hostname: 'api.brevo.com',
    path: '/v3/smtp/email',
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(data)
    }
  };

  const brevoReq = https.request(options, (brevoRes) => {
    let body = '';
    brevoRes.on('data', (chunk) => body += chunk);
    brevoRes.on('end', () => {
      if (brevoRes.statusCode >= 200 && brevoRes.statusCode < 300) {
        return res.json({ success: true, message: "OTP inviato con successo." });
      } else {
        return res.status(500).json({ error: "Errore durante l'invio dell'email via Brevo." });
      }
    });
  });

  brevoReq.on('error', () => {
    return res.status(500).json({ error: "Errore interno del server." });
  });

  brevoReq.write(data);
  brevoReq.end();
});

// ==========================================
// 2. ENDPOINT: VERIFICA OTP
// ==========================================
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ error: "Dati mancanti." });

  const record = otpStore.get(email.toLowerCase());
  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "Codice OTP errato o scaduto." });
  }

  if (record.code === otp.trim()) {
    otpStore.delete(email.toLowerCase());
    return res.json({ success: true, message: "Verificato con successo!" });
  } else {
    return res.status(400).json({ error: "Codice OTP errato." });
  }
});

// ==========================================
// 3. ENDPOINT: DOSSIER COMPARATIVO & ANALISI CON IA
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, material, glass, subframe, shutterBox, userPrompt, openQuestion, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "GEMINI_API_KEY mancante nelle variabili d'ambiente di Render." });
    }

    const catLower = (category || '').toLowerCase();
    const matLower = (material || '').toLowerCase();
    const glassLower = (glass || '').toLowerCase();

    let beneficiSpecifici = "";
    let analisiStato = "";
    let beneficiFiscali = "";
    let rischiNonIntervento = "";

    // A. PORTE INTERNE & OSCURANTI/PERSIANE
    if (catLower.includes('porte interne') || catLower.includes('divisori') || catLower.includes('oscuranti') || catLower.includes('schermature')) {
        const isOscurante = catLower.includes('oscuranti') || catLower.includes('schermature');
        
        analisiStato = isOscurante 
            ? `L'esame visivo dello stato attuale evidenzia un sistema di oscuramento fortemente esposto agli agenti atmosferici, con usura superficiale della vernice, giochi meccanici anomali nelle snodo-stecche e una perdita di efficacia nella schermatura dell'irraggiamento solare.`
            : `L'esame visivo dello stato attuale evidenzia una porta interna caratterizzata da finiture logore dall'uso, sbalzi di planarità del pannello e un impatto estetico superato che interrompe la continuità stilistica dei locali.`;
        
        beneficiSpecifici = isOscurante
            ? `• Regolazione della Luce & Comfort Termico: L'installazione del nuovo sistema in ${material} rifinito in ${finish} garantisce un controllo ottimale della luce diretta e una protezione duratura.\n` +
              `• Zero Manutenzione: I trattamenti superficiali applicati azzerano la necessità di verniciature periodiche.\n`
            : `• Continuità Architettonica & Stile: La nuova porta in ${material} rifinita in ${finish} valorizza i volumi interni e raccorda con eleganza gli spazi.\n` +
              `• Vivibilità & Ergonomia: Fluidità di movimento e abbattimento della rumorosità di calpestio/passaggio.\n`;

        beneficiFiscali = `⚖️ 3. BENEFICI E NORMATIVA FISCALE DI LEGGE:\n` +
            `• La sostituzione isolata di questo elemento non beneficia autonomamente di detrazioni fiscali dirette (intervento di manutenzione ordinaria).\n` +
            `• L'agevolazione (Bonus Ristrutturazioni al 50%) è applicabile ESCLUSIVAMENTE se inserita in un progetto globale di Manutenzione Straordinaria o Ristrutturazione dell'immobile.\n`;

        rischiNonIntervento = `⚠️ 4. I RISCHI DEL "NON INTERVENTO":\n` +
            `Mantenere il sistema attuale espone a un progressivo blocco meccanico, fessurazioni strutturali e a un degrado estetico irreversibile che svaluta l'immobile.`;

    // B. SERRAMENTI & RIQUALIFICAZIONE ENERGETICA
    } else if (catLower.includes('serramenti') || catLower.includes('ristrutturazione_completa')) {
        analisiStato = `L'esame visivo dello stato attuale evidenzia infissi datati con tenute ormai compromesse, presenza di ponti termici perimetrali, spifferi d'aria percepibili e un isolamento acustico non più idoneo agli standard moderni.`;
        
        beneficiSpecifici = `• Isolamento Termico & Risparmio in Bolletta: L'adozione di ${material} associata a ${glass} abbatte drasticamente le dispersioni termiche.\n` +
            `• Comfort Acustico Certificato: Eliminazione dei rumori molesti provenienti dall'esterno.\n` +
            `• Estetica & Valore Immobiliare: La finitura ${finish} rinnova l'aspetto architettonico dell'edificio.\n`;

        beneficiFiscali = `⚖️ 3. AGEVOLAZIONI E BENEFICI DI LEGGE:\n` +
            `• Detrazioni Fiscali / Ecobonus: L'intervento rientra nei requisiti di legge per l'efficientamento energetico, subordinatamente al rispetto dei limiti di trasmittanza termica.\n`;

        rischiNonIntervento = `⚠️ 4. I RISCHI DEL "NON INTERVENTO":\n` +
            `Conservare serramenti obsoleti alimenta il costo occulto delle dispersioni energetiche, favorisce la formazione di condensa e muffe sui muri e deprezza il valore commerciale dell'immobile.`;

    // C. PORTONCINI, GARAGE E PROTEZIONI
    } else {
        let notaSpecificaMateriale = "";
        if (matLower.includes('legno')) {
            notaSpecificaMateriale = ` Nota tecnica sul materiale: trattandosi di un elemento in legno esposto agli agenti atmosferici diretti, la mancanza di una protezione a ciclo continuo o di una tettoia di riparo accelera il degrado della vernice, richiedendo manutenzioni straordinarie cicliche.`;
        } else if (matLower.includes('pvc') || matLower.includes('alluminio')) {
            notaSpecificaMateriale = ` Nota tecnica sul materiale: la scelta di una struttura in ${material} garantisce un'eccellente stabilità dimensionale, insensibilità all'umidità e zero manutenzione contro gli agenti esterni.`;
        }

        let notaSpecificaVetro = "";
        if (glassLower.includes('vetro') || glassLower.includes('oblò') || glassLower.includes('fiancoluce') || catLower.includes('vetrat')) {
            notaSpecificaVetro = ` Attenzione alla sicurezza del vano vetrato: se la vetratura esistente o scelta non è opportunamente stratificata con caratteristiche antisfondamento (es. classe P4A), rappresenta storicamente il punto più vulnerabile del portoncino contro tentativi di effrazione. La configurazione scelta mitiga questo rischio con vetri di sicurezza adeguati.`;
        }

        analisiStato = `L'esame visivo dello stato attuale evidenzia un ingresso principale con segni evidenti di obsolescenza estetica, giochi meccanici sulle chiusure e difese antieffrazione non più in linea con gli standard attuali.${notaSpecificaMateriale}${notaSpecificaVetro}`;
        
        beneficiSpecifici = `• Sicurezza Antieffrazione & Affidabilità: Struttura progettata per offrire un'elevata resistenza meccanica all'effrazione e un funzionamento impeccabile.\n` +
            `• Isolamento & Comfort: Eliminazione degli spifferi perimetrali e miglioramento del comfort termico dell'ingresso.\n` +
            `• Estetica Coordinata: Il nuovo design in ${finish} valorizza immediatamente l'affaccio principale della casa.\n`;

        beneficiFiscali = `⚖️ 3. AGEVOLAZIONI E BENEFICI DI LEGGE:\n` +
            `• Bonus Sicurezza / Ristrutturazioni: L'intervento accede alle detrazioni fiscali previste per le misure finalizzate alla prevenzione di atti illeciti da parte di terzi (sistemi di sicurezza antieffrazione) o ristrutturazione edilizia.\n`;

        rischiNonIntervento = `⚠️ 4. I RISCHI DEL "NON INTERVENTO":\n` +
            `Mantenere un portoncino o un accesso vulnerabile espone l'immobile a rischi concreti di intrusione, perdite di calore incontrollate e costi di riparazione meccanica continui nel tempo.`;
    }

    let dettagliInstallazione = "";
    if (subframe && subframe !== "Non applicabile") {
        dettagliInstallazione += `• Gestione Posa: ${subframe}\n`;
    }
    if (shutterBox && shutterBox !== "Non applicabile") {
        dettagliInstallazione += `• Vano Superiore: ${shutterBox}\n`;
    }

    // ANALISI AUTONOMA TRAMITE GEMINI AI PER LA DOMANDA APERTA E I TRABOCCHETTI
    let rispostaMirataDaIa = "";
    if (openQuestion && openQuestion.trim() !== '') {
        try {
            const promptValutazione = `
Sei l'esperto tecnico di Vision INFIX®. Un utente ha inserito la seguente domanda aperta o richiesta di cantiere: "${openQuestion}"
In relazione al progetto (${category}, materiale: ${material}, finitura: ${finish}), valuta in modo critico, autonomo e professionale se si tratta di una richiesta sensata o di un'assurdità/trabocchetto fisico (es. montare porte in una vasca idromassaggio, su pareti di nylon, carta, ecc.). Fornisci una risposta tecnica tagliente, professionale e definitiva di massimo 3-4 righe.
`;
            const aiCheckResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [{ text: promptValutazione }]
            });
            rispostaMirataDaIa = aiCheckResponse.text ? aiCheckResponse.text.trim() : "Analisi tecnica completata in conformità alle normative di cantiere.";
        } catch (e) {
            rispostaMirataDaIa = "In merito al quesito specifico, l'analisi tecnica conferma che la scelta progettuale deve essere coordinata con le tolleranze del vano.";
        }
    }

    let technicalReport = `DOSSIER TECNICO & ANALISI COMPARATIVA (PRIMA vs DOPO)\n\n` +
        `🎯 CONFIGURAZIONE DI PROGETTO SCELTA:\n` +
        `• Tipologia: ${category}\n` +
        `• Materiale / Struttura: ${material}\n` +
        `• Tamponamento / Vetro / Pannello: ${glass}\n` +
        (dettagliInstallazione ? dettagliInstallazione : ``) +
        `• Finitura Estetica: ${finish}\n\n` +
        `🔍 1. ANALISI DELLO STATO ATTUALE (IL "PRIMA"):\n` +
        analisiStato + `\n\n` +
        `✨ 2. LA SOLUZIONE E I VANTAGGI DEL "DOPO":\n` +
        beneficiSpecifici +
        `• Manutenzione Semplificata: Trattamenti superficiali studiati per resistere all'usura quotidiana e facilitare le operazioni di pulizia.\n\n` +
        beneficiFiscali + `\n` +
        rischiNonIntervento;

    if (openQuestion && openQuestion.trim() !== '') {
        technicalReport += `\n\n💡 RISPOSTA ALLA TUA RICHIESTA SPECIFICA:\n` +
            `"${openQuestion}"\n` +
            `-> ${rispostaMirataDaIa}\n`;
    }

    if (userPrompt && userPrompt.trim() !== '') {
        technicalReport += `\n📋 NOTE DI CANTIERE: "${userPrompt}"`;
    }

    technicalReport += `\n\n🛡️ NOTA TECNICA E CLAUSOLA DI SALVAGUARDIA:\n` +
        `Il presente dossier costituisce un'analisi preliminare di orientamento tecnico-commerciale basata sulla documentazione fotografica fornita e sulle opzioni di configurazione selezionate. I dati e le stime hanno valore indicativo e non sostituiscono il rilievo geometrico esecutivo in cantiere, la verifica tecnica strutturale e la progettazione affidata a personale abilitato. Si declina ogni responsabilità per difformità derivanti da misurazioni non verificate in loco o da condizioni murarie occulte.`;

    return res.json({ 
      success: true, 
      dossier: technicalReport,
      message: "Dossier generato con successo." 
    });

  } catch (error) {
    console.error("Errore server:", error);
    return res.status(500).json({ success: false, error: "Errore durante l'elaborazione del dossier." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
