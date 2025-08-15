// Datos iniciales
let players = [];
let matches = [];
let nextPlayerId = 1;
let currentEditingPlayerId = null;
let selectedColor = '#3498db';
let playerToDelete = null;
let lastSyncTimestamp = 0;

// Función para calcular promedio de puntos
function calculateAveragePoints(player) {
    if (!player.pointsHistory || player.pointsHistory.length === 0) return 0;
    const sum = player.pointsHistory.reduce((total, points) => total + points, 0);
    return sum / player.pointsHistory.length;
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadPlayers();
    loadMatches();
    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    renderMatches();
    updateStats();
    
    // Configurar sincronización periódica
    setInterval(syncData, 30000); // Sincronizar cada 30 segundos
    
    // Manejar el formulario de partido
    document.getElementById('matchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        registerMatch();
    });
    
    // Manejar agregar nuevo jugador
    document.getElementById('addPlayerBtn').addEventListener('click', function() {
        addNewPlayer();
    });
    
    // Configurar modal de edición
    const editModal = document.getElementById('editPlayerModal');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const span = document.getElementsByClassName('close')[0];
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    span.onclick = function() {
        editModal.style.display = 'none';
    }
    
    cancelBtn.onclick = function() {
        editModal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == editModal || event.target == confirmDeleteModal) {
            editModal.style.display = 'none';
            confirmDeleteModal.style.display = 'none';
        }
    }
    
    // Manejar selección de color
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.color-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            this.classList.add('selected');
            selectedColor = this.getAttribute('data-color');
        });
    });
    
    // Manejar guardar cambios de jugador
    document.getElementById('saveEditBtn').addEventListener('click', function() {
        savePlayerChanges();
    });
    
    // Manejar botón de eliminar jugador
    document.getElementById('deletePlayerBtn').addEventListener('click', function() {
        const player = players.find(p => p.id === currentEditingPlayerId);
        if (player) {
            playerToDelete = player.id;
            document.getElementById('deleteConfirmationText').textContent = 
                `¿Estás seguro de que deseas eliminar a "${player.name}"? Esta acción eliminará todos sus partidos y no se puede deshacer.`;
            confirmDeleteModal.style.display = 'block';
            editModal.style.display = 'none';
        }
    });
    
    // Manejar confirmación de eliminación
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (playerToDelete) {
            deletePlayer(playerToDelete);
            confirmDeleteModal.style.display = 'none';
            playerToDelete = null;
            updateStats();
        }
    });
    
    // Manejar cancelación de eliminación
    document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
        confirmDeleteModal.style.display = 'none';
        editModal.style.display = 'block';
        playerToDelete = null;
    });
    
    // Configurar evento para sincronizar antes de cerrar la página
    window.addEventListener('beforeunload', function() {
        syncData();
    });
});

// Cargar jugadores desde localStorage
function loadPlayers() {
    const storedPlayers = localStorage.getItem('padelPlayers');
    if (storedPlayers) {
        players = JSON.parse(storedPlayers);
        // Calcular el próximo ID disponible
        if (players.length > 0) {
            nextPlayerId = Math.max(...players.map(p => p.id)) + 1;
        }
        
        // Asegurarse que todos los jugadores tengan pointsHistory
        players.forEach(player => {
            if (!player.pointsHistory) {
                player.pointsHistory = [];
            }
        });
    }
    
    // Cargar timestamp de última sincronización
    const lastSync = localStorage.getItem('lastSyncTimestamp');
    if (lastSync) {
        lastSyncTimestamp = parseInt(lastSync);
    }
}

// Cargar partidos desde localStorage
function loadMatches() {
    const storedMatches = localStorage.getItem('padelMatches');
    if (storedMatches) {
        matches = JSON.parse(storedMatches);
    }
}

// Guardar jugadores en localStorage
function savePlayers() {
    localStorage.setItem('padelPlayers', JSON.stringify(players));
    // Actualizar timestamp de sincronización
    lastSyncTimestamp = Date.now();
    localStorage.setItem('lastSyncTimestamp', lastSyncTimestamp);
}

// Guardar partidos en localStorage
function saveMatches() {
    localStorage.setItem('padelMatches', JSON.stringify(matches));
    // Actualizar timestamp de sincronización
    lastSyncTimestamp = Date.now();
    localStorage.setItem('lastSyncTimestamp', lastSyncTimestamp);
}

// Sincronizar datos con almacenamiento persistente
function syncData() {
    try {
        // Intentar cargar datos más recientes
        const storedTimestamp = localStorage.getItem('lastSyncTimestamp');
        if (storedTimestamp) {
            const timestamp = parseInt(storedTimestamp);
            
            // Si hay datos más recientes en localStorage, cargarlos
            if (timestamp > lastSyncTimestamp) {
                loadPlayers();
                loadMatches();
                renderPlayersList();
                renderPlayersDropdown();
                renderRanking();
                renderMatches();
                updateStats();
                console.log('Datos sincronizados desde almacenamiento local');
            }
        }
        
        // Guardar datos actuales
        savePlayers();
        saveMatches();
        
        // Verificar si hay datos en IndexedDB para respaldo adicional
        backupToIndexedDB();
        
        return true;
    } catch (error) {
        console.error('Error al sincronizar datos:', error);
        return false;
    }
}

// Función para respaldar datos en IndexedDB (almacenamiento más robusto)
function backupToIndexedDB() {
    // Verificar si IndexedDB está disponible
    if (!window.indexedDB) {
        console.log('Este navegador no soporta IndexedDB');
        return;
    }
    
    // Abrir o crear base de datos
    const request = indexedDB.open('PadelRankingDB', 1);
    
    request.onerror = function(event) {
        console.error('Error al abrir IndexedDB:', event.target.error);
    };
    
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        
        // Crear almacenes de objetos si no existen
        if (!db.objectStoreNames.contains('players')) {
            db.createObjectStore('players', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('matches')) {
            db.createObjectStore('matches', { keyPath: 'id' });
        }
    };
    
    request.onsuccess = function(event) {
        const db = event.target.result;
        const transaction = db.transaction(['players', 'matches'], 'readwrite');
        
        // Almacenar jugadores
        const playersStore = transaction.objectStore('players');
        players.forEach(player => {
            playersStore.put(player);
        });
        
        // Almacenar partidos
        const matchesStore = transaction.objectStore('matches');
        matches.forEach(match => {
            matchesStore.put(match);
        });
        
        transaction.oncomplete = function() {
            console.log('Respaldo en IndexedDB completado');
        };
        
        transaction.onerror = function(event) {
            console.error('Error en transacción de IndexedDB:', event.target.error);
        };
    };
}

// Función para recuperar datos desde IndexedDB si localStorage falla
function recoverFromIndexedDB() {
    if (!window.indexedDB) {
        return false;
    }
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('PadelRankingDB', 1);
        
        request.onerror = function() {
            reject(new Error('No se pudo abrir IndexedDB'));
        };
        
        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['players', 'matches'], 'readonly');
            const playersStore = transaction.objectStore('players');
            const matchesStore = transaction.objectStore('matches');
            
            const playersRequest = playersStore.getAll();
            const matchesRequest = matchesStore.getAll();
            
            playersRequest.onsuccess = function() {
                if (playersRequest.result.length > 0) {
                    players = playersRequest.result;
                    if (players.length > 0) {
                        nextPlayerId = Math.max(...players.map(p => p.id)) + 1;
                    }
                }
            };
            
            matchesRequest.onsuccess = function() {
                if (matchesRequest.result.length > 0) {
                    matches = matchesRequest.result;
                }
            };
            
            transaction.oncomplete = function() {
                console.log('Datos recuperados desde IndexedDB');
                resolve(true);
            };
            
            transaction.onerror = function() {
                reject(new Error('Error al recuperar datos desde IndexedDB'));
            };
        };
    });
}

// Actualizar estadísticas generales
function updateStats() {
    document.getElementById('totalPlayers').textContent = players.length;
    document.getElementById('totalMatches').textContent = matches.length;
    
    if (players.length > 0) {
        // Calcular jugador con mejor promedio (con al menos 1 partido)
        const playersWithMatches = players.filter(p => p.matches > 0);
        
        if (playersWithMatches.length > 0) {
            const playerWithBestAvg = [...playersWithMatches]
                .sort((a, b) => calculateAveragePoints(b) - calculateAveragePoints(a))[0];
            
            const avg = calculateAveragePoints(playerWithBestAvg);
            document.getElementById('topPlayer').textContent = 
                `${playerWithBestAvg.name} (${avg.toFixed(1).replace('.', ',')} pts/partido)`;
        } else {
            document.getElementById('topPlayer').textContent = 'Ningún jugador con partidos';
        }
    } else {
        document.getElementById('topPlayer').textContent = '-';
    }
}

// Agregar nuevo jugador
function addNewPlayer() {
    const nameInput = document.getElementById('newPlayerName');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Por favor ingresa un nombre para el jugador');
        return;
    }
    
    // Verificar si el jugador ya existe (búsqueda insensible a mayúsculas/minúsculas)
    const existingPlayerIndex = players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingPlayerIndex >= 0) {
        // Si el jugador existe, mostrar confirmación para actualizar
        if (confirm(`El jugador "${name}" ya existe. ¿Deseas actualizar sus datos?`)) {
            // Mantener datos históricos y solo actualizar el nombre si hay cambios de capitalización
            if (players[existingPlayerIndex].name !== name) {
                players[existingPlayerIndex].name = name;
                savePlayers();
                syncData();
                
                // Actualizar la UI
                renderPlayersList();
                renderPlayersDropdown();
                renderRanking();
                renderMatches();
                updateStats();
            }
        }
        nameInput.value = '';
        return;
    }
    
    // Crear nuevo jugador con pointsHistory
    const newPlayer = {
        id: nextPlayerId++,
        name: name,
        rating: 0,
        matches: 0,
        wins: 0,
        losses: 0,
        pointsHistory: [],
        color: selectedColor || '#3498db',
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    players.push(newPlayer);
    savePlayers();
    syncData(); // Sincronizar después de agregar un jugador
    
    // Actualizar la UI
    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    updateStats();
    
    // Limpiar campo de entrada
    nameInput.value = '';
}

// Abrir modal para editar jugador
function editPlayer(playerId) {
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    currentEditingPlayerId = playerId;
    document.getElementById('editPlayerName').value = player.name;
    
    // Seleccionar el color actual
    selectedColor = player.color || '#3498db';
    document.querySelectorAll('.color-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.getAttribute('data-color') === selectedColor) {
            opt.classList.add('selected');
        }
    });
    
    document.getElementById('editPlayerModal').style.display = 'block';
}

// Guardar cambios del jugador
function savePlayerChanges() {
    const newName = document.getElementById('editPlayerName').value.trim();
    
    if (!newName) {
        alert('El nombre no puede estar vacío');
        return;
    }
    
    // Verificar si el nombre ya existe en otro jugador
    const existingPlayer = players.find(p => 
        p.id !== currentEditingPlayerId && 
        p.name.toLowerCase() === newName.toLowerCase()
    );
    
    if (existingPlayer) {
        alert(`Ya existe otro jugador con el nombre "${newName}"`);
        return;
    }
    
    const playerIndex = players.findIndex(p => p.id === currentEditingPlayerId);
    if (playerIndex === -1) return;
    
    // Actualizar datos del jugador
    players[playerIndex].name = newName;
    players[playerIndex].color = selectedColor;
    players[playerIndex].updatedAt = Date.now();
    
    savePlayers();
    syncData(); // Sincronizar después de actualizar un jugador
    
    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    renderMatches();
    updateStats();
    
    document.getElementById('editPlayerModal').style.display = 'none';
}

// Eliminar jugador
function deletePlayer(playerId) {
    // Eliminar jugador
    players = players.filter(p => p.id !== playerId);
    
    // Eliminar partidos que incluían a este jugador
    matches = matches.filter(match => 
        !match.teamA.includes(playerId) && !match.teamB.includes(playerId)
    );
    
    // Guardar cambios
    savePlayers();
    saveMatches();
    syncData(); // Sincronizar después de eliminar un jugador
    
    // Actualizar la UI
    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    renderMatches();
    updateStats();
}

// Renderizar lista de jugadores
function renderPlayersList() {
    const playerList = document.getElementById('playerList');
    
    if (players.length === 0) {
        playerList.innerHTML = '<div class="no-players">No hay jugadores registrados</div>';
        return;
    }
    
    playerList.innerHTML = '';
    
    // Ordenar jugadores por nombre
    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedPlayers.forEach(player => {
        const avgPoints = calculateAveragePoints(player);
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        
        playerItem.innerHTML = `
            <div class="player-info">
                <span style="color: ${player.color || '#000'}">${player.name}</span>
                <span class="player-rating">${avgPoints.toFixed(1).replace('.', ',')} pts/partido</span>
            </div>
            <div class="action-buttons">
                <button class="btn-warning" onclick="editPlayer(${player.id})">
                    <span>✏️</span> Editar
                </button>
            </div>
        `;
        
        playerList.appendChild(playerItem);
    });
}

// Renderizar jugadores en los dropdowns
function renderPlayersDropdown() {
    const dropdowns = ['player1', 'player2', 'player3', 'player4'];
    
    dropdowns.forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        dropdown.innerHTML = '<option value="">Seleccionar jugador</option>';
        
        // Ordenar jugadores por nombre
        const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedPlayers.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = player.name;
            option.style.color = player.color || '#000';
            dropdown.appendChild(option);
        });
    });
}

// Registrar un nuevo partido
function registerMatch() {
    // Validar que hay al menos 4 jugadores
    if (players.length < 4) {
        alert('Debes tener al menos 4 jugadores registrados para registrar un partido');
        return;
    }
    
    // Obtener datos del formulario
    const player1Id = parseInt(document.getElementById('player1').value);
    const player2Id = parseInt(document.getElementById('player2').value);
    const player3Id = parseInt(document.getElementById('player3').value);
    const player4Id = parseInt(document.getElementById('player4').value);
    const scoreA = parseInt(document.getElementById('scoreA').value);
    const scoreB = parseInt(document.getElementById('scoreB').value);
    const date = document.getElementById('date').value;
    
    // Validar que no hay jugadores repetidos
    const uniquePlayers = new Set([player1Id, player2Id, player3Id, player4Id]);
    if (uniquePlayers.size < 4) {
        alert('No puede haber jugadores repetidos en un partido');
        return;
    }
    
    // Validar que los puntajes son válidos
    if (scoreA === scoreB) {
        alert('El partido no puede terminar en empate');
        return;
    }
    
    // Crear objeto de partido
    const match = {
        id: matches.length + 1,
        date: date,
        teamA: [player1Id, player2Id],
        teamB: [player3Id, player4Id],
        scoreA: scoreA,
        scoreB: scoreB,
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    // Añadir a la lista de partidos
    matches.push(match);
    saveMatches();
    
    // Actualizar puntuaciones de los jugadores
    updateRatings(match);
    
    // Sincronizar datos
    syncData();
    
    // Actualizar la UI
    renderRanking();
    renderMatches();
    renderPlayersList();
    updateStats();
    
    // Limpiar formulario
    document.getElementById('matchForm').reset();
}

// Actualizar puntuaciones basado en el partido
function updateRatings(match) {
    // Obtener jugadores
    const player1 = players.find(p => p.id === match.teamA[0]);
    const player2 = players.find(p => p.id === match.teamA[1]);
    const player3 = players.find(p => p.id === match.teamB[0]);
    const player4 = players.find(p => p.id === match.teamB[1]);
    
    // Calcular diferencia de puntos
    const scoreDiff = Math.abs(match.scoreA - match.scoreB);
    
    // Puntos base
    const winnerBasePoints = 3;
    const loserBasePoints = 1;
    const diffMultiplier = 0.5;
    
    // Calcular puntos adicionales por diferencia
    const extraPoints = scoreDiff * diffMultiplier;
    
    // Asegurarse que todos los jugadores tengan pointsHistory
    if (!player1.pointsHistory) player1.pointsHistory = [];
    if (!player2.pointsHistory) player2.pointsHistory = [];
    if (!player3.pointsHistory) player3.pointsHistory = [];
    if (!player4.pointsHistory) player4.pointsHistory = [];
    
    // Determinar qué equipo ganó
    if (match.scoreA > match.scoreB) {
        // Pareja A ganó
        const totalPointsWinner = winnerBasePoints + extraPoints;
        player1.rating += totalPointsWinner;
        player2.rating += totalPointsWinner;
        player1.pointsHistory.push(totalPointsWinner);
        player2.pointsHistory.push(totalPointsWinner);
        
        // Pareja B perdió
        player3.rating += loserBasePoints;
        player4.rating += loserBasePoints;
        player3.pointsHistory.push(loserBasePoints);
        player4.pointsHistory.push(loserBasePoints);
        
        // Actualizar estadísticas
        player1.wins++;
        player2.wins++;
        player3.losses++;
        player4.losses++;
    } else {
        // Pareja B ganó
        const totalPointsWinner = winnerBasePoints + extraPoints;
        player3.rating += totalPointsWinner;
        player4.rating += totalPointsWinner;
        player3.pointsHistory.push(totalPointsWinner);
        player4.pointsHistory.push(totalPointsWinner);
        
        // Pareja A perdió
        player1.rating += loserBasePoints;
        player2.rating += loserBasePoints;
        player1.pointsHistory.push(loserBasePoints);
        player2.pointsHistory.push(loserBasePoints);
        
        // Actualizar estadísticas
        player3.wins++;
        player4.wins++;
        player1.losses++;
        player2.losses++;
    }
    
    // Incrementar contador de partidos para todos
    player1.matches++;
    player2.matches++;
    player3.matches++;
    player4.matches++;
    
    // Actualizar timestamps
    player1.updatedAt = Date.now();
    player2.updatedAt = Date.now();
    player3.updatedAt = Date.now();
    player4.updatedAt = Date.now();
    
    // Guardar cambios
    savePlayers();
    // No es necesario llamar a syncData() aquí porque ya se llama en registerMatch()
}

// Renderizar el ranking (versión compacta para sidebar)
function renderRanking() {
    const tableBody = document.querySelector('#rankingTable tbody');
    tableBody.innerHTML = '';
    
    // Ordenar jugadores por PUNTOS TOTALES descendente
    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);
    
    sortedPlayers.forEach((player, index) => {
        const avgPoints = calculateAveragePoints(player);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td style="color: ${player.color || '#000'}">${player.name}</td>
            <td>${player.rating.toFixed(1).replace('.', ',')}</td>
            <td>${avgPoints.toFixed(1).replace('.', ',')}</td>
            <td>${player.matches}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Renderizar historial de partidos
function renderMatches() {
    const tableBody = document.querySelector('#matchesTable tbody');
    tableBody.innerHTML = '';
    
    if (matches.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center;">No hay partidos registrados</td>';
        tableBody.appendChild(row);
        return;
    }
    
    // Ordenar partidos por fecha (más reciente primero)
    const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedMatches.forEach(match => {
        // Obtener jugadores (con verificación por si alguno fue eliminado)
        const player1 = players.find(p => p.id === match.teamA[0]);
        const player2 = players.find(p => p.id === match.teamA[1]);
        const player3 = players.find(p => p.id === match.teamB[0]);
        const player4 = players.find(p => p.id === match.teamB[1]);
        
        // Si algún jugador no existe (fue eliminado), saltar este partido
        if (!player1 || !player2 || !player3 || !player4) return;
        
        // Formatear resultado
        const result = `${match.scoreA}-${match.scoreB}`;
        const winners = match.scoreA > match.scoreB ? 
            `${player1.name} & ${player2.name}` : `${player3.name} & ${player4.name}`;
        
        // Formatear fecha
        const dateObj = new Date(match.date);
        const formattedDate = dateObj.toLocaleDateString('es-ES');
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>
                <span style="color: ${player1.color || '#000'}">${player1.name}</span> & 
                <span style="color: ${player2.color || '#000'}">${player2.name}</span>
            </td>
            <td>
                <span style="color: ${player3.color || '#000'}">${player3.name}</span> & 
                <span style="color: ${player4.color || '#000'}">${player4.name}</span>
            </td>
            <td>${result}</td>
            <td>${winners}</td>
        `;
        tableBody.appendChild(row);
    });
}
