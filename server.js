<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vision INFIX® - Consulenza Avanzata & Dossier Tecnico Comparativo</title>
    
    <link rel="icon" href="bussola-infix-marchio-figurativo-momento di intervenire.jpg">
    <meta name="theme-color" content="#111111">

    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 20px auto; padding: 15px; background: #f4f4f9; color: #333; box-sizing: border-box; }
        .card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); display: flex; flex-direction: column; width: 100%; box-sizing: border-box; }
        
        .header { text-align: center; margin-bottom: 18px; border-bottom: 2px solid #e9ecef; padding-bottom: 15px; }
        .logo { max-width: 90px; height: auto; margin-bottom: 8px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
        .header h2 { margin: 3px 0; font-size: 1.5rem; color: #111; }
        .header p { color: #666; font-size: 0.85rem; margin: 3px 0 0 0; }

        .welcome-note { background: #e3f2fd; border: 1px solid #bbdefb; padding: 14px 16px; border-radius: 8px; margin-bottom: 15px; font-size: 13px; color: #0d47a1; text-align: left; box-sizing: border-box; width: 100%; line-height: 1.5; }

        #free-trial-box { background: #e8f5e9; border: 1px solid #c8e6c9; padding: 14px; border-radius: 8px; margin-top: 10px; font-size: 13px; color: #2e7d32; text-align: center; box-sizing: border-box; width: 100%; }
        #free-trial-box input[type="email"] { padding: 10px; border: 1px solid #a5d6a7; border-radius: 6px; width: 100%; font-size: 13px; margin-bottom: 8px; box-sizing: border-box; background: #fff; }
        #free-trial-box input[type="number"], #free-trial-box input[type="text"] { padding: 6px 8px; border: 1px solid #a5d6a7; border-radius: 6px; font-size: 12px; box-sizing: border-box; text-align: center; background: #fff; }
        
        .btn-green { background: #2e7d32; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px; font-size: 13px; width: 100%; transition: background 0.2s; }
        .btn-green:hover { background: #1b5e20; }

        #infix-user-status { background: #eef2f5; padding: 10px 15px; border-radius: 6px; margin-top: 10px; display: none; justify-content: space-between; align-items: center; font-size: 13px; font-weight: bold; color: #333; border: 1px solid #dcdfe6; box-sizing: border-box; width: 100%; }

        .pro-banner { background: #212529; color: white; padding: 10px 15px; border-radius: 6px; margin-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; box-sizing: border-box; width: 100%; }
        .pro-banner button { background: #ffc107; color: #000; border: none; padding: 5px 12px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 12px; }

        .pack-buttons-container { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin-top: 12px; width: 100%; box-sizing: border-box; }
        .pack-btn { background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 5px; font-size: 12px; font-weight: bold; cursor: pointer; }
        .pack-btn.pro-unlimited { background: #007bff; }

        .auth-links { margin-top: 12px; display: flex; justify-content: center; gap: 15px; font-size: 12px; }
        .auth-links a { color: #0056b3; text-decoration: underline; font-weight: bold; }

        .form-section { display: none; margin-top: 15px; flex-direction: column; gap: 15px; border-top: 2px solid #e9ecef; padding-top: 20px; box-sizing: border-box; width: 100%; }
        .form-group { display: flex; flex-direction: column; gap: 6px; text-align: left; }
        .form-group label { font-size: 13px; font-weight: 600; color: #2d3748; }
        .form-group select, .form-group input[type="file"], .form-group textarea, .form-group input[type="text"] { padding: 10px; border: 1px solid #cbd5e0; border-radius: 6px; font-size: 14px; background: #fff; color: #2d3748; box-sizing: border-box; width: 100%; font-family: inherit; }

        button.btn-primary { background: #111; color: white; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 15px; cursor: pointer; width: 100%; }
        button.btn-primary:hover { background: #333; }

        .stripe-packs-box { display: none; margin-top: 20px; background: #fff8e1; border: 1px solid #ffe0b2; padding: 15px; border-radius: 8px; text-align: center; box-sizing: border-box; width: 100%; }
        .stripe-packs-box h4 { margin: 0 0 6px 0; color: #f57f17; font-size: 14px; }

        .result-box { margin-top: 20px; display: none; background: #fff; border: 1px solid #cbd5e0; padding: 20px; border-radius: 8px; text-align: left; box-sizing: border-box; width: 100%; }
        
        /* GRIGLIA AFFIANCATA PRIMA VS DOPO */
        .diagnostic-grid { display: flex; gap: 15px; margin-top: 15px; flex-wrap: wrap; justify-content: center; }
        .diagnostic-photo { flex: 1; min-width: 280px; text-align: center; background: #f8f9fa; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef; box-sizing: border-box; }
        .diagnostic-photo img { width: 100%; height: 210px; object-fit: contain; background: #fff; border-radius: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        
        /* MOCKUP TECNICO DEL DOPO EVOLUTO */
        .mockup-after-box { width: 100%; height: 210px; background: #111; color: #fff; border-radius: 5px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 15px; box-sizing: border-box; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,0.2); text-align: center; overflow: hidden; }
        .mockup-badge { background: #28a745; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .mockup-color-panel { width: 85%; height: 60px; border-radius: 6px; border: 2px solid rgba(255,255,255,0.3); margin: 6px 0; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 2px 5px rgba(0,0,0,0.4); transition: background 0.3s ease; }
    </style>
</head>
<body>

    <div class="card">
        <div class="header">
            <img src="bussola-infix-marchio-figurativo-momento di intervenire.jpg" alt="Logo INFIX" class="logo">
            <h2>Vision INFIX®</h2>
            <p>Configuratore Avanzato & Dossier Tecnico Prima vs Dopo</p>
            
            <div class="welcome-note">
                👋 <strong>Benvenuto in Vision INFIX®!</strong><br>
                Carica la foto del cantiere, seleziona i dettagli mirati e genera il dossier professionale con analisi comparativa.
            </div>

            <div id="free-trial-box">
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px; color: #1b5e20;">🎁 PROVA GRATUITA 2 CONSULENZE PROFESSIONALI</div>
                
                <div id="step-email-container" style="display: flex; flex-direction: column; gap: 8px; align-items: center; width: 100%;">
                    <input type="email" id="trial-email-input" placeholder="Inserisci la tua email...">
                    
                    <div style="font-size: 12px; color: #333; display: flex; align-items: center; gap: 6px;">
                        <span>Antispam: quanto fa 3 + 4?</span>
                        <input type="number" id="captcha-input" placeholder="?">
                    </div>
                    
                    <div style="font-size: 12px; color: #444; display: flex; align-items: center; gap: 6px; text-align: left; width: 100%;">
                        <input type="checkbox" id="privacy-checkbox" style="cursor: pointer; width: 14px; height: 14px;">
                        <label for="privacy-checkbox" style="cursor: pointer; margin: 0;">Accetto l'informativa sulla privacy.</label>
                    </div>
                    
                    <button id="send-otp-btn" class="btn-green" onclick="richiediCodiceOtp()">Invia Codice OTP ✉️</button>
                </div>

                <div id="step-otp-container" style="display: none; flex-direction: column; gap: 8px; align-items: center; margin-top: 6px; width: 100%;">
                    <p style="font-size: 12px; color: #1b5e20; margin: 0;">Codice OTP inviato a <strong id="sent-email-label"></strong></p>
                    <input type="text" id="otp-input" placeholder="Codice a 6 cifre..." style="letter-spacing: 2px; font-weight: bold; width: 100%; max-width: 200px; padding: 8px;">
                    <button onclick="verificaCodiceOtpEAccedi()" class="btn-green">Verifica e Accedi 🚀</button>
                </div>
                <div id="trial-error-msg" style="color: #d9534f; font-size: 12px; margin-top: 6px; display: none; font-weight: bold;"></div>
            </div>

            <div class="pro-banner">
                <span>🔒 Vision PRO & Analisi Illimitate</span>
                <button onclick="scrollToPacks()">Scopri i Piani PRO</button>
            </div>

            <div class="pack-buttons-container" id="packs-container">
                <button class="pack-btn" onclick="avviaCheckout('pack_1')">Pack 1 (60€)</button>
                <button class="pack-btn" onclick="avviaCheckout('pack_2')">Pack 2 (110€)</button>
                <button class="pack-btn" onclick="avviaCheckout('pack_3')">Pack 3 (150€)</button>
                <button class="pack-btn pro-unlimited" onclick="avviaCheckout('pro_unlimited')">PRO Unlimited (49€/mese)</button>
            </div>

            <div class="auth-links">
                <a href="#" onclick="mostraLoginModal(event)">Hai già un account? Accedi qui</a>
                <a href="#" onclick="mostraResetPasswordModal(event)" style="color: #d9534f;">Password dimenticata?</a>
            </div>

            <div id="infix-user-status">
                <span>Utente: <span id="user-email-display" style="color: #0056b3;">-</span></span>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <span style="background: #fff; padding: 4px 10px; border-radius: 5px; border: 1px solid #cbd5e0; font-size: 12px;">
                        Crediti: <span id="credits-counter-display" style="color: #28a745; font-weight: bold;">--</span>
                    </span>
                    <button onclick="eseguiLogout()" style="background: #e53e3e; color: #fff; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 11px; font-weight: bold;">Esci 🚪</button>
                </div>
            </div>
        </div>

        <form id="visualForm" class="form-section">
            <div class="form-group">
                <label for="photoInput">📷 1. Carica la foto dello stato attuale del cantiere</label>
                <input type="file" id="photoInput" accept="image/*" required>
            </div>

            <div class="form-group">
                <label for="macroCategorySelect">🗂️ 2. Seleziona la Macro-Categoria</label>
                <select id="macroCategorySelect" onchange="gestisciCascataMenu()" required>
                    <option value="">-- Seleziona la Macro-Categoria --</option>
                    <option value="serramenti">Serramenti & Vetrate</option>
                    <option value="porte_interne">Porte Interne & Divisori</option>
                    <option value="portoncini">Portoncini & Ingressi</option>
                    <option value="garage">Chiusure Garage & Grandi Aperture</option>
                    <option value="oscuranti">Oscuranti & Schermature</option>
                    <option value="protezioni">Protezioni & Accessori</option>
                    <option value="ristrutturazione_completa">Riqualificazione Energetica Completa</option>
                    <option value="altro_macro">Altro / Progetto Personalizzato</option>
                </select>
            </div>

            <div class="form-group">
                <label for="productSelect">🔍 3. Seleziona il Modello Scelto</label>
                <select id="productSelect" disabled required>
                    <option value="">-- Prima seleziona la macro-categoria sopra --</option>
                </select>
            </div>

            <div class="form-group">
                <label for="materialSelect" id="materialLabel">🧱 4. Seleziona il Materiale Strutturale</label>
                <select id="materialSelect" disabled required>
                    <option value="">-- Prima seleziona la macro-categoria sopra --</option>
                </select>
            </div>

            <div class="form-group">
                <label for="glassSelect" id="glassLabel">🪟 5. Tipologia Vetro o Inserto Pannello</label>
                <select id="glassSelect" disabled required>
                    <option value="">-- Prima seleziona la macro-categoria sopra --</option>
                </select>
            </div>

            <div class="form-group">
                <label for="finishSelect">🎨 6. Scegli Finitura / Colore del "Dopo"</label>
                <select id="finishSelect" onchange="verificaAltraFinitura()" required>
                    <optgroup label="Standard & Tinte RAL">
                        <option value="Bianco Puro RAL 9010">Bianco Puro RAL 9010</option>
                        <option value="Grigio Antracite RAL 7016">Grigio Antracite RAL 7016</option>
                        <option value="Grigio Sedum RAL 7007">Grigio Sedum RAL 7007</option>
                        <option value="Verde Persiana RAL 6005">Verde Persiana RAL 6005</option>
                        <option value="Verde Nerastro RAL 6012">Verde Nerastro RAL 6012</option>
                        <option value="Marrone Testa di Moro RAL 8017">Marrone Testa di Moro RAL 8017</option>
                        <option value="Nero Opaco Moderno RAL 9005">Nero Opaco Moderno RAL 9005</option>
                    </optgroup>
                    <option value="altro_finitura">➕ Altro colore / Finitura personalizzata...</option>
                </select>
            </div>

            <div class="form-group" id="customFinishContainer" style="display: none;">
                <label for="customFinishInput">✏️ Specifica Colore / Finitura</label>
                <input type="text" id="customFinishInput" placeholder="Es. RAL 7007, RAL 9001...">
            </div>

            <div class="form-group" style="background: #fff8e1; border: 1px solid #ffe0b2; padding: 12px; border-radius: 6px;">
                <label for="openQuestionInput" style="color: #f57f17; font-weight: bold;">💬 Domanda aperta o richiesta specifica per l'IA (opzionale)</label>
                <textarea id="openQuestionInput" rows="3" placeholder="Es. Posso montare questa porta nella vasca idromassaggio?..."></textarea>
            </div>

            <div style="background: #e3f2fd; border: 2px dashed #2196f3; padding: 15px; border-radius: 8px; text-align: center; margin-top: 10px;">
                <button type="submit" class="btn-primary" id="generateBtn" style="background: #1976d2;">Genera Dossier Ufficiale 📋✨</button>
            </div>
        </form>

        <div id="stripePaywall" class="stripe-packs-box">
            <h4>⚠️ Crediti Esauriti! Sblocca un pacchetto per continuare</h4>
        </div>

        <div id="resultArea" class="result-box">
            <h3 style="margin-top:0; color:#111; font-size: 1.3rem; text-align: center;">Dossier Tecnico Ufficiale Vision INFIX®</h3>
            <p id="resultSubtitle" style="font-size: 12px; color: #666; font-weight: bold; text-align: center;"></p>
            
            <div class="diagnostic-grid">
                <div class="diagnostic-photo">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #111;">Stato Attuale (Il Prima)</h4>
                    <img id="beforeImage" alt="Foto Originale Cantiere">
                </div>

                <div class="diagnostic-photo">
                    <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #111;">Soluzione Installata (Il Dopo - Simulato)</h4>
                    <div class="mockup-after-box">
                        <div class="mockup-badge">Vision INFIX® Verified</div>
                        <div id="mockupColorPanel" class="mockup-color-panel">
                            <span id="mockupPanelText" style="font-size: 11px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.8); color: #fff;">Tinta Applicata</span>
                        </div>
                        <div id="mockupProductText" style="font-size: 11px; font-weight: bold; margin-top: 2px;">Configurazione</div>
                        <div id="mockupFinishText" style="font-size: 10px; color: #aaa; margin-top: 1px;">Finitura</div>
                    </div>
                </div>
            </div>

            <div id="technicalDossierBox" style="margin-top: 15px; background: #f0f4f8; border-left: 4px solid #0056b3; padding: 15px; border-radius: 6px;">
                <h4 style="margin: 0 0 8px 0; color: #0056b3; font-size: 14px;">📊 Analisi Comparativa & Argomenti di Vendita</h4>
                <p id="technicalDossierText" style="font-size: 13px; color: #111318; font-weight: 500; margin: 0; line-height: 1.5; white-space: pre-line;"></p>
            </div>

            <div id="actionButtonsContainer" style="margin-top: 20px; border-top: 1px solid #e9ecef; padding-top: 15px; display: flex; gap: 10px; flex-wrap: wrap;">
                <button onclick="scaricaDossierPdf()" style="background: #28a745; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1;">📥 Scarica Dossier in PDF Ufficiale</button>
                <button onclick="resettaNuovaSimulazione()" style="background: #6c757d; color: white; border: none; padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; flex: 1;">🔄 Nuova Consulenza</button>
            </div>
        </div>
    </div>

    <!-- MODALI -->
    <div id="login-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000;">
        <div style="background: #fff; padding: 25px; border-radius: 10px; width: 320px;">
            <h3>Accedi a Vision INFIX®</h3>
            <input type="email" id="login-email" placeholder="Email" style="width:100%; padding:8px; margin:5px 0 10px 0;" />
            <input type="password" id="login-password" placeholder="Password" style="width:100%; padding:8px; margin:5px 0 15px 0;" />
            <button onclick="eseguiLoginPassword()" style="background:#111; color:#fff; padding:10px; border:none; width:100%; font-weight:bold;">Accedi</button>
            <button onclick="chiudiLoginModal()" style="background:#ccc; padding:8px; border:none; width:100%; margin-top:5px;">Annulla</button>
            <p id="login-msg" style="font-size:12px; color:red; margin-top:5px;"></p>
        </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

    <script>
        const RENDER_BACKEND_URL = 'https://vision-infix.onrender.com';
        let currentOtpEmail = '';

        const configuratoreDinamico = {
            serramenti: {
                prodotti: [{ val: "finestra_battente_2", text: "Finestra / Portafinestra a 2 Ante a Battente" }],
                materialiLabel: "🧱 Materiale Profilo", materiali: ["PVC ad alto isolamento", "Alluminio a Taglio Termico"],
                vetriLabel: "🪟 Tipologia Vetro", vetri: ["Doppio Vetro Basso Emissivo", "Triplo Vetro Acustico"]
            },
            porte_interne: {
                prodotti: [{ val: "porta_battente_cieca", text: "Porta Interna a Battente Cieca / Laminata" }],
                materialiLabel: "🧱 Materiale Anta", materiali: ["Legno Listellare", "Laccato Antigraffio"],
                vetriLabel: "🪟 Finitura Pannello", vetri: ["Pannello Cieco Liscio", "Vetro Satinato"]
            },
            portoncini: {
                prodotti: [{ val: "portoncino_pvc", text: "Portoncino in PVC" }],
                materialiLabel: "🧱 Materiale Struttura", materiali: ["PVC rinforzato"],
                vetriLabel: "🚪 Inserto", vetri: ["Pannello Coibentato"]
            },
            garage: { prodotti: [{ val: "sezionale", text: "Portone Sezionale" }], materialiLabel: "🧱 Materiale", materiali: ["Acciaio coibentato"], vetriLabel: "🪟 Oblò", vetri: ["Senza Oblò"] },
            oscuranti: { prodotti: [{ val: "persiana", text: "Persiana in Alluminio" }], materialiLabel: "🧱 Materiale", materiali: ["Alluminio verniciato"], vetriLabel: "⚙️ Posa", vetri: ["Con telaio"] },
            protezioni: { prodotti: [{ val: "grata", text: "Grata di Sicurezza" }], materialiLabel: "🧱 Materiale", materiali: ["Acciaio Inox"], vetriLabel: "🎨 Design", vetri: ["Moderno"] },
            ristrutturazione_completa: { prodotti: [{ val: "pacchetto", text: "Riqualificazione Completa" }], materialiLabel: "🧱 Sistema", materiali: ["PVC + Cassonetto"], vetriLabel: "🪟 Vetro", vetri: ["Triplo Vetro"] },
            altro_macro: { prodotti: [{ val: "custom", text: "Altro Prodotto" }], materialiLabel: "🧱 Materiale", materiali: ["Personalizzato"], vetriLabel: "🪟 Specifica", vetri: ["Personalizzato"] }
        };

        function gestisciCascataMenu() {
            const macro = document.getElementById('macroCategorySelect').value;
            const pSel = document.getElementById('productSelect');
            const mSel = document.getElementById('materialSelect');
            const gSel = document.getElementById('glassSelect');
            pSel.innerHTML = ''; mSel.innerHTML = ''; gSel.innerHTML = '';

            if (!configuratoreDinamico[macro]) { pSel.disabled = true; mSel.disabled = true; gSel.disabled = true; return; }
            
            configuratoreDinamico[macro].prodotti.forEach(i => pSel.add(new Option(i.text, i.val)));
            configuratoreDinamico[macro].materiali.forEach(m => mSel.add(new Option(m, m)));
            configuratoreDinamico[macro].vetri.forEach(v => gSel.add(new Option(v, v)));
            pSel.disabled = false; mSel.disabled = false; gSel.disabled = false;
        }

        function verificaAltraFinitura() {
            document.getElementById('customFinishContainer').style.display = (document.getElementById('finishSelect').value === 'altro_finitura') ? 'flex' : 'none';
        }

        window.addEventListener('DOMContentLoaded', () => {
            if (localStorage.getItem('infix_visual_user_email')) {
                attivaSessioneUtente(localStorage.getItem('infix_visual_user_email'), localStorage.getItem('infix_visual_credits'));
            }
        });

        function attivaSessioneUtente(email, credits) {
            document.getElementById('free-trial-box').style.display = 'none';
            document.getElementById('infix-user-status').style.display = 'flex';
            document.getElementById('user-email-display').innerText = email;
            document.getElementById('visualForm').style.display = 'flex';
            let c = (email.toLowerCase() === 'infix@outlook.it') ? 'PRO Illimitato' : (credits || '2');
            document.getElementById('credits-counter-display').innerText = c;
            localStorage.setItem('infix_visual_user_email', email);
            localStorage.setItem('infix_visual_credits', c);
        }

        async function richiediCodiceOtp() {
            const email = document.getElementById('trial-email-input').value.trim().toLowerCase();
            if (!email || parseInt(document.getElementById('captcha-input').value) !== 7 || !document.getElementById('privacy-checkbox').checked) {
                alert("Verifica email, antispam (3+4=7) e privacy."); return;
            }
            let res = await fetch(`${RENDER_BACKEND_URL}/api/send-otp`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email}) });
            if (res.ok) { currentOtpEmail = email; document.getElementById('sent-email-label').innerText = email; document.getElementById('step-email-container').style.display = 'none'; document.getElementById('step-otp-container').style.display = 'flex'; }
        }

        async function verificaCodiceOtpEAccedi() {
            let otp = document.getElementById('otp-input').value.trim();
            let res = await fetch(`${RENDER_BACKEND_URL}/api/verify-otp`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email: currentOtpEmail, otp}) });
            if (res.ok) attivaSessioneUtente(currentOtpEmail, '2'); else alert("OTP errato.");
        }

        function mostraLoginModal(e) { e.preventDefault(); document.getElementById('login-modal').style.display = 'flex'; }
        function chiudiLoginModal() { document.getElementById('login-modal').style.display = 'none'; }
        function scrollToPacks() { window.scrollTo({ top: document.getElementById('stripePaywall').offsetTop, behavior: 'smooth' }); }
        function eseguiLoginPassword() {
            let email = document.getElementById('login-email').value.trim().toLowerCase();
            if (email === 'santino.simoncello@libero.it' || email === 'infix@outlook.it') { chiudiLoginModal(); attivaSessioneUtente(email, '50'); } else { document.getElementById('login-msg').innerText = "Non autorizzato."; }
        }

        document.getElementById('visualForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const file = document.getElementById('photoInput').files[0];
            if (!file) return;

            let macroText = document.getElementById('macroCategorySelect').selectedOptions[0].text;
            let productText = document.getElementById('productSelect').selectedOptions[0].text;
            let finishSelectEl = document.getElementById('finishSelect');
            let finishText = finishSelectEl.value === 'altro_finitura' ? (document.getElementById('customFinishInput').value.trim() || "Personalizzata") : finishSelectEl.value;

            let reader = new FileReader();
            reader.onload = async function(e) {
                let base64Full = e.target.result;
                document.getElementById('beforeImage').src = base64Full;
                document.getElementById('mockupProductText').innerText = productText;
                document.getElementById('mockupFinishText').innerText = `Finitura: ${finishText}`;
                document.getElementById('mockupPanelText').innerText = finishText;

                // MAPPATURA UNIVERSALE INTELLIGENTE COLORI (RAL & TINTE)
                const panel = document.getElementById('mockupColorPanel');
                const fLower = finishText.toLowerCase();

                if (fLower.includes('7007') || fLower.includes('sedum') || fLower.includes('grigio') || fLower.includes('7016')) {
                    panel.style.background = '#6c757d'; // Grigio tecnico
                } else if (fLower.includes('6003') || fLower.includes('6005') || fLower.includes('6012') || fLower.includes('verde')) {
                    panel.style.background = '#2c5e3b'; // Verde scuro / fronda
                } else if (fLower.includes('nero') || fLower.includes('9005')) {
                    panel.style.background = '#1a1a1a'; // Nero
                } else if (fLower.includes('bianco') || fLower.includes('9010') || fLower.includes('1013') || fLower.includes('crema')) {
                    panel.style.background = '#e2e8f0'; panel.style.color = '#111';
                } else if (fLower.includes('marrone') || fLower.includes('noce') || fLower.includes('rovere') || fLower.includes('8017')) {
                    panel.style.background = '#5c4033'; // Marrone legno
                } else {
                    panel.style.background = '#2c5e3b'; // Default elegante
                }

                let response = await fetch(`${RENDER_BACKEND_URL}/api/visual-generate`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        category: `${macroText} -> ${productText}`, finish: finishText,
                        material: document.getElementById('materialSelect').value,
                        glass: document.getElementById('glassSelect').value,
                        openQuestion: document.getElementById('openQuestionInput').value.trim(),
                        imageBase64: base64Full.split(',')[1],
                        mimeType: file.type || 'image/jpeg'
                    })
                });
                let data = await response.json();
                if (response.ok && data.success) {
                    document.getElementById('resultSubtitle').innerText = `Configurazione: ${macroText} | Finitura: ${finishText}`;
                    document.getElementById('technicalDossierText').innerText = data.dossier;
                    document.getElementById('resultArea').style.display = 'block';
                    document.getElementById('resultArea').scrollIntoView
