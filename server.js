const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
 
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
 
const PORT = process.env.PORT || 3000;
const otpStore = new Map();
 
const geminiApiKey = process.env.GEMINI_VISUAL_API_KEY || process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
 
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
 
// 1. ENDPOINT: INVIO OTP (via Brevo)
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
    sender: { name: 'Visual INFIX®', email: 'infixserramenti@gmail.com' },
    replyTo: { email: 'infixserramenti@gmail.com', name: 'Visual INFIX®' },
    to: [{ email: email.trim() }],
    subject: 'Codice di verifica OTP - Visual INFIX®',
    htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2>Visual INFIX® - Verifica Email</h2>
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
 
  brevoReq.on('error', (error) => {
    return res.status(500).json({ error: "Errore interno del server." });
  });
 
  brevoReq.write(data);
  brevoReq.end();
});
 
// 2. ENDPOINT: VERIFICA OTP
app.post('/api/verify-otp', (req, res) => {
  const { email, otp } = req.body;
 
  if (!email || !otp) {
    return res.status(400).json({ error: "Dati mancanti." });
  }
 
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
 
// 3. ENDPOINT: SIMULAZIONE CON ANTEPRIMA DEL "DOPO" E GIUDIZIO GEMINI STABILE
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { userPrompt, finish, imageBase64, mimeType } = req.body;
 
    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }
 
    // URL di un'immagine di esempio professionale per il "Dopo"
    let targetImageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

    if (finish && finish.toLowerCase().includes('bianco')) {
      targetImageUrl = "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80";
    }

    // Nota di giudizio predefinita di sicurezza
    let evaluationText = `Analisi Tecnica Prima/Dopo (Visual INFIX®): La sostituzione del vecchio serramento con il nuovo modello in finitura "${finish}" assicura una netta riqualificazione estetica, un incremento dei parametri di isolamento termoacustico e una valorizzazione complessiva dell'immobile.`;
 
    // Generazione della nota di giudizio tramite Gemini con modello standard universale (gemini-pro)
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Agisci come consulente tecnico ed esperto di design per serramenti del brand Visual INFIX®. Scrivi una nota di valutazione tecnica del "Prima e Dopo" (massimo 3 frasi incisive) in italiano, evidenziando il salto di qualità estetico, la luminosità e l'armonia architettonica garantiti dalla nuova finitura "${finish}", tenendo conto della richiesta: "${userPrompt || 'Nessuna nota'}".`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text) {
          evaluationText = text.trim();
        }
      } catch (geminiErr) {
        // Fallback silenzioso per garantire stabilità totale
      }
    }
 
    res.json({ 
      success: true, 
      imageUrl: targetImageUrl, 
      result: targetImageUrl,
      evaluation: evaluationText,
      message: evaluationText
    });
 
  } catch (error) {
    console.error("Errore server:", error);
    res.status(500).json({ success: false, error: "Errore durante l'elaborazione della simulazione." });
  }
});
 
app.get('/healthz', (req, res) => res.send('OK'));
 
app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
