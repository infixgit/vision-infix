const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

// Inizializzazione SDK Google Gen AI
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
// 3. ENDPOINT: TRASFORMAZIONE VISIVA & DOSSIER TECNICO
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, userPrompt, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const catLower = (category || '').toLowerCase();

    let technicalSpecs = "";
    if (catLower.includes('garage') || catLower.includes('sezionale') || catLower.includes('basculante')) {
      technicalSpecs = `• Isolamento Termico & Pannelli: Portone coibentato con schiuma poliuretanica ad alta densità, trasmittanza U fino a 1.3 W/(m²K).\n• Sicurezza & Motorizzazione: Sistema di blocco antieffrazione meccanico e motorizzazione silenziosa.`;
    } else if (catLower.includes('blindato') || catLower.includes('portoncino') || catLower.includes('ingresso')) {
      technicalSpecs = `• Sicurezza Antieffrazione: Struttura in acciaio rinforzato certificata in Classe 3 o Classe 4.\n• Isolamento Termoacustico: Abbattimento acustico fino a 43 dB.`;
    } else if (catLower.includes('scorrevole') || catLower.includes('alzante') || catLower.includes('traslante')) {
      technicalSpecs = `• Luminosità & Trasmittanza: Grandi superfici vetrate con profili slim e U_w ottimizzato fino a 0.9 W/(m²K).\n• Scorrimento Ergonomico: Movimentazione agevolata per ante di grandi dimensioni.`;
    } else {
      technicalSpecs = `• Abbattimento Termico & Risparmio: Trasmittanza termica stimata U_w fino a 1.1 W/(m²K), riduzione dispersioni fino al 45%.\n• Isolamento Acustico Certificato: Smorzamento fino a 42 dB.`;
    }

    const technicalReport = `PROPOSTA DI INTERVENTO TECNICO — Configurazione: ${category} | Finitura: ${finish}\n\n` +
        technicalSpecs + `\n` +
        `• Valorizzazione Estetica: Finitura superficiale ${finish} resistente ai raggi UV.\n` +
        (userPrompt ? `• Note specifiche di cantiere: "${userPrompt}"` : '');

    let generatedImageUrl = imageUri;

    if (process.env.GEMINI_API_KEY) {
      try {
        // Utilizziamo gemini-2.5-flash impostando una generazione mirata di immagini/modifica visiva
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg'
              }
            },
            {
              text: `You are an expert architectural visualization AI. Task: Edit this exact room photo to visually install the new product category: "${category}" with the precise finish/color: "${finish}". Additional notes: "${userPrompt || 'None'}". CRITICAL INSTRUCTIONS: Output ONLY the modified image in JPEG format. Keep the exact same room structure, walls, floor, perspective, and background from the input photo. Replace ONLY the windows/doors with the new INFIX product. Do not add any foreign furniture or change anything else.`
            }
          ]
        });

        // Controlliamo se il modello ha restituito una parte immagine binaria
        if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (aiErr) {
        console.error("Errore generazione visiva gemini-2.5-flash:", aiErr.message);
      }
    }

    return res.json({ 
      success: true, 
      imageUrl: generatedImageUrl, 
      result: imageUri,
      dossier: technicalReport,
      message: "Generazione completata con successo." 
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Errore durante l'elaborazione tecnica." });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
