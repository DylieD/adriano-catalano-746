// All site copy lives here. Edit this file to change wording without touching the 3D code.

export const IG_URL = 'https://www.instagram.com/the_adrianoness746/';
export const IG_HANDLE = '@the_adrianoness746';
export const WA_URL = 'https://wa.me/27659852413';
export const WA_NUMBER = '+27 65 985 2413';
export const BUILDER_URL = 'https://www.instagram.com/dylanjonker_/';

export const PHOTO_BASE = 'https://catalano-chaos-ride.lovable.app/assets/';
export const PHOTOS = [
  'racing-3-4BhhsAn2.jpg', 'racing-1-D2GC00mZ.jpg', 'racing-2-BN8CV-Gq.jpg', 'racing-4-CNjzS9J0.jpg',
  'racing-5-DZ1wutJt.jpg', 'racing-6-DE1KELI-.jpg', 'racing-7-BUyjHTAs.jpg', 'racing-8-hnVqRbo1.jpg',
  'racing-9-CYGdjEeP.jpg', 'racing-10-ToBobHWm.jpg', 'racing-11-CKdAOk7W.jpg', 'racing-12-Dp0y4Oo4.jpg',
  'racing-13-Dbz9xSAQ.jpg',
];

// Plain-scroll version of the site (the "Classic site" button, and the fallback if WebGL is missing).
export const SECTIONS = [
  {
    id: 'rider', kicker: 'THE RIDER', title: 'ADHD IN MOTION', sub: 'ADRIANO MANCO CATALANO · BORN JULY 18, 1999',
    body: 'Stoked out on life. A lifetime on two wheels. Every lap, every whip, every scar is fuel. I ride to push limits and to make motocross bigger, louder and bolder. Shred everything.',
    chips: ['KTM 300SX', '27 YEARS', 'SOUTH AFRICAN BY NATURE', 'ITALIAN BY CULTURE', 'FREE RIDER', 'SUSPENSION TECH @ CYCLEWORX'],
  },
  {
    id: 'cycleworx', kicker: 'THE DAY JOB', title: 'SUSPENSION TECH AT CYCLEWORX', sub: 'BY DAY HE TUNES IT. BY WEEKEND HE TESTS IT.',
    body: 'When he is not on track, Adriano works as a suspension tech at CycleWorx. He knows exactly what a bike is doing underneath a rider, and it shows. In the game you can retune your own forks and shock with the T key.',
  },
  {
    id: 'results', kicker: '2025 HIGHLIGHTS', title: 'A YEAR OF DOMINATION', sub: '5× INLAND CHAMPION',
    list: [['1ST', 'MX1 Dragon NIMXC'], ['1ST', 'Inland Interprovincial'], ['1ST', 'Inland Club'], ['1ST', 'Two Nationals'], ['TOP 10', 'King of the Whip (3rd appearance)']],
  },
  {
    id: 'goals', kicker: '2026 GOALS', title: 'I DON\'T PLAN. I RIDE.', sub: 'AND SOMEHOW, IT ALWAYS LANDS.',
    list: [['01', 'Defend the Inland title'], ['02', 'Push harder on the national circuit'], ['03', 'Step into enduro'], ['04', 'Create content that hits as hard as I ride']],
    body: 'Every goal is a checkpoint, not a finish line. The real victory is in the ride itself.',
  },
  {
    id: 'partners', kicker: 'THE PARTNERS', title: 'BACKED BY DRAGON ENERGY', sub: 'THE BRANDS THAT BACK THE MADNESS',
    partners: [['DRAGON ENERGY', true], ['HOOLIGAN MX', false], ['FLOWVISION', false], ['STUX GLOVES', false]],
    body: 'Free rider now, with Dragon Energy in his corner. Previously raced for Zeemans Honda.',
  },
  {
    id: 'contact', kicker: 'FINISH LINE', title: 'LET\'S BUILD SOMETHING WILD', sub: 'PARTNERSHIPS · COLLABORATIONS · OPPORTUNITIES',
    body: 'I only really communicate through Instagram and WhatsApp. Fair warning: I\'m horrible with my phone.',
    links: [['INSTAGRAM ' + IG_HANDLE, IG_URL], ['WHATSAPP ' + WA_NUMBER, WA_URL]],
  },
];

// 3D billboards. x/z = world position, ry = turn (radians) so they face the approaching rider.
// Boards are double sided, so they read from both directions.
export const BOARDS = [
  {
    id: 'welcome', x: -30, z: -16, ry: 0.2, w: 22, h: 11, kicker: 'ADRIANO MANCO CATALANO', title: 'THE ITALIAN', title2: 'STALLION #746',
    sub: 'FREE RIDER · KTM 300SX · 5× INLAND CHAMPION', accent: '#ff2e2e', map: 'START',
  },
  {
    id: 'controls', x: 30, z: -16, ry: -0.2, w: 22, h: 15.5, kicker: 'HOW TO RIDE', title: 'RIDE ANYWHERE', accent: '#c8ff00',
    lines: [['W', 'THROTTLE (HOLD IT)'], ['A D', 'STEER'], ['S', 'BRAKE, THEN REVERSE'], ['SHIFT', 'CLUTCH KICK WHEELIE'], ['SPACE', 'WHIP IN THE AIR'], ['T', 'RETUNE SUSPENSION'], ['M', 'OPEN THE MAP']],
  },
  {
    id: 'rider', x: -150, z: -125, ry: 0.35, w: 24, h: 17, kicker: 'THE RIDER', title: 'ADHD IN MOTION', sub: 'BORN JULY 18, 1999', accent: '#ff2e2e', map: 'RIDER',
    lines: [['BIKE', 'KTM 300SX'], ['AGE', '27'], ['FROM', 'SOUTH AFRICA'], ['STATUS', 'FREE RIDER'], ['DAY JOB', 'SUSPENSION TECH, CYCLEWORX'], ['TITLES', '5× INLAND CHAMPION']],
  },
  {
    id: 'fuel', x: -110, z: -165, ry: 0.5, w: 18, h: 9, kicker: 'STOKED OUT ON LIFE', title: 'EVERY LAP. EVERY WHIP.', title2: 'EVERY SCAR IS FUEL.', accent: '#c8ff00',
  },
  {
    id: 'cycleworx', x: 150, z: -55, ry: -0.8, w: 22, h: 14, kicker: 'THE DAY JOB', title: 'SUSPENSION TECH', title2: 'AT CYCLEWORX', logo: '/logos/cworx.png', accent: '#ff6a00', map: 'CYCLEWORX',
    sub: 'BY DAY HE TUNES IT. BY WEEKEND HE TESTS IT.',
    lines: [['DAY', 'SUSPENSION TECH'], ['NIGHT', 'TESTS IT AT SPEED'], ['TRY IT', 'PRESS T TO RETUNE']],
  },
  {
    id: 'pit', x: -100, z: -72, ry: 0.55, w: 16, h: 8, kicker: 'PIT STOP', title: 'FOLLOW', title2: 'THE CHAOS', sub: 'PARK ON THE RING FOR 2 SECONDS', accent: '#e1306c',
    links: [['INSTAGRAM ' + IG_HANDLE, IG_URL]], map: 'PIT', mapX: -62, mapZ: -68,
  },
  {
    id: 'results', x: 150, z: -170, ry: -0.3, w: 25, h: 15.6, kicker: '2025 HIGHLIGHTS', title: 'A YEAR OF DOMINATION', sub: '5× INLAND CHAMPION', accent: '#c8ff00', map: 'RESULTS',
    lines: [['1ST', 'MX1 DRAGON NIMXC'], ['1ST', 'INLAND INTERPROVINCIAL'], ['1ST', 'INLAND CLUB'], ['1ST', 'TWO NATIONALS'], ['TOP 10', 'KING OF THE WHIP']],
  },
  {
    id: 'whip', x: 62, z: -205, ry: -0.35, w: 20, h: 11, kicker: 'KING OF THE WHIP', title: 'LAY IT DOWN', sub: 'LAND A WHIP OFF THIS RAMP FOR A SURPRISE', accent: '#ff2e2e', map: 'WHIP',
  },
  {
    id: 'goals', x: -150, z: -325, ry: 0.3, w: 25, h: 15.6, kicker: '2026 GOALS', title: 'I DON\'T PLAN. I RIDE.', sub: 'AND SOMEHOW, IT ALWAYS LANDS.', accent: '#ff2e2e', map: 'GOALS',
    lines: [['01', 'DEFEND THE INLAND TITLE'], ['02', 'PUSH THE NATIONAL CIRCUIT'], ['03', 'STEP INTO ENDURO'], ['04', 'CONTENT THAT HITS HARD']],
  },
  {
    id: 'dragon', x: 150, z: -352, ry: -0.3, w: 26, h: 14, kicker: 'MAIN SPONSOR', title: 'DRAGON', title2: 'ENERGY', logo: '/logos/dragon.png', logoOnly: true, sub: 'FUEL FOR THE CHAOS', accent: '#ed1c24', map: 'SPONSORS',
  },
  {
    id: 'partners', x: 100, z: -385, ry: -0.5, w: 21, h: 13.1, kicker: 'THE BRANDS THAT BACK THE MADNESS', title: 'PARTNERS', accent: '#c8ff00',
    lines: [['DRAGON ENERGY', 'MAIN SPONSOR'], ['HOOLIGAN MX', 'APPAREL'], ['FLOWVISION', 'GOGGLES'], ['STUX GLOVES', 'GLOVES'], ['PREVIOUSLY', 'ZEEMANS HONDA']],
  },
  {
    id: 'contact', x: 34, z: -455, ry: -0.2, w: 24, h: 12, kicker: 'FINISH LINE', title: 'LET\'S TALK', sub: 'PARTNERSHIPS · COLLABORATIONS · OPPORTUNITIES', accent: '#c8ff00', map: 'FINISH',
    lines: [['INSTAGRAM', '@THE_ADRIANONESS746'], ['WHATSAPP', '+27 65 985 2413']],
    links: [['INSTAGRAM ' + IG_HANDLE, IG_URL], ['WHATSAPP ' + WA_NUMBER, WA_URL]],
  },
];
