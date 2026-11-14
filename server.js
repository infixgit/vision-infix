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

// Funzione helper con retry automatico in caso di sovraccarico di Google (503)
function callGeminiMultimodal(apiKey, promptText, imageBase64, mimeType, retries = 3, delay = 1000) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType || 'image/jpeg',
                data: imageBase64
              }
            },
            { text: promptText }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048
      }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', async () => {
        try {
          // Se riceviamo 503 (sovraccarico temporaneo Google), riproviamo in automatico
          if (res.statusCode === 503 && retries > 0) {
            console.warn(`Gemini temporaneamente occupato (503). Nuovo tentativo tra ${delay}ms... (${retries} tentativi rimasti)`);
            await new Promise(r => setTimeout(r, delay));
            try {
              const resRetry = await callGeminiMultimodal(apiKey, promptText, imageBase64, mimeType, retries - 1, delay * 2);
              return resolve(resRetry);
            } catch (errRetry) {
              return reject(errRetry);
            }
          }

          const parsed = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              resolve(text.trim());
            } else {
              reject(new Error('Risposta vuota da Gemini: ' + body));
            }
          } else {
            reject(new Error(`Errore API Gemini (${res.statusCode}): ${body}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
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
    return res.status(500).json({ error: "API Key Brevo mancante su Render." });
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
    brevoRes.on('data', (chunk) => (body += chunk));
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
// 3. ENDPOINT: DOSSIER COMPARATIVO CON VISIONE REALE GEMINI AI
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, material, glass, subframe, shutterBox, userPrompt, openQuestion, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY mancante nelle variabili d'ambiente di Render." });
    }

    const promptText = `
Sei l'ingegnere e consulente tecnico-commerciale senior di Vision INFIX®, un software B2B professionale per serramentisti, rivenditori di porte, portoncini e infissi.
Osserva ATTENTAMENTE l'immagine allegata e analizza i parametri configurati dal professionista:

DATI DI CONFIGURAZIONE:
- Tipologia / Prodotto: ${category}
- Materiale / Struttura: ${material || 'Non specificato'}
- Vetro / Pannello: ${glass || 'Non specificato'}
- Gestione Posa / Controtelaio: ${subframe || 'Non applicabile'}
- Situazione Cassonetto: ${shutterBox || 'Non applicabile'}
- Finitura Estetica scelta per il "Dopo": ${finish}
- Domanda aperta o richiesta specifica dell'utente: "${openQuestion || 'Nessuna'}"
- Note di cantiere: "${userPrompt || 'Nessuna'}"

REGOLE DI ANALISI OBBLIGATORIE:
1. **Esame visivo reale della foto ("Il Prima")**: Descrivi ESATTAMENTE ciò che vedi nella foto. Se il serramento o la porta nella foto è già nuovo, recente o in ottimo stato, DILLO CHIARAMENTE senza inventare finti difetti o usura; imposta l'analisi del "Dopo" come un upgrade estetico o cromatico (cambio tinta verso ${finish}). Se invece è vecchio, descrivine i difetti reali.
2. **Valutazione critica e autonoma dei trabocchetti**: Se nella "Domanda aperta" l'utente scrive un'assurdità fisica o tecnica (es. montare una porta dentro una botte di vino piena, in una vasca idromassaggio, su pareti di nylon, ecc.), SMONTALA IMMEDIATAMENTE nella sezione della risposta specifica spiegando con tono autorevole perché è fisicamente impossibile.
3. **Calcolo Colore HEX**: All'inizio assoluto della tua risposta, inserisci una riga nel formato esatto [HEX: #xxxxxx] stimando un codice colore esadecimale che rappresenti visivamente la finitura richiesta "${finish}".
4. **Precisione normativa fiscale italiana**:
   - Per porte interne o oscuranti singoli: specifica che la sostituzione isolata è manutenzione ordinaria senza detrazione diretta, salvo inserimento in ristrutturazione straordinaria.
   - Per serramenti esterni: cita Ecobonus / Bonus Ristrutturazioni subordinato alla trasmittanza termica.
   - Per portoncini blindati/grate: cita il Bonus Sicurezza.

FORMATTAZIONE ESATTA DELL'OUTPUT:
[HEX: #575d52]
DOSSIER TECNICO & ANALISI COMPARATIVA (PRIMA vs DOPO)

🎯 CONFIGURAZIONE DI PROGETTO SCELTA:
- Tipologia: ${category}
- Materiale / Struttura: ${material || 'Non specificato'}
- Tamponamento / Vetro / Pannello: ${glass || 'Non specificato'}
- Finitura Estetica: ${finish}

🔍 1. ANALISI DELLO STATO ATTUALE (IL "PRIMA"):
[Inserisci qui l'analisi visiva reale basata sulla foto]

✨ 2. LA SOLUZIONE E I VANTAGGI DEL "DOPO":
[Inserisci qui i vantaggi tecnici ed estetici della nuova configurazione in ${finish}]

⚖️ 3. BENEFICI E NORMATIVA FISCALE DI LEGGE:
[Inquadramento fiscale corretto]

⚠️ 4. I RISCHI DEL "NON INTERVENTO":
[Rischi reali o considerazioni sull'opportunità dell'intervento]

${openQuestion && openQuestion.trim() !== '' ? `💡 RISPOSTA ALLA TUA RICHIESTA SPECIFICA:\n"${openQuestion}"\n-> [Risposta tecnica autonoma e diretta]\n\n` : ''}${userPrompt && userPrompt.trim() !== '' ? `📋 NOTE DI CANTIERE: "${userPrompt}"\n\n` : ''}🛡️ NOTA TECNICA E CLAUSOLA DI SALVAGUARDIA:
Il presente dossier costituisce un'analisi preliminare di orientamento tecnico-commerciale basata sulla documentazione fotografica fornita e sulle opzioni di configurazione selezionate. I dati e le stime hanno valore indicativo e non sostituiscono il rilievo geometrico esecutivo in cantiere.
`;

    const rawAiResponse = await callGeminiMultimodal(
      geminiKey,
      promptText,
      imageBase64,
      mimeType || 'image/jpeg'
    );

    // Estrazione automatica del codice HEX generato dall'IA
    let hexColor = '#2c5e3b'; // Default
    let cleanDossier = rawAiResponse;

    const hexMatch = rawAiResponse.match(/\[HEX:\s*(#[0-9a-fA-F]{6})\]/);
    if (hexMatch) {
      hexColor = hexMatch[1];
      cleanDossier = rawAiResponse.replace(hexMatch[0], '').trim();
    }

    return res.json({
      success: true,
      dossier: cleanDossier,
      hexColor: hexColor,
      message: "Dossier generato con successo tramite Vision AI."
    });

  } catch (error) {
    console.error("Errore critico endpoint /api/visual-generate:", error);
    return res.status(500).json({
      success: false,
      error: `Errore AI: ${error.message}`
    });
  }
});

app.get('/healthz', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server Vision INFIX® attivo sulla porta ${PORT}`);
});
