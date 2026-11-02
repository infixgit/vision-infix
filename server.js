const express = require('express');
const cors = require('cors');
const https = require('https');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

// Configurazione Cloudinary (prende automaticamente le variabili d'ambiente da Render)
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
      <p>Codice di sblocco richiesto per l'accesso:</p>
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

// Helper per richieste HTTPS POST asincrone a Fal.ai
function fetchHttpsJson(url, headers, bodyData) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: headers
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(parsed);
          else reject(parsed);
        } catch (e) {
          reject(new Error("Risposta non JSON dal server AI."));
        }
      });
    });
    req.on('error', (err) => reject(err));
    if (bodyData) req.write(JSON.stringify(bodyData));
    req.end();
  });
}

// 3. ENDPOINT: SIMULAZIONE REALE CON FAL.AI
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { finish, category, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const falKey = process.env.FAL_KEY;
    if (!falKey) {
      return res.status(500).json({ error: "Configurazione FAL_KEY mancante su Render." });
    }

    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    // Carichiamo l'immagine dell'utente su Cloudinary per ottenere un URL pubblico sicuro
    const uploadResponse = await cloudinary.uploader.upload(imageUri, {
      folder: 'visual_infix_simulazioni'
    });
    const userImageUrl = uploadResponse.secure_url;

    const selectedCategory = category || 'serramento';
    const selectedFinish = finish || 'PVC bianco moderno';

    const aiPrompt = `A modern high-quality ${selectedCategory} made of ${selectedFinish}, clean frame, perfect architecture design, photorealistic, 8k resolution, matching the home environment style.`;
    const negativePrompt = `wooden frame, old window, deformed, bad lighting, blurry, low quality`;

    // Endpoint ufficiale Fal.ai per Flux Image-to-Image / Inpainting
    const falUrl = "https://fal.run/fal-ai/flux/schnell/image-to-image";
    const headers = {
      "Authorization": `Key ${falKey}`,
      "Content-Type": "application/json"
    };
    
    const bodyData = {
      image_url: userImageUrl,
      prompt: aiPrompt,
      negative_prompt: negativePrompt,
      strength: 0.65,
      sync_mode: true
    };

    const aiResponse = await fetchHttpsJson(falUrl, headers, bodyData);
    
    if (!aiResponse.images || aiResponse.images.length === 0) {
      throw new Error("L'intelligenza artificiale non ha generato alcuna immagine.");
    }

    const transformedImageUrl = aiResponse.images[0].url;

    const catLower = selectedCategory.toLowerCase();
    let stylisticNote = `L'inserimento del prodotto [${selectedCategory}] in finitura [${selectedFinish}] valorizza l'immobile, ottimizzando l'estetica complessiva e conferendo un impatto visivo di altissimo pregio.`;

    if (catLower.includes('finestra') || catLower.includes('scorrevole') || catLower.includes('serramento')) {
      stylisticNote = `La configurazione del serramento in finitura ${selectedFinish} illumina gli spazi interni, migliora drasticamente il comfort visivo e dona un'eleganza pulita e moderna alla facciata.`;
    } else if (catLower.includes('portoncino') || catLower.includes('blindato')) {
      stylisticNote = `Il nuovo ingresso con il sistema ${selectedCategory} in finitura ${selectedFinish} unisce massima sicurezza e un biglietto da visita estetico di assoluto prestigio per la casa.`;
    }

    res.json({ 
      success: true, 
      imageUrl: transformedImageUrl, 
      result: transformedImageUrl,
      designNote: stylisticNote, 
      feasibilityReport: `Simulazione fotorealistica AI completata con successo per ${selectedCategory} (${selectedFinish}).`,
      message: "Simulazione generata con successo."
    });

  } catch (error) {
    console.error("Errore server simulazione AI:", error);
    res.status(500).json({ success: false, error: "Errore durante la generazione fotorealistica del serramento." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
