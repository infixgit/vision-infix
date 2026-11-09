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
    const finishLower = (finish || '').toLowerCase();

    let technicalSpecs = "";

    if (catLower.includes('alluminio') || finishLower.includes('alluminio') || finishLower.includes('ral')) {
      technicalSpecs = `• Profilo e Taglio Termico: Sistema in alluminio estruso a taglio termico con camere d'isolamento maggiorate, progettato per azzerare la condensa e garantire una trasmittanza termica ottimale (U_w conforme agli standard ecobonus).\n` +
          `• Finitura Superficiale: Trattamento ${finish} eseguito tramite verniciatura a polveri epossidiche certificate Qualicoat, altamente resistenti ai raggi UV, agli agenti atmosferici aggressivi e alla salsedine.\n` +
          `• Armonia Architettonica: Linee geometriche pulite e minimaliste studiate per integrarsi perfettamente nel contesto murario esistente, rispettando l'estetica e la prospettiva del prospetto.`;
    } else if (catLower.includes('pvc')) {
      technicalSpecs = `• Struttura Multi-camera: Profilo in PVC rigido ad alto isolamento termico e acustico con rinforzi interni in acciaio zincato.\n` +
          `• Finitura & Manutenzione: Rivestimento protettivo ${finish} inattaccabile dagli agenti atmosferici e privo di qualsiasi necessità di manutenzione periodica.\n` +
          `• Sicurezza e Tenuta: Ferramenta perimetrale di sicurezza antieffrazione e tripla guarnizione di tenuta aria/acqua.`;
    } else if (catLower.includes('garage') || catLower.includes('sezionale') || catLower.includes('basculante')) {
      technicalSpecs = `• Pannelli Coibentati: Struttura in acciaio con schiuma poliuretanica ad alta densità, trasmittanza U ridotta e tenuta perimetrale certificata.\n` +
          `• Sicurezza Operativa: Sistema di blocco antieffrazione meccanico e motorizzazione silenziosa con sblocco d'emergenza.\n` +
          `• Finitura Coordinata: Superficie ${finish} resistente all'usura e agli agenti atmosferici esterni.`;
    } else {
      technicalSpecs = `• Efficienza Energetica: Abbattimento termico e acustico di categoria superiore, con riduzione significativa delle dispersioni.\n` +
          `• Finitura Dedicata: Trattamento superficiale ${finish} studiato per esaltare il valore estetico dell'immobile senza opere murarie invasive.\n` +
          `• Sicurezza e Durabilità: Componenti testati per resistere nel lungo periodo con stabilità strutturale garantita.`;
    }

    const technicalReport = `RELAZIONE TECNICA DI INTERVENTO — Vision INFIX®\n\n` +
        `1. Configurazione Cantiere: ${category}\n` +
        `2. Finitura & Trattamento: ${finish}\n\n` +
        `SPECIFICHE DI PROGETTO E PRESTAZIONI:\n` +
        technicalSpecs + `\n\n` +
        `• Conformità e Installazione: Posa in opera qualificata senza alterare la struttura portante o l'intonaco circostante.\n` +
        (userPrompt ? `• Note specifiche di cantiere rilevate: "${userPrompt}"` : '');

    let generatedImageUrl = imageUri;

    // Tentativo di chiamata IA (fallback sicuro all'originale se l'API restituisce solo testo)
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
              text: `Analizza questa foto e restituisci un'immagine elaborata in cui il serramento viene convertito con finitura "${finish}".`
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
        console.error("Nota IA non bloccante:", aiErr.message);
      }
    }

    return res.json({ 
      success: true, 
      imageUrl: generatedImageUrl, 
      result: imageUri,
      dossier: technicalReport,
      message: "Dossier tecnico generato con successo." 
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
