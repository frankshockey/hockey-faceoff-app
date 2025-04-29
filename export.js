// export.js
'use strict';

document.addEventListener('DOMContentLoaded', () => {
    console.log("export.js loaded");

    let allMatches = []; // Pour stocker les données des matchs chargés

    // --- DOM Element References ---
    const gameFilterSelect = document.getElementById('export-game-filter-select');
    const exportCsvButton = document.getElementById('export-csv-button');
    const confirmationElement = document.getElementById('export-confirmation');
    const headerLogoImg = document.getElementById('header-logo'); // Pour le logo dynamique

    // --- Fonctions Utilitaires (attendues de utils.js) ---
    // S'assurer que slugify, showConfirmation, getStoredTeamData, loadAndSetHeaderLogo sont disponibles globalement
    if (typeof slugify !== 'function' || typeof showConfirmation !== 'function' || typeof getStoredTeamData !== 'function' || typeof loadAndSetHeaderLogo !== 'function') {
        console.error("ERREUR CRITIQUE: Une ou plusieurs fonctions de utils.js sont manquantes !");
        if (confirmationElement) showConfirmation(confirmationElement, "Erreur critique : fonctions utilitaires manquantes.", 10000, true);
        return; // Bloque l'exécution si les utilitaires ne sont pas là
    }

    // --- Logique de Chargement des Données ---
    // NOTE: Idéalement, ces fonctions (loadMatchData, populateGameFilter, calculateAggregatedPlayerStats)
    // devraient être dans utils.js pour être partagées avec stats.js.
    // Pour l'instant, on les ré-implémente/adapte ici.

    function loadMatchData() {
        console.log("Chargement des données des matchs pour l'export...");
        allMatches = [];
        try {
            const keys = Object.keys(localStorage);
            for (const key of keys) {
                if (key.startsWith("match_")) {
                    try {
                        const matchData = getStoredTeamData(key); // Utilise la fonction de utils.js
                        // Vérification minimale de la structure
                        if (matchData && matchData.id && matchData.events && matchData.masterTeam && matchData.opponentTeam) {
                            allMatches.push(matchData);
                        } else {
                            console.warn(`Données invalides ou structure incomplète ignorée pour la clé ${key}`);
                        }
                    } catch (error) { // Erreur de parsing JSON pour une clé match_*
                        console.error(`Erreur parsing match ${key}:`, error);
                    }
                }
            }
        } catch (error) { // Erreur d'accès à localStorage ou Object.keys
            console.error("Erreur lors de l'accès au localStorage:", error);
            showConfirmation(confirmationElement, "Erreur d'accès aux données locales.", 6000, true);
            return; // Arrête si on ne peut pas lire localStorage
        }
        allMatches.sort((a, b) => (b.startTime || 0) - (a.startTime || 0)); // Trie par date décroissante
        console.log(`${allMatches.length} match(s) chargé(s).`);
    }

    function populateGameFilter() {
        if (!gameFilterSelect) return;
        // Vide les options existantes (sauf la première "Tous les Matchs")
        while (gameFilterSelect.options.length > 1) {
            gameFilterSelect.remove(1);
        }

        allMatches.forEach(match => {
            const option = document.createElement('option');
            option.value = match.id; // Utilise l'ID du match comme valeur
            const date = match.startTime ? new Date(match.startTime).toLocaleDateString('fr-CA') : '?'; // Format YYYY-MM-DD
            const masterName = match.masterTeam?.name || 'Master';
            const opponentName = match.opponentTeam?.name || 'Adversaire';
            option.textContent = `Match: ${masterName} vs ${opponentName} (${date})`;
            gameFilterSelect.appendChild(option);
        });
    }

    // Fonction pour calculer les stats (similaire à stats.js)
    function calculateAggregatedPlayerStats(matchesToDisplay) {
        const aggregated = {
            players: {}, // Clé: playerId (ex: "10-joueur-nom"), Valeur: { id, number, totalPlayed, totalWins }
            // On pourrait ajouter d'autres stats globales si besoin
        };

        const masterKey = localStorage.getItem('masterTeamKey');
        if (!masterKey) return aggregated; // Pas d'équipe Master, pas de stats Master

        matchesToDisplay.forEach(match => {
            // Vérifie que le match utilise bien l'équipe Master actuelle (important si l'équipe Master a changé)
            // Note : on pourrait aussi stocker le nom/id de l'équipe Master DANS le match lors de l'enregistrement
            // Pour l'instant, on suppose que tous les matchs concernent l'équipe Master DÉFINIE ACTUELLEMENT
             if (!match.events) return;

            match.events.forEach(event => {
                if (event.type === 'faceoff' && event.homePlayerId) { // homePlayerId correspond aux joueurs Master
                    const playerId = event.homePlayerId;
                    const playerNumber = playerId.split('-')[0] || '?'; // Extrait le numéro

                     // Initialise le joueur dans l'agrégat s'il n'y est pas
                     if (!aggregated.players[playerId] && playerNumber !== '?') {
                          aggregated.players[playerId] = {
                              id: playerId,
                              number: playerNumber,
                              totalPlayed: 0,
                              totalWins: 0
                          };
                     }

                    // Met à jour les stats du joueur
                    if (aggregated.players[playerId]) {
                         aggregated.players[playerId].totalPlayed++;
                         if (event.winner === 'home') {
                             aggregated.players[playerId].totalWins++;
                         }
                    }
                }
            });
        });
        return aggregated;
    }

    // --- Logique d'Exportation CSV ---

    function generateCsvContent(playerStatsMap) {
        console.log("Génération contenu CSV...");
        // Récupère les infos de l'équipe Master pour Nom/Position
        const masterTeamData = getStoredTeamData(localStorage.getItem('masterTeamKey'));
        const masterRoster = masterTeamData?.roster || [];

        // Crée les en-têtes CSV
        // Note: FOL (Défaites) sera calculé. Win% aussi.
        let csvHeader = ["Numero", "Nom", "Position", "MÀJ Jouées (FOT)", "MÀJ Gagnées (FOW)", "MÀJ Perdues (FOL)", "Taux Victoire (%)"];
        let csvRows = [csvHeader.join(',')]; // Première ligne = en-têtes

        // Prépare les données pour le tri par numéro
        const playerStatsArray = Object.values(playerStatsMap);
        playerStatsArray.sort((a, b) => parseInt(a.number || 0) - parseInt(b.number || 0));


        // Crée une ligne CSV pour chaque joueur
        playerStatsArray.forEach(stats => {
            const playerInfo = masterRoster.find(p => p.number === stats.number); // Trouve nom/pos via numéro
            const name = playerInfo?.name || 'Inconnu';
            const position = playerInfo?.position || '?';

            const fot = stats.totalPlayed ?? 0;
            const fow = stats.totalWins ?? 0;
            const fol = fot - fow;
            const winPct = (fot === 0) ? 0 : (fow / fot) * 100;

             // Gère les virgules potentielles dans les noms en les entourant de guillemets doubles
             const csvName = name.includes(',') ? `"${name}"` : name;

            // Crée la ligne de données
            let row = [
                stats.number,
                csvName, // Nom potentiellement avec guillemets
                position,
                fot,
                fow,
                fol,
                winPct.toFixed(1) // Garde une décimale pour le %
            ];
            csvRows.push(row.join(',')); // Ajoute la ligne au tableau
        });

        return csvRows.join('\r\n'); // Joint toutes les lignes avec un retour chariot Windows/Standard CSV
    }

    function downloadCsv(csvContent, filename = 'export-stats-joueurs.csv') {
        console.log("Déclenchement téléchargement CSV:", filename);
        // Crée un Blob (Binary Large Object)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Crée un lien temporaire pour le téléchargement
        const link = document.createElement("a");
        if (link.download !== undefined) { // Vérifie si le navigateur supporte 'download'
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click(); // Simule le clic
            document.body.removeChild(link); // Nettoie le lien temporaire
            URL.revokeObjectURL(url); // Libère l'URL objet
            console.log("Téléchargement lancé.");
            showConfirmation(confirmationElement, `Fichier "${filename}" généré.`);
        } else {
            console.error("Attribut 'download' non supporté par ce navigateur.");
            showConfirmation(confirmationElement, "Erreur: Le téléchargement n'est pas supporté par ce navigateur.", 6000, true);
        }
    }

    function handleExportClick() {
        console.log("Clic sur bouton Export CSV");
        const selectedGameId = gameFilterSelect.value;
        let matchesToProcess = [];
        let filename = "export-stats-joueurs";

        if (selectedGameId === 'all') {
            matchesToProcess = allMatches;
            filename += "-tous-matchs.csv";
        } else {
            const selectedMatch = allMatches.find(match => match.id === selectedGameId);
            if (selectedMatch) {
                matchesToProcess = [selectedMatch];
                // Crée un nom de fichier plus spécifique
                const date = selectedMatch.startTime ? new Date(selectedMatch.startTime).toISOString().split('T')[0] : 'date-inconnue';
                const oppNameSlug = slugify(selectedMatch.opponentTeam?.name || 'adversaire').substring(0, 15); // Tronque si besoin
                filename += `-${oppNameSlug}-${date}.csv`;
            } else {
                showConfirmation(confirmationElement, "Erreur: Match sélectionné non trouvé.", 5000, true);
                return;
            }
        }

        if (matchesToProcess.length === 0 && selectedGameId !== 'all') {
             showConfirmation(confirmationElement, "Aucun match à traiter pour cette sélection.", 4000, true);
             return;
        }
         if (allMatches.length === 0) {
              showConfirmation(confirmationElement, "Aucun match enregistré à exporter.", 4000, true);
              return;
         }


        // Calcule les statistiques agrégées pour les matchs sélectionnés
        const aggregatedStats = calculateAggregatedPlayerStats(matchesToProcess);

        if (Object.keys(aggregatedStats.players).length === 0) {
            showConfirmation(confirmationElement, "Aucune statistique de joueur Master trouvée pour cette sélection.", 4000, true);
            return;
        }

        // Génère le contenu CSV
        const csvContent = generateCsvContent(aggregatedStats.players);

        // Déclenche le téléchargement
        downloadCsv(csvContent, filename);
    }

    // --- Initialisation ---
    function init() {
        // Charge le logo header
        loadAndSetHeaderLogo('header-logo'); // Utilise la fonction de utils.js

        // Charge les données et peuple le filtre
        loadMatchData();
        populateGameFilter();

        // Attache l'écouteur au bouton d'export
        if (exportCsvButton) {
            exportCsvButton.addEventListener('click', handleExportClick);
        } else {
            console.error("Bouton d'export CSV non trouvé !");
        }
    }

    // Lance l'initialisation
    init();

});