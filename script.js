// --- FIREBASE INTEGRACIÓN ---
let db = null;
document.addEventListener('DOMContentLoaded', () => {
  if (window.db) db = window.db;
});

// Cargar jugadores desde Firestore
async function loadPlayersFromFirestore() {
  if (!db) return;
  const querySnapshot = await window.getDocs(window.collection(db, "jugadores"));
  const cloudPlayers = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    cloudPlayers.push({ ...data, id: data.id || doc.id });
  });
  if (cloudPlayers.length > 0) {
    players = cloudPlayers;
    localStorage.setItem('padelPlayers', JSON.stringify(players));
    nextPlayerId = Math.max(...players.map(p => p.id)) + 1;
  }
}

// Guardar jugador en Firestore
async function savePlayerToFirestore(player) {
  if (!db) return;
  await window.addDoc(window.collection(db, "jugadores"), player);
}

// Cargar partidos desde Firestore
async function loadMatchesFromFirestore() {
    if (!db) return;
    const querySnapshot = await window.getDocs(window.collection(db, "partidos"));
    const cloudMatches = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Usar el ID asignado al partido, no el ID del documento
        cloudMatches.push({
            id: Number(data.id), // Asegurar que el ID sea número
            date: data.fecha,
            teamA: data.parejaA.map(Number),
            teamB: data.parejaB.map(Number),
            scoreA: data.puntosA,
            scoreB: data.puntosB,
            createdAt: data.createdAt || Date.now(),
            updatedAt: data.updatedAt || Date.now()
        });
    });
    if (cloudMatches.length > 0) {
        // Ordenar por ID descendente antes de guardar
        matches = cloudMatches.sort((a, b) => b.id - a.id);
        localStorage.setItem('padelMatches', JSON.stringify(matches));
    }
}

// Función para poner la fecha actual en GMT-3 en el input date
function setTodayDateGMT3() {
    const dateInput = document.getElementById('date');
    if (dateInput && !dateInput.value) {
        const now = new Date();
        const offsetMs = -3 * 60 * 60 * 1000;
        const gmt3 = new Date(now.getTime() + offsetMs);
        const year = gmt3.getUTCFullYear();
        const month = String(gmt3.getUTCMonth() + 1).padStart(2, '0');
        const day = String(gmt3.getUTCDate()).padStart(2, '0');
        dateInput.value = `${year}-${month}-${day}`;
    }
}

document.addEventListener('DOMContentLoaded', setTodayDateGMT3);

// También poner la fecha cada vez que se habilita el modo edición o se muestra el formulario
document.getElementById('enableEditBtn').addEventListener('click', function() {
    setTimeout(setTodayDateGMT3, 100); // Espera a que el formulario se muestre
});

// Manejar eliminación de partido
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('delete-match-btn')) {
        const matchId = e.target.getAttribute('data-match-id');
        if (matchId) {
            confirmDeleteMatch(matchId);
        }
    }
});

// Colores predefinidos con nombres descriptivos
const predefinedColors = [
    { hex: '#3498db', name: 'Azul' },
    { hex: '#e74c3c', name: 'Rojo' },
    { hex: '#2ecc71', name: 'Verde' },
    { hex: '#f39c12', name: 'Naranja' },
    { hex: '#9b59b6', name: 'Púrpura' },
    { hex: '#1abc9c', name: 'Turquesa' },
    { hex: '#d35400', name: 'Naranja oscuro' },
    { hex: '#34495e', name: 'Azul marino' },
    { hex: '#e67e22', name: 'Naranja claro' },
    { hex: '#E4F250', name: 'Amarillo brillante' },
    { hex: '#2980b9', name: 'Azul oscuro' },
    { hex: '#8e44ad', name: 'Violeta' },
    { hex: '#c0392b', name: 'Rojo oscuro' },
    { hex: '#16a085', name: 'Verde azulado' },
    { hex: '#f1c40f', name: 'Amarillo' },
    { hex: '#7f8c8d', name: 'Gris' },
    { hex: '#2c3e50', name: 'Azul noche' },
    { hex: '#e84393', name: 'Rosa' },
    { hex: '#6c5ce7', name: 'Índigo' },
    { hex: '#00b894', name: 'Menta' },
    { hex: '#e17055', name: 'Coral' },
    { hex: '#0984e3', name: 'Azul brillante' },
    { hex: '#fd79a8', name: 'Rosa claro' },
    { hex: '#a29bfe', name: 'Lavanda' },
    { hex: '#08EF01', name: 'Verde brillante' },
];

function hexToRgb(hex) {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
            case g: h = ((b - r) / d + 2); break;
            case b: h = ((r - g) / d + 4); break;
        }
        h /= 6;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return [h * 360, s, v]; // h en [0..360), s y v en [0..1]
}

function hexToHsv(hex) {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
}

// Ordena por: colores (saturación >= 0.15) primero ordenados por Hue asc, luego Saturación desc, luego Valor desc.
// Neutros (saturación < 0.15) al final ordenados por Valor desc.
function sortPaletteByHSV(colors) {
    return [...colors].sort((a, b) => {
        const [ha, sa, va] = hexToHsv(a.hex);
        const [hb, sb, vb] = hexToHsv(b.hex);

        const aNeutral = sa < 0.15 ? 1 : 0;
        const bNeutral = sb < 0.15 ? 1 : 0;
        if (aNeutral !== bNeutral) return aNeutral - bNeutral; // colores antes que neutros

        if (aNeutral === 0) {
            if (ha !== hb) return ha - hb;         // Hue ascendente
            if (sa !== sb) return sb - sa;         // Saturación descendente
            return vb - va;                        // Valor descendente
        } else {
            return vb - va;                        // Neutros por brillo
        }
    });
}


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

// Obtener los top 3 jugadores globalmente
function getTopPlayers() {
    return [...players].sort((a, b) => b.rating - a.rating).slice(0, 3);
}

// Aplicar estilos especiales a nombres de jugadores según su posición en el ranking global
function applyPlayerRankStyle(playerName, playerId) {
    const topPlayers = getTopPlayers();
    const playerIndex = topPlayers.findIndex(p => p.id === playerId);

    if (playerIndex === 0) {
        return `<span class="player-name rank-1 global-top-player">🥇 ${playerName}</span>`;
    } else if (playerIndex === 1) {
        return `<span class="player-name rank-2 global-top-player">🥈 ${playerName}</span>`;
    } else if (playerIndex === 2) {
        return `<span class="player-name rank-3 global-top-player">🥉 ${playerName}</span>`;
    }

    return `<span class="player-name">${playerName}</span>`;
}

// Aplicar solo el color del ranking (sin medalla) para el ranking de parejas
function applyPlayerRankStyleNoMedal(playerName, playerId) {
    const topPlayers = getTopPlayers();
    const playerIndex = topPlayers.findIndex(p => p.id === playerId);

    let className = 'player-name';
    if (playerIndex === 0) {
        className += ' rank-1 global-top-player';
    } else if (playerIndex === 1) {
        className += ' rank-2 global-top-player';
    } else if (playerIndex === 2) {
        className += ' rank-3 global-top-player';
    }

    return `<span class="${className}">${playerName}</span>`;
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
        const player1 = players.find(p => p.id == team.players[0]);
        const player2 = players.find(p => p.id == team.players[1]);
        // Si algún jugador no existe (fue eliminado), saltar este equipo
        if (!player1 || !player2) return;
        const avgPoints = calculateTeamAveragePoints(team);
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                ${applyPlayerRankStyleNoMedal(player1.name, player1.id)} & 
                ${applyPlayerRankStyleNoMedal(player2.name, player2.id)}
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

// Función para generar los selectores de color dinámicamente
function generateColorOptions() {
    const colorOptionsContainer = document.getElementById('colorOptions');
    if (!colorOptionsContainer) return;
    
    // Limpiar contenedor
    colorOptionsContainer.innerHTML = '';
    
    // Generar opciones de color en orden lógico (HSV)
    const sorted = sortPaletteByHSV(predefinedColors);
    sorted.forEach((color) => {
        const colorOption = document.createElement('div');
        colorOption.className = 'color-option';
        colorOption.style.backgroundColor = color.hex;
        colorOption.setAttribute('data-color', color.hex);
        // Eliminamos el atributo title para que no se muestre el nombre
        // colorOption.setAttribute('title', color.name);
        colorOption.setAttribute('aria-label', color.name); // Mantenemos aria-label para accesibilidad
        colorOption.setAttribute('tabindex', '0');
        colorOption.setAttribute('role', 'radio');
        colorOption.setAttribute('aria-checked', 'false');
        
        // Añadir eventos para accesibilidad con teclado
        colorOption.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
        
        colorOptionsContainer.appendChild(colorOption);
    });
}

// Inicialización al cargar la página
document.addEventListener('DOMContentLoaded', async function() {
    await loadPlayers(); // Espera a que los jugadores se carguen
    await loadMatchesFromFirestore(); // Espera a que los partidos se carguen
    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    renderTeamRanking();
    renderMatches();
    updateStats();
    generateColorOptions();
    
    // Configurar sincronización periódica
    setInterval(syncData, 30000); // Sincronizar cada 30 segundos
    
    // Validación dinámica del formulario de partido
    const matchForm = document.getElementById('matchForm');
    const matchBtn = matchForm.querySelector('button[type="submit"]');
    function validarFormPartido() {
        const p1 = matchForm.player1.value;
        const p2 = matchForm.player2.value;
        const p3 = matchForm.player3.value;
        const p4 = matchForm.player4.value;
        const sA = matchForm.scoreA.value;
        const sB = matchForm.scoreB.value;
    // Todos los campos deben estar completos y jugadores distintos
    const jugadores = [p1, p2, p3, p4];
    const jugadoresUnicos = new Set(jugadores);
    const valido = jugadores.every(v => v) && jugadoresUnicos.size === 4 && sA !== '' && sB !== '';
    matchBtn.disabled = !valido;
    }
    matchForm.addEventListener('input', validarFormPartido);
    validarFormPartido();
    // Manejar el formulario de partido
    document.getElementById('matchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (editModeEnabled) {
            registerMatch();
            // Limpiar el campo de fecha para el próximo registro y poner la fecha actual automáticamente
            setTimeout(() => {
                const dateInput = document.getElementById('date');
                if (dateInput) {
                    dateInput.value = '';
                    setTodayDateGMT3();
                }
            }, 100);
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
                opt.setAttribute('aria-checked', 'false');
            });
            this.classList.add('selected');
            this.setAttribute('aria-checked', 'true');
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
    // Manejar confirmación de eliminación de partido
    document.getElementById('confirmDeleteBtn').addEventListener('click', function() {
        const modal = document.getElementById('confirmDeleteModal');
        const matchId = modal.dataset.matchId ? parseInt(modal.dataset.matchId) : null;
        if (playerToDelete !== null) {
            deletePlayer(playerToDelete);
            playerToDelete = null;
        } else if (matchId) {
            deleteMatch(matchId);
        }
        modal.style.display = 'none';
        modal.dataset.matchId = '';
    });
    // Manejar cancelación de eliminación de partido
    document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
        const modal = document.getElementById('confirmDeleteModal');
        modal.style.display = 'none';
        modal.dataset.matchId = '';
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

async function loadPlayers() {
  // Primero intenta cargar desde Firestore
  await loadPlayersFromFirestore();
  // Si no hay jugadores en la nube, carga local
  if (players.length === 0) {
    const storedPlayers = localStorage.getItem('padelPlayers');
    if (storedPlayers) {
      players = JSON.parse(storedPlayers);
      if (players.length > 0) {
        nextPlayerId = Math.max(...players.map(p => p.id)) + 1;
      }
      players.forEach(player => {
        if (!player.pointsHistory) {
          player.pointsHistory = [];
        }
      });
    }
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
                `<div>${applyPlayerRankStyle(playerWithBestAvg.name, playerWithBestAvg.id)}</div>
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
        const player1 = players.find(p => p.id == bestTeam.players[0]);
        const player2 = players.find(p => p.id == bestTeam.players[1]);
        
        if (player1 && player2) {
            const avgPoints = calculateTeamAveragePoints(bestTeam);
            document.getElementById('topTeam').innerHTML = 
                `<div>${applyPlayerRankStyle(player1.name, player1.id)} & ${applyPlayerRankStyle(player2.name, player2.id)}</div>
                <div class="stat-points">${avgPoints.toFixed(1).replace('.', ',')} pts/partido</div>`;
        } else {
            document.getElementById('topTeam').textContent = 'Datos incompletos';
        }
    } else {
        document.getElementById('topTeam').textContent = 'Ninguna pareja con partidos';
    }
}

// Actualizar jugador en Firestore por ID
async function updatePlayerInFirestore(player) {
    if (!window.db) return;
    const { getDocs, collection, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
    const querySnapshot = await getDocs(collection(window.db, "jugadores"));
    querySnapshot.forEach(async (document) => {
        const data = document.data();
        if ((data.id || document.id) == player.id) {
            await updateDoc(doc(window.db, "jugadores", document.id), {
                ...player
            });
        }
    });
}

// Función para agregar un nuevo jugador
function addNewPlayer() {
    if (!editModeEnabled) return;
    
    const nameInput = document.getElementById('newPlayerName');
    let name = nameInput.value.trim();
    if (name.length > 0) {
        name = name.charAt(0).toUpperCase() + name.slice(1);
    }
    
    if (!name) {
        mostrarErrorJugador('Por favor ingresa un nombre para el jugador.');
        return;
    }
    
    // Limpiar error si se agregó correctamente
    mostrarErrorJugador('');
    // Verificar si el jugador ya existe
    // Mostrar mensaje de error en la gestión de jugadores
    function mostrarErrorJugador(msg) {
        const nameInput = document.getElementById('newPlayerName');
        if (!nameInput) return;
        if (msg) {
            nameInput.classList.add('input-error');
            nameInput.value = '';
            nameInput.placeholder = msg;
            setTimeout(() => {
                nameInput.classList.remove('input-error');
                nameInput.placeholder = 'Nombre del nuevo jugador';
            }, 2200);
        } else {
            nameInput.classList.remove('input-error');
            nameInput.placeholder = 'Nombre del nuevo jugador';
        }
    }
    const existingPlayerIndex = players.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingPlayerIndex >= 0) {
        if (confirm(`El jugador "${name}" ya existe. ¿Deseas actualizar sus datos?`)) {
            if (players[existingPlayerIndex].name !== name) {
                players[existingPlayerIndex].name = name;
                savePlayers();
                syncData();
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
    
    // Función para obtener un color único
    const getUniqueColor = () => {
        // Obtener colores usados por jugadores activos
        const usedColors = players.map(p => p.color);
        
        // Filtrar colores disponibles (no usados)
        const availableColors = predefinedColors
            .filter(color => !usedColors.includes(color.hex))
            .map(color => color.hex);
        
        // Si hay colores disponibles, seleccionar uno aleatorio
        if (availableColors.length > 0) {
            return availableColors[Math.floor(Math.random() * availableColors.length)];
        }
        
        // Si no hay colores disponibles, seleccionar uno aleatorio de toda la paleta
        return predefinedColors[Math.floor(Math.random() * predefinedColors.length)].hex;
    };
    
    // Crear nuevo jugador con color único
    const newPlayer = {
        id: nextPlayerId++,
        name: name,
        rating: 0,
        matches: 0,
        wins: 0,
        losses: 0,
        pointsHistory: [],
        color: getUniqueColor(), // Asignar color único
        createdAt: Date.now(),
        updatedAt: Date.now()
    };
    
    players.push(newPlayer);
    savePlayers();
    savePlayerToFirestore(newPlayer); // Guarda en Firestore
    syncData();
    
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
async function savePlayerChanges() {
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

    // Actualizar datos del jugador local
    players[playerIndex].name = newName;
    players[playerIndex].color = selectedColor;
    players[playerIndex].updatedAt = Date.now();

    savePlayers();
    syncData();

    // Actualizar en Firestore
    if (window.db) {
        const { getDocs, collection, doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
        const querySnapshot = await getDocs(collection(window.db, "jugadores"));
        querySnapshot.forEach(async (document) => {
            const data = document.data();
            if ((data.id || document.id) == currentEditingPlayerId) {
                await updateDoc(doc(window.db, "jugadores", document.id), {
                    name: newName,
                    color: selectedColor,
                    updatedAt: Date.now()
                });
            }
        });
    }

    renderPlayersList();
    renderPlayersDropdown();
    renderRanking();
    renderTeamRanking();
    renderMatches();
    updateStats();

    document.getElementById('editPlayerModal').style.display = 'none';
}

// Eliminar jugador
function deletePlayer(playerId) {
    if (!editModeEnabled) return;
    
    // Eliminar jugador local
    players = players.filter(p => p.id !== playerId);

    // Eliminar partidos que incluían a este jugador
    matches = matches.filter(match => 
        !match.teamA.includes(playerId) && !match.teamB.includes(playerId)
    );

    // Eliminar jugador en Firestore
    if (window.db) {
        // Buscar el documento por id
        window.getDocs(window.collection(window.db, "jugadores")).then(snapshot => {
            snapshot.forEach(doc => {
                const data = doc.data();
                if ((data.id && data.id === playerId) || doc.id == playerId) {
                    window.db && window.db.constructor && window.db.constructor.name === "Firestore" && window.db.app && window.db.app.name;
                    import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js').then(mod => {
                        mod.deleteDoc(mod.doc(window.db, "jugadores", doc.id));
                    });
                }
            });
        });
    }

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
    console.log('Confirmando eliminación del partido:', matchId);
    
    // Cambiar el texto del modal para partidos
    const modalTitle = document.querySelector('#confirmDeleteModal .modal-content h2');
    const modalText = document.getElementById('deleteConfirmationText');
    if (modalTitle) modalTitle.textContent = '🗑️ ¿Eliminar Partido?';
    if (modalText) modalText.textContent = '¿Estás seguro de que deseas eliminar este partido? Esta acción actualizará todas las estadísticas y no se puede deshacer.';
    
    // Mostrar modal de confirmación
    const modal = document.getElementById('confirmDeleteModal');
    modal.style.display = 'block';
    modal.dataset.matchId = matchId;
    
    // Configurar el botón de confirmación
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.onclick = async function() {
        try {
            await deleteMatch(matchId);
            modal.style.display = 'none';
        } catch (error) {
            console.error('Error al eliminar partido:', error);
            alert('Error al eliminar el partido. Por favor, intenta de nuevo.');
        }
    };
}

// Eliminar partido
async function deleteMatch(matchId) {
    if (!editModeEnabled) return;
    
    console.log('Iniciando proceso de eliminación para partido:', matchId);
    
    try {
        // Asegurarnos de que matchId sea número para comparaciones consistentes
        const matchIdNum = Number(matchId);
        
        // Eliminar partido de Firestore primero
        if (window.db) {
            const { getDocs, collection, doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js');
            
            // Buscar el documento correcto
            const querySnapshot = await getDocs(collection(window.db, "partidos"));
            let docId = null;
            
            for (const document of querySnapshot.docs) {
                const data = document.data();
                if (Number(data.id) === matchIdNum) {
                    docId = document.id;
                    break;
                }
            }
            
            if (docId) {
                console.log('Documento encontrado en Firestore, procediendo a eliminar:', docId);
                await deleteDoc(doc(window.db, "partidos", docId));
            } else {
                console.error('No se encontró el partido en Firestore:', matchIdNum);
                throw new Error('Partido no encontrado en la base de datos');
            }
        }
        
        // Eliminar partido local
        const matchIndex = matches.findIndex(m => Number(m.id) === matchIdNum);
        if (matchIndex === -1) {
            console.error('Partido no encontrado localmente:', matchIdNum);
            throw new Error('Partido no encontrado localmente');
        }
        
        matches.splice(matchIndex, 1);
        saveMatches();
        
        console.log('Partido eliminado localmente, recalculando puntuaciones...');
        
        // Recalcular puntuaciones
        await recalculateAllRatings();
        
        // Actualizar UI
        renderPlayersList();
        renderPlayersDropdown();
        renderRanking();
        renderTeamRanking();
        renderMatches();
        updateStats();
        
        console.log('Proceso de eliminación completado exitosamente');
        return true;
        
        // Recalcular basado en los partidos existentes
        matches.forEach(match => {
            updateRatings(match);
        });
        
        // Actualizar todos los jugadores en Firebase
        for (const player of players) {
            await updatePlayerInFirestore(player);
        }
        
        // Guardar cambios locales
        savePlayers();
        syncData();
        
        // Actualizar toda la UI
        renderPlayersList();
        renderPlayersDropdown();
        renderRanking();
        renderTeamRanking();
        renderMatches();
        updateStats();
    } catch (error) {
        console.error('Error al eliminar el partido:', error);
        alert('Error al eliminar el partido. Por favor, intenta de nuevo.');
    }
    
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
        updateRatings(match);
    });
    
    // Actualizar todos los jugadores en Firebase
    players.forEach(player => {
        updatePlayerInFirestore(player);
    });
    
    // Guardar cambios locales
    savePlayers();
    syncData();
    
    // Actualizar toda la UI
    renderPlayersList();
    renderPlayersDropdown();
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
    // Actualizar todos los jugadores en Firestore
    players.forEach(player => {
        updatePlayerInFirestore(player);
    });
}

// Renderizar lista de jugadores
function renderPlayersList(showAll = false) {
    const playerList = document.getElementById('playerList');
    const showAllBtn = document.getElementById('showAllPlayersBtn');
    if (players.length === 0) {
        playerList.innerHTML = '<div class="no-players">No hay jugadores registrados</div>';
        if (showAllBtn) showAllBtn.style.display = 'none';
        return;
    }
    playerList.innerHTML = '';
    const sortedPlayers = [...players].sort((a, b) => a.name.localeCompare(b.name));
    let toShow = sortedPlayers;
    if (!showAll && sortedPlayers.length > 7) {
        toShow = sortedPlayers.slice(0, 7);
        if (showAllBtn) {
            showAllBtn.style.display = 'inline-block';
            showAllBtn.textContent = 'Mostrar todos';
        }
    } else {
        if (showAllBtn) {
            showAllBtn.style.display = sortedPlayers.length > 7 ? 'inline-block' : 'none';
            showAllBtn.textContent = 'Mostrar menos';
        }
    }
    toShow.forEach(player => {
        const avgPoints = calculateAveragePoints(player);
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        let topPlayers = getTopPlayers();
        let idx = topPlayers.findIndex(p => p.id === player.id);
        let nameHtml = '';
        if ([0,1,2].includes(idx)) {
            nameHtml = `<span class="player-name rank-${idx+1} global-top-player">${player.name}</span>`;
        } else {
            nameHtml = `<span class="player-name">${player.name}</span>`;
        }
        playerItem.innerHTML = `
            <div class="player-info">
                ${nameHtml}
                <span class="player-rating">${avgPoints.toFixed(1).replace('.', ',')} pts/partido</span>
            </div>
            <div class="action-buttons">
                    <button class="edit-player-btn" onclick="editPlayer(${player.id})" title="Editar jugador" style="${editModeEnabled ? 'display: inline-flex;' : 'display: none;'}">
                        <span style="font-size:1.2em;">🖋️</span>
                    </button>
            </div>
        `;
        playerList.appendChild(playerItem);
    });
    if (showAllBtn) {
        showAllBtn.onclick = function() {
            renderPlayersList(!showAll);
        };
    }
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
        
        dropdown.innerHTML = '<option value="" disabled selected hidden>Seleccionar jugador</option>';
        
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
                const topPlayers = getTopPlayers();
                const idx = topPlayers.findIndex(p => p.id === player.id);
                const emoji = idx === 0 ? '🥇 ' : idx === 1 ? '🥈 ' : idx === 2 ? '🥉 ' : '';
                option.textContent = emoji + player.name;
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
    // También establecer el valor por defecto al cargar el formulario si está vacío
    document.addEventListener('DOMContentLoaded', function() {
        const dateInput = document.getElementById('date');
        if (dateInput && !dateInput.value) {
            const today = new Date();
            dateInput.value = today.toISOString().split('T')[0];
        }
    });
    
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
    
    // Limpia el formulario si quieres
    document.getElementById("matchForm").reset();
}

// Función para obtener el siguiente ID de partido
async function getNextMatchId() {
    if (!window.db) return matches.length + 1;
    const querySnapshot = await window.getDocs(window.collection(window.db, "partidos"));
    const ids = [];
    querySnapshot.forEach(doc => {
        const data = doc.data();
        if (data.id) ids.push(parseInt(data.id));
    });
    return ids.length > 0 ? Math.max(...ids) + 1 : 1;
}

// Función para agregar partido a Firestore
async function agregarPartido(partido) {
    try {
        // Asignar ID secuencial al partido
        partido.id = await getNextMatchId();
        
        // Agregar timestamps
        partido.createdAt = Date.now();
        partido.updatedAt = Date.now();

        await window.addDoc(window.collection(window.db, "partidos"), partido);
        alert("Partido registrado correctamente.");
    } catch (error) {
        console.error("Error al registrar partido:", error);
        alert("Error al registrar el partido: " + error.message);
    }
}

// Conectar el formulario con la función
document.getElementById("matchForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const partido = {
        fecha: document.getElementById("date").value || new Date().toISOString().slice(0,10),
        parejaA: [
            parseInt(document.getElementById("player1").value),
            parseInt(document.getElementById("player2").value)
        ],
        parejaB: [
            parseInt(document.getElementById("player3").value),
            parseInt(document.getElementById("player4").value)
        ],
        puntosA: parseInt(document.getElementById("scoreA").value, 10),
        puntosB: parseInt(document.getElementById("scoreB").value, 10)
    };

    await agregarPartido(partido);

    // Limpia el formulario si quieres
    this.reset();
});

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
    // Actualizar en Firestore los jugadores involucrados
    updatePlayerInFirestore(player1);
    updatePlayerInFirestore(player2);
    updatePlayerInFirestore(player3);
    updatePlayerInFirestore(player4);
    // No es necesario llamar a syncData() aquí porque ya se llama en registerMatch()
}

// Renderizar el ranking (versión compacta para sidebar)
function renderRanking() {
    const tableBody = document.querySelector('#rankingTable tbody');
    tableBody.innerHTML = '';

    // Ordenar jugadores por PUNTOS TOTALES descendente
    const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

    sortedPlayers.forEach((player, index) => {
        const avgPoints = player.matches > 0 ? calculateAveragePoints(player) : 0;
        const row = document.createElement('tr');

        const tdPos = document.createElement('td');
        let emoji = '';
        if (index === 0) emoji = '🥇';
        else if (index === 1) emoji = '🥈';
        else if (index === 2) emoji = '🥉';
        tdPos.innerHTML = emoji ? `<span>${emoji}</span>` : `<span>${index + 1}</span>`;

            const tdName = document.createElement('td');
            if ([0,1,2].includes(index)) {
                tdName.innerHTML = `<span class="player-name rank-${index+1} global-top-player">${player.name}</span>`;
            } else {
                tdName.innerHTML = `<span class="player-name">${player.name}</span>`;
                tdName.style.color = player.color || '#000';
            }

            const tdRating = document.createElement('td');
            tdRating.textContent = player.matches > 0 ? player.rating.toFixed(1).replace('.', ',') : '0,0';

            const tdAvg = document.createElement('td');
            tdAvg.textContent = avgPoints.toFixed(1).replace('.', ',');

            const tdMatches = document.createElement('td');
            tdMatches.textContent = String(player.matches);

            row.appendChild(tdPos);
            row.appendChild(tdName);
            row.appendChild(tdRating);
            row.appendChild(tdAvg);
            row.appendChild(tdMatches);

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
    
    // Ordenar partidos por ID descendente (más nuevo a más antiguo)
    const sortedMatches = [...matches]
        .sort((a, b) => {
            // Primero ordenar por ID descendente
            if (b.id !== a.id) {
                return b.id - a.id;
            }
            // Si por alguna razón tienen el mismo ID, ordenar por fecha
            return new Date(b.date) - new Date(a.date);
        })
        .slice(0, 15); // Tomar solo los 15 más recientes
    
    sortedMatches.forEach(match => {
        // Obtener jugadores (con verificación por si alguno fue eliminado)
        const player1 = players.find(p => p.id === Number(match.teamA[0]));
        const player2 = players.find(p => p.id === Number(match.teamA[1]));
        const player3 = players.find(p => p.id === Number(match.teamB[0]));
        const player4 = players.find(p => p.id === Number(match.teamB[1]));
        
        // Si algún jugador no existe (fue eliminado), saltar este partido
        if (!player1 || !player2 || !player3 || !player4) return;
        
        // Formatear resultado
        const result = `${match.scoreA}-${match.scoreB}`;
        const winners = match.scoreA > match.scoreB ? 
            `${player1.name} & ${player2.name}` : `${player3.name} & ${player4.name}`;
        
    // Formatear fecha en GMT-3
    const dateObj = new Date(match.date + 'T00:00:00-03:00');
    const formattedDate = dateObj.toLocaleDateString('es-ES');
        
        const row = document.createElement('tr');
        // Helper para mostrar solo shimmer sin emoji
        function playerNameWithShimmer(player) {
            let topPlayers = getTopPlayers();
            let idx = topPlayers.findIndex(p => p.id === player.id);
            if ([0,1,2].includes(idx)) {
                return `<span class="player-name rank-${idx+1} global-top-player">${player.name}</span>`;
            } else {
                return `<span class="player-name">${player.name}</span>`;
            }
        }
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>
                ${playerNameWithShimmer(player1)} & ${playerNameWithShimmer(player2)}
            </td>
            <td>
                ${playerNameWithShimmer(player3)} & ${playerNameWithShimmer(player4)}
            </td>
            <td>${result}</td>
            <td>${match.scoreA > match.scoreB ? `${playerNameWithShimmer(player1)} & ${playerNameWithShimmer(player2)}` : `${playerNameWithShimmer(player3)} & ${playerNameWithShimmer(player4)}`}</td>
            <td>
                <button class="btn-danger btn-small delete-match-btn" data-match-id="${match.id}" style="${editModeEnabled ? 'display: flex;' : 'display: none;'}">
                    <span>🗑️</span>
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // Agregar event listeners a los botones de borrar
    document.querySelectorAll('.delete-match-btn').forEach(button => {
        button.addEventListener('click', function() {
            const matchId = this.getAttribute('data-match-id');
            console.log('ID del partido a eliminar:', matchId);
            if (matchId) {
                confirmDeleteMatch(matchId);
            } else {
                console.error('No se encontró ID del partido');
            }
        });
    });
}
