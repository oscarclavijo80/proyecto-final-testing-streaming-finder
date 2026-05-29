// src/data/moviesDatabase.js
// Base de datos simulada de películas y sus plataformas de streaming

export const moviesDatabase = [
  {
    id: 1,
    title: "Stranger Things",
    titleNormalized: "stranger things",
    platforms: ["netflix"],
    genre: ["drama", "ciencia ficcion", "terror"],
    year: 2016,
    country: "US",
    language: "en",
    rating: 8.7,
    description: "Un grupo de niños descubre misterios sobrenaturales en su pueblo.",
    cast: ["Millie Bobby Brown", "Finn Wolfhard"]
  },
  {
    id: 2,
    title: "The Mandalorian",
    titleNormalized: "the mandalorian",
    platforms: ["disney"],
    genre: ["accion", "aventura", "ciencia ficcion"],
    year: 2019,
    country: "US",
    language: "en",
    rating: 8.7,
    description: "Un cazarrecompensas mandaloriano viaja por la galaxia con un misterioso niño.",
    cast: ["Pedro Pascal"]
  },
  {
    id: 3,
    title: "Succession",
    titleNormalized: "succession",
    platforms: ["hbo"],
    genre: ["drama", "comedia"],
    year: 2018,
    country: "US",
    language: "en",
    rating: 8.9,
    description: "La familia Roy lucha por el control de su imperio mediático.",
    cast: ["Brian Cox", "Jeremy Strong"]
  },
  {
    id: 4,
    title: "The Boys",
    titleNormalized: "the boys",
    platforms: ["amazon"],
    genre: ["accion", "comedia", "ciencia ficcion"],
    year: 2019,
    country: "US",
    language: "en",
    rating: 8.7,
    description: "Un grupo de vigilantes combate a superhéroes corruptos.",
    cast: ["Karl Urban", "Jack Quaid"]
  },
  {
    id: 5,
    title: "Wednesday",
    titleNormalized: "wednesday",
    platforms: ["netflix"],
    genre: ["comedia", "misterio", "terror"],
    year: 2022,
    country: "US",
    language: "en",
    rating: 8.1,
    description: "Merlina Addams investiga crímenes en su nuevo colegio.",
    cast: ["Jenna Ortega"]
  },
  {
    id: 6,
    title: "Loki",
    titleNormalized: "loki",
    platforms: ["disney"],
    genre: ["accion", "aventura", "ciencia ficcion"],
    year: 2021,
    country: "US",
    language: "en",
    rating: 8.2,
    description: "El dios del engaño trabaja con la Autoridad de Variación Temporal.",
    cast: ["Tom Hiddleston"]
  },
  {
    id: 7,
    title: "House of the Dragon",
    titleNormalized: "house of the dragon",
    platforms: ["hbo"],
    genre: ["drama", "fantasia", "accion"],
    year: 2022,
    country: "US",
    language: "en",
    rating: 8.5,
    description: "Precuela de Game of Thrones sobre la Casa Targaryen.",
    cast: ["Paddy Considine", "Matt Smith"]
  },
  {
    id: 8,
    title: "El Señor de los Anillos: Los Anillos de Poder",
    titleNormalized: "los anillos de poder",
    platforms: ["amazon"],
    genre: ["fantasia", "aventura", "accion"],
    year: 2022,
    country: "US",
    language: "en",
    rating: 6.9,
    description: "Historia de la Segunda Era de la Tierra Media.",
    cast: ["Morfydd Clark", "Robert Aramayo"]
  },
  {
    id: 9,
    title: "Narcos",
    titleNormalized: "narcos",
    platforms: ["netflix"],
    genre: ["drama", "crimen", "biografico"],
    year: 2015,
    country: "CO",
    language: "es",
    rating: 8.8,
    description: "La historia del tráfico de drogas en Colombia y el cartel de Medellín.",
    cast: ["Wagner Moura", "Boyd Holbrook"]
  },
  {
    id: 10,
    title: "Encanto",
    titleNormalized: "encanto",
    platforms: ["disney"],
    genre: ["animacion", "aventura", "familia", "fantasia"],
    year: 2021,
    country: "CO",
    language: "es",
    rating: 7.2,
    description: "Una familia colombiana con poderes mágicos en la Sierra Nevada.",
    cast: ["Stephanie Beatriz", "John Leguizamo"]
  },
  {
    id: 11,
    title: "Euphoria",
    titleNormalized: "euphoria",
    platforms: ["hbo"],
    genre: ["drama"],
    year: 2019,
    country: "US",
    language: "en",
    rating: 8.4,
    description: "Un grupo de estudiantes de secundaria navega el amor, la identidad y las drogas.",
    cast: ["Zendaya"]
  },
  {
    id: 12,
    title: "Jack Ryan",
    titleNormalized: "jack ryan",
    platforms: ["amazon"],
    genre: ["accion", "drama", "thriller"],
    year: 2018,
    country: "US",
    language: "en",
    rating: 8.0,
    description: "Un analista de la CIA descubre una amenaza terrorista global.",
    cast: ["John Krasinski"]
  },
  {
    id: 13,
    title: "Ozark",
    titleNormalized: "ozark",
    platforms: ["netflix"],
    genre: ["drama", "crimen", "thriller"],
    year: 2017,
    country: "US",
    language: "en",
    rating: 8.4,
    description: "Un asesor financiero lava dinero para un cartel mexicano.",
    cast: ["Jason Bateman", "Laura Linney"]
  },
  {
    id: 14,
    title: "Avatar: El Camino del Agua",
    titleNormalized: "avatar el camino del agua",
    platforms: ["disney", "amazon"],
    genre: ["accion", "aventura", "ciencia ficcion"],
    year: 2022,
    country: "US",
    language: "en",
    rating: 7.6,
    description: "Jake Sully y Neytiri luchan por proteger a su familia en Pandora.",
    cast: ["Sam Worthington", "Zoe Saldana"]
  },
  {
    id: 15,
    title: "Severance",
    titleNormalized: "severance",
    platforms: ["amazon"],
    genre: ["drama", "ciencia ficcion", "thriller"],
    year: 2022,
    country: "US",
    language: "en",
    rating: 8.7,
    description: "Empleados con memorias quirúrgicamente separadas cuestionan su realidad.",
    cast: ["Adam Scott", "Zach Cherry"]
  }
];

export const platformNames = {
  netflix: "Netflix",
  disney: "Disney+",
  hbo: "HBO Max",
  amazon: "Amazon Prime Video"
};

export const availablePlatforms = Object.keys(platformNames);
export const availableGenres = [
  "accion", "aventura", "animacion", "biografico", "ciencia ficcion",
  "comedia", "crimen", "drama", "familia", "fantasia",
  "misterio", "terror", "thriller"
];
