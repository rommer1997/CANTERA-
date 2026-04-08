export type VerificationTier = 'NONE' | 'GOLD' | 'DIAMOND' | 'DIAMOND_PRO';

export interface Player {
  id: string;
  name: string;
  age: number;
  position: string;
  team: string;
  isValidated: boolean; // Set to true after referee evaluation
  verificationTier: VerificationTier;
  yearsExperience: number; // For reach/longevity
  totalValidations: number; // For reach/consistency
  baseMetrics: {
    matchesPlayed: number;
    goals: number;
    assists: number;
  };
  // Sensitive Data (Obfuscated if not unlocked)
  sensitiveData: {
    tutorPhone: string;
    tutorEmail: string;
    refereeTechnicalRating: number;
    refereeFairPlayRating: number;
    detailedHeatmap: string; // Mock URL or data
  };
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'EVALUATED';
  events: MatchEvent[];
}

export interface MatchEvent {
  id: string;
  type: 'GOAL' | 'YELLOW_CARD' | 'RED_CARD' | 'SUBSTITUTION';
  time: string;
  playerId: string;
  playerName: string;
}

export interface VerifiedReport {
  id: string;
  matchId: string;
  playerId: string;
  technicalScore: number; // 1-100
  fairPlayScore: number; // 1-100
  notes: string;
  timestamp: string;
}

export interface Scout {
  id: string;
  name: string;
  verificationTier: VerificationTier;
  investmentValue: number; // Monetary value represented by the scout
  unlockedPlayers: string[]; // Array of Player IDs the scout has paid for
  pipeline: string[]; // Array of Player IDs saved
}

export interface Referee {
  id: string;
  name: string;
  verificationTier: VerificationTier;
  accuracyRating: number; // % of validations matching data variables
  totalMatchesEvaluated: number;
}

export interface Opportunity {
  id: string;
  title: string;
  type: 'TOURNAMENT' | 'TRIAL' | 'CAMP' | 'SCOUTING_EVENT';
  creator: {
    id: string;
    name: string;
    role: 'SCOUT' | 'BRAND' | 'STAFF';
    isAuthorized: boolean;
    logo?: string;
  };
  description: string;
  location: string;
  date: string;
  requirements: {
    minAge?: number;
    maxAge?: number;
    positions?: string[];
    minRating?: number;
    verifiedOnly?: boolean;
  };
  status: 'OPEN' | 'CLOSED' | 'DRAFT';
  applicants: string[]; // Player IDs
}

// --- Business Logic (Clean Architecture Use Cases) ---

/**
 * Determines if a Scout has access to a Player's sensitive professional data.
 * @param scout The scout requesting access
 * @param playerId The ID of the player
 * @returns boolean indicating access
 */
export const checkDataAccess = (scout: Scout, playerId: string): boolean => {
  return scout.unlockedPlayers.includes(playerId);
};

/**
 * Simulates the Referee finishing a match and evaluating a player.
 * In a real app, this would be a transaction updating the Match status,
 * creating a VerifiedReport, and updating the Player's isValidated status.
 */
export const finishMatchAndEvaluate = (
  playerId: string, 
  technical: number, 
  fairPlay: number
): VerifiedReport => {
  // 1. Create Report
  const report: VerifiedReport = {
    id: `REP-${Math.random().toString(36).substr(2, 9)}`,
    matchId: 'MATCH-123',
    playerId,
    technicalScore: technical,
    fairPlayScore: fairPlay,
    notes: 'Evaluated post-match by official referee.',
    timestamp: new Date().toISOString(),
  };

  // 2. In a real DB, we would update the Player here:
  // db.players.update(playerId, { isValidated: true, sensitiveData: { refereeTechnicalRating: technical, ... } })

  return report;
};

// --- Mock Database ---

export const MOCK_PLAYERS: Player[] = [
  {
    id: 'PLY-001',
    name: 'Mateo Silva',
    age: 19,
    position: 'CM',
    team: 'Real Madrid U19',
    isValidated: true,
    verificationTier: 'DIAMOND_PRO',
    yearsExperience: 4,
    totalValidations: 128,
    baseMetrics: { matchesPlayed: 24, goals: 5, assists: 12 },
    sensitiveData: {
      tutorPhone: '+34 600 123 456',
      tutorEmail: 'tutor.mateo@example.com',
      refereeTechnicalRating: 88,
      refereeFairPlayRating: 95,
      detailedHeatmap: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=800&auto=format&fit=crop'
    }
  },
  {
    id: 'PLY-002',
    name: 'Lucas Hernandez',
    age: 18,
    position: 'CB',
    team: 'Atletico Madrid U19',
    isValidated: false,
    verificationTier: 'GOLD',
    yearsExperience: 2,
    totalValidations: 45,
    baseMetrics: { matchesPlayed: 18, goals: 2, assists: 1 },
    sensitiveData: {
      tutorPhone: '+34 600 987 654',
      tutorEmail: 'tutor.lucas@example.com',
      refereeTechnicalRating: 75,
      refereeFairPlayRating: 80,
      detailedHeatmap: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?q=80&w=800&auto=format&fit=crop'
    }
  }
];

export const MOCK_SCOUT: Scout = {
  id: 'SCT-999',
  name: 'Global Elite Scouting',
  verificationTier: 'DIAMOND',
  investmentValue: 2500000, // 2.5M
  unlockedPlayers: ['PLY-001'], // Mateo is unlocked, Lucas is locked
  pipeline: ['PLY-001', 'PLY-002']
};

export const MOCK_REFEREE: Referee = {
  id: 'REF-001',
  name: 'Carlos Velasco',
  verificationTier: 'DIAMOND_PRO',
  accuracyRating: 98.5,
  totalMatchesEvaluated: 450
};

export const MOCK_OPPORTUNITIES: Opportunity[] = [
  {
    id: 'OPP-001',
    title: 'Pruebas de Verano Élite Sub-19',
    type: 'TRIAL',
    creator: {
      id: 'SCT-999',
      name: 'Global Elite Scouting',
      role: 'SCOUT',
      isAuthorized: true,
      logo: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=100&auto=format&fit=crop'
    },
    description: 'Pruebas exclusivas para mediocampistas destacados. Camino directo a academias europeas.',
    location: 'Barcelona, España',
    date: '2024-07-15',
    requirements: {
      minAge: 17,
      maxAge: 19,
      positions: ['CM', 'CAM', 'CDM'],
      minRating: 80,
      verifiedOnly: true
    },
    status: 'OPEN',
    applicants: []
  },
  {
    id: 'OPP-002',
    title: 'Torneo Promesas Nike',
    type: 'TOURNAMENT',
    creator: {
      id: 'BRD-001',
      name: 'Nike Football',
      role: 'BRAND',
      isAuthorized: true,
      logo: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=100&auto=format&fit=crop'
    },
    description: 'Demuestra tus habilidades frente a más de 50 ojeadores de todo el mundo.',
    location: 'Londres, Reino Unido',
    date: '2024-08-20',
    requirements: {
      minAge: 15,
      maxAge: 18,
      minRating: 75
    },
    status: 'OPEN',
    applicants: ['PLY-001']
  },
  {
    id: 'OPP-003',
    title: 'Día de Puertas Abiertas Cantera Real Madrid',
    type: 'SCOUTING_EVENT',
    creator: {
      id: 'STF-001',
      name: 'RMA Staff',
      role: 'STAFF',
      isAuthorized: true,
      logo: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=100&auto=format&fit=crop'
    },
    description: 'Día oficial de ojeo para el sistema juvenil del Real Madrid.',
    location: 'Madrid, España',
    date: '2024-06-10',
    requirements: {
      maxAge: 16,
      positions: ['GK', 'CB', 'ST']
    },
    status: 'OPEN',
    applicants: []
  }
];
