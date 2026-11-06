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
      technicalSpecs = `• Isolamento Termico & Pannelli: Portone coibentato con schiuma poliuretanica ad alta densità, trasmittanza U fino a 1.3 W/(m²K) e tenuta aria/acqua certificata.\n` +
          `• Sicurezza & Motorizzazione: Sistema di blocco antieffrazione meccanico e motorizzazione silenziosa con sblocco di emergenza.\n` +
          `• Ingombro Ottimizzato: Scorrimento a soffitto senza invasione dello spazio esterno.`;
    } else if (catLower.includes('blindato') || catLower.includes('portoncino') || catLower.includes('ingresso')) {
      technicalSpecs = `• Sicurezza Antieffrazione: Struttura in acciaio rinforzato certificata in Classe 3 o Classe 4 antieffrazione.\n` +
          `• Isolamento Termoacustico: Valori di abbattimento acustico fino a 43 dB e guarnizioni tagliafreddo perimetrali.\n` +
          `• Design e Finitura: Pannelli coordinati ${finish} resistenti agli agenti atmosferici severi.`;
    } else if (catLower.includes('scorrevole') || catLower.includes('alzante') || catLower.includes('traslante')) {
      technicalSpecs = `• Luminosità & Trasmittanza: Grandi superfici vetrate con profili slim e U_w ottimizzato fino a 0.9 W/(m²K).\n` +
          `• Scorrimento Ergonomico: Meccanismo alzante o traslante per ante di grandi dimensioni movimentabili con minimo sforzo.\n` +
          `• Tenuta Superiore: Classificazione AEV ai vertici della categoria.`;
    } else if (catLower.includes('zanzariera') || catLower.includes('frangisole') || catLower.includes('grata') || catLower.includes('inferriata')) {
      technicalSpecs = `• Funzionalità & Protezione: Sistema schermante o di sicurezza progettato su misura per integrarsi perfettamente con il serramento esistente.\n` +
          `• Durabilità: Reti plissettate ad alta visibilità o tondini in acciaio antitaglio protetti contro la corrosione.\n` +
          `• Comfort Visivo e Aerazione: Regolazione ottimale della luce solare e del passaggio d'aria.`;
    } else {
      technicalSpecs = `• Abbattimento Termico & Risparmio: Trasmittanza termica stimata U_w fino a 1.1 W/(m²K), con riduzione delle dispersioni fino al 45%.\n` +
          `• Isolamento Acustico Certificato: Smorzamento acustico testato fino a 42 dB per il comfort domestico.\n` +
          `• Sicurezza Antieffrazione: Ferramenta perimetrale in classe RC2/RC3.`;
    }

    const technicalReport = `PROPOSTA DI INTERVENTO TECNICO — Configurazione: ${category} | Finitura: ${finish}\n\n` +
        technicalSpecs + `\n` +
        `• Valorizzazione Estetica: Finitura superficiale ${finish} resistente ai raggi UV, progettata per integrarsi senza opere murarie invasive.\n` +
        (userPrompt ? `• Note specifiche di cantiere: "${userPrompt}"` : '');

    let generatedImageUrl = imageUri; // Fallback di sicurezza

    if (process.env.GEMINI_API_KEY) {
      try {
        // Utilizziamo il modello aggiornato gemini-3.8-flash richiesto dall'API
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: mimeType || 'image/jpeg'
              }
            },
            {
              text: `Act as a professional architectural image editing engine. Modify this exact room photo by replacing the existing windows/doors with the new product: category "${category}", exact finish/color "${finish}". Additional user instructions: "${userPrompt || 'None'}". CRITICAL RULES: Keep the exact same room structure, walls, floor, perspective, and background. Change ONLY the color and material of the window frames and doors to match "${finish}". Do not add any foreign furniture.`
            }
          ]
        });

        if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData && part.inlineData.data) {
              generatedImageUrl = `data:${part.inlineData.mimeType || 'image/jpeg'};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (aiErr) {
        console.error("Errore durante l'elaborazione visiva:", aiErr.message);
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

// Health check endpoint per Render
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
