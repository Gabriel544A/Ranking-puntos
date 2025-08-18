# 🏆 Sistema de Ranking de Pádel

Una aplicación web moderna y dinámica diseñada para gestionar el ranking de jugadores de pádel, enfocada en el seguimiento de partidos y estadísticas tanto individuales como por parejas.

## 🎯 Objetivo

El objetivo principal de este proyecto es proporcionar una herramienta intuitiva y eficiente para:
- Mantener un registro detallado de partidos de pádel
- Calcular y visualizar rankings individuales y por parejas
- Realizar un seguimiento del rendimiento de los jugadores a lo largo del tiempo
- Facilitar la gestión de estadísticas y métricas de juego

## ✨ Características

- 📊 Ranking individual con sistema de puntuación dinámico
- 👥 Ranking de parejas con promedio de puntos
- 📝 Registro de partidos con fecha y resultados
- 🔄 Sincronización en tiempo real con Firebase
- 🎨 Interfaz intuitiva y responsive
- 📱 Diseño adaptable a dispositivos móviles
- 🔒 Sistema de autenticación para edición
- 💾 Exportación e importación de datos
- 🎯 Seguimiento de estadísticas detalladas

## 🎮 Sistema de Puntuación

El ranking utiliza un sistema dinámico de puntos que refleja el rendimiento de los jugadores:

### 📈 Puntos por Partido

- **Victoria Base**: +3 puntos por jugador
- **Derrota Base**: +1 punto por jugador
- **Puntos Adicionales**: +0.5 puntos por cada punto de diferencia en el marcador
  - Ejemplo: Si el equipo A gana 6-2, recibe +5 puntos totales:
    * 3 puntos base por victoria
    * 2 puntos adicionales (4 puntos de diferencia × 0.5)
- No hay penalización por perder, fomentando la participación continua
- El sistema recompensa tanto la victoria como la contundencia del resultado

### 🏅 Cálculo de Rankings

1. **Ranking Individual**:
   - Se calcula el promedio de puntos por partido de cada jugador
   - Los jugadores se ordenan por puntos totales
   - El top 3 se destaca con colores oro, plata y bronce
   - Se muestran estadísticas de partidos ganados y perdidos

2. **Ranking de Parejas**:
   - Se calcula el promedio de puntos cuando dos jugadores juegan juntos
   - Las parejas se ordenan por promedio de puntos
   - Se considera el historial completo de partidos jugados en conjunto
   - Se muestra el número total de partidos jugados como pareja

### ⚖️ Equilibrio del Sistema

- El sistema favorece la consistencia y la participación regular
- Permite a nuevos jugadores escalar posiciones rápidamente con buen rendimiento
- Mantiene el interés al recompensar tanto la victoria como la participación
- Facilita el seguimiento del progreso individual y en pareja

## 🛠️ Tecnologías Utilizadas

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase (Firestore)
- Diseño Responsive

## 📁 Estructura del Proyecto

```
/padel-ranking/
│
├── index.html      # Estructura principal de la aplicación
├── script.js       # Lógica de la aplicación y manejo de datos
└── styles.css      # Estilos y diseño responsive
```

## 🚀 Funcionalidades Principales

1. **Gestión de Jugadores**
   - Agregar/Editar/Eliminar jugadores
   - Personalización de colores por jugador
   - Historial individual de rendimiento

2. **Sistema de Partidos**
   - Registro de nuevos partidos
   - Histórico de los últimos 15 partidos
   - Actualización automática de rankings

3. **Rankings y Estadísticas**
   - Ranking individual actualizado
   - Ranking de parejas con promedios
   - Estadísticas detalladas por jugador

4. **Gestión de Datos**
   - Sincronización con Firebase
   - Exportación de datos en JSON
   - Importación de datos históricos

## 📱 Diseño Responsive

La aplicación está diseñada para funcionar de manera óptima en:
- 💻 Escritorio
- 📱 Dispositivos móviles
- 📱 Tablets

## 🔒 Seguridad

- Sistema de autenticación para modo edición
- Respaldo automático de datos
- Sincronización segura con Firebase

## 🔄 Sincronización

La aplicación utiliza Firebase Firestore para:
- Almacenamiento en la nube
- Sincronización en tiempo real
- Backup automático de datos
