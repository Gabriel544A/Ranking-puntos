// Datos iniciales
let players = [];
let matches = [];
let nextPlayerId = 1;
let currentEditingPlayerId = null;
let selectedColor = '#3498db';
let playerToDelete = null;
let lastSyncTimestamp = 0;
let teamStats = {}; // Para almacenar estadísticas de parejas
let editModeEnabled = false;

// Función para alternar el modo de edición
function toggleEditMode(enabled) {
    editModeEnabled = enabled;
    
    // Mostrar/ocultar elementos de edición
    document.getElementById('addPlayerBtn').style.display = enabled ? 'flex' : 'none';
    document.getElementById('newPlayerName').style.display = enabled ? 'block' : 'none';
    document.getElementById('matchForm').style.display = enabled ? 'grid' : 'none';
    
    // Ocultar botones de eliminar
    document.querySelectorAll('.delete-match-btn').forEach(btn => {
        btn.style.display = enabled ? 'flex' : 'none';
    });
    
    // Ocultar botones de edición de jugadores
    document.querySelectorAll('.action-buttons button').forEach(btn => {
        btn.style.display = enabled ? 'flex' : 'none';
    });
    
    // Cambiar texto del botón
    const enableEditBtn = document.getElementById('enableEditBtn');
    if (enableEditBtn) {
        enableEditBtn.innerHTML = enabled ? 
            '<span>🔒</span> Deshabilitar Edición' : 
            '<span>🔓</span> Habilitar Edición';
    }
    
    // Guardar el estado en localStorage
    localStorage.setItem('editModeEnabled', enabled.toString());
}

// Función para solicitar contraseña
function requestPassword() {
    const passwordModal = document.getElementById('passwordModal');
    const passwordInput = document.getElementById('passwordInput');
    
    // Mostrar el modal
    passwordModal.style.display = 'block';
    
    // Enfocar el input
    setTimeout(() => {
        passwordInput.focus();
    }, 100);
    
    // Limpiar el input
    passwordInput.value = '';
    
    return new Promise((resolve) => {
        // Función para manejar la validación de contraseña
        function validatePassword() {
            const password = passwordInput.value;
            if (password === '544') {
                passwordModal.style.display = 'none';
                toggleEditMode(true);
                resolve(true);
            } else if (password !== '') {
                alert('Contraseña incorrecta');
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
        
        // Botón de confirmación
        const confirmBtn = document.getElementById('confirmPasswordBtn');
        const cancelBtn = document.getElementById('cancelPasswordBtn');
        const closeBtn = passwordModal.querySelector('.close');
        
        // Limpiar eventos previos
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        
        // Obtener las nuevas referencias
        const newConfirmBtn = document.getElementById('confirmPasswordBtn');
        const newCancelBtn = document.getElementById('cancelPasswordBtn');
        const newCloseBtn = passwordModal.querySelector('.close');
        
        // Configurar eventos
        newConfirmBtn.addEventListener('click', validatePassword);
        
        newCancelBtn.addEventListener('click', () => {
            passwordModal.style.display = 'none';
            resolve(false);
        });
        
        newCloseBtn.addEventListener('click', () => {
            passwordModal.style.display = 'none';
            resolve(false);
        });
        
        // Enter en el input
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                validatePassword();
            }
        });
        
        // Escape para cerrar
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape') {
                passwordModal.style.display = 'none';
                document.removeEventListener('keydown', escapeHandler);
                resolve(false);
            }
        });
    });
}

// Función para calcular promedio de puntos
function calculateAveragePoints(player) {
    if (!player.pointsHistory || player.pointsHistory.length === 0) return 0;
    const sum = player.pointsHistory.reduce((total, points) => total + points, 0);
    return sum / player.pointsHistory.length;
}

// Renderizar el ranking de parejas
function renderTeamRanking() {
    const tableBody = document.querySelector('#teamRankingTable tbody');
    tableBody.innerHTML = '';
    
    // Calcular estadísticas de parejas
    const teams = calculateTeamStats();
    
    // Convertir el objeto de equipos a un array para ordenarlo
    const teamsArray = Object.keys(teams).map(teamId => {
        return {
            id: teamId,
            ...teams[teamId]
        };
    });
    
    // Filtrar equipos que tienen al menos un partido
    const teamsWithMatches = teamsArray.filter(team => team.matches > 0);
    
    if (teamsWithMatches.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="5" style="text-align: center;">No hay parejas con partidos registrados</td>';
        tableBody.appendChild(row);
        return;
    }
    
    // Ordenar equipos por puntos totales descendente
    const sortedTeams = teamsWithMatches.sort((a, b) => b.points - a.points);
    
    sortedTeams.forEach((team, index) => {
        // Obtener nombres de los jugadores
        const player1 = players.find(p => p.id === team.players[0]);
        const player2 = players.find(p => p.id === team.players[1]);
        
        // Si algún jugador no existe (fue eliminado), saltar este equipo
        if (!player1 || !player2) return;
        
        const avgPoints = calculateTeamAveragePoints(team);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <span style="color: ${player1.color || '#000'}">${player1.name}</span> & 
                <span style="color: ${player2.color || '#000'}">${player2.name}</span>
            </td>
            <td>${team.points.toFixed(1).replace('.', ',')}</td>
            <td>${avgPoints.toFixed(1).replace('.', ',')}</td>
            <td>${team.matches}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Función para exportar datos a un archivo JSON
function exportData() {
    try {
        // Crear objeto con todos los datos
        const exportData = {
            players: players,
            matches: matches,
            lastExport: Date.now(),
            version: '1.0'
        };
        
        // Convertir a JSON
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Crear blob y enlace de descarga
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // Crear enlace temporal y hacer clic en él
        const a = document.createElement('a');
        a.href = url;
        a.download = `padel_ranking_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        
        // Limpiar
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        
        return true;
    } catch (error) {
        console.error('Error al exportar datos:', error);
        alert('Error al exportar datos. Por favor intenta de nuevo.');
        return false;
    }
}

// Función para importar datos desde un archivo JSON
function importData(file) {
    try {
        // Verificar que es un archivo JSON
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            alert('Por favor selecciona un archivo JSON válido');
            return false;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                // Parsear el contenido del archivo
                const importedData = JSON.parse(e.target.result);
                
                // Validar que el archivo tiene la estructura correcta
                if (!importedData.players || !importedData.matches || !Array.isArray(importedData.players) || !Array.isArray(importedData.matches)) {
                    alert('El archivo no contiene datos válidos de ranking de pádel');
                    return;
                }
                
                // Confirmar la importación
                if (confirm(`¿Estás seguro de que deseas importar estos datos? Se reemplazarán todos los datos actuales.\n\nJugadores: ${importedData.players.length}\nPartidos: ${importedData.matches.length}`)) {
                    // Reemplazar datos actuales
                    players = importedData.players;
                    matches = importedData.matches;
                    
                    // Calcular el próximo ID disponible
                    if (players.length > 0) {
                        nextPlayerId = Math.max(...players.map(p => p.id)) + 1;
                    } else {
                        nextPlayerId = 1;
                    }
                    
                    // Asegurarse que todos los jugadores tengan pointsHistory
                    players.forEach(player => {
                        if (!player.pointsHistory) {
                            player.pointsHistory = [];
                        }
                    });
                    
                    // Guardar datos importados
                    savePlayers();
                    saveMatches();
                    syncData();
                    
                    // Actualizar la UI
                    renderPlayersList();
                    renderPlayersDropdown();
                    renderRanking();
                    renderTeamRanking();
                    renderMatches();
                    updateStats();
                    
                    alert('Datos importados correctamente');
                }
            } catch (parseError) {
                console.error('Error al parsear el archivo JSON:', parseError);
                alert('El archivo no contiene un formato JSON válido');
            }
        };
        
        reader.onerror = function() {
            console.error('Error al leer el archivo');
            alert('Error al leer el archivo. Por favor intenta de nuevo.');
        };
        
        // Leer el archivo como texto
        reader.readAsText(file);
        
        return true;
    } catch (error) {
        console.error('Error al importar datos:', error);
        alert('Error al importar datos. Por favor intenta de nuevo.');
        return false;
    }
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    loadPlayers();
    loadMatches();
    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    renderTeamRanking();
    renderMatches();
    updateStats();
    
    // Configurar sincronización periódica
    setInterval(syncData, 30000); // Sincronizar cada 30 segundos
    
    // Manejar el formulario de partido
    document.getElementById('matchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (editModeEnabled) {
            registerMatch();
        }
    });
    
    // Manejar agregar nuevo jugador
    document.getElementById('addPlayerBtn').addEventListener('click', function() {
        if (editModeEnabled) {
            addNewPlayer();
        }
    });
    
    // Manejar Enter en el campo de nuevo jugador
    document.getElementById('newPlayerName').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && editModeEnabled) {
            e.preventDefault();
            addNewPlayer();
        }
    });
    
    // Configurar eventos para actualizar dropdowns cuando se selecciona un jugador
    ['player1', 'player2', 'player3', 'player4'].forEach(dropdownId => {
        document.getElementById(dropdownId).addEventListener('change', function() {
            renderPlayersDropdown();
        });
    });
    
    // Manejar exportación de datos
    document.getElementById('exportDataBtn').addEventListener('click', function() {
        exportData();
    });
    
    // Manejar importación de datos
    document.getElementById('importDataBtn').addEventListener('click', function() {
        document.getElementById('importFileInput').click();
    });
    
    // Manejar selección de archivo para importar
    document.getElementById('importFileInput').addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            importData(e.target.files[0]);
        }
    });
    
    // Configurar modal de edición
    const editModal = document.getElementById('editPlayerModal');
    const confirmDeleteModal = document.getElementById('confirmDeleteModal');
    const passwordModal = document.getElementById('passwordModal');
    const span = document.getElementsByClassName('close')[0];
    const cancelBtn = document.getElementById('cancelEditBtn');
    
    span.onclick = function() {
        editModal.style.display = 'none';
    }
    
    cancelBtn.onclick = function() {
        editModal.style.display = 'none';
    }
    
    window.onclick = function(event) {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
        if (event.target == confirmDeleteModal) {
            confirmDeleteModal.style.display = 'none';
        }
        if (event.target == passwordModal) {
            passwordModal.style.display = 'none';
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
        if (editModeEnabled) {
            savePlayerChanges();
        }
    });
    
    // Manejar botón de eliminar jugador
    document.getElementById('deletePlayerBtn').addEventListener('click', function() {
        if (editModeEnabled) {
            const player = players.find(p => p.id === currentEditingPlayerId);
            if (player) {
                playerToDelete = player.id;
                document.getElementById('deleteConfirmationText').textContent = 
                    `¿Estás seguro de que deseas eliminar a "${player.name}"? Esta acción eliminará todos sus partidos y no se puede deshacer.`;
                confirmDeleteModal.style.display = 'block';
                editModal.style.display = 'none';
            }
        }
    });
    
    // Manejar confirmación de eliminación
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        if (editModeEnabled && playerToDelete) {
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
    
    // Manejar botón de habilitar edición
    document.getElementById('enableEditBtn').addEventListener('click', async function() {
        if (editModeEnabled) {
            toggleEditMode(false);
        } else {
            await requestPassword();
        }
    });
    
    // Configurar evento para sincronizar antes de cerrar la página
    window.addEventListener('beforeunload', function() {
        syncData();
    });
    
    // Cargar estado del modo de edición
    const savedEditMode = localStorage.getItem('editModeEnabled');
    if (savedEditMode === 'true') {
        toggleEditMode(true);
    } else {
        toggleEditMode(false);
    }
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
    // Calcular jugador con mejor promedio (con al menos 1 partido)
    if (players.length > 0) {
        const playersWithMatches = players.filter(p => p.matches > 0);
        
        if (playersWithMatches.length > 0) {
            const playerWithBestAvg = [...playersWithMatches]
                .sort((a, b) => calculateAveragePoints(b) - calculateAveragePoints(a))[0];
            
            const avg = calculateAveragePoints(playerWithBestAvg);
            document.getElementById('topPlayer').innerHTML = 
                `<div>${playerWithBestAvg.name}</div>
                <div class="stat-points">${avg.toFixed(1).replace('.', ',')} pts/partido</div>`;
        } else {
            document.getElementById('topPlayer').textContent = 'Ningún jugador con partidos';
        }
    } else {
        document.getElementById('topPlayer').textContent = '-';
    }
    
    // Calcular pareja con mejor promedio
    const teams = calculateTeamStats();
    const teamsArray = Object.keys(teams).map(teamId => {
        return {
            id: teamId,
            ...teams[teamId]
        };
    });
    
    // Filtrar equipos que tienen al menos un partido
    const teamsWithMatches = teamsArray.filter(team => team.matches > 0);
    
    if (teamsWithMatches.length > 0) {
        // Ordenar por promedio de puntos
        const sortedTeams = teamsWithMatches.sort((a, b) => {
            const avgA = calculateTeamAveragePoints(a);
            const avgB = calculateTeamAveragePoints(b);
            return avgB - avgA;
        });
        
        const bestTeam = sortedTeams[0];
        const player1 = players.find(p => p.id === bestTeam.players[0]);
        const player2 = players.find(p => p.id === bestTeam.players[1]);
        
        if (player1 && player2) {
            const avgPoints = calculateTeamAveragePoints(bestTeam);
            document.getElementById('topTeam').innerHTML = 
                `<div>${player1.name} & ${player2.name}</div>
                <div class="stat-points">${avgPoints.toFixed(1).replace('.', ',')} pts/partido</div>`;
        } else {
            document.getElementById('topTeam').textContent = 'Datos incompletos';
        }
    } else {
        document.getElementById('topTeam').textContent = 'Ninguna pareja con partidos';
    }
}

// Agregar nuevo jugador
function addNewPlayer() {
    if (!editModeEnabled) return;
    
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
    if (!editModeEnabled) return;
    
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
    if (!editModeEnabled) return;
    
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
    renderTeamRanking(); // Actualizar ranking de parejas
    renderMatches();
    updateStats();
    
    document.getElementById('editPlayerModal').style.display = 'none';
}

// Eliminar jugador
function deletePlayer(playerId) {
    if (!editModeEnabled) return;
    
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
    renderTeamRanking(); // Actualizar ranking de parejas
    renderMatches();
    updateStats();
}

// Confirmar eliminación de partido
function confirmDeleteMatch(matchId) {
    if (!editModeEnabled) return;
    
    if (confirm('¿Estás seguro de que deseas eliminar este partido? Esta acción no se puede deshacer.')) {
        deleteMatch(matchId);
    }
}

// Eliminar partido
function deleteMatch(matchId) {
    if (!editModeEnabled) return;
    
    // Encontrar el partido por ID
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;
    
    // Eliminar partido
    matches.splice(matchIndex, 1);
    
    // Guardar cambios
    saveMatches();
    syncData();
    
    // Recalcular puntuaciones de todos los jugadores
    recalculateAllRatings();
    
    // Actualizar la UI
    renderRanking();
    renderTeamRanking();
    renderMatches();
    updateStats();
}

// Recalcular todas las puntuaciones desde cero
function recalculateAllRatings() {
    // Reiniciar puntuaciones de todos los jugadores
    players.forEach(player => {
        player.rating = 0;
        player.matches = 0;
        player.wins = 0;
        player.losses = 0;
        player.pointsHistory = [];
    });
    
    // Recalcular basado en los partidos existentes
    matches.forEach(match => {
        // Verificar que todos los jugadores existan antes de actualizar puntuaciones
        const player1 = players.find(p => p.id === match.teamA[0]);
        const player2 = players.find(p => p.id === match.teamA[1]);
        const player3 = players.find(p => p.id === match.teamB[0]);
        const player4 = players.find(p => p.id === match.teamB[1]);
        
        if (player1 && player2 && player3 && player4) {
            updateRatings(match);
        }
    });
    
    savePlayers();
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
                <button class="btn-warning" onclick="editPlayer(${player.id})" style="display: none;">
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
    
    // Obtener los valores seleccionados actualmente
    const selectedValues = {};
    dropdowns.forEach(id => {
        const dropdown = document.getElementById(id);
        if (dropdown.value) {
            selectedValues[id] = dropdown.value;
        }
    });
    
    // Actualizar cada dropdown
    dropdowns.forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        const currentValue = dropdown.value;
        
        dropdown.innerHTML = '<option value="">Seleccionar jugador</option>';
        
        // Ordenar jugadores por nombre
        const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
        
        sortedPlayers.forEach(player => {
            // Verificar si este jugador ya está seleccionado en otro dropdown
            const isSelectedElsewhere = Object.entries(selectedValues).some(([id, value]) => 
                id !== dropdownId && value === player.id.toString()
            );
            
            // Solo añadir el jugador si no está seleccionado en otro dropdown o si es el valor actual de este dropdown
            if (!isSelectedElsewhere || player.id.toString() === currentValue) {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.name;
                option.style.color = player.color || '#000';
                dropdown.appendChild(option);
            }
        });
        
        // Restaurar el valor seleccionado si existía
        if (currentValue) {
            dropdown.value = currentValue;
        }
    });
}

// Registrar un nuevo partido
function registerMatch() {
    if (!editModeEnabled) return;
    
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
    
    // Obtener fecha del partido (usar fecha actual si no se seleccionó otra)
    let date = document.getElementById('date').value;
    if (!date) {
        const today = new Date();
        date = today.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        document.getElementById('date').value = date;
    }
    
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
    renderTeamRanking(); // Actualizar ranking de parejas
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

// Calcular estadísticas de parejas
function calculateTeamStats() {
    teamStats = {}; // Reiniciar estadísticas
    
    matches.forEach(match => {
        // Crear identificadores únicos para cada pareja
        const teamAId = match.teamA.sort().join('-');
        const teamBId = match.teamB.sort().join('-');
        
        // Inicializar estadísticas si no existen
        if (!teamStats[teamAId]) {
            teamStats[teamAId] = {
                players: match.teamA,
                matches: 0,
                wins: 0,
                losses: 0,
                points: 0,
                pointsHistory: []
            };
        }
        
        if (!teamStats[teamBId]) {
            teamStats[teamBId] = {
                players: match.teamB,
                matches: 0,
                wins: 0,
                losses: 0,
                points: 0,
                pointsHistory: []
            };
        }
        
        // Actualizar estadísticas basadas en el resultado del partido
        teamStats[teamAId].matches++;
        teamStats[teamBId].matches++;
        
        // Calcular puntos ganados en este partido
        const scoreDiff = Math.abs(match.scoreA - match.scoreB);
        const winnerBasePoints = 3;
        const loserBasePoints = 1;
        const diffMultiplier = 0.5;
        const extraPoints = scoreDiff * diffMultiplier;
        
        if (match.scoreA > match.scoreB) {
            // Equipo A ganó
            teamStats[teamAId].wins++;
            teamStats[teamBId].losses++;
            
            const totalPointsWinner = winnerBasePoints + extraPoints;
            teamStats[teamAId].points += totalPointsWinner;
            teamStats[teamAId].pointsHistory.push(totalPointsWinner);
            
            teamStats[teamBId].points += loserBasePoints;
            teamStats[teamBId].pointsHistory.push(loserBasePoints);
        } else {
            // Equipo B ganó
            teamStats[teamBId].wins++;
            teamStats[teamAId].losses++;
            
            const totalPointsWinner = winnerBasePoints + extraPoints;
            teamStats[teamBId].points += totalPointsWinner;
            teamStats[teamBId].pointsHistory.push(totalPointsWinner);
            
            teamStats[teamAId].points += loserBasePoints;
            teamStats[teamAId].pointsHistory.push(loserBasePoints);
        }
    });
    
    return teamStats;
}

// Calcular promedio de puntos para una pareja
function calculateTeamAveragePoints(team) {
    if (!team.pointsHistory || team.pointsHistory.length === 0) return 0;
    const sum = team.pointsHistory.reduce((total, points) => total + points, 0);
    return sum / team.pointsHistory.length;
}

// Renderizar historial de partidos
function renderMatches() {
    const tableBody = document.querySelector('#matchesTable tbody');
    tableBody.innerHTML = '';
    
    if (matches.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center;">No hay partidos registrados</td>';
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
            <td>
                <button class="btn-danger btn-small delete-match-btn" data-match-id="${match.id}" style="display: none;">
                    <span>🗑️</span>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Agregar event listeners a los botones de borrar
    document.querySelectorAll('.delete-match-btn').forEach(button => {
        button.addEventListener('click', function() {
            const matchId = parseInt(this.getAttribute('data-match-id'));
            confirmDeleteMatch(matchId);
        });
    });
}