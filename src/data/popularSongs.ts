export interface SongPreset {
  videoId: string;
  title: string;
  artist: string;
  category: 'Indo Hits' | 'Pop Barat' | 'Rock & Nostalgia' | 'Dangdut & Ballad';
  duration?: number;
}

export const POPULAR_KARAOKE_SONGS: SongPreset[] = [
  // Indonesian Favorites
  {
    videoId: 'qC8eHn7oZzA',
    title: 'Kangen (Karaoke Lirik)',
    artist: 'Dewa 19',
    category: 'Indo Hits',
    duration: 320,
  },
  {
    videoId: 'zVbH3zKq4i4',
    title: 'Dan... (Karaoke No Vocal)',
    artist: 'Sheila on 7',
    category: 'Indo Hits',
    duration: 275,
  },
  {
    videoId: 'gqL09Qx_QyA',
    title: 'Separuh Aku (Karaoke Lirik)',
    artist: 'Noah / Peterpan',
    category: 'Indo Hits',
    duration: 268,
  },
  {
    videoId: 'b5mZ7t2j4Hk',
    title: 'Hati-Hati di Jalan (Karaoke)',
    artist: 'Tulus',
    category: 'Indo Hits',
    duration: 242,
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Cinta Terbaik (Karaoke Lirik)',
    artist: 'Cassandra',
    category: 'Indo Hits',
    duration: 250,
  },
  {
    videoId: 'M7lc1UVf-VE',
    title: 'Kemesraan (Karaoke Lirik)',
    artist: 'Iwan Fals',
    category: 'Indo Hits',
    duration: 310,
  },

  // Western Pop
  {
    videoId: '2Vv-BfVoq4g',
    title: 'Perfect (Karaoke Version)',
    artist: 'Ed Sheeran',
    category: 'Pop Barat',
    duration: 260,
  },
  {
    videoId: '09R8_2nJtjg',
    title: 'Someone Like You (Karaoke)',
    artist: 'Adele',
    category: 'Pop Barat',
    duration: 285,
  },
  {
    videoId: 'fRh_vgS2dFE',
    title: 'Bohemian Rhapsody (Karaoke)',
    artist: 'Queen',
    category: 'Rock & Nostalgia',
    duration: 355,
  },
  {
    videoId: 'LjhCEhWiKXk',
    title: 'Just The Way You Are (Karaoke)',
    artist: 'Bruno Mars',
    category: 'Pop Barat',
    duration: 220,
  },
  {
    videoId: 'kJQP7kiw5Fk',
    title: 'Despacito (Karaoke Acoustic)',
    artist: 'Luis Fonsi',
    category: 'Pop Barat',
    duration: 230,
  },
  {
    videoId: 'q0hyYWKXF0Q',
    title: 'My Way (Karaoke Version)',
    artist: 'Frank Sinatra',
    category: 'Rock & Nostalgia',
    duration: 275,
  },
  {
    videoId: 'hT_nvWreIhg',
    title: 'Counting Stars (Karaoke)',
    artist: 'OneRepublic',
    category: 'Pop Barat',
    duration: 257,
  },

  // Rock & Ballads
  {
    videoId: 'kXYiU_JCYtU',
    title: 'Numb (Karaoke Version)',
    artist: 'Linkin Park',
    category: 'Rock & Nostalgia',
    duration: 188,
  },
  {
    videoId: 'uelHwf8o7_U',
    title: 'Love of My Life (Karaoke)',
    artist: 'Queen',
    category: 'Rock & Nostalgia',
    duration: 220,
  },
  {
    videoId: 'YQHsXMglC9A',
    title: 'Hello (Karaoke Version)',
    artist: 'Adele',
    category: 'Pop Barat',
    duration: 295,
  },
];
