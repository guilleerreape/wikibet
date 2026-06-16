# Configuración rápida de BetAnalytics

## 1️⃣ Instalación inicial (primera vez)

```bash
# Navega al proyecto
cd betanalytics

# Instala dependencias
npm install
```

## 2️⃣ Configurar API Key de Anthropic

Edita el archivo `.env`:

```bash
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-XXXXXXXXXXXXXXXX
```

Obtén tu key en: https://console.anthropic.com/

## 3️⃣ Iniciar desarrollo

### Opción A: Web (Más rápido para pruebas)
```bash
npx expo start
# Presiona 'w' para abrir en navegador
```

### Opción B: iOS (macOS required)
```bash
npx expo start --ios
# O instala Expo Go en iPhone y escanea el QR
```

### Opción C: Android
```bash
npx expo start --android
# O instala Expo Go en Android y escanea el QR
```

## 📱 Mobile en Expo Go

1. Descarga Expo Go desde App Store o Google Play
2. Ejecuta `npx expo start`
3. Escanea el código QR con tu teléfono

## 🏗️ Estructura de carpetas

```
app/                 - Pantallas y rutas
├── (tabs)/         - Pantallas con tab bar
├── jugador/        - Detalles de jugador
├── equipo/         - Detalles de equipo
└── partido/        - Detalles de partido

components/         - Componentes reutilizables
data/              - Datos hardcodeados
constants/         - Configuración (colores)
hooks/             - Custom React hooks
```

## 🔍 Debugging

### Ver logs en consola
```bash
npx expo start
# Los logs aparecen en la terminal
```

### Usar React DevTools
```bash
# En la terminal: Presiona 'j' durante 'expo start'
```

## 🚀 Tips importantes

- **API Key en .env**: No commitear el .env real, solo usar el de ejemplo
- **Data hardcodeada**: Los datos de jugadores, equipos y partidos están en `data/`
- **Colores centralizados**: Cambiar tema en `constants/colors.ts`
- **Chat IA**: Necesita conexión a internet y API key válida

## 🐛 Problemas comunes

### "Cannot find module '@/...'"
→ Asegúrate que tsconfig.json tenga los path aliases configurados

### "API key not found"
→ Verifica que .env está en la raíz del proyecto con la estructura correcta

### "Metro Bundler keeps hanging"
→ Mata los procesos: `pkill -f expo` y reinicia

## 📚 Documentación

- Expo: https://docs.expo.dev/
- React Native: https://reactnative.dev/
- Anthropic API: https://docs.anthropic.com/
- Expo Router: https://docs.expo.dev/routing/introduction/

## 🎯 Próximos pasos

1. Conectar APIs reales para datos en vivo
2. Agregar persistencia de datos (SQLite)
3. Implementar notificaciones push
4. Agregar gráficos y visualizaciones
5. Sistema de autenticación y perfiles
