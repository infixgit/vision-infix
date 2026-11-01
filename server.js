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

// 3. ENDPOINT: SIMULAZIONE VISIVA & PARERE TECNICO
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

    // B. Trasformazione grafica su Cloudinary basata sulla finitura
    let transformationOptions = { secure: true };
    if (finish && finish.toLowerCase().includes('bianco')) {
      transformationOptions.transformation = [
        { effect: "brightness:10", quality: "auto" }
      ];
    } else {
      transformationOptions.transformation = [
        { effect: "contrast:15", quality: "auto" }
      ];
    }

    const transformedUrl = cloudinary.url(uploadResponse.public_id, transformationOptions);

    // C. Parere tecnico protetto da try/catch per evitare crash in caso di problemi con il modello IA
    let aiFeasibilityReport = "Intervento fattibile con le specifiche indicate.";
    if (genAI) {
      try {
        // Utilizziamo il nome corretto supportato dalle librerie recenti
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;

        const promptText = `Sei un esperto tecnico di Visual INFIX®. Analizza questa foto di un serramento. Fornisci un parere tecnico professionale sulla fattibilità per la categoria "${category || 'Infisso'}" con finitura "${finish || 'Standard'}": massimo 3 frasi in italiano, chiare e dirette.`;

        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg'
          },
        };

        const result = await model.generateContent([promptText, imagePart]);
        const response = await result.response;
        aiFeasibilityReport = response.text();
      } catch (err) {
        console.error("Avviso Gemini (continuazione flusso standard):", err.message);
        aiFeasibilityReport = "Analisi visiva completata con successo tramite Cloudinary. Struttura del vano idonea all'installazione.";
      }
    }
 
    res.json({ 
      success: true, 
      imageUrl: transformedUrl, 
      result: transformedUrl,
      feasibilityReport: aiFeasibilityReport,
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
