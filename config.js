// This file contains data we can modify without resubmitting the app for approval.
//
// we try to always make es-link "happy"
/* eslint quote-props: ["error", "always"] */
/* eslint quotes: ["error", "double"] */

const facts = [
    {
      "categoryName": "show",
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
          fact: "Holiday Light's has a Facebook page - please like it",
          link: "https://www.facebook.com/HolidayLightsAtDeannaRoseFarmstead/"
        },
        "This show was created by Mark Calligari and his friends at Jolt Lighing."
      ]
   },
   {
     "categoryName": "farmstead",
      "name": "Deanna Rose Childern's Farmstead",
      "factPrefix": "Here is a fact about the Deanna Rose Childern's Farmstead:",
      "facts": [
        "The Framstead opened on Memorial Day in 1978.",
        "The Farmstead was renamed in 1985 to honor Deanna Sue Rose, an Overland Park police officer killed in the line of duty.",
        "The Farmstead served 11,000 visitors in it's first year - 1978",
        "Visitors can see more than 250 animals and birds at the Framestead."
      ]
    },
  {
    "categoryName": "animals",
    "name": "Farm animals",
    "factPrefix": "Here is a fact about the Farm animals:",
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
      "Male chickens are called roosters and crow at sunrise.",
    ]
  },
];

const noInputPrompts = [
  "I didn't hear that.",
  "If you're still there, say that again.",
  "We can stop now. See you soon."
];

const welcomeMessage =
  "Welcome to Farmsted Holiday Lights! I'd really rather not talk about %s." + 
  "I can tell you about the Holiday Light Show, the Farmstead, or farm animals.  What do you want to talk about?";

// TODO The sample code says:
//  Google Assistant will respond to more confirmation variants than just these suggestions
// ... what doses this mean?
const confirmSuggestions = [
  "Sure",
  "No thanks"
]

module.exports = {
  facts,
  noInputPrompts,
  welcomeMessage,
  confirmSuggestions
};
