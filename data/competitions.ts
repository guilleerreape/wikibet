export interface Competition {
  id: string;
  name: string;
  emoji: string;
  country: string;
  level: 'domestic' | 'international';
  color: string;
  description: string;
}

export const competitions: Competition[] = [
  // COMPETICIONES INTERNACIONALES
  {
    id: 'world_2026',
    name: 'Mundial 2026',
    emoji: '🏆',
    country: 'Internacional',
    level: 'international',
    color: '#FFD700',
    description: 'Copa Mundial de la FIFA 2026',
  },
  {
    id: 'copa_america',
    name: 'Copa América 2024',
    emoji: '🇦🇷',
    country: 'América del Sur',
    level: 'international',
    color: '#00B4D8',
    description: 'Máxima competición de América del Sur',
  },
  {
    id: 'euro_2024',
    name: 'Eurocopa 2024',
    emoji: '🇪🇺',
    country: 'Europa',
    level: 'international',
    color: '#003399',
    description: 'Campeonato de Europa de fútbol',
  },

  // ESPAÑA
  {
    id: 'laliga',
    name: 'LaLiga EA Sports',
    emoji: '⚪',
    country: 'España',
    level: 'domestic',
    color: '#003DA5',
    description: 'Primera División de España',
  },
  {
    id: 'laliga2',
    name: 'Liga Hypermotion (LaLiga 2)',
    emoji: '🟡',
    country: 'España',
    level: 'domestic',
    color: '#FFD700',
    description: 'Segunda División de España',
  },

  // INGLATERRA
  {
    id: 'premier',
    name: 'Premier League',
    emoji: '⚽',
    country: 'Inglaterra',
    level: 'domestic',
    color: '#38003C',
    description: 'Primera División de Inglaterra',
  },
  {
    id: 'championship',
    name: 'EFL Championship',
    emoji: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    country: 'Inglaterra',
    level: 'domestic',
    color: '#003DA5',
    description: 'Segunda División de Inglaterra',
  },

  // ITALIA
  {
    id: 'seriea',
    name: 'Serie A',
    emoji: '🇮🇹',
    country: 'Italia',
    level: 'domestic',
    color: '#0066CC',
    description: 'Primera División de Italia',
  },
  {
    id: 'serieb',
    name: 'Serie B',
    emoji: '🟤',
    country: 'Italia',
    level: 'domestic',
    color: '#8B4513',
    description: 'Segunda División de Italia',
  },

  // ALEMANIA
  {
    id: 'bundesliga',
    name: 'Bundesliga',
    emoji: '🇩🇪',
    country: 'Alemania',
    level: 'domestic',
    color: '#000000',
    description: 'Primera División de Alemania',
  },
  {
    id: '2bundesliga',
    name: '2. Bundesliga',
    emoji: '🟠',
    country: 'Alemania',
    level: 'domestic',
    color: '#FF6600',
    description: 'Segunda División de Alemania',
  },

  // FRANCIA
  {
    id: 'ligue1',
    name: 'Ligue 1',
    emoji: '🇫🇷',
    country: 'Francia',
    level: 'domestic',
    color: '#001A80',
    description: 'Primera División de Francia',
  },
  {
    id: 'ligue2',
    name: 'Ligue 2',
    emoji: '🟢',
    country: 'Francia',
    level: 'domestic',
    color: '#00AA00',
    description: 'Segunda División de Francia',
  },

  // HOLANDA
  {
    id: 'eredivisie',
    name: 'Eredivisie',
    emoji: '🇳🇱',
    country: 'Holanda',
    level: 'domestic',
    color: '#FF6600',
    description: 'Primera División de Holanda',
  },

  // PORTUGAL
  {
    id: 'primeira',
    name: 'Primeira Liga',
    emoji: '🇵🇹',
    country: 'Portugal',
    level: 'domestic',
    color: '#009900',
    description: 'Primera División de Portugal',
  },

  // BRASIL
  {
    id: 'brasileirao',
    name: 'Campeonato Brasileirão',
    emoji: '🇧🇷',
    country: 'Brasil',
    level: 'domestic',
    color: '#FFD700',
    description: 'Primera División de Brasil',
  },

  // ARGENTINA
  {
    id: 'superliga',
    name: 'Liga Profesional Argentina',
    emoji: '🇦🇷',
    country: 'Argentina',
    level: 'domestic',
    color: '#00BFFF',
    description: 'Primera División de Argentina',
  },

  // MÉXICO
  {
    id: 'liga_mx',
    name: 'Liga BBVA MX',
    emoji: '🇲🇽',
    country: 'México',
    level: 'domestic',
    color: '#00AA00',
    description: 'Primera División de México',
  },

  // USA
  {
    id: 'mls',
    name: 'MLS',
    emoji: '🇺🇸',
    country: 'USA',
    level: 'domestic',
    color: '#003399',
    description: 'Major League Soccer',
  },

  // TURQUÍA
  {
    id: 'superlig',
    name: 'Süper Lig',
    emoji: '🇹🇷',
    country: 'Turquía',
    level: 'domestic',
    color: '#FF0000',
    description: 'Primera División de Turquía',
  },

  // RUSIA
  {
    id: 'rfpl',
    name: 'RPL',
    emoji: '🇷🇺',
    country: 'Rusia',
    level: 'domestic',
    color: '#FF0000',
    description: 'Primera División de Rusia',
  },

  // ESCOCIA
  {
    id: 'spl',
    name: 'Scottish Premiership',
    emoji: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    country: 'Escocia',
    level: 'domestic',
    color: '#00AA00',
    description: 'Primera División de Escocia',
  },

  // BÉLGICA
  {
    id: 'jupiler',
    name: 'Pro League Bélgica',
    emoji: '🇧🇪',
    country: 'Bélgica',
    level: 'domestic',
    color: '#FFD700',
    description: 'Primera División de Bélgica',
  },

  // GRECIA
  {
    id: 'super_league',
    name: 'Super League Grecia',
    emoji: '🇬🇷',
    country: 'Grecia',
    level: 'domestic',
    color: '#0066FF',
    description: 'Primera División de Grecia',
  },

  // POLONIA
  {
    id: 'ekstraklasa',
    name: 'Ekstraklasa',
    emoji: '🇵🇱',
    country: 'Polonia',
    level: 'domestic',
    color: '#FF0000',
    description: 'Primera División de Polonia',
  },

  // SUECIA
  {
    id: 'allsvenskan',
    name: 'Allsvenskan',
    emoji: '🇸🇪',
    country: 'Suecia',
    level: 'domestic',
    color: '#0000FF',
    description: 'Primera División de Suecia',
  },

  // NORUEGA
  {
    id: 'eliteserien',
    name: 'Eliteserien',
    emoji: '🇳🇴',
    country: 'Noruega',
    level: 'domestic',
    color: '#BA0C2F',
    description: 'Primera División de Noruega',
  },

  // DINAMARCA
  {
    id: 'superligaen',
    name: 'Superligaen',
    emoji: '🇩🇰',
    country: 'Dinamarca',
    level: 'domestic',
    color: '#C8102E',
    description: 'Primera División de Dinamarca',
  },

  // JAPÓN
  {
    id: 'jleague',
    name: 'J-League',
    emoji: '🇯🇵',
    country: 'Japón',
    level: 'domestic',
    color: '#FF0000',
    description: 'Primera División de Japón',
  },

  // COREA
  {
    id: 'kfootball',
    name: 'K League',
    emoji: '🇰🇷',
    country: 'Corea del Sur',
    level: 'domestic',
    color: '#FF0000',
    description: 'Primera División de Corea del Sur',
  },

  // CHINA
  {
    id: 'csl',
    name: 'Chinese Super League',
    emoji: '🇨🇳',
    country: 'China',
    level: 'domestic',
    color: '#FF0000',
    description: 'Primera División de China',
  },
];
