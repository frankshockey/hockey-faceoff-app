// stats.js (Version Finale - Export CSV Tableau + Export TXT Joueur/Zone)
'use strict';

// Vérification initiale des dépendances de utils.js
// S'assure que TOUTES les fonctions nécessaires sont là
if (typeof faceoffPointsDefs === 'undefined' || typeof zoneMapping === 'undefined' || typeof generatePlayerStatsCsv !== 'function' || typeof downloadFile !== 'function' || typeof showConfirmation !== 'function' || typeof getStoredTeamData !== 'function' || typeof slugify !== 'function' || typeof loadAndSetHeaderLogo !== 'function' ) {
    const missingFuncs = [
        (!faceoffPointsDefs || !zoneMapping) ? 'Definitions Zones' : null,
        (typeof generatePlayerStatsCsv !== 'function') ? 'generatePlayerStatsCsv' : null,
        (typeof downloadFile !== 'function') ? 'downloadFile' : null,
        (typeof showConfirmation !== 'function') ? 'showConfirmation' : null,
        (typeof getStoredTeamData !== 'function') ? 'getStoredTeamData' : null,
        (typeof slugify !== 'function') ? 'slugify' : null,
        (typeof loadAndSetHeaderLogo !== 'function') ? 'loadAndSetHeaderLogo' : null,
    ].filter(Boolean).join(', ');

    alert(`ERREUR CRITIQUE: Fonctions ou définitions manquantes depuis utils.js (${missingFuncs}). Vérifiez que utils.js est à jour et chargé avant stats.js.`);
    console.error(`stats.js: Dépendances manquantes depuis utils.js: ${missingFuncs}`);
    // Optionnel: throw new Error(`Dépendances utils.js manquantes: ${missingFuncs}`);
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("stats.js loaded.");

    let allMatches = [];
    let selectedFilterValue = 'all';
    let selectedViewMode = 'team'; // 'team' ou 'player'
    let selectedPlayerNumber = null; // Stocke le NUMÉRO du joueur sélectionné (string)
    // Variables pour stocker les dernières données calculées
    let currentAggregatedPlayerStats = null;
    let currentZoneStats = null; // <<< NOUVEAU: Pour stocker les stats de zone

    // --- DOM Element References ---
    const playerStatsTableBody = document.getElementById('player-stats-table-body');
    const totalMatchesElement = document.getElementById('total-matches');
    const totalFaceoffsElement = document.getElementById('total-faceoffs');
    const globalWinRateElement = document.getElementById('global-win-rate');
    const filterSelectElement = document.getElementById('stats-filter-select');
    const viewModeRadios = document.querySelectorAll('input[name="stats-view-mode"]');
    const playerSelectContainer = document.getElementById('player-select-container');
    const playerFilterSelect = document.getElementById('player-filter-select');
    const selectedPlayerStatsDisplay = document.getElementById('selected-player-stats-display');
    const playerStatsSection = document.getElementById('player-stats');
    const globalStatsTitle = document.querySelector('#global-stats h2');
    const playerStatsTitle = document.querySelector('#player-stats h2');
    const zoneStatsTitle = document.querySelector('#zone-stats-section h2');
    const zonePctDisplays = {}; // Sera rempli dans init
    const exportPlayerStatsCsvBtn = document.getElementById('export-player-stats-csv-btn');
    const statsConfirmationElement = document.getElementById('stats-confirmation'); // L'élément ajouté dans HTML


    // --- Data Loading & Calculation ---
    // NOTE: Ces fonctions sont candidates à être déplacées dans utils.js
    function loadMatchData() {
        console.log("Chargement données matchs...");
        allMatches = [];
        try { const keys = Object.keys(localStorage); for (const key of keys) { if (key.startsWith("match_")) { try { const matchData = getStoredTeamData(key); if (matchData?.id && matchData.events && matchData.masterTeam && matchData.opponentTeam) { allMatches.push(matchData); } else { console.warn(`Données invalides ignorées clé ${key}`); } } catch (error) { console.error(`Erreur parsing ${key}:`, error); } } } }
        catch (error) { console.error("Erreur accès localStorage:", error); if(statsConfirmationElement) showConfirmation(statsConfirmationElement, "Erreur chargement données locales.", 6000, true); return; }
        allMatches.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
        console.log(`${allMatches.length} match(s) chargé(s).`);
        populateFilterOptions();
        updateStatsDisplay(); // Lance la première MAJ
    }

    function populateFilterOptions() {
        // Fonction pour peupler le filtre de match (inchangée)
        if (!filterSelectElement) return;
        const selectedValue = filterSelectElement.value;
        filterSelectElement.innerHTML = '<option value="all">All Games</option>';
        allMatches.forEach(match => {
             const option = document.createElement('option'); option.value = match.id;
             const date = match.startTime ? new Date(match.startTime).toLocaleDateString('fr-CA') : '?';
             const masterName = match.masterTeam?.name || 'Master'; const opponentName = match.opponentTeam?.name || '?';
             option.textContent = `Game: ${masterName} vs ${opponentName} (${date})`;
             filterSelectElement.appendChild(option);
         });
         filterSelectElement.value = selectedValue && filterSelectElement.querySelector(`option[value="${selectedValue}"]`) ? selectedValue : 'all';
    }

    // Calcul Stats Agrégées (inchangée fonctionnellement)
    function calculateAggregatedPlayerStats(matchesToDisplay) {
        const aggregated = { totalFaceoffs: 0, totalMasterWins: 0, players: {} };
        matchesToDisplay.forEach(match => { if (match?.events) { match.events.forEach(event => { if (event?.type === 'faceoff') { aggregated.totalFaceoffs++; if (event.winner === 'home') aggregated.totalMasterWins++; if (event.homePlayerId) { const playerId = event.homePlayerId; const number = playerId.split('-')[0] || '?'; if (number !== '?' && !aggregated.players[playerId]) { aggregated.players[playerId] = { id: playerId, number: number, totalPlayed: 0, totalWins: 0 }; } if (aggregated.players[playerId]) { aggregated.players[playerId].totalPlayed++; if (event.winner === 'home') aggregated.players[playerId].totalWins++; } } } }); } });
        console.log("Stats agrégées calculées:", aggregated);
        return aggregated;
    }


    // --- Filtering Logic and UI Update ---
    function populatePlayerFilterOptions(aggregatedStats) {
        // Fonction pour peupler le filtre joueur (inchangée)
        if (!playerFilterSelect) return;
        const selectedValue = playerFilterSelect.value;
        playerFilterSelect.innerHTML = '<option value="">-- Select Player --</option>';
        const playersMap = aggregatedStats?.players || {};
        const playerNumbers = [...new Set(Object.values(playersMap).map(p => p.number))].filter(Boolean).map(n => parseInt(n, 10)).filter(n => !isNaN(n)).sort((a, b) => a - b);
        playerNumbers.forEach(number => { const option = document.createElement('option'); option.value = number; option.textContent = `Player #${number}`; playerFilterSelect.appendChild(option); });
        playerFilterSelect.value = selectedValue && playerFilterSelect.querySelector(`option[value="${selectedValue}"]`) ? selectedValue : '';
    }

    function handleFilterChange(event) { selectedFilterValue = event.target.value || 'all'; updateStatsDisplay(); }
    function handleViewModeChange(event) { selectedViewMode = event.target.value; if (selectedViewMode === 'player') { playerSelectContainer.style.display = 'block'; } else { playerSelectContainer.style.display = 'none'; if (playerFilterSelect) playerFilterSelect.value = ''; selectedPlayerNumber = null; if(selectedPlayerStatsDisplay) selectedPlayerStatsDisplay.innerHTML = ''; } updateStatsDisplay(); }
    function handlePlayerFilterChange(event) { selectedPlayerNumber = event.target.value || null; updateStatsDisplay(); }


    // Fonction principale MAJ affichage (MODIFIÉE pour gérer bouton export dans les 2 modes)
    function updateStatsDisplay() {
        console.log(`MAJ Affichage : Match=${selectedFilterValue}, Mode=${selectedViewMode}, Joueur=${selectedPlayerNumber}`);
        let matchesToDisplay = []; let titleSuffix = "(All Games)"; let playerSuffix = ""; let currentMatch = null;

        if (selectedFilterValue === 'all') { matchesToDisplay = allMatches; }
        else { currentMatch = allMatches.find(match => match.id === selectedFilterValue); if(currentMatch){ matchesToDisplay = [currentMatch]; const d=currentMatch.startTime?new Date(currentMatch.startTime).toLocaleDateString('fr-CA'):'?';const o=currentMatch.opponentTeam?.name||'?';const m=currentMatch.masterTeam?.name||'Master';titleSuffix=`(Match: ${m} vs ${o} - ${d})`;} else {matchesToDisplay=allMatches; titleSuffix="(All Games - Erreur Filtre)"; if(filterSelectElement)filterSelectElement.value='all'; selectedFilterValue='all';} }

        // *** Stocke les stats calculées ***
        currentAggregatedPlayerStats = calculateAggregatedPlayerStats(matchesToDisplay);

        populatePlayerFilterOptions(currentAggregatedPlayerStats);
        if(selectedViewMode === 'player' && selectedPlayerNumber && playerFilterSelect) { playerFilterSelect.value = selectedPlayerNumber; }
        else if (selectedViewMode === 'player' && !selectedPlayerNumber && playerFilterSelect) { playerFilterSelect.value = ''; }
        if (selectedViewMode === 'player' && selectedPlayerNumber) { playerSuffix = `(Joueur #${selectedPlayerNumber})`; }

        // MAJ Titres
        if (globalStatsTitle) globalStatsTitle.textContent = `Overall Statistics ${titleSuffix}`;
        if (playerStatsTitle) playerStatsTitle.textContent = `Player Statistics (Master) ${titleSuffix}`;
        if (zoneStatsTitle) zoneStatsTitle.textContent = `Zone Statistics ${playerSuffix} ${titleSuffix}`;

        // Affichage sections et MAJ visibilité/texte bouton export
        displayGlobalStats(matchesToDisplay, currentAggregatedPlayerStats);

        if (exportPlayerStatsCsvBtn) { // Vérifie si le bouton existe
            if (selectedViewMode === 'team') {
                if (playerStatsSection) playerStatsSection.style.display = 'block';
                displayPlayerTable(currentAggregatedPlayerStats);
                if (selectedPlayerStatsDisplay) selectedPlayerStatsDisplay.innerHTML = '';
                // Bouton pour export TABLEAU
                const hasTableData = currentAggregatedPlayerStats?.players && Object.keys(currentAggregatedPlayerStats.players).length > 0;
                exportPlayerStatsCsvBtn.textContent = '📄 Exporter Tableau (CSV)';
                exportPlayerStatsCsvBtn.style.display = hasTableData ? 'inline-block' : 'none';
                exportPlayerStatsCsvBtn.disabled = !hasTableData;
            } else { // player view
                if (playerStatsSection) playerStatsSection.style.display = 'none';
                displaySelectedPlayerStats(selectedPlayerNumber, currentAggregatedPlayerStats);
                // Bouton pour export VUE JOUEUR
                const hasPlayerData = !!selectedPlayerNumber; // Activé si un joueur est sélectionné
                exportPlayerStatsCsvBtn.textContent = '📄 Exporter Stats Joueur (.txt)';
                exportPlayerStatsCsvBtn.style.display = 'inline-block'; // Toujours visible en mode joueur
                exportPlayerStatsCsvBtn.disabled = !hasPlayerData; // Désactivé si aucun joueur sélectionné
            }
        } else {
             console.error("Bouton export non trouvé lors de la MAJ de l'affichage !");
        }

        // Appel stats zone (qui va stocker dans currentZoneStats)
        calculateAndDisplayZoneStats(matchesToDisplay, selectedPlayerNumber);
        console.log("Affichage mis à jour.");
    }


    // --- Fonctions d'Affichage ---
    function displayGlobalStats(matchesToDisplay, aggregatedStats) {
        // Affiche les stats globales (inchangé)
        if (!totalMatchesElement || !totalFaceoffsElement || !globalWinRateElement) { return; }
        const totalMatches = matchesToDisplay.length; const totalFaceoffs = aggregatedStats?.totalFaceoffs ?? 0; const totalMasterWins = aggregatedStats?.totalMasterWins ?? 0;
        const globalWinRate = (totalFaceoffs === 0) ? 0 : (totalMasterWins / totalFaceoffs) * 100;
        totalMatchesElement.textContent = totalMatches; totalFaceoffsElement.textContent = totalFaceoffs;
        globalWinRateElement.textContent = totalFaceoffs > 0 ? `${globalWinRate.toFixed(1)}%` : '-';
    }

    function displayPlayerTable(aggregatedStats) {
        // Affiche le tableau des joueurs (utilise template literals)
        if (!playerStatsTableBody) { console.error("Table body #player-stats-table-body not found!"); return; }
        const playerStatsMap = aggregatedStats?.players || {};
        const playerStatsArray = Object.values(playerStatsMap).map(stats => { stats.winPct = (stats.totalPlayed === 0) ? 0 : ((stats.totalWins / stats.totalPlayed) * 100); stats.winPct = isNaN(stats.winPct) ? 0 : stats.winPct; return stats; }).sort((a, b) => parseInt(a.number) - parseInt(b.number));
        playerStatsTableBody.innerHTML = '';
        if (playerStatsArray.length === 0) { playerStatsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No player data for this filter.</td></tr>'; return; }
        playerStatsArray.forEach(stats => { const row = playerStatsTableBody.insertRow(); row.innerHTML = `<td class="number-col">${stats.number ?? '?'}</td><td class="number-col">${stats.totalPlayed ?? 0}</td><td class="number-col">${stats.totalWins ?? 0}</td><td class="pct-col">${stats.winPct.toFixed(1)}%</td>`; });
    }

    function displaySelectedPlayerStats(playerNumber, aggregatedStats) {
        // Affiche les stats détaillées d'un joueur (utilise template literals)
        if (!selectedPlayerStatsDisplay) return; if (!playerNumber) { selectedPlayerStatsDisplay.innerHTML = '<p>Select a player from the menu above.</p>'; return; } let playerData = null; const playersMap = aggregatedStats?.players || {};
        for (const pId in playersMap) { if (playersMap[pId].number === playerNumber) { playerData = playersMap[pId]; break; } }
        if (!playerData) { selectedPlayerStatsDisplay.innerHTML = `<p>No data found for Player #${playerNumber} in this filter.</p>`; return; }
        const fot = playerData.totalPlayed ?? 0; const fow = playerData.totalWins ?? 0; const fol = fot - fow; const winPct = (fot === 0) ? 0 : (fow / fot) * 100;
        selectedPlayerStatsDisplay.innerHTML = `<h3>Stats for Player #${playerData.number ?? '?'}</h3><p><strong>FOT:</strong> ${fot}</p><p><strong>FOW:</strong> ${fow}</p><p><strong>FOL:</strong> ${fol}</p><p><strong>%:</strong> ${winPct.toFixed(1)}%</p>`;
    }

    // Calcule ET STOCKE les stats de zone (MODIFIÉE pour stocker)
    function calculateAndDisplayZoneStats(matchesToDisplay, selectedPlayerNum) {
        console.log("Calcul stats zone pour", matchesToDisplay.length, "match(s)", selectedPlayerNum ? `et joueur #${selectedPlayerNum}` : "");
        currentZoneStats = null; // Réinitialise avant calcul
        if (typeof faceoffPointsDefs === 'undefined' || typeof zoneMapping === 'undefined') { console.error("Definitions zones manquantes!"); return; }
        // Vérifie si zonePctDisplays est peuplé (fait dans init)
        if (!zonePctDisplays || Object.keys(zonePctDisplays).length < 12 || !zonePctDisplays['DZ']) { console.error("Refs DOM mini-patinoire (zonePctDisplays) non peuplées!"); return; }

        const pointStats = {}; faceoffPointsDefs.forEach(p => { pointStats[p.id] = { played: 0, wins: 0 }; });
        const zoneSummaryStats = { 'DZ': { played: 0, wins: 0 }, 'NZ': { played: 0, wins: 0 }, 'OZ': { played: 0, wins: 0 } };
        let filteredEventsCount = 0;

        // Itération sur les événements pour calculer les stats
        matchesToDisplay.forEach(match => { if (match?.events) { match.events.forEach(event => { if (event?.type === 'faceoff' && event.zoneId && pointStats[event.zoneId]) { let includeEvent = true; if (selectedPlayerNum && event.homePlayerId) { const eventPlayerNumber = event.homePlayerId.split('-')[0]; if (eventPlayerNumber !== selectedPlayerNum) { includeEvent = false; } } else if (selectedPlayerNum && !event.homePlayerId) { includeEvent = false; } if (includeEvent) { filteredEventsCount++; pointStats[event.zoneId].played++; if (event.winner === 'home') { pointStats[event.zoneId].wins++; } } } }); } });
        console.log(`Nb événements MÀJ pour zones: ${filteredEventsCount}`);

        // *** Stockage des résultats calculés ***
        currentZoneStats = { pointStats, zoneSummaryStats };

        // Mise à jour affichage 9 points
        for (const pointId in pointStats) { const stats = pointStats[pointId]; const element = zonePctDisplays[pointId]; if (element) { const pct = (stats.played === 0) ? 0 : (stats.wins / stats.played) * 100; element.textContent = stats.played > 0 ? `${pct.toFixed(0)}%` : '-'; element.classList.remove('win', 'loss'); if (stats.played > 0) { element.classList.add(pct >= 50 ? 'win' : 'loss'); } } }
        // Calcul (redondant) et MAJ affichage 3 zones
        for (const pointId in pointStats) { const summaryZone = zoneMapping[pointId]; if (summaryZone) { zoneSummaryStats[summaryZone].played += pointStats[pointId].played; zoneSummaryStats[summaryZone].wins += pointStats[pointId].wins; } } // Recalcul pour affichage
        for (const zoneId of ['DZ', 'NZ', 'OZ']) { const stats = zoneSummaryStats[zoneId]; const element = zonePctDisplays[zoneId]; if (element) { const pct = (stats.played === 0) ? 0 : (stats.wins / stats.played) * 100; element.textContent = stats.played > 0 ? `${pct.toFixed(0)}%` : '-'; element.classList.remove('win', 'loss'); if (stats.played > 0) { element.classList.add(pct >= 50 ? 'win' : 'loss'); } } }
        console.log("Stats mini-patinoire mises à jour ET stockées dans currentZoneStats.");
    }


    // --- GESTION EXPORT (MODIFIÉE pour gérer les 2 modes) ---

    // NOUVEAU: Fonction pour formater l'export TXT du joueur
    function formatPlayerDetailText(playerData, zoneData, playerNumber, filterDesc) {
        let content = `Statistiques pour Joueur #${playerNumber}\n`;
        content += `Filtre: ${filterDesc}\n`;
        content += `-------------------------------------\n\n`;
        content += `Stats Résumé:\n`;
        if (playerData) { const fot = playerData.totalPlayed ?? 0; const fow = playerData.totalWins ?? 0; const fol = fot - fow; const winPct = (fot === 0) ? 0 : (fow / fot) * 100; content += `  Mises au jeu jouées (FOT): ${fot}\n`; content += `  Mises au jeu gagnées (FOW): ${fow}\n`; content += `  Mises au jeu perdues (FOL): ${fol}\n`; content += `  Taux de Victoire: ${winPct.toFixed(1)}%\n`; }
        else { content += `  (Aucune donnée de résumé trouvée)\n`; }
        content += `\n`;
        content += `Stats par Zone (% Victoire):\n`;
        if (zoneData?.zoneSummaryStats) { for (const zoneId of ['DZ', 'NZ', 'OZ']) { const stats = zoneData.zoneSummaryStats[zoneId]; const pct = (stats.played === 0) ? 0 : (stats.wins / stats.played) * 100; content += `  ${zoneId}: ${stats.played > 0 ? pct.toFixed(0) + '%' : '-'} (${stats.wins}/${stats.played})\n`; } }
        else { content += `  (Aucune donnée de zone sommaire trouvée)\n`; }
        content += `\n`;
        content += `Stats par Point de MÀJ (% Victoire):\n`;
        if (zoneData?.pointStats && typeof faceoffPointsDefs !== 'undefined') {
            // Utilise l'ordre défini dans faceoffPointsDefs pour l'affichage
            faceoffPointsDefs.forEach(pointDef => {
                 const pointId = pointDef.id;
                 const stats = zoneData.pointStats[pointId]; // Récupère les stats calculées
                 if(stats){
                     const pct = (stats.played === 0) ? 0 : (stats.wins / stats.played) * 100;
                     content += `  ${pointDef.name} (${pointId}): ${stats.played > 0 ? pct.toFixed(0) + '%' : '-'} (${stats.wins}/${stats.played})\n`;
                 } else {
                      content += `  ${pointDef.name} (${pointId}): - (0/0)\n`; // Affiche si pas de données
                 }
            });
        } else { content += `  (Aucune donnée par point trouvée)\n`; }
        return content;
    }

    // Gestionnaire de clic export (MODIFIÉ)
    function handleDirectExportClick() {
        console.log(`Clic sur Export (Mode: ${selectedViewMode})`);

        // Vérifie si les fonctions utilitaires existent
        if (typeof downloadFile !== 'function' || typeof getStoredTeamData !== 'function' || typeof slugify !== 'function') {
            showConfirmation(statsConfirmationElement, "Erreur: Fonctions export/utilitaires manquantes.", 5000, true); return;
        }

        if (selectedViewMode === 'team') {
            // ----- LOGIQUE EXPORT TABLEAU CSV -----
            if (!currentAggregatedPlayerStats?.players || Object.keys(currentAggregatedPlayerStats.players).length === 0) { showConfirmation(statsConfirmationElement, "Aucune donnée de tableau à exporter.", 4000, true); return; }
            if (typeof generatePlayerStatsCsv !== 'function') { showConfirmation(statsConfirmationElement, "Erreur: Fonction generatePlayerStatsCsv manquante.", 5000, true); return; }

            const masterTeamData = getStoredTeamData(localStorage.getItem('masterTeamKey')); const masterRoster = masterTeamData?.roster || [];
            let csvContent; try { csvContent = generatePlayerStatsCsv(currentAggregatedPlayerStats.players, masterRoster); } catch (error) { console.error("Erreur génération CSV:", error); showConfirmation(statsConfirmationElement, "Erreur création contenu CSV.", 5000, true); return; }
            let filename = "export-stats-joueurs-tableau";
            if (selectedFilterValue === 'all') { filename += "-tous-matchs.csv"; }
            else { const matchInfo = allMatches.find(m => m.id === selectedFilterValue); if (matchInfo) { const date = matchInfo.startTime ? new Date(matchInfo.startTime).toISOString().split('T')[0] : 'date'; const oppNameSlug = slugify(matchInfo.opponentTeam?.name || 'adv').substring(0,15); filename += `-${oppNameSlug}-${date}.csv`; } else { filename += "-selection.csv"; } }
            try { downloadFile(csvContent, filename, 'text/csv;charset=utf-8;'); showConfirmation(statsConfirmationElement, `Export CSV Tableau "${filename}" lancé.`, 5000); }
            catch(error) { console.error("Erreur téléchargement CSV:", error); showConfirmation(statsConfirmationElement, "Erreur lancement téléchargement CSV.", 5000, true); }

        } else if (selectedViewMode === 'player') {
            // ----- LOGIQUE EXPORT VUE JOUEUR (TXT) -----
            if (!selectedPlayerNumber) { showConfirmation(statsConfirmationElement, "Aucun joueur sélectionné pour l'export.", 4000, true); return; }
            if (!currentAggregatedPlayerStats || !currentZoneStats) { showConfirmation(statsConfirmationElement, "Données joueur ou zone non disponibles pour l'export.", 4000, true); return; }

            let specificPlayerData = null; const playersMap = currentAggregatedPlayerStats?.players || {};
            for (const pId in playersMap) { if (playersMap[pId].number === selectedPlayerNumber) { specificPlayerData = playersMap[pId]; break; } }

            let filterDesc = "Tous les matchs"; if (selectedFilterValue !== 'all') { const matchInfo = allMatches.find(m => m.id === selectedFilterValue); if (matchInfo) { const date = matchInfo.startTime ? new Date(matchInfo.startTime).toLocaleDateString('fr-CA') : '?'; const oppName = matchInfo.opponentTeam?.name || '?'; filterDesc = `Match vs ${oppName} (${date})`; } else { filterDesc = "Match spécifique"; } }

            // Appel de la nouvelle fonction de formatage
            const textContent = formatPlayerDetailText(specificPlayerData, currentZoneStats, selectedPlayerNumber, filterDesc);

            // Création nom de fichier
            let filename = `export-joueur-${selectedPlayerNumber}`;
            if (selectedFilterValue === 'all') { filename += "-tous-matchs.txt"; }
            else { const matchInfo = allMatches.find(m => m.id === selectedFilterValue); if (matchInfo) { const date = matchInfo.startTime ? new Date(matchInfo.startTime).toISOString().split('T')[0] : 'date'; const oppNameSlug = slugify(matchInfo.opponentTeam?.name || 'adv').substring(0,15); filename += `-${oppNameSlug}-${date}.txt`; } else { filename += "-selection.txt"; } }

            // Lance téléchargement TXT
             try { downloadFile(textContent, filename, 'text/plain;charset=utf-8;'); showConfirmation(statsConfirmationElement, `Export TXT Joueur "${filename}" lancé.`, 5000); }
             catch(error) { console.error("Erreur téléchargement TXT:", error); showConfirmation(statsConfirmationElement, "Erreur lancement téléchargement TXT.", 5000, true); }
        }
    }


    // --- Initialisation ---
    function init() {
        console.log("stats.js: init() start.");

        // Remplissage refs mini-patinoire (avec correction)
        console.log("Remplissage zonePctDisplays...");
        if (typeof faceoffPointsDefs !== 'undefined') {
            faceoffPointsDefs.forEach(point => {
                 const elementId = `zone-pct-display-${point.id}`;
                 const element = document.getElementById(elementId);
                 if(element) { zonePctDisplays[point.id] = element; }
                 else { console.warn(`Element mini-patinoire non trouvé: #${elementId}`); }
            });
        } else { console.error("faceoffPointsDefs non défini !"); }
        ['DZ', 'NZ', 'OZ'].forEach(zoneId => {
             const elementId = `zone-pct-display-${zoneId.toLowerCase()}`;
             const element = document.getElementById(elementId);
             if(element){ zonePctDisplays[zoneId] = element; }
             else { console.warn(`Element mini-patinoire non trouvé: #${elementId}`); }
        });
        if(!zonePctDisplays['DZ'] || !zonePctDisplays['NZ'] || !zonePctDisplays['OZ'] || Object.keys(zonePctDisplays).length < 12 ) {
             console.error("Certains éléments DOM pour la mini-patinoire sont manquants ! Vérifiez les IDs dans stats.html");
        } else { console.log("Références éléments mini-patinoire OK."); }

        // Charge logo header
        if(typeof loadAndSetHeaderLogo === 'function'){ loadAndSetHeaderLogo('header-logo'); } else { console.error("loadAndSetHeaderLogo() not found."); }

        // Vérification autres éléments DOM essentiels
        const elementsToVerify = { filterSelectElement, viewModeRadios, playerSelectContainer, playerFilterSelect, selectedPlayerStatsDisplay, playerStatsTableBody, totalMatchesElement, totalFaceoffsElement, globalWinRateElement, playerStatsSection, globalStatsTitle, playerStatsTitle, zoneStatsTitle, exportPlayerStatsCsvBtn, statsConfirmationElement };
        let missingElement = false;
        for(const key in elementsToVerify) { if (key === 'viewModeRadios'){ if (!elementsToVerify[key] || elementsToVerify[key].length === 0) console.warn(`DOM Element(s) '${key}' not found or empty.`); } else if (!elementsToVerify[key]){ console.error(`CRITICAL ERROR: DOM Element '${key}' not found! Check HTML ID.`); missingElement = true; } }
        if(missingElement){ alert("Erreur: Init page stats impossible (éléments manquants). Voir console."); return; }
        console.log("Références éléments DOM principaux OK.");

        // Attache les listeners
        filterSelectElement.addEventListener('change', handleFilterChange);
        viewModeRadios.forEach(radio => radio.addEventListener('change', handleViewModeChange));
        playerFilterSelect.addEventListener('change', handlePlayerFilterChange);
        exportPlayerStatsCsvBtn.addEventListener('click', handleDirectExportClick); // Unique handler
        console.log("Event listeners attachés.");

        // Charge les données initiales
        loadMatchData();
        console.log("stats.js: init() finished.");
    }

    // Lance l'initialisation
    init();

}); // End DOMContentLoaded
