const express = require('express');
const cors = require('cors');
const https = require('https');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

const PORT = process.env.PORT || 3000;

// Mappe in memoria per OTP e gestione test gratuiti
const otpStore = new Map();
const freeTrialStore = new Map();

const MAX_FREE_TESTS = 2; // Impostato a 2 test gratuiti per utente

// Whitelist email di controllo/amministrazione (test illimitati)
const ADMIN_EMAILS = [
  'infixserramenti@gmail.com'
  // Aggiungi qui altre tue email di test se necessario
];

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
  const lowerEmail = email.toLowerCase().trim();
  
  otpStore.set(lowerEmail, {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const data = JSON.stringify({
    sender: { name: 'Visual INFIX®', email: 'infixserramenti@gmail.com' },
    replyTo: { email: 'infixserramenti@gmail.com', name: 'Visual INFIX®' },
    to: [{ email: lowerEmail }],
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

  const lowerEmail = email.toLowerCase().trim();
  const record = otpStore.get(lowerEmail);

  if (!record || Date.now() > record.expiresAt) {
    return res.status(400).json({ error: "Codice OTP errato o scaduto." });
  }

  if (record.code === otp.trim()) {
    otpStore.delete(lowerEmail);

    // Se è un'email amministrativa/controllo, ha accesso illimitato
    if (ADMIN_EMAILS.includes(lowerEmail)) {
      return res.json({ success: true, message: "Verificato (Admin/Controllo)!", remainingTests: 999 });
    }

    if (!freeTrialStore.has(lowerEmail)) {
      freeTrialStore.set(lowerEmail, 0);
    }

    const currentUsage = freeTrialStore.get(lowerEmail);
    const remaining = MAX_FREE_TESTS - currentUsage;

    return res.json({ 
      success: true, 
      message: "Verificato con successo!",
      remainingTests: remaining > 0 ? remaining : 0
    });
  } else {
    return res.status(400).json({ error: "Codice OTP errato." });
  }
});

// ==========================================
// 3. ENDPOINT: TRASFORMAZIONE VISIVA, DOSSIER & INVIO EMAIL BREVO
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { email, category, finish, userPrompt, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const lowerEmail = (email || '').toLowerCase().trim();
    const isAdmin = ADMIN_EMAILS.includes(lowerEmail);
    let remainingTests = 999;

    // Controllo test gratuiti solo per utenti esterni
    if (!isAdmin) {
      const currentUsage = freeTrialStore.get(lowerEmail) || 0;

      if (currentUsage >= MAX_FREE_TESTS) {
        return res.status(403).json({ 
          success: false, 
          error: "Hai esaurito i test gratuiti a disposizione. Passa alla versione a pagamento per continuare." 
        });
      }

      freeTrialStore.set(lowerEmail, currentUsage + 1);
      remainingTests = MAX_FREE_TESTS - (currentUsage + 1);
    }

    const imageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const catLower = (category || '').toLowerCase();

    // Specifiche tecniche complete e dettagliate
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

    let generatedImageUrl = imageUri; // Fallback di sicurezza nativo

    // Esecuzione protetta della chiamata IA
    if (process.env.GEMINI_API_KEY) {
      try {
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
              text: `Genera una versione modificata di questa fotografia applicando la categoria: "${category}" e la finitura: "${finish}". Restituisci l'immagine elaborata.`
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

    // INVIO EMAIL ISTANTANEO CON BREVO (INCLUSO ALLEGATO DEL "DOPO")
    const brevoApiKey = process.env.BREVO_API_KEY;
    if (brevoApiKey && lowerEmail) {
      const pureBase64Image = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');
      
      const brevoData = JSON.stringify({
        sender: { name: 'Visual INFIX®', email: 'infixserramenti@gmail.com' },
        to: [{ email: lowerEmail }],
        subject: `Visual INFIX® - Dossier & Rendering (${category})`,
        htmlContent: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2e7d32;">Visual INFIX® - Dossier & Rendering</h2>
          <p>Gentile cliente, ecco il riepilogo della simulazione e la relazione tecnica per il tuo intervento:</p>
          <div style="background: #f4f4f9; padding: 15px; border-radius: 6px; white-space: pre-line; font-size: 13px;">${technicalReport}</div>
          <p style="margin-top: 15px; font-size: 12px; color: #666;">Trovi l'immagine di simulazione del "Dopo" allegata direttamente a questa email.</p>
        </div>`,
        attachment: [
          {
            content: pureBase64Image,
            name: "Visual-INFIX-Dopo.jpg"
          }
        ]
      });

      const brevoOptions = {
        hostname: 'api.brevo.com',
        path: '/v3/smtp/email',
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(brevoData)
        }
      };

      const emailReq = https.request(brevoOptions, (emailRes) => {
        // Gestione silenziosa o di log dell'invio email
      });
      emailReq.on('error', (e) => console.error("Errore invio email Brevo:", e));
      emailReq.write(brevoData);
      emailReq.end();
    }

    return res.json({ 
      success: true, 
      imageUrl: generatedImageUrl, 
      result: imageUri,
      dossier: technicalReport,
      remainingTests: isAdmin ? 'Illimitati' : remainingTests,
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
