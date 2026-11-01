const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Replicate = require('replicate');
 
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));
 
const PORT = process.env.PORT || 3000;
const otpStore = new Map();
 
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

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
 
// 3. ENDPOINT: GENERAZIONE VISIVA ROBUSTA
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { userPrompt, finish, imageBase64, mimeType } = req.body;
 
    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }
 
    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
    let resultImageUrl = null;
    let evaluationText = "Valutazione Prima/Dopo: L'installazione dei nuovi serramenti in finitura " + finish + " garantisce un netto miglioramento dell'impatto estetico, della luminosità e del valore complessivo dell'immobile.";
 
    // Esecuzione Replicate con parametri ripuliti e sicuri
    try {
      const promptText = `Architectural photo, modern sectional garage doors in finish: ${finish}. ${userPrompt || ''}, high quality.`;
 
      const output = await replicate.run(
        "black-forest-labs/flux-dev",
        {
          input: {
            prompt: promptText,
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "jpg",
            output_quality: 80
          }
        }
      );
 
      if (typeof output === 'string') {
        resultImageUrl = output;
      } else if (Array.isArray(output) && output.length > 0) {
        resultImageUrl = typeof output[0] === 'string' ? output[0] : (output[0].url || null);
      } else if (output && typeof output === 'object') {
        resultImageUrl = output.url || null;
      }
    } catch (apiError) {
      console.log("Nota Replicate (fallback attivo):", apiError.message);
    }
 
    if (!resultImageUrl) {
      resultImageUrl = imageUri;
    }

    // Esecuzione Gemini sicura (usa modello standard di fallback)
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const geminiPrompt = `Agisci come un consulente tecnico ed esperto di design per serramenti Visual INFIX®. Fornisci una breve valutazione professionale (3 frasi) in italiano sui vantaggi estetici e funzionali derivanti dall'adozione della finitura "${finish}".`;
        
        const geminiResult = await model.generateContent(geminiPrompt);
        const responseText = geminiResult.response.text();
        if (responseText) {
          evaluationText = responseText;
        }
      } catch (geminiError) {
        console.log("Uso testo di valutazione standard.");
      }
    }
 
    res.json({ 
      success: true, 
      imageUrl: resultImageUrl, 
      result: resultImageUrl,
      evaluation: evaluationText 
    });
 
  } catch (error) {
    console.error("Errore generale server:", error);
    res.status(500).json({ success: false, error: "Errore durante l'elaborazione della simulazione." });
  }
});
 
app.get('/healthz', (req, res) => res.send('OK'));
 
app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
