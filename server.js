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

    // Generazione della nota descrittiva professionale e dei benefici mirati per il "Dopo"
    let technicalSpecs = "";
    let descrizioneDopo = "";

    if (catLower.includes('garage') || catLower.includes('sezionale') || catLower.includes('basculante')) {
      descrizioneDopo = `Intervento di riqualificazione completato: sostituzione dei vecchi sistemi di chiusura con moderni portoni sezionali coordinati nella finitura "${finish}". L'installazione valorizza l'estetica della facciata eliminando l'ingombro esterno dei vecchi basculanti e integrandosi perfettamente con i volumi murari esistenti.`;
      technicalSpecs = `• Isolamento Termico Avanzato: Pannelli coibentati con poliuretano ad alta densità per l'azzeramento dei ponti termici e la conformità ai requisiti di risparmio energetico.\n` +
          `• Sicurezza & Motorizzazione: Sistema di blocco antieffrazione meccanico e movimentazione motorizzata silenziosa con sblocco d'emergenza.\n` +
          `• Durabilità e Finitura: Trattamento superficiale ${finish} resistente agli agenti atmosferici più severi, privo di manutenzione periodica.`;
    } else if (catLower.includes('blindato') || catLower.includes('portoncino') || catLower.includes('ingresso')) {
      descrizioneDopo = `Intervento di rinnovamento d'ingresso completato: posa del nuovo portoncino "${category}" in finitura "${finish}", progettato per integrarsi armoniosamente nel vano scala e nella bussola d'ingresso originaria senza opere murarie invasive.`;
      technicalSpecs = `• Sicurezza Antieffrazione Certificata: Struttura in acciaio rinforzato in Classe 3 o 4 con cilindro europeo protetto.\n` +
          `• Isolamento termoacustico perimetrale e ghiera tagliafreddo.\n` +
          `• Design coordinato ${finish} resistente all'usura e agli agenti atmosferici.`;
    } else {
      descrizioneDopo = `Intervento di sostituzione infissi completato: inserimento del nuovo sistema "${category}" con profilo in "${finish}", studiato per rispettare rigorosamente le linee architettoniche, la geometria dei fori finestra e la prospettiva originaria della facciata.`;
      technicalSpecs = `• Efficienza Energetica e Risparmio: Trasmittanza termica ottimizzata U_w con drastica riduzione delle dispersioni termiche.\n` +
          `• Isolamento Acustico e Comfort: Smorzamento testato dei rumori esterni.\n` +
          `• Finitura Pregiata ${finish} protetta contro i raggi UV e stabile nel tempo.`;
    }

    const technicalReport = `RELAZIONE TECNICA & RESPONSO DI SIMULAZIONE — Vision INFIX®\n\n` +
        `🔍 ANALISI DEL RISULTATO (DOPO):\n` +
        descrizioneDopo + `\n\n` +
        `📋 SPECIFICHE E BENEFICI INSTALLATI:\n` +
        technicalSpecs + `\n\n` +
        `• Conformità di Cantiere: Posa qualificata eseguita nel pieno rispetto della struttura muraria e dell'intonaco circostante.\n` +
        (userPrompt ? `• Note specifiche di cantiere rilevate: "${userPrompt}"` : '');

    let generatedImageUrl = imageUri;

    // Chiamata all'IA per la generazione della foto modificata
    if (process.env.GEMINI_API_KEY) {
      try {
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
              text: `Modifica esclusivamente i serramenti presenti in questa foto sostituendoli con: "${category}" rifiniti in "${finish}". Mantieni intatti lo sfondo, i muri, l'intonaco e la prospettiva originale dell'edificio. Genera e restituisci l'immagine elaborata del "Dopo".`
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
        console.error("Errore generazione immagine IA:", aiErr.message);
      }
    }

    return res.json({ 
      success: true, 
      imageUrl: generatedImageUrl, 
      result: imageUri,
      dossier: technicalReport,
      message: "Simulazione e dossier generati con successo." 
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
