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

    const matLower = (material || '').toLowerCase();
    const catLower = (category || '').toLowerCase();

    // Generazione dinamica dei benefici prestazionali in base ai materiali e alla macro-categoria
    let beneficiSpecifici = "";
    let analisiStato = "L'esame della fotografia evidenzia un sistema attuale caratterizzato da usura superficiale e da un impatto estetico superato che penalizza l'efficienza e il comfort complessivo dell'immobile.";

    if (matLower.includes('coibentato') || matLower.includes('taglio termico') || matLower.includes('multi-camera')) {
        beneficiSpecifici = `• Isolamento Termico & Risparmio Energetico: L'adozione di materiali evoluti azzera i ponti termici, riducendo drasticamente le dispersioni.\n` +
            `• Comfort Acustico: Abbattimento certificato dei rumori esterni per un isolamento ottimale.\n`;
    } else if (matLower.includes('mono-lamiera') || matLower.includes('acciaio')) {
        beneficiSpecifici = `• Robustezza & Sicurezza Strutturale: Soluzione ad alta resistenza meccanica, ideale per la protezione solida e duratura del vano.\n` +
            `• Pragmatismo & Affidabilità: Struttura resistente nel tempo contro gli agenti atmosferici.\n`;
    } else {
        beneficiSpecifici = `• Stabilità & Durabilità: Materiali selezionati per garantire un ciclo di vita eccellente e un funzionamento impeccabile.\n` +
            `• Design & Funzionalità: Perfetto bilanciamento tra estetica curata e praticità d'uso quotidiano.\n`;
    }

    if (catLower.includes('garage') || catLower.includes('sezionale') || catLower.includes('basculante')) {
        beneficiSpecifici += `• Ottimizzazione dello Spazio: Movimentazione studiata per liberare lo spazio utile sia all'interno che all'esterno del box.\n`;
    } else if (catLower.includes('porte interne') || catLower.includes('filomuro')) {
        beneficiSpecifici += `• Continuità Architettonica: Soluzione di design che valorizza gli ambienti interni con linee pulite e moderne.\n`;
    } else if (catLower.includes('portoncini') || catLower.includes('blindata')) {
        beneficiSpecifici += `• Sicurezza Antieffrazione: Sistemi di chiusura avanzati per blindare l'ingresso principale.\n`;
    }

    let dettagliInstallazione = "";
    if (subframe && subframe !== "Non applicabile") {
        dettagliInstallazione += `• Gestione Posa: ${subframe}\n`;
    }
    if (shutterBox && shutterBox !== "Non applicabile") {
        dettagliInstallazione += `• Vano Superiore: ${shutterBox}\n`;
    }

    let beneficiFiscali = `⚖️ 3. AGEVOLAZIONI E BENEFICI DI LEGGE:\n` +
        `• Detrazioni Fiscali / Ecobonus: L'intervento rientra nei requisiti previsti dalle normative vigenti per l'accesso alle detrazioni fiscali (es. Bonus Ristrutturazioni o Ecobonus, subordinatamente alla conformità dei requisiti tecnici e di trasmittanza previsti dalla legge).\n`;

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
        `L'installazione del nuovo sistema in ${material} rifinito in ${finish} rinnova radicalmente il contesto:\n` +
        beneficiSpecifici +
        `• Valorizzazione Estetica: La finitura ${finish} si integra armoniosamente con l'architettura esistente.\n` +
        `• Manutenzione Ridotta: Trattamenti protettivi studiati per durare nel tempo.\n\n` +
        beneficiFiscali;

    // Risposta alla domanda aperta
    if (openQuestion && openQuestion.trim() !== '') {
        let rispostaMirata = "In merito alla richiesta specifica, la configurazione scelta rappresenta la soluzione ideale bilanciando estetica, funzionalità e requisiti tecnici del vano analizzato.";
        const qLower = openQuestion.toLowerCase();
        
        if (qLower.includes('pvc') || qLower.includes('alluminio')) {
            rispostaMirata = "Confrontando PVC e Alluminio: il PVC offre eccellenti doti di isolamento termico con un ottimo rapporto qualità-prezzo, mentre l'alluminio a taglio termico garantisce profili sottili, massima luminosità e stabilità strutturale per grandi dimensioni.";
        } else if (qLower.includes('spazio') || qLower.includes('sezionale') || qLower.includes('scomparsa')) {
            rispostaMirata = "Analizzando l'aspetto della gestione degli spazi, questa tipologia elimina ingombri superflui, recuperando superficie utile calpestabile sia in apertura che in chiusura.";
        } else if (qLower.includes('condensa') || qLower.includes('spifferi') || qLower.includes('freddo')) {
            rispostaMirata = "Per risolvere la problematica segnalata, il nuovo sistema con guarnizioni perimetrali e materiali ad alte prestazioni interrompe i ponti termici responsabili di spifferi e umidità.";
        }

        technicalReport += `\n💡 RISPOSTA ALLA TUA RICHIESTA SPECIFICA:\n` +
            `"${openQuestion}"\n` +
            `-> ${rispostaMirata}\n`;
    }

    if (userPrompt && userPrompt.trim() !== '') {
        technicalReport += `\n📋 NOTE DI CANTIERE: "${userPrompt}"`;
    }

    // Clausola di salvaguardia agnostica e universale (B2B white-label)
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
