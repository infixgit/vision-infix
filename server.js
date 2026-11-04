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
    return res.status(500).json({ error: "API Key di Brevo mancante su Render." });
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
// 3. ENDPOINT: CONSULENZA TECNICA E DIAGNOSI VISIVA (Gemini AI Pro)
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, userPrompt, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const geminiApiKey = process.env.GEMINI_VISUAL_API_KEY || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return res.status(500).json({ error: "API Key di Gemini mancante nelle variabili d'ambiente di Render." });
    }

    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Sei l'esperto tecnico senior di INFIX®, un ingegnere edile e consulente di altissimo livello specializzato in serramenti, porte blindate, portoni sezionali e isolamento dell'involucro edilizio. 
              Un professionista/cliente ha caricato la foto di un vano o di un infisso attuale. 
              Categoria specifica selezionata per la nuova proposta: "${category || 'Serramento/Porta'}".
              Finitura scelta: "${finish || 'Standard'}".
              Note aggiuntive del cliente: "${userPrompt || 'Nessuna nota'}".

              Genera una "Relazione Tecnica di Consulenza e Soluzione Visual INFIX®" strutturata in questo modo preciso (usa una formattazione HTML pulita con tag <h4>, <ul>, <li>, <strong>):
              1. <strong>Analisi Tecnica dello Stato Attuale:</strong> (Cosa emerge dalla foto in termini di criticità, dispersioni o limiti estetici/strutturali).
              2. <strong>La Soluzione INFIX® Proposta:</strong> (Perché il prodotto scelto della categoria "${category}" e finitura "${finish}" risolve strutturalmente il problema).
              3. <strong>Vantaggi Prestazionali e di Valore:</strong> (Isolamento termico/acustico, sicurezza antieffrazione, continuità estetica e rivalutazione dell'immobile).
              
              Tono autorevole, tecnico, professionale e orientato alla risoluzione del cantiere.`
            },
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: imageBase64
              }
            }
          ]
        }
      ]
    };

    const geminiData = JSON.stringify(payload);
    
    // Aggiornato al modello gemini-1.5-pro stabile e universalmente supportato
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiApiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(geminiData)
      }
    };

    const geminiReq = https.request(options, (geminiRes) => {
      let body = '';
      geminiRes.on('data', (chunk) => body += chunk);
      geminiRes.on('end', () => {
        try {
          const responseJson = JSON.parse(body);
          
          if (responseJson.error) {
            console.error("Errore restituito da Google Gemini:", responseJson.error);
            return res.status(500).json({ success: false, error: `Gemini API Error: ${responseJson.error.message}` });
          }

          if (responseJson.candidates && 
              responseJson.candidates[0] && 
              responseJson.candidates[0].content && 
              responseJson.candidates[0].content.parts && 
              responseJson.candidates[0].content.parts[0].text) {
            
            const aiReportHtml = responseJson.candidates[0].content.parts[0].text;
            const originalImageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

            return res.json({ 
              success: true, 
              imageUrl: originalImageUri, 
              reportHtml: aiReportHtml,   
              message: "Relazione tecnica generata con successo." 
            });
          } else {
            console.error("Struttura risposta Gemini non riconosciuta:", body);
            return res.status(500).json({ success: false, error: "Formato risposta non valido da Gemini API." });
          }
        } catch (parseError) {
          console.error("Errore parsing JSON da Gemini:", parseError, body);
          return res.status(500).json({ success: false, error: "Errore nel parsing della risposta di Gemini." });
        }
      });
    });

    geminiReq.on('error', (error) => {
      console.error("Errore di rete HTTPS verso Gemini:", error);
      return res.status(500).json({ success: false, error: "Errore di connessione a Gemini API." });
    });

    geminiReq.write(geminiData);
    geminiReq.end();

  } catch (error) {
    console.error("Errore interno server:", error);
    return res.status(500).json({ success: false, error: "Errore durante l'elaborazione della consulenza visiva." });
  }
});

// Health check endpoint per Render
app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
