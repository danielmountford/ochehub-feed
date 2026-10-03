import type { FeedItem, NewsItem, PodcastItem, SocialItem, VideoItem } from './types';

/**
 * Content snapshot, taken 2 October 2026 from the approved sources.
 *
 * - Videos and Shorts: YouTube ids, titles and channels confirmed against
 *   YouTube's oEmbed endpoint. YouTube does not expose durations or publish
 *   dates there, so `sortAt` is an ordering estimate and is never displayed.
 * - Podcasts: titles, dates, durations and enclosures from each show's RSS feed.
 * - News: titles, links and times from the Dartsnews news sitemap. Online
 *   Darts headlines come from search results and carry no publish time.
 * - Titles pass through `tidy()` below: this style shows no emoji and no
 *   all-caps shouting, so "BIG EXITS ❌" is displayed as "Big exits".
 * - Social: SAMPLE posts. Social sources are not in the catalogue yet, so each
 *   post is written around a real item from that source.
 */

/** Words that stay in capitals when shouted source titles are calmed down. */
const KEEP_CAPS = new Set(['PDC', 'WGP', 'MODUS', 'US', 'BOYLE', 'TV', 'POV']);

const PROPER_NOUNS: [RegExp, string][] = [
  [/\bnew york\b/gi, 'New York'],
  [/\bmunich\b/gi, 'Munich'],
  [/\bpremier league\b/gi, 'Premier League'],
  [/\binternational pairs\b/gi, 'International Pairs'],
];

/**
 * Display clean-up for this style: no emoji, no SHOUTING, no "!!!".
 * The snapshot keeps each source's wording; only presentation changes.
 */
export function tidy(text: string): string;
export function tidy(text: string | undefined): string | undefined;
export function tidy(text: string | undefined) {
  if (!text) {
    return text;
  }
  let out = text
    .replace(/\d\uFE0F?\u20E3/gu, '')
    .replace(/\u27A1\uFE0F?/gu, '→')
    .replace(/[\u{1F1E6}-\u{1F1FF}]|[\u{E0020}-\u{E007F}]|\p{Extended_Pictographic}|\uFE0F|\u200D/gu, '')
    .replace(/\*/g, '')
    .replace(/([!?])\1+/g, '$1')
    .replace(/\b[A-Z](?:['’-]?[A-Z])+\b/g, (word) => (KEEP_CAPS.has(word) ? word : word.toLowerCase()));
  for (const [pattern, replacement] of PROPER_NOUNS) {
    out = out.replace(pattern, replacement);
  }
  return out
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([!?,.:])/g, '$1')
    .trim()
    .replace(/^([“‘"']?)([a-z])/, (_, quote: string, letter: string) => quote + letter.toUpperCase());
}

function video(
  id: string,
  sourceId: string,
  youtubeId: string,
  headline: string,
  context: string | undefined,
  title: string,
  sortAt: string,
  players: string[] = [],
  competitions: string[] = [],
): VideoItem {
  return {
    id,
    kind: 'video',
    sourceId,
    youtubeId,
    headline: tidy(headline),
    context: tidy(context),
    title: tidy(title),
    sortAt,
    players,
    competitions,
    url: `https://www.youtube.com/watch?v=${youtubeId}`,
  };
}

function short(
  id: string,
  sourceId: string,
  youtubeId: string,
  headline: string,
  context: string | undefined,
  sortAt: string,
  players: string[] = [],
  competitions: string[] = [],
): VideoItem {
  return {
    id,
    kind: 'short',
    sourceId,
    youtubeId,
    headline: tidy(headline),
    context: tidy(context),
    title: tidy(context ? `${headline} | ${context}` : headline),
    sortAt,
    players,
    competitions,
    url: `https://www.youtube.com/shorts/${youtubeId}`,
  };
}

const WGP = '2026 BOYLE Sports World Grand Prix';

export const videos: VideoItem[] = [
  video('v-wgp-d4', 'pdc', '5Mkqu4sVsD0', 'BIG EXITS ❌', `${WGP} · Day Four Highlights`,
    `BIG EXITS ❌ | ${WGP} | Day Four Highlights`, '2026-10-01T23:30:00+01:00', [], ['world-grand-prix']),
  video('v-od-aspinall', 'online-darts', 'prx1NdNE-vg', 'Nathan Aspinall STUNS Gerwyn Price to reach the World Grand Prix',
    '“I WANT to be in the Premier League”',
    'Nathan Aspinall STUNS Gerwyn Price to reach the World Grand Prix |I WANT to be in the Premier League',
    '2026-10-01T22:00:00+01:00', ['aspinall', 'price'], ['world-grand-prix', 'premier-league']),
  video('v-wgp-d3', 'pdc', 'jC1vgD08mnw', 'PURE DOMINANCE 😤', `${WGP} · Day Three Highlights`,
    `PURE DOMINANCE 😤 | ${WGP} | Day Three Highlights`, '2026-09-30T23:30:00+01:00', [], ['world-grand-prix']),
  video('v-wgp-d2', 'pdc', '6ZrSZpsQu3g', 'COMEBACK COMPLETE! 💪', `${WGP} · Day Two Highlights`,
    `COMEBACK COMPLETE! 💪 | ${WGP} | Day Two Highlights`, '2026-09-29T23:30:00+01:00', [], ['world-grand-prix']),
  video('v-sky-price', 'sky-sports-darts', 'hqcpeF-d050', '“We can’t stop him”',
    'Gerwyn Price reacts to beating Luke Littler 🗣️',
    '"We can\'t stop him" | Gerwyn Price reacts to beating Luke Littler 🗣️',
    '2026-09-29T12:00:00+01:00', ['price', 'littler'], []),
  video('v-wgp-d1', 'pdc', '6hXbZ2_ci4I', 'SEISMIC SHOCKS 😱', `${WGP} · Day One Highlights`,
    `SEISMIC SHOCKS 😱 | ${WGP} | Day One Highlights`, '2026-09-28T23:30:00+01:00', [], ['world-grand-prix']),
  video('v-modus-s15w9', 'modus-super-series', 'K5KhEu9v_X8', 'DRAMATIC DARTS! ⚔️💥',
    'Live Darts · Series 15 Week 9 · Group A Session 3',
    'DRAMATIC DARTS! ⚔️💥 | Live Darts | Series 15 Week 9 | Group A Session 3',
    '2026-09-27T14:00:00+01:00', [], ['modus-super-series']),
  video('v-edgar-studio', 'edgar-tv-darts', '0ZGbh3w2t54', 'I Turned This Office Into A Darts Studio And Coaching Facility',
    undefined, 'I Turned This Office Into A Darts Studio And Coaching Facility', '2026-09-24T17:00:00+01:00'),
  video('v-flanders', 'pdc', 'ryoykH5qm7Q', 'WGP RACE HEATS UP! 🔥', '2026 Flanders Darts Trophy · Day One Evening Highlights',
    'WGP RACE HEATS UP! 🔥 | 2026 Flanders Darts Trophy | Day One Evening Highlights',
    '2026-09-11T23:00:00+01:00', [], ['european-tour', 'world-grand-prix']),
  video('v-pc23', 'pdc', '3AD7w48eh6s', 'A MAIDEN TITLE!', 'Players Championship 23 · Stream One Highlights',
    'A MAIDEN TITLE! | Stream One Highlights | Players Championship 23', '2026-09-08T20:00:00+01:00', [], ['players-championship']),
  video('v-munich', 'pdc', 'BCF1-bhDrdI', 'A NEW WINNER IN MUNICH 👑', '2026 German Darts Grand Prix · Finals Night Highlights',
    'A NEW WINNER IN MUNICH 👑 | 2026 German Darts Grand Prix | Finals Night Highlights',
    '2026-09-06T23:00:00+01:00', [], ['european-tour']),
  video('v-modus-s15w3', 'modus-super-series', '6-YRrVyNmIU', 'THE TOWER IS BACK! 💪🎯',
    'Live Darts · Series 15 Week 3 · Group B Session 1',
    'THE TOWER IS BACK! 💪🎯 | Live Darts | SERIES 15 WEEK 3 | Group B Session 1',
    '2026-08-18T14:00:00+01:00', [], ['modus-super-series']),
  video('v-modus-pairs', 'modus-super-series', 'VcS3m5V4aRE', 'INTERNATIONAL PAIRS RETURNS! 🌍',
    'Live Darts · International Pairs 3 · Group A Session 1',
    'INTERNATIONAL PAIRS RETURNS! 🌍 | Live Darts | International Pairs 3 | Group A Session 1',
    '2026-08-03T14:00:00+01:00', [], ['modus-super-series']),
  video('v-sky-matchplay-win', 'sky-sports-darts', 'VUNGE75JAhQ', '“I’m playing SO WELL”',
    'Luke Littler reacts to record-breaking World Matchplay win',
    '"I\'m playing SO WELL" | Luke Littler reacts to record-breaking World Matchplay win',
    '2026-07-26T23:30:00+01:00', ['littler'], ['world-matchplay']),
  video('v-sky-price-quarters', 'sky-sports-darts', 'YjdFspNe5SQ', 'Gerwyn Price’s brilliant interview after reaching Matchplay quarters! 🤣',
    undefined, "Gerwyn Price's brilliant interview after reaching Matchplay quarters! 🤣",
    '2026-07-22T23:00:00+01:00', ['price'], ['world-matchplay']),
  video('v-sky-nine', 'sky-sports-darts', 'bCVHHsvWNEk', 'Luke Littler nails OUTRAGEOUS nine-darter in opening leg',
    'World Matchplay Darts 2026', 'Luke Littler nails OUTRAGEOUS nine-darter in opening leg | World Matchplay Darts 2026',
    '2026-07-21T22:00:00+01:00', ['littler'], ['world-matchplay']),
  video('v-pc17', 'pdc', 'LlCmrZNkgxA', 'TOP-NOTCH DARTS 🎯', '2026 Players Championship 17 · Stream Two Highlights',
    'TOP-NOTCH DARTS 🎯 | 2026 Players Championship 17 | Stream Two Highlights', '2026-07-08T20:00:00+01:00', [], ['players-championship']),
  video('v-usdm', 'pdc', '3Q4dFyQEjs8', 'FAIRYTALE IN NEW YORK! 🇺🇸', 'Luke Humphries v Luke Littler · 2026 US Darts Masters Full Final',
    'FAIRYTALE IN NEW YORK! 🇺🇸 | Luke Humphries v Luke Littler | 2026 US Darts Masters Full Final',
    '2026-06-27T23:00:00+01:00', ['humphries', 'littler'], ['world-series']),
  video('v-pc15', 'pdc', '1xUMP9ouwWw', 'STUNNING DARTS! 🎯', '2026 Players Championship 15 · Stream Two Highlights',
    'STUNNING DARTS! 🎯 | 2026 Players Championship 15 | Stream Two Highlights', '2026-06-17T20:00:00+01:00', [], ['players-championship']),
  video('v-sky-worldcup', 'sky-sports-darts', 'HSZhVa8RQus', 'Luke Littler and Luke Humphries lift the World Cup of Darts trophy 🏆🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    undefined, 'Luke Littler and Luke Humphries lift the World Cup of Darts trophy 🏆🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    '2026-06-14T23:00:00+01:00', ['littler', 'humphries'], ['world-cup']),
  video('v-modus-s14', 'modus-super-series', '2z5aJxbTg5E', '£25,000 ON THE LINE!!! 🚨🏆',
    'Live Darts · Series 14 Champions Night',
    '£25,000 ON THE LINE!!! 🚨🏆 | Live Darts | Series 14 Champions Night',
    '2026-06-06T19:00:00+01:00', [], ['modus-super-series']),
  video('v-pl-final', 'pdc', '-lINj_wOy10', 'GREATEST PREMIER LEAGUE FINAL! 🤯', 'Luke Littler vs Luke Humphries · 2026 BetMGM Premier League',
    'GREATEST PREMIER LEAGUE FINAL! 🤯 | Luke Littler vs Luke Humphries | 2026 BetMGM Premier League',
    '2026-05-28T23:30:00+01:00', ['littler', 'humphries'], ['premier-league']),
  video('v-sky-pl-classic', 'sky-sports-darts', 'mZdH86SMN5k', 'An all-time CLASSIC!',
    'Luke Littler vs Luke Humphries · Premier League Darts Finals Night',
    'An all-time CLASSIC! | Luke Littler vs Luke Humphries | Premier League Darts Finals Night',
    '2026-05-28T23:00:00+01:00', ['littler', 'humphries'], ['premier-league']),
  video('v-sky-pl-react', 'sky-sports-darts', 'v58S8Fuaawg',
    'Luke Littler reveals he nearly quit and Luke Humphries reflects on EPIC Premier League Darts final', undefined,
    'Luke Littler reveals he nearly quit and Luke Humphries reflects on EPIC Premier League Darts final',
    '2026-05-28T22:45:00+01:00', ['littler', 'humphries'], ['premier-league']),
  video('v-sky-worlds', 'sky-sports-darts', '7Y-rpN8dctE',
    'Luke Littler REACTS to winning the 2026 World Darts Championship against Gian van Veen 🏆', undefined,
    'Luke Littler REACTS to winning the 2026 World Darts Championship against Gian van Veen 🏆',
    '2026-01-03T23:30:00+00:00', ['littler', 'van-veen'], ['world-championship']),
  video('v-sky-price-worlds', 'sky-sports-darts', 'yZFIP_SmUdg', 'Gerwyn Price speaks ahead of the 2026 World Darts Championship 🔥',
    undefined, 'Gerwyn Price speaks ahead of the 2026 World Darts Championship 🔥',
    '2025-12-10T12:00:00+00:00', ['price'], ['world-championship']),
  video('v-sky-grandslam', 'sky-sports-darts', 'NlWQzRgUg3o',
    'Luke Littler and Luke Humphries react to a thrilling Grand Slam of Darts final 🏆', undefined,
    'Luke Littler and Luke Humphries react to a thrilling Grand Slam of Darts final 🏆',
    '2025-11-16T23:30:00+00:00', ['littler', 'humphries'], ['grand-slam']),
  video('v-wgp25-final', 'pdc', 'bj0crpcP6mw', 'THE YOUNGEST WGP WINNER! 🏆', 'Luke Littler vs Luke Humphries · 2025 World Grand Prix Final',
    'THE YOUNGEST WGP WINNER! 🏆 | Luke Littler vs Luke Humphries | 2025 World Grand Prix Final',
    '2025-10-12T23:30:00+01:00', ['littler', 'humphries'], ['world-grand-prix']),
];

export const shorts: VideoItem[] = [
  short('s-modus-really', 'modus-super-series', 'Gkdhsu2Ay1I', '‘REALLY?!’ #darts', undefined,
    '2026-09-30T18:00:00+01:00', [], ['modus-super-series']),
  short('s-edgar-2026', 'edgar-tv-darts', 'PpaeLB46yCk', 'Darts in 2026', undefined, '2026-09-22T18:00:00+01:00'),
  short('s-sky-nine', 'sky-sports-darts', 'Ynh7rQBS0Gk', 'Noa-Lynn van Leuven’s epic nine-darter!', undefined,
    '2026-09-14T18:00:00+01:00'),
  short('s-pdc-msg', 'pdc', 'Cfc5DSL7UDs', 'POV: You’re at the darts at Madison Square Garden! 🎯🇺🇸', undefined,
    '2026-06-27T18:00:00+01:00', [], ['world-series']),
  short('s-pdc-327', 'pdc', 'hGnOr-BydGc', '327 IN SIX DARTS TO WIN! 🏆', '2025/26 Paddy Power World Darts Championship',
    '2026-01-02T18:00:00+00:00', [], ['world-championship']),
  short('s-pdc-1996', 'pdc', 'IEbFI1kfXJ8', '1996 ➡️ 2026 🏆', '2025/26 Paddy Power World Darts Championship',
    '2025-12-30T18:00:00+00:00', [], ['world-championship']),
  short('s-pdc-iconic', 'pdc', '3dW69NKMdcg', 'Luke Littler’s ICONIC nine-darter in the 2024 Premier League final! 🤩9️⃣', undefined,
    '2025-05-20T18:00:00+01:00', ['littler'], ['premier-league']),
];

function episode(
  id: string,
  sourceId: string,
  title: string,
  publishedAt: string,
  durationSeconds: number,
  audioUrl: string,
  players: string[] = [],
  competitions: string[] = [],
  description?: string,
): PodcastItem {
  return {
    id,
    kind: 'podcast',
    sourceId,
    title: tidy(title),
    publishedAt,
    sortAt: publishedAt,
    durationSeconds,
    audioUrl,
    players,
    competitions,
    description,
    url: audioUrl,
  };
}

const captivate = (uuid: string) =>
  `https://episodes.captivate.fm/episode/${uuid}.mp3?aw_0_1st.showid=3b3cbd74-902f-4b3b-a3a5-6ecadd8d2b7c&aw_0_1st.episodeid=${uuid}`;
const megaphone = (code: string) => `https://pscrb.fm/rss/p/traffic.megaphone.fm/${code}.mp3`;
const dartscast = (n: number) =>
  `https://dts.podtrac.com/redirect.mp3/traffic.libsyn.com/secure/theweeklydartscast/${n}.mp3?dest-id=461132`;
const mission = (path: string) => `https://content.rss.com/episodes/286356/${path}.mp3`;

export const podcasts: PodcastItem[] = [
  episode('p-md-wgp', 'mission-darts', 'Shock Name To Win The Darts World Grand Prix?', '2026-10-01T16:00:00Z', 4081,
    mission('3199162/missiondarts/2026_10_01_12_32_18_8214dece-70f5-4c92-b841-d107f3057a9b'), [], ['world-grand-prix']),
  episode('p-ltd-bunting', 'love-the-darts', 'Stephen Bunting special | The Bullet talks all about his new book!',
    '2026-09-25T11:40:00+01:00', 2960, captivate('46ce6faf-c891-4307-a937-a03f3342cd75'), ['bunting']),
  episode('p-wd-468', 'weekly-dartscast',
    '#468: Noa-Lynn van Leuven, World Series of Darts Finals Review, World Grand Prix Preview',
    '2026-09-25T21:02:00Z', 3401, dartscast(468), [], ['world-series', 'world-grand-prix']),
  episode('p-ltd-ross-smith', 'love-the-darts', 'Ross Smith special | Premier League aim and World Grand Prix preparations!',
    '2026-09-25T06:00:00+01:00', 1607, captivate('c866f0d0-2154-423b-ad27-c3f70312b3c8'), ['ross-smith'],
    ['premier-league', 'world-grand-prix']),
  episode('p-md-whistling', 'mission-darts', 'Whistling is *RUINING* Darts...', '2026-09-24T16:00:00Z', 3662,
    mission('3178739/missiondarts/2026_09_24_12_44_25_69eb3a24-59d7-47d4-929b-a3aec419b306')),
  episode('p-ltd-wgp-preview', 'love-the-darts',
    'World Grand Prix preview | Can Littler bounce back from whistling controversy?',
    '2026-09-23T14:25:00+01:00', 2882, captivate('d4a1ebe5-326d-4eaa-8bee-2f62b906c08b'), ['littler'], ['world-grand-prix']),
  episode('p-md-auditions', 'mission-darts', 'Are The Luke Littler Auditions Worth It?', '2026-09-17T16:00:00Z', 3139,
    mission('3160436/missiondarts/2026_09_17_08_17_16_2ca67bf8-ad7b-4abd-8860-8a5212b53abc'), ['littler']),
  episode('p-wd-467', 'weekly-dartscast', '#467: Jim Long, World Series of Darts Finals Preview', '2026-09-16T21:25:00Z', 3447,
    dartscast(467), [], ['world-series']),
  episode('p-md-lakeside', 'mission-darts', 'Matthew Edgar Is Going Back To Lakeside?!', '2026-09-10T16:00:00Z', 4049,
    mission('3138557/missiondarts/2026_09_09_22_35_50_12a2f352-9ccf-4d09-aa78-bdeb7beb1f47')),
  episode('p-wd-466', 'weekly-dartscast', '#466: Beau Greaves, Chris Landman, Czech Darts Open Review', '2026-09-09T21:20:00Z',
    5083, dartscast(466), [], ['european-tour']),
  episode('p-wd-465', 'weekly-dartscast', '#465: Ryan Hogarth, Hungarian Darts Trophy Review, Mailbag Returns',
    '2026-09-04T05:23:00Z', 3208, dartscast(465), [], ['european-tour']),
  episode('p-md-healthier', 'mission-darts', 'Can Being Healthier Lead To Winning More Darts Games?', '2026-09-03T16:00:00Z',
    3136, mission('3118063/missiondarts/2026_09_03_10_08_29_cc7b5ef9-47b3-409e-936c-35f3a0222684')),
  episode('p-tt-brooks', 'tops-and-tales', 'Bradley Brooks: “From world number 50-70 is like a different sport”',
    '2026-08-31T05:00:00Z', 3387, megaphone('COMG3993445290'), [], [],
    'In the series finale of Tops and Tales, Huw Ware sits down with ‘Bam Bam’ Bradley Brooks, and the pair talk about how he unexpectedly won his tour card at Q-School.'),
  episode('p-wd-464', 'weekly-dartscast', '#464: Connor Hopkins, Steve Brown, ProTour and World Series Reviews',
    '2026-08-28T06:09:00Z', 4792, dartscast(464), [], ['world-series', 'players-championship']),
  episode('p-tt-kenny', 'tops-and-tales', 'Nick Kenny: “I broke my foot after winning the World Cup!”', '2026-08-24T05:00:00Z',
    3728, megaphone('COMG6865435912'), [], ['world-cup'],
    'Huw Ware sits down with his old friend from Glamorgan County Youth days turned PDC pro Nick Kenny.'),
  episode('p-tt-manby', 'tops-and-tales', 'Charlie Manby: “I always wanted to be a darts player”', '2026-08-17T05:00:00Z', 3298,
    megaphone('COMG1149871261'), [], [],
    'Huw Ware sits down with one of the brightest young stars in the world of darts, Charlie Manby.'),
  episode('p-tt-priestley', 'tops-and-tales', 'Dennis Priestley: “I hope they appreciate the sacrifice we went through”',
    '2026-08-10T05:00:00Z', 3667, megaphone('COMG3455523822')),
  episode('p-tt-ward', 'tops-and-tales', 'Reece Ward reveals what The Traitors is REALLY like!', '2026-08-03T05:00:00Z', 4243,
    megaphone('COMG1957511716')),
  episode('p-ltd-matchplay-review', 'love-the-darts', 'World Matchplay review | Is Littler already better than Taylor?',
    '2026-07-29T12:40:00+01:00', 3211, captivate('1ba128a2-90ea-41ac-b6e8-f8cf9e0b4d01'), ['littler'], ['world-matchplay']),
  episode('p-ltd-cullen', 'love-the-darts', 'Joe Cullen special | Aspinall’s stag do antics and World Matchplay preparations!',
    '2026-07-17T06:00:00+01:00', 893, captivate('46a0dc7b-df21-4282-8c70-75e1199a7034'), ['cullen', 'aspinall'],
    ['world-matchplay']),
  episode('p-ltd-matchplay-preview', 'love-the-darts', 'World Matchplay Preview | Can Nijman’s form disrupt the two Lukes?',
    '2026-07-15T12:20:00+01:00', 2845, captivate('46907ba9-b572-4166-8675-4396dc4dc974'), ['littler', 'humphries'],
    ['world-matchplay']),
];

function article(
  id: string,
  sourceId: string,
  title: string,
  url: string,
  publishedAt: string | undefined,
  sortAt: string,
  players: string[] = [],
  competitions: string[] = [],
): NewsItem {
  return { id, kind: 'news', sourceId, title: tidy(title), url, publishedAt, sortAt, players, competitions };
}

const dn = (slug: string) => `https://dartsnews.com/pdc/${slug}`;

export const news: NewsItem[] = [
  article('n-wgp-roundup', 'dartsnews',
    'World Grand Prix Friday evening Round-Up | Wade and Humphries march into World Grand Prix semi-final clash as Price downs Clayton',
    dn('world-grand-prix-friday-evening-round-up-wade-and-humphries-march-into-world-grand-prix-semi-final-clash-as-price-downs-clayton'),
    '2026-10-03T00:07:00+02:00', '2026-10-03T00:07:00+02:00', ['wade', 'humphries', 'price', 'clayton'], ['world-grand-prix']),
  article('n-aspinall-price-time', 'dartsnews',
    'What time does Nathan Aspinall v Gerwyn Price start at the World Grand Prix on Saturday evening',
    dn('what-time-does-nathan-aspinall-v-gerwyn-price-start-at-the-world-grand-prix-on-saturday-evening'),
    '2026-10-02T23:45:00+02:00', '2026-10-02T23:45:00+02:00', ['aspinall', 'price'], ['world-grand-prix']),
  article('n-wgp-guide', 'dartsnews',
    'World Grand Prix 2026: Results, Draw, Schedule, Preview, Format, History and Predictions',
    dn('world-grand-prix-2026-results-draw-schedule-preview-format-history-and-predictions'),
    '2026-10-02T23:43:00+02:00', '2026-10-02T23:43:00+02:00', [], ['world-grand-prix']),
  article('n-aspinall-worth', 'dartsnews',
    '“I think I’m proving my worth, why I believe I am a top-ten player”: Nathan Aspinall has fire and hunger back...and six windows back in his car',
    dn('i-think-im-proving-my-worth-why-i-believe-i-am-a-top-ten-player-nathan-aspinall-has-fire-and-hunger-backand-six-windows-back-in-his-car'),
    '2026-10-02T21:41:00+02:00', '2026-10-02T21:41:00+02:00', ['aspinall'], ['world-grand-prix']),
  article('n-littler-youth', 'dartsnews',
    'Luke Littler set for surprise return to action at Monday’s PDC World Youth Championship as Gian van Veen and Beau Greaves decide against Wigan trip',
    dn('luke-littler-set-for-surprise-return-to-action-at-mondays-pdc-world-youth-championship-as-gian-van-veen-and-beau-greaves-decide-against-wigan-trip'),
    '2026-10-02T18:55:00+02:00', '2026-10-02T18:55:00+02:00', ['littler', 'van-veen'], ['world-youth']),
  article('n-nordic-baltic', 'dartsnews',
    'PDC Nordic & Baltic Championship returns: World Championship spot and Grand Slam berth on the line',
    dn('pdc-nordic-baltic-championship-returns-world-championship-spot-and-grand-slam-berth-on-the-line'),
    '2026-10-02T18:30:00+02:00', '2026-10-02T18:30:00+02:00', [], ['world-championship', 'grand-slam']),
  article('n-aspinall-payback', 'dartsnews',
    '“It’s payback on Friday”: Nathan Aspinall sets sights on Ryan Joyce revenge at World Grand Prix',
    dn('its-payback-on-friday-nathan-aspinall-sets-sights-on-ryan-joyce-revenge-at-world-grand-prix'),
    '2026-10-02T17:00:00+02:00', '2026-10-02T17:00:00+02:00', ['aspinall', 'joyce'], ['world-grand-prix']),
  article('n-order-of-merit', 'dartsnews',
    'World Grand Prix shakes up the PDC Order of Merit: Gian van Veen provisional No. 2 ahead of Luke Humphries, 2024 champion drops out of the top 32',
    dn('world-grand-prix-shakes-up-the-pdc-order-of-merit-gian-van-veen-provisional-no-2-ahead-of-luke-humphries-2024-champion-drops-out-of-the-top-32'),
    '2026-10-02T15:30:00+02:00', '2026-10-02T15:30:00+02:00', ['van-veen', 'humphries'], ['world-grand-prix']),
  article('n-webster-clayton', 'dartsnews',
    '“He needs to try and get himself in the Grand Slam” - Mark Webster puts Jonny Clayton under the cosh ahead of all-Welsh showdown',
    dn('he-needs-to-try-and-get-himself-in-the-grand-slam-mark-webster-puts-jonny-clayton-under-the-cosh-ahead-of-all-welsh-showdown'),
    '2026-10-02T14:00:00+02:00', '2026-10-02T14:00:00+02:00', ['clayton', 'price'], ['world-grand-prix', 'grand-slam']),
  article('n-talking-points', 'dartsnews',
    'World Grand Prix Talking Points | Is Gary Anderson’s lack of practice rhythm starting to hurt?, Luke Woodhouse fails to back up Littler win and Stagegate dominates',
    dn('world-grand-prix-talking-points-is-gary-andersons-lack-of-practice-rhythm-starting-to-hurt-luke-woodhouse-fails-to-back-up-littler-win-and-stagegate-dominates'),
    '2026-10-02T12:30:00+02:00', '2026-10-02T12:30:00+02:00', ['anderson', 'woodhouse', 'littler'], ['world-grand-prix']),
  article('n-od-german-gp', 'online-darts-news', '2026 German Darts Grand Prix draw & schedule',
    'https://onlinedarts.com/2026-german-darts-grand-prix-draw-schedule/', undefined, '2026-09-03T12:00:00+01:00', [],
    ['european-tour']),
  article('n-od-prize-money', 'online-darts-news',
    'Groundbreaking Prize Money Increases for 2026 as Darts Hits An All Time high',
    'https://onlinedarts.com/groundbreaking-prize-money-increases-for-2026-as-darts-hits-an-all-time-high/', undefined,
    '2026-03-01T12:00:00+00:00'),
  article('n-od-calendar', 'online-darts-news',
    'PDC Confirms 2026 Calendar With Historic Expansions Into Poland and Slovakia',
    'https://onlinedarts.com/pdc-confirms-2026-calendar/', undefined, '2026-02-01T12:00:00+00:00', [], ['european-tour']),
];

function post(
  id: string,
  sourceId: string,
  platform: SocialItem['platform'],
  handle: string,
  text: string,
  sortAt: string,
  attachId: string | undefined,
  players: string[] = [],
  competitions: string[] = [],
  url = '#',
): SocialItem {
  return {
    id,
    kind: 'social',
    sourceId,
    platform,
    handle,
    text: tidy(text),
    title: tidy(text),
    sortAt,
    attachId,
    players,
    competitions,
    url,
    sample: true,
  };
}

/** Sample posts. Each one points at a real item from the same source. */
export const social: SocialItem[] = [
  post('x-pdc-d4', 'pdc', 'X', '@OfficialPDC',
    'Big exits. Day Four at the World Grand Prix had everything. Highlights are up now.',
    '2026-10-02T08:10:00+01:00', 'v-wgp-d4', [], ['world-grand-prix']),
  post('x-dn-oom', 'dartsnews', 'X', '@DartsNewscom',
    'World Grand Prix shakes up the PDC Order of Merit: Gian van Veen is the provisional No. 2 ahead of Luke Humphries.',
    '2026-10-02T14:40:00+01:00', 'n-order-of-merit', ['van-veen', 'humphries'], ['world-grand-prix']),
  post('x-md-wgp', 'mission-darts', 'Instagram', '@missiondartspodcast',
    'New episode: Shock Name To Win The Darts World Grand Prix? Out now wherever you listen.',
    '2026-10-01T17:05:00+01:00', 'p-md-wgp', [], ['world-grand-prix']),
  post('x-sky-price', 'sky-sports-darts', 'Instagram', '@skysportsdarts',
    '“We can’t stop him.” Gerwyn Price reacts to beating Luke Littler.',
    '2026-09-29T12:20:00+01:00', 'v-sky-price', ['price', 'littler']),
  post('x-modus-really', 'modus-super-series', 'TikTok', '@modussuperseries', '‘Really?!’ #darts',
    '2026-09-30T18:05:00+01:00', 's-modus-really', [], ['modus-super-series']),
  post('x-wd-468', 'weekly-dartscast', 'X', '@WeeklyDartscast',
    'Episode #468 is live: Noa-Lynn van Leuven joins us, plus a World Series of Darts Finals review and a World Grand Prix preview.',
    '2026-09-25T22:10:00+01:00', 'p-wd-468', [], ['world-series', 'world-grand-prix']),
  post('x-ltd-bunting', 'love-the-darts', 'X', '@LoveTheDarts',
    'Stephen Bunting special: The Bullet talks all about his new book. Listen now.',
    '2026-09-25T11:45:00+01:00', 'p-ltd-bunting', ['bunting']),
  post('x-edgar-studio', 'edgar-tv-darts', 'Instagram', '@edgartvdarts',
    'I turned this office into a darts studio and coaching facility. Full tour on the channel.',
    '2026-09-24T17:10:00+01:00', 'v-edgar-studio'),
  post('x-tt-brooks', 'tops-and-tales', 'X', '@TopsAndTales',
    'Series finale. Bradley Brooks: “From world number 50-70 is like a different sport”.',
    '2026-08-31T07:00:00+01:00', 'p-tt-brooks'),
];

export const allItems: FeedItem[] = [...videos, ...shorts, ...podcasts, ...news, ...social];

export const itemById = new Map(allItems.map((item) => [item.id, item]));
