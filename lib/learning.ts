import type { GameState, Sol } from "./game";
export type LessonSol = 0 | 1 | 8 | 18 | 28;
export type Learning = {
  answered: LessonSol[];
  pending: LessonSol | null;
  feedback: "none" | "retry" | "correct";
};
export const INITIAL_LEARNING: Learning = {
  answered: [],
  pending: null,
  feedback: "none",
};
export const LESSONS: Record<
  LessonSol,
  {
    title: string;
    question: string;
    answers: [string, string, string];
    correct: number;
    explain: string;
    medal: string;
    icon: string;
  }
> = {
  0: {
    title: "Tu primera idea espacial",
    question: "¿Qué nos ayuda a cargar los paneles?",
    answers: [
      "La luz del Sol",
      "El sonido de una campana",
      "Una manta de lana",
    ],
    correct: 0,
    explain: "¡La luz del Sol! Los paneles la convierten en electricidad.",
    medal: "Explorador de Bolivia",
    icon: "★",
  },
  1: {
    title: "¡Nuestra comida está creciendo!",
    question: "¿Qué puede fabricar la máquina al juntar gases?",
    answers: [
      "Piedras de chocolate",
      "Gotitas de agua",
      "Zapatos para plantas",
    ],
    correct: 1,
    explain:
      "¡Gotitas de agua! En el espacio se puede recuperar agua con gases.",
    medal: "Científico del Agua",
    icon: "💧",
  },
  8: {
    title: "¡Atravesamos la nube de polvo!",
    question: "¿Por qué cargan menos los paneles con polvo?",
    answers: [
      "El polvo les hace cosquillas",
      "La batería tiene sueño",
      "El polvo tapa la luz del Sol",
    ],
    correct: 2,
    explain:
      "El polvo tapa la luz, como una gran nube. Limpiar ayuda a cargar.",
    medal: "Héroe Solar",
    icon: "☀️",
  },
  18: {
    title: "¡La Tierra nos escucha!",
    question: "¿Qué detecta NASA cuando el Sol lanza energía?",
    answers: [
      "Una llamarada solar",
      "Una lluvia de caramelos",
      "Un arcoíris de hielo",
    ],
    correct: 0,
    explain: "¡Una llamarada solar! Es como un estornudo de energía del Sol.",
    medal: "Cazador de Señales",
    icon: "📡",
  },
  28: {
    title: "¡Llegamos juntos al rescate!",
    question: "¿Qué camino pide más fuerza, como en una bici?",
    answers: [
      "Uno plano",
      "Una cuesta empinada",
      "Los dos gastan siempre igual",
    ],
    correct: 1,
    explain:
      "Subir una cuesta pide más energía, en una bici y en nuestro rover.",
    medal: "Piloto Marciano",
    icon: "🚙",
  },
};
export function completedLesson(s: GameState): LessonSol | null {
  if (s.solActual === 1 && s.greenhouse.status === "complete") return 1;
  if (s.solActual === 8 && s.storm.status === "complete") return 8;
  if (s.solActual === 18 && s.rescue.status === "complete") return 18;
  if (s.solActual === 28 && s.rover.status === "arrived") return 28;
  return null;
}
export function queueLesson(s: GameState): GameState {
  const sol = completedLesson(s);
  return sol !== null &&
    !s.learning.answered.includes(sol) &&
    s.learning.pending === null
    ? { ...s, learning: { ...s.learning, pending: sol, feedback: "none" } }
    : s;
}
export type HelpCause =
  | "water"
  | "air"
  | "battery"
  | "cold"
  | "plants"
  | "team"
  | "radiation"
  | "shield";
export type ExplorerHelp = {
  cause: HelpCause;
  pausedAt: number;
  corrected: boolean;
};
export const HELP_COPY: Record<
  HelpCause,
  { text: string; fix: string; visual: string }
> = {
  water: {
    text: "¡Las plantas tienen sed! Pon el agua en verde y usa mi reserva.",
    fix: "💧 Poner agua en verde",
    visual: "💧 → 🌱",
  },
  air: {
    text: "¡Nos queda poco aire! Bajemos el agua para que el equipo respire.",
    fix: "💨 Cuidar el aire",
    visual: "💨 → 🧑‍🚀",
  },
  battery: {
    text: "¡La batería necesita ayuda! Ahorramos luz y conectamos mi reserva.",
    fix: "⚡ Ahorrar y recargar",
    visual: "☀️ → ⚡",
  },
  cold: {
    text: "¡Hace frío! Enciende la calefacción para abrigar al equipo.",
    fix: "🔥 Encender la calefacción",
    visual: "🔥 → 🧑‍🚀",
  },
  plants: {
    text: "¡Ayudemos a las plantas! Necesitan agua y un poco de luz.",
    fix: "🌱 Cuidar las plantas",
    visual: "💧 + ☀️ → 🌱",
  },
  team: {
    text: "El equipo necesita un descanso. ¡Tengo una caja de ayuda!",
    fix: "♥ Dar ayuda al equipo",
    visual: "♥ → 🧑‍🚀",
  },
  radiation: {
    text: "Hay muchos rayos invisibles. Volvamos a casa para protegernos.",
    fix: "🛡️ Volver al refugio",
    visual: "☢ → 🛡️",
  },
  shield: {
    text: "¡El Sol estornudó energía! Pausé el reloj para que uses el escudo.",
    fix: "🛡️ Preparar el escudo",
    visual: "☀️ → 🛡️",
  },
};
export function danger(s: GameState): HelpCause | null {
  if (s.solActual === 0 || s.outcome) return null;
  if (s.rover.boarded && s.rover.bodyTemperature < 35) return "cold";
  if (s.resources.agua <= 12) return "water";
  if (s.resources.oxigeno <= 18) return "air";
  if (s.resources.energia <= 12) return "battery";
  if (s.resources.temperaturaCabina < 14) return "cold";
  if (s.resources.integridadTripulacion <= 45) return "team";
  if (s.resources.saludCosecha <= 15) return "plants";
  if (s.resources.radiacionTripulacion >= 85) return "radiation";
  return null;
}
export function applyHelp(s: GameState): GameState {
  if (!s.support) return s;
  const r = { ...s.resources },
    g = { ...s.greenhouse },
    allocation = { ...s.storm.allocation };
  const rover = { ...s.rover };
  const cause = s.support.cause;
  if (cause === "water" || cause === "air" || cause === "plants") {
    g.hydrogen = 35;
    g.uv = 45;
  }
  if (cause === "battery") g.uv = 30;
  if (cause === "cold") {
    rover.heater = "high";
    allocation.heating = 50;
    allocation.eva = 0;
    if (Object.values(allocation).filter((v) => v > 0).length > 2)
      allocation.lights = 0;
  }
  if (cause === "radiation") allocation.eva = 0;
  // Chispa has unlimited teaching reserves. These are named explicitly in the help card.
  r.agua = Math.max(35, r.agua);
  r.oxigeno = Math.max(50, r.oxigeno);
  r.energia = Math.max(40, r.energia);
  r.temperaturaCabina = Math.max(20, r.temperaturaCabina);
  r.integridadTripulacion = Math.max(80, r.integridadTripulacion);
  r.saludCosecha = Math.max(60, r.saludCosecha);
  r.radiacionTripulacion = Math.min(50, r.radiacionTripulacion);
  rover.bodyTemperature = Math.max(36.5, rover.bodyTemperature);
  if (rover.status === "failed") rover.status = "ready";
  return {
    ...s,
    resources: r,
    greenhouse: g,
    storm: { ...s.storm, allocation },
    rover,
    support: { ...s.support, corrected: true },
  };
}
