const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;
const otpStore = new Map();

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
      console.log(`Risposta Brevo (Status ${brevoRes.statusCode}):`, body);
      if (brevoRes.statusCode >= 200 && brevoRes.statusCode < 300) {
        return res.json({ success: true, message: "OTP inviato con successo." });
      } else {
        return res.status(500).json({ error: "Errore durante l'invio dell'email via Brevo." });
      }
    });
  });

  brevoReq.on('error', (error) => {
    console.error("Errore di rete:", error);
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
// 3. ENDPOINT: TRASFORMAZIONE VISIVA
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  console.log(">>> Richiesta di generazione visiva ricevuta dal frontend...");
  try {
    const { userPrompt, finish, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      console.log("Errore: Nessuna immagine fornita.");
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const apiKey = process.env.GEMINI_VISUAL_API_KEY;
    if (!apiKey) {
      console.log("Errore: GEMINI_VISUAL_API_KEY mancante su Render.");
      return res.status(500).json({ error: "GEMINI_VISUAL_API_KEY mancante su Render." });
    }

    const promptText = `Modifica questa foto applicando un nuovo infisso o portone in finitura: ${finish}. ${userPrompt || ''}. Mantieni perfettamente la prospettiva e le proporzioni della parete originale, inserendo il prodotto in modo realistico.`;

    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }
      ]
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-4-argon:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const geminiReq = https.request(options, (geminiRes) => {
      let body = '';
      geminiRes.on('data', (chunk) => body += chunk);
      geminiRes.on('end', () => {
        console.log(`Risposta Gemini ricevuta (Status ${geminiRes.statusCode})`);
        try {
          const responseJson = JSON.parse(body);
          if (geminiRes.statusCode >= 200 && geminiRes.statusCode < 300) {
            const textResponse = responseJson.candidates?.[0]?.content?.parts?.[0]?.text || "Elaborazione completata.";
            return res.json({ success: true, message: textResponse, result: textResponse });
          } else {
            console.error("Errore Gemini API dettagliato:", body);
            return res.status(500).json({ error: "Errore dal servizio di generazione visiva." });
          }
        } catch (e) {
          console.error("Errore parsing risposta Gemini:", body);
          return res.status(500).json({ error: "Errore interno nella risposta del server." });
        }
      });
    });

    geminiReq.on('error', (error) => {
      console.error("Errore di rete durante la chiamata a Gemini:", error);
      return res.status(500).json({ error: "Errore di connessione al servizio di IA." });
    });

    geminiReq.write(payload);
    geminiReq.end();

  } catch (error) {
    console.error("Errore generale visual-generate:", error);
    res.status(500).json({ success: false, error: "Errore durante la trasformazione grafica visiva." });
  }
});

// Health check endpoint per Render
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
