// Database di preset visivi professionali e consulenze di stile per Visual INFIX®
const CATALOGO_INFIX_DATA = {
  "serramento": {
    prima: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    titolo: "Analisi di Riqualificazione Energetica ed Estetica dei Serramenti",
    nota: "Il sistema ha rilevato un contesto ideale per l'installazione di infissi ad alte prestazioni. L'adozione del nuovo profilo in finitura selezionata massimizza l'apporto di luce naturale, riduce i ponti termici e conferisce alla facciata interna ed esterna un'armonia geometrica contemporanea, coniugando isolamento acustico e design minimale."
  },
  "porta interna": {
    prima: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    titolo: "Analisi di Integrazione Spaziale e Interior Design",
    nota: "L'intervento sui varchi interni ottimizza la percezione dei volumi. La scelta della porta selezionata crea una linea di continuità visiva pulita, eliminando le barriere visive tradizionali e valorizzando i pavimenti e i rivestimenti con un'estetica di alto profilo sartoriale."
  },
  "portoncino": {
    prima: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    titolo: "Analisi di Sicurezza e Biglietto da Visita Architettonico",
    nota: "L'ingresso principale viene ridefinito come elemento di assoluto pregio. Il nuovo portoncino blindato unisce i massimi standard di classe antieffrazione a un impatto scenografico imponente, garantendo protezione totale e un'accoglienza di lusso."
  },
  "sezionale": {
    prima: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
    nota: "La trasformazione del prospetto garage è radicale. Il portone sezionale scelto sfrutta le geometrie pulite per donare ordine, luminosità e un'immediata percezione di modernità all'intera volumetria esterna dell'abitazione."
  },
  "oscurante": {
    prima: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
    nota: "L'installazione del sistema oscurante ridisegna il ritmo della facciata. Oltre a garantire un controllo solare ottimale e la privacy degli ambienti, la finitura coordinata conferisce un carattere architettonico deciso e rifinito."
  },
  "default": {
    prima: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    titolo: "Analisi di Valorizzazione Immobiliare INFIX®",
    nota: "L'inserimento del prodotto selezionato ottimizza l'equilibrio estetico e funzionale dello spazio, garantendo un incremento immediato del comfort abitativo e del valore percepito dell'immobile."
  }
};

// Configurazione Profili e Crediti
const USERS_DB = {
  "infix@outlook.it": { role: "PRO", credits: 999999 },
  "santino.simoncello@libero.it": { role: "STANDARD", credits: 50 }
};

let currentUserEmail = localStorage.getItem('visual_infix_user') || '';

function checkUserAccess() {
  if (!currentUserEmail || !USERS_DB[currentUserEmail]) {
    let email = prompt("Inserisci la tua email autorizzata per Visual INFIX®:");
    if (email && USERS_DB[email.trim().toLowerCase()]) {
      currentUserEmail = email.trim().toLowerCase();
      localStorage.setItem('visual_infix_user', currentUserEmail);
    } else {
      alert("Email non riconosciuta o non autorizzata.");
      return checkUserAccess();
    }
  }
  updateCreditsUI();
}

function updateCreditsUI() {
  const user = USERS_DB[currentUserEmail];
  const display = document.getElementById('creditsDisplay');
  if (user && display) {
    if (user.role === "PRO") {
      display.innerText = `Profilo PRO (${currentUserEmail}) - Crediti: Illimitati 🚀`;
    } else {
      display.innerText = `Utente: ${currentUserEmail} - Crediti rimasti: ${user.credits}`;
    }
  }
  const generateBtn = document.getElementById('generateBtn');
  const stripePaywall = document.getElementById('stripePaywall');
  if (generateBtn) generateBtn.style.display = 'block';
  if (stripePaywall) stripePaywall.style.display = 'none';
}

// Gestione invio modulo con simulazione visiva e consulenza IA dettagliata
document.getElementById('visualForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const user = USERS_DB[currentUserEmail];
  if (user.role !== "PRO" && user.credits <= 0) {
    alert("Hai esaurito i crediti disponibili.");
    document.getElementById('generateBtn').style.display = 'none';
    document.getElementById('stripePaywall').style.display = 'block';
    return;
  }

  const categorySelect = document.querySelector('select[name="category"]') || document.querySelectorAll('select')[0];
  const finishSelect = document.querySelector('select[name="finish"]') || document.querySelectorAll('select')[1];
  
  const categoryText = categorySelect ? categorySelect.value.toLowerCase() : '';
  const finishText = finishSelect ? finishSelect.value : 'Standard';

  // Selezione della chiave di preset in base al catalogo
  let presetKey = 'default';
  if (categoryText.includes('finestra') || categoryText.includes('scorrevole') || categoryText.includes('serramento')) {
    presetKey = 'serramento';
  } else if (categoryText.includes('porta interna') || categoryText.includes('filomuro') || categoryText.includes('pantografata')) {
    presetKey = 'porta interna';
  } else if (categoryText.includes('portoncino') || categoryText.includes('blindato')) {
    presetKey = 'portoncino';
  } else if (categoryText.includes('sezionale') || categoryText.includes('basculante')) {
    presetKey = 'sezionale';
  } else if (categoryText.includes('persiana') || categoryText.includes('scuro') || categoryText.includes('antone') || categoryText.includes('tapparella')) {
    presetKey = 'oscurante';
  }

  const preset = CATALOGO_INFIX_DATA[presetKey];

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.innerText = "Elaborazione simulazione e consulenza in corso...";
  generateBtn.disabled = true;

  setTimeout(() => {
    // Assegnazione delle immagini pulite da showroom
    const beforeImage = document.getElementById('beforeImage') || document.getElementById('img-prima');
    const afterImage = document.getElementById('afterImage') || document.getElementById('img-dopo');

    if (beforeImage) beforeImage.src = preset.prima;
    if (afterImage) {
      afterImage.src = preset.dopo;
      afterImage.style.filter = "none";
    }

    // Inserimento della consulenza di stile e analisi tecnica dettagliata dell'IA
    let boxNota = document.getElementById('box-nota-stile');
    if (!boxNota && afterImage) {
      boxNota = document.createElement('div');
      boxNota.id = 'box-nota-stile';
      afterImage.parentNode.appendChild(boxNota);
    }
    if (boxNota) {
      boxNota.innerHTML = `
        <div style="background: #f4f6f4; border-left: 4px solid #2e7d32; padding: 20px; margin-top: 20px; border-radius: 6px; text-align: left; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          <strong style="color: #2e7d32; display: block; font-size: 16px; margin-bottom: 8px;">💡 ${preset.titolo}</strong>
          <p style="margin: 0 0 10px 0; font-size: 13px; color: #666;"><strong>Finitura applicata:</strong> ${finishText}</p>
          <p style="margin: 0; font-style: italic; color: #333; font-size: 14px; line-height: 1.5;">"${preset.nota}"</p>
        </div>
      `;
    }

    // Gestione crediti
    if (user.role !== "PRO") {
      user.credits--;
    }
    updateCreditsUI();

    const resultArea = document.getElementById('resultArea');
    if (resultArea) {
      resultArea.style.display = 'block';
      resultArea.scrollIntoView({ behavior: 'smooth' });
    }

    generateBtn.innerText = "Genera Simulazione Visual INFIX®";
    generateBtn.disabled = false;
  }, 1000);
});

checkUserAccess();
