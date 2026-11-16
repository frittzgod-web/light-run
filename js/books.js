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
// v14.3 · EPISODES: several visions inside each book. Each episode has its own scenery variation (sky + landmark props on
// the book's world kit), story card, questions (by level e/m/h, at least one of each), verses and finale boss.
// Questions that already existed keep their exact wording, so saved progress (keyed by question text) carries over.
// boss.id is the finale mechanic: 'flood' = a telegraphed hazard rolls down one lane (haz = obstacle type),
// 'chariots' = chariots charge from behind down a warned lane, 'collapse' = stones fall where shadows show.
const Q = (book, list) => list.map(x => typeof x === 'string' ? WORLDS[book].quiz.find(q => q[0] === x) || (() => { throw new Error('missing question: ' + x); })() : x);
const V = (book, refs, extra = []) => [...refs.map(r => WORLDS[book].verses.find(v => v.ref === r) || (() => { throw new Error('missing verse: ' + r); })()), ...extra];
export const EPISODES = {
  genesis: [
    { id: 'gen_eden', name: 'Creation & Eden', icon: '🌳', place: 'The Garden of Eden',
      story: 'In the beginning God created the heaven and the earth, and saw that it was very good. He made man in His own image and planted a garden eastward in Eden. Run the garden path and gather the light!',
      look: { props: ['lifeTree'] },
      boss: { id: 'flood', haz: 'vVine', rain: false, water: false, icon: '🌿', title: 'THORNS AND THISTLES', sub: 'Thorny vines spring up in one lane at a time: slide under or change lane (Genesis 3:18)', warn: '🌿 Thorns in the {l} lane!', winTitle: 'A promise of a Saviour!', win: ['And I will put enmity between thee and the woman, and between thy seed and her seed; it shall bruise thy head, and thou shalt bruise his heel.', 'Genesis 3:15'] },
      quiz: Q('genesis', ['What did God create on the first day?', 'On which day did God rest from all His work?', 'What was the name of the first man?', 'Who was the first woman?', 'God planted a garden eastward in…', 'Which creature tempted Eve in the garden?', 'Who killed his brother Abel?',
        ['What was Adam formed from?', ['The dust of the ground', 'A river stone', 'A tree'], 0, 'Genesis 2:7', 'm'],
        ['On which day did God make the sun, moon and stars?', ['The fourth', 'The first', 'The sixth'], 0, 'Genesis 1:16-19', 'h'],
        ['What kept the way of the tree of life after Adam and Eve left Eden?', ['Cherubims and a flaming sword', 'Two stone lions', 'A high wall'], 0, 'Genesis 3:24', 'h']]),
      verses: V('genesis', ['Genesis 1:1', 'Genesis 1:27', 'Genesis 1:31', 'Genesis 2:7']) },
    { id: 'gen_flood', name: 'The Flood & the Ark', icon: '🚢', place: "Noah's Ark",
      story: 'The earth was filled with violence, but Noah found grace in the eyes of the LORD. Noah built the ark just as God commanded him. The clouds are gathering: run to the ark!',
      look: { props: ['ark'], sky: { top: '#5d6f86', mid: '#b9c2c9', bot: '#7f9a74', fog: '#b4bcc1', sun: '#e6edf3', sunI: 1.7, hemiI: 1.35 }, fogMul: 1.15 },
      boss: { id: 'flood', icon: '🌧️', title: 'THE GREAT FLOOD', sub: 'The waters rise! Waves roll down one lane at a time: jump them or change lane (Genesis 7)', winTitle: 'The rainbow appears!', win: ['I do set my bow in the cloud, and it shall be for a token of a covenant between me and the earth.', 'Genesis 9:13'] },
      quiz: Q('genesis', ['Who built the ark?', 'What sign did God set in the cloud after the flood?', 'What came back to Noah with an olive leaf?', 'The tower where God confused the language was…',
        ['How many days and nights did the rain fall?', ['Forty', 'Seven', 'Seventy'], 0, 'Genesis 7:12', 'e'],
        ['What wood did God tell Noah to build the ark with?', ['Gopher wood', 'Cedar', 'Olive wood'], 0, 'Genesis 6:14', 'h'],
        ['Upon which mountains did the ark rest?', ['Ararat', 'Sinai', 'Carmel'], 0, 'Genesis 8:4', 'h']]),
      verses: V('genesis', ['Genesis 9:13'], [{ ref: 'Genesis 6:8', text: 'But Noah found grace in the eyes of the LORD.' }]) },
    { id: 'gen_abraham', name: "Abraham's Journey", icon: '⭐', place: 'The Road to the Promised Land',
      story: 'God called Abram to leave his country for a land He would show him, and promised to make of him a great nation. Abram believed the LORD and went. Walk by faith under the stars!',
      look: { props: ['tents', 'altar'], sky: { top: '#2c3e7a', mid: '#f3a76b', bot: '#b9a06a', fog: '#e7b98a', sun: '#ffc58a', sunI: 2.0, hemiS: '#ffd8b0', hemiI: 1.45, sunPos: [-0.5, 0.12, -1] } },
      boss: { id: 'collapse', icon: '⛰️', title: 'THE ROAD TO MORIAH', sub: 'Rocks tumble down the mountain: watch the shadows (Genesis 22)', warn: '⚠️ Watch the shadows: rocks are falling!', winTitle: 'The LORD will provide!', win: ['And Abraham called the name of that place Jehovahjireh: as it is said to this day, In the mount of the LORD it shall be seen.', 'Genesis 22:14'] },
      quiz: Q('genesis', ['God told Abraham to count the…', 'Who was the son God promised to Abraham and Sarah?', 'What did God provide in place of Isaac on the mountain?',
        ["What was Abraham's name before God changed it?", ['Abram', 'Abel', 'Aaron'], 0, 'Genesis 17:5', 'e'],
        ["Who was Abraham's wife?", ['Sarah', 'Rebekah', 'Rachel'], 0, 'Genesis 17:15', 'e'],
        ["From which city did Abram's family set out?", ['Ur of the Chaldees', 'Babylon', 'Nineveh'], 0, 'Genesis 11:31', 'h']]),
      verses: V('genesis', ['Genesis 12:2'], [{ ref: 'Genesis 15:6', text: 'And he believed in the LORD; and he counted it to him for righteousness.' }]) },
    { id: 'gen_joseph', name: 'Joseph in Egypt', icon: '🌾', place: 'The Land of Egypt',
      story: "Joseph's brothers sold him, but the LORD was with Joseph in Egypt. From the pit to the prison to the palace, God turned evil into good and saved much people alive. Run through Egypt!",
      look: { props: ['pyramids'], sky: { top: '#5aa9e6', mid: '#ffe0a0', bot: '#e3c27d', fog: '#f2dca6', sun: '#fff1c8', hemiG: '#9a7a3a' } },
      boss: { id: 'chariots', icon: '🐎', title: "PHARAOH'S CHARIOTS", sub: 'Royal chariots race up behind you: leave the warned lane (Genesis 41:43)', warn: '🐎 Royal chariot behind you! Leave the {l} lane!', winTitle: 'Ruler over Egypt!', win: ['And Pharaoh said unto his servants, Can we find such a one as this is, a man in whom the Spirit of God is?', 'Genesis 41:38'] },
      quiz: Q('genesis', ['Who sold his birthright for red pottage?', 'In his dream at Bethel, Jacob saw…', 'Israel gave Joseph a coat of many…', "Joseph's brothers sold him for how many pieces of silver?", 'Joseph became a ruler over which land?',
        ["Who was Joseph's father?", ['Jacob', 'Isaac', 'Abraham'], 0, 'Genesis 37:3 · Israel is Jacob (Genesis 32:28)', 'e'],
        ["Where did Joseph's brothers first cast him?", ['Into a pit', 'Into a river', 'Into a prison'], 0, 'Genesis 37:24', 'm'],
        ['In Pharaoh’s dream, seven lean kine ate up seven…', ['Fat kine', 'Lions', 'Camels'], 0, 'Genesis 41:4 · kine are cows', 'm']]),
      verses: V('genesis', ['Genesis 50:20'], [{ ref: 'Genesis 39:2', text: 'And the LORD was with Joseph, and he was a prosperous man; and he was in the house of his master the Egyptian.' }]) },
  ],
  exodus: [
    { id: 'ex_bush', name: 'The Burning Bush', icon: '🔥', place: 'Horeb, the Mountain of God',
      story: 'Moses kept the flock of Jethro near Horeb when a bush burned with fire and was not consumed. God called to him out of the bush and sent him to bring His people out of Egypt.',
      look: { nosea: true, props: ['horeb', 'bush', 'desert'], sky: { top: '#5aa2dc', mid: '#f6d29a', bot: '#c99c62', fog: '#e4c48e', sun: '#fff0c8', sunI: 2.3, hemiS: '#fff0d0', hemiG: '#9a7a4a', hemiI: 1.5, sunPos: [0.3, 0.5, -1] }, fogMul: 0.55 },
      boss: { id: 'flood', haz: 'vRock', rain: false, icon: '🪨', title: 'THE ROCKY ROAD TO HOREB', sub: 'Rocks roll down one lane at a time: jump them or change lane (Exodus 3:1)', warn: '🪨 Rock rolling in the {l} lane!', winTitle: 'Holy ground!', win: ['And he said, Draw not nigh hither: put off thy shoes from off thy feet, for the place whereon thou standest is holy ground.', 'Exodus 3:5'] },
      quiz: Q('exodus', ['Where was baby Moses hidden?', 'Who found baby Moses by the river?', 'God spoke to Moses out of a…', 'Who spoke for Moses to the people and to Pharaoh?', 'What name did God give for Himself at the bush?', "Who was Moses' father-in-law, the priest of Midian?",
        ['What did God tell Moses to put off at the bush?', ['His shoes', 'His coat', 'His ring'], 0, 'Exodus 3:5', 'm']]),
      verses: V('exodus', ['Exodus 3:14'], [{ ref: 'Exodus 4:12', text: 'Now therefore go, and I will be with thy mouth, and teach thee what thou shalt say.' }]) },
    { id: 'ex_plagues', name: 'The Plagues & the Passover', icon: '🐸', place: 'The Land of Egypt',
      story: 'Pharaoh would not let Israel go, so the LORD sent plagues upon Egypt. On the Passover night the blood of the lamb on the door posts kept His people safe. Run through Egypt!',
      look: { nosea: true, props: ['pyramids', 'doors', 'desert'], sky: { top: '#3a1a24', mid: '#c0603e', bot: '#6b3a2a', fog: '#a3644a', sun: '#ffb08a', sunI: 1.6, hemiS: '#ffc0a0', hemiG: '#5a3020', hemiI: 1.35, sunPos: [-0.4, 0.2, -1] }, fogMul: 0.9 },
      boss: { id: 'collapse', icon: '🌩️', title: 'HAIL AND FIRE', sub: 'Hail falls on Egypt: watch the shadows (Exodus 9:23-24)', warn: '⚠️ Watch the shadows: hail is falling!', winTitle: 'Safe in Goshen!', win: ['Only in the land of Goshen, where the children of Israel were, was there no hail.', 'Exodus 9:26'] },
      quiz: Q('exodus', ['How many plagues did God send on Egypt?', 'What was the first plague on Egypt?', 'At the Passover the blood of the lamb went on the…',
        ['Who did Moses tell, “Let my people go”?', ['Pharaoh', 'Herod', 'Nebuchadnezzar'], 0, 'Exodus 5:1', 'e'],
        ["Aaron's rod became a…", ['Serpent', 'Tree', 'Dove'], 0, 'Exodus 7:10', 'h'],
        ['Which plague came just before the death of the firstborn?', ['Darkness', 'Hail', 'Frogs'], 0, 'Exodus 10:22; 11:5', 'h']]),
      verses: V('exodus', [], [{ ref: 'Exodus 12:13', text: 'And the blood shall be to you for a token upon the houses where ye are: and when I see the blood, I will pass over you, and the plague shall not be upon you to destroy you, when I smite the land of Egypt.' }, { ref: 'Exodus 9:16', text: 'And in very deed for this cause have I raised thee up, for to shew in thee my power; and that my name may be declared throughout all the earth.' }]) },
    { id: 'ex_redsea', name: 'Through the Red Sea', icon: '🌊', place: 'Through the Red Sea',
      story: "With Pharaoh's army behind them, Moses stretched out his hand over the sea and the LORD parted the waters. The children of Israel went through on dry ground. “The LORD shall fight for you.” Run the seabed!",
      look: {},
      boss: { id: 'chariots', icon: '🐎', title: "PHARAOH'S CHARIOTS", sub: 'Chariots charge from behind! Leave the warned lane (Exodus 14)', winTitle: 'Safe on the other side!', win: ['The LORD shall fight for you, and ye shall hold your peace.', 'Exodus 14:14'] },
      quiz: Q('exodus', ['What did God part so Israel could cross on dry ground?', 'What led Israel by night in the wilderness?', 'What did Miriam play as she sang to the LORD?',
        ['Who stretched out his hand over the sea?', ['Moses', 'Aaron', 'Joshua'], 0, 'Exodus 14:21', 'e'],
        ['What did the LORD use all night to drive the sea back?', ['A strong east wind', 'An earthquake', 'Fire'], 0, 'Exodus 14:21', 'm'],
        ['How were the bitter waters of Marah made sweet?', ['A tree was cast into them', 'Salt was added', 'Moses struck them'], 0, 'Exodus 15:25', 'h']]),
      verses: V('exodus', ['Exodus 14:13', 'Exodus 14:14', 'Exodus 15:2']) },
    { id: 'ex_sinai', name: 'Manna & Mount Sinai', icon: '⛰️', place: 'The Wilderness of Sinai',
      story: 'In the wilderness God rained bread from heaven: manna every morning. At Mount Sinai the LORD came down in fire and gave His people the Ten Commandments. Run to the mountain!',
      look: { nosea: true, props: ['sinai', 'manna', 'desert'], sky: { top: '#5f74a0', mid: '#e2cfae', bot: '#a88c66', fog: '#cdbb9e', sun: '#fff0d0', sunI: 2.0, hemiS: '#f2ead8', hemiG: '#8a7350', hemiI: 1.45, sunPos: [0.2, 0.6, -1] }, fogMul: 0.55 },
      boss: { id: 'collapse', icon: '⛰️', title: 'THE MOUNT QUAKES', sub: 'Mount Sinai shakes and stones fall: watch the shadows (Exodus 19:18)', warn: '⚠️ The mount is quaking: stones are falling!', winTitle: 'The law of the LORD!', win: ['I am the LORD thy God, which have brought thee out of the land of Egypt, out of the house of bondage.', 'Exodus 20:2'] },
      quiz: Q('exodus', ['What bread did God send from heaven?', '“Honour thy father and thy…”', 'God gave the Ten Commandments on Mount…', 'What idol did the people make while Moses was on the mount?', 'Moses struck the rock in Horeb and out came…', "Who held up Moses' hands in the battle with Amalek?"]),
      verses: V('exodus', ['Exodus 20:3', 'Exodus 20:12', 'Exodus 33:14']) },
  ],
  leviticus: [
    { id: 'lev_tabernacle', name: 'The Tabernacle', icon: '🏺', place: 'The Holy Road & the Tabernacle',
      story: 'The LORD called unto Moses out of the tabernacle. Aaron and his sons were anointed as priests, the lamps burned with pure olive oil, and the fire on the altar was never to go out.',
      look: {},
      boss: { id: 'collapse', icon: '🏛️', title: 'THE AQUEDUCT SHAKES', sub: 'Stones are falling! Watch the shadows and keep your lamp burning', winTitle: 'The fire never went out!', win: ['The fire shall ever be burning upon the altar; it shall never go out.', 'Leviticus 6:13'] },
      quiz: Q('leviticus', ['Who was anointed as the high priest?', 'The priests were Aaron’s sons, of the tribe of…', 'From where did the LORD speak to Moses in Leviticus 1:1?', 'The fire on the altar was never to…', 'The tabernacle lamps burned with pure oil from…', 'When fire from the LORD consumed the offering, the people…', 'Which two sons of Aaron offered strange fire?']),
      verses: V('leviticus', ['Leviticus 6:13', 'Leviticus 26:12', 'Leviticus 20:26']) },
    { id: 'lev_atonement', name: 'The Day of Atonement', icon: '🐐', place: 'Into the Wilderness',
      story: 'Once a year the high priest went into the holy place to make an atonement for all the people, and the scapegoat carried their sins away into the wilderness. Christians see in it a picture of Jesus, the Lamb of God who taketh away the sin of the world (John 1:29).',
      look: { props: ['altar', 'smoke'], sky: { top: '#3b3570', mid: '#f0a46a', bot: '#b88a5a', fog: '#e0a878', sun: '#ffb27a', sunI: 2.1, hemiS: '#ffd2b0', hemiI: 1.4, sunPos: [0.5, 0.1, -1] } },
      boss: { id: 'flood', haz: 'vStone', rain: false, icon: '🐐', title: 'INTO THE WILDERNESS', sub: 'Stones roll across the wilderness road: jump them or change lane (Leviticus 16:22)', warn: '🪨 Stone rolling in the {l} lane!', winTitle: 'Clean before the LORD!', win: ['For on that day shall the priest make an atonement for you, to cleanse you, that ye may be clean from all your sins before the LORD.', 'Leviticus 16:30'] },
      quiz: Q('leviticus', ['On the Day of Atonement the scapegoat was sent into the…', '“The life of the flesh is in the…”',
        ['How often was the Day of Atonement kept?', ['Once a year', 'Every week', 'Every month'], 0, 'Leviticus 16:34', 'e'],
        ['Who went into the holy place to make the atonement?', ['The high priest', 'Every Levite', 'The king'], 0, 'Leviticus 16:2-3, 32', 'e'],
        ['The Day of Atonement fell on which day of the seventh month?', ['The tenth', 'The first', 'The fifteenth'], 0, 'Leviticus 23:27', 'm'],
        ["What did Aaron lay on the live goat's head as he confessed Israel's sins?", ['Both his hands', 'Oil', 'A crown'], 0, 'Leviticus 16:21', 'm']]),
      verses: V('leviticus', ['Leviticus 17:11'], [{ ref: 'Leviticus 16:34', text: 'And this shall be an everlasting statute unto you, to make an atonement for the children of Israel for all their sins once a year. And he did as the LORD commanded Moses.' }]) },
    { id: 'lev_feasts', name: 'The Feasts & the Holy Road', icon: '🎺', place: 'The Feasts of the LORD',
      story: 'God gave Israel holy feasts: the Passover, the feast of booths, and the year of jubile when liberty was proclaimed through all the land. “Thou shalt love thy neighbour as thyself.”',
      look: { props: ['booths'], sky: { top: '#55b4ff', mid: '#fff0c0', bot: '#e8c88a', fog: '#f6e2b0', sun: '#fff3d0', sunI: 2.6, hemiI: 1.65, sunPos: [0.1, 0.55, -1] }, fogMul: 0.6 },
      boss: { id: 'flood', haz: 'vPots', rain: false, icon: '🎺', title: 'THE FEAST CROWDS', sub: 'Water pots roll down one lane at a time: jump them or change lane (Leviticus 23)', warn: '🏺 Pots rolling in the {l} lane!', winTitle: 'Liberty proclaimed!', win: ['And ye shall hallow the fiftieth year, and proclaim liberty throughout all the land unto all the inhabitants thereof: it shall be a jubile unto you; and ye shall return every man unto his possession, and ye shall return every man unto his family.', 'Leviticus 25:10'] },
      quiz: Q('leviticus', ['“Ye shall be holy: for I the LORD your God am…”', '“Thou shalt love thy neighbour as…”', 'At harvest, what was left for the poor and the stranger?', 'Leviticus 19:14: do not put a stumblingblock before the…', '“Rise up before the hoary head, and honour the face of the…”', 'The year of jubile came every how many years?', 'Every seventh year the land was to have a…', 'The tithe of the land is “holy unto the…”', 'What was proclaimed throughout the land in the jubile?',
        ['At the feast of tabernacles Israel dwelt for seven days in…', ['Booths', 'Palaces', 'Caves'], 0, 'Leviticus 23:42', 'm']]),
      verses: V('leviticus', ['Leviticus 19:2', 'Leviticus 19:18', 'Leviticus 19:32']) },
  ],
};
// the book lists hold every episode's questions and verses (the book card, My Verses and old saves use them)
for (const [book, eps] of Object.entries(EPISODES)) {
  const W = WORLDS[book];
  eps.forEach((e, i) => { e.book = book; e.n = i + 1; for (const q of e.quiz) if (!W.quiz.includes(q)) W.quiz.push(q); for (const v of e.verses) if (!W.verses.some(x => x.ref === v.ref)) W.verses.push(v); for (const lv of ['e', 'm', 'h']) if (!e.quiz.some(q => q[4] === lv)) throw new Error(e.id + ' needs a level ' + lv + ' question'); });
}
export const episodesOf = book => EPISODES[book] || [];
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
