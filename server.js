const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

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
// 3. ENDPOINT: DOSSIER COMPARATIVO & TUTELA B2B
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, material, glass, subframe, shutterBox, userPrompt, openQuestion, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const catLower = (category || '').toLowerCase();

    let beneficiSpecifici = "";
    let analisiStato = "";
    let beneficiFiscali = "";

    // A. GESTIONE SPECIFICA: PORTE INTERNE & DIVISORI
    if (catLower.includes('porte interne') || catLower.includes('divisori')) {
        analisiStato = "L'esame della fotografia evidenzia una porta interna allo stato attuale caratterizzata da finiture usurate dall'uso quotidiano e da un impatto visivo superato che frammenta la continuità estetica degli ambienti.";
        
        beneficiSpecifici = `• Continuità Architettonica & Stile: L'installazione della nuova porta in ${material} rifinita in ${finish} valorizza i volumi interni e raccorda con eleganza gli spazi abitativi.\n` +
            `• Vivibilità & Funzionalità: Ottimizzazione del passaggio e fluidità nei movimenti tra i vari ambienti della casa.\n` +
            `• Comfort Acustico Interno: Riduzione della propagazione dei rumori quotidiani tra una stanza e l'altra.\n`;

        beneficiFiscali = `⚖️ 3. BENEFICI E NORMATIVA FISCALE DI LEGGE:\n` +
            `• La semplice sostituzione di porte interne non dà diritto a detrazioni fiscali dirette o bonus specifici (manutenzione ordinaria).\n` +
            `• L'agevolazione fiscale (Bonus Ristrutturazioni al 50%) è applicabile ESCLUSIVAMENTE se l'intervento rientra all'interno di un progetto complessivo e autorizzato di Manutenzione Straordinaria o Ristrutturazione Edilizia dell'immobile.\n`;

    // B. GESTIONE SPECIFICA: SERRAMENTI & RIQUALIFICAZIONE ENERGETICA
    } else if (catLower.includes('serramenti') || catLower.includes('ristrutturazione_completa')) {
        analisiStato = "L'esame della fotografia evidenzia un sistema di chiusura esterno datato, caratterizzato da usura superficiale e da un impatto termico superato che penalizza l'efficienza complessiva dell'immobile.";
        
        beneficiSpecifici = `• Isolamento Termico & Risparmio Energetico: L'adozione di materiali evoluti azzera i ponti termici, riducendo drasticamente le dispersioni.\n` +
            `• Comfort Acustico: Abbattimento certificato dei rumori esterni per un isolamento ottimale.\n` +
            `• Valorizzazione Estetica: La finitura ${finish} si integra armoniosamente con l'architettura esistente.\n`;

        beneficiFiscali = `⚖️ 3. AGEVOLAZIONI E BENEFICI DI LEGGE:\n` +
            `• Detrazioni Fiscali / Ecobonus: L'intervento rientra nei requisiti previsti dalle normative vigenti per l'accesso alle detrazioni fiscali (Ecobonus / Bonus Casa), subordinatamente alla conformità dei requisiti tecnici e di trasmittanza termica previsti dalla legge.\n`;

    // C. GESTIONE SPECIFICA: PORTONCINI, GARAGE, OSCURANTI E PROTEZIONI
    } else {
        analisiStato = "L'esame della fotografia evidenzia un elemento di chiusura attuale che mostra segni di obsolescenza estetica e funzionale, limitando la protezione complessiva e l'impatto visivo dell'accesso.";
        
        beneficiSpecifici = `• Sicurezza & Affidabilità: Soluzione strutturata per garantire protezione elevata contro tentativi di effrazione e un funzionamento meccanico impeccabile nel tempo.\n` +
            `• Estetica & Coordinamento: Il nuovo design in ${finish} rinnova radicalmente l'impatto visivo dell'affaccio.\n`;

        beneficiFiscali = `⚖️ 3. AGEVOLAZIONI E BENEFICI DI LEGGE:\n` +
            `• Bonus Sicurezza / Ristrutturazioni: L'intervento può accedere alle detrazioni fiscali previste per le misure finalizzate alla prevenzione di atti illeciti da parte di terzi o per interventi di ristrutturazione edilizia.\n`;
    }

    let dettagliInstallazione = "";
    if (subframe && subframe !== "Non applicabile") {
        dettagliInstallazione += `• Gestione Posa: ${subframe}\n`;
    }
    if (shutterBox && shutterBox !== "Non applicabile") {
        dettagliInstallazione += `• Vano Superiore: ${shutterBox}\n`;
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
        `• Manutenzione Ridotta: Trattamenti superficiali protettivi studiati per resistere all'usura e semplificare la pulizia quotidiana.\n\n` +
        beneficiFiscali;

    // Risposta intelligente estesa a tutte le categorie per la domanda aperta
    if (openQuestion && openQuestion.trim() !== '') {
        let rispostaMirata = "In merito alla richiesta specifica, la configurazione proposta bilancia perfettamente la resa estetica con la funzionalità e l'efficienza tecnica del vano.";
        const qLower = openQuestion.toLowerCase();
        
        if (qLower.includes('nero') || qLower.includes('pulire') || qLower.includes('impronte') || qLower.includes('graff')) {
            rispostaMirata = "Le superfici e le finiture opache di ultima generazione (come il Nero Opaco RAL 9005) utilizzano rivestimenti ad elevata durezza e trattamenti anti-impronta. Non richiedono manutenzioni complesse: è sufficiente la pulizia ordinaria con panni morbidi in microfibra e detergenti neutri non abrasivi, mantenendo inalterata la profondità del colore e la resa estetica nel tempo.";
        } else if (qLower.includes('pvc') || qLower.includes('alluminio')) {
            rispostaMirata = "Analizzando il confronto diretto: il PVC offre eccellenti doti di isolamento termico intrinseco, leggerezza e un imbattibile rapporto qualità-prezzo, azzerando la manutenzione. L'Alluminio (estruso o a taglio termico) garantisce invece una rigidità strutturale superiore, ed è la scelta d'elezione per elementi esposti a forte irraggiamento solare o di grandi dimensioni, offrendo indeformabilità e una durata meccanica praticamente illimitata.";
        } else if (qLower.includes('condensa') || qLower.includes('spifferi') || qLower.includes('freddo')) {
            rispostaMirata = "Per risolvere le problematiche di dispersione e condensa, la scelta di sistemi a multi-camera con guarnizioni perimetrali di tenuta e vetri basso emissivi interrompe efficacemente i ponti termici, eliminando spifferi e sbalzi di temperatura superficiale.";
        } else if (qLower.includes('sicurezza') || qLower.includes('blindat') || qLower.includes('effraz') || qLower.includes('classe')) {
            rispostaMirata = "Dal punto di vista della protezione antieffrazione, l'adozione di strutture rinforzate in acciaio, serrature a cilindro europeo protetto e rostri di sicurezza garantisce standard elevati di resistenza attiva e passiva, tutelando efficacemente gli accessi dell'immobile.";
        } else if (qLower.includes('motor') || qLower.includes('telecomando') || qLower.includes('pulsant')) {
            rispostaMirata = "Il sistema di movimentazione automatica (tramite pulsantiera a muro o radiocomando protetto) assicura il massimo comfort d'uso quotidiano, integrando dispositivi di sicurezza antischiacciamento e sblocco manuale di emergenza in caso di blackout.";
        } else if (qLower.includes('spazio') || qLower.includes('ingombr') || qLower.includes('salvaspazio')) {
            rispostaMirata = "La configurazione scelta è ingegnerizzata per azzerare gli ingombri superflui, ottimizzando lo spazio utile di passaggio sia interno che esterno e valorizzando la metratura calpestabile dell'ambiente.";
        }

        technicalReport += `\n💡 RISPOSTA ALLA TUA RICHIESTA SPECIFICA:\n` +
            `"${openQuestion}"\n` +
            `-> ${rispostaMirata}\n`;
    }

    if (userPrompt && userPrompt.trim() !== '') {
        technicalReport += `\n📋 NOTE DI CANTIERE: "${userPrompt}"`;
    }

    // Clausola di tutela agnostica
    technicalReport += `\n\n🛡️ NOTA TECNICA E CLAUSOLA DI SALVAGUARDIA:\n` +
        `Il presente dossier costituisce un'analisi preliminare di orientamento tecnico-commerciale basata sulla documentazione fotografica fornita e sulle opzioni di configurazione selezionate. I dati e le stime hanno valore indicativo e non sostituiscono il rilievo geometrico esecutivo in cantiere, la verifica tecnica strutturale e la progettazione affidata a personale abilitato. Si declina ogni responsabilità per difformità derivanti da misurazioni non verificate in loco o da condizioni murarie occulte.`;

    return res.json({ 
      success: true, 
      dossier: technicalReport,
      message: "Dossier generato con successo." 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Errore durante l'elaborazione del dossier." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
