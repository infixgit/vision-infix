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
 
// Configurazione automatica di Cloudinary tramite le variabili d'ambiente di Render
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
 
// 3. ENDPOINT: SIMULAZIONE VISIVA & PARERE TECNICO IA (Cloudinary + Gemini)
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { userPrompt, finish, category, imageBase64, mimeType } = req.body;
 
    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    // A. Caricamento dell'immagine su Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(imageUri, {
      folder: 'visual_infix_simulazioni'
    });

    const transformedUrl = cloudinary.url(uploadResponse.public_id, {
      secure: true
    });

    // B. Analisi tecnica di fattibilità con Gemini (se configurato)
    let aiFeasibilityReport = "Parere tecnico non disponibile al momento.";
    
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Puliamo la stringa base64 rimuovendo il prefisso data URL se presente per darla in pasto a Gemini
        const base64Data = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;

        const promptText = `Sei un esperto consulente tecnico e serramentista di Visual INFIX®. 
        Analizza questa foto di un infisso/serramento fornita dal cliente. 
        Fornisci un breve parere professionale sulla fattibilità dell'intervento di sostituzione o personalizzazione (${finish || 'standard'}), evidenziando eventuali criticità tecniche del vano murario o spunti utili per il cliente in massimo 3-4 frasi chiare e incoraggianti in italiano.`;

        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || 'image/jpeg'
          },
        };

        const result = await model.generateContent([promptText, imagePart]);
        const response = await result.response;
        aiFeasibilityReport = response.text();
      } catch (geminiError) {
        console.error("Errore nell'analisi Gemini:", geminiError);
        aiFeasibilityReport = "Impossibile generare l'analisi tecnica automatica in questo momento, ma l'immagine è stata elaborata con successo.";
      }
    }
 
    res.json({ 
      success: true, 
      imageUrl: transformedUrl, 
      result: transformedUrl,
      feasibilityReport: aiFeasibilityReport,
      message: "Elaborazione e parere tecnico completati."
    });
 
  } catch (error) {
    console.error("Errore server generale:", error);
    res.status(500).json({ success: false, error: "Errore durante l'elaborazione della richiesta." });
  }
});
 
app.get('/healthz', (req, res) => res.send('OK'));
 
app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
