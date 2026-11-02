// Configurazione Profili e Crediti (Stile Bussola)
const USERS_DB = {
  "infix@outlook.it": { role: "PRO", credits: 999999 },
  "santino.simoncello@libero.it": { role: "STANDARD", credits: 50 }
};

// URL del tuo backend su Render (sostituisci con il tuo link esatto di Render se diverso)
const BACKEND_URL = "https://visual-infix.onrender.com";

// Controlla se c'è un'email salvata o se dobbiamo richiederla
let currentUserEmail = localStorage.getItem('visual_infix_user') || '';

function checkUserAccess() {
  if (!currentUserEmail || !USERS_DB[currentUserEmail]) {
    let email = prompt("Inserisci la tua email autorizzata per Visual INFIX® (es. santino.simoncello@libero.it o infix@outlook.it):");
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

// Aggiorna l'Interfaccia Utente in base al profilo loggato
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

// Gestione invio modulo ed elaborazione reale con il Backend su Render
document.getElementById('visualForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const user = USERS_DB[currentUserEmail];
  if (user.role !== "PRO" && user.credits <= 0) {
    alert("Hai esaurito i crediti disponibili.");
    document.getElementById('generateBtn').style.display = 'none';
    document.getElementById('stripePaywall').style.display = 'block';
    return;
  }

  const fileInput = document.getElementById('photoInput');
  const file = fileInput.files[0];

  if (!file) {
    alert("Per favore, seleziona o scatta prima una foto!");
    return;
  }

  // Recupera categoria e finitura dai menu a tendina
  const categorySelect = document.querySelector('select[name="category"]') || document.getElementById('select-categoria') || document.querySelectorAll('select')[0];
  const finishSelect = document.querySelector('select[name="finish"]') || document.getElementById('select-finitura') || document.querySelectorAll('select')[1];
  
  const category = categorySelect ? categorySelect.value : 'Serramento / Finestra / Scorrevole';
  const finish = finishSelect ? finishSelect.value : 'Standard';

  const generateBtn = document.getElementById('generateBtn');
  generateBtn.innerText = "Elaborazione visiva e design in corso...";
  generateBtn.disabled = true;

  const reader = new FileReader();
  reader.onload = async function(event) {
    const base64Full = event.target.result;
    const mimeType = file.type || 'image/jpeg';
    const base64Data = base64Full.split(',')[1];

    // Mostra subito l'originale nel box "Prima"
    const beforeImage = document.getElementById('beforeImage') || document.getElementById('img-prima');
    if (beforeImage) beforeImage.src = base64Full;

    try {
      // Chiamata vera al server su Render che gestisce Cloudinary e la nota di stile
      const response = await fetch(`${BACKEND_URL}/api/visual-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: category,
          finish: finish,
          imageBase64: base64Data,
          mimeType: mimeType
        })
      });

      const data = await response.json();

      if (data.success) {
        const afterImage = document.getElementById('afterImage') || document.getElementById('img-dopo');
        if (afterImage) {
          afterImage.src = data.imageUrl; // Immagine sicura restituita da Cloudinary
          if (data.visualEffect) {
            afterImage.style.filter = data.visualEffect; // Applica il filtro visivo
          }
        }

        // Inserisce o aggiorna la nota di stile dinamica sotto il risultato
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
              <p style="margin: 0; font-style: italic; color: #444; font-size: 14px;">"${data.designNote}"</p>
            </div>
          `;
        }

        // Scala il credito se non è PRO
        if (user.role !== "PRO") {
          user.credits--;
        }
        updateCreditsUI();

        const resultArea = document.getElementById('resultArea');
        if (resultArea) {
          resultArea.style.display = 'block';
          resultArea.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        alert("Errore dal server: " + (data.error || "Impossibile completare la simulazione."));
      }
    } catch (err) {
      console.error("Errore di connessione:", err);
      alert("Errore di connessione con il server backend su Render.");
    } finally {
      generateBtn.innerText = "Genera Simulazione Visual INFIX®";
      generateBtn.disabled = false;
    }
  };

  reader.readAsDataURL(file);
});

// Reindirizzamento al pagamento Stripe
const STRIPE_CHECKOUT_URL = "https://buy.stripe.com/TUO_LINK_DI_PAGAMENTO_INFIX";
function redirectToStripe() {
  window.location.href = STRIPE_CHECKOUT_URL;
}

// Avvio controllo accessi
checkUserAccess();
