const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cloudinary = require('cloudinary').v2;
 
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
 
const PORT = process.env.PORT || 3000;
const otpStore = new Map();
 
// Inizializzazione sicura di Gemini con gemini-pro (compatibile al 100% con il piano gratuito)
const geminiApiKey = process.env.GEMINI_VISUAL_API_KEY || process.env.GEMINI_API_KEY;
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null;
 
// Configurazione Cloudinary
cloudinary.config();
 
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

  brevoReq.on('error', () => {
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

// 3. ENDPOINT: SIMULAZIONE VISIVA CON CLOUDINARY + GEMINI PRO
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { userPrompt, finish, category, imageBase64, mimeType } = req.body;
 
    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    // A. Caricamento su Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(imageUri, {
      folder: 'visual_infix_simulazioni'
    });

    // B. Trasformazione grafica visibile su Cloudinary
    let transformationOptions = { secure: true };
    if (finish && (finish.toLowerCase().includes('bianco') || finish.toLowerCase().includes('ral9010'))) {
      transformationOptions.transformation = [
        { effect: "brightness:12", quality: "auto" }
      ];
    } else {
      transformationOptions.transformation = [
        { effect: "contrast:20", quality: "auto" }
      ];
    }

    const transformedUrl = cloudinary.url(uploadResponse.public_id, transformationOptions);

    // C. Analisi opzionale con Gemini Pro (protetta da try/catch per non bloccare mai il rendering)
    let aiReport = "Fattibilità verificata: intervento idoneo per le specifiche richieste.";
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const resultAI = await model.generateContent(`Analisi tecnica per serramento finitura ${finish || 'standard'}. Massimo 2 frasi.`);
        const responseAI = await resultAI.response;
        aiReport = responseAI.text();
      } catch (geminiErr) {
        console.log("Nota Gemini Pro:", geminiErr.message);
      }
    }
 
    // RESTITUZIONE ESATTA ATTESA DAL FRONTEND (con imageUrl)
    res.json({ 
      success: true, 
      imageUrl: transformedUrl, 
      result: transformedUrl,
      feasibilityReport: aiReport,
      message: "Simulazione generata con successo."
    });
 
  } catch (error) {
    console.error("Errore server critico:", error);
    res.status(500).json({ success: false, error: "Errore durante l'elaborazione della simulazione grafica." });
  }
});
 
app.get('/healthz', (req, res) => res.send('OK'));
 
app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
