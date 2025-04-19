// --- DEBUT DU CODE COMPLET pour match.js (Avec TOUS les logs DEBUG pour Clic Zone) ---
'use strict';

// Vérifie si les définitions de zones existent (devraient venir de utils.js)
// Fait maintenant dans init() pour être sûr que le DOM est prêt pour afficher une erreur si besoin
// if (typeof faceoffPointsDefs === 'undefined' || typeof zoneMapping === 'undefined') { ... }

document.addEventListener('DOMContentLoaded', () => {

    // --- State Variables ---
    let matchData = null; let masterTeamData = null; let opponentTeamData = null; let matchStarted = false;
    // faceoffPointsDefs est maintenant défini dans utils.js
    let faceoffSelectionState = 'idle'; let currentFaceoffData = null;
    const MAX_PERIODS = 4; const DEFAULT_LOGO = 'spinozzi-logo.png';

    // --- DOM Element References ---
    const startMatchBtn = document.getElementById('start-match-btn'); const endMatchBtn = document.getElementById('end-match-btn'); const cancelMatchBtn = document.getElementById('cancel-match-btn'); const undoLastBtn = document.getElementById('undo-last-btn'); const matchHeaderDisplay = document.getElementById('match-header'); const actionInfoDisplay = document.getElementById('action-info'); const homeTeamNameDisplay = document.getElementById('home-team-name'); const homeTeamLogoDisplay = document.getElementById('home-team-logo'); const homePlayerListUl = document.querySelector('#home-player-list ul'); const opponentSelect = document.getElementById('opponent-select'); const awayTeamLogoDisplay = document.getElementById('away-team-logo'); const awayPlayerListUl = document.querySelector('#away-player-list ul'); const rinkImageWrapper = document.querySelector('.rink-image-wrapper'); const currentPeriodDisplay = document.getElementById('current-period'); const prevPeriodBtn = document.getElementById('prev-period-btn'); const nextPeriodBtn = document.getElementById('next-period-btn'); const winnerConfirmBar = document.getElementById('winner-confirm-bar'); const confirmWinHomeBtn = document.getElementById('confirm-win-home'); const confirmWinAwayBtn = document.getElementById('confirm-win-away'); const cancelFaceoffConfirmBtn = document.getElementById('cancel-faceoff-confirm'); const defZonePctElement = document.getElementById('def-zone-pct'); const neuZonePctElement = document.getElementById('neu-zone-pct'); const offZonePctElement = document.getElementById('off-zone-pct'); const overallPctElement = document.getElementById('overall-pct');

    // --- Helper Functions --- (Viennent de utils.js)

    // --- Data Loading ---
    function getStoredTeamData(key) { try { const dataString = localStorage.getItem(key); if (!dataString) { console.warn(`Key ${key} empty.`); return null; } return JSON.parse(dataString); } catch (e) { console.error(`Error parsing ${key}:`, e); return null; } }

    // --- Core Rendering / UI Update Functions ---
    function calculateAndRenderAllStats() { if (!matchData || !masterTeamData || !opponentTeamData) { const emptyEvents = []; calculatePlayerStats(emptyEvents, masterTeamData?.roster, 'home'); calculatePlayerStats(emptyEvents, opponentTeamData?.roster, 'away'); updateZonePercentages(emptyEvents); updateSummaryStats(emptyEvents); renderPlayerList(masterTeamData?.roster, homePlayerListUl); renderPlayerList(opponentTeamData?.roster, awayPlayerListUl); return; } const faceoffEvents = matchData.events.filter(e => e.type === 'faceoff'); calculatePlayerStats(faceoffEvents, masterTeamData.roster, 'home'); calculatePlayerStats(faceoffEvents, opponentTeamData.roster, 'away'); updateZonePercentages(faceoffEvents); updateSummaryStats(faceoffEvents); renderPlayerList(masterTeamData.roster, homePlayerListUl); renderPlayerList(opponentTeamData.roster, awayPlayerListUl); }
    function calculatePlayerStats(faceoffEvents, roster, teamType) { if (!roster || roster.length === 0) return; roster.forEach(player => { if (!player) return; const playerId = `${player.number}-${slugify(player.name || '')}`; let wins = 0; let total = 0; faceoffEvents.forEach(event => { if (!event || !event.homePlayerId || !event.awayPlayerId || !event.winner) return; const isHomePlayer = event.homePlayerId === playerId; const isAwayPlayer = event.awayPlayerId === playerId; if (teamType === 'home' && isHomePlayer) { total++; if (event.winner === 'home') wins++; } else if (teamType === 'away' && isAwayPlayer) { total++; if (event.winner === 'away') wins++; } }); player.faceoffTotal = total; player.faceoffWins = wins; player.faceoffWinPct = (total === 0) ? undefined : (wins / total) * 100; }); }
    function updateZonePercentages(faceoffEvents) { if (typeof faceoffPointsDefs === 'undefined') { return; } if (faceoffPointsDefs.length === 0) { return;} faceoffPointsDefs.forEach(point => { const zoneId = point.id; const percElement = document.getElementById(`perc-display-${zoneId}`); if (!percElement) return; const zoneEvents = faceoffEvents.filter(e => e.zoneId === zoneId); const totalZoneFaceoffs = zoneEvents.length; const masterWinsInZone = zoneEvents.filter(e => e.winner === 'home').length; let percentage = 0; if (totalZoneFaceoffs > 0) percentage = (masterWinsInZone / totalZoneFaceoffs) * 100; percElement.textContent = totalZoneFaceoffs > 0 ? `${percentage.toFixed(0)}%` : '-'; percElement.classList.remove('win', 'loss'); if (totalZoneFaceoffs > 0) percElement.classList.add(percentage >= 50 ? 'win' : 'loss'); }); }
    function updateSummaryStats(faceoffEvents) { if (typeof zoneMapping === 'undefined') { console.error("zoneMapping non défini!"); return; } if (!defZonePctElement || !neuZonePctElement || !offZonePctElement || !overallPctElement) { return; } let wins = { DZ: 0, NZ: 0, OZ: 0, ALL: 0 }; let totals = { DZ: 0, NZ: 0, OZ: 0, ALL: 0 }; faceoffEvents.forEach(event => { if (!event || !event.zoneId || !event.winner) { return; } const summaryZone = zoneMapping[event.zoneId]; const isHomeWin = event.winner === 'home'; totals.ALL++; if (isHomeWin) wins.ALL++; if (summaryZone) { totals[summaryZone]++; if (isHomeWin) wins[summaryZone]++; } }); const updateStatElement = (element, winCount, totalCount, label) => { if (!element) { return; } let percentage = 0; let text = '- (0/0)'; if (totalCount > 0) { percentage = (winCount / totalCount) * 100; text = `${percentage.toFixed(0)}% (${winCount}/${totalCount})`; } element.textContent = text; element.classList.remove('win', 'loss'); if (totalCount > 0) { element.classList.add(percentage >= 50 ? 'win' : 'loss'); } }; updateStatElement(defZonePctElement, wins.DZ, totals.DZ, 'ZD'); updateStatElement(neuZonePctElement, wins.NZ, totals.NZ, 'ZN'); updateStatElement(offZonePctElement, wins.OZ, totals.OZ, 'ZO'); updateStatElement(overallPctElement, wins.ALL, totals.ALL, 'TOTAL'); }

    // Utilise les backticks ` ` correctement
    function renderPlayerList(players, listUlElement) {
        if (!listUlElement) return; listUlElement.innerHTML = '';
        if (!players || players.length === 0) { listUlElement.innerHTML = '<li>(No Players)</li>'; return; }
        const sortedPlayers = [...players].sort((a, b) => parseInt(a?.number || 0) - parseInt(b?.number || 0));
        sortedPlayers.forEach(player => {
             if (!player || typeof player !== 'object') { console.warn("Invalid player data in renderPlayerList", player); return; }
             const li = document.createElement('li');
             const playerSlug = (typeof slugify === 'function') ? slugify(player.name || '') : (player.name || '').toString().toLowerCase().trim().replace(/\s+/g, '-');
             const playerId = `${player.number ?? '?'}-${playerSlug}`;
             li.dataset.playerId = playerId;
             const nameSpan = document.createElement('span');
             nameSpan.textContent = `#${player.number ?? '?'} ${player.name ?? 'Unknown'}`;
             li.appendChild(nameSpan);
             const statsSpan = document.createElement('span');
             statsSpan.className = 'player-faceoff-percentage';
             const wins = player.faceoffWins ?? 0;
             const total = player.faceoffTotal ?? 0;
             const pct = player.faceoffWinPct;
             // Utilise accents graves ` `
             statsSpan.textContent = `${(pct !== undefined && !isNaN(pct) ? pct.toFixed(0) : '0')}% (${wins}/${total})`;
             statsSpan.classList.remove('win', 'loss');
             if (total > 0 && pct !== undefined && !isNaN(pct)) { statsSpan.classList.add(pct >= 50 ? 'win' : 'loss'); }
             li.appendChild(statsSpan);
             listUlElement.appendChild(li);
        });
    }

    // MODIFIÉ : Ajout log DEBUG après appendChild
    function defineAndRenderFaceoffPoints() {
        if (typeof faceoffPointsDefs === 'undefined') { console.error("defineAndRenderFaceoffPoints: faceoffPointsDefs not defined!"); return;}
        if (!rinkImageWrapper) { console.error("defineAndRenderFaceoffPoints: rinkImageWrapper not found!"); return;}

        const existingPoint = rinkImageWrapper.querySelector('.faceoff-point-wrapper');
        if (existingPoint) {
            console.log("defineAndRenderFaceoffPoints: Points already exist. Ensuring they are disabled.");
            rinkImageWrapper.querySelectorAll('.faceoff-point-wrapper').forEach(p => p.classList.add('disabled'));
            return;
        }

        console.log("defineAndRenderFaceoffPoints: Rendering initial faceoff points...");
        faceoffPointsDefs.forEach(point => {
            const wrapper = document.createElement('div'); wrapper.className = 'faceoff-point-wrapper disabled';
            wrapper.style.position = 'absolute'; wrapper.style.left = `${point.x}%`; wrapper.style.top = `${point.y}%`;
            wrapper.dataset.zoneId = point.id; wrapper.dataset.zoneName = point.name; wrapper.title = point.name;
            const divPoint = document.createElement('div'); divPoint.className = 'faceoff-point';
            const divPerc = document.createElement('div'); divPerc.className = 'percentage-display'; divPerc.id = `perc-display-${point.id}`; divPerc.textContent = '-';
            wrapper.appendChild(divPoint); wrapper.appendChild(divPerc);
            rinkImageWrapper.appendChild(wrapper);
            // Log pour confirmer ajout au DOM
            console.log(` -> Point ${point.id} added to DOM in rinkImageWrapper.`);
        });
         console.log("defineAndRenderFaceoffPoints: Finished rendering points.");
    }

    function updateWinnerButtonLabels() { if (confirmWinHomeBtn) confirmWinHomeBtn.textContent = `${masterTeamData?.name || 'Master'} Gagne`; if (confirmWinAwayBtn) confirmWinAwayBtn.textContent = `${opponentTeamData?.name || 'Adverse'} Gagne`; }
    function resetFaceoffSelection() { /* ... (inchangé) ... */ faceoffSelectionState = 'idle'; document.querySelectorAll('.player-list-match li.selected-home, .player-list-match li.selected-away').forEach(el => el.classList.remove('selected-home', 'selected-away')); document.querySelectorAll('.player-list-match.selecting-home, .player-list-match.selecting-away').forEach(el => el.classList.remove('selecting-home', 'selecting-away')); const activePoint = rinkImageWrapper?.querySelector('.faceoff-point-wrapper.active-selection'); if(activePoint) activePoint.classList.remove('active-selection'); currentFaceoffData = null; if(winnerConfirmBar) winnerConfirmBar.classList.remove('active'); document.body.classList.remove('confirmation-bar-active'); if(actionInfoDisplay) { const periodText = getPeriodText(matchData?.currentPeriod); if (matchStarted) { actionInfoDisplay.textContent = `Période ${periodText}. Cliquez sur une zone.`; } else if (masterTeamData && opponentTeamData) { actionInfoDisplay.textContent = "Prêt à démarrer."; } else { actionInfoDisplay.textContent = "Chargez Master et Adversaire."; } } }

     // --- Fonctions Gestion Équipes ---
     function loadMasterTeam() { /* ... (inchangé) ... */ const masterKey = localStorage.getItem('masterTeamKey'); if (!masterKey) { if(actionInfoDisplay) { showConfirmation(actionInfoDisplay, "ERREUR : Master non définie.", 5000, true); } if(startMatchBtn) startMatchBtn.disabled = true; return false; } masterTeamData = getStoredTeamData(masterKey); if (!masterTeamData) { if(actionInfoDisplay) { showConfirmation(actionInfoDisplay, `ERREUR : Charger Master (Clé: ${masterKey}).`, 5000, true); } if(startMatchBtn) startMatchBtn.disabled = true; localStorage.removeItem('masterTeamKey'); return false; } if (homeTeamNameDisplay) homeTeamNameDisplay.textContent = masterTeamData.name || 'Master Team'; if (homeTeamLogoDisplay) homeTeamLogoDisplay.src = masterTeamData.logo || DEFAULT_LOGO; updateMatchHeader(); return true; }
     function populateOpponentSelectMatch() { /* ... (inchangé) ... */ if (!opponentSelect) return; const lastOpponentKey = localStorage.getItem('lastOpponentKey'); opponentSelect.innerHTML = '<option value="">Choisir Adversaire...</option>'; let keys = []; for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if(key && key.startsWith("opponent_")) { keys.push(key); } } keys.sort((a, b) => { let nameA = '', nameB = ''; try { nameA = getStoredTeamData(a)?.name || ''; } catch(e) {} try { nameB = getStoredTeamData(b)?.name || ''; } catch(e) {} return nameA.localeCompare(nameB); }); keys.forEach(key => { const teamData = getStoredTeamData(key); if (teamData && teamData.name) { const option = document.createElement("option"); option.value = key; option.textContent = teamData.name; opponentSelect.appendChild(option); } }); if (lastOpponentKey && opponentSelect.querySelector(`option[value="${lastOpponentKey}"]`)) { opponentSelect.value = lastOpponentKey; } else { opponentSelect.value = ''; localStorage.removeItem('lastOpponentKey'); } }
     function handleOpponentSelection() { /* ... (inchangé) ... */ const selectedKey = opponentSelect.value; resetFaceoffSelection(); if (!selectedKey) { opponentTeamData = null; if(awayTeamLogoDisplay) awayTeamLogoDisplay.src = DEFAULT_LOGO; if(awayPlayerListUl) awayPlayerListUl.innerHTML = ''; localStorage.removeItem('lastOpponentKey'); } else { opponentTeamData = getStoredTeamData(selectedKey); if (!opponentTeamData) { alert(`Erreur: Charger adversaire (Clé: ${selectedKey}).`); opponentTeamData = null; if(awayTeamLogoDisplay) awayTeamLogoDisplay.src = DEFAULT_LOGO; if(awayPlayerListUl) awayPlayerListUl.innerHTML = ''; opponentSelect.value = ''; localStorage.removeItem('lastOpponentKey'); } else { if(awayTeamLogoDisplay) awayTeamLogoDisplay.src = opponentTeamData.logo || DEFAULT_LOGO; try { localStorage.setItem('lastOpponentKey', selectedKey); } catch(e) { console.warn("Echec sauvegarde lastOpponentKey"); } } } calculateAndRenderAllStats(); updateMatchHeader(); checkMatchStartConditions(); }
     function updateMatchHeader() { /* ... (inchangé) ... */ if (!matchHeaderDisplay) return; matchHeaderDisplay.innerHTML = ''; const createTeamSpan = (team, isMaster) => { const span = document.createElement('span'); const img = document.createElement('img'); img.src = team.logo || DEFAULT_LOGO; img.alt = team.name || (isMaster ? 'Master' : 'Adverse'); img.className = 'team-logo-small'; if (isMaster) { span.appendChild(document.createTextNode(`${team.name || 'Master'} `)); span.appendChild(img); } else { span.appendChild(img); span.appendChild(document.createTextNode(` ${team.name || 'Adverse'}`)); } return span; }; if (masterTeamData) { matchHeaderDisplay.appendChild(createTeamSpan(masterTeamData, true)); } else { matchHeaderDisplay.appendChild(document.createTextNode('Master? ')); } matchHeaderDisplay.appendChild(document.createTextNode(' VS ')); if (opponentTeamData) { matchHeaderDisplay.appendChild(createTeamSpan(opponentTeamData, false)); } else { matchHeaderDisplay.appendChild(document.createTextNode(' Adverse?')); } }
     function checkMatchStartConditions() { /* ... (inchangé) ... */ const canStart = !!(masterTeamData && opponentTeamData); if(startMatchBtn) startMatchBtn.disabled = !canStart; const periodText = getPeriodText(matchData?.currentPeriod || 1); if (!canStart && actionInfoDisplay && !matchStarted) { actionInfoDisplay.textContent = "Chargez Master et Adversaire."; } else if (canStart && actionInfoDisplay && !matchStarted) { actionInfoDisplay.textContent = "Prêt à démarrer."; } else if (matchStarted && actionInfoDisplay) { actionInfoDisplay.textContent = `Période ${periodText}. Cliquez sur une zone.`; } }

    // --- Gestionnaires d'Événements ---
    // REMIS : Logs DEBUG pour le clic
    function handleFaceoffClick(event) {
        console.log("DEBUG: handleFaceoffClick triggered. Element cliqué:", event.target); // DEBUG 1
        if (!matchStarted || faceoffSelectionState === 'confirming_winner') {
            console.log("DEBUG: handleFaceoffClick: Ignoré (match non démarré ou confirmation en cours).");
            return;
        }
        const wrapper = event.target.closest('.faceoff-point-wrapper');
        console.log("DEBUG: Wrapper trouvé par closest():", wrapper); // DEBUG 2

        if (wrapper && !wrapper.classList.contains('disabled')) {
             console.log("DEBUG: Wrapper trouvé ET non désactivé. Zone:", wrapper.dataset.zoneId); // DEBUG 3
             resetFaceoffSelection();
             currentFaceoffData = { zoneId: wrapper.dataset.zoneId, zoneName: wrapper.dataset.zoneName, homePlayerElement: null, awayPlayerElement: null };
             faceoffSelectionState = 'selecting_home';
             wrapper.classList.add('active-selection');
             if(homePlayerListUl) homePlayerListUl.closest('.player-list-match').classList.add('selecting-home');
             if(actionInfoDisplay) actionInfoDisplay.textContent = `MÀJ ${currentFaceoffData.zoneName}. Sélectionnez Joueur ${masterTeamData?.name || 'Master'}...`;
        } else {
             console.log("DEBUG: handleFaceoffClick: Clic ignoré (pas de wrapper valide ou wrapper désactivé).");
        }
    }

    function handlePlayerListClick(event) { /* ... (inchangé) ... */ if (!matchStarted || !['selecting_home', 'selecting_away'].includes(faceoffSelectionState)) return; const liElement = event.target.closest('li'); if (!liElement || !liElement.dataset.playerId) return; const playerId = liElement.dataset.playerId; const listContainer = liElement.closest('.player-list-match'); const isHomeList = listContainer && listContainer.id === 'home-player-list'; const isAwayList = listContainer && listContainer.id === 'away-player-list'; if (faceoffSelectionState === 'selecting_home' && isHomeList) { if (currentFaceoffData.homePlayerElement) currentFaceoffData.homePlayerElement.classList.remove('selected-home'); currentFaceoffData.homePlayerId = playerId; currentFaceoffData.homePlayerElement = liElement; liElement.classList.add('selected-home'); listContainer.classList.remove('selecting-home'); faceoffSelectionState = 'selecting_away'; const awayListContainer = document.getElementById('away-player-list'); if (awayListContainer) awayListContainer.classList.add('selecting-away'); if(actionInfoDisplay) actionInfoDisplay.textContent = `Joueur Master #${playerId.split('-')[0]} OK. Sélectionnez Joueur ${opponentTeamData?.name || 'Adverse'}...`; } else if (faceoffSelectionState === 'selecting_away' && isAwayList) { if (currentFaceoffData.awayPlayerElement) currentFaceoffData.awayPlayerElement.classList.remove('selected-away'); currentFaceoffData.awayPlayerId = playerId; currentFaceoffData.awayPlayerElement = liElement; liElement.classList.add('selected-away'); listContainer.classList.remove('selecting-away'); faceoffSelectionState = 'confirming_winner'; if(actionInfoDisplay) actionInfoDisplay.textContent = `Joueur Adverse #${playerId.split('-')[0]} OK. Confirmez gagnant.`; updateWinnerButtonLabels(); if(winnerConfirmBar) winnerConfirmBar.classList.add('active'); document.body.classList.add('confirmation-bar-active'); } }
    function handleWinnerConfirmation(event) { /* ... (inchangé) ... */ if (!matchStarted || faceoffSelectionState !== 'confirming_winner' || !currentFaceoffData) return; const button = event.target.closest('button'); if (!button || !winnerConfirmBar || !winnerConfirmBar.contains(button)) return; let winner = null; if (button === confirmWinHomeBtn) winner = 'home'; else if (button === confirmWinAwayBtn) winner = 'away'; else if (button === cancelFaceoffConfirmBtn) { resetFaceoffSelection(); return; } else return; if (!currentFaceoffData.zoneId || !currentFaceoffData.homePlayerId || !currentFaceoffData.awayPlayerId) { console.error("Données MÀJ incomplètes:", currentFaceoffData); showConfirmation(actionInfoDisplay, "Erreur: Données MÀJ incomplètes.", 5000, true); resetFaceoffSelection(); return; } const faceoffEvent = { type: 'faceoff', timestamp: Date.now(), period: matchData.currentPeriod, zoneId: currentFaceoffData.zoneId, homePlayerId: currentFaceoffData.homePlayerId, awayPlayerId: currentFaceoffData.awayPlayerId, winner: winner }; if (!matchData.events) matchData.events = []; matchData.events.push(faceoffEvent); console.log("MÀJ enregistrée:", faceoffEvent); calculateAndRenderAllStats(); updateUndoButtonState(); if(actionInfoDisplay) { const zoneName = currentFaceoffData.zoneName || currentFaceoffData.zoneId; const winnerTeamName = winner === 'home' ? (masterTeamData?.name || 'Master') : (opponentTeamData?.name || 'Adverse'); const homePNum = currentFaceoffData.homePlayerId.split('-')[0]; const awayPNum = currentFaceoffData.awayPlayerId.split('-')[0]; showConfirmation(actionInfoDisplay, `MÀJ ${zoneName} (P${getPeriodText(matchData.currentPeriod)}, ${homePNum} vs ${awayPNum}) > ${winnerTeamName} gagne.`, 5000); } resetFaceoffSelection(); }
    function handleUndoLastFaceoff() { /* ... (inchangé) ... */ if (!matchStarted || !matchData || !matchData.events || matchData.events.length === 0) return; let lastFaceoffIndex = -1; for (let i = matchData.events.length - 1; i >= 0; i--) { if (matchData.events[i]?.type === 'faceoff') { lastFaceoffIndex = i; break; } } if (lastFaceoffIndex === -1) { showConfirmation(actionInfoDisplay, "Aucune MÀJ à annuler.", 3000); updateUndoButtonState(); return; } const eventToUndo = matchData.events[lastFaceoffIndex]; const zoneId = eventToUndo.zoneId || '?'; const period = eventToUndo.period || '?'; const homeP = eventToUndo.homePlayerId?.split('-')[0] || '?'; const awayP = eventToUndo.awayPlayerId?.split('-')[0] || '?'; requestAnimationFrame(() => { if (confirm(`Annuler MÀJ (Zone: ${zoneId}, P:${getPeriodText(period)}, ${homeP} vs ${awayP}) ?`)) { const removedEvent = matchData.events.splice(lastFaceoffIndex, 1)[0]; console.log("MÀJ annulée:", removedEvent); calculateAndRenderAllStats(); updateUndoButtonState(); if (actionInfoDisplay) showConfirmation(actionInfoDisplay, `MÀJ (Zone: ${removedEvent.zoneId}) annulée.`, 4000); resetFaceoffSelection(); } else { console.log("Undo annulé."); } }); }
    function updateUndoButtonState() { /* ... (inchangé) ... */ if (!undoLastBtn) return; const hasFaceoffEvents = matchData && matchData.events && matchData.events.some(e => e?.type === 'faceoff'); if (matchStarted && hasFaceoffEvents) { undoLastBtn.style.display = 'inline-block'; undoLastBtn.disabled = false; } else { undoLastBtn.style.display = 'none'; undoLastBtn.disabled = true; } }

    // --- Fonctions Contrôle Match ---
    function getPeriodText(periodNumber) { /* ... (inchangé) ... */ if (periodNumber >= 4) return 'OT'; return periodNumber || 1; }
    function updatePeriodDisplay(periodNumber) { /* ... (inchangé) ... */ if (currentPeriodDisplay) { currentPeriodDisplay.textContent = getPeriodText(periodNumber); } if (prevPeriodBtn) prevPeriodBtn.disabled = (periodNumber <= 1); if (nextPeriodBtn) nextPeriodBtn.disabled = (periodNumber >= MAX_PERIODS); }

    // REMIS : Logs DEBUG activation points
    function startMatch() {
        if (matchStarted) return; if (!masterTeamData || !opponentTeamData) { alert("Chargez Master et Adversaire."); return; }
        requestAnimationFrame(() => {
            if (confirm("Démarrer match ?")) {
                console.log("DEBUG: Démarrage du match..."); // DEBUG
                matchStarted = true;
                matchData = { id: `match_${Date.now()}`, startTime: Date.now(), endTime: null, masterTeam: { key: localStorage.getItem('masterTeamKey'), name: masterTeamData.name, logo: masterTeamData.logo }, opponentTeam: { key: opponentSelect?.value, name: opponentTeamData.name, logo: opponentTeamData.logo }, events: [], currentPeriod: 1 };
                if(startMatchBtn) startMatchBtn.style.display = 'none'; if(endMatchBtn) endMatchBtn.style.display = 'inline-block'; if(cancelMatchBtn) cancelMatchBtn.style.display = 'inline-block'; if(opponentSelect) opponentSelect.disabled = true; if(document.getElementById('home-team-selector')) document.getElementById('home-team-selector').style.opacity = '0.7'; if(document.getElementById('away-team-selector')) document.getElementById('away-team-selector').style.opacity = '0.7';
                updatePeriodDisplay(matchData.currentPeriod);
                // Activation des points
                console.log("DEBUG: Activation des points de mise au jeu..."); // DEBUG
                const points = rinkImageWrapper?.querySelectorAll('.faceoff-point-wrapper'); // DEBUG
                if (points && points.length > 0) {
                    points.forEach(p => {
                         if (p && p.dataset && p.dataset.zoneId) {
                             console.log(" DEBUG: Activation du point:", p.dataset.zoneId); // DEBUG
                             p.classList.remove('disabled');
                         } else { console.warn("DEBUG: Tentative d'activer un point invalide:", p); }
                    });
                    console.log(`DEBUG: ${points.length} points traités pour activation.`); // DEBUG
                } else { console.error("ERREUR: Aucun point de mise au jeu trouvé via querySelectorAll('.faceoff-point-wrapper') !"); } // DEBUG
                if(actionInfoDisplay) actionInfoDisplay.textContent = `Match démarré ! Période ${getPeriodText(matchData.currentPeriod)}. Cliquez sur une zone.`; window.addEventListener('beforeunload', warnBeforeLeaving); calculateAndRenderAllStats(); updateUndoButtonState(); console.log("Match démarré:", matchData);
            }
        });
    }

    function endMatch() { /* ... (inchangé) ... */ if (!matchStarted || !matchData) return; const previousMatchStarted = matchStarted; const previousEndTime = matchData.endTime; requestAnimationFrame(() => { if (confirm("Terminer et sauvegarder ?")) { matchStarted = false; matchData.endTime = Date.now(); try { localStorage.setItem(matchData.id, JSON.stringify(matchData)); console.log("Match sauvegardé:", matchData.id); alert(`Match terminé & sauvegardé !\nID: ${matchData.id}`); window.removeEventListener('beforeunload', warnBeforeLeaving); location.reload(); } catch (error) { console.error("Erreur sauvegarde match:", error); let errorMessage = "ERREUR : Sauvegarde match échouée !"; if (error.name === 'QuotaExceededError') errorMessage += "\nStockage navigateur plein ?"; errorMessage += "\nDonnées NON sauvegardées."; showConfirmation(actionInfoDisplay, errorMessage, 15000, true); matchStarted = previousMatchStarted; matchData.endTime = previousEndTime; } } }); }
    function cancelMatch() { /* ... (inchangé) ... */ if (!matchStarted) return; requestAnimationFrame(() => { if (confirm("Annuler match ? Données perdues.")) { matchStarted = false; const matchId = matchData?.id; matchData = null; window.removeEventListener('beforeunload', warnBeforeLeaving); alert("Match annulé."); console.log(`Match ${matchId} annulé.`); location.reload(); } }); }
    function warnBeforeLeaving(event) { /* ... (inchangé) ... */ if (matchStarted && matchData && !matchData.endTime) { event.preventDefault(); event.returnValue = 'Données match perdues si vous quittez.'; return event.returnValue; } }
    function changePeriod(direction) { /* ... (inchangé) ... */ if (!matchStarted || !matchData) return; let newPeriod = matchData.currentPeriod + direction; if (newPeriod < 1) newPeriod = 1; if (newPeriod > MAX_PERIODS) newPeriod = MAX_PERIODS; if (newPeriod === matchData.currentPeriod) return; matchData.currentPeriod = newPeriod; updatePeriodDisplay(newPeriod); const periodText = getPeriodText(newPeriod); if(actionInfoDisplay) actionInfoDisplay.textContent = `Période ${periodText}. Cliquez sur une zone.`; resetFaceoffSelection(); }

    // --- Initialisation ---
    function init() {
        // Vérifie dépendances utils.js
        if (typeof faceoffPointsDefs === 'undefined' || typeof zoneMapping === 'undefined' || typeof slugify === 'undefined' || typeof showConfirmation === 'undefined') { const errorMsg = "ERREUR: utils.js manque ou mal chargé!"; alert(errorMsg); console.error(errorMsg); if(startMatchBtn) startMatchBtn.disabled = true; return; }
        // Listeners
        if(startMatchBtn) startMatchBtn.addEventListener('click', startMatch); if(endMatchBtn) endMatchBtn.addEventListener('click', endMatch); if(cancelMatchBtn) cancelMatchBtn.addEventListener('click', cancelMatch); if(undoLastBtn) undoLastBtn.addEventListener('click', handleUndoLastFaceoff); if(opponentSelect) opponentSelect.addEventListener('change', handleOpponentSelection); if(prevPeriodBtn) prevPeriodBtn.addEventListener('click', () => changePeriod(-1)); if(nextPeriodBtn) nextPeriodBtn.addEventListener('click', () => changePeriod(1));
        if(rinkImageWrapper) { rinkImageWrapper.addEventListener('click', handleFaceoffClick); console.log("Listener clic rink ajouté."); } else { console.error("ERREUR CRITIQUE: rinkImageWrapper non trouvé!"); }
        if(homePlayerListUl) homePlayerListUl.addEventListener('click', handlePlayerListClick); if(awayPlayerListUl) awayPlayerListUl.addEventListener('click', handlePlayerListClick); if(winnerConfirmBar) winnerConfirmBar.addEventListener('click', handleWinnerConfirmation);
        // Setup
        defineAndRenderFaceoffPoints(); if (!loadMasterTeam()) { checkMatchStartConditions(); return; } populateOpponentSelectMatch(); handleOpponentSelection(); updateUndoButtonState(); resetFaceoffSelection();
    }
    init();

}); // End DOMContentLoaded
// --- FIN DU CODE COMPLET pour match.js ---