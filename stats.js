// --- DEBUT DU CODE COMPLET POUR stats.js (Avec calculs et affichage mini-patinoire) ---
'use strict';

// Vérifie si les définitions de zones existent (devraient venir de utils.js)
if (typeof faceoffPointsDefs === 'undefined' || typeof zoneMapping === 'undefined') {
    alert("ERREUR: Les définitions des points de mise au jeu (faceoffPointsDefs ou zoneMapping) semblent manquantes. Assurez-vous que utils.js est correctement chargé AVANT stats.js et qu'il contient ces définitions.");
    console.error("faceoffPointsDefs ou zoneMapping non définis. Vérifiez utils.js et l'ordre des scripts HTML.");
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("stats.js loaded.");

    let allMatches = [];
    let selectedFilterValue = 'all';
    let selectedViewMode = 'team';
    let selectedPlayerNumber = null; // Stocke le NUMÉRO du joueur (string)

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
    const zoneStatsTitle = document.querySelector('#zone-stats-section h2'); // AJOUTÉ

    // AJOUTÉ : Références pour les 12 affichages de pourcentage de zone
    const zonePctDisplays = {}; // Utilise un objet pour un accès facile par ID
    if (typeof faceoffPointsDefs !== 'undefined') { // Vérifie si la définition existe
        faceoffPointsDefs.forEach(point => {
             zonePctDisplays[point.id] = document.getElementById(`zone-pct-display-${point.id}`);
        });
    }
    zonePctDisplays['DZ'] = document.getElementById('zone-pct-display-dz');
    zonePctDisplays['NZ'] = document.getElementById('zone-pct-display-nz');
    zonePctDisplays['OZ'] = document.getElementById('zone-pct-display-oz');
    // Vérification rapide si tous les éléments ont été trouvés
    console.log("Zone Pct Display Elements:", zonePctDisplays);


    // --- Helper Functions --- (From utils.js)

    // --- Data Loading ---
    function getStoredTeamData(key) { /* ... (inchangé) ... */ try { const dataString = localStorage.getItem(key); if (!dataString) { console.warn(`Key ${key} empty.`); return null; } return JSON.parse(dataString); } catch (e) { console.error(`Error parsing ${key}:`, e); return null; } }

    function loadMatchData() {
        console.log("Loading match data...");
        allMatches = [];
        try { const keys = Object.keys(localStorage); for (const key of keys) { if (key.startsWith("match_")) { try { const matchDataString = localStorage.getItem(key); if (matchDataString) { const matchData = JSON.parse(matchDataString); if (matchData && typeof matchData === 'object' && matchData.id && matchData.events && matchData.opponentTeam && matchData.masterTeam) { allMatches.push(matchData); } else { console.warn(`Invalid data structure in ${key}, ignored.`, matchData); } } else { console.warn(`Key ${key} empty.`); } } catch (error) { console.error(`Error parsing JSON ${key}:`, error); } } } }
        catch (error) { console.error("Error accessing localStorage:", error); return; }
        console.log(`${allMatches.length} games loaded.`);
        allMatches.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
        populateFilterOptions();
        updateStatsDisplay();
    }

    // --- Filtering Logic and UI Update ---

    function populateFilterOptions() { /* ... (inchangé) ... */ if (!filterSelectElement) {console.error("Match filter select not found!"); return; } while (filterSelectElement.options.length > 1) { filterSelectElement.remove(1); } console.log("Populating game filter..."); const allOption = document.createElement('option'); allOption.value = 'all'; allOption.textContent = 'All Games'; filterSelectElement.appendChild(allOption); allMatches.forEach((match, index) => { if (!match || !match.id || !match.opponentTeam || !match.masterTeam ) { console.warn(`Invalid match structure index ${index}, skipped.`); return; } try { const option = document.createElement('option'); option.value = match.id; const date = match.startTime ? new Date(match.startTime).toLocaleDateString('en-CA') : '?'; const opponentName = match.opponentTeam.name || 'Unknown Opponent'; const masterName = match.masterTeam.name || 'Master'; option.textContent = `Game: ${masterName} vs ${opponentName} (${date})`; filterSelectElement.appendChild(option); } catch (error) { console.error(`ERROR creating option game index ${index}:`, error, match); } }); filterSelectElement.value = selectedFilterValue; console.log("Finished populating game filter."); }
    function populatePlayerFilterOptions(playerStats) { /* ... (inchangé) ... */ if (!playerFilterSelect) { console.error("Player select not found!"); return; } playerFilterSelect.innerHTML = '<option value="">-- Select Player --</option>'; const playerNumbers = [...new Set(Object.values(playerStats).map(p => p.number))].filter(num => num && num !== '?').map(num => parseInt(num, 10)).filter(num => !isNaN(num)).sort((a, b) => a - b); if (playerNumbers.length === 0) { console.warn("No valid player numbers for dropdown."); } playerNumbers.forEach(number => { const option = document.createElement('option'); option.value = number; option.textContent = `Player #${number}`; playerFilterSelect.appendChild(option); }); }
    function handleFilterChange(event) { const value = event.target.value; if (value === "") { selectedFilterValue = 'all'; filterSelectElement.value = 'all'; } else { selectedFilterValue = value; } console.log("Game filter selected:", selectedFilterValue); updateStatsDisplay(); }
    function handleViewModeChange(event) { selectedViewMode = event.target.value; console.log("View mode:", selectedViewMode); if (selectedViewMode === 'player') { if (playerSelectContainer) playerSelectContainer.style.display = 'block'; } else { if (playerSelectContainer) playerSelectContainer.style.display = 'none'; if (playerFilterSelect) playerFilterSelect.value = ''; selectedPlayerNumber = null; if(selectedPlayerStatsDisplay) selectedPlayerStatsDisplay.innerHTML = ''; } updateStatsDisplay(); }
    function handlePlayerFilterChange(event) { selectedPlayerNumber = event.target.value; console.log("Selected player number:", selectedPlayerNumber); updateStatsDisplay(); }

    // Fonction principale MAJ affichage
    function updateStatsDisplay() {
        let matchesToDisplay = []; let titleSuffix = "(All Games)"; let playerSuffix = ""; let currentMatch = null;
        if (selectedFilterValue === 'all') { matchesToDisplay = allMatches; }
        else { currentMatch = allMatches.find(match => match.id === selectedFilterValue); if (currentMatch) { matchesToDisplay = [currentMatch]; const date = currentMatch.startTime ? new Date(currentMatch.startTime).toLocaleDateString('en-CA') : '?'; const opponentName = currentMatch.opponentTeam?.name || '?'; const masterName = currentMatch.masterTeam?.name || 'Master'; titleSuffix = `(Game: ${masterName} vs ${opponentName} - ${date})`; }
            else { matchesToDisplay = allMatches; titleSuffix = "(All Games - Filter Error)"; if (filterSelectElement) filterSelectElement.value = 'all'; selectedFilterValue = 'all'; } }

        const aggregatedPlayerStats = calculateAggregatedPlayerStats(matchesToDisplay);
        populatePlayerFilterOptions(aggregatedPlayerStats.players); // Toujours peupler le select joueur

        if (selectedViewMode === 'player' && selectedPlayerNumber) {
             playerSuffix = `(Player #${selectedPlayerNumber})`; // Suffixe pour vue joueur
             // Garde la sélection du joueur si possible
             if(playerFilterSelect) { playerFilterSelect.value = selectedPlayerNumber; }
        }

        // Met à jour les titres H2
        if (globalStatsTitle) globalStatsTitle.textContent = `Overall Statistics ${titleSuffix}`;
        if (playerStatsTitle) playerStatsTitle.textContent = `Player Statistics (Master) ${titleSuffix}`;
        if (zoneStatsTitle) zoneStatsTitle.textContent = `Zone Statistics ${playerSuffix} ${titleSuffix}`; // Met à jour titre zone aussi

        // Affiche les bonnes sections / stats
        if (selectedViewMode === 'team') {
            displayGlobalStats(matchesToDisplay, aggregatedPlayerStats);
            displayPlayerTable(aggregatedPlayerStats);
            if (playerStatsSection) playerStatsSection.style.display = 'block';
            if (selectedPlayerStatsDisplay) selectedPlayerStatsDisplay.innerHTML = '';
        } else { // player view
            displayGlobalStats(matchesToDisplay, aggregatedPlayerStats);
            if (playerStatsSection) playerStatsSection.style.display = 'none';
            displaySelectedPlayerStats(selectedPlayerNumber, aggregatedPlayerStats);
        }

        // AJOUTÉ : Appel pour calculer et afficher les stats de zone
        calculateAndDisplayZoneStats(matchesToDisplay, selectedPlayerNumber);
    }

    // Calcule et RETOURNE les stats globales et agrégées par joueur
    function calculateAggregatedPlayerStats(matchesToDisplay) { /* ... (inchangé) ... */ const aggregated = { totalFaceoffs: 0, totalMasterWins: 0, players: {} }; matchesToDisplay.forEach(match => { if (match && Array.isArray(match.events)) { match.events.forEach(event => { if (event && event.type === 'faceoff') { aggregated.totalFaceoffs++; if (event.winner === 'home') { aggregated.totalMasterWins++; } if (event.homePlayerId) { const playerId = event.homePlayerId; if (!aggregated.players[playerId]) { const number = playerId.split('-')[0] || '?'; if(number && !isNaN(parseInt(number))) { aggregated.players[playerId] = { id: playerId, number: number, totalPlayed: 0, totalWins: 0 }; } else { console.warn("Invalid Master player ID found:", playerId); } } if (aggregated.players[playerId]) { aggregated.players[playerId].totalPlayed++; if (event.winner === 'home') { aggregated.players[playerId].totalWins++; } } } } }); } }); console.log("Aggregated stats calculated:", aggregated); return aggregated; }
    // Affiche les stats globales
    function displayGlobalStats(matchesToDisplay, aggregatedStats) { /* ... (inchangé) ... */ console.log("Displaying global stats for", matchesToDisplay.length, "game(s)"); if (!totalMatchesElement || !totalFaceoffsElement || !globalWinRateElement) { return; } const totalMatches = matchesToDisplay.length; const totalFaceoffs = aggregatedStats.totalFaceoffs; const totalMasterWins = aggregatedStats.totalMasterWins; const globalWinRate = (totalFaceoffs === 0) ? 0 : (totalMasterWins / totalFaceoffs) * 100; totalMatchesElement.textContent = totalMatches; totalFaceoffsElement.textContent = totalFaceoffs; globalWinRateElement.textContent = totalFaceoffs > 0 ? `${globalWinRate.toFixed(1)}%` : '-'; }
    // Affiche le tableau complet des joueurs
    function displayPlayerTable(aggregatedPlayerStats) { /* ... (inchangé - utilise '+') ... */ console.log("Affichage tableau (SANS BACKTICKS)..."); if (!playerStatsTableBody) { console.error("tbody non trouvé!"); return; } const playerStatsMap = aggregatedPlayerStats.players || {}; const playerStatsArray = Object.values(playerStatsMap).map(stats => { stats.winPct = (stats.totalPlayed === 0) ? 0 : (stats.totalWins / stats.totalPlayed) * 100; if (isNaN(stats.winPct)) { stats.winPct = 0; } return stats; }); playerStatsArray.sort((a, b) => parseInt(a.number) - parseInt(b.number)); playerStatsTableBody.innerHTML = ''; if (playerStatsArray.length === 0) { playerStatsTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No player data for this filter.</td></tr>'; return; } playerStatsArray.forEach(stats => { const row = playerStatsTableBody.insertRow(); row.innerHTML = '<td class="number-col">' + (stats.number ?? '?') + '</td>' + '<td class="number-col">' + (stats.totalPlayed ?? 0) + '</td>' + '<td class="number-col">' + (stats.totalWins ?? 0) + '</td>' + '<td class="pct-col">' + stats.winPct.toFixed(1) + '%</td>'; }); }
    // Affiche les stats pour UN joueur sélectionné
    function displaySelectedPlayerStats(playerNumber, aggregatedPlayerStats) { /* ... (inchangé - utilise '+') ... */ if (!selectedPlayerStatsDisplay) return; if (!playerNumber) { selectedPlayerStatsDisplay.innerHTML = '<p>Select a player from the menu above.</p>'; return; } let playerData = null; for (const pId in aggregatedPlayerStats.players) { if (aggregatedPlayerStats.players[pId].number === playerNumber) { playerData = aggregatedPlayerStats.players[pId]; break; } } if (!playerData) { selectedPlayerStatsDisplay.innerHTML = `<p>No data found for Player #${playerNumber} in this filter.</p>`; return; } const totalPlayed = playerData.totalPlayed ?? 0; const totalWins = playerData.totalWins ?? 0; const faceoffsLost = totalPlayed - totalWins; const winPct = (totalPlayed === 0) ? 0 : (totalWins / totalPlayed) * 100; selectedPlayerStatsDisplay.innerHTML = '<h3>Stats for Player #' + (playerData.number ?? '?') + '</h3>' + '<p><strong>FOT:</strong> ' + totalPlayed + '</p>' + '<p><strong>FOW:</strong> ' + totalWins + '</p>' + '<p><strong>FOL:</strong> ' + faceoffsLost + '</p>' + '<p><strong>%:</strong> ' + winPct.toFixed(1) + '%</p>'; }

    // AJOUTÉ : Fonction pour calculer et afficher les stats par zone
    function calculateAndDisplayZoneStats(matchesToDisplay, selectedPlayerNum) {
        console.log("Calcul stats par zone pour", matchesToDisplay.length, "match(s)", selectedPlayerNum ? `et joueur #${selectedPlayerNum}` : "");

        // Vérifie si les définitions sont chargées (depuis utils.js)
        if (typeof faceoffPointsDefs === 'undefined' || typeof zoneMapping === 'undefined') {
             console.error("Définitions des zones (faceoffPointsDefs/zoneMapping) non trouvées !");
             return;
        }

        // Initialise les compteurs pour les 9 points et les 3 zones
        const pointStats = {};
        faceoffPointsDefs.forEach(p => { pointStats[p.id] = { played: 0, wins: 0 }; });
        const zoneSummaryStats = { 'DZ': { played: 0, wins: 0 }, 'NZ': { played: 0, wins: 0 }, 'OZ': { played: 0, wins: 0 } };

        let filteredEventsCount = 0;

        // Itère sur les matchs filtrés
        matchesToDisplay.forEach(match => {
            if (match && Array.isArray(match.events)) {
                match.events.forEach(event => {
                    if (event && event.type === 'faceoff' && event.zoneId && pointStats[event.zoneId]) {
                        let includeEvent = true;

                        // Si un joueur est sélectionné, filtre sur ce joueur (Master = homePlayerId)
                        if (selectedPlayerNum && event.homePlayerId) {
                             const eventPlayerNumber = event.homePlayerId.split('-')[0];
                             if (eventPlayerNumber !== selectedPlayerNum) {
                                 includeEvent = false;
                             }
                        } else if (selectedPlayerNum && !event.homePlayerId) {
                             // Si on filtre par joueur mais l'event n'a pas de homePlayerId, on ignore
                             includeEvent = false;
                        }

                        if (includeEvent) {
                             filteredEventsCount++;
                             pointStats[event.zoneId].played++;
                             if (event.winner === 'home') {
                                 pointStats[event.zoneId].wins++;
                             }
                        }
                    }
                });
            }
        });

        console.log("Nombre d'événements MÀJ considérés pour les zones:", filteredEventsCount);

        // Met à jour l'affichage pour les 9 points
        for (const pointId in pointStats) {
            const stats = pointStats[pointId];
            const element = zonePctDisplays[pointId]; // Utilise l'objet des refs DOM
            if (element) {
                const pct = (stats.played === 0) ? 0 : (stats.wins / stats.played) * 100;
                element.textContent = stats.played > 0 ? `${pct.toFixed(0)}%` : '-';
                element.classList.remove('win', 'loss');
                if (stats.played > 0) {
                    element.classList.add(pct >= 50 ? 'win' : 'loss');
                }
            } else {
                 // console.warn(`Élément d'affichage non trouvé pour zone-pct-display-${pointId}`);
            }
        }

        // Calcule les stats pour les 3 zones principales à partir des stats des 9 points
        for (const pointId in pointStats) {
            const summaryZone = zoneMapping[pointId]; // Trouve la zone principale (DZ, NZ, OZ)
            if (summaryZone) {
                zoneSummaryStats[summaryZone].played += pointStats[pointId].played;
                zoneSummaryStats[summaryZone].wins += pointStats[pointId].wins;
            }
        }

        // Met à jour l'affichage pour les 3 zones principales
        for (const zoneId of ['DZ', 'NZ', 'OZ']) {
             const stats = zoneSummaryStats[zoneId];
             const element = zonePctDisplays[zoneId]; // Utilise l'objet des refs DOM
             if (element) {
                 const pct = (stats.played === 0) ? 0 : (stats.wins / stats.played) * 100;
                 element.textContent = stats.played > 0 ? `${pct.toFixed(0)}%` : '-';
                 element.classList.remove('win', 'loss');
                 if (stats.played > 0) {
                     element.classList.add(pct >= 50 ? 'win' : 'loss');
                 }
             } else {
                 // console.warn(`Élément d'affichage non trouvé pour zone-pct-display-${zoneId.toLowerCase()}`);
             }
         }
    }

    // --- Initialisation ---
    function init() {
        // Ajout des références DOM pour les % de zone avant l'init complet
        // (Déjà fait en haut maintenant avec l'objet zonePctDisplays)

        if (filterSelectElement) { filterSelectElement.addEventListener('change', handleFilterChange); } else { console.error("CRITICAL ERROR: #stats-filter-select not found!"); }
        if (viewModeRadios.length > 0) { viewModeRadios.forEach(radio => radio.addEventListener('change', handleViewModeChange)); } else { console.warn("Radios 'stats-view-mode' not found."); }
        if (playerFilterSelect) { playerFilterSelect.addEventListener('change', handlePlayerFilterChange); } else { console.warn("Select '#player-filter-select' not found."); }
        loadMatchData();
    }
    init();

}); // End DOMContentLoaded
// --- FIN DU CODE COMPLET POUR stats.js ---