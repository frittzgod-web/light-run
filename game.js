/* Redemption City: Light Run — first playable (Canvas 2D, no dependencies) */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
let W = 390, H = 844, DPR = 1;
const params = new URLSearchParams(location.search);
const TIME_SCALE = Math.max(1, Math.min(8, +params.get('speed') || 1));

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resize); resize();

const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function rr(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------------- Sound ---------------- */
let soundOn = localStorage.getItem('lr_sound') !== 'off';
let actx = null;
function ensureAudio() { if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (actx && actx.state === 'suspended') actx.resume(); }
function beep(f, d = 0.08, type = 'sine', v = 0.12, delay = 0) {
  if (!soundOn || !actx) return;
  const t = actx.currentTime + delay, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
}
const sfx = {
  orb: () => beep(880 + Math.random() * 200, 0.07, 'triangle', 0.08),
  jump: () => beep(420, 0.1, 'square', 0.05),
  hit: () => { beep(140, 0.25, 'sawtooth', 0.12); beep(90, 0.3, 'square', 0.06, 0.05); },
  good: () => [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'triangle', 0.1, i * 0.09)),
  soft: () => [392, 330].forEach((f, i) => beep(f, 0.2, 'sine', 0.08, i * 0.12)),
  stop: () => [660, 880].forEach((f, i) => beep(f, 0.12, 'square', 0.06, i * 0.1)),
  tap: () => beep(600, 0.04, 'triangle', 0.06),
};
const sndBtn = $('#snd');
function paintSnd() { sndBtn.textContent = soundOn ? '🔊' : '🔇'; }
sndBtn.addEventListener('click', e => { e.stopPropagation(); ensureAudio(); soundOn = !soundOn; localStorage.setItem('lr_sound', soundOn ? 'on' : 'off'); paintSnd(); sfx.tap(); });
paintSnd();

/* ---------------- Content ---------------- */
const VIRTUES = {
  Compassion: '💗', Love: '❤️', Humility: '🙇', Holiness: '🕊️', Selflessness: '🤲', Honesty: '⚖️', Forgiveness: '🤝'
};
const V = {
  eph432: ['And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ\'s sake hath forgiven you.', 'Ephesians 4:32'],
  cor13: ['Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up, doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil.', '1 Corinthians 13:4-5'],
  phil23: ['Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves. Look not every man on his own things, but every man also on the things of others.', 'Philippians 2:3-4'],
  pet116: ['Because it is written, Be ye holy; for I am holy.', '1 Peter 1:16'],
  mic68: ['He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?', 'Micah 6:8'],
  gal62: ['Bear ye one another\'s burdens, and so fulfil the law of Christ.', 'Galatians 6:2'],
  heb1214: ['Follow peace with all men, and holiness, without which no man shall see the Lord.', 'Hebrews 12:14'],
  mat516: ['Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.', 'Matthew 5:16'],
  mat2540: ['Verily I say unto you, Inasmuch as ye have done it unto one of the least of these my brethren, ye have done it unto me.', 'Matthew 25:40'],
  jn318: ['My little children, let us not love in word, neither in tongue; but in deed and in truth.', '1 John 3:18'],
  luk1610: ['He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much.', 'Luke 16:10'],
  pro1222: ['Lying lips are abomination to the LORD: but they that deal truly are his delight.', 'Proverbs 12:22'],
  pro151: ['A soft answer turneth away wrath: but grievous words stir up anger.', 'Proverbs 15:1'],
  ps1013: ['I will set no wicked thing before mine eyes.', 'Psalm 101:3'],
  mat634: ['But when thou doest alms, let not thy left hand know what thy right hand doeth: that thine alms may be in secret: and thy Father which seeth in secret himself shall reward thee openly.', 'Matthew 6:3-4'],
  act2035: ['It is more blessed to give than to receive.', 'Acts 20:35'],
  pro1917: ['He that hath pity upon the poor lendeth unto the LORD; and that which he hath given will he pay him again.', 'Proverbs 19:17'],
  luk1411: ['For whosoever exalteth himself shall be abased; and he that humbleth himself shall be exalted.', 'Luke 14:11'],
  rom1210: ['Be kindly affectioned one to another with brotherly love; in honour preferring one another.', 'Romans 12:10'],
  luk1033: ['But a certain Samaritan, as he journeyed, came where he was: and when he saw him, he had compassion on him.', 'Luke 10:33'],
  pro327: ['Withhold not good from them to whom it is due, when it is in the power of thine hand to do it.', 'Proverbs 3:27'],
  jn19: ['If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.', '1 John 1:9'],
  lam322: ['It is of the LORD\'s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.', 'Lamentations 3:22-23'],
  gal69: ['And let us not be weary in well doing: for in due season we shall reap, if we faint not.', 'Galatians 6:9'],
  eph28: ['For by grace are ye saved through faith; and that not of yourselves: it is the gift of God.', 'Ephesians 2:8'],
  ps1221: ['I was glad when they said unto me, Let us go into the house of the LORD.', 'Psalm 122:1'],
};

const STOPS = ['Ojota', 'Berger', 'Kara (Long Bridge)', 'Warewa', 'Arepo', 'Magboro', 'Ibafo', 'Asese', 'Mowe', 'Redemption City'];
const KM = ['LAGOS', 'LAGOS', 'LAGOS–OGUN BORDER', 'OGUN STATE', 'OGUN STATE', 'OGUN STATE', 'OGUN STATE', 'OGUN STATE', 'OGUN STATE', 'KM 46'];
const FIRST_STOP = 1900, GAP = 2700;
const stopDist = i => FIRST_STOP + i * GAP;
const RUN_LEN = stopDist(STOPS.length - 1);

const QUIZ = [
  ['Who built the ark?', ['Noah', 'Moses', 'Abraham', 'Elijah'], 0],
  ['How many disciples did Jesus choose?', ['7', '10', '12', '40'], 2],
  ['Where was Jesus born?', ['Nazareth', 'Bethlehem', 'Jerusalem', 'Egypt'], 1],
  ['Who defeated Goliath with a sling and a stone?', ['Saul', 'Samson', 'David', 'Jonathan'], 2],
  ['What is the first book of the Bible?', ['Exodus', 'Genesis', 'Matthew', 'Psalms'], 1],
  ['Who was swallowed by a great fish?', ['Jonah', 'Peter', 'Paul', 'Daniel'], 0],
  ['At the wedding in Cana, Jesus turned water into…', ['Oil', 'Milk', 'Wine', 'Honey'], 2],
  ['Who denied Jesus three times?', ['Judas', 'Thomas', 'John', 'Peter'], 3],
  ['"The LORD is my shepherd; I shall not…"', ['fear', 'want', 'fall', 'run'], 1],
  ['Who was thrown into the den of lions?', ['Daniel', 'Joseph', 'Gideon', 'Elisha'], 0],
  ['How many loaves fed the 5,000?', ['Two', 'Five', 'Seven', 'Twelve'], 1],
  ['Which parable is about a man who helped a wounded stranger?', ['The Prodigal Son', 'The Sower', 'The Good Samaritan', 'The Lost Sheep'], 2],
  ['Who led the Israelites out of Egypt?', ['Joshua', 'Aaron', 'Moses', 'Samuel'], 2],
  ['Which of these is a fruit of the Spirit (Galatians 5:22-23)?', ['Pride', 'Gentleness', 'Envy', 'Strife'], 1],
  ['What is the last book of the Bible?', ['Jude', 'Acts', 'Revelation', 'Malachi'], 2],
  ['How many days was Lazarus in the tomb before Jesus raised him?', ['One', 'Two', 'Three', 'Four'], 3],
  ['Who was the mother of Jesus?', ['Martha', 'Mary', 'Elizabeth', 'Ruth'], 1],
  ['Who was sold into Egypt by his brothers?', ['Joseph', 'Benjamin', 'Isaac', 'Jacob'], 0],
];

const RUN_MORALS = [
  { after: 1, name: 'Mrs. Adeyemi', av: '🚗', virtue: 'Compassion',
    say: 'Near Kara, a woman\'s car has broken down in the heat. She is trying to push it to the shoulder all alone. "Please, abeg, can someone help me?"',
    choices: [
      { t: 'Stop and help her push the car to safety', good: true, out: 'You push together until the car is safely off the road. "God bless you, my child!" It cost you some time, but your lantern now burns with a light that won\'t fade.', verse: V.luk1033 },
      { t: 'Keep running. I\'m in a hurry', good: false, out: 'You run on, but her voice stays in your mind. Being in a hurry happens to all of us. Next time someone needs you, you can be ready.', verse: V.pro327 },
    ] },
  { after: 4, name: 'Mama Iyabo', av: '🍊', virtue: 'Selflessness',
    say: 'At Arepo, an old mama\'s basket of oranges has tipped over. Oranges are rolling everywhere and she can\'t bend down easily.',
    choices: [
      { t: 'Stop and gather all her oranges', good: true, out: 'You crouch down and gather every orange. She laughs and presses one into your hand. "Thank you, my pikin. Go well!"', verse: V.gal62 },
      { t: 'Grab two oranges for yourself. She won\'t notice', good: false, virtue: 'Honesty', out: 'The oranges feel heavy in your pocket. It\'s not too late to make it right.', verse: V.pro1222,
        retry: { label: 'Go back, return them and help her', virtue: 'Honesty', out: 'You return the oranges and help her pack the basket. She smiles: "Honesty is beautiful, my child." That\'s grace: a fresh start.', verse: V.jn19 } },
      { t: 'Run past. Someone else will help', good: false, out: 'You keep going. Each day brings new chances to do good, and there will be another one soon.', verse: V.gal69 },
    ] },
  { after: 7, name: 'Kunle, the pure-water boy', av: '💧', virtue: 'Honesty',
    say: 'Near Asese, a young boy selling pure water drops a ₦500 note. The wind blows it right to your feet. He hasn\'t noticed.',
    choices: [
      { t: '"Hey! You dropped this!" Return it to him', good: true, out: 'His eyes go wide. "Ah, thank you! That was all my sales for today!" Small acts of honesty are never small.', verse: V.luk1610 },
      { t: 'Pick it up and keep it. Finders keepers', good: false, out: 'The note feels wrong in your hand. You know whose money it is.', verse: V.pro1222,
        retry: { label: 'Run back and give it to him', out: 'You chase him down and hand it back. His smile is worth far more than ₦500.', verse: V.jn19 } },
    ] },
];

const ENCOUNTERS = [
  { id: 'child', name: 'Little Tolu', av: '👧', virtue: 'Compassion', x: 300, y: 1360, zone: 'Main Gate',
    say: 'A little girl is crying beside the gate. "I can\'t find my mummy… she was wearing a blue gele…"',
    choices: [
      { t: 'Kneel down, comfort her and walk her to the Help Desk', good: true, out: 'At the Help Desk they announce her name. Minutes later her mummy rushes in and hugs her tight. "God bless you, my dear!"', verse: V.mat2540 },
      { t: 'Tell her to wait there. Someone will come', good: false, out: 'You walk on, but her crying stays with you. It\'s okay. It\'s not too late to turn around.', verse: V.pro327,
        retry: { label: 'Go back and help her find her mum', out: 'You go back, take her small hand and walk her to the Help Desk. Mummy is found! Turning back is a brave kind of love.', verse: V.mat2540 } },
    ] },
  { id: 'bump', name: 'Jide', av: '🧑🏾', virtue: 'Forgiveness', x: 445, y: 1180, zone: 'Main Road',
    say: 'A teen with headphones bumps into you hard, spills your Zobo all over your white shirt and snaps: "Can\'t you see where you\'re going?!"',
    choices: [
      { t: 'Take a deep breath: "No wahala. Are you okay?"', good: true, out: 'He freezes, then pulls off his headphones. "Sorry, I was rushing… my bad." You both laugh about the Zobo stain.', verse: V.eph432 },
      { t: 'Shout back even louder', good: false, out: 'Voices rise and people stare. Your heart feels heavy, not lighter.', verse: V.pro151,
        retry: { label: 'Calm down, apologise and make peace', out: '"Sorry I shouted. Let\'s start again." He nods and shakes your hand. Peace feels so much better.', verse: V.eph432 } },
      { t: 'Say nothing, but keep the grudge all day', good: false, out: 'He walks off, but the anger walks with you. Unforgiveness is a heavy load to carry around camp.', verse: V.eph432,
        retry: { label: 'Let it go and forgive him in your heart', out: 'You whisper a prayer and let it go. Your shoulders feel lighter already.', verse: V.lam322 } },
    ] },
  { id: 'hungry', name: 'Emeka', av: '🧑🏿', virtue: 'Love', x: 700, y: 1140, zone: 'Food Court',
    say: 'A boy sits alone near the food stalls. "I spent my last money on transport to camp. I haven\'t eaten since morning." You just bought jollof rice and a meat pie.',
    choices: [
      { t: 'Sit with him and share your jollof', good: true, out: 'You share the plate and talk like old friends. Food tastes better when it\'s shared.', verse: V.cor13 },
      { t: 'Give him the meat pie, keep the rice', good: true, light: 8, out: 'His face lights up. "Thank you, God bless you!" Every bit of love counts.', verse: V.jn318 },
      { t: '"Sorry o, I\'m hungry too"', good: false, out: 'You eat alone, but somehow the jollof doesn\'t taste as sweet.', verse: V.jn318,
        retry: { label: 'Go back and share with him', out: 'You go back with your plate. "Come, let\'s chop together." His smile says everything.', verse: V.cor13 } },
    ] },
  { id: 'change', name: 'Mama Nkechi (seller)', av: '👩🏾‍🍳', virtue: 'Honesty', x: 600, y: 965, zone: 'Food Court',
    say: 'The seller is very busy. You paid with ₦500, but she hands you change for ₦1,000. Nobody else noticed.',
    choices: [
      { t: '"Ma, you gave me too much." Return the extra', good: true, out: '"Ah! Thank you, my dear. That would have been my loss today." She adds a free puff-puff. 😄', verse: V.luk1610 },
      { t: 'Keep it. She\'s busy, she won\'t notice', good: false, out: 'You walk away with the extra money, but your conscience knocks gently.', verse: V.pro1222,
        retry: { label: 'Go back and return the money', out: 'You go back and return it. She hugs you. "Children like you give me hope!"', verse: V.jn19 } },
    ] },
  { id: 'load', name: 'Mama Bisi', av: '👵🏾', virtue: 'Selflessness', x: 220, y: 965, zone: 'Accommodation',
    say: 'An elderly woman is struggling with a heavy bag of foodstuff and a sleeping mat, heading to the hostel.',
    choices: [
      { t: '"Mummy, let me carry it for you."', good: true, out: 'It\'s heavy, but you carry it all the way to her room. She prays for you all the way. ❤️', verse: V.gal62 },
      { t: 'Hope someone else helps her', good: false, out: 'You walk past. She stops to rest, wiping her face. There\'s still time.', verse: V.phil23,
        retry: { label: 'Run over and take the bag', out: 'You run back and lift the bag. "Ah, thank you!" Putting others first is what love looks like.', verse: V.gal62 } },
    ] },
  { id: 'phone', name: 'Dayo (your friend)', av: '📱', virtue: 'Holiness', x: 110, y: 1180, zone: 'Accommodation',
    say: '"Service is long jare. Let\'s stay in the hostel and watch this video. It\'s a bit… you know. Nobody will know."',
    choices: [
      { t: '"No o! I\'m going for service. Come with me!"', good: true, out: 'Dayo hesitates… then puts the phone away. "Okay, let\'s go." Your choice helped a friend choose well too.', verse: V.pet116 },
      { t: '"Just a few minutes, then we go"', good: false, out: 'A few minutes becomes more… and what you saw doesn\'t sit right. God\'s mercy is new every morning, though.', verse: V.ps1013,
        retry: { label: 'Close the video and invite Dayo to service', out: '"Let\'s close this and go." You both head out. Choosing God\'s presence is always the better deal.', verse: V.ps1221 } },
    ] },
  { id: 'boast', name: 'Ada', av: '👩🏾', virtue: 'Humility', x: 150, y: 520, zone: 'Prayer Ground',
    say: '"I heard you\'ve been helping people all over camp! You should post it with a selfie so everyone knows how good you are!"',
    choices: [
      { t: '"It\'s nothing. God gets the glory. Let\'s go and pray."', good: true, out: 'Ada smiles and joins you at the prayer ground. Quiet goodness shines the brightest.', verse: V.mat634 },
      { t: 'Post it: "Helping people today 😇 #Blessed #GoodPerson"', good: false, out: 'The likes come in, but the joy feels a bit empty. Good deeds aren\'t for applause.', verse: V.mat634,
        retry: { label: 'Delete the post and quietly join the prayer', out: 'You delete it and kneel to pray. Walking humbly feels like walking with God.', verse: V.mic68 } },
    ] },
  { id: 'water', name: 'Baba Femi', av: '👴🏿', virtue: 'Selflessness', x: 285, y: 440, zone: 'Prayer Ground',
    say: 'An elderly man sits in the sun, fanning himself. "My child, the water queue is so long, and my legs are weak…" You have one cold bottle of water.',
    choices: [
      { t: 'Give him your water', good: true, out: 'He drinks gratefully. "May you never lack." You feel thirsty, but strangely full.', verse: V.act2035 },
      { t: 'Drink it yourself. You\'re thirsty too', good: false, out: 'The water is cold, but your heart isn\'t at peace. The queue is right there…', verse: V.phil23,
        retry: { label: 'Join the queue and bring him a bottle', out: 'You queue for ten minutes and bring him water. "God will reward you, my child."', verse: V.pro1917 } },
    ] },
  { id: 'seat', name: 'Elderly mother', av: '👵🏽', virtue: 'Humility', x: 380, y: 335, zone: 'Main Auditorium', door: true,
    say: 'Inside the auditorium you grab a perfect front-row seat. Then an elderly woman with a walking stick looks around for somewhere to sit.',
    choices: [
      { t: 'Stand up: "Mama, please sit here."', good: true, out: 'She sits with a sigh of relief and squeezes your hand. An usher finds you another seat a few rows back. It still feels like the best seat in the house.', verse: V.luk1411 },
      { t: 'Keep the seat. You got here first', good: false, out: 'She keeps standing, leaning on her stick. The seat suddenly feels less comfortable.', verse: V.rom1210,
        retry: { label: 'Stand up and offer her your seat', out: 'You stand and guide her to the seat. Honour given away always comes back as joy.', verse: V.luk1411 } },
    ] },
];
const DOOR_NEED = 5; // non-door encounters needed before entering auditorium

const CARRY_HOME = {
  Compassion: 'Notice someone who looks lonely or lost this week, and check on them.',
  Love: 'Share something you have (snacks, time, airtime) with someone who has less.',
  Humility: 'Do one kind thing in secret. Tell no one, post nothing.',
  Holiness: 'Guard your eyes: skip one show, song or site you know isn\'t right.',
  Selflessness: 'Help at home without being asked: dishes, sweeping or errands.',
  Honesty: 'Tell the truth even when a small lie would be easier.',
  Forgiveness: 'Text or talk to someone who hurt you, and let it go.',
};

/* ---------------- Global state ---------------- */
const S = {
  screen: 'title', name: 'Pilgrim', score: 0, lantern: 50, floor: 15,
  orbs: 0, hits: 0, quizRight: 0, quizTotal: 0, helpedRun: 0,
  virtues: {}, log: [], paused: false, t: 0,
};
function resetState() {
  Object.assign(S, { score: 0, lantern: 50, floor: 15, orbs: 0, hits: 0, quizRight: 0, quizTotal: 0, helpedRun: 0, virtues: {}, log: [], paused: false });
  Object.keys(VIRTUES).forEach(k => S.virtues[k] = 0);
}
resetState();
function addLantern(d) { S.lantern = clamp(S.lantern + d, S.floor, 100); }

/* ---------------- UI helpers ---------------- */
function show(id) { $('#' + id).classList.add('show'); }
function hide(id) { $('#' + id).classList.remove('show'); }
let toastT = 0;
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
document.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => { sfx.tap(); hide(b.dataset.close); }));
function verseHTML(v) { return `<div class="verse">“${esc(v[0])}”<b>${esc(v[1])} (KJV)</b></div>`; }

function showHigh() {
  const hs = JSON.parse(localStorage.getItem('lr_high') || 'null');
  $('#hiscore').textContent = hs ? `🏆 Best on this phone: ${hs.score} by ${hs.name}` : '';
}
$('#pname').value = localStorage.getItem('lr_name') || '';
showHigh();
$('#btnHow').addEventListener('click', () => { ensureAudio(); sfx.tap(); show('howto'); });
$('#btnStart').addEventListener('click', () => {
  ensureAudio(); sfx.good();
  S.name = ($('#pname').value.trim() || 'Pilgrim').slice(0, 16);
  localStorage.setItem('lr_name', S.name);
  hide('title'); resetState(); startRun();
});

/* ---------------- Dialogue (shared by run morals and camp) ---------------- */
function openDialog(enc, onDone) {
  S.paused = true;
  const body = $('#dialogBody');
  const head = `<div class="who"><div class="av">${enc.av}</div><div><div class="nm">${esc(enc.name)}</div><div class="vt">${enc.zone ? esc(enc.zone) : 'On the expressway'}</div></div></div>`;
  body.innerHTML = head + `<div class="say">${esc(enc.say)}</div>` +
    enc.choices.map((c, i) => `<button class="btn opt" data-i="${i}">${esc(c.t)}</button>`).join('');
  show('dialog');
  body.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => choose(enc.choices[+b.dataset.i])));
  body.scrollTop = 0;

  function choose(c) {
    const chips = [];
    const runMoral = !enc.zone;
    if (c.good) {
      const vk = c.virtue || enc.virtue; S.virtues[vk]++;
      const light = c.light || 12;
      if (runMoral) { S.floor = Math.min(60, S.floor + 8); S.score = Math.max(0, S.score - 40); S.helpedRun++; chips.push(`<span class="chip dim">⏱ −40 (time)</span>`, `<span class="chip">🏮 Lasting light +8</span>`); }
      else { S.score += 100; chips.push(`<span class="chip">✨ +100</span>`); }
      addLantern(light); chips.unshift(`<span class="chip">${VIRTUES[vk]} +1 ${vk}</span>`, `<span class="chip">🏮 +${light}</span>`);
      sfx.good();
    } else {
      addLantern(-6); chips.push(`<span class="chip dim">🏮 flickers −6</span>`); sfx.soft();
    }
    S.log.push({ who: enc.name, choice: c.t, good: c.good });
    outcome(c, chips, c.good);
  }
  function outcome(c, chips, good) {
    body.innerHTML = head + `<div class="say">${esc(c.out)}</div><div class="chips">${chips.join('')}</div>` + verseHTML(c.verse) +
      (!good ? `<p class="small" style="margin:4px 0">${c.retry ? 'Grace means you can still make it right. 💛' : 'God\'s grace is bigger than our mistakes. 💛'}</p>` : '') +
      (c.retry ? `<button class="btn green" id="dRetry">↩ ${esc(c.retry.label)}</button>` : '') +
      `<button class="btn ${c.retry ? 'ghost' : 'primary'}" id="dCont">Continue</button>`;
    body.scrollTop = 0;
    $('#dCont').addEventListener('click', finish);
    if (c.retry) $('#dRetry').addEventListener('click', () => {
      const vk = c.retry.virtue || enc.virtue; S.virtues[vk]++; addLantern(8); S.score += 50;
      if (!enc.zone) { S.floor = Math.min(60, S.floor + 4); S.helpedRun++; }
      S.log.push({ who: enc.name, choice: c.retry.label, good: true, retry: true });
      sfx.good();
      outcome({ out: c.retry.out, verse: c.retry.verse }, [`<span class="chip">${VIRTUES[vk]} +1 ${vk}</span>`, `<span class="chip">🏮 +8</span>`, `<span class="chip">✨ +50</span>`], true);
    });
  }
  function finish() { sfx.tap(); hide('dialog'); S.paused = false; onDone && onDone(); }
}

/* ---------------- Input ---------------- */
const keys = {};
let ptr = null;
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (S.paused) return;
  if (S.screen === 'run') {
    if (['ArrowLeft', 'a', 'A'].includes(e.key)) runMove(-1);
    if (['ArrowRight', 'd', 'D'].includes(e.key)) runMove(1);
    if (['ArrowUp', 'w', 'W', ' '].includes(e.key)) { runJump(); e.preventDefault(); }
  }
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
cv.addEventListener('pointerdown', e => {
  ensureAudio();
  ptr = { x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, t: performance.now(), done: false };
  if (S.screen === 'camp' && !S.paused) campTarget(e.clientX, e.clientY);
});
cv.addEventListener('pointermove', e => {
  if (!ptr) return; ptr.x = e.clientX; ptr.y = e.clientY;
  if (S.paused) return;
  if (S.screen === 'run' && !ptr.done) {
    const dx = ptr.x - ptr.x0, dy = ptr.y - ptr.y0;
    if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) { runMove(Math.sign(dx)); ptr.done = true; }
    else if (dy < -28 && Math.abs(dy) > Math.abs(dx)) { runJump(); ptr.done = true; }
  }
  if (S.screen === 'camp') campTarget(e.clientX, e.clientY);
});
cv.addEventListener('pointerup', () => {
  if (ptr && S.screen === 'run' && !S.paused && !ptr.done && performance.now() - ptr.t < 350) runJump();
  ptr = null;
});

/* =========================================================
   PART 1 — EXPRESSWAY RUN
   ========================================================= */
let R = null;
function startRun() {
  S.screen = 'run';
  R = { dist: 0, speed: 260, lane: 1, px: 0, jumpT: 0, inv: 0, objs: [], nextRow: 250, stopIdx: 0, moralIdx: 0, shake: 0,
    scen: [], scenNext: 0, sparks: [], quizBag: shuffle(QUIZ) };
  R.px = laneX(1);
  toast('Swipe ⬅️ ➡️ to change lane · Swipe ⬆️ or tap to jump', 3200);
}
function roadW() { return Math.min(W * 0.76, 360); }
function laneW() { return roadW() / 3; }
function laneX(l) { return W / 2 + (l - 1) * laneW(); }
function playerY() { return H * 0.76; }
function runMove(d) { const n = clamp(R.lane + d, 0, 2); if (n !== R.lane) { R.lane = n; sfx.tap(); } }
function runJump() { if (R.jumpT <= 0) { R.jumpT = 0.62; sfx.jump(); } }

const OBS = {
  pothole: { h: 40, jump: true, rel: 1 },
  cone: { h: 34, jump: true, rel: 1 },
  danfo: { h: 120, jump: false, rel: 0.55 },
  okada: { h: 64, jump: false, rel: 0.7 },
  hawker: { h: 50, jump: false, rel: 1 },
};
function spawnRow() {
  const st = R.stopIdx;
  const pool = st < 2 ? ['pothole', 'cone', 'pothole', 'danfo'] : st < 5 ? ['pothole', 'cone', 'danfo', 'okada', 'hawker'] : ['pothole', 'cone', 'danfo', 'okada', 'okada', 'hawker', 'danfo'];
  const n = st < 2 ? 1 : (Math.random() < 0.35 + st * 0.05 ? 2 : 1);
  const lanes = shuffle([0, 1, 2]);
  const y0 = -160;
  for (let i = 0; i < n; i++) {
    const type = pick(pool);
    R.objs.push({ type, lane: lanes[i], y: y0, h: OBS[type].h, hit: false, wob: Math.random() * 6 });
  }
  // orbs in the free lane (or over a jumpable obstacle)
  const free = lanes[n];
  const cnt = 3 + Math.floor(Math.random() * 3);
  for (let k = 0; k < cnt; k++) R.objs.push({ type: 'orb', lane: free, y: y0 - k * 52, h: 24, got: false });
  if (Math.random() < 0.3) { const l = lanes[0]; if (OBS[R.objs[R.objs.length - cnt - n].type].jump) R.objs.push({ type: 'orb', lane: l, y: y0 - 70, h: 24, got: false, high: true }); }
}
function spawnScenery(y) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const kinds = ['palm', 'palm', 'house', 'billboard', 'palm', 'church'];
  R.scen.push({ kind: pick(kinds), side, y, c: pick(['#e85d3f', '#2f7dd1', '#f2b632', '#8e44ad', '#16a085', '#d35400']), txt: pick(['MTN', 'GLO', 'INDOMIE', 'JESUS IS LORD', 'HOLY GHOST SERVICE', 'PEAK MILK', 'GOD DEY']) });
}

function updateRun(dt) {
  const target = STOPS.length - 1;
  R.speed = 270 + R.stopIdx * 30 + Math.min(40, (R.dist % GAP) / GAP * 40);
  const move = R.speed * dt;
  R.dist += move;
  R.px += (laneX(R.lane) - R.px) * Math.min(1, dt * 14);
  if (R.jumpT > 0) R.jumpT -= dt;
  if (R.inv > 0) R.inv -= dt;
  if (R.shake > 0) R.shake -= dt;

  const nextStop = stopDist(R.stopIdx);
  const moral = RUN_MORALS[R.moralIdx];
  const moralD = moral ? stopDist(moral.after) + GAP / 2 : Infinity;
  const quietZone = (nextStop - R.dist < 650 && nextStop - R.dist > -100) || (moralD - R.dist < 550 && moralD - R.dist > -100);

  // spawn rows
  R.nextRow -= move;
  if (R.nextRow <= 0) {
    if (!quietZone && R.dist < RUN_LEN - 500) spawnRow();
    R.nextRow = Math.max(250, 470 - R.stopIdx * 24) + rand(0, 90);
  }
  // scenery
  R.scenNext -= move;
  if (R.scenNext <= 0) { spawnScenery(-120); R.scenNext = rand(70, 160); }
  R.scen.forEach(s => s.y += move);
  R.scen = R.scen.filter(s => s.y < H + 140);

  // objects
  const py = playerY(), jumping = R.jumpT > 0;
  for (const o of R.objs) {
    o.y += move * (o.type === 'orb' ? 1 : OBS[o.type].rel);
    const ox = laneX(o.lane);
    const near = Math.abs(ox - R.px) < laneW() * 0.55;
    if (o.type === 'orb') {
      if (!o.got && near && Math.abs(o.y - py) < 30 && (!o.high || jumping)) {
        o.got = true; S.orbs++; S.score += 10; addLantern(1.2); sfx.orb();
        for (let i = 0; i < 6; i++) R.sparks.push({ x: ox, y: o.y, vx: rand(-80, 80), vy: rand(-120, 20), t: 0.5 });
      }
    } else if (!o.hit && near && o.y + o.h / 2 > py - 18 && o.y - o.h / 2 < py + 18) {
      if (!(OBS[o.type].jump && jumping) && R.inv <= 0) {
        o.hit = true; S.hits++; S.score = Math.max(0, S.score - 20); addLantern(-7); R.inv = 1.1; R.shake = 0.3; sfx.hit();
        toast(pick(['Ouch! Pothole wahala 😅', 'Watch out, pilgrim!', 'Your lantern flickered!', 'Eyes on the road!']), 1100);
      }
    }
  }
  R.objs = R.objs.filter(o => o.y < H + 160 && !(o.type === 'orb' && o.got));
  R.sparks.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt + move * 0.5; p.t -= dt; });
  R.sparks = R.sparks.filter(p => p.t > 0);

  // moral moment
  if (moral && R.dist >= moralD) {
    R.moralIdx++;
    R.objs = R.objs.filter(o => o.y < py - 200);
    openDialog(moral, () => { R.inv = 1.2; });
    return;
  }
  // checkpoint
  if (R.dist >= nextStop) {
    const idx = R.stopIdx; R.stopIdx++;
    R.objs = R.objs.filter(o => o.y < py - 250);
    sfx.stop();
    if (idx >= target) arriveGate(); else stopQuiz(idx);
  }
}

function stopQuiz(idx) {
  S.paused = true;
  const q = R.quizBag[idx % R.quizBag.length];
  const order = shuffle(q[1].map((t, i) => ({ t, ok: i === q[2] })));
  const m = $('#modalBody');
  m.innerHTML = `<div class="banner"><div class="km">BUS STOP ${idx + 1} OF ${STOPS.length - 1} · ${KM[idx]}</div><div class="name">${esc(STOPS[idx].toUpperCase())}</div></div>
    <div class="small" style="text-align:center;margin-bottom:6px">Conductor dey shout: “${esc(STOPS[idx + 1] || '')}! ${esc(STOPS[idx + 1] || '')}! Enter with your change!” 🚌</div>
    <div class="q">📖 ${esc(q[0])}</div>
    ${order.map((o, i) => `<button class="btn opt" data-i="${i}">${esc(o.t)}</button>`).join('')}
    <div class="fb" id="fb"></div><div id="qcont"></div>`;
  show('modal');
  m.scrollTop = 0;
  const btns = m.querySelectorAll('[data-i]');
  btns.forEach(b => b.addEventListener('click', () => {
    const ok = order[+b.dataset.i].ok; S.quizTotal++;
    btns.forEach((bb, i) => { bb.disabled = true; if (order[i].ok) bb.classList.add('right'); });
    if (ok) { S.quizRight++; S.score += 50; addLantern(5); sfx.good(); $('#fb').innerHTML = '✅ <b>Correct!</b> +50 light, lantern +5'; }
    else { b.classList.add('wrong'); sfx.soft(); $('#fb').innerHTML = '💛 Not quite, but now you know! Keep going.'; }
    $('#qcont').innerHTML = `<button class="btn primary" id="qgo">Continue to ${esc(STOPS[idx + 1])} ▶</button>`;
    $('#qgo').addEventListener('click', () => { sfx.tap(); hide('modal'); S.paused = false; R.inv = 1; });
  }));
}

function arriveGate() {
  S.paused = true;
  const m = $('#modalBody');
  m.innerHTML = `<div class="banner"><div class="km">KM 46 · LAGOS–IBADAN EXPRESSWAY</div><div class="name">REDEMPTION CITY</div></div>
    <h2 style="text-align:center">🎉 You made it, ${esc(S.name)}!</h2>
    <p>Part 1 complete. Here's your journey so far:</p>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} questions</span><span class="chip">🤲 ${S.helpedRun} people helped</span><span class="chip dim">💥 ${S.hits} bumps</span></div>
    <p>Lantern: <b>${Math.round(S.lantern)}%</b> · Score: <b>${S.score}</b></p>
    <div class="meter"><i style="width:${S.lantern}%"></i></div>
    <p>Now step inside the camp. Pilgrims need a hand on the way to the <b>Main Auditorium</b>. Follow the golden arrow ✨ and talk to anyone with a ❗.</p>
    <button class="btn primary" id="gogo">Enter the camp ⛺</button>`;
  show('modal'); m.scrollTop = 0;
  $('#gogo').addEventListener('click', () => { sfx.good(); hide('modal'); startCamp(); });
}

/* ---- Run drawing ---- */
function drawPalm(x, y, s = 1) {
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x + 6, y + 6, 18 * s, 10 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#2e8b3d';
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 10 * s, y + Math.sin(a) * 10 * s, 13 * s, 5 * s, a, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#7a4b1e'; ctx.beginPath(); ctx.arc(x, y, 4 * s, 0, 7); ctx.fill();
}
function drawPerson(x, y, body, skin = '#6b3f1f', s = 1, extra) {
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(x, y + 12 * s, 11 * s, 5 * s, 0, 0, 7); ctx.fill();
  ctx.fillStyle = body; rr(x - 10 * s, y - 6 * s, 20 * s, 20 * s, 7 * s); ctx.fill();
  ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(x, y - 11 * s, 7.5 * s, 0, 7); ctx.fill();
  if (extra) extra();
}
function drawRun() {
  const rw = roadW(), x0 = W / 2 - rw / 2, py = playerY();
  ctx.save();
  if (R.shake > 0) ctx.translate(rand(-4, 4), rand(-4, 4));
  // verge
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#24452c'); g.addColorStop(1, '#2f6b3a');
  ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
  // shoulders (red earth)
  ctx.fillStyle = '#b5652d'; ctx.fillRect(x0 - 16, -10, 16, H + 20); ctx.fillRect(x0 + rw, -10, 16, H + 20);
  // road
  ctx.fillStyle = '#3a3e47'; ctx.fillRect(x0, -10, rw, H + 20);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(x0 + 3, -10, 4, H + 20); ctx.fillRect(x0 + rw - 7, -10, 4, H + 20);
  const off = R.dist % 70;
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (let l = 1; l < 3; l++) { const lx = x0 + l * rw / 3 - 2; for (let y = -70 + off; y < H; y += 70) ctx.fillRect(lx, y, 4, 36); }
  // scenery
  for (const s of R.scen) {
    const sx = s.side < 0 ? (x0 - 16) / 2 : x0 + rw + 16 + (W - x0 - rw - 16) / 2;
    const sideW = x0 - 16;
    if (s.kind === 'palm') drawPalm(sx, s.y, Math.min(1, sideW / 40));
    else if (s.kind === 'house') { ctx.fillStyle = '#f4e3c1'; ctx.fillRect(sx - sideW * 0.4, s.y - 18, sideW * 0.8, 36); ctx.fillStyle = s.c; ctx.fillRect(sx - sideW * 0.45, s.y - 22, sideW * 0.9, 10); }
    else if (s.kind === 'church') { ctx.fillStyle = '#fff'; ctx.fillRect(sx - sideW * 0.35, s.y - 20, sideW * 0.7, 40); ctx.fillStyle = '#c0392b'; ctx.fillRect(sx - 2, s.y - 34, 4, 16); ctx.fillRect(sx - 6, s.y - 29, 12, 4); }
    else { ctx.fillStyle = s.c; ctx.fillRect(sx - sideW * 0.45, s.y - 14, sideW * 0.9, 28); ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.max(7, Math.min(10, sideW / 6))}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const words = s.txt.split(' '); words.forEach((w, i) => ctx.fillText(w, sx, s.y + (i - (words.length - 1) / 2) * 9)); }
  }
  // bus stop gantry signs
  for (let i = Math.max(0, R.stopIdx - 1); i < Math.min(STOPS.length, R.stopIdx + 2); i++) {
    const y = py - (stopDist(i) - R.dist) - 40;
    if (y < -80 || y > H + 80) continue;
    ctx.fillStyle = '#777'; ctx.fillRect(x0 - 12, y - 4, 6, 50); ctx.fillRect(x0 + rw + 6, y - 4, 6, 50);
    ctx.fillStyle = i === STOPS.length - 1 ? '#7b1fa2' : '#0a6b3c'; rr(x0 - 6, y - 28, rw + 12, 44, 6); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; rr(x0 - 2, y - 24, rw + 4, 36, 4); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px system-ui'; ctx.fillText((i === STOPS.length - 1 ? '⛪ ' : '🚏 ') + STOPS[i].toUpperCase(), W / 2, y - 9);
    ctx.font = '10px system-ui'; ctx.fillText(KM[i] + (i === STOPS.length - 1 ? ' · WELCOME, PILGRIM!' : ' · BUS STOP'), W / 2, y + 8);
  }
  // moral moment figure on shoulder
  const moral = RUN_MORALS[R.moralIdx];
  if (moral) {
    const y = py - (stopDist(moral.after) + GAP / 2 - R.dist);
    if (y > -60 && y < H) {
      const sx = x0 + rw + 14;
      ctx.font = '26px system-ui'; ctx.textAlign = 'center'; ctx.fillText(moral.av, sx - 4, y - 20);
      drawPerson(sx - 4, y + 10, '#e67e22', '#5a3418', 0.9);
      ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 20px system-ui'; ctx.fillText('❗', sx - 4, y - 46 + Math.sin(S.t * 8) * 3);
    }
  }
  // objects
  for (const o of R.objs) {
    const x = laneX(o.lane), y = o.y, lw = laneW();
    if (o.type === 'orb') {
      const rg = ctx.createRadialGradient(x, y, 2, x, y, 18); rg.addColorStop(0, '#fffbe0'); rg.addColorStop(0.4, '#ffd54a'); rg.addColorStop(1, 'rgba(255,190,0,0)');
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y + Math.sin(S.t * 6 + y * 0.05) * 3, o.high ? 20 : 17, 0, 7); ctx.fill();
      if (o.high) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
    } else if (o.type === 'pothole') {
      ctx.fillStyle = '#1b1d22'; ctx.beginPath(); ctx.ellipse(x, y, lw * 0.34, 16, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#4a5b8a'; ctx.beginPath(); ctx.ellipse(x + 3, y + 2, lw * 0.2, 8, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = '#5a5e68'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, lw * 0.38, 19, 0, 0, 7); ctx.stroke();
    } else if (o.type === 'cone') {
      for (const dx of [-lw * 0.22, lw * 0.22]) {
        ctx.fillStyle = '#ff6d00'; ctx.beginPath(); ctx.moveTo(x + dx, y - 17); ctx.lineTo(x + dx + 11, y + 13); ctx.lineTo(x + dx - 11, y + 13); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x + dx - 6, y - 2, 12, 4);
      }
    } else if (o.type === 'danfo') {
      const w = lw * 0.78;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; rr(x - w / 2 + 4, y - o.h / 2 + 6, w, o.h, 10); ctx.fill();
      ctx.fillStyle = '#ffc400'; rr(x - w / 2, y - o.h / 2, w, o.h, 10); ctx.fill();
      ctx.fillStyle = '#111'; ctx.fillRect(x - w / 2, y - 6, w, 5); ctx.fillRect(x - w / 2, y + 14, w, 5);
      ctx.fillStyle = '#9bd3ff'; rr(x - w / 2 + 6, y + o.h / 2 - 26, w - 12, 18, 4); ctx.fill();
      ctx.fillStyle = '#7fb8e0'; rr(x - w / 2 + 6, y - o.h / 2 + 6, w - 12, 12, 3); ctx.fill();
      ctx.fillStyle = '#111'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('NO KING', x, y - 24); ctx.fillText('AS GOD', x, y - 14);
    } else if (o.type === 'okada') {
      const wob = Math.sin(S.t * 5 + o.wob) * 4;
      ctx.fillStyle = '#222'; rr(x - 5 + wob, y - 30, 10, 60, 5); ctx.fill();
      ctx.fillStyle = '#c62828'; rr(x - 9 + wob, y - 14, 18, 28, 6); ctx.fill();
      drawPerson(x + wob, y + 2, '#1565c0', '#5a3418', 0.8);
      ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(x + wob, y - 7, 6.5, 0, 7); ctx.fill();
    } else if (o.type === 'hawker') {
      drawPerson(x, y + 6, '#8e24aa', '#6b3f1f', 1.1, () => {
        ctx.fillStyle = '#c9a26b'; ctx.beginPath(); ctx.ellipse(x, y - 12, 20, 8, 0, 0, 7); ctx.fill();
        ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🥖🥜', x, y - 13);
      });
    }
  }
  // sparks
  for (const p of R.sparks) { ctx.fillStyle = `rgba(255,230,120,${p.t * 2})`; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); }
  // player
  const j = R.jumpT > 0 ? Math.sin((1 - R.jumpT / 0.62) * Math.PI) : 0;
  const sc = 1 + j * 0.35;
  const blink = R.inv > 0 && Math.floor(S.t * 12) % 2 === 0;
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(R.px, py + 14, 14 * (1 - j * 0.3), 6, 0, 0, 7); ctx.fill();
  if (!blink) {
    const glow = 30 + S.lantern * 0.9;
    const lg = ctx.createRadialGradient(R.px + 14 * sc, py - 8 - j * 22, 2, R.px + 14 * sc, py - 8 - j * 22, glow);
    lg.addColorStop(0, 'rgba(255,240,170,.85)'); lg.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(R.px + 14 * sc, py - 8 - j * 22, glow, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(R.px, py - j * 22); ctx.scale(sc, sc);
    ctx.fillStyle = '#ffffff'; rr(-12, -8, 24, 26, 9); ctx.fill();
    ctx.fillStyle = '#008751'; ctx.fillRect(-12, 4, 24, 4);
    ctx.fillStyle = '#5a3418'; ctx.beginPath(); ctx.arc(0, -15, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#1b1b1b'; ctx.beginPath(); ctx.arc(0, -18, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffcf3f'; rr(11, -12, 9, 12, 3); ctx.fill(); ctx.fillStyle = '#fff6c0'; ctx.fillRect(13, -9, 5, 6);
    ctx.restore();
  }
  ctx.restore();
  drawRunHUD();
}
function drawLanternMeter(x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(x, y, w, 34, 17); ctx.fill();
  ctx.font = '18px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('🏮', x + 6, y + 17);
  const bx = x + 32, bw = w - 42;
  ctx.fillStyle = 'rgba(255,255,255,.18)'; rr(bx, y + 11, bw, 12, 6); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(bx + bw * S.floor / 100 - 1, y + 9, 2, 16);
  const gr = ctx.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#ffcf3f'); gr.addColorStop(1, '#ff8f00');
  ctx.fillStyle = gr; rr(bx, y + 11, Math.max(6, bw * S.lantern / 100), 12, 6); ctx.fill();
}
function drawRunHUD() {
  const top = 8;
  drawLanternMeter(8, top, Math.min(170, W * 0.45));
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(W / 2 + 4, top, W / 2 - 58, 34, 17); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✨ ' + S.score, W / 2 + 4 + (W / 2 - 58) / 2, top + 17);
  // progress
  const pw = W - 16, py = top + 42;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(8, py, pw, 30, 15); ctx.fill();
  const prog = clamp(R.dist / RUN_LEN, 0, 1);
  ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(18, py + 22, pw - 20, 3);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(18, py + 22, (pw - 20) * prog, 3);
  ctx.fillStyle = '#fff'; ctx.font = '12px system-ui';
  const next = STOPS[Math.min(R.stopIdx, STOPS.length - 1)];
  const left = Math.max(0, Math.round((stopDist(Math.min(R.stopIdx, STOPS.length - 1)) - R.dist) / 10));
  ctx.fillText(`Next stop: ${next} · ${left}m`, W / 2, py + 11);
}

/* =========================================================
   PART 2 — INSIDE THE CAMP
   ========================================================= */
const CW = 760, CH = 1500;
const BLD = [
  { x: 150, y: 60, w: 460, h: 250, c: '#f5f0e6', roof: '#7b1fa2', label: 'MAIN AUDITORIUM', big: true },
  { x: 30, y: 790, w: 110, h: 120, c: '#fde9c9', roof: '#c0392b', label: 'HOSTEL A' },
  { x: 160, y: 790, w: 110, h: 120, c: '#fde9c9', roof: '#c0392b', label: 'HOSTEL B' },
  { x: 30, y: 1015, w: 110, h: 120, c: '#fde9c9', roof: '#2e86c1', label: 'HOSTEL C' },
  { x: 160, y: 1015, w: 110, h: 110, c: '#fde9c9', roof: '#2e86c1', label: 'HOSTEL D' },
  { x: 490, y: 830, w: 100, h: 80, c: '#fff', roof: '#e67e22', label: 'SUYA', stall: true },
  { x: 620, y: 830, w: 100, h: 80, c: '#fff', roof: '#27ae60', label: 'BUKA', stall: true },
  { x: 490, y: 1020, w: 100, h: 80, c: '#fff', roof: '#f1c40f', label: 'DRINKS', stall: true },
  { x: 620, y: 1020, w: 100, h: 80, c: '#fff', roof: '#e74c3c', label: 'BOOKS', stall: true },
  { x: 540, y: 1260, w: 150, h: 80, c: '#e8f4ff', roof: '#1565c0', label: 'HELP DESK' },
];
const ZONES = [
  { name: 'Main Auditorium', x: 120, y: 0, w: 520, h: 360 },
  { name: 'Prayer Ground', x: 20, y: 380, w: 320, h: 300 },
  { name: 'Accommodation', x: 0, y: 760, w: 300, h: 420 },
  { name: 'Food Court', x: 460, y: 790, w: 300, h: 380 },
  { name: 'Main Gate', x: 0, y: 1200, w: 760, h: 300 },
];
let C = null;
function startCamp() {
  S.screen = 'camp'; S.paused = false;
  C = { x: 380, y: 1450, tx: null, ty: null, cam: { x: 0, y: 0 }, met: {}, toastCd: 0, zone: '', step: 0, face: 1,
    tufts: Array.from({ length: 160 }, () => ({ x: rand(0, CW), y: rand(0, CH) })),
    trees: Array.from({ length: 34 }, () => { let x, y, t = 0; do { x = rand(10, CW - 10); y = rand(330, CH - 40); t++; } while (t < 50 && (blocked(x, y, 26) || Math.abs(x - 380) < 70 || Math.abs(y - 965) < 60 || Math.abs(y - 700) < 50)); return { x, y, r: rand(14, 22) }; }) };
  toast('Tap or drag to walk · Talk to pilgrims with ❗', 3200);
}
function blocked(x, y, r) {
  if (x < r || y < r || x > CW - r || y > CH - r) return true;
  for (const b of BLD) if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  return false;
}
function campTarget(sx, sy) { C.tx = sx + C.cam.x; C.ty = sy + C.cam.y; }
function metCount() { return ENCOUNTERS.filter(e => !e.door && C.met[e.id]).length; }
function guideTarget() {
  const mc = metCount();
  let best = null, bd = Infinity;
  for (const e of ENCOUNTERS) {
    if (C.met[e.id] || (e.door && mc < DOOR_NEED)) continue;
    const d = Math.hypot(e.x - C.x, e.y - C.y);
    if (e.door && mc < ENCOUNTERS.length - 1) continue; // prefer remaining pilgrims first
    if (d < bd) { bd = d; best = e; }
  }
  if (!best) best = ENCOUNTERS.find(e => e.door);
  return best;
}
function updateCamp(dt) {
  let vx = 0, vy = 0;
  if (keys.ArrowLeft || keys.a) vx -= 1; if (keys.ArrowRight || keys.d) vx += 1;
  if (keys.ArrowUp || keys.w) vy -= 1; if (keys.ArrowDown || keys.s) vy += 1;
  if (vx || vy) { C.tx = null; }
  else if (C.tx != null) { const dx = C.tx - C.x, dy = C.ty - C.y, d = Math.hypot(dx, dy); if (d > 4) { vx = dx / d; vy = dy / d; } else C.tx = null; }
  const m = Math.hypot(vx, vy);
  if (m) {
    const sp = 170 * dt / m;
    const nx = C.x + vx * sp, ny = C.y + vy * sp;
    if (!blocked(nx, C.y, 12)) C.x = nx;
    if (!blocked(C.x, ny, 12)) C.y = ny;
    C.step += dt * 10; if (vx) C.face = Math.sign(vx);
  }
  C.cam.x = CW <= W ? (CW - W) / 2 : clamp(C.x - W / 2, 0, CW - W);
  C.cam.y = clamp(C.y - H * 0.55, 0, Math.max(0, CH - H));
  const z = ZONES.find(z => C.x > z.x && C.x < z.x + z.w && C.y > z.y && C.y < z.y + z.h);
  C.zone = z ? z.name : 'Camp Grounds';
  if (C.toastCd > 0) C.toastCd -= dt;
  // encounters
  for (const e of ENCOUNTERS) {
    if (C.met[e.id]) continue;
    if (Math.hypot(e.x - C.x, e.y - C.y) < 42) {
      if (e.door && metCount() < DOOR_NEED) {
        if (C.toastCd <= 0) { toast(`👮🏾 Usher: "Service starts soon! Some pilgrims still need a hand. Help at least ${DOOR_NEED} (${metCount()}/${DOOR_NEED} so far)."`, 3200); C.toastCd = 3.5; }
        C.y = Math.max(C.y, e.y + 44); C.tx = null; continue;
      }
      C.tx = null; C.met[e.id] = true;
      openDialog(e, () => { if (e.door) setTimeout(showEnding, 250); });
      break;
    }
  }
}
function drawCamp() {
  const cx = C.cam.x, cy = C.cam.y;
  ctx.fillStyle = '#06281b'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate(-cx, -cy);
  // grass
  ctx.fillStyle = '#4f9d55'; ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = '#5fae62'; C.tufts.forEach(t => { ctx.fillRect(t.x, t.y, 3, 6); ctx.fillRect(t.x + 4, t.y + 2, 3, 5); });
  // roads
  ctx.fillStyle = '#e3c58f';
  ctx.fillRect(335, 300, 90, CH - 300);    // main road
  ctx.fillRect(0, 920, CW, 90);             // cross road
  ctx.fillRect(0, 660, CW, 70);             // upper road
  ctx.fillRect(40, 380, 300, 280);          // prayer ground sand
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (let y = 320; y < CH; y += 40) ctx.fillRect(378, y, 4, 20);
  // prayer ground details
  ctx.fillStyle = '#8d6e63';
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) ctx.fillRect(70 + c * 66, 470 + r * 40, 46, 8);
  ctx.fillStyle = '#fff'; ctx.fillRect(186, 395, 8, 50); ctx.fillRect(170, 408, 40, 8);
  label('PRAYER GROUND', 190, 640, '#5d4037');
  // gate arch
  ctx.fillStyle = '#7b1fa2'; ctx.fillRect(300, 1400, 16, 70); ctx.fillRect(444, 1400, 16, 70);
  rr(290, 1380, 180, 34, 8); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('REDEMPTION CITY', 380, 1392); ctx.font = '9px system-ui'; ctx.fillText('WELCOME, PILGRIM · KM 46', 380, 1406);
  // streetlights along main road
  for (let y = 380; y < CH - 120; y += 120) for (const x of [325, 435]) {
    const lg = ctx.createRadialGradient(x, y, 1, x, y, 26); lg.addColorStop(0, 'rgba(255,240,180,.8)'); lg.addColorStop(1, 'rgba(255,220,120,0)');
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x, y, 26, 0, 7); ctx.fill(); ctx.fillStyle = '#fff8d0'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  }
  // buildings
  for (const b of BLD) {
    ctx.fillStyle = 'rgba(0,0,0,.22)'; rr(b.x + 6, b.y + 8, b.w, b.h, 10); ctx.fill();
    if (b.stall) {
      ctx.fillStyle = '#8d6e63'; ctx.fillRect(b.x + 6, b.y + 30, b.w - 12, b.h - 34);
      ctx.fillStyle = b.roof; rr(b.x, b.y, b.w, 36, 8); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < 5; i++) ctx.fillRect(b.x + 6 + i * 20, b.y + 4, 9, 28);
      label(b.label, b.x + b.w / 2, b.y + b.h - 14, '#fff', '#3e2723');
    } else if (b.big) {
      ctx.fillStyle = b.c; rr(b.x, b.y, b.w, b.h, 18); ctx.fill();
      ctx.fillStyle = b.roof; rr(b.x + 20, b.y + 16, b.w - 40, b.h - 70, 14); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 8; i++) ctx.fillRect(b.x + 40 + i * 52, b.y + 26, 26, b.h - 90);
      const glow = ctx.createRadialGradient(380, b.y + b.h, 5, 380, b.y + b.h, 90); glow.addColorStop(0, 'rgba(255,230,140,.9)'); glow.addColorStop(1, 'rgba(255,230,140,0)');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(380, b.y + b.h, 90, 0, 7); ctx.fill();
      ctx.fillStyle = '#5d2a00'; rr(350, b.y + b.h - 30, 60, 30, 6); ctx.fill();
      ctx.fillStyle = '#ffd54a'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center'; ctx.fillText('MAIN AUDITORIUM', 380, b.y + b.h - 44);
      ctx.fillStyle = '#fff'; ctx.font = '12px system-ui'; ctx.fillText('🔥 HOLY GHOST SERVICE TONIGHT 🔥', 380, b.y + 120);
    } else {
      ctx.fillStyle = b.c; rr(b.x, b.y, b.w, b.h, 8); ctx.fill();
      ctx.fillStyle = b.roof; rr(b.x, b.y, b.w, 22, 8); ctx.fill();
      ctx.fillStyle = '#7fb8e0'; for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) ctx.fillRect(b.x + 12 + c * 32, b.y + 34 + r * 30, 18, 16);
      label(b.label, b.x + b.w / 2, b.y + b.h - 10, '#fff', '#00000088');
    }
  }
  label('FOOD COURT', 605, 790, '#fff', '#e65100');
  label('ACCOMMODATION', 150, 770, '#fff', '#1565c0');
  // trees
  for (const t of C.trees) { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.arc(t.x + 5, t.y + 6, t.r, 0, 7); ctx.fill(); ctx.fillStyle = '#2e7d32'; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, 7); ctx.fill(); ctx.fillStyle = '#43a047'; ctx.beginPath(); ctx.arc(t.x - t.r * 0.3, t.y - t.r * 0.3, t.r * 0.55, 0, 7); ctx.fill(); }
  // NPCs
  const mc = metCount();
  for (const e of ENCOUNTERS) {
    const bob = Math.sin(S.t * 3 + e.x) * 2;
    if (e.door) {
      drawPerson(e.x - 34, e.y - 4, '#263238', '#4e2a12', 1); ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('USHER', e.x - 34, e.y + 24);
      if (!C.met[e.id] && mc >= DOOR_NEED) { ctx.font = 'bold 20px system-ui'; ctx.fillText('⛪', e.x, e.y - 30 + bob); }
      continue;
    }
    drawPerson(e.x, e.y + bob * 0.3, pick2(e.id), '#5a3418', 1.1);
    ctx.font = '22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(e.av, e.x, e.y - 14);
    ctx.font = 'bold 20px system-ui';
    ctx.fillText(C.met[e.id] ? '💛' : '❗', e.x, e.y - 40 + bob);
  }
  // player
  const pb = Math.sin(C.step) * 2;
  const glow = 40 + S.lantern * 1.1;
  const lg = ctx.createRadialGradient(C.x + 12 * C.face, C.y - 6, 2, C.x + 12 * C.face, C.y - 6, glow);
  lg.addColorStop(0, 'rgba(255,240,170,.7)'); lg.addColorStop(1, 'rgba(255,200,60,0)');
  ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(C.x + 12 * C.face, C.y - 6, glow, 0, 7); ctx.fill();
  drawPerson(C.x, C.y + pb, '#ffffff', '#5a3418', 1.15, () => {
    ctx.fillStyle = '#008751'; ctx.fillRect(C.x - 11, C.y + pb + 2, 22, 4);
    ctx.fillStyle = '#ffcf3f'; rr(C.x + 11 * C.face - 4, C.y + pb - 10, 9, 12, 3); ctx.fill();
  });
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(S.name, C.x, C.y + 30);
  if (C.tx != null) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(C.tx, C.ty, 8 + Math.sin(S.t * 8) * 2, 0, 7); ctx.stroke(); }
  ctx.restore();
  // evening vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  vg.addColorStop(0, 'rgba(10,10,40,0)'); vg.addColorStop(1, 'rgba(10,10,40,.45)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  drawGuide();
  drawCampHUD();
}
const NPC_COLORS = ['#e53935', '#8e24aa', '#1e88e5', '#43a047', '#fb8c00', '#00897b', '#6d4c41', '#d81b60'];
function pick2(id) { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return NPC_COLORS[Math.abs(h) % NPC_COLORS.length]; }
function label(t, x, y, fg = '#fff', bg = null) {
  ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (bg) { const w = ctx.measureText(t).width + 12; ctx.fillStyle = bg; rr(x - w / 2, y - 9, w, 18, 9); ctx.fill(); }
  ctx.fillStyle = fg; ctx.fillText(t, x, y);
}
function drawGuide() {
  const g = guideTarget(); if (!g) return;
  const sx = g.x - C.cam.x, sy = g.y - C.cam.y;
  const pad = 40, top = 100;
  if (sx > pad && sx < W - pad && sy > top && sy < H - pad) {
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 22px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('▼', sx, sy - 62 + Math.sin(S.t * 6) * 4);
    return;
  }
  const px = C.x - C.cam.x, py = C.y - C.cam.y;
  const a = Math.atan2(sy - py, sx - px);
  const ex = clamp(px + Math.cos(a) * 1000, pad, W - pad), ey = clamp(py + Math.sin(a) * 1000, top, H - pad);
  // place on screen edge along direction
  let t = Infinity;
  const dx = Math.cos(a), dy = Math.sin(a);
  if (dx > 0) t = Math.min(t, (W - pad - px) / dx); if (dx < 0) t = Math.min(t, (pad - px) / dx);
  if (dy > 0) t = Math.min(t, (H - pad - py) / dy); if (dy < 0) t = Math.min(t, (top - py) / dy);
  const ax = isFinite(t) ? px + dx * t : ex, ay = isFinite(t) ? py + dy * t : ey;
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
  ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = '#7a4b00'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(-10, -13); ctx.lineTo(-4, 0); ctx.lineTo(-10, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
function drawCampHUD() {
  drawLanternMeter(8, 8, Math.min(170, W * 0.45));
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(W / 2 + 4, 8, W / 2 - 58, 34, 17); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✨ ' + S.score, W / 2 + 4 + (W / 2 - 58) / 2, 25);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; rr(8, 50, W - 16, 30, 15); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '13px system-ui';
  const mc = metCount(), need = ENCOUNTERS.length - 1;
  ctx.fillText(`📍 ${C.zone} · 💛 Met ${mc}/${need}${mc >= DOOR_NEED ? ' · ⛪ Auditorium open' : ''}`, W / 2, 65);
}

/* =========================================================
   ENDING
   ========================================================= */
function showEnding() {
  S.screen = 'end'; S.paused = true;
  const vCount = Object.values(S.virtues).reduce((a, b) => a + b, 0);
  const shown = Object.keys(VIRTUES).filter(k => S.virtues[k] > 0).length;
  const lantern = Math.round(S.lantern);
  const bonus = lantern * 5 + vCount * 25;
  S.score += bonus;
  const total = S.score;
  const tier = lantern >= 85 ? ['A Shining City on a Hill', 'Your lantern is blazing! People could see your light from the gate.']
    : lantern >= 60 ? ['A Bright and Faithful Light', 'Your light grew all through the journey. Keep tending it!']
    : ['A Light That Is Growing', 'Every lantern starts small. God\'s mercy is new every morning, and so is your chance to shine.'];
  const hs = JSON.parse(localStorage.getItem('lr_high') || 'null');
  const isHigh = !hs || total > hs.score;
  if (isHigh) localStorage.setItem('lr_high', JSON.stringify({ score: total, name: S.name }));
  const vList = Object.keys(VIRTUES).map(k => `<div class="${S.virtues[k] ? '' : 'off'}">${VIRTUES[k]} ${k} <b>×${S.virtues[k]}</b></div>`).join('');
  const share = shareText(total, lantern, vCount, shown);
  $('#endBody').innerHTML = `
    <div style="text-align:center;font-size:54px;filter:drop-shadow(0 0 ${8 + lantern / 4}px #ffb300)">🏮</div>
    <h2 style="text-align:center;margin:0">Welcome to the Holy Ghost Service, ${esc(S.name)}!</h2>
    <p style="text-align:center;margin:6px 0 2px;color:#c0641a;font-weight:800">${tier[0]}</p>
    <p class="small" style="text-align:center;margin:0 0 8px">${tier[1]}</p>
    <div class="big-score"><div class="n">${total}</div><div class="small">total light score ${isHigh ? '· 🏆 new best on this phone!' : `· best: ${hs.score} (${esc(hs.name)})`}</div></div>
    <div class="small">Lantern brightness: <b>${lantern}%</b></div>
    <div class="meter"><i style="width:${lantern}%"></i></div>
    <div class="chips"><span class="chip">✨ ${S.orbs} orbs</span><span class="chip">📖 ${S.quizRight}/${S.quizTotal} Bible Qs</span><span class="chip">🤲 ${S.log.filter(l => l.good).length} good choices</span><span class="chip dim">+${bonus} end bonus</span></div>
    <h3>Virtues you showed (${shown}/7)</h3>
    <div class="vgrid">${vList}</div>
    <h3>Why it matters</h3>
    <p style="line-height:1.5;font-size:15px">Points fade, but character lasts. Every time you chose kindness, honesty, purity and putting others first, you let God's light shine through you. We don't earn heaven by good deeds; it's God's gift of grace through Jesus. But people who belong to Him walk in His ways, and their light shines so others see God.</p>
    ${verseHTML(V.mat516)}${verseHTML(V.heb1214)}${verseHTML(V.eph28)}
    <h3>🏠 Carry it home: this week's challenge</h3>
    <ul class="home">${Object.keys(CARRY_HOME).map(k => `<li><b>${VIRTUES[k]} ${k}:</b> ${esc(CARRY_HOME[k])}</li>`).join('')}</ul>
    <button class="btn primary" id="btnShare">📋 Copy my result to share</button>
    <button class="btn green" id="btnAgain">Play again ↻</button>
    <p class="small" style="text-align:center">Screenshot this and share it with your group! 🙌</p>`;
  show('end'); $('#endBody').scrollTop = 0;
  sfx.good();
  $('#btnShare').addEventListener('click', () => copyText(share));
  $('#btnAgain').addEventListener('click', () => { hide('end'); S.screen = 'title'; showHigh(); show('title'); });
}
function shareText(total, lantern, vCount, shown) {
  const v = Object.keys(VIRTUES).filter(k => S.virtues[k]).map(k => VIRTUES[k]).join('');
  const url = /^https?:/.test(location.href) && !/localhost|127\.0\.0\.1/.test(location.host) ? '\n' + location.href.split('?')[0] : '';
  return `🏮 Redemption City: Light Run\n${S.name} reached the Holy Ghost Service!\n✨ Light score: ${total}\n🏮 Lantern: ${lantern}%\n💛 Virtues: ${shown}/7 ${v}\n📖 Bible Qs: ${S.quizRight}/${S.quizTotal}\nCan you shine brighter? (Matthew 5:16)${url}`;
}
function copyText(t) {
  const done = () => toast('Copied! Paste it in your group chat 📲');
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(done, fallback); else fallback();
  function fallback() { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed. Take a screenshot instead.'); } ta.remove(); }
}

/* =========================================================
   TITLE BACKDROP + LOOP
   ========================================================= */
function drawTitleBg() {
  ctx.fillStyle = '#0b3d2a'; ctx.fillRect(0, 0, W, H);
}
let last = performance.now();
function loop(now) {
  let dt = Math.min(0.05, (now - last) / 1000); last = now;
  dt *= TIME_SCALE;
  S.t += dt;
  // substep to keep collisions reliable at high time scales
  const steps = Math.ceil(dt / (1 / 60));
  for (let i = 0; i < steps; i++) {
    const d = dt / steps;
    if (S.paused) break;
    if (S.screen === 'run') updateRun(d);
    else if (S.screen === 'camp') updateCamp(d);
  }
  if (S.screen === 'run' && R) drawRun();
  else if (S.screen === 'camp' && C) drawCamp();
  else if (S.screen === 'end' && C) drawCamp();
  else drawTitleBg();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Small test/debug hook (harmless in production)
window.LR = {
  get state() { return { screen: S.screen, paused: S.paused, score: S.score, lantern: S.lantern, virtues: S.virtues, stop: R && R.stopIdx, dist: R && R.dist, met: C && C.met }; },
  teleport(id) { const e = ENCOUNTERS.find(e => e.id === id); if (!C || !e) return; const o = [[0, 55], [0, -55], [55, 0], [-55, 0]].find(([dx, dy]) => !blocked(e.x + dx, e.y + dy, 12)) || [0, 55]; C.x = e.x + o[0]; C.y = e.y + o[1]; C.tx = e.x; C.ty = e.y; },
  skipRun() { if (R) R.dist = RUN_LEN - 5; R.stopIdx = STOPS.length - 1; R.moralIdx = RUN_MORALS.length; },
};
})();
