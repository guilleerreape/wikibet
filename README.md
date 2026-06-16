# BetAnalytics

Aplicación multiplataforma (iOS, Android, Web) de análisis deportivo para apuestas con IA integrada.

## Características principales

- **📊 Partidos del día**: Lista de partidos con probabilidades 1X2 calculadas por IA
- **⚽ DB Jugadores**: Base de datos de jugadores con búsqueda, filtros y análisis detallado
- **👥 DB Equipos**: Base de datos de equipos con estadísticas avanzadas
- **💰 Value Scanner**: Detector automático de oportunidades de value en apuestas
- **🤖 Chat IA**: Asistente especializado en análisis deportivos (Claude Sonnet)

## Stack tecnológico

- React Native + Expo SDK 56
- TypeScript
- Expo Router (navegación por tabs)
- Anthropic API (Claude Sonnet 4-6)
- Tema oscuro personalizado

## Instalación

### 1. Requisitos previos

```bash
# Instalar Homebrew (si no lo tienes)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar Node.js
brew install node
```

### 2. Clonar o entrar al proyecto

```bash
cd betanalytics
```

### 3. Instalar dependencias

```bash
npm install
```

### 4. Configurar API Key

Copia tu API key de Anthropic en el archivo `.env`:

```bash
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-YOUR_API_KEY_HERE
```

Obtén tu API key en: https://console.anthropic.com/

## Ejecución

### Web (navegador)
```bash
npm run web
# O: npx expo start
# Luego presiona 'w' en la terminal
```

### iOS (requiere macOS)
```bash
npm run ios
# O: npx expo start --ios
```

### Android
```bash
npm run android
# O: npx expo start --android
```

### Desarrollo
```bash
npx expo start
```

Luego:
- Presiona `w` para web
- Presiona `i` para iOS
- Presiona `a` para Android
- Presiona `j` para cliente debugging

## Estructura del proyecto

```
betanalytics/
├── app/
│   ├── _layout.tsx              # Layout raíz
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Layout de tabs
│   │   ├── index.tsx            # Partidos del día
│   │   ├── jugadores.tsx        # DB Jugadores
│   │   ├── equipos.tsx          # DB Equipos
│   │   ├── value.tsx            # Value Scanner
│   │   └── ia.tsx               # Chat IA
│   ├── jugador/[id].tsx         # Detalle de jugador
│   ├── equipo/[id].tsx          # Detalle de equipo
│   └── partido/[id].tsx         # Detalle de partido
├── components/
│   ├── MatchCard.tsx            # Tarjeta de partido
│   ├── PlayerCard.tsx           # Tarjeta de jugador
│   ├── TeamCard.tsx             # Tarjeta de equipo
│   ├── ValueCard.tsx            # Tarjeta de value
│   ├── SearchBar.tsx            # Barra de búsqueda
│   ├── StatBar.tsx              # Barra de estadísticas
│   ├── FormDots.tsx             # Indicador de forma
│   └── AIComment.tsx            # Comentario de IA
├── data/
│   ├── players.ts               # Datos de jugadores
│   ├── teams.ts                 # Datos de equipos
│   └── matches.ts               # Datos de partidos
├── constants/
│   └── colors.ts                # Tema oscuro
├── hooks/
│   └── useChat.ts               # Hook para chat IA
├── .env                         # Variables de entorno
└── package.json
```

## Datos iniciales

La aplicación incluye datos hardcodeados para demostración:

- **12 Jugadores**: Mbappé, Pedri, Vinícius Jr., Bellingham, Courtois, Haaland, Salah, Yamal, Kroos, Saka, Lewandowski, Gavi
- **8 Equipos**: Real Madrid, Barcelona, Atlético, Man City, Arsenal, Bayern, Inter, Liverpool
- **6 Partidos**: Clásicos europeos con análisis

En futuro se conectará con APIs reales para datos en vivo.

## Características de diseño

### Colores (Tema oscuro)
- Fondo principal: `#08090C`
- Tarjetas: `#10141C`
- Acentos verdes: `#00E5A0` (positivo)
- Acentos azules: `#1A6BFF` (IA/info)
- Acentos rojos: `#FF4B6E` (negativo/lesiones)

### Componentes reutilizables
- **StatBar**: Muestra estadísticas con barras de progreso
- **FormDots**: Visualiza los últimos 10 resultados
- **AIComment**: Comentarios destacados de análisis IA
- **SearchBar**: Búsqueda en bases de datos

## IA - Sistema de Prompts

La aplicación usa Claude Sonnet 4-6 con un sistema prompt especializado en análisis deportivos:

```
Eres un analista deportivo experto especializado en fútbol y apuestas deportivas.
Tienes acceso a estadísticas avanzadas (xG, xGA, PPDA, etc.)...
```

El chat mantiene historial durante la sesión sin persistencia.

## Notas importantes para desarrollo

- ✅ Funciona igual en iOS, Android y Web
- ✅ Usa StyleSheet nativo (no CSS ni Tailwind)
- ✅ Todos los colores en `constants/colors.ts`
- ✅ Sin librerías nativas incompatibles con Expo Go
- ⚠️ El chat IA requiere conexión a internet y API key válida

## Próximas mejoras

- [ ] Conexión a API real para datos de jugadores y partidos
- [ ] Persistencia de historial de chat
- [ ] Gráficos y estadísticas visuales
- [ ] Notificaciones de partidos
- [ ] Perfil de usuario y historial de apuestas
- [ ] Dark/Light mode toggle
- [ ] Soporte para múltiples idiomas

## Disclaimer

Las apuestas deportivas conllevan riesgo. Este análisis es una herramienta educativa y no garantiza resultados. Nunca apostar más de lo responsable.

## Licencia

MIT
