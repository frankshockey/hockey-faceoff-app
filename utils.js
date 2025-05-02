// utils.js (Version Corrigée - Inclut export CSV et createPlayerListItem)
'use strict';

// --- Constantes Globales ---
const DEFAULT_LOGO = 'spinozzi-logo.png'; // Centralisé

// --- Fonctions Utilitaires Core ---

function slugify(text) {
    if (!text) return '';
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-');
}

function getLogoDataUrl(fileInput, currentLogoUrl) {
    const effectiveCurrentLogoUrl = currentLogoUrl || DEFAULT_LOGO;
    return new Promise((resolve) => {
        if (fileInput?.files?.[0]) {
            const file = fileInput.files[0];
            if (!file.type.startsWith('image/')) {
                console.warn(`Fichier non-image: ${file.type}. Utilisation logo actuel/défaut.`);
                resolve(effectiveCurrentLogoUrl); return;
            }
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => { console.error("Erreur lecture logo."); resolve(DEFAULT_LOGO); };
            reader.readAsDataURL(file);
        } else { resolve(effectiveCurrentLogoUrl); }
    });
}

function showConfirmation(element, message, duration = 3000, isError = false) {
    if (!element) { console.warn("showConfirmation: Element non trouvé. Message:", message); return; }
    element.textContent = message;
    element.style.color = isError ? 'var(--color-danger)' : 'var(--color-success)';
    element.style.fontWeight = 'bold';
    element.setAttribute('role', 'alert');
    if (element.timerId) { clearTimeout(element.timerId); }
    element.timerId = setTimeout(() => {
        element.textContent = ''; element.style.color = ''; element.style.fontWeight = '';
        element.removeAttribute('role'); delete element.timerId;
    }, duration);
}

function getStoredTeamData(key) {
    try {
        const dataString = localStorage.getItem(key);
        if (!dataString) return null;
        return JSON.parse(dataString);
    } catch (e) { console.error(`Erreur parsing JSON clé ${key}:`, e); return null; }
}

function loadAndSetHeaderLogo(imgElementId) {
    const imgElement = document.getElementById(imgElementId);
    if (!imgElement) { console.error(`Élément logo header #${imgElementId} non trouvé.`); return; }
    let logoToUse = DEFAULT_LOGO; const masterKey = localStorage.getItem("masterTeamKey");
    if (masterKey) { const masterTeamData = getStoredTeamData(masterKey); if (masterTeamData?.logo && masterTeamData.logo !== DEFAULT_LOGO) { logoToUse = masterTeamData.logo; } }
    imgElement.src = logoToUse; imgElement.alt = (logoToUse === DEFAULT_LOGO) ? "Logo Application par Défaut" : "Logo Équipe Master";
}

function createPlayerListItem(player, index, editCallback, removeCallback) {
    const li = document.createElement('li'); const infoSpan = document.createElement('span');
    infoSpan.textContent = `#${player.number ?? '?'} ${player.name ?? 'Inconnu'} (${player.position ?? '?'})`;
    const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions';
    const editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'btn btn--small'; editBtn.textContent = '✏️'; editBtn.setAttribute('aria-label', `Modifier ${player.name || 'joueur'}`); editBtn.dataset.index = index;
    if (typeof editCallback === 'function') { editBtn.addEventListener('click', () => editCallback(index)); }
    const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'btn btn--danger btn--small'; removeBtn.textContent = '❌'; removeBtn.setAttribute('aria-label', `Supprimer ${player.name || 'joueur'}`); removeBtn.dataset.index = index;
    if (typeof removeCallback === 'function') { removeBtn.addEventListener('click', () => removeCallback(index)); }
    actionsDiv.appendChild(editBtn); actionsDiv.appendChild(removeBtn);
    li.appendChild(infoSpan); li.appendChild(actionsDiv);
    return li;
}

// ======================================================
// ----- FONCTIONS AJOUTÉES POUR L'EXPORT CSV -----
// ======================================================
/**
 * Génère une chaîne de caractères au format CSV à partir des statistiques de joueurs.
 * @param {Object} playerStatsMap - L'objet contenant les stats agrégées par playerId.
 * @param {Array} masterRoster - Le tableau complet des joueurs de l'équipe Master.
 * @returns {string} La chaîne de caractères formatée en CSV.
 */
function generatePlayerStatsCsv(playerStatsMap, masterRoster = []) {
    console.log("Génération contenu CSV pour stats joueurs...");
    const csvHeader = ["Numero", "Nom", "Position", "MJ Jouées (FOT)", "MJ Gagnées (FOW)", "MJ Perdues (FOL)", "Taux Victoire (%)"];
    const csvRows = [csvHeader.join(',')];
    const playerStatsArray = Object.values(playerStatsMap).sort((a, b) => parseInt(a.number || 0) - parseInt(b.number || 0));

    playerStatsArray.forEach(stats => {
        const playerInfo = masterRoster.find(p => p.number === stats.number);
        const name = playerInfo?.name || 'Inconnu'; const position = playerInfo?.position || '?';
        const fot = stats.totalPlayed ?? 0; const fow = stats.totalWins ?? 0; const fol = fot - fow;
        const winPct = (fot === 0) ? 0 : (fow / fot) * 100;
        const csvName = name.includes(',') ? `"${name}"` : name;
        const csvPosition = position.includes(',') ? `"${position}"` : position;
        let row = [stats.number, csvName, csvPosition, fot, fow, fol, winPct.toFixed(1)];
        csvRows.push(row.join(','));
    });
    console.log(`CSV généré avec ${csvRows.length - 1} lignes de données.`);
    return csvRows.join('\r\n');
}

/**
 * Déclenche le téléchargement d'un fichier texte (comme CSV) dans le navigateur.
 * @param {string} content - Le contenu texte du fichier.
 * @param {string} filename - Le nom de fichier souhaité pour le téléchargement.
 * @param {string} [mimeType='text/csv;charset=utf-8;'] - Le type MIME du fichier.
 */
function downloadFile(content, filename, mimeType = 'text/csv;charset=utf-8;') {
    console.log(`Tentative de téléchargement: ${filename}`);
    const blob = new Blob([content], { type: mimeType });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", filename);
        link.style.visibility = 'hidden'; document.body.appendChild(link); link.click();
        document.body.removeChild(link); URL.revokeObjectURL(url); console.log("DL lancé via createObjectURL.");
    } else if (navigator.msSaveBlob) { navigator.msSaveBlob(blob, filename); console.log("DL lancé via msSaveBlob.");
    } else { console.error("DL auto non supporté."); if(typeof showConfirmation === 'function') { const el = document.querySelector('.confirmation-message') || document.body; showConfirmation(el, "Erreur: DL auto non supporté.", 8000, true); } else { alert("Erreur: DL auto non supporté."); } }
}
// ======================================================
// ----- FIN DES FONCTIONS AJOUTÉES POUR L'EXPORT CSV -----
// ======================================================


// --- Définitions Spécifiques Application ---
// Mettez ici vos définitions exactes si elles ont changé
const faceoffPointsDefs = [
    { id: 'home-end-left', name: 'Zone Domicile Gauche', x: 21.5, y: 18.3 }, // DZ
    { id: 'home-end-right', name: 'Zone Domicile Droite', x: 77.7, y: 18.3 }, // DZ
    { id: 'home-neu-left', name: 'Neutre Gauche (Dom)', x: 21.5, y: 35.4 }, // NZ
    { id: 'home-neu-right', name: 'Neutre Droite (Dom)', x: 77.7, y: 35.4 }, // NZ
    { id: 'center', name: 'Centre', x: 50, y: 50.1 }, // NZ
    { id: 'away-neu-left', name: 'Neutre Gauche (Adv)', x: 21.5, y: 64.7 }, // NZ
    { id: 'away-neu-right', name: 'Neutre Droite (Adv)', x: 77.7, y: 64.7 }, // NZ
    { id: 'away-end-left', name: 'Zone Adverse Gauche', x: 21.5, y: 81.9 }, // OZ
    { id: 'away-end-right', name: 'Zone Adverse Droite', x: 77.7, y: 81.8 }  // OZ
];
const zoneMapping = {
    'home-end-left': 'DZ', 'home-end-right': 'DZ',
    'home-neu-left': 'NZ', 'home-neu-right': 'NZ', 'center': 'NZ',
    'away-neu-left': 'NZ', 'away-neu-right': 'NZ',
    'away-end-left': 'OZ', 'away-end-right': 'OZ'
};

// --- Log de Fin (Commenté pour Production) ---
// console.log("utils.js (avec fonctions export et createPlayerListItem) chargé.");