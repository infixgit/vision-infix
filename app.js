// Database dipreset visivi professionali per ogni categoria del catalogo Visual INFIX®
const CATALOGO_PRESET_VISIVI = {
  "serramento": {
    prima: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    nota: "La configurazione del serramento in finitura scelta illumina gli spazi interni, migliora drasticamente il comfort visivo e dona un'eleganza pulita e moderna alla facciata."
  },
  "porta interna": {
    prima: "https://images.unsplash.com/photo-1541123437800-1bb1317badc2?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80",
    nota: "La scelta della porta si integra perfettamente con i volumi interni, esaltando la continuità dello spazio e la percezione di design ricercato."
  },
  "portoncino": {
    prima: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
    nota: "Il nuovo ingresso unisce massima sicurezza e un biglietto da visita estetico di assoluto prestigio per l'immobile."
  },
  "sezionale": {
    prima: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80",
    nota: "La scelta del portone dona un colpo d'occhio eccezionale: riflette la luce naturale, esalta la percezione di grandezza e ordine del garage e conferisce un aspetto immediatamente contemporaneo."
  },
  "oscurante": {
    prima: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=800&q=80",
    nota: "L'installazione degli oscuranti protegge con stile l'immobile, creando un perfetto equilibrio visivo e di design sulla facciata esterna."
  },
  "default": {
    prima: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
    dopo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    nota: "L'inserimento del prodotto selezionato valorizza l'immobile, ottimizzando l'estetica complessiva e conferendo un impatto visivo di altissimo pregio."
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

// Gestione invio modulo con preset visivi professionali garantiti
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
  const categoryText = categorySelect ? categorySelect.value.toLowerCase() : '';

  // Selezione della chiave di preset in base al catalogo scelto
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

  const preset = CATALOGO_PRESET_VISIVI[presetKey];

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.innerText = "Generazione render in corso...";
  generateBtn.disabled = true;

  setTimeout(() => {
    // Assegnazione delle immagini di altissima qualità da showroom
    const beforeImage = document.getElementById('beforeImage') || document.getElementById('img-prima');
    const afterImage = document.getElementById('afterImage') || document.getElementById('img-dopo');

    if (beforeImage) beforeImage.src = preset.prima;
    if (afterImage) {
      afterImage.src = preset.dopo;
      afterImage.style.filter = "none"; // Nessun filtro fittizio, immagine pulita da render
    }

    // Inserimento della nota di stile e design
    let boxNota = document.getElementById('box-nota-stile');
    if (!boxNota && afterImage) {
      boxNota = document.createElement('div');
      boxNota.id = 'box-nota-stile';
      afterImage.parentNode.appendChild(boxNota);
    }
    if (boxNota) {
      boxNota.innerHTML = `
        <div style="background: #f4f6f4; border-left: 4px solid #2e7d32; padding: 15px; margin-top: 15px; border-radius: 4px; text-align: left;">
          <strong style="color: #2e7d32; display: block; margin-bottom: 5px;">Consulenza di Stile Visual INFIX®:</strong>
          <p style="margin: 0; font-style: italic; color: #444; font-size: 14px;">"${preset.nota}"</p>
        </div>
      `;
    }

    // Gestione crediti e visualizzazione area risultati
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
