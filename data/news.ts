export interface News {
  id: string;
  title: string;
  emoji: string;
  date: string;
  time: string;
  teams?: string[];
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'injury' | 'transfer' | 'suspension' | 'form' | 'tactical' | 'weather';
  description: string;
  bettingImpact: string;
  relevanceScore: number; // 0-100
}

export const news: News[] = [
  {
    id: '1',
    title: 'Mbappé se lesiona en entrenamiento',
    emoji: '🩹',
    date: '15 Jun 2026',
    time: '14:30',
    teams: ['Francia'],
    impact: 'HIGH',
    category: 'injury',
    description: 'Kylian Mbappé sufrió una lesión muscular en el muslo durante el entrenamiento. Evaluación médica en curso. Se espera que juegue el próximo partido del Mundial.',
    bettingImpact: 'CRÍTICO: Reduce probabilidades de gol de Francia en 35%. Over/Under se inclina a Under 2.5. Mercados de asistencias caen. Win France pierde -8% en cuota.',
    relevanceScore: 98,
  },
  {
    id: '2',
    title: 'Vinicius Jr. con lesión en la rodilla',
    emoji: '⚠️',
    date: '14 Jun 2026',
    time: '18:45',
    teams: ['Brasil'],
    impact: 'HIGH',
    category: 'injury',
    description: 'Vinicius Junior se queja de molestias en la rodilla izquierda. Ausente en el último entrenamiento. Dudoso para el próximo partido.',
    bettingImpact: 'GRAVE: Reduce Over de Brasil en 25%. Rodrygo sube en Over individual. Under 2.5 sube +4%. Win Brasil baja -5%.',
    relevanceScore: 96,
  },
  {
    id: '3',
    title: 'Argentina lista para el Grupo A',
    emoji: '🇦🇷',
    date: '15 Jun 2026',
    time: '10:00',
    teams: ['Argentina'],
    impact: 'MEDIUM',
    category: 'form',
    description: 'Argentina completa entrenamiento sin bajas. Messi en óptimas condiciones. El equipo muestra una moral excelente tras preparación.',
    bettingImpact: 'POSITIVO: Messi asistencias sube en cuota. Over 1.5 asistencias a 1.85. Win Argentina se mantiene firme a -120.',
    relevanceScore: 82,
  },
  {
    id: '4',
    title: 'Clima lluvioso en el estadio de partidos de hoy',
    emoji: '🌧️',
    date: '15 Jun 2026',
    time: '09:30',
    teams: ['Mundial 2026'],
    impact: 'MEDIUM',
    category: 'weather',
    description: 'Se esperan fuertes lluvias durante los partidos de hoy. Cancha mojada afectará el ritmo de juego.',
    bettingImpact: 'TÉCNICO: Under 2.5 goles sube +3%. Over corner over 8.5 baja -2%. Pases largos aumentan 15%.',
    relevanceScore: 78,
  },
  {
    id: '5',
    title: 'Busquets suspendido por tarjeta roja',
    emoji: '🟥',
    date: '14 Jun 2026',
    time: '20:00',
    teams: ['España'],
    impact: 'HIGH',
    category: 'suspension',
    description: 'Sergio Busquets recibió segunda tarjeta roja en clasificatorias. Suspendido para el próximo partido.',
    bettingImpact: 'IMPORTANTE: Defensa España se debilita. Under 2.5 baja -4%. BTTS sube +3%. Win España baja -6%. Midfield control pierde solidez.',
    relevanceScore: 89,
  },
  {
    id: '6',
    title: 'Neymar en forma excepcional',
    emoji: '⭐',
    date: '15 Jun 2026',
    time: '11:15',
    teams: ['Brasil'],
    impact: 'MEDIUM',
    category: 'form',
    description: 'Neymar ha anotado 3 goles en los últimos 4 entrenamientos. Asistencias en 6 ocasiones. Técnicamente perfecta.',
    bettingImpact: 'POSITIVO: Over 0.5 goles Neymar a 1.65 excelente valor. Over 1.5 eventos a 1.85. Assist línea sube a 1.95.',
    relevanceScore: 87,
  },
  {
    id: '7',
    title: 'Kane experimenta molestias estomacales',
    emoji: '🤢',
    date: '14 Jun 2026',
    time: '16:20',
    teams: ['Inglaterra'],
    impact: 'MEDIUM',
    category: 'injury',
    description: 'Harry Kane reporta molestias estomacales. Se espera que se recupere antes del partido. Disponible pero monitoreado.',
    bettingImpact: 'MENOR: Over 0.5 goles Kane baja ligeramente a 1.80. Win Inglaterra se mantiene. Monitorear disponibilidad.',
    relevanceScore: 71,
  },
  {
    id: '8',
    title: 'Sistema táctico de Francia cambia para el Mundial',
    emoji: '🎯',
    date: '13 Jun 2026',
    time: '22:00',
    teams: ['Francia'],
    impact: 'MEDIUM',
    category: 'tactical',
    description: 'Didier Deschamps implementa formación 3-5-2. Mbappé en rol más defensivo. Mayor equilibrio en el mediocampo.',
    bettingImpact: 'TÁCTICO: Under 2.5 goles sube +5%. BTTS baja -3%. Win Francia se mantiene. Menos goles esperados por cambio defensivo.',
    relevanceScore: 79,
  },
  {
    id: '9',
    title: 'Foden en plena forma para el torneo',
    emoji: '🔥',
    date: '15 Jun 2026',
    time: '13:45',
    teams: ['Inglaterra'],
    impact: 'MEDIUM',
    category: 'form',
    description: 'Phil Foden luce ágil, rápido y con gran toma de decisiones. Entrenador confirma que estará listo al 100%.',
    bettingImpact: 'POSITIVO: Over 0.5 goles Foden a 1.90 buen valor. Asistencias sube a 2.05. Win Inglaterra ligeramente al alza.',
    relevanceScore: 75,
  },
  {
    id: '10',
    title: 'Árbitro designado para partido clave',
    emoji: '👨‍⚖️',
    date: '15 Jun 2026',
    time: '08:00',
    teams: ['Mundial 2026'],
    impact: 'LOW',
    category: 'tactical',
    description: 'Pierluigi Collina dirigirá el partido de Argentina vs Francia. Históricamente permite buen ritmo de juego.',
    bettingImpact: 'MENOR: Collina permite 2.1 tarjetas por partido en promedio. Over 5.5 tarjetas es valor. Pocos descalabros esperados.',
    relevanceScore: 62,
  },
];

// Ordenar por relevancia (automáticamente)
export const sortedNews = news.sort((a, b) => b.relevanceScore - a.relevanceScore);
