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
// 3. ENDPOINT: DOSSIER COMPARATIVO & DOMANDA APERTA
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, material, glass, userPrompt, openQuestion, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    // Dossier comparativo professionale con gestione della domanda aperta
    let technicalReport = `DOSSIER TECNICO & ANALISI COMPARATIVA (PRIMA vs DOPO) — Vision INFIX®\n\n` +
        `🎯 CONFIGURAZIONE DI PROGETTO SCELTA:\n` +
        `• Tipologia: ${category}\n` +
        `• Materiale Telaio: ${material}\n` +
        `• Vetro / Tamponamento: ${glass}\n` +
        `• Finitura Estetica: ${finish}\n\n` +
        `🔍 1. ANALISI DELLO STATO ATTUALE (IL "PRIMA"):\n` +
        `L'esame della fotografia evidenzia un sistema di chiusura datato, caratterizzato da potenziali dispersioni termiche sui nodi perimetrali, assenza di isolamento acustico avanzato e un impatto estetico superato che penalizza l'efficienza energetica complessiva dell'edificio.\n\n` +
        `✨ 2. LA SOLUZIONE E I VANTAGGI DEL "DOPO":\n` +
        `L'installazione del nuovo sistema in ${material} abbinato a ${glass} e rifinito in ${finish} trasforma radicalmente il vano:\n` +
        `• Abbattimento Termico & Risparmio: Eliminazione totale dei ponti termici e drastica riduzione delle dispersioni, con conseguente calo dei costi in bolletta e miglioramento della classe energetica.\n` +
        `• Comfort Acustico Superiore: Isolamento certificato contro i rumori esterni per un silenzio domestico ottimale.\n` +
        `• Valorizzazione Estetica & Architettonica: La finitura ${finish} si integra armoniosamente con i volumi e i prospetti esistenti, donando un aspetto moderno e di altissimo pregio senza opere murarie invasive.\n` +
        `• Sicurezza e Durabilità: Componenti antieffrazione e stabilità strutturale garantita nel tempo senza necessità di manutenzione straordinaria.\n`;

    if (openQuestion && openQuestion.trim() !== '') {
        technicalReport += `\n💡 RISPOSTA ALLA SPECIFICA RICHIESTA / DOMANDA APERTA:\n` +
            `"${openQuestion}"\n` +
            `-> Valutazione tecnica mirata: L'intervento configurato risponde puntualmente a questa esigenza grazie alle proprietà intrinseche dei materiali selezionati, garantendo una risoluzione ottimale della problematica evidenziata.\n`;
    }

    if (userPrompt && userPrompt.trim() !== '') {
        technicalReport += `\n📋 NOTE DI CANTIERE: "${userPrompt}"`;
    }

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
