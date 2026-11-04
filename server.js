// ==========================================
// 3. ENDPOINT: CONSULENZA TECNICA E DIAGNOSI VISIVA (Gemini AI)
// ==========================================
app.post('/api/visual-generate', async (req, res) => {
  try {
    const { category, finish, userPrompt, imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Nessuna immagine fornita." });
    }

    const geminiApiKey = process.env.GEMINI_VISUAL_API_KEY || process.env.GEMINI_API_KEY;

    if (!geminiApiKey) {
      return res.status(500).json({ error: "API Key di Gemini mancante nelle variabili d'ambiente." });
    }

    // Prepariamo il payload per l'API nativa di Gemini (Modello gemini-2.5-flash o gemini-1.5-flash)
    const payload = {
      contents: [
        {
          parts: [
            {
              text: `Sei l'esperto tecnico senior di INFIX®, un ingegnere edile e consulente di altissimo livello specializzato in serramenti, porte blindate, portoni sezionali e isolamento dell'involucro edilizio. 
              Un professionista/cliente ha caricato la foto di un vano o di un infisso attuale. 
              Categoria selezionata per la nuova proposta: "${category || 'Serramento/Porta'}".
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

    // Chiamata HTTPS sicura verso l'API di Google Gemini
    const geminiData = JSON.stringify(payload);
    
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
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
          
          if (responseJson.candidates && responseJson.candidates[0].content.parts[0].text) {
            const aiReportHtml = responseJson.candidates[0].content.parts[0].text;
            const originalImageUri = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

            return res.json({ 
              success: true, 
              imageUrl: originalImageUri, // Mantiene la foto reale dell'utente senza distorsioni
              reportHtml: aiReportHtml,   // La consulenza tecnica generata da Gemini
              message: "Relazione tecnica generata con successo." 
            });
          } else {
            return res.status(500).json({ success: false, error: "Risposta non valida da Gemini API." });
          }
        } catch (parseError) {
          return res.status(500).json({ success: false, error: "Errore nel parsing della risposta di Gemini." });
        }
      });
    });

    geminiReq.on('error', (error) => {
      return res.status(500).json({ success: false, error: "Errore di connessione a Gemini API." });
    });

    geminiReq.write(geminiData);
    geminiReq.end();

  } catch (error) {
    return res.status(500).json({ success: false, error: "Errore durante l'elaborazione della consulenza visiva." });
  }
});
