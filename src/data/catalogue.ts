import type { Competition, Player, Source } from './types';

/**
 * The approved Feed source catalogue, mirrored from
 * `apps/api/src/providers/feed/sources.ts` in the OcheHub repo (same ids).
 */
export const sources: Source[] = [
  {
    id: 'pdc',
    kind: 'videoChannel',
    name: 'PDC',
    short: 'PDC',
    monogram: 'PDC',
    color: '#1236A5',
    url: 'https://www.youtube.com/officialpdc',
    blurb: 'Official highlights from every PDC tournament.',
  },
  {
    id: 'sky-sports-darts',
    kind: 'videoChannel',
    name: 'Sky Sports Darts',
    short: 'Sky Sports',
    monogram: 'SKY',
    color: '#C44A1B',
    url: 'https://www.youtube.com/@SkySportsDarts',
    blurb: 'Interviews, reactions and the big moments.',
  },
  {
    id: 'modus-super-series',
    kind: 'videoChannel',
    name: 'MODUS Super Series',
    short: 'MODUS',
    monogram: 'MSS',
    color: '#0F7B66',
    url: 'https://www.youtube.com/@MODUSSuperSeries',
    blurb: 'Full sessions from the MODUS Super Series.',
  },
  {
    id: 'online-darts',
    kind: 'videoChannel',
    name: 'Online Darts',
    short: 'Online Darts',
    monogram: 'OD',
    color: '#4D74DE',
    url: 'https://www.youtube.com/@OnlineDarts',
    blurb: 'Independent interviews from the tour.',
  },
  {
    id: 'edgar-tv-darts',
    kind: 'videoChannel',
    name: 'Edgar TV Darts',
    short: 'Edgar TV',
    monogram: 'ETV',
    color: '#61141F',
    url: 'https://www.youtube.com/@edgartvdarts',
    blurb: 'Coaching, kit and opinion with Matthew Edgar.',
  },
  {
    id: 'tops-and-tales',
    kind: 'podcastShow',
    name: 'Tops and Tales Darts Podcast with Huw Ware',
    short: 'Tops and Tales',
    monogram: 'T&T',
    color: '#0A205C',
    url: 'https://podcasts.apple.com/gb/podcast/tops-and-tales-darts-podcast-with-huw-ware/id1794578467',
    image:
      'https://megaphone.imgix.net/podcasts/9b59385c-e248-11ef-ab55-eb2d5b6f5c92/image/f5715ca2f1f187f85f59cefe573c05df.jpg?ixlib=rails-4.3.1&max-w=600&max-h=600&fit=crop&auto=format,compress',
    blurb: 'PDC referee Huw Ware sits down with the world’s best players.',
  },
  {
    id: 'mission-darts',
    kind: 'podcastShow',
    name: 'Mission Darts Podcast',
    short: 'Mission Darts',
    monogram: 'MD',
    color: '#3D2412',
    url: 'https://podcasts.apple.com/gb/podcast/mission-darts-podcast/id1765974446',
    image: 'https://media.rss.com/missiondarts/20240901_120916_97acfc74a65b9840d656d28f33d91713.png',
  },
  {
    id: 'love-the-darts',
    kind: 'podcastShow',
    name: 'Love The Darts',
    short: 'Love The Darts',
    monogram: 'LTD',
    color: '#61141F',
    url: 'https://podcasts.apple.com/gb/podcast/love-the-darts/id1437576176',
    image:
      'https://artwork.captivate.fm/9289bdfe-3a67-42dd-a5bc-d900847c07d2/LoveTheDarts-Podcast-Spotify.jpg',
  },
  {
    id: 'weekly-dartscast',
    kind: 'podcastShow',
    name: 'Weekly Dartscast',
    short: 'Weekly Dartscast',
    monogram: 'WD',
    color: '#0C711F',
    url: 'https://podcasts.apple.com/gb/podcast/weekly-dartscast/id1196054422',
    image:
      'https://static.libsyn.com/p/assets/0/4/6/5/0465c5194878a8ebd959afa2a1bf1c87/Weekly_Dartscast_1400x1400.jpg',
  },
  {
    id: 'dartsnews',
    kind: 'newsPublisher',
    name: 'Dartsnews',
    short: 'Dartsnews',
    monogram: 'DN',
    color: '#0F308A',
    url: 'https://dartsnews.com/',
  },
  {
    id: 'online-darts-news',
    kind: 'newsPublisher',
    name: 'Online Darts',
    short: 'Online Darts',
    monogram: 'OD',
    color: '#4D74DE',
    url: 'https://onlinedarts.com/',
  },
];

export const sourceById = new Map(sources.map((source) => [source.id, source]));

/** Names, nicknames and brand hues from `packages/assets/data/top-500-darts-players.json`. */
export const players: Player[] = [
  { id: 'littler', first: 'Luke', last: 'Littler', nickname: 'The Nuke', hue: 271 },
  { id: 'humphries', first: 'Luke', last: 'Humphries', nickname: 'Cool Hand Luke', hue: 211 },
  { id: 'van-veen', first: 'Gian', last: 'van Veen', nickname: 'The Giant', hue: 140 },
  { id: 'van-gerwen', first: 'Michael', last: 'van Gerwen', nickname: 'Mighty Mike', hue: 118 },
  { id: 'clayton', first: 'Jonny', last: 'Clayton', nickname: 'The Ferret', hue: 352 },
  { id: 'wade', first: 'James', last: 'Wade', nickname: 'The Machine', hue: 124 },
  { id: 'price', first: 'Gerwyn', last: 'Price', nickname: 'The Iceman', hue: 190 },
  { id: 'bunting', first: 'Stephen', last: 'Bunting', nickname: 'The Bullet', hue: 354 },
  { id: 'anderson', first: 'Gary', last: 'Anderson', nickname: 'The Flying Scotsman', hue: 210 },
  { id: 'ross-smith', first: 'Ross', last: 'Smith', nickname: 'Smudger', hue: 0 },
  { id: 'aspinall', first: 'Nathan', last: 'Aspinall', nickname: 'The Asp', hue: 358 },
  { id: 'woodhouse', first: 'Luke', last: 'Woodhouse', nickname: 'Woody', hue: 215 },
  { id: 'joyce', first: 'Ryan', last: 'Joyce', nickname: 'Relentless', hue: 285 },
  { id: 'cullen', first: 'Joe', last: 'Cullen', nickname: 'Rockstar', hue: 356 },
];

export const playerById = new Map(players.map((player) => [player.id, player]));

export const competitions: Competition[] = [
  { id: 'world-grand-prix', name: 'World Grand Prix', short: 'Grand Prix' },
  { id: 'premier-league', name: 'Premier League', short: 'Premier League' },
  { id: 'world-matchplay', name: 'World Matchplay', short: 'Matchplay' },
  { id: 'world-championship', name: 'World Championship', short: 'Worlds' },
  { id: 'world-cup', name: 'World Cup of Darts', short: 'World Cup' },
  { id: 'world-series', name: 'World Series of Darts', short: 'World Series' },
  { id: 'grand-slam', name: 'Grand Slam of Darts', short: 'Grand Slam' },
  { id: 'european-tour', name: 'European Tour', short: 'Euro Tour' },
  { id: 'players-championship', name: 'Players Championship', short: 'ProTour' },
  { id: 'modus-super-series', name: 'MODUS Super Series', short: 'MODUS' },
  { id: 'world-youth', name: 'World Youth Championship', short: 'World Youth' },
];

export const competitionById = new Map(competitions.map((entry) => [entry.id, entry]));

/**
 * What this account already follows in OcheHub. In the product this is the
 * account's `followedPlayers` / `followedCompetitions` plus the Feed's
 * channel and show follows; here it seeds the prototype's local state.
 */
export const accountFollows = {
  players: ['littler', 'humphries', 'price', 'aspinall'],
  competitions: ['world-grand-prix', 'premier-league'],
  sources: ['pdc', 'sky-sports-darts', 'love-the-darts', 'weekly-dartscast', 'dartsnews'],
};

export const viewer = { initials: 'DH', name: 'Dan' };
