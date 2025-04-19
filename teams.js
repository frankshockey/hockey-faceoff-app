// teams.js - Version finale après refactoring utils.js et ajout indicateur visuel renforcé
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- State Variables ---
    let players = [];
    let currentTeamKey = null;
    const DEFAULT_LOGO = 'spinozzi-logo.png';
    let isTeamDirty = false; // Indicateur de changements non sauvegardés

    // --- DOM Element References ---
    const teamInfoForm = document.getElementById('team-info-form');
    const teamNameInput = document.getElementById('team-name');
    const teamLogoInput = document.getElementById('team-logo');
    const isMasterCheckbox = document.getElementById('is-master-team');
    const teamConfirmation = document.getElementById('team-confirmation');
    const currentTeamNameDisplay = document.getElementById('current-team-name');
    const currentTeamLogoDisplay = document.getElementById('current-team-logo');
    const teamSaveButton = teamInfoForm ? teamInfoForm.querySelector('button[type="submit"]') : null;

    const playerForm = document.getElementById('player-form');
    const playerNameInput = document.getElementById('player-name');
    const playerNumberInput = document.getElementById('player-number');
    const playerPositionSelect = document.getElementById('player-position');
    const playerSubmitBtn = document.getElementById('player-submit-btn');
    const editIndexInput = document.getElementById('edit-index');

    const playerListElement = document.getElementById('player-list');
    const sortListBtn = document.getElementById('sort-list-btn');
    const clearListBtn = document.getElementById('clear-list-btn');

    const importFileInput = document.getElementById('import-file');
    const importBtn = document.getElementById('import-btn');
    const importConfirmation = document.getElementById('import-confirmation');

    // --- Helper Functions ---
    // SUPPRIMÉ: slugify, getLogoDataUrl, showConfirmation (maintenant dans utils.js)

    // Fonction pour màj état bouton Enregistrer
    function updateSaveButtonState() {
        if (!teamSaveButton) return;
        const defaultBgColor = ''; // Couleur CSS par défaut
        const dirtyBgColor = '#ffdd57'; // Jaune
        const defaultTextColor = ''; // Couleur CSS par défaut
        const dirtyTextColor = '#333'; // Texte noir pour fond jaune

        if (isTeamDirty) {
            teamSaveButton.textContent = '💾 Enregistrer les modifications *';
            teamSaveButton.style.backgroundColor = dirtyBgColor;
            teamSaveButton.style.color = dirtyTextColor;
            teamSaveButton.title = "Des modifications sont en attente de sauvegarde.";
        } else {
            teamSaveButton.textContent = '💾 Enregistrer l\'équipe';
            teamSaveButton.style.backgroundColor = defaultBgColor;
            teamSaveButton.style.color = defaultTextColor;
            teamSaveButton.title = "";
        }
    }

    // Fonction pour marquer changements et màj bouton
    function markTeamAsDirty() {
        if (!isTeamDirty) {
            isTeamDirty = true;
            updateSaveButtonState();
            console.log("Team marked as dirty.");
        }
    }

    // --- Core Functions ---

    function renderPlayerList() { /* ... (identique aux versions précédentes) ... */ if (!playerListElement) return; playerListElement.innerHTML = ''; if (players.length === 0) { playerListElement.innerHTML = '<li style="text-align: center; color: #666;">Aucun joueur ajouté.</li>'; return; } players.forEach((player, index) => { const li = document.createElement('li'); const infoSpan = document.createElement('span'); infoSpan.textContent = `#${player.number || '?'} ${player.name || 'Inconnu'} (${player.position || '?'})`; const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions'; const editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'btn btn--small'; editBtn.textContent = '✏️'; editBtn.setAttribute('aria-label', `Modifier ${player.name || 'joueur'}`); editBtn.dataset.index = index; const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'btn btn--danger btn--small'; removeBtn.textContent = '❌'; removeBtn.setAttribute('aria-label', `Supprimer ${player.name || 'joueur'}`); removeBtn.dataset.index = index; actionsDiv.appendChild(editBtn); actionsDiv.appendChild(removeBtn); li.appendChild(infoSpan); li.appendChild(actionsDiv); playerListElement.appendChild(li); }); }
    function handleListClick(event) { /* ... (identique aux versions précédentes) ... */ const target = event.target.closest('button'); if (!target || !target.closest('.actions')) return; const index = parseInt(target.dataset.index, 10); if (isNaN(index)) return; if (target.textContent === '✏️') { editPlayer(index); } else if (target.textContent === '❌') { removePlayer(index); } }
    function editPlayer(index) { /* ... (identique aux versions précédentes) ... */ if (index < 0 || index >= players.length) return; const player = players[index]; playerNameInput.value = player.name || ''; playerNumberInput.value = player.number || ''; playerPositionSelect.value = player.position || ''; editIndexInput.value = index; playerSubmitBtn.textContent = '💾 Mettre à jour Joueur'; playerNameInput.focus(); }

    function removePlayer(index) { // Appelle markTeamAsDirty
        if (index < 0 || index >= players.length) return;
        const player = players[index];
        requestAnimationFrame(() => {
            if (confirm(`Voulez-vous vraiment supprimer le joueur #${player.number || '?'} ${player.name || 'Inconnu'} ?`)) {
                players.splice(index, 1);
                renderPlayerList();
                if (parseInt(editIndexInput.value) === index) { playerForm.reset(); editIndexInput.value = -1; playerSubmitBtn.textContent = '➕ Ajouter Joueur'; }
                markTeamAsDirty(); // Appel ICI
            }
        });
    }

    function handlePlayerSubmit(event) { // Appelle markTeamAsDirty
        event.preventDefault();
        const name = playerNameInput.value.trim(); const number = playerNumberInput.value.trim(); const position = playerPositionSelect.value; const indexToEdit = parseInt(editIndexInput.value, 10);
        if (!name || !number || !position) { alert('Veuillez remplir tous les champs du joueur.'); return; }
        const playerData = { name, number, position }; let playerChanged = false;
        if (indexToEdit > -1 && indexToEdit < players.length) { const oldData = players[indexToEdit]; if (oldData.name !== name || oldData.number !== number || oldData.position !== position) { players[indexToEdit] = playerData; playerChanged = true; } }
        else { players.push(playerData); playerChanged = true; }
        playerForm.reset(); editIndexInput.value = -1; playerSubmitBtn.textContent = '➕ Ajouter Joueur';
        renderPlayerList();
        if (playerChanged) { markTeamAsDirty(); } // Appel ICI si changement
    }

    function handleSortList() { // Appelle markTeamAsDirty
        const originalOrder = JSON.stringify(players.map(p => p.number));
        players.sort((a, b) => parseInt(a.number || 0) - parseInt(b.number || 0));
        const newOrder = JSON.stringify(players.map(p => p.number));
        renderPlayerList();
        if (originalOrder !== newOrder && players.length > 0) { markTeamAsDirty(); } // Appel ICI si changement
    }

    function handleClearList() { // Appelle markTeamAsDirty
        const hadPlayers = players.length > 0;
        requestAnimationFrame(() => {
            if (confirm("Voulez-vous vraiment effacer TOUS les joueurs de la liste actuelle ?")) {
                players = []; renderPlayerList(); playerForm.reset(); editIndexInput.value = -1; playerSubmitBtn.textContent = '➕ Ajouter Joueur';
                if (hadPlayers) { markTeamAsDirty(); } // Appel ICI si changement
            }
        });
    }

    async function previewLogo() { // Appelle markTeamAsDirty
        // Note: Utilise getLogoDataUrl de utils.js
        const existingLogo = currentTeamLogoDisplay ? currentTeamLogoDisplay.src : DEFAULT_LOGO;
        const logoUrl = await getLogoDataUrl(teamLogoInput, existingLogo); // Appel fonction utils.js
        const initialLogoSrc = currentTeamKey ? (JSON.parse(localStorage.getItem(currentTeamKey) || '{}').logo || DEFAULT_LOGO) : DEFAULT_LOGO;
        if (currentTeamLogoDisplay) currentTeamLogoDisplay.src = logoUrl;
        if (logoUrl !== initialLogoSrc) { markTeamAsDirty(); } // Appel ICI si changement
    }

    async function handleTeamSave(event) { // Réinitialise isTeamDirty, utilise slugify, showConfirmation, getLogoDataUrl
        event.preventDefault();
        const teamName = teamNameInput.value.trim(); if (!teamName) { alert("Veuillez entrer un nom pour l'équipe."); teamNameInput.focus(); return; }
        const isMaster = isMasterCheckbox.checked; const existingLogo = currentTeamLogoDisplay ? currentTeamLogoDisplay.src : DEFAULT_LOGO;
        let logoDataUrl;
        try { logoDataUrl = await getLogoDataUrl(teamLogoInput, existingLogo); } // Appel fonction utils.js
        catch (error) { console.error("Erreur lecture logo:", error); showConfirmation(teamConfirmation, "Erreur lecture fichier logo.", 5000, true); logoDataUrl = existingLogo; } // Appel fonction utils.js
        const teamData = { name: teamName, roster: players, logo: logoDataUrl };
        const key = "team_" + slugify(teamName); // Appel fonction utils.js
        let teamDataSaved = false; let masterKeySaved = false;
        try { // Sauvegarde équipe
            localStorage.setItem(key, JSON.stringify(teamData)); teamDataSaved = true; console.log(`Équipe enregistrée: ${key}`);
            currentTeamKey = key; if (currentTeamNameDisplay) currentTeamNameDisplay.textContent = `Équipe : ${teamName}`;
            isTeamDirty = false; // Reset ICI
            updateSaveButtonState(); // MAJ bouton ICI
        } catch (error) { console.error("Erreur sauvegarde équipe:", error); let errorMessage = "Échec sauvegarde équipe."; if (error.name === 'QuotaExceededError') errorMessage += " Stockage plein?"; showConfirmation(teamConfirmation, errorMessage, 7000, true); return; } // Appel fonction utils.js
        if (teamDataSaved) { // Gestion clé Master
            try { const currentMasterKey = localStorage.getItem("masterTeamKey"); if (isMaster) { localStorage.setItem("masterTeamKey", key); masterKeySaved = true; console.log(`Master key set: ${key}`); } else { if (currentMasterKey === key) { localStorage.removeItem("masterTeamKey"); console.log(`Master key removed: ${key}`); } masterKeySaved = true; }
            if (masterKeySaved) { showConfirmation(teamConfirmation, "Équipe enregistrée avec succès ! 👍"); } // Appel fonction utils.js
            } catch (error) { console.error("Erreur gestion clé master:", error); showConfirmation(teamConfirmation, "Données équipe OK, mais erreur MAJ statut 'Master'.", 6000, true); } // Appel fonction utils.js
        }
    }

    function loadAndDisplayTeam(key) { // Réinitialise isTeamDirty, utilise showConfirmation
        playerForm.reset(); editIndexInput.value = -1; playerSubmitBtn.textContent = '➕ Ajouter Joueur';
        if (!key) { teamNameInput.value = ""; isMasterCheckbox.checked = false; if (currentTeamLogoDisplay) currentTeamLogoDisplay.src = DEFAULT_LOGO; if (currentTeamNameDisplay) currentTeamNameDisplay.textContent = "Équipe : Nouvelle"; players = []; currentTeamKey = null; teamLogoInput.value = ''; renderPlayerList(); }
        else { try { const teamDataString = localStorage.getItem(key); if (teamDataString) { const teamData = JSON.parse(teamDataString); teamNameInput.value = teamData.name || ''; teamLogoInput.value = ''; if (currentTeamLogoDisplay) currentTeamLogoDisplay.src = teamData.logo || DEFAULT_LOGO; if (currentTeamNameDisplay) currentTeamNameDisplay.textContent = `Équipe : ${teamData.name || 'Inconnue'}`; isMasterCheckbox.checked = (localStorage.getItem("masterTeamKey") === key); players = Array.isArray(teamData.roster) ? teamData.roster : []; currentTeamKey = key; renderPlayerList(); } else { console.warn(`Aucune donnée pour clé : ${key}`); loadAndDisplayTeam(null); } }
            catch (error) { console.error(`Erreur chargement équipe ${key}:`, error); alert(`Impossible charger ${key}. Données corrompues?`); loadAndDisplayTeam(null); } }
        isTeamDirty = false; // Reset ICI
        updateSaveButtonState(); // MAJ bouton ICI
    }

    function handleImport() { // Appelle markTeamAsDirty, utilise showConfirmation
        const file = importFileInput.files[0]; if (!file) { alert("Veuillez sélectionner un fichier Excel (.xlsx) ou CSV."); return; }
        if (typeof XLSX === 'undefined') { alert("Erreur : Librairie d'importation non chargée."); showConfirmation(importConfirmation, "Erreur librairie importation.", 5000, true); return; } // Appel fonction utils.js
        const reader = new FileReader();
        reader.onload = function(event) { try { const data = new Uint8Array(event.target.result); const workbook = XLSX.read(data, { type: 'array' }); const firstSheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[firstSheetName]; const jsonData = XLSX.utils.sheet_to_json(worksheet); let importedCount = 0; let skippedCount = 0; let playersAdded = false; jsonData.forEach(row => { const name = row["Nom"]?.toString().trim(); const number = row["Numéro"]?.toString().trim(); const position = row["Position"]?.toString().trim(); if (name && number && position) { const exists = players.some(p => p.name === name && p.number === number); if (!exists) { players.push({ name, number, position }); importedCount++; playersAdded = true; } else { skippedCount++; } } else { skippedCount++; } }); renderPlayerList(); let message = `${importedCount} joueur(s) importé(s).`; if (skippedCount > 0) message += ` ${skippedCount} ignoré(s)/doublon(s).`; showConfirmation(importConfirmation, message, 7000); importFileInput.value = ''; if (playersAdded) { markTeamAsDirty(); } } // Appel ICI si changement
            catch (error) { console.error("Erreur importation:", error); alert("Erreur lecture fichier import."); showConfirmation(importConfirmation, "Échec importation.", 5000, true); } }; // Appel fonction utils.js
        reader.onerror = function() { alert("Impossible de lire le fichier."); showConfirmation(importConfirmation, "Échec lecture fichier.", 5000, true); }; // Appel fonction utils.js
        reader.readAsArrayBuffer(file);
    }

    // --- Initialization Function ---
    function init() {
        // Les listeners appellent les fonctions qui gèrent l'état dirty
        if (teamInfoForm) teamInfoForm.addEventListener('submit', handleTeamSave);
        if (playerForm) playerForm.addEventListener('submit', handlePlayerSubmit);
        if (teamLogoInput) teamLogoInput.addEventListener('change', previewLogo);
        if (clearListBtn) clearListBtn.addEventListener('click', handleClearList);
        if (sortListBtn) sortListBtn.addEventListener('click', handleSortList);
        if (importBtn) importBtn.addEventListener('click', handleImport);
        if (playerListElement) playerListElement.addEventListener('click', handleListClick);

        const masterKey = localStorage.getItem("masterTeamKey");
        loadAndDisplayTeam(masterKey); // Appelle updateSaveButtonState à la fin
    }

    init();

}); // End DOMContentLoaded