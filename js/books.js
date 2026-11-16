// v10 · The Bible map: all 66 books, and the playable "vision" worlds (wave 1: Genesis, Exodus, Leviticus)
// Every quiz answer and verse is KJV. Listed in CONTENT-REVIEW.md for a pastor / youth leader to check.
export const SECTIONS = [
  ['law', 'The Law', '📜'], ['history', 'History', '🏰'], ['poetry', 'Poetry & Wisdom', '🎵'], ['major', 'Major Prophets', '🔥'], ['minor', 'Minor Prophets', '📯'],
  ['gospels', 'The Gospels', '✝️'], ['acts', 'Church History', '🕊️'], ['paul', "Paul's Letters", '✉️'], ['general', 'General Letters', '📨'], ['prophecy', 'Prophecy', '👑'],
];
const B = (sec, names, icons) => names.split('|').map((n, i) => ({ id: n.toLowerCase().replace(/[^a-z0-9]/g, ''), name: n, sec, icon: icons[i] || '📖' }));
export const BOOKS = [
  ...B('law', 'Genesis|Exodus|Leviticus|Numbers|Deuteronomy', ['🌳', '🌊', '🏺', '⛺', '🗿']),
  ...B('history', 'Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther', ['🎺', '⚔️', '🌾', '🪨', '👑', '🏛️', '🔥', '📜', '🛕', '📖', '🧱', '👸🏾']),
  ...B('poetry', 'Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon', ['🌪️', '🎶', '💡', '⏳', '🌹']),
  ...B('major', 'Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel', ['🔥', '🏺', '😢', '🦴', '🦁']),
  ...B('minor', 'Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi', ['💍', '🦗', '🍑', '⛰️', '🐋', '⚖️', '🌊', '🗼', '🌅', '🧱', '🐴', '🔥']),
  ...B('gospels', 'Matthew|Mark|Luke|John', ['👑', '🦁', '🩺', '🕊️']),
  ...B('acts', 'Acts', ['🔥']),
  ...B('paul', 'Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon', ['⚖️', '❤️', '🏺', '🕊️', '🛡️', '😊', '👑', '☁️', '⏳', '🧑🏾‍🏫', '🏃🏾', '🌴', '🤝🏾']),
  ...B('general', 'Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude', ['⚓', '🗣️', '💎', '🌟', '💛', '🏠', '🚪', '🛡️']),
  ...B('prophecy', 'Revelation', ['🌈']),
];
export const PLAYABLE = ['genesis', 'exodus', 'leviticus'];
export const UNLOCK_AFTER = { exodus: 'genesis', leviticus: 'exodus' };

// q: [question, [correct, wrong, wrong], 0, note (the reference), level e|m|h]
export const WORLDS = {
  genesis: {
    id: 'genesis', name: 'Genesis', place: 'The Garden of Eden', icon: '🌳',
    tag: 'In the beginning: creation, the garden, Noah, Abraham and Joseph',
    intro: '🌳 A vision of Eden! “In the beginning God created the heaven and the earth.” Run the garden path!',
    boss: { id: 'flood', icon: '🌧️', title: 'THE GREAT FLOOD', sub: 'The waters rise! Waves roll down one lane at a time: jump them or change lane (Genesis 7)', winTitle: 'The rainbow appears!', win: ['I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.', 'Genesis 9:13'] },
    quiz: [
      ['What did God create on the first day?', ['Light', 'Animals', 'The sun'], 0, 'Genesis 1:3 · “Let there be light”', 'e'],
      ['On which day did God rest from all His work?', ['The seventh', 'The sixth', 'The first'], 0, 'Genesis 2:2', 'e'],
      ['What was the name of the first man?', ['Adam', 'Abel', 'Seth'], 0, 'Genesis 2:19', 'e'],
      ['Who was the first woman?', ['Eve', 'Sarah', 'Leah'], 0, 'Genesis 3:20', 'e'],
      ['God planted a garden eastward in…', ['Eden', 'Egypt', 'Babylon'], 0, 'Genesis 2:8', 'e'],
      ['Who built the ark?', ['Noah', 'Abraham', 'Moses'], 0, 'Genesis 6:14', 'e'],
      ['Which creature tempted Eve in the garden?', ['The serpent', 'A lion', 'A raven'], 0, 'Genesis 3:1', 'e'],
      ['Who killed his brother Abel?', ['Cain', 'Seth', 'Esau'], 0, 'Genesis 4:8', 'm'],
      ['What sign did God set in the cloud after the flood?', ['A rainbow', 'A star', 'A dove'], 0, 'Genesis 9:13', 'm'],
      ['What came back to Noah with an olive leaf?', ['A dove', 'A raven', 'An eagle'], 0, 'Genesis 8:11', 'm'],
      ['The tower where God confused the language was…', ['Babel', 'Jericho', 'Zion'], 0, 'Genesis 11:9', 'm'],
      ['God told Abraham to count the…', ['Stars', 'Trees', 'Mountains'], 0, 'Genesis 15:5', 'm'],
      ['Who was the son God promised to Abraham and Sarah?', ['Isaac', 'Ishmael', 'Jacob'], 0, 'Genesis 21:3', 'm'],
      ['What did God provide in place of Isaac on the mountain?', ['A ram', 'A calf', 'A dove'], 0, 'Genesis 22:13', 'h'],
      ['Who sold his birthright for red pottage?', ['Esau', 'Jacob', 'Laban'], 0, 'Genesis 25:30-34', 'h'],
      ['In his dream at Bethel, Jacob saw…', ['A ladder', 'A burning bush', 'A chariot'], 0, 'Genesis 28:12 · angels going up and down', 'h'],
      ['Israel gave Joseph a coat of many…', ['Colours', 'Pockets', 'Stars'], 0, 'Genesis 37:3', 'h'],
      ["Joseph's brothers sold him for how many pieces of silver?", ['Twenty', 'Thirty', 'Ten'], 0, 'Genesis 37:28', 'h'],
      ['Joseph became a ruler over which land?', ['Egypt', 'Canaan', 'Babylon'], 0, 'Genesis 41:41', 'h'],
    ],
    verses: [
      { ref: 'Genesis 1:1', text: 'In the beginning God created the heaven and the earth.' },
      { ref: 'Genesis 1:27', text: 'So God created man in his own image, in the image of God created he him; male and female created he them.' },
      { ref: 'Genesis 1:31', text: 'And God saw every thing that he had made, and, behold, it was very good. And the evening and the morning were the sixth day.' },
      { ref: 'Genesis 2:7', text: 'And the LORD God formed man of the dust of the ground, and breathed into his nostrils the breath of life; and man became a living soul.' },
      { ref: 'Genesis 9:13', text: 'I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.' },
      { ref: 'Genesis 12:2', text: 'And I will make of thee a great nation, and I will bless thee, and make thy name great; and thou shalt be a blessing:' },
      { ref: 'Genesis 50:20', text: 'But as for you, ye thought evil against me; but God meant it unto good, to bring to pass, as it is this day, to save much people alive.' },
    ],
  },
  exodus: {
    id: 'exodus', name: 'Exodus', place: 'Through the Red Sea', icon: '🌊',
    tag: 'Moses, the plagues, the Passover, the Red Sea and Mount Sinai',
    intro: '🌊 A vision of the Red Sea! The waters stand up like walls. “The LORD shall fight for you.” Run the seabed!',
    boss: { id: 'chariots', icon: '🐎', title: "PHARAOH'S CHARIOTS", sub: 'Chariots charge from behind! Leave the warned lane (Exodus 14)', winTitle: 'Safe on the other side!', win: ['The LORD shall fight for you, and ye shall hold your peace.', 'Exodus 14:14'] },
    quiz: [
      ['Where was baby Moses hidden?', ['An ark of bulrushes', 'A cave', 'A well'], 0, 'Exodus 2:3', 'e'],
      ['Who found baby Moses by the river?', ["Pharaoh's daughter", 'Miriam', 'A shepherd'], 0, 'Exodus 2:5-6', 'e'],
      ['God spoke to Moses out of a…', ['Burning bush', 'Pillar of salt', 'Whirlwind'], 0, 'Exodus 3:2-4', 'e'],
      ['What did God part so Israel could cross on dry ground?', ['The Red Sea', 'The Jordan', 'The Nile'], 0, 'Exodus 14:21-22', 'e'],
      ['What bread did God send from heaven?', ['Manna', 'Barley loaves', 'Honey cakes'], 0, 'Exodus 16:31', 'e'],
      ['How many plagues did God send on Egypt?', ['Ten', 'Seven', 'Twelve'], 0, 'Exodus 7–12', 'e'],
      ['“Honour thy father and thy…”', ['Mother', 'Elders', 'King'], 0, 'Exodus 20:12', 'e'],
      ['God gave the Ten Commandments on Mount…', ['Sinai', 'Carmel', 'Zion'], 0, 'Exodus 19:20; 20:1-17', 'm'],
      ['Who spoke for Moses to the people and to Pharaoh?', ['Aaron', 'Joshua', 'Caleb'], 0, 'Exodus 4:14-16', 'm'],
      ['What led Israel by night in the wilderness?', ['A pillar of fire', 'A bright star', 'An angel'], 0, 'Exodus 13:21', 'm'],
      ['What was the first plague on Egypt?', ['Water to blood', 'Frogs', 'Locusts'], 0, 'Exodus 7:20', 'm'],
      ['At the Passover the blood of the lamb went on the…', ['Door posts', 'Altar stones', 'Tent pegs'], 0, 'Exodus 12:7', 'm'],
      ['What idol did the people make while Moses was on the mount?', ['A golden calf', 'A bronze snake', 'A silver bull'], 0, 'Exodus 32:4', 'm'],
      ['What name did God give for Himself at the bush?', ['I AM THAT I AM', 'Ancient of days', 'Lord of hosts'], 0, 'Exodus 3:14', 'h'],
      ['Moses struck the rock in Horeb and out came…', ['Water', 'Honey', 'Oil'], 0, 'Exodus 17:6', 'h'],
      ["Who held up Moses' hands in the battle with Amalek?", ['Aaron and Hur', 'Joshua and Caleb', 'Miriam and Aaron'], 0, 'Exodus 17:12', 'h'],
      ['What did Miriam play as she sang to the LORD?', ['A timbrel', 'A harp', 'A trumpet'], 0, 'Exodus 15:20', 'h'],
      ["Who was Moses' father-in-law, the priest of Midian?", ['Jethro', 'Laban', 'Eli'], 0, 'Exodus 18:1', 'h'],
    ],
    verses: [
      { ref: 'Exodus 3:14', text: 'And God said unto Moses, I AM THAT I AM: and he said, Thus shalt thou say unto the children of Israel, I AM hath sent me unto you.' },
      { ref: 'Exodus 14:13', text: 'And Moses said unto the people, Fear ye not, stand still, and see the salvation of the LORD, which he will shew to you to day: for the Egyptians whom ye have seen to day, ye shall see them again no more for ever.' },
      { ref: 'Exodus 14:14', text: 'The LORD shall fight for you, and ye shall hold your peace.' },
      { ref: 'Exodus 15:2', text: 'The LORD is my strength and song, and he is become my salvation: he is my God, and I will prepare him an habitation; my father\'s God, and I will exalt him.' },
      { ref: 'Exodus 20:3', text: 'Thou shalt have no other gods before me.' },
      { ref: 'Exodus 20:12', text: 'Honour thy father and thy mother: that thy days may be long upon the land which the LORD thy God giveth thee.' },
      { ref: 'Exodus 33:14', text: 'And he said, My presence shall go with thee, and I will give thee rest.' },
    ],
  },
  leviticus: {
    id: 'leviticus', name: 'Leviticus', place: 'The Holy Road & the Tabernacle', icon: '🏺',
    tag: 'Holiness, the priests, the tabernacle, the lamps and the year of jubile',
    intro: '🏺 A vision of the holy road! Golden oil lamps light the old aqueduct. “Ye shall be holy: for I the LORD your God am holy.”',
    boss: { id: 'collapse', icon: '🏛️', title: 'THE AQUEDUCT SHAKES', sub: 'Stones are falling! Watch the shadows and keep your lamp burning', winTitle: 'The fire never went out!', win: ['The fire shall ever be burning upon the altar; it shall never go out.', 'Leviticus 6:13'] },
    quiz: [
      ['“Ye shall be holy: for I the LORD your God am…”', ['Holy', 'Mighty', 'Near'], 0, 'Leviticus 19:2', 'e'],
      ['“Thou shalt love thy neighbour as…”', ['Thyself', 'Thy brother', 'A stranger'], 0, 'Leviticus 19:18', 'e'],
      ['Who was anointed as the high priest?', ['Aaron', 'Moses', 'Eli'], 0, 'Leviticus 8:12', 'e'],
      ['The priests were Aaron’s sons, of the tribe of…', ['Levi', 'Judah', 'Dan'], 0, 'Leviticus 1:5; 25:32', 'e'],
      ['From where did the LORD speak to Moses in Leviticus 1:1?', ['The tabernacle', 'Mount Carmel', "Pharaoh's palace"], 0, 'Leviticus 1:1', 'e'],
      ['The fire on the altar was never to…', ['Go out', 'Be seen', 'Be moved'], 0, 'Leviticus 6:13', 'e'],
      ['The tabernacle lamps burned with pure oil from…', ['Olives', 'Almonds', 'Dates'], 0, 'Leviticus 24:2', 'm'],
      ['At harvest, what was left for the poor and the stranger?', ['Field corners', 'The best grain', 'Only straw'], 0, 'Leviticus 19:9-10', 'm'],
      ['Leviticus 19:14: do not put a stumblingblock before the…', ['Blind', 'Rich', 'Priest'], 0, 'Leviticus 19:14', 'm'],
      ['“Rise up before the hoary head, and honour the face of the…”', ['Old man', 'King', 'Priest'], 0, 'Leviticus 19:32', 'm'],
      ['The year of jubile came every how many years?', ['Fifty', 'Seven', 'Forty'], 0, 'Leviticus 25:10-11', 'm'],
      ['Every seventh year the land was to have a…', ['Sabbath of rest', 'Double harvest', 'New owner'], 0, 'Leviticus 25:4', 'm'],
      ['When fire from the LORD consumed the offering, the people…', ['Shouted and fell down', 'Ran away', 'Stayed silent'], 0, 'Leviticus 9:24', 'h'],
      ['Which two sons of Aaron offered strange fire?', ['Nadab and Abihu', 'Eleazar and Ithamar', 'Hophni and Phinehas'], 0, 'Leviticus 10:1', 'h'],
      ['On the Day of Atonement the scapegoat was sent into the…', ['Wilderness', 'Sea', 'City'], 0, 'Leviticus 16:21-22', 'h'],
      ['“The life of the flesh is in the…”', ['Blood', 'Bones', 'Breath'], 0, 'Leviticus 17:11', 'h'],
      ['The tithe of the land is “holy unto the…”', ['LORD', 'King', 'Levites'], 0, 'Leviticus 27:30', 'h'],
      ['What was proclaimed throughout the land in the jubile?', ['Liberty', 'War', 'A new king'], 0, 'Leviticus 25:10', 'h'],
    ],
    verses: [
      { ref: 'Leviticus 19:2', text: 'Speak unto all the congregation of the children of Israel, and say unto them, Ye shall be holy: for I the LORD your God am holy.' },
      { ref: 'Leviticus 19:18', text: 'Thou shalt not avenge, nor bear any grudge against the children of thy people, but thou shalt love thy neighbour as thyself: I am the LORD.' },
      { ref: 'Leviticus 20:26', text: 'And ye shall be holy unto me: for I the LORD am holy, and have severed you from other people, that ye should be mine.' },
      { ref: 'Leviticus 6:13', text: 'The fire shall ever be burning upon the altar; it shall never go out.' },
      { ref: 'Leviticus 26:12', text: 'And I will walk among you, and will be your God, and ye shall be my people.' },
      { ref: 'Leviticus 17:11', text: 'For the life of the flesh is in the blood: and I have given it to you upon the altar to make an atonement for your souls: for it is the blood that maketh an atonement for the soul.' },
      { ref: 'Leviticus 19:32', text: 'Thou shalt rise up before the hoary head, and honour the face of the old man, and fear thy God: I am the LORD.' },
    ],
  },
};
// split a verse into 3–5 scroll pieces at punctuation, balanced by length
export function verseParts(text) {
  const bits = text.match(/[^,;:.!?]+[,;:.!?]*\s*/g).map(s => s.trim()).filter(Boolean);
  const want = Math.max(3, Math.min(5, Math.round(text.length / 30)));
  const parts = bits.slice();
  while (parts.length > want) { let bi = 0, bl = 1e9; for (let i = 0; i < parts.length - 1; i++) { const l = parts[i].length + parts[i + 1].length; if (l < bl) { bl = l; bi = i; } } parts.splice(bi, 2, parts[bi] + ' ' + parts[bi + 1]); }
  while (parts.length < want) { let bi = 0; parts.forEach((p, i) => { if (p.length > parts[bi].length) bi = i; }); const w = parts[bi].split(' '); if (w.length < 2) break; const h = Math.ceil(w.length / 2); parts.splice(bi, 1, w.slice(0, h).join(' '), w.slice(h).join(' ')); }
  return parts;
}
for (const W of Object.values(WORLDS)) for (const v of W.verses) v.parts = verseParts(v.text);
export const bookById = id => BOOKS.find(b => b.id === id);
// stars: ★ finish · ★★ finish + 2 of 3 gates right · ★★★ all 3 gates right and the whole verse collected
export function starsFor(right, total, verseDone) { return right >= total && verseDone ? 3 : right >= Math.min(2, total) ? 2 : 1; }
