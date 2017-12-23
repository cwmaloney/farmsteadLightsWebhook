// This file contains data we can modify without resubmitting the app for approval.
//
// we try to always make es-link "happy"
/* eslint quote-props: ["error", "always"] */
/* eslint quotes: ["error", "double"] */


//////////////////////////////////////////////////////////////////////////////
// teams
//////////////////////////////////////////////////////////////////////////////

const teamNameToColorsMap = {
  Baylor: [ 'green', 'green', 'gold', 'gold', 'green', 'green', 'gold', 'gold', 'green', 'green'],
  BVNW: [ 'purple', 'purple', 'white', 'white', 'purple',
          'purple', 'black', 'black', 'purple', 'purple' ],
  Chiefs: [ 'red', 'red', 'yellow', 'yellow', 'red', 'red', 'yellow', 'yellow', 'red', 'red'],
  Grinch: [ 'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen',
            'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen', 'grinchGreen' ],
  Halloween: [ 'orange', 'orange', 'black', 'black', 'orange',
               'orange', 'black', 'black', 'orange', 'orange'],
  Iowa: ["gold", "gold", "black", "black", "gold", "gold", "black", "black", "gold", "gold"],          
  ISU: ['red', 'red', 'gold', 'gold','red', 'red', 'gold', 'gold','red', 'red'],
  KSU: [ 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple',
              'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple', 'royalPurple' ],
  KU: [ 'blue', 'blue', 'red', 'red', 'blue', 'blue', 'red', 'red', 'blue', 'blue' ],
  Mavericks: [ 'orange', 'orange', 'orange', 'orange', 'lightBlue',
              'lightBlue', 'orange', 'orange', 'orange', 'orange'],
  MNU: [ 'blue', 'blue', 'blue', 'blue', 'fuchsia',
              'fuchsia', 'blue', 'blue', 'blue', 'blue',],
  MU: [ 'gold', 'gold', 'black', 'black', 'gold',
              'gold', 'black', 'black', 'gold', 'gold'],
  Nebraska: [ 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red', 'red' ],
  Neptunes: [ 'darkBlue', 'darkBlue', 'white', 'white', 'darkBlue',
              'darkBlue', 'white', 'white', 'darkBlue', 'darkBlue' ],
  "Olathe South": [ 'blue', 'gold', 'gold', 'gold', 'blue',
              'blue', 'gold', 'gold', 'gold', 'blue'],
  Oklahoma: [ "crimson", "crimson", "cream", "cream", "crimson", "crimson", "cream", "cream", "crimson", "crimson" ],
  OSU: [ "orange", "orange", "black", "black", "orange", "orange", "black", "black", "orange", "orange" ],
  PSU: [ 'crimson', 'crimson', 'gold', 'gold', 'crimson',
              'crimson', 'gold', 'gold', 'crimson', 'crimson'],
  Rainbow: [ 'darkRed', 'red', 'orangeRed', 'orange', 'yellow',
             'chartreuse', 'green', 'blue', 'indigo', 'violet'],
  Reindeer: [ 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown',
              'darkBrown', 'darkBrown', 'darkBrown', 'red', 'black'],
  Rockhurst: [ 'royalBlue', 'royalBlue', 'white', 'white', 'royalBlue',
               'royalBlue', 'white', 'white', 'royalBlue', 'royalBlue'],
  Royals: [ 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue', 'blue'],
  Rudolph: [ 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown', 'darkBrown',
             'darkBrown', 'darkBrown', 'darkBrown', 'red', 'black'],
  Santa: [ 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white', 'red', 'white'],
  Snow: [ 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow', 'snow'],
  Sporting: [ 'darkIndigo', 'darkIndigo', 'sportingBlue', 'sportingBlue', 'darkIndigo', 
              'darkIndigo', 'sportingBlue', 'sportingBlue', 'darkIndigo', 'darkIndigo'],
  "STA Saints": [ 'blue', 'blue', 'gold','gold', 'blue', 'blue', 'gold','gold','blue', 'blue' ],
  TCU: [ 'hornedFrogPurple', 'hornedFrogPurple', 'white', 'white', 'hornedFrogPurple',
         'hornedFrogPurple', 'white', 'white', 'hornedFrogPurple', 'hornedFrogPurple' ],
  Texas: [ 'orange', 'orange', 'white', 'white', 'orange',
           'orange', 'white', 'white', 'orange', 'orange'],
  TTU: [ 'scarlet', 'scarlet', 'black', 'black', 'scarlet',
         'scarlet', 'black', 'black', 'scarlet', 'scarlet' ],
  UMKC: [ 'blue', 'blue', 'gold', 'gold', 'blue', 'blue', 'gold', 'gold', 'blue', 'blue'],
  USA: [ 'red', 'red', 'red', 'red', 'white', 'white', 'blue', 'blue', 'blue', 'blue' ],
};

//////////////////////////////////////////////////////////////////////////////
// colors
//////////////////////////////////////////////////////////////////////////////

const colorNameToChannelDataMap = {
  on: [ 255, 255, 255 ],
  white: [ 255, 255, 255 ],
  snow: [ 225, 225, 225 ],
  celadon: [ 162, 215, 165 ],
  gray: [ 32, 32, 32 ],
  silver: [ 175, 175, 175 ],
  
  red: [ 255, 0, 0 ],
  crimson: [ 0x84, 0x16, 0x17],
  //crimson: [ 220, 20, 60 ],
  darkRed: [20, 0, 0],
  scarlet: [ 204, 0 , 0 ],

  pink: [ 255, 102, 178 ],
  darkPink: [ 175, 75, 140 ],
  maroon: [ 128, 0, 0],
  fuchsia: [ 255, 0, 255 ],
  magenta: [ 255, 0, 255 ],
  
  orange: [ 255, 127, 0 ],
  orangeRed: [255, 69, 0],

  yellow: [ 255, 255, 0 ],

  cream: [ 0xFD, 0xF9, 0xD8],
  brown: [ 32, 20, 11 ],
  darkBrown: [ 20, 13, 5 ],
  gold: [ 215, 185, 0 ],

  yellowGreen: [ 154, 205, 50 ],
  chartreuse: [ 63, 128, 0 ],

  green:[ 0, 255, 0 ],
  darkGreen: [ 0, 30, 0 ],
  grinchGreen: [ 40, 190, 0 ],
  olive: [ 45, 65, 0 ],
  turquoise: [ 64, 224, 204 ],
  darkTurquoise: [ 0, 206, 209 ],
  lime: [127, 255, 0],
  teal: [ 0, 128, 128],

  blueGreen: [ 13, 152, 186 ],
  cyan: [ 0, 250, 250],
  darkCyan: [ 0, 90, 90 ],
 
  blue: [ 0, 0, 255 ],
  lightBlue: [ 107, 164, 184 ],
  cornFlowerBlue: [ 70, 119, 207 ],
  darkBlue: [ 0, 0, 30],
  royalBlue: [ 65, 105, 225],
  navy: [0, 0, 25],
  midnightBlue: [ 25, 25, 112 ],
  sportingBlue: [ 147, 177, 215 ],
  
  indigo: [ 28, 0, 64 ],
  darkIndigo: [ 7, 0, 16 ],

  blueViolet: [ 138, 43, 226 ],
  
  purple: [ 75, 0, 128 ],
  royalPurple: [ 102, 51, 153 ],
  hornedFrogPurple: [ 77, 25, 121 ],

  violet: [ 139, 0, 255 ],
  darkViolet: [ 35, 0, 58 ],

  black: [ 0, 0, 0 ],
  off:  [ 0, 0, 0 ]
};

//////////////////////////////////////////////////////////////////////////////
// Commands that can be sent to elements
/////////////////////////////////////////////////////////////////////////////
    /* -----
    Elf parts
      1 - body/head/outline
      2 - eyes
      3 - unused - future
      4 - top mouth
      5 - middle mouth
      6 - bottom mouth
      7 - open mouth
      8 - ooh circle mouth
    ----- */

const commands = {
  blink: {
    elf : {
      directives: [
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 5000 }
      ]
    }
  },
  party: {
    elf : {
      directives: [
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 1000 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255,   0, 0, 0, 0, 0, 255, 0 ], duration: 250 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 0, 255 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 255,   0, 255,   0,   0 ], duration: 2000 },
        { channelData: [ 255,   0, 0, 255,   0, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0, 255, 255,   0,   0 ], duration: 2000 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 10000 }
      ]
    }
  },
  flash: {
    elf : {
      directives: [
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 0, 255 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 0, 255 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 0, 255 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 0, 255 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 500 },
        { channelData: [ 0, 0, 0, 0, 0, 0, 0, 0 ], duration: 500 },
        { channelData: [ 255, 255, 0, 0, 0, 0, 255, 0 ], duration: 5000 }
      ]
    }
  },
  smile: {
    elf: {
      directives: [
        { channelData: [ 255, 255, 0,   0,   0,   0, 255,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 255,   0, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0, 255, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0,   0,   0, 255,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0, 255,   0, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0, 255, 255,   0,   0 ], duration: 1000 },
        { channelData: [ 255, 255, 0,   0,   0,   0, 255,   0 ], duration: 5000 }
      ]
    }
  }
};

//////////////////////////////////////////////////////////////////////////////
// DMX mapping
//////////////////////////////////////////////////////////////////////////////

const elements = {
  tree:    { elementType: "tree", queueName: "trees", count: 10, universe: 0, startChannel: 1, channelsPerElement: 3},
  buddy:   { elementType: "elf", queueName: "buddy", count: 1, universe: 1, startChannel: 97, channelsPerElement: 8 },
  kringle: { elementType: "elf", queueName: "kringle", count: 1, universe: 1, startChannel: 105, channelsPerElement: 8 },
  bliss:   { elementType: "elf", queueName: "bliss", count: 1, universe: 2, startChannel: 113, channelsPerElement: 8 },
  hermey:  { elementType: "elf", queueName: "hermey", count: 1, universe: 2, startChannel: 121, channelsPerElement: 8 }
};

const treeDirectiveDuration = 5000;
const maxRequestsPerSession = 2;

const universes = [
  { universe: 0, "address": "10.0.0.18" },
  { universe: 1, "address": "10.7.90.1" },
  { universe: 2, "address": "10.7.90.2" }
];

//////////////////////////////////////////////////////////////////////////////
// facts
//////////////////////////////////////////////////////////////////////////////

const factCategories = new Map();

factCategories.set("show", {
  "name": "Holiday Lights at Deanna Rose Farmstead",
  "factPrefix": "Here's a fact about the Holiday Lights:",
  "facts": [
    {
      fact: "The show uses thousands of LED lights.",
      image: {
        url: "https://www.opkansas.org/wp-content/uploads/highlighted_stories/Holiday-lights-300x184.jpg",
        name: "Holiday Lights on Farmstead Lane"
      }
    },
    "Each light in the show can display any of twenty million colors.",
    {
      fact: "Holiday Light's has a Facebook page - please like it.",
      link: "https://www.facebook.com/HolidayLightsAtDeannaRoseFarmstead/"
    },
    "This show was created by Mark Calligari and his friends at Jolt Lighing."
  ]
});

factCategories.set("farmstead", {
    "name": "Deanna Rose Childern's Farmstead",
    "factPrefix": "Here is a fact about the Deanna Rose Childern's Farmstead:",
    "facts": [
      "The Framstead opened on Memorial Day in 1978.",
      "The Farmstead was renamed in 1985 to honor Deanna Sue Rose, an Overland Park police officer killed in the line of duty.",
      "The Farmstead served 11,000 visitors in it's first year - 1978",
      "Visitors can see more than 250 animals and birds at the Framestead."
    ]
  });

factCategories.set("animals", {
  "name": "Farm animals",
  "factPrefix": "Here is a fact about the farm animals:",
  "facts": [
    {
      fact: "Cats love to sleep, eat, and purr.",
      image:  {
        url: "https://developers.google.com/web/fundamentals/accessibility/semantics-builtin/imgs/160204193356-01-cat-500.jpg",
        name: "Gray Cat"
      }
      // TODO add a sound
    },
    "Pigs say oink.",
    "Sheep are wooley.",
    "Cows give milk.",
    "Cows say moo.",
    "Goats give milk and will eat almost anything.",
    "Female chickens are called hens and lay eggs almost daily.",
    "Male chickens are called roosters and crow at sunrise and anytime they think you are sleeping.",
    ]
  });

module.exports = {
  teamNameToColorsMap,
  colorNameToChannelDataMap,
  commands,
  elements,
  treeDirectiveDuration,
  maxRequestsPerSession,
  universes,
  factCategories
};
