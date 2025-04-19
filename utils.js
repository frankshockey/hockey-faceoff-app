// utils.js - Fonctions Utilitaires Communes (Révisé + createPlayerListItem)
'use strict';

// --- Constantes Globales ---
const DEFAULT_LOGO = 'spinozzi-logo.png'; // Centralisé

// --- Fonctions Utilitaires Core ---

/**
 * Generates a URL-friendly slug from a string.
 * @param {string} text - The text to slugify.
 * @returns {string} The slugified text.
 */
function slugify(text) {
    if (!text) return '';
    // Implementation simple et efficace actuelle
    return text.toString().toLowerCase().trim().replace(/\s+/g, '-');
    // Optionnel (plus complexe) : Gérer accents et autres caractères
    // return text.toString().toLowerCase().trim()
    //   .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Enlève accents
    //   .replace(/\s+/g, '-') // Remplace espaces
    //   .replace(/[^a-z0-9-]/g, '') // Enlève caractères non valides
    //   .replace(/-+/g, '-'); // Évite tirets multiples
}

/**
 * Reads an image file input and returns a Promise resolving with Data URL or default logo.
 * Includes basic image type validation.
 * @param {HTMLInputElement} fileInput - The file input element.
 * @param {string} [currentLogoUrl] - The URL of the currently displayed logo.
 * @returns {Promise<string>} Promise resolving with logo Data URL or default path.
 */
function getLogoDataUrl(fileInput, currentLogoUrl) {
    // Utilise la constante globale DEFAULT_LOGO définie en haut du fichier
    const effectiveCurrentLogoUrl = currentLogoUrl || DEFAULT_LOGO;

    return new Promise((resolve) => {
        if (fileInput && fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];

            // Validation simple du type MIME
            if (!file.type.startsWith('image/')) {
                console.warn(`Le fichier sélectionné n'est pas une image: ${file.type}. Utilisation du logo par défaut/actuel.`);
                resolve(effectiveCurrentLogoUrl); // Retourne le logo actuel ou défaut si pas une image
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => {
                console.error("Erreur lors de la lecture du fichier logo.");
                resolve(DEFAULT_LOGO); // Utilise la constante globale
            };
            reader.readAsDataURL(file);
        } else {
            resolve(effectiveCurrentLogoUrl); // Retourne logo actuel ou défaut si pas de nouveau fichier
        }
    });
}

/**
 * Displays a temporary confirmation message in an element.
 * Logs a warning if the element is not found.
 * Optionally adds ARIA role="alert" for accessibility.
 * @param {HTMLElement} element - The element to display the message in.
 * @param {string} message - The message text.
 * @param {number} [duration=3000] - Duration in milliseconds.
 * @param {boolean} [isError=false] - Optional: styles the message as an error.
 */
function showConfirmation(element, message, duration = 3000, isError = false) {
    if (!element) {
        // Retire alert(), juste un warning console est moins intrusif
        console.warn("showConfirmation: Element non trouvé. Message:", message);
        return;
    }

    element.textContent = message;
    element.style.color = isError ? 'var(--color-danger)' : 'var(--color-success)';
    element.style.fontWeight = 'bold';
    // Optionnel : Ajout pour accessibilité
    element.setAttribute('role', 'alert');

    // Clear previous timer if exists
    if (element.timerId) {
        clearTimeout(element.timerId);
    }

    element.timerId = setTimeout(() => {
        element.textContent = '';
        element.style.color = '';
        element.style.fontWeight = '';
        // Optionnel : Retrait pour accessibilité
        element.removeAttribute('role');
        delete element.timerId; // Clean up property
    }, duration);
}

/**
 * Retrieves and parses JSON data from localStorage for a given key.
 * @param {string} key - The localStorage key.
 * @returns {object|null} The parsed object or null if not found or error.
 */
function getStoredTeamData(key) {
    try {
        const dataString = localStorage.getItem(key);
        if (!dataString) {
            // console.warn(`Clé ${key} non trouvée ou vide dans localStorage.`); // Log moins verbeux
            return null;
        }
        return JSON.parse(dataString);
    } catch (e) {
        console.error(`Erreur lors du parsing JSON pour la clé ${key}:`, e);
        return null;
    }
}

/**
 * Loads the Master Team logo (if defined) and sets the src of the specified image element.
 * Falls back to default logo.
 * @param {string} imgElementId - The ID of the <img> element to update.
 */
function loadAndSetHeaderLogo(imgElementId) {
    // Utilise la constante globale DEFAULT_LOGO
    console.log(`Chargement logo master pour l'élément header: #${imgElementId}`);
    const imgElement = document.getElementById(imgElementId);
    if (!imgElement) {
        console.error(`Élément logo header #${imgElementId} non trouvé.`);
        return;
    }

    let logoToUse = DEFAULT_LOGO; // Commence avec le défaut
    const masterKey = localStorage.getItem("masterTeamKey");

    if (masterKey) {
        console.log(`Clé Master trouvée: ${masterKey}`);
        const masterTeamData = getStoredTeamData(masterKey); // Utilise getStoredTeamData d'ici

        // Vérifie si les données sont valides et si le logo est défini ET différent du défaut
        if (masterTeamData && masterTeamData.logo && masterTeamData.logo !== DEFAULT_LOGO) {
            console.log(`Utilisation du logo master: ${masterTeamData.logo.substring(0, 50)}...`); // Log tronqué pour DataURL
            logoToUse = masterTeamData.logo;
        } else if (masterTeamData) {
             console.log("Données Master trouvées, mais utilise le logo par défaut.");
        } else {
            console.warn(`Données Master non trouvées ou invalides pour la clé: ${masterKey}. Utilisation du logo par défaut.`);
            // Optionnel: localStorage.removeItem("masterTeamKey"); // Nettoyage si clé invalide?
        }
    } else {
        console.log("Aucune clé Master trouvée. Utilisation du logo par défaut.");
    }

    imgElement.src = logoToUse;
    // Met à jour l'attribut alt pour l'accessibilité et le contexte
    imgElement.alt = (logoToUse === DEFAULT_LOGO) ? "Logo Application par Défaut" : "Logo Équipe Master";
    console.log(`Logo header #${imgElementId} src mis à jour.`);
}

// ----- NOUVELLE FONCTION AJOUTÉE -----
/**
 * Crée et retourne un élément <li> représentant un joueur pour les listes.
 * Attache des écouteurs d'événements aux boutons Edit/Remove via des callbacks.
 * @param {object} player - L'objet joueur ({ name, number, position }).
 * @param {number} index - L'index du joueur dans le tableau (pour data-index).
 * @param {Function} editCallback - Fonction à appeler lors du clic sur 'Modifier'. Prend l'index en argument.
 * @param {Function} removeCallback - Fonction à appeler lors du clic sur 'Supprimer'. Prend l'index en argument.
 * @returns {HTMLLIElement} L'élément <li> configuré.
 */
function createPlayerListItem(player, index, editCallback, removeCallback) {
    const li = document.createElement('li');

    const infoSpan = document.createElement('span');
    // Utilise les template literals et l'opérateur nullish coalescing (??)
    infoSpan.textContent = `#${player.number ?? '?'} ${player.name ?? 'Inconnu'} (${player.position ?? '?'})`;

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions'; // Assurez-vous que ce style existe dans style.css

    // Bouton Modifier
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--small'; // Style bouton petit
    editBtn.textContent = '✏️';
    editBtn.setAttribute('aria-label', `Modifier ${player.name || 'joueur'}`);
    editBtn.dataset.index = index; // Stocke l'index
    // Attache le callback d'édition
    if (typeof editCallback === 'function') {
        editBtn.addEventListener('click', () => editCallback(index));
    }

    // Bouton Supprimer
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn btn--danger btn--small'; // Style bouton danger petit
    removeBtn.textContent = '❌';
    removeBtn.setAttribute('aria-label', `Supprimer ${player.name || 'joueur'}`);
    removeBtn.dataset.index = index; // Stocke l'index
    // Attache le callback de suppression
    if (typeof removeCallback === 'function') {
        removeBtn.addEventListener('click', () => removeCallback(index));
    }

    actionsDiv.appendChild(editBtn);
    actionsDiv.appendChild(removeBtn);

    li.appendChild(infoSpan);
    li.appendChild(actionsDiv);

    return li; // Retourne l'élément <li> complet
}
// ----- FIN NOUVELLE FONCTION -----


// --- Définitions Spécifiques Application ---

// Définition des 9 points de mise au jeu (inchangé)
const faceoffPointsDefs = [
    { id: 'home-end-left', name: 'Zone Domicile Gauche', x: 21.5, y: 19.3 }, // DZ
    { id: 'home-end-right', name: 'Zone Domicile Droite', x: 77.7, y: 19.3 }, // DZ
    { id: 'home-neu-left', name: 'Neutre Gauche (Dom)', x: 21.5, y: 36.4 }, // NZ
    { id: 'home-neu-right', name: 'Neutre Droite (Dom)', x: 77.7, y: 36.4 }, // NZ
    { id: 'center', name: 'Centre', x: 50, y: 51.1 }, // NZ
    { id: 'away-neu-left', name: 'Neutre Gauche (Adv)', x: 21.5, y: 65.7 }, // NZ
    { id: 'away-neu-right', name: 'Neutre Droite (Adv)', x: 77.7, y: 65.7 }, // NZ
    { id: 'away-end-left', name: 'Zone Adverse Gauche', x: 21.5, y: 82.9 }, // OZ
    { id: 'away-end-right', name: 'Zone Adverse Droite', x: 77.7, y: 82.8 }  // OZ
];

// Mapping des 9 points vers les 3 zones principales (pour l'équipe Master) (inchangé)
const zoneMapping = {
    'home-end-left': 'DZ', 'home-end-right': 'DZ',
    'home-neu-left': 'NZ', 'home-neu-right': 'NZ', 'center': 'NZ',
    'away-neu-left': 'NZ', 'away-neu-right': 'NZ',
    'away-end-left': 'OZ', 'away-end-right': 'OZ'
};

// --- Log de Fin (Commenté pour Production) ---
// console.log("utils.js (révisé + createPlayerListItem) chargé.");