// opponents.js - Version finale après refactoring utils.js et ajout indicateur visuel renforcé
'use strict';

document.addEventListener('DOMContentLoaded', () => {

    // --- State Variables ---
    let opponentPlayers = []; // Player list for the currently loaded opponent team
    let currentOpponentKey = null; // localStorage key for the currently loaded opponent team
    let isOpponentTeamDirty = false; // Indicateur de changements non sauvegardés
    const DEFAULT_LOGO = 'spinozzi-logo.png';

    // --- DOM Element References ---
    // Team Selection / Management
    const opponentSelect = document.getElementById('opponent-select');
    const newTeamBtn = document.getElementById('new-team-btn');
    const deleteTeamBtn = document.getElementById('delete-team-btn');

    // Team Info Form
    const opponentInfoForm = document.getElementById('opponent-info-form');
    const loadedOpponentKeyInput = document.getElementById('loaded-opponent-key');
    const opponentNameInput = document.getElementById('opponent-name');
    const opponentLogoInput = document.getElementById('opponent-logo');
    const opponentLogoPreview = document.getElementById('opponent-logo-preview');
    const opponentConfirmation = document.getElementById('opponent-confirmation');
    const opponentSaveButton = opponentInfoForm ? opponentInfoForm.querySelector('button[type="submit"]') : null; // Référence bouton save

    // Player Section Elements (to show/hide)
    const playerSection = document.getElementById('opponent-players-section');
    const playerSectionNotice = document.getElementById('player-section-notice');
    const opponentPlayerForm = document.getElementById('opponent-player-form');
    const opponentPlayerActions = document.getElementById('opponent-player-actions');
    const opponentPlayerListTitle = document.getElementById('opponent-player-list-title');
    const opponentPlayerListElement = document.getElementById('opponent-player-list');

    // Player Form Inputs
    const opponentPlayerNameInput = document.getElementById('opponent-player-name');
    const opponentPlayerNumberInput = document.getElementById('opponent-player-number');
    const opponentPlayerPositionSelect = document.getElementById('opponent-player-position');
    const opponentPlayerSubmitBtn = document.getElementById('opponent-player-submit-btn');
    const opponentEditIndexInput = document.getElementById('opponent-edit-index');

    // Player List Action Buttons
    const opponentSortListBtn = document.getElementById('opponent-sort-list-btn');
    const opponentClearListBtn = document.getElementById('opponent-clear-list-btn');

    // Import Section Elements
    const importSection = document.getElementById('opponent-import-section');
    const opponentImportFileInput = document.getElementById('opponent-import-file');
    const opponentImportBtn = document.getElementById('opponent-import-btn');
    const opponentImportConfirmation = document.getElementById('opponent-import-confirmation');


    // --- Helper Functions ---
    // SUPPRIMÉ: slugify, getLogoDataUrl, showConfirmation (maintenant dans utils.js)

    // Fonction pour màj état bouton Enregistrer Adversaire
    function updateOpponentSaveButtonState() {
        if (!opponentSaveButton) return;
        const defaultBgColor = ''; // Couleur CSS par défaut
        const dirtyBgColor = '#ffdd57'; // Jaune
        const defaultTextColor = ''; // Couleur CSS par défaut
        const dirtyTextColor = '#333'; // Texte noir pour fond jaune
        if (isOpponentTeamDirty) {
            opponentSaveButton.textContent = '💾 Enregistrer modifications *';
            opponentSaveButton.style.backgroundColor = dirtyBgColor;
            opponentSaveButton.style.color = dirtyTextColor;
            opponentSaveButton.title = "Des modifications sont en attente de sauvegarde.";
        } else {
            const isUpdating = !!loadedOpponentKeyInput.value;
            opponentSaveButton.textContent = isUpdating ? '💾 Mettre à jour l\'équipe' : '💾 Enregistrer l\'équipe';
            opponentSaveButton.style.backgroundColor = defaultBgColor;
            opponentSaveButton.style.color = defaultTextColor;
            opponentSaveButton.title = "";
        }
    }

    // Fonction pour marquer changements et màj bouton
    function markOpponentTeamAsDirty() {
        if (!isOpponentTeamDirty) {
            isOpponentTeamDirty = true;
            updateOpponentSaveButtonState();
            console.log("Opponent Team marked as dirty.");
        }
    }

    // --- Core Functions ---

    function togglePlayerSections(show) { const displayStyle = show ? 'block' : 'none'; const noticeDisplayStyle = show ? 'none' : 'block'; if(playerSectionNotice) playerSectionNotice.style.display = noticeDisplayStyle; if(opponentPlayerForm) opponentPlayerForm.style.display = displayStyle; if(opponentPlayerActions) opponentPlayerActions.style.display = displayStyle; if(opponentPlayerListTitle) opponentPlayerListTitle.style.display = displayStyle; if(importSection) importSection.style.display = displayStyle; if(!show && opponentPlayerForm) { opponentPlayerForm.reset(); opponentEditIndexInput.value = -1; opponentPlayerSubmitBtn.textContent = '➕ Ajouter Joueur'; } }
    function populateOpponentSelect(selectKey = null) { if (!opponentSelect) return; const previousValue = selectKey || opponentSelect.value; opponentSelect.innerHTML = '<option value="">-- Choisir ou Créer Nouvelle --</option>'; let keys = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith("opponent_")) { keys.push(key); } } keys.sort((a, b) => { let nameA = '', nameB = ''; try { nameA = JSON.parse(localStorage.getItem(a) || '{}').name || ''; } catch (e) {} try { nameB = JSON.parse(localStorage.getItem(b) || '{}').name || ''; } catch (e) {} return nameA.localeCompare(nameB); }); keys.forEach(key => { try { const item = localStorage.getItem(key); if (item) { const teamData = JSON.parse(item); if (teamData && teamData.name) { const option = document.createElement("option"); option.value = key; option.textContent = teamData.name; opponentSelect.appendChild(option); } } } catch (e) {} }); if (selectKey && opponentSelect.querySelector(`option[value="${selectKey}"]`)) { opponentSelect.value = selectKey; } else if (previousValue && opponentSelect.querySelector(`option[value="${previousValue}"]`)) { opponentSelect.value = previousValue; } else { opponentSelect.value = ''; } if(deleteTeamBtn) deleteTeamBtn.disabled = !opponentSelect.value; }
    function handleTeamSelectionChange() { const selectedKey = opponentSelect.value; if(deleteTeamBtn) deleteTeamBtn.disabled = !selectedKey; if (selectedKey) { loadOpponentData(selectedKey); try { localStorage.setItem('lastOpponentKey', selectedKey); } catch(e) { console.warn("Echec sauvegarde lastOpponentKey"); } } else { resetToNewTeam(); } }

    function resetToNewTeam() { // Réinitialise isOpponentTeamDirty
        opponentInfoForm.reset(); opponentLogoInput.value = ''; opponentLogoPreview.src = '#'; opponentLogoPreview.style.display = 'none';
        opponentPlayers = []; currentOpponentKey = null; loadedOpponentKeyInput.value = '';
        if (opponentSelect) opponentSelect.value = ''; if (deleteTeamBtn) deleteTeamBtn.disabled = true;
        renderOpponentPlayerList(); togglePlayerSections(false);
        showConfirmation(opponentConfirmation, "Prêt à créer une nouvelle équipe adverse."); // Utilise showConfirmation de utils.js
        isOpponentTeamDirty = false; // Reset ICI
        updateOpponentSaveButtonState(); // MAJ bouton ICI
    }

    function handleDeleteTeam() { const keyToDelete = opponentSelect.value; if (!keyToDelete) { alert("Aucune équipe sélectionnée à supprimer."); return; } let teamName = 'cette équipe'; try { const teamDataString = localStorage.getItem(keyToDelete); if (teamDataString) { teamName = JSON.parse(teamDataString).name || teamName; } } catch (e) {} requestAnimationFrame(() => { if (confirm(`Voulez-vous vraiment supprimer l'équipe adverse "${teamName}" ? Cette action est irréversible.`)) { try { localStorage.removeItem(keyToDelete); showConfirmation(opponentConfirmation, `Équipe "${teamName}" supprimée.`); resetToNewTeam(); populateOpponentSelect(); } catch (error) { console.error(`Erreur suppression ${keyToDelete}:`, error); alert("Erreur suppression."); showConfirmation(opponentConfirmation, "Échec suppression.", 5000, true); } } }); } // Utilise showConfirmation de utils.js

    function loadOpponentData(key) { // Réinitialise isOpponentTeamDirty
        opponentPlayerForm.reset(); opponentEditIndexInput.value = -1; opponentPlayerSubmitBtn.textContent = '➕ Ajouter Joueur';
        try { const teamDataString = localStorage.getItem(key); if (!teamDataString) { alert("Impossible trouver données équipe."); resetToNewTeam(); populateOpponentSelect(); return; }
            const teamData = JSON.parse(teamDataString); console.log(`Chargement équipe adverse: ${key}`);
            opponentNameInput.value = teamData.name || ''; opponentLogoInput.value = ''; loadedOpponentKeyInput.value = key;
            if (teamData.logo && teamData.logo !== DEFAULT_LOGO) { opponentLogoPreview.src = teamData.logo; opponentLogoPreview.style.display = 'block'; } else { opponentLogoPreview.src = '#'; opponentLogoPreview.style.display = 'none'; }
            opponentPlayers = Array.isArray(teamData.roster) ? teamData.roster : []; currentOpponentKey = key;
            renderOpponentPlayerList(); togglePlayerSections(true); showConfirmation(opponentConfirmation, `Équipe "${teamData.name || '?'}" chargée.`); // Utilise showConfirmation de utils.js
        } catch (error) { console.error(`Erreur chargement ${key}:`, error); alert(`Impossible charger ${key}. Données corrompues?`); resetToNewTeam(); populateOpponentSelect(); }
        isOpponentTeamDirty = false; // Reset ICI
        updateOpponentSaveButtonState(); // MAJ bouton ICI
    }

    async function previewOpponentLogo() { // Appelle markOpponentTeamAsDirty
        const currentLogo = opponentLogoPreview.style.display === 'block' ? opponentLogoPreview.src : DEFAULT_LOGO;
        const logoUrl = await getLogoDataUrl(opponentLogoInput, currentLogo); // Utilise getLogoDataUrl de utils.js
        const initialLogoSrc = currentOpponentKey ? (JSON.parse(localStorage.getItem(currentOpponentKey) || '{}').logo || DEFAULT_LOGO) : DEFAULT_LOGO;
        if (logoUrl && logoUrl !== DEFAULT_LOGO) { opponentLogoPreview.src = logoUrl; opponentLogoPreview.style.display = 'block'; } else { opponentLogoPreview.src = logoUrl; opponentLogoPreview.style.display = logoUrl === DEFAULT_LOGO ? 'none' : 'block'; }
        if (logoUrl !== initialLogoSrc) { markOpponentTeamAsDirty(); } // Appel ICI
    }

    async function handleOpponentSave(event) { // Réinitialise isOpponentTeamDirty, utilise slugify, showConfirmation, getLogoDataUrl
        event.preventDefault();
        const teamName = opponentNameInput.value.trim(); if (!teamName) { alert("Nom équipe requis."); opponentNameInput.focus(); return; }
        const existingKey = loadedOpponentKeyInput.value; const newKey = "opponent_" + slugify(teamName); // Utilise slugify de utils.js
        const isUpdating = !!existingKey; const isRenaming = isUpdating && existingKey !== newKey;
        const currentLogo = opponentLogoPreview.style.display === 'block' ? opponentLogoPreview.src : DEFAULT_LOGO;
        let logoDataUrl; try { logoDataUrl = await getLogoDataUrl(opponentLogoInput, currentLogo); } catch (error) { console.error("Erreur lecture logo:", error); showConfirmation(opponentConfirmation, "Erreur lecture logo.", 5000, true); logoDataUrl = currentLogo; } // Utilise getLogoDataUrl, showConfirmation de utils.js
        const opponentData = { name: teamName, roster: opponentPlayers, logo: logoDataUrl }; let saveSuccess = false;
        try { if (isRenaming) { if (localStorage.getItem(newKey)) { if (!confirm(`Équipe "${teamName}" existe. Écraser ?`)) { return; } } try { localStorage.removeItem(existingKey); console.log(`Ancienne clé ${existingKey} supprimée.`); } catch (removeError) { console.warn(`Échec suppression clé ${existingKey}:`, removeError); showConfirmation(opponentConfirmation, "Avertissement: Échec suppression ancien nom.", 6000, true); } } // Utilise showConfirmation de utils.js
            localStorage.setItem(newKey, JSON.stringify(opponentData)); saveSuccess = true; currentOpponentKey = newKey; loadedOpponentKeyInput.value = newKey;
            isOpponentTeamDirty = false; // Reset ICI
            updateOpponentSaveButtonState(); // MAJ bouton ICI
            showConfirmation(opponentConfirmation, `Équipe "${teamName}" ${isUpdating ? 'mise à jour' : 'enregistrée'} !`); // Utilise showConfirmation de utils.js
            console.log(`Opponent enregistré/MAJ: ${newKey}`); populateOpponentSelect(newKey); deleteTeamBtn.disabled = false; togglePlayerSections(true);
        } catch (error) { console.error("Erreur sauvegarde équipe adverse:", error); let errorMessage = "Échec sauvegarde."; if (error.name === 'QuotaExceededError') errorMessage += " Stockage plein?"; showConfirmation(opponentConfirmation, errorMessage, 7000, true); } // Utilise showConfirmation de utils.js
    }

    // --- Opponent Player Management Functions ---

    function renderOpponentPlayerList() { if (!opponentPlayerListElement) return; opponentPlayerListElement.innerHTML = ''; if (opponentPlayers.length === 0) { opponentPlayerListElement.innerHTML = `<li style="text-align: center; color: #666;">Aucun joueur ajouté.</li>`; return; } opponentPlayers.forEach((player, index) => { const li = document.createElement('li'); const infoSpan = document.createElement('span'); infoSpan.textContent = `#${player.number || '?'} ${player.name || 'Inconnu'} (${player.position || '?'})`; const actionsDiv = document.createElement('div'); actionsDiv.className = 'actions'; const editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.className = 'btn btn--small'; editBtn.textContent = '✏️'; editBtn.setAttribute('aria-label', `Modifier ${player.name || 'joueur'}`); editBtn.dataset.index = index; const removeBtn = document.createElement('button'); removeBtn.type = 'button'; removeBtn.className = 'btn btn--danger btn--small'; removeBtn.textContent = '❌'; removeBtn.setAttribute('aria-label', `Supprimer ${player.name || 'joueur'}`); removeBtn.dataset.index = index; actionsDiv.appendChild(editBtn); actionsDiv.appendChild(removeBtn); li.appendChild(infoSpan); li.appendChild(actionsDiv); opponentPlayerListElement.appendChild(li); }); }
    function handleOpponentListClick(event) { const target = event.target.closest('button'); if (!target || !target.closest('.actions')) return; const index = parseInt(target.dataset.index, 10); if (isNaN(index)) return; if (target.textContent === '✏️') editOpponentPlayer(index); else if (target.textContent === '❌') removeOpponentPlayer(index); }
    function editOpponentPlayer(index) { if (index < 0 || index >= opponentPlayers.length) return; const player = opponentPlayers[index]; opponentPlayerNameInput.value = player.name || ''; opponentPlayerNumberInput.value = player.number || ''; opponentPlayerPositionSelect.value = player.position || ''; opponentEditIndexInput.value = index; opponentPlayerSubmitBtn.textContent = '💾 Mettre à jour Joueur'; opponentPlayerNameInput.focus(); }

    function removeOpponentPlayer(index) { // Appelle markOpponentTeamAsDirty
         if (index < 0 || index >= opponentPlayers.length) return;
         const player = opponentPlayers[index];
         requestAnimationFrame(() => { if (confirm(`Supprimer joueur #${player.number || '?'} ${player.name || '?'} ?`)) { opponentPlayers.splice(index, 1); renderOpponentPlayerList(); if (parseInt(opponentEditIndexInput.value) === index) { opponentPlayerForm.reset(); opponentEditIndexInput.value = -1; opponentPlayerSubmitBtn.textContent = '➕ Ajouter Joueur'; } markOpponentTeamAsDirty(); } }); // Appel ICI
    }

    function handleOpponentPlayerSubmit(event) { // Appelle markOpponentTeamAsDirty
        event.preventDefault(); if (!currentOpponentKey) { alert("Chargez/enregistrez une équipe d'abord."); return; }
        const name = opponentPlayerNameInput.value.trim(); const number = opponentPlayerNumberInput.value.trim(); const position = opponentPlayerPositionSelect.value; const indexToEdit = parseInt(opponentEditIndexInput.value, 10);
        if (!name || !number || !position) { alert('Champs joueur requis.'); return; }
        const playerData = { name, number, position }; let playerChanged = false;
        if (indexToEdit > -1 && indexToEdit < opponentPlayers.length) { const oldData = opponentPlayers[indexToEdit]; if (oldData.name !== name || oldData.number !== number || oldData.position !== position) { opponentPlayers[indexToEdit] = playerData; playerChanged = true; } }
        else { opponentPlayers.push(playerData); playerChanged = true; }
        opponentPlayerForm.reset(); opponentEditIndexInput.value = -1; opponentPlayerSubmitBtn.textContent = '➕ Ajouter Joueur';
        renderOpponentPlayerList();
        if (playerChanged) { markOpponentTeamAsDirty(); } // Appel ICI si changement
    }

    function handleOpponentSortList() { // Appelle markOpponentTeamAsDirty
         const originalOrder = JSON.stringify(opponentPlayers.map(p => p.number));
         opponentPlayers.sort((a, b) => parseInt(a.number || 0) - parseInt(b.number || 0));
         const newOrder = JSON.stringify(opponentPlayers.map(p => p.number));
         renderOpponentPlayerList();
         if (originalOrder !== newOrder && opponentPlayers.length > 0) { markOpponentTeamAsDirty(); } // Appel ICI si changement
    }

    function handleOpponentClearList() { // Appelle markOpponentTeamAsDirty
         const hadPlayers = opponentPlayers.length > 0;
         requestAnimationFrame(() => { if (confirm("Vider la liste des joueurs pour cette équipe ?")) { opponentPlayers = []; renderOpponentPlayerList(); opponentPlayerForm.reset(); opponentEditIndexInput.value = -1; opponentPlayerSubmitBtn.textContent = '➕ Ajouter Joueur'; if (hadPlayers) { markOpponentTeamAsDirty(); } } }); // Appel ICI si changement
    }

    function handleOpponentImport() { // Appelle markOpponentTeamAsDirty, utilise showConfirmation
        const file = opponentImportFileInput.files[0]; if (!currentOpponentKey) { alert("Chargez/enregistrez une équipe d'abord."); return; } if (!file) { alert("Sélectionnez un fichier."); return; } if (typeof XLSX === 'undefined') { alert("Erreur librairie import."); showConfirmation(opponentImportConfirmation, "Erreur librairie.", 5000, true); return; } // Utilise showConfirmation de utils.js
        const reader = new FileReader();
        reader.onload = function(event) { try { const data = new Uint8Array(event.target.result); const workbook = XLSX.read(data, { type: 'array' }); const firstSheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[firstSheetName]; const jsonData = XLSX.utils.sheet_to_json(worksheet); let importedCount = 0; let skippedCount = 0; let playersAdded = false; jsonData.forEach(row => { const name = row["Nom"]?.toString().trim(); const number = row["Numéro"]?.toString().trim(); const position = row["Position"]?.toString().trim(); if (name && number && position) { const exists = opponentPlayers.some(p => p.name === name && p.number === number); if (!exists) { opponentPlayers.push({ name, number, position }); importedCount++; playersAdded = true; } else { skippedCount++; } } else { skippedCount++; } }); renderOpponentPlayerList(); let message = `${importedCount} joueur(s) ajouté(s).`; if (skippedCount > 0) message += ` ${skippedCount} ignoré(s)/doublon(s).`; showConfirmation(opponentImportConfirmation, message, 7000); opponentImportFileInput.value = ''; if (playersAdded) { markOpponentTeamAsDirty(); } } // Appel ICI si changement
            catch (error) { console.error("Erreur importation:", error); alert("Erreur lecture fichier import."); showConfirmation(opponentImportConfirmation, "Échec importation.", 5000, true); } }; // Utilise showConfirmation de utils.js
        reader.onerror = () => { alert("Impossible lire fichier."); showConfirmation(opponentImportConfirmation, "Échec lecture.", 5000, true); }; // Utilise showConfirmation de utils.js
        reader.readAsArrayBuffer(file);
    }

    // --- Initialization ---
    function init() {
        // Les listeners appellent les fonctions qui gèrent l'état dirty
        if (opponentSelect) opponentSelect.addEventListener('change', handleTeamSelectionChange);
        if (newTeamBtn) newTeamBtn.addEventListener('click', resetToNewTeam);
        if (deleteTeamBtn) deleteTeamBtn.addEventListener('click', handleDeleteTeam);
        if (opponentInfoForm) opponentInfoForm.addEventListener('submit', handleOpponentSave);
        if (opponentLogoInput) opponentLogoInput.addEventListener('change', previewOpponentLogo);
        if (opponentPlayerForm) opponentPlayerForm.addEventListener('submit', handleOpponentPlayerSubmit);
        if (opponentPlayerListElement) opponentPlayerListElement.addEventListener('click', handleOpponentListClick);
        if (opponentSortListBtn) opponentSortListBtn.addEventListener('click', handleOpponentSortList);
        if (opponentClearListBtn) opponentClearListBtn.addEventListener('click', handleOpponentClearList);
        if (opponentImportBtn) opponentImportBtn.addEventListener('click', handleOpponentImport);

        // Initial Setup
        populateOpponentSelect();
        const lastKey = localStorage.getItem('lastOpponentKey');
        if (lastKey && localStorage.getItem(lastKey)) { opponentSelect.value = lastKey; loadOpponentData(lastKey); }
        else { if(lastKey && !localStorage.getItem(lastKey)) { localStorage.removeItem('lastOpponentKey'); } resetToNewTeam(); }
        // loadOpponentData et resetToNewTeam appellent updateOpponentSaveButtonState à la fin
    }

    // --- Start ---
    init();

}); // End DOMContentLoaded