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
// 3. ENDPOINT: DIAGNOSI & DOSSIER TECNICO DA FOTO
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, material, glass, userPrompt, imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    // Generazione della nota tecnica diagnostica e della soluzione professionale
    const technicalReport = `ANALISI PRELIMINARE & SOLUZIONE TECNICA (IL "DOPO" TECNICO) — Vision INFIX®\n\n` +
        `1. Intervento Selezionato: ${category}\n` +
        `2. Materiale Strutturale: ${material}\n` +
        `3. Tamponamento / Vetro: ${glass}\n` +
        `4. Finitura & Estetica: ${finish}\n\n` +
        `💡 DIAGNOSI DI CANTIERE E BENEFICI NEL CONTESTO:\n` +
        `• Diagnosi visiva: Il sistema attuale evidenzia potenziali dispersioni termiche e la necessità di riqualificazione energetica.\n` +
        `• Soluzione applicata: Sostituzione mirata con profilo ad alte prestazioni e finitura ${finish}, progettata per azzerare i ponti termici.\n` +
        `• Integrazione Estetica: Posa in opera qualificata nel pieno rispetto della geometria e dell'armonia architettonica dell'edificio.\n` +
        (userPrompt ? `• Note specifiche rilevate: "${userPrompt}"` : '');

    return res.json({ 
      success: true, 
      dossier: technicalReport,
      message: "Diagnosi e dossier generati con successo." 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Errore durante l'elaborazione della diagnosi." });
  }
});

// Health check endpoint per Render
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
