// CROSSCRAWL v1 — sample 5×5 mini puzzles (across-only clues)
export const PUZZLES = [
  {
    id: "p1",
    size: 5,
    // Row strings with '#' as blocks
    rows: ["ALERT", "ON#ME", "TEASE", "IN#TO", "START"],
    across: [
      { no: 1, row: 0, col: 0, len: 5, answer: "ALERT", clue: "Warn" },
      { no: 5, row: 1, col: 0, len: 2, answer: "ON", clue: "Operational" },
      { no: 6, row: 1, col: 3, len: 2, answer: "ME", clue: "The speaker" },
      { no: 7, row: 2, col: 0, len: 5, answer: "TEASE", clue: "Good‑naturedly rib" },
      { no: 12, row: 3, col: 0, len: 2, answer: "IN", clue: "Fashionable" },
      { no: 13, row: 3, col: 3, len: 2, answer: "TO", clue: "Toward" },
      { no: 14, row: 4, col: 0, len: 5, answer: "START", clue: "Begin" }
    ]
  },
  {
    id: "p2",
    size: 5,
    rows: ["SO#UP", "EARTH", "GO#IN", "AGREE", "SO#SO"],
    across: [
      { no: 1, row: 0, col: 0, len: 2, answer: "SO", clue: "Thus" },
      { no: 2, row: 0, col: 3, len: 2, answer: "UP", clue: "Awake" },
      { no: 3, row: 1, col: 0, len: 5, answer: "EARTH", clue: "Our planet" },
      { no: 8, row: 2, col: 0, len: 2, answer: "GO", clue: "Proceed" },
      { no: 9, row: 2, col: 3, len: 2, answer: "IN", clue: "Trendy" },
      { no: 10, row: 3, col: 0, len: 5, answer: "AGREE", clue: "Concur" },
      { no: 15, row: 4, col: 0, len: 2, answer: "SO", clue: "Mediocre, when doubled" },
      { no: 16, row: 4, col: 3, len: 2, answer: "SO", clue: "Mediocre, when doubled" }
    ]
  },
  {
    id: "p3",
    size: 5,
    rows: ["PLANT", "AT#NO", "ALONE", "WE#GO", "ROUTE"],
    across: [
      { no: 1, row: 0, col: 0, len: 5, answer: "PLANT", clue: "Factory" },
      { no: 6, row: 1, col: 0, len: 2, answer: "AT", clue: "Located by" },
      { no: 7, row: 1, col: 3, len: 2, answer: "NO", clue: "Negative reply" },
      { no: 8, row: 2, col: 0, len: 5, answer: "ALONE", clue: "By oneself" },
      { no: 13, row: 3, col: 0, len: 2, answer: "WE", clue: "You and I (collectively)" },
      { no: 14, row: 3, col: 3, len: 2, answer: "GO", clue: "Start signal" },
      { no: 15, row: 4, col: 0, len: 5, answer: "ROUTE", clue: "Path" }
    ]
  },
  {
    id: "p4",
    size: 5,
    rows: ["CHEER", "ON#US", "SNAKE", "TO#DO", "BERRY"],
    across: [
      { no: 1, row: 0, col: 0, len: 5, answer: "CHEER", clue: "Root for" },
      { no: 6, row: 1, col: 0, len: 2, answer: "ON", clue: "Operating" },
      { no: 7, row: 1, col: 3, len: 2, answer: "US", clue: "Them? No — ___" },
      { no: 8, row: 2, col: 0, len: 5, answer: "SNAKE", clue: "Slithering reptile" },
      { no: 13, row: 3, col: 0, len: 2, answer: "TO", clue: "Toward" },
      { no: 14, row: 3, col: 3, len: 2, answer: "DO", clue: "Perform" },
      { no: 15, row: 4, col: 0, len: 5, answer: "BERRY", clue: "Strawberry, e.g." }
    ]
  },
  {
    id: "p5",
    size: 5,
    rows: ["MUSIC", "IN#RE", "NOTES", "AS#IF", "PIANO"],
    across: [
      { no: 1, row: 0, col: 0, len: 5, answer: "MUSIC", clue: "What you might stream" },
      { no: 6, row: 1, col: 0, len: 2, answer: "IN", clue: "Fashionable" },
      { no: 7, row: 1, col: 3, len: 2, answer: "RE", clue: "Note after do" },
      { no: 8, row: 2, col: 0, len: 5, answer: "NOTES", clue: "Jots down" },
      { no: 13, row: 3, col: 0, len: 2, answer: "AS", clue: "Like" },
      { no: 14, row: 3, col: 3, len: 2, answer: "IF", clue: "Conditional word" },
      { no: 15, row: 4, col: 0, len: 5, answer: "PIANO", clue: "Keyboard instrument" }
    ]
  },
  {
    id: "p6",
    size: 5,
    rows: ["OCEAN", "BY#ME", "NORTH", "ON#IT", "SHORE"],
    across: [
      { no: 1, row: 0, col: 0, len: 5, answer: "OCEAN", clue: "Vast body of water" },
      { no: 6, row: 1, col: 0, len: 2, answer: "BY", clue: "Next to" },
      { no: 7, row: 1, col: 3, len: 2, answer: "ME", clue: "Object pronoun for the speaker" },
      { no: 8, row: 2, col: 0, len: 5, answer: "NORTH", clue: "Opposite of south" },
      { no: 13, row: 3, col: 0, len: 2, answer: "ON", clue: "Running (as a machine)" },
      { no: 14, row: 3, col: 3, len: 2, answer: "IT", clue: "That thing" },
      { no: 15, row: 4, col: 0, len: 5, answer: "SHORE", clue: "Coast" }
    ]
  }

  },
  {
    id: "room-002",
    title: "Word Square Mini 2",
    size: 4,
    grid: [
      "CARE",
      "AREA",
      "REAR",
      "EARN"
    ],
    acrossClues: [
      "Tend to; look after",
      "Region; measurement of surface",
      "Back part; also 'bring up'",
      "Receive as payment"
    ],
    downClues: [
      "Concern; attention",
      "Region; measurement of surface",
      "Back part; also 'bring up'",
      "Receive as payment"
    ]
  }

];
