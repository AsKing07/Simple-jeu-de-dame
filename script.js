// ==========================================================================
//                              CONSTANTES & VARIABLES GLOBALES
// ==========================================================================

// Constantes du jeu
const size = 8;
const PLAYER_BLACK = 'black';
const PLAYER_WHITE = 'white';
const TIME_PER_TURN = 60;
const LOW_TIME_THRESHOLD = 10;

// Clés pour localStorage
const GAME_STATE_KEY = 'checkersGameState';
const HISTORY_KEY = 'checkersGameHistory';
const WINS_KEY = 'checkersWinCounts';

// Éléments du DOM (regroupés pour clarté)
const board = document.getElementById('board');
const blackScoreElement = document.getElementById('black-score');
const whiteScoreElement = document.getElementById('white-score');
const currentTurnElement = document.getElementById('current-turn');
const timerDisplayElement = document.getElementById('timer-display');
const timerContainerElement = document.querySelector('.timer');
const notificationsContainer = document.getElementById('notifications');
// -- Navigation & Sections --
const navButtons = document.querySelectorAll('.main-nav .nav-button');
const appSections = document.querySelectorAll('.app-section');
// -- Setup Section --
const playerSetupDiv = document.querySelector('.player-setup');
const startGameButton = document.getElementById('start-game-button');
const playerBlackNameInput = document.getElementById('player-black-name');
const playerWhiteNameInput = document.getElementById('player-white-name');
const loadGameButton = document.getElementById('load-game-button');
const pauseButton = document.getElementById('pause-button');
// -- Game Section --
const blackPlayerLabel = document.getElementById('black-player-label');
const whitePlayerLabel = document.getElementById('white-player-label');
const resetButton = document.getElementById('reset-button'); // Bouton "Nouvelle Partie" dans la section jeu
const resignButton = document.getElementById('resign-button');
// -- Stats Section --
const winCountsList = document.getElementById('win-counts-list');
const gameHistoryDiv = document.getElementById('game-history');
const gameHistoryTableBody = document.getElementById('game-history-list'); // tbody de la table historique

// État du jeu (variables globales)
let selectedPiece = null;
let blackScore = 0;
let whiteScore = 0;
let currentPlayer = PLAYER_BLACK;
let possibleMoves = [];
let captureIsMandatory = false;
let movesSincePawnOrCapture = 0;
let gameIsOver = false;
let gameIsPaused = false;
let timerInterval = null;
let remainingTime = 0;
let playerBlackName = 'Noir'; // Nom par défaut
let playerWhiteName = 'Blanc'; // Nom par défaut

// ==========================================================================
//                              NAVIGATION & AFFICHAGE SECTIONS
// ==========================================================================

/**
 * Affiche la section spécifiée et masque les autres. Met à jour le bouton de nav actif.
 * @param {string} sectionId - L'ID de la section à afficher.
 */
function showSection(sectionId) {
    appSections.forEach(section => {
        section.classList.remove('active-section');
        if (section.id === sectionId) {
            section.classList.add('active-section');
        }
    });

    navButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.section === sectionId) {
            button.classList.add('active');
        }
        // Activer/Désactiver le bouton "Jeu en cours"
        if (button.dataset.section === 'game-section') {
            button.disabled = !isGameActive(); // Désactiver si pas de jeu actif
        }
    });

    // Si on affiche la section stats, mettre à jour les données
    if (sectionId === 'stats-section') {
        displayWinCounts();
        displayGameHistory();
    }
}

/**
 * Vérifie si une partie est considérée comme active (non terminée et plateau initialisé).
 * @returns {boolean}
 */
function isGameActive() {
    return !gameIsOver && board.children.length > 0;
}

// ==========================================================================
//                              INITIALISATION & GESTION DU JEU
// ==========================================================================

/**
 * Prépare et initialise une nouvelle partie (appelée après config joueurs ou reset).
 */
function initializeNewGame() {
    board.innerHTML = '';
    selectedPiece = null;
    possibleMoves = [];
    currentPlayer = PLAYER_BLACK;
    resetScores();
    updateTurnIndicator(); // Met à jour avec les noms actuels
    movesSincePawnOrCapture = 0;
    gameIsOver = false;
    board.style.pointerEvents = 'auto'; // Réactiver les clics
    if (timerDisplayElement) resetTimerDisplay();

    // Création des cellules et des pièces
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = document.createElement('div');
            const isBlackCell = (row + col) % 2 !== 0;
            cell.classList.add('cell', isBlackCell ? 'black' : 'white');
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (isBlackCell) {
                let piece = null;
                if (row < 3) piece = createPiece(row, col, PLAYER_BLACK);
                else if (row > 4) piece = createPiece(row, col, PLAYER_WHITE);

                if (piece) cell.appendChild(piece);
                cell.addEventListener('click', handleCellClick);
            }
            board.appendChild(cell);
        }
    }

    captureIsMandatory = hasMandatoryCaptures(currentPlayer);
    console.log(`Nouvelle partie. Tour ${currentPlayer}, Capture obligatoire: ${captureIsMandatory}`);
    if (captureIsMandatory) {
        highlightCapturingPieces(getPiecesWithCaptures(currentPlayer));
    }
    // Afficher la section de jeu et démarrer le timer
    showSection('game-section');
    startTimer();
}

/**
 * Crée un élément DOM représentant une pièce de jeu.
 * @param {number} row - Ligne de la pièce.
 * @param {number} col - Colonne de la pièce.
 * @param {string} player - Le joueur ('black' ou 'white').
 * @returns {HTMLElement} L'élément div de la pièce.
 */
function createPiece(row, col, player) {
    const piece = document.createElement('div');
    piece.classList.add('piece', `${player}-piece`);
    piece.dataset.player = player;
    piece.dataset.row = row;
    piece.dataset.col = col;
    piece.dataset.isKing = 'false';
    piece.addEventListener('click', handlePieceClick);
    return piece;
}

/**
 * Réinitialise l'état pour préparer une nouvelle partie (affiche la section setup).
 */
function resetGame() {
    stopTimer();
    gameIsOver = false;
    board.innerHTML = '';
    resetScores();
    resetTimerDisplay();
    localStorage.removeItem(GAME_STATE_KEY); // Effacer la sauvegarde auto
    showSection('setup-section'); // Afficher la configuration
    showNotification("Prêt pour une nouvelle partie.", 'info');
}

/**
 * Remet les scores à zéro et met à jour l'affichage.
 */
function resetScores() {
    blackScore = 0;
    whiteScore = 0;
    if (blackScoreElement) blackScoreElement.textContent = blackScore;
    if (whiteScoreElement) whiteScoreElement.textContent = whiteScore;
}

// ==========================================================================
//                              SAUVEGARDE & CHARGEMENT (localStorage)
// ==========================================================================

/**
 * Sauvegarde l'état actuel du jeu dans localStorage.
 */
function saveGameState() {
    if (gameIsOver) { // Ne pas sauvegarder une partie terminée
        localStorage.removeItem(GAME_STATE_KEY);
        return;
    }

    // Créer une représentation du plateau
    const boardState = [];
    for (let r = 0; r < size; r++) {
        const rowState = [];
        for (let c = 0; c < size; c++) {
            const piece = getPieceAt(r, c);
            rowState.push(piece ? { player: piece.dataset.player, isKing: piece.dataset.isKing === 'true' } : null);
        }
        boardState.push(rowState);
    }

    // Créer l'objet d'état complet
    const gameState = {
        board: boardState,
        currentPlayer: currentPlayer,
        blackScore: blackScore,
        whiteScore: whiteScore,
        movesSincePawnOrCapture: movesSincePawnOrCapture,
        remainingTime: remainingTime,
        playerBlackName: playerBlackName,
        playerWhiteName: playerWhiteName,
    };

    // Sauvegarder en JSON dans localStorage
    try {
        localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.error("Erreur lors de la sauvegarde de la partie:", e);
        showNotification("Erreur lors de la sauvegarde.", 'error');
    }
}

/**
 * Charge l'état du jeu depuis localStorage et reconstruit l'interface.
 * @returns {boolean} True si une partie a été chargée, false sinon.
 */
function loadGameState() {
    const savedStateJSON = localStorage.getItem(GAME_STATE_KEY);
    if (!savedStateJSON) {
        console.log("Aucune partie sauvegardée trouvée.");
        if (loadGameButton) loadGameButton.disabled = true;
        return false;
    }

    if (loadGameButton) loadGameButton.disabled = false;

    try {
        const savedState = JSON.parse(savedStateJSON);

        // Préparer le chargement
        stopTimer();
        board.innerHTML = '';
        selectedPiece = null;
        possibleMoves = [];

        // Restaurer l'état global
        currentPlayer = savedState.currentPlayer;
        blackScore = savedState.blackScore;
        whiteScore = savedState.whiteScore;
        movesSincePawnOrCapture = savedState.movesSincePawnOrCapture;
        remainingTime = savedState.remainingTime || TIME_PER_TURN;
        playerBlackName = savedState.playerBlackName || 'Noir';
        playerWhiteName = savedState.playerWhiteName || 'Blanc';
        gameIsOver = false; // Une partie chargée n'est pas terminée

        // Reconstruire le plateau
        for (let r = 0; r < savedState.board.length; r++) {
            for (let c = 0; c < savedState.board[r].length; c++) {
                const cell = document.createElement('div');
                const isBlackCell = (r + c) % 2 !== 0;
                cell.classList.add('cell', isBlackCell ? 'black' : 'white');
                cell.dataset.row = r;
                cell.dataset.col = c;

                if (isBlackCell) {
                    const pieceData = savedState.board[r][c];
                    if (pieceData) {
                        const piece = createPiece(r, c, pieceData.player);
                        if (pieceData.isKing) {
                            piece.classList.add('king');
                            piece.dataset.isKing = 'true';
                        }
                        cell.appendChild(piece);
                    }
                    cell.addEventListener('click', handleCellClick);
                }
                board.appendChild(cell);
            }
        }

        // Mettre à jour l'UI
        updateTurnIndicator();
        if (blackScoreElement) blackScoreElement.textContent = blackScore;
        if (whiteScoreElement) whiteScoreElement.textContent = whiteScore;
        if (blackPlayerLabel) blackPlayerLabel.textContent = playerBlackName;
        if (whitePlayerLabel) whitePlayerLabel.textContent = playerWhiteName;

        // Recalculer l'état dérivé (capture obligatoire)
        captureIsMandatory = hasMandatoryCaptures(currentPlayer);
        if (captureIsMandatory) {
            highlightCapturingPieces(getPiecesWithCaptures(currentPlayer));
        }

        // Redémarrer le timer et afficher la section jeu
        startTimer(remainingTime);
        console.log("Partie chargée.");
        showNotification("Partie précédente chargée.", 'info');
        showSection('game-section');
        return true;

    } catch (e) {
        console.error("Erreur lors du chargement de la partie:", e);
        localStorage.removeItem(GAME_STATE_KEY); // Supprimer sauvegarde corrompue
        if (loadGameButton) loadGameButton.disabled = true;
        return false;
    }
}

// ==========================================================================
//                              HISTORIQUE & STATISTIQUES (localStorage)
// ==========================================================================

/**
 * Récupère l'historique des parties depuis localStorage (tableau d'objets).
 * @returns {Array<object>}
 */
function getGameHistory() {
    const historyJSON = localStorage.getItem(HISTORY_KEY);
    try {
        return historyJSON ? JSON.parse(historyJSON) : [];
    } catch (e) {
        console.error("Erreur lecture historique:", e);
        localStorage.removeItem(HISTORY_KEY);
        return [];
    }
}

/**
 * Ajoute un résultat de partie à l'historique dans localStorage.
 * @param {string} winnerName - Nom du gagnant ou 'Nulle'.
 * @param {string} loserName - Nom du perdant (ou description si nulle).
 * @param {string} reason - Raison de la fin de partie.
 */
function addGameToHistory(winnerName, loserName, reason) {
    const history = getGameHistory();
    const gameResult = {
        date: new Date().toLocaleString('fr-FR'),
        winner: winnerName,
        loser: loserName,
        reason: reason,
        // Enregistrer les scores au moment de la fin
        winnerScore: (winnerName === playerBlackName) ? blackScore : whiteScore,
        loserScore: (winnerName === playerBlackName) ? whiteScore : blackScore,
    };
    // Pour les nulles, les scores sont ceux actuels
    if (winnerName === 'Nulle') {
        gameResult.winnerScore = blackScore;
        gameResult.loserScore = whiteScore;
    }

    history.push(gameResult);
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error("Erreur sauvegarde historique:", e);
    }
}

/**
 * Récupère les comptes de victoires depuis localStorage (objet { nom: victoires }).
 * @returns {object}
 */
function getWinCounts() {
    const winsJSON = localStorage.getItem(WINS_KEY);
     try {
        return winsJSON ? JSON.parse(winsJSON) : {};
    } catch (e) {
        console.error("Erreur lecture victoires:", e);
        localStorage.removeItem(WINS_KEY);
        return {};
    }
}

/**
 * Incrémente le compte de victoires pour un joueur dans localStorage.
 * @param {string} playerName - Nom du joueur gagnant.
 */
function incrementWinCount(playerName) {
    if (!playerName || playerName === 'Nulle') return; // Ne pas compter les nulles
    const wins = getWinCounts();
    wins[playerName] = (wins[playerName] || 0) + 1;
    try {
        localStorage.setItem(WINS_KEY, JSON.stringify(wins));
    } catch (e) {
        console.error("Erreur sauvegarde victoires:", e);
    }
}

/**
 * Affiche le nombre de victoires triées dans la liste de l'UI.
 */
function displayWinCounts() {
    if (!winCountsList) return;
    winCountsList.innerHTML = '';
    const wins = getWinCounts();
    const sortedPlayers = Object.entries(wins).sort(([,a],[,b]) => b-a); // Tri décroissant

    if (sortedPlayers.length === 0) {
        winCountsList.innerHTML = '<li>Aucune victoire enregistrée.</li>';
        return;
    }
    sortedPlayers.forEach(([name, count]) => {
        const li = document.createElement('li');
        li.textContent = `${name}: ${count} victoire(s)`;
        winCountsList.appendChild(li);
    });
}

/**
 * Affiche l'historique des parties dans le tableau de l'UI.
 */
function displayGameHistory() {
    if (!gameHistoryTableBody) return;
    gameHistoryTableBody.innerHTML = ''; // Vider le corps du tableau
    const history = getGameHistory().reverse(); // Plus récentes d'abord

    if (history.length === 0) {
        const tr = gameHistoryTableBody.insertRow();
        const td = tr.insertCell();
        td.colSpan = 5; // Ajuster le colspan au nombre de colonnes
        td.textContent = 'Aucun historique de partie.';
        td.style.textAlign = 'center';
    } else {
        history.forEach(game => {
            const tr = gameHistoryTableBody.insertRow();
            tr.insertCell().textContent = game.date;
            tr.insertCell().textContent = game.winner;
            tr.insertCell().textContent = game.loser;
            tr.insertCell().textContent = game.reason;
            // Afficher le score
            let scoreText = '-';
            if (game.winner !== 'Nulle') {
                scoreText = `${game.winnerScore} - ${game.loserScore}`;
            } else {
                 scoreText = `${game.winnerScore} - ${game.loserScore}`; // Afficher scores même si nulle
            }
            tr.insertCell().textContent = scoreText;
        });
    }
}

// ==========================================================================
//                              GESTIONNAIRES D'ÉVÉNEMENTS (CLICS)
// ==========================================================================

/**
 * Gère le clic sur une pièce : sélection/désélection et calcul des mouvements.
 * @param {Event} event - L'événement de clic.
 */
function handlePieceClick(event) {
    event.stopPropagation();
    if (gameIsOver) return; // Ne rien faire si partie finie
    const piece = event.target;
    const piecePlayer = piece.dataset.player;

    if (piecePlayer !== currentPlayer) {
        showNotification("Ce n'est pas votre tour !", 'warning');
        return;
    }

    if (captureIsMandatory) {
        const capturingPieces = getPiecesWithCaptures(currentPlayer);
        if (!capturingPieces.includes(piece)) {
            showNotification("Capture obligatoire ! Sélectionnez une pièce qui peut prendre.", 'warning', 4000);
            highlightCapturingPieces(capturingPieces);
            return;
        }
    }

    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
        clearHighlights();
    }

    if (selectedPiece === piece) {
        selectedPiece = null;
        possibleMoves = [];
    } else {
        selectedPiece = piece;
        selectedPiece.classList.add('selected');
        possibleMoves = calculatePossibleMoves(selectedPiece);
        highlightPossibleMoves();
        if (possibleMoves.length === 0 && !captureIsMandatory) {
             console.log("Aucun mouvement possible pour cette pièce.");
        }
    }
}

/**
 * Gère le clic sur une cellule du plateau (pour déplacer une pièce sélectionnée).
 * @param {Event} event - L'événement de clic.
 */
function handleCellClick(event) {
    if (!selectedPiece || gameIsOver) return;
    const targetCell = event.currentTarget;

    const isValidDestination = possibleMoves.some(move =>
        move.row == targetCell.dataset.row && move.col == targetCell.dataset.col
    );

    if (isValidDestination) {
        document.querySelectorAll('.must-capture').forEach(p => p.classList.remove('must-capture'));
        movePiece(targetCell);
    } else {
        showNotification("Mouvement invalide ! Cliquez sur une case verte.", 'error');
    }
}

/**
 * Gère le clic sur le bouton "Abandonner".
 */
function handleResignClick() {
    if (gameIsOver || !isGameActive()) return; // Ne rien faire si partie finie ou pas commencée

    const confirmation = confirm(`Joueur ${currentPlayer === PLAYER_BLACK ? playerBlackName : playerWhiteName}, êtes-vous sûr de vouloir abandonner ?`);
    if (confirmation) {
        const winner = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
        endGame(winner, `${currentPlayer === PLAYER_BLACK ? playerBlackName : playerWhiteName} a abandonné`);
    }
}

// ==========================================================================
//                              LOGIQUE PRINCIPALE DU JEU
// ==========================================================================

/**
 * Déplace la pièce sélectionnée, gère captures, promotion, et mise à jour de l'état.
 * @param {HTMLElement} targetCell - La cellule de destination.
 */
function movePiece(targetCell) {
    if (!selectedPiece || !targetCell || gameIsOver) return;

    const oldRow = parseInt(selectedPiece.dataset.row);
    const oldCol = parseInt(selectedPiece.dataset.col);
    const newRow = parseInt(targetCell.dataset.row);
    const newCol = parseInt(targetCell.dataset.col);
    const pieceWasPawn = selectedPiece.dataset.isKing === 'false';

    const move = possibleMoves.find(m => m.row == newRow && m.col == newCol);
    if (!move) {
        console.error("Erreur interne : Mouvement valide non trouvé.");
        return;
    }

    // Déplacer la pièce
    targetCell.appendChild(selectedPiece);
    selectedPiece.dataset.row = newRow;
    selectedPiece.dataset.col = newCol;

    let capturedInThisMove = false;

    // Gérer la capture
    if (move.type === 'capture' && move.jumped) {
        const jumpedPieceCell = getCellAt(move.jumped.row, move.jumped.col);
        if (jumpedPieceCell && jumpedPieceCell.firstChild) {
            const capturedPiece = jumpedPieceCell.firstChild;
            const capturedPlayer = capturedPiece.dataset.player;
            jumpedPieceCell.removeChild(capturedPiece);
            capturedInThisMove = true;

            // Mettre à jour le score
            if (capturedPlayer === PLAYER_BLACK) { whiteScore++; whiteScoreElement.textContent = whiteScore; }
            else { blackScore++; blackScoreElement.textContent = blackScore; }

            // Vérifier sauts multiples
            const nextCaptures = calculatePossibleMoves(selectedPiece).filter(m => m.type === 'capture');
            if (nextCaptures.length > 0) {
                possibleMoves = nextCaptures;
                selectedPiece.classList.add('selected'); // Garder sélectionnée
                highlightPossibleMoves();
                console.log("Capture multiple possible !");
                captureIsMandatory = true;
                // Pas besoin de highlightCapturingPieces ici car une seule pièce est concernée
                movesSincePawnOrCapture = 0; // Reset compteur car capture
                return; // Forcer la capture suivante
            }
        }
    }

    // Gérer la promotion
    if (pieceWasPawn) {
        const player = selectedPiece.dataset.player;
        if ((player === PLAYER_BLACK && newRow === size - 1) || (player === PLAYER_WHITE && newRow === 0)) {
            selectedPiece.classList.add('king');
            selectedPiece.dataset.isKing = 'true';
            console.log("Promotion en Dame !");
            showNotification("Promotion en Dame !", 'success');
            // La promotion compte comme un mouvement de pion pour la règle des 25 coups
        }
    }

    // Mettre à jour compteur règle 25 coups
    if (capturedInThisMove || pieceWasPawn) {
        movesSincePawnOrCapture = 0;
        console.log(`Counter 25 coups reset (capture: ${capturedInThisMove}, pion bougé: ${pieceWasPawn})`);
    } else { // Seul un roi a bougé sans capturer
        movesSincePawnOrCapture++;
        console.log(`Counter 25 coups: ${movesSincePawnOrCapture}`);
    }

    // Nettoyer après mouvement terminé
    selectedPiece.classList.remove('selected');
    selectedPiece = null;
    clearHighlights();
    possibleMoves = [];

    stopTimer(); // Arrêter le timer avant de changer

    // Passer au joueur suivant (qui vérifiera la règle des 25 coups)
    switchPlayer();

    // Vérifier si la partie est terminée (après changement de joueur)
    let isOver = false;
    if (!gameIsOver) { // Vérifier si switchPlayer n'a pas déjà terminé
       isOver = checkGameOver();
    }

    // Sauvegarder l'état si la partie n'est pas terminée
    if (!isOver && !gameIsOver) {
         saveGameState();
    }
}

/**
 * Calcule tous les mouvements et captures valides pour une pièce donnée.
 * @param {HTMLElement} piece - La pièce pour laquelle calculer les mouvements.
 * @param {boolean} [applyMandatoryFilter=true] - Si true, ne retourne que les captures si elles existent pour cette pièce.
 * @returns {Array<object>} Un tableau d'objets décrivant les mouvements possibles.
 */
function calculatePossibleMoves(piece, applyMandatoryFilter = true) {
    const moves = [];
    const r = parseInt(piece.dataset.row);
    const c = parseInt(piece.dataset.col);
    const player = piece.dataset.player;
    const isKing = piece.dataset.isKing === 'true';

    if (isKing) {
        // Logique Dames (volantes)
        const kingDirections = [ { dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 } ];
        for (const dir of kingDirections) {
            let potentialJump = null;
            for (let i = 1; ; i++) {
                const nr = r + i * dir.dr;
                const nc = c + i * dir.dc;
                if (!isValidBoardCoordinates(nr, nc)) break;
                const pieceAtTarget = getPieceAt(nr, nc);
                if (!pieceAtTarget) { // Case vide
                    if (potentialJump) {
                        moves.push({ row: nr, col: nc, type: 'capture', jumped: { row: potentialJump.row, col: potentialJump.col } });
                    } else {
                        moves.push({ row: nr, col: nc, type: 'move' });
                    }
                    continue;
                } else if (pieceAtTarget.dataset.player !== player) { // Case adverse
                    if (potentialJump) break; // 2e adverse
                    const nextR = r + (i + 1) * dir.dr;
                    const nextC = c + (i + 1) * dir.dc;
                    if (isValidBoardCoordinates(nextR, nextC) && !getPieceAt(nextR, nextC)) {
                        potentialJump = { row: nr, col: nc }; // Mémoriser
                    } else {
                        break; // Bloqué derrière
                    }
                } else { // Case alliée
                    break;
                }
            }
        }
    } else {
        // Logique Pions
        const moveDirections = [];
        if (player === PLAYER_BLACK) { moveDirections.push({ dr: 1, dc: -1 }, { dr: 1, dc: 1 }); }
        else { moveDirections.push({ dr: -1, dc: -1 }, { dr: -1, dc: 1 }); }
        for (const dir of moveDirections) { // Mouvements simples
            const nr = r + dir.dr;
            const nc = c + dir.dc;
            if (isValidBoardCoordinates(nr, nc) && !getPieceAt(nr, nc)) {
                moves.push({ row: nr, col: nc, type: 'move' });
            }
        }
        const captureDirections = [ { dr: 2, dc: -2, jr: 1, jc: -1 }, { dr: 2, dc: 2, jr: 1, jc: 1 }, { dr: -2, dc: -2, jr: -1, jc: -1 }, { dr: -2, dc: 2, jr: -1, jc: 1 } ];
        for (const cap of captureDirections) { // Captures simples
            const isForwardJump = (player === PLAYER_BLACK && cap.dr > 0) || (player === PLAYER_WHITE && cap.dr < 0);
            if (!isForwardJump) continue;
            const nr = r + cap.dr, nc = c + cap.dc, jr = r + cap.jr, jc = c + cap.jc;
            if (isValidBoardCoordinates(nr, nc) && !getPieceAt(nr, nc)) {
                const jumpedPiece = getPieceAt(jr, jc);
                if (jumpedPiece && jumpedPiece.dataset.player !== player) {
                    moves.push({ row: nr, col: nc, type: 'capture', jumped: { row: jr, col: jc } });
                }
            }
        }
    }

    // Appliquer filtre capture obligatoire si demandé
    if (applyMandatoryFilter) {
        const captures = moves.filter(move => move.type === 'capture');
        if (captures.length > 0) {
            return captures;
        }
    }
    return moves;
}

/**
 * Vérifie si le joueur spécifié a au moins une capture possible sur le plateau.
 * @param {string} player - Le joueur ('black' ou 'white').
 * @returns {boolean} True si une capture est possible, false sinon.
 */
function hasMandatoryCaptures(player) {
    const playerPieces = board.querySelectorAll(`.piece.${player}-piece`);
    for (const piece of playerPieces) {
        const moves = calculatePossibleMoves(piece, false); // Sans filtrer
        if (moves.some(move => move.type === 'capture')) {
            return true;
        }
    }
    return false;
}

/**
 * Récupère tous les éléments de pièces du joueur qui peuvent effectuer une capture.
 * @param {string} player - Le joueur ('black' ou 'white').
 * @returns {Array<HTMLElement>} Un tableau des éléments de pièces pouvant capturer.
 */
function getPiecesWithCaptures(player) {
    const piecesThatCanCapture = [];
    const playerPieces = board.querySelectorAll(`.piece.${player}-piece`);
    for (const piece of playerPieces) {
        const moves = calculatePossibleMoves(piece, false); // Sans filtrer
        if (moves.some(move => move.type === 'capture')) {
            piecesThatCanCapture.push(piece);
        }
    }
    return piecesThatCanCapture;
}

/**
 * Change le joueur actuel, met à jour l'UI, vérifie les règles et démarre le timer.
 */
function switchPlayer() {
    if (gameIsOver) return; // Ne pas changer si partie finie

    currentPlayer = (currentPlayer === PLAYER_BLACK) ? PLAYER_WHITE : PLAYER_BLACK;
    updateTurnIndicator();

    // Vérifier règle des 25 coups (50 demi-coups)
    if (movesSincePawnOrCapture >= 50) {
        endGameDraw("Règle des 50 demi-coups");
        return; // Fin de partie
    }

    // Vérifier capture obligatoire pour le nouveau joueur
    captureIsMandatory = hasMandatoryCaptures(currentPlayer);
    console.log(`Tour ${currentPlayer}, Capture obligatoire: ${captureIsMandatory}`);
    if (captureIsMandatory) {
        highlightCapturingPieces(getPiecesWithCaptures(currentPlayer));
    } else {
        // Nettoyer les highlights de capture si aucune n'est obligatoire
        document.querySelectorAll('.must-capture').forEach(p => p.classList.remove('must-capture'));
    }
    startTimer(); // Démarrer le timer pour le nouveau joueur
}

// ==========================================================================
//                              LOGIQUE DE FIN DE PARTIE
// ==========================================================================

/**
 * Vérifie les conditions de fin de partie (victoire, blocage, égalité).
 * @returns {boolean} True si la partie est terminée, false sinon.
 */
function checkGameOver() {
    if (gameIsOver) return true;

    // Vérification égalité matérielle immédiate
    const counts = getPieceCounts();
    if (counts.black.pawns === 0 && counts.white.pawns === 0) { // Aucuns pions
        if (counts.black.kings === 1 && counts.white.kings === 1) {
            endGameDraw("Égalité matérielle (1 Dame vs 1 Dame)");
            return true;
        }
        if ((counts.black.kings === 2 && counts.white.kings === 1) || (counts.black.kings === 1 && counts.white.kings === 2)) {
            endGameDraw("Égalité matérielle (2 Dames vs 1 Dame)");
            return true;
        }
    }

    // Vérification victoire/blocage pour le joueur actuel
    const playerPieces = board.querySelectorAll(`.piece.${currentPlayer}-piece`);
    if (playerPieces.length === 0) { // Plus de pièces
        endGame(currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK, "plus de pièces");
        return true;
    }

    let canMove = false; // Le joueur actuel peut-il bouger ?
    if (captureIsMandatory) {
        canMove = getPiecesWithCaptures(currentPlayer).length > 0;
    } else {
        for (const piece of playerPieces) {
            if (calculatePossibleMoves(piece).length > 0) {
                canMove = true;
                break;
            }
        }
    }
    if (!canMove) { // Bloqué
        endGame(currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK, `aucun mouvement possible pour ${currentPlayer === PLAYER_BLACK ? playerBlackName : playerWhiteName}`);
        return true;
    }

    return false; // La partie continue
}

/**
 * Gère la fin de la partie par victoire, enregistre le résultat et met à jour l'UI.
 * @param {string} winner - Le joueur gagnant (PLAYER_BLACK ou PLAYER_WHITE).
 * @param {string} reason - La raison de la victoire.
 */
function endGame(winner, reason) {
    if (gameIsOver) return;
    gameIsOver = true;
    stopTimer();
    resetTimerDisplay();
    localStorage.removeItem(GAME_STATE_KEY);

    const winnerName = (winner === PLAYER_BLACK) ? playerBlackName : playerWhiteName;
    const loserName = (winner === PLAYER_BLACK) ? playerWhiteName : playerBlackName;

    addGameToHistory(winnerName, loserName, reason);
    incrementWinCount(winnerName);

    const message = `Fin de partie ! ${winnerName} a gagné (${reason}) !`;
    showNotification(message, 'success', 10000);
    console.log(message);
    board.style.pointerEvents = 'none'; // Désactiver clics sur plateau
    showSection(document.querySelector('.app-section.active-section').id); // Mettre à jour état nav
}

/**
 * Gère la fin de la partie par égalité, enregistre le résultat et met à jour l'UI.
 * @param {string} reason - La raison de l'égalité.
 */
function endGameDraw(reason) {
    if (gameIsOver) return;
    gameIsOver = true;
    stopTimer();
    resetTimerDisplay();
    localStorage.removeItem(GAME_STATE_KEY);

    addGameToHistory('Nulle', `${playerBlackName} vs ${playerWhiteName}`, reason);

    const message = `Partie Nulle ! (${reason})`;
    showNotification(message, 'info', 10000);
    console.log(message);
    board.style.pointerEvents = 'none'; // Désactiver clics sur plateau
    showSection(document.querySelector('.app-section.active-section').id); // Mettre à jour état nav
}

/**
 * Gère la pause de la partie
 */
function handlePauseClick() {
    if (gameIsOver) return; // Ne rien faire si partie finie
    if(!gameIsPaused)
    {
        const confirmation = confirm("Êtes-vous sûr de vouloir mettre la partie en pause ?");
        if (confirmation) {
            stopTimer();
            showNotification("Partie mise en pause.", 'info', 5000);
            board.style.pointerEvents = 'none'; // Désactiver clics sur plateau
            pauseButton.textContent = "Reprendre";
            gameIsPaused = true; 

            //Flouter le plateau
            board.style.filter = 'blur(20px)';
        }

    

    }
    else{
        const confirmation = confirm("Êtes-vous sûr de vouloir reprendre la partie ?");
        if (confirmation) {
            startTimer(remainingTime); // Reprendre le timer
            showNotification("Partie reprise.", 'info', 5000);
            board.style.pointerEvents = 'auto'; // Réactiver clics sur plateau
            pauseButton.textContent = "Pause";
            gameIsPaused = false; 

            //Enlever le flou du plateau
            board.style.filter = 'none';
        }
    }
  

}


// ==========================================================================
//                              MISES À JOUR DE L'INTERFACE UTILISATEUR (UI)
// ==========================================================================

/**
 * Met à jour l'affichage du joueur dont c'est le tour (avec son nom).
 */
function updateTurnIndicator() {
    if (!currentTurnElement) return;
    const playerText = currentPlayer === PLAYER_BLACK ? playerBlackName : playerWhiteName;
    currentTurnElement.textContent = playerText;
    currentTurnElement.dataset.player = currentPlayer; // Pour le style CSS
}

/**
 * Ajoute la classe CSS 'possible-move' aux cellules de destination valides.
 */
function highlightPossibleMoves() {
    clearHighlights();
    possibleMoves.forEach(move => {
        const cell = getCellAt(move.row, move.col);
        if (cell) {
            cell.classList.add('possible-move');
        }
    });
}

/**
 * Ajoute la classe CSS 'must-capture' aux pièces qui doivent jouer.
 * @param {Array<HTMLElement>} pieces - Tableau des éléments de pièces à mettre en évidence.
 */
function highlightCapturingPieces(pieces) {
    document.querySelectorAll('.must-capture').forEach(p => p.classList.remove('must-capture'));
    pieces.forEach(p => p.classList.add('must-capture'));
}

/**
 * Supprime toutes les classes CSS de mise en évidence (.possible-move, .must-capture).
 */
function clearHighlights() {
    document.querySelectorAll('.possible-move').forEach(cell => cell.classList.remove('possible-move'));
    document.querySelectorAll('.must-capture').forEach(p => p.classList.remove('must-capture'));
}

/**
 * Affiche une notification animée en bas à droite de l'écran.
 * @param {string} message - Le message à afficher.
 * @param {string} [type='info'] - Le type ('info', 'warning', 'error', 'success').
 * @param {number} [duration=3000] - La durée d'affichage en ms.
 */
function showNotification(message, type = 'info', duration = 3000) {
    if (!notificationsContainer) return;

    const notification = document.createElement('div');
    notification.classList.add('notification', type);
    notification.textContent = message;
    notificationsContainer.appendChild(notification);

    void notification.offsetWidth; // Force reflow pour transition
    notification.classList.add('show');

    // Disparition programmée
    setTimeout(() => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode) {
                 notificationsContainer.removeChild(notification);
            }
        }, { once: true });
    }, duration);
}

/**
 * Met à jour l'affichage du temps restant et le style si temps bas.
 */
function updateTimerDisplay() {
    if (!timerDisplayElement || !timerContainerElement) return;
    timerDisplayElement.textContent = remainingTime;
    if (remainingTime <= LOW_TIME_THRESHOLD && remainingTime > 0) { // Style seulement si temps bas mais > 0
        timerContainerElement.classList.add('low-time');
    } else {
        timerContainerElement.classList.remove('low-time');
    }
}

/**
 * Arrête le timer en cours.
 */
function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    if (timerContainerElement) timerContainerElement.classList.remove('low-time');
}

/**
 * Démarre/Redémarre le timer pour le tour actuel.
 * @param {number} [initialTime=TIME_PER_TURN] - Temps de départ optionnel.
 */
function startTimer(initialTime = TIME_PER_TURN) {
    stopTimer(); // Arrêter le précédent
    remainingTime = initialTime;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        if (gameIsOver) { // Sécurité
            stopTimer();
            return;
        }
        remainingTime--;
        updateTimerDisplay();

        if (remainingTime <= 0) { // Temps écoulé
            stopTimer();
            showNotification(`Temps écoulé pour ${currentPlayer === PLAYER_BLACK ? playerBlackName : playerWhiteName} ! Changement de tour.`, 'warning');
            switchPlayer(); // Changer de joueur
            if (!gameIsOver) checkGameOver(); // Vérifier si le nouveau joueur est bloqué
        }
    }, 1000); // Chaque seconde
}

/**
 * Réinitialise l'affichage du timer à '--'.
 */
function resetTimerDisplay() {
    if (!timerDisplayElement || !timerContainerElement) return;
    timerDisplayElement.textContent = '--';
    timerContainerElement.classList.remove('low-time');
}

// ==========================================================================
//                              FONCTIONS UTILITAIRES
// ==========================================================================

/**
 * Récupère l'élément DOM de la pièce aux coordonnées spécifiées.
 * @param {number} row - Ligne.
 * @param {number} col - Colonne.
 * @returns {HTMLElement|null}
 */
function getPieceAt(row, col) {
    const cell = getCellAt(row, col);
    return cell ? cell.firstChild : null;
}

/**
 * Récupère l'élément DOM de la cellule aux coordonnées spécifiées.
 * @param {number} row - Ligne.
 * @param {number} col - Colonne.
 * @returns {HTMLElement|null}
 */
function getCellAt(row, col) {
    return board.querySelector(`.cell[data-row='${Number(row)}'][data-col='${Number(col)}']`);
}

/**
 * Vérifie si les coordonnées données sont valides (dans les limites du plateau).
 * @param {number} row - Ligne.
 * @param {number} col - Colonne.
 * @returns {boolean}
 */
function isValidBoardCoordinates(row, col) {
    return row >= 0 && row < size && col >= 0 && col < size;
}

/**
 * Compte le nombre de pions et de dames pour chaque joueur sur le plateau.
 * @returns {object} Objet { black: { pawns, kings }, white: { pawns, kings } }.
 */
function getPieceCounts() {
    const counts = { black: { pawns: 0, kings: 0 }, white: { pawns: 0, kings: 0 } };
    const allPieces = board.querySelectorAll('.piece');
    allPieces.forEach(piece => {
        const player = piece.dataset.player;
        const isKing = piece.dataset.isKing === 'true';
        if (player === PLAYER_BLACK) {
            if (isKing) counts.black.kings++; else counts.black.pawns++;
        } else if (player === PLAYER_WHITE) {
            if (isKing) counts.white.kings++; else counts.white.pawns++;
        }
    });
    return counts;
}

// ==========================================================================
//                              EXÉCUTION INITIALE & ÉCOUTEURS GLOBAUX
// ==========================================================================

/**
 * Fonction d'initialisation principale de l'application.
 */
function initializeApp() {
    // Essayer de charger une partie sauvegardée
    const gameLoadedSuccessfully = loadGameState();

    // Si aucune partie n'a été chargée, afficher la section de configuration
    if (!gameLoadedSuccessfully) {
        showSection('setup-section');
        console.log("Affichage de la configuration pour une nouvelle partie.");
    }
    // Afficher les comptes de victoires initiaux
    displayWinCounts();

    // --- Ajout des écouteurs d'événements globaux ---

    // Navigation principale
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (button.dataset.section === 'game-section' && button.disabled) {
                showNotification("Aucune partie en cours ou partie terminée.", "info");
                return;
            }
            showSection(button.dataset.section);
        });
    });

    // Bouton "Nouvelle Partie" (dans la section jeu) -> retourne à la config
    if (resetButton) {
        resetButton.addEventListener('click', resetGame);
    }
    // Bouton "Abandonner"
    if (resignButton) {
        resignButton.addEventListener('click', handleResignClick);
    }
    // Bouton "Commencer" (section setup)
    if (startGameButton) {
        startGameButton.addEventListener('click', () => {
            playerBlackName = playerBlackNameInput.value.trim() || 'Noir';
            playerWhiteName = playerWhiteNameInput.value.trim() || 'Blanc';
            if (blackPlayerLabel) blackPlayerLabel.textContent = playerBlackName;
            if (whitePlayerLabel) whitePlayerLabel.textContent = playerWhiteName;
            initializeNewGame(); // Lance la nouvelle partie
        });
    }
    // Bouton "Charger la partie précédente" (section setup)
    if (loadGameButton) {
        loadGameButton.addEventListener('click', () => {
            if (!loadGameState()) { // Essaye de charger
                showNotification("Impossible de charger la partie.", "error");
            }
            // loadGameState gère l'affichage de la section jeu si succès
        });
        // Vérifier l'état initial du bouton charger
        if (!localStorage.getItem(GAME_STATE_KEY)) {
            loadGameButton.disabled = true;
        }
    }

    if(pauseButton) {
        pauseButton.addEventListener('click', handlePauseClick);
    }
}


// Lancer l'application une fois le DOM chargé
document.addEventListener('DOMContentLoaded', initializeApp);
