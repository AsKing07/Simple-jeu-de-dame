const board = document.getElementById('board');
const size = 8;
let selectedPiece = null;
let blackScore = 0;
let whiteScore = 0;

function createBoard() {
    for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
            const cell = document.createElement('div');
            cell.classList.add('cell', (row + col) % 2 === 0 ? 'white' : 'black');
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            if ((row < 3 || row > 4) && (row + col) % 2 !== 0) {
                const piece = document.createElement('div');
                piece.classList.add('piece', row < 3 ? 'black-piece' : 'white-piece');
                piece.dataset.row = row;
                piece.dataset.col = col;
                piece.addEventListener('click', selectPiece);
                cell.appendChild(piece);
            }
            
            cell.addEventListener('click', movePiece);
            board.appendChild(cell);
        }
    }
}

function selectPiece(event) {
    if (selectedPiece) {
        selectedPiece.classList.remove('selected');
    }
    selectedPiece = event.target;
    selectedPiece.classList.add('selected');
}

function movePiece(event) {
    if (!selectedPiece) return;

    const targetCell = event.target;
    if (targetCell.classList.contains('piece') || targetCell.firstChild) return;

    const oldRow = parseInt(selectedPiece.dataset.row);
    const oldCol = parseInt(selectedPiece.dataset.col);
    const newRow = parseInt(targetCell.dataset.row);
    const newCol = parseInt(targetCell.dataset.col);

    const rowDiff = newRow - oldRow;
    const colDiff = newCol - oldCol;
    
    // Vérifier les déplacements valides
    const isBlack = selectedPiece.classList.contains('black-piece');
    const isKing = selectedPiece.classList.contains('king');
    if (!isKing && ((isBlack && rowDiff < 0) || (!isBlack && rowDiff > 0))) {
        return; // Un pion ne peut pas reculer sauf pour capturer
    }
    
    if (Math.abs(rowDiff) === 1 && Math.abs(colDiff) === 1) {
        targetCell.appendChild(selectedPiece);
    } else if (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2) {
        const midRow = (oldRow + newRow) / 2;
        const midCol = (oldCol + newCol) / 2;
        const midCell = document.querySelector(`[data-row='${midRow}'][data-col='${midCol}']`);
        
        if (midCell && midCell.firstChild && midCell.firstChild.classList.contains('piece')) {
            const capturedPiece = midCell.firstChild;

            midCell.removeChild(midCell.firstChild);
            targetCell.appendChild(selectedPiece);
            // Mettre à jour le score
            if (capturedPiece.classList.contains('black-piece')) {
                whiteScore++;
                document.getElementById('white-score').textContent = whiteScore;
            } else {
                blackScore++;
                document.getElementById('black-score').textContent = blackScore;
            }
        }
    }
    
    selectedPiece.dataset.row = newRow;
    selectedPiece.dataset.col = newCol;
    
    // Promotion en dame
    if ((isBlack && newRow === 7) || (!isBlack && newRow === 0)) {
        selectedPiece.classList.add('king');
    }
    
    selectedPiece.classList.remove('selected');
    selectedPiece = null;
}

createBoard();