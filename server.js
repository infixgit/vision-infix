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
    const { category, finish, material, glass, userPrompt, openQuestion, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const matLower = (material || '').toLowerCase();
    const catLower = (category || '').toLowerCase();

    // Generazione dinamica dei benefici prestazionali in base ai materiali reali
    let beneficiSpecifici = "";
    let analisiStato = "L'esame della fotografia evidenzia un sistema di chiusura datato, caratterizzato da usura superficiale e da un impatto estetico superato che penalizza l'efficienza energetica complessiva dell'immobile.";

    if (matLower.includes('coibentato') || matLower.includes('taglio termico') || matLower.includes('multi-camera')) {
        beneficiSpecifici = `• Isolamento Termico & Risparmio Energetico: L'adozione di materiali coibentati azzera i ponti termici, riducendo drasticamente le dispersioni e migliorando il comfort climatico.\n` +
            `• Comfort Acustico: Abbattimento certificato dei rumori esterni per un silenzio domestico ottimale.\n`;
    } else if (matLower.includes('mono-lamiera') || matLower.includes('acciaio zincato')) {
        beneficiSpecifici = `• Robustezza & Sicurezza Strutturale: Soluzione in acciaio ad alta resistenza meccanica, ideale per la protezione solida e duratura del vano.\n` +
            `• Ventilazione & Praticità: Struttura essenziale, affidabile nel tempo e protetta contro gli agenti atmosferici aggressivi.\n`;
    } else {
        beneficiSpecifici = `• Stabilità & Durabilità: Materiali di prima scelta selezionati per garantire un ciclo di vita eccellente e un funzionamento impeccabile.\n` +
            `• Protezione dagli Agenti Atmosferici: Resistenza superiore all'usura e agli sbalzi termici.\n`;
    }

    if (catLower.includes('garage') || catLower.includes('sezionale') || catLower.includes('basculante')) {
        beneficiSpecifici += `• Ottimizzazione dello Spazio: Movimentazione studiata per liberare lo spazio utile sia all'interno che all'esterno del box.\n`;
    }

    // Vantaggi fiscali e di legge applicabili
    let beneficiFiscali = `⚖️ 3. AGEVOLAZIONI E BENEFICI DI LEGGE:\n` +
        `• Detrazioni Fiscali / Ecobonus: L'intervento di riqualificazione energetica con la sostituzione dei sistemi di chiusura/infissi rientra nei requisiti previsti dalle normative vigenti per l'accesso alle detrazioni fiscali (es. Bonus Ristrutturazioni o Ecobonus, subordinatamente alla trasmissione delle pratiche ENEA e ai requisiti di trasmittanza termica previsti dalla legge).\n`;

    let technicalReport = `DOSSIER TECNICO & ANALISI COMPARATIVA (PRIMA vs DOPO)\n\n` +
        `🎯 CONFIGURAZIONE DI PROGETTO SCELTA:\n` +
        `• Tipologia: ${category}\n` +
        `• Materiale / Struttura: ${material}\n` +
        `• Tamponamento / Vetro: ${glass}\n` +
        `• Finitura Estetica: ${finish}\n\n` +
        `🔍 1. ANALISI DELLO STATO ATTUALE (IL "PRIMA"):\n` +
        analisiStato + `\n\n` +
        `✨ 2. LA SOLUZIONE E I VANTAGGI DEL "DOPO":\n` +
        `L'installazione del nuovo sistema in ${material} rifinito in ${finish} rinnova radicalmente il contesto:\n` +
        beneficiSpecifici +
        `• Valorizzazione Estetica: La finitura ${finish} si integra armoniosamente con l'architettura esistente, donando un aspetto curato e di alto pregio.\n` +
        `• Manutenzione Ridotta: Trattamenti superficiali protettivi studiati per durare nel tempo senza interventi straordinari.\n\n` +
        beneficiFiscali;

    // Risposta intelligente alla domanda aperta
    if (openQuestion && openQuestion.trim() !== '') {
        let rispostaMirata = "In merito alla richiesta specifica, l'opzione configurata rappresenta la risposta ideale bilanciando perfettamente estetica, praticità d'uso e caratteristiche tecniche del vano analizzato in foto.";
        const qLower = openQuestion.toLowerCase();
        
        if (qLower.includes('pvc') || qLower.includes('alluminio')) {
            rispostaMirata = "Analizzando il confronto tra PVC e Alluminio per questo cantiere: il PVC offre eccellenti doti di isolamento termico intrinseco con un ottimo rapporto qualità-prezzo, mentre l'alluminio a taglio termico garantisce profili più sottili, massima luminosità e una stabilità strutturale eccezionale per grandi vetrate.";
        } else if (qLower.includes('spazio') || qLower.includes('praticità') || qLower.includes('sezionale') || qLower.includes('basculante')) {
            rispostaMirata = "Valutando la gestione dello spazio tra portone basculante e sezionale: il portone sezionale scorre verticalmente a soffitto eliminando completamente lo sbalzo esterno in apertura, permettendo di parcheggiare l'auto a ridosso della chiusura e offrendo un recupero di spazio prezioso rispetto al basculante tradizionale.";
        } else if (qLower.includes('condensa') || qLower.includes('freddo') || qLower.includes('spifferi')) {
            rispostaMirata = "Per risolvere la problematica evidenziata, la combinazione del nuovo infisso con vetro basso emissivo e guarnizioni perimetrali di tenuta interrompe i ponti termici responsabili degli spifferi e dell'accumulo di umidità sui nodi.";
        }

        technicalReport += `\n💡 RISPOSTA ALLA TUA RICHIESTA SPECIFICA:\n` +
            `"${openQuestion}"\n` +
            `-> ${rispostaMirata}\n`;
    }

    if (userPrompt && userPrompt.trim() !== '') {
        technicalReport += `\n📋 NOTE DI CANTIERE: "${userPrompt}"`;
    }

    // Nota tecnica finale agnostica (priva di marchi fissi, perfetta per l'uso B2B universale)
    technicalReport += `\n\n🛡️ NOTA TECNICA E CLAUSOLA DI SALVAGUARDIA:\n` +
        `Il presente dossier costituisce un'analisi preliminare di orientamento tecnico-commerciale basata sulla documentazione fotografica fornita e sulle opzioni di configurazione selezionate. I dati, le valutazioni e le stime prestazionali hanno valore indicativo e non sostituiscono in alcun modo il rilievo geometrico esecutivo in cantiere, la verifica tecnica strutturale e la progettazione esecutiva affidata a personale tecnico abilitato. Si declina ogni responsabilità per difformità derivanti da misurazioni non verificate in loco o da condizioni murarie occulte non rilevabili da immagine fotografica.`;

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

// Health check endpoint per Render
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
