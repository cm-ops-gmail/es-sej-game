/* Lesson content. Games use the real questions from each lesson's Wordwall reference game;
   missions, power words and speaking rounds come from the lesson slides.
   Corrections made to reference content are listed in CONTENT-NOTES.md. */
window.SEJ_LESSONS = [
 {
  "code": "1.1",
  "unit": 1,
  "title": "Hey, That's Me!",
  "emoji": "👋",
  "hero": "bhasha",
  "mission": {
   "en": "Introduce yourself and talk to new friends!",
   "bn": "নিজের পরিচয় দাও আর নতুন বন্ধুদের সাথে কথা বলো!"
  },
  "words": [
   [
    "Name",
    "নাম",
    true
   ],
   [
    "Age",
    "বয়স",
    true
   ],
   [
    "Hobby",
    "শখ"
   ],
   [
    "Favorite",
    "প্রিয়"
   ],
   [
    "Introduce",
    "পরিচয় দেওয়া"
   ]
  ],
  "games": [
   {
    "t": "unjumble",
    "title": "Introduce Yourself",
    "items": [
     "👋|Hi my name is Robin.",
     "🎂|I am 12 years old.",
     "🏙️|I am from Dhaka.",
     "🏫|I study at School.",
     "🤝|Nice to meet you."
    ]
   },
   {
    "t": "whack",
    "title": "Say Hello!",
    "prompt": "Tap what you say when you meet your teacher!",
    "good": [
     "Good Morning",
     "Greetings",
     "Happy to see you",
     "How have you been?",
     "I hope you’re having a great day",
     "Hi, teacher!",
     "Nice to see you again",
     "Good afternoon, teacher."
    ],
    "bad": [
     "You are a bad person",
     "I hate you",
     "I don't like you",
     "I’m not listening to you",
     "This class is useless"
    ]
   },
   {
    "t": "quiz",
    "show": true,
    "title": "Classroom Quiz Show",
    "items": [
     [
      "What do you say when you leave the classroom?",
      "Goodbye, teacher!",
      [
       "Go away"
      ],
      "🚪"
     ],
     [
      "What do you say when someone says ‘Thank you’ to you?",
      "You’re welcome!",
      [
       "Bon appétit!"
      ],
      "😊"
     ],
     [
      "What do you say when you want to enter a room but the door is closed?",
      "May I come in?",
      [
       "Bye"
      ],
      "🚪"
     ],
     [
      "What is your name?",
      "Hi, my name is Robin.",
      [
       "Where are you from?"
      ],
      "📛"
     ],
     [
      "If you want to talk about age, ask...",
      "How old are you?",
      [
       "Where do you live?"
      ],
      "🎂"
     ],
     [
      "If they have pets, ask...",
      "Do you have any pets?",
      [
       "Do you have any brothers or sisters?"
      ],
      "🐶"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What is your name?",
    "Hi, my name is ___.",
    "Hi, my name is Robin."
   ],
   [
    "Where are you from?",
    "I’m from ___.",
    "I’m from Dhaka."
   ],
   [
    "How old are you?",
    "I am ___ years old.",
    "I am 10 years old."
   ],
   [
    "What do you like to do when you are free?",
    "I like to ___.",
    "I like to draw pictures."
   ]
  ]
 },
 {
  "code": "1.2",
  "unit": 1,
  "title": "My Buddies",
  "emoji": "🤝",
  "hero": "mathman",
  "mission": {
   "en": "Talk about your buddies and ask what they like!",
   "bn": "বন্ধুর বর্ণনা দাও আর তার পছন্দ-অপছন্দ জিজ্ঞেস করো!"
  },
  "words": [
   [
    "Helpful",
    "যে অন্যদের সাহায্য করে",
    true
   ],
   [
    "Smart",
    "যে নতুন কিছু শেখা ও সমস্যা সমাধানে পারদর্শী",
    true
   ],
   [
    "Caring",
    "যে অন্যের প্রতি যত্নশীল",
    true
   ],
   [
    "Funny",
    "যে অন্যকে হাসাতে পারে",
    true
   ],
   [
    "Laugh",
    "হাসি",
    true
   ]
  ],
  "games": [
   {
    "t": "anagram",
    "title": "Buddy Words",
    "audio": true,
    "items": [
     [
      "teacher thinks my joke is funny",
      "শব্দগুলো একে একে সাজাও",
      "😂"
     ],
     [
      "she has a new toy that can laugh",
      "শব্দগুলো একে একে সাজাও",
      "🧸"
     ],
     [
      "she is really helpful",
      "শব্দগুলো একে একে সাজাও",
      "🤲"
     ],
     [
      "my mother is very caring",
      "শব্দগুলো একে একে সাজাও",
      "💗"
     ],
     [
      "my sister is smart",
      "শব্দগুলো একে একে সাজাও",
      "🧠"
     ]
    ]
   },
   {
    "t": "boxes",
    "title": "Who Is That Hero?",
    "items": [
     [
      "Who is the master of math?",
      "MathMan",
      [
       "Ms Bhasha"
      ],
      "🔢"
     ],
     [
      "Who can talk to plants and animals and understand their feelings?",
      "Nature Knight",
      [
       "MathMan"
      ],
      "🌳"
     ],
     [
      "Who can understand and speak any language?",
      "Ms Bhasha",
      [
       "Nature Knight"
      ],
      "🗣️"
     ],
     [
      "Who can control any technology or gadgets?",
      "Innovara",
      [
       "Nature Knight"
      ],
      "🔬"
     ]
    ]
   },
   {
    "t": "tf",
    "title": "Make Questions",
    "labels": [
     "Correct",
     "Not correct"
    ],
    "items": [
     [
      "What Mathman can do?",
      false,
      "🔢"
     ],
     [
      "Who can understand and speak any language?",
      true,
      "🗣️"
     ],
     [
      "Who talk can to plants and animals?",
      false,
      "🌳"
     ],
     [
      "Who can control any technology or gadgets?",
      true,
      "🔬"
     ],
     [
      "What your is favorite color?",
      false,
      "🎨"
     ],
     [
      "Why are you happy?",
      true,
      "😊"
     ]
    ]
   }
  ],
  "talk": [
   [
    "Who is your favourite and why?",
    "This is ___.",
    "This is Eyamim."
   ],
   [
    "Talk about your buddy.",
    "She is quite ___ and loves to ___.",
    "She is quite funny and loves to make people laugh."
   ],
   [
    "Say something nice about your buddy.",
    "She is my best friend and I ___.",
    "She is my best friend and I love her a lot."
   ],
   [
    "Ask your buddy a question.",
    "What is your favorite color?",
    "What is your favorite color?"
   ]
  ]
 },
 {
  "code": "1.3",
  "unit": 1,
  "title": "Action Adventure",
  "emoji": "🏕️",
  "hero": "knight",
  "mission": {
   "en": "Talk about fun things you do in your free time!",
   "bn": "অবসর সময়ের মজার কাজগুলো নিয়ে কথা বলো!"
  },
  "words": [
   [
    "Camping",
    "প্রকৃতির মাঝে তাঁবু টাঙিয়ে রাত কাটানো",
    true
   ],
   [
    "Swimming",
    "পানিতে সাঁতার কাটা",
    true
   ],
   [
    "Cycling",
    "সাইকেল চালানো",
    true
   ],
   [
    "Hobby",
    "শখ",
    true
   ],
   [
    "Explore",
    "ঘুরে দেখা",
    true
   ],
   [
    "Relax",
    "আরাম করা",
    true
   ],
   [
    "Hiking",
    "পাহাড়ে হাঁটা",
    true
   ],
   [
    "Exciting",
    "আনন্দদায়ক",
    true
   ]
  ],
  "games": [
   {
    "t": "sort",
    "title": "Solo or Group?",
    "groups": [
     {
      "n": "Group Activity",
      "e": "👨‍👩‍👧‍👦"
     },
     {
      "n": "Solo Activity",
      "e": "🧍"
     }
    ],
    "cards": [
     [
      "Football",
      0,
      "⚽"
     ],
     [
      "Storytime with friends",
      0,
      "📖"
     ],
     [
      "Singing in a choir",
      0,
      "🎤"
     ],
     [
      "Family Trip",
      0,
      "🚐"
     ],
     [
      "Singing alone",
      1,
      "🎶"
     ],
     [
      "Reading a storybook",
      1,
      "📕"
     ],
     [
      "Listening to music",
      1,
      "🎧"
     ],
     [
      "Solo Trip",
      1,
      "🎒"
     ]
    ]
   },
   {
    "t": "unjumble",
    "title": "Adventure Sentences",
    "items": [
     "🥾|Hiking is great for exploring nature.",
     "✈️|Traveling to new places is exciting.",
     "🧭|Exploring new things makes life fun.",
     "🧭|Adventurous people love trying new hobbies.",
     "🏄|Surfing is fun on big waves."
    ]
   },
   {
    "t": "find",
    "title": "Hobby Mystery Boxes",
    "items": [
     [
      "You can do this quietly at home or in a library.",
      "Reading"
     ],
     [
      "You can do this with a guitar, piano, or violin.",
      "Playing music"
     ],
     [
      "You often need ingredients like vegetables, spices, and sauces.",
      "Cooking"
     ],
     [
      "You use pieces like cards, dice, or tokens.",
      "Board Games"
     ],
     [
      "You need good lighting and a steady hand.",
      "Photography"
     ],
     [
      "This activity is done near a lake, river, or the ocean.",
      "Fishing"
     ],
     [
      "You might dig in the soil and water regularly.",
      "Gardening"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What was your most exciting adventure?",
    "The name of my favourite pastime is ___.",
    "The name of my favourite pastime is swimming."
   ],
   [
    "Why do you like it?",
    "It helps me to ___.",
    "It helps me to relax in the water."
   ],
   [
    "Talk about something you did.",
    "Yesterday, I ___. It was fun!",
    "Yesterday, I tried a new sport. It was fun!"
   ],
   [
    "Where did you go last weekend?",
    "Last weekend, I ___. It was exciting!",
    "Last weekend, I visited a new place. It was exciting!"
   ]
  ]
 },
 {
  "code": "1.4",
  "unit": 1,
  "title": "My Daily Diary",
  "emoji": "📔",
  "hero": "knight",
  "mission": {
   "en": "Describe your day from morning to night!",
   "bn": "সকাল থেকে রাত পর্যন্ত তোমার দিনের কথা বলো!"
  },
  "words": [
   [
    "Wake up",
    "ঘুম থেকে ওঠা",
    true
   ],
   [
    "Breakfast",
    "সকালের নাস্তা",
    true
   ],
   [
    "Commute",
    "যাতায়াত",
    true
   ],
   [
    "Lunch",
    "দুপুরের খাবার",
    true
   ],
   [
    "Relax",
    "আরাম করা",
    true
   ],
   [
    "Exercise",
    "ব্যায়াম",
    true
   ],
   [
    "Dinner",
    "রাতের খাবার",
    true
   ],
   [
    "Tired",
    "ক্লান্ত",
    true
   ],
   [
    "Sleep",
    "ঘুম",
    true
   ]
  ],
  "games": [
   {
    "t": "blank",
    "title": "Evening Time",
    "items": [
     [
      "I {play} with my friends in the park.",
      [
       "playing"
      ],
      "⚽"
     ],
     [
      "My mother {prepares} delicious snacks for me in the evening.",
      [
       "preparing"
      ],
      "🍿"
     ],
     [
      "My family and I {eat} dinner together at the dining table.",
      [
       "eats"
      ],
      "🍽️"
     ],
     [
      "After dinner, I {like} to read a book.",
      [
       "likes"
      ],
      "📖"
     ],
     [
      "In the evening, I sometimes {watch} cartoons on TV.",
      [
       "watching"
      ],
      "📺"
     ]
    ]
   },
   {
    "t": "whack",
    "title": "Morning Time",
    "prompt": "Tap only the correct sentences!",
    "good": [
     "I brush my teeth in the morning.",
     "I eat my breakfast in the morning.",
     "I go to the school with my mother.",
     "I wake up in the morning.",
     "I get ready for school."
    ],
    "bad": [
     "I my brush teeth in the morning.",
     "I to go the school with my mother.",
     "I ready get for school."
    ]
   },
   {
    "t": "quiz",
    "title": "When Do You Do It?",
    "items": [
     [
      "Where does “Wake up” go?",
      "Morning",
      [
       "Afternoon",
       "Night"
      ],
      "⏰"
     ],
     [
      "Where does “Breakfast” go?",
      "Morning",
      [
       "Afternoon",
       "Night"
      ],
      "🍳"
     ],
     [
      "Where does “Brushing teeth” go?",
      "Morning",
      [
       "Afternoon",
       "Night"
      ],
      "🦷"
     ],
     [
      "Where does “Lunch” go?",
      "Afternoon",
      [
       "Morning",
       "Night"
      ],
      "🍛"
     ],
     [
      "Where does “Play” go?",
      "Afternoon",
      [
       "Morning",
       "Night"
      ],
      "⚽"
     ],
     [
      "Where does “Dinner” go?",
      "Night",
      [
       "Morning",
       "Afternoon"
      ],
      "🍽️"
     ],
     [
      "Where does “Sleep” go?",
      "Night",
      [
       "Morning",
       "Afternoon"
      ],
      "😴"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What do you do in the morning?",
    "In the morning, I ___.",
    "In the morning, I brush my teeth, eat breakfast, and get ready for school."
   ],
   [
    "How do you spend your afternoon?",
    "In the afternoon, I ___.",
    "In the afternoon, I do my homework and then play with my friends."
   ],
   [
    "What do you do in the evening?",
    "In the evening, I ___.",
    "In the evening, I eat snacks and watch TV."
   ],
   [
    "What is your day like?",
    "I eat dinner at ___.",
    "I eat dinner at 9 PM."
   ]
  ]
 },
 {
  "code": "1.5",
  "unit": 1,
  "title": "Culinary Delights",
  "emoji": "🍳",
  "hero": "innovara",
  "mission": {
   "en": "Name kitchen tools and order your favorite food!",
   "bn": "রান্নাঘরের জিনিসের নাম শেখো আর প্রিয় খাবার order করো!"
  },
  "words": [
   [
    "Menu",
    "খাবারের তালিকা",
    true
   ],
   [
    "Order",
    "খাবার চাওয়া",
    true
   ],
   [
    "Bill",
    "টাকা দেওয়ার কাগজ",
    true
   ],
   [
    "Waiter",
    "খাবার পরিবেশক",
    true
   ],
   [
    "Water",
    "পানি",
    true
   ],
   [
    "Starter",
    "শুরুর খাবার",
    true
   ],
   [
    "Dessert",
    "মিষ্টি খাবার",
    true
   ],
   [
    "Spicy",
    "ঝাল",
    true
   ]
  ],
  "games": [
   {
    "t": "match",
    "title": "Kitchen Balloon Pop",
    "pairs": [
     [
      "Measuring cups",
      "help us measure ingredients"
     ],
     [
      "Cutting boards",
      "a surface where we cut vegetables"
     ],
     [
      "Spoons",
      "we use for stirring"
     ],
     [
      "Forks",
      "we use them to eat solid foods like vegetables, meat or biryani"
     ],
     [
      "Knife",
      "we use it for cutting and slicing"
     ],
     [
      "Breakfast",
      "the first meal of the day"
     ],
     [
      "Dinner",
      "the last meal of the day"
     ]
    ]
   },
   {
    "t": "pair",
    "title": "Food Friends",
    "items": [
     [
      "Rice",
      "Curry",
      true,
      "🍚",
      "🍛"
     ],
     [
      "Bread",
      "Butter",
      true,
      "🍞",
      "🧈"
     ],
     [
      "Gas",
      "Stove",
      true,
      "🔥",
      "🍳"
     ],
     [
      "Sugar",
      "Syrup",
      true,
      "🍬",
      "🍯"
     ],
     [
      "Coffee",
      "Espresso",
      true,
      "☕",
      "☕"
     ],
     [
      "Pasta",
      "Noodles",
      true,
      "🍝",
      "🍜"
     ],
     [
      "Rice",
      "Syrup",
      false,
      "🍚",
      "🍯"
     ],
     [
      "Gas",
      "Noodles",
      false,
      "🔥",
      "🍜"
     ],
     [
      "Coffee",
      "Butter",
      false,
      "☕",
      "🧈"
     ]
    ]
   },
   {
    "t": "blank",
    "title": "Order Up!",
    "items": [
     [
      "I would {like} a burger",
      [
       "liking"
      ],
      "🍔"
     ],
     [
      "Can I {have} the pasta without cheese?",
      [
       "had"
      ],
      "🍝"
     ],
     [
      "What would you like to {have} today ?",
      [
       "had"
      ],
      "🍽️"
     ],
     [
      "How may I {help} you ?",
      [
       "helped"
      ],
      "👨‍🍳"
     ],
     [
      "Do you have anything specific that you would like to {order}?",
      [
       "ordered"
      ],
      "📋"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What are your favourite fruits?",
    "I like ___ because ___.",
    "I like mango because it is very sweet."
   ],
   [
    "What would you like to have today?",
    "I would like ___.",
    "I would like a burger."
   ],
   [
    "Be the waiter.",
    "Hello! How can I help you?",
    "Hello! How can I help you?"
   ],
   [
    "Be the customer.",
    "Can I have ___?",
    "Can I have extra sauce?"
   ]
  ]
 },
 {
  "code": "1.6",
  "unit": 1,
  "title": "Last and Next",
  "emoji": "🗓️",
  "hero": "innovara",
  "mission": {
   "en": "Talk about yesterday, tomorrow and your weekend!",
   "bn": "গতকাল, আগামীকাল আর weekend নিয়ে কথা বলো!"
  },
  "words": [
   [
    "Happened",
    "ঘটেছে",
    true
   ],
   [
    "Upcoming",
    "যা শিগগিরই হবে",
    true
   ],
   [
    "Scheduled",
    "নির্দিষ্ট সময়ে পরিকল্পিত",
    true
   ],
   [
    "Planned",
    "আগেই ঠিক করা",
    true
   ],
   [
    "Expected",
    "যা হওয়ার সম্ভাবনা আছে",
    true
   ],
   [
    "Weekend",
    "সপ্তাহ শেষের ছুটি"
   ]
  ],
  "games": [
   {
    "t": "spell",
    "title": "Time Traveller Spelling",
    "items": [
     [
      "unfolded",
      "ধীরে ধীরে স্পষ্ট হয়েছে",
      "🌅"
     ],
     [
      "transpired",
      "জানা গেছে",
      "🔎"
     ],
     [
      "happened",
      "ঘটেছে",
      "💥"
     ],
     [
      "upcoming",
      "যা শিগগিরই হবে",
      "⏭️"
     ],
     [
      "scheduled",
      "নির্দিষ্ট সময়ে পরিকল্পিত",
      "📅"
     ],
     [
      "planned",
      "আগেই ঠিক করা",
      "📝"
     ],
     [
      "expected",
      "যা হওয়ার সম্ভাবনা আছে",
      "🌧️"
     ]
    ]
   },
   {
    "t": "quiz",
    "title": "What Will Happen?",
    "items": [
     [
      "I ___ go to the store tomorrow.",
      "will",
      [
       "was"
      ],
      "🏪"
     ],
     [
      "She will ___ her friend next week.",
      "visit",
      [
       "visited"
      ],
      "👫"
     ],
     [
      "They are ___ to watch a movie tonight.",
      "going",
      [
       "go"
      ],
      "🎬"
     ],
     [
      "The exam is ___",
      "approaching",
      [
       "approach"
      ],
      "📝"
     ],
     [
      "First, I will ___ up early at 7 AM.",
      "wake",
      [
       "woke"
      ],
      "⏰"
     ],
     [
      "I will ___ very busy this weekend.",
      "be",
      [
       "was"
      ],
      "📚"
     ]
    ]
   },
   {
    "t": "plane",
    "title": "Fly the Aeroplane",
    "items": [
     [
      "The ___ event is tomorrow.",
      "upcoming",
      [
       "approaching",
       "scheduled"
      ]
     ],
     [
      "We have a ___ trip tomorrow.",
      "planned",
      [
       "plan",
       "planning"
      ]
     ],
     [
      "I will be very ___ this weekend as I have a lot of homework.",
      "busy",
      [
       "happy",
       "sleepy"
      ]
     ],
     [
      "___ are the weekend days in Bangladesh",
      "Friday, Saturday",
      [
       "Monday, Tuesday",
       "Sunday, Monday"
      ]
     ],
     [
      "I ___ to class yesterday",
      "went",
      [
       "go",
       "gone"
      ]
     ]
    ]
   }
  ],
  "talk": [
   [
    "What did you do yesterday?",
    "I went to ___ yesterday.",
    "I went to class yesterday."
   ],
   [
    "What are your plans for tomorrow?",
    "I will go to ___.",
    "I will go to buy some groceries."
   ],
   [
    "Hello, what was your favorite activity last weekend?",
    "I had a ___ weekend.",
    "I had a fun weekend."
   ],
   [
    "What about you?",
    "I had an okay weekend, I ___.",
    "I had an okay weekend, I didn’t do much."
   ]
  ]
 },
 {
  "code": "1.7",
  "unit": 1,
  "title": "Sharing My Opinion",
  "emoji": "💭",
  "hero": "innovara",
  "mission": {
   "en": "Say what you think, and always say it politely!",
   "bn": "তোমার মতামত দাও, আর সবসময় politely বলো!"
  },
  "words": [
   [
    "Agree",
    "একমত হওয়া",
    true
   ],
   [
    "Disagree",
    "ভিন্নমত পোষন করা",
    true
   ],
   [
    "Believe",
    "বিশ্বাস করা",
    true
   ],
   [
    "Think",
    "ভাবা/চিন্তা করা",
    true
   ],
   [
    "Suggest",
    "পরামর্শ দেওয়া",
    true
   ],
   [
    "Feel",
    "অনুভব করা",
    true
   ],
   [
    "Prefer",
    "পছন্দ করা",
    true
   ]
  ],
  "games": [
   {
    "t": "anagram",
    "title": "Opinion Words",
    "audio": true,
    "items": [
     [
      "agree",
      "একমত হওয়া",
      "👍"
     ],
     [
      "disagree",
      "ভিন্নমত পোষণ করা",
      "🙅"
     ],
     [
      "believe",
      "বিশ্বাস করা",
      "🌟"
     ],
     [
      "think",
      "ভাবা",
      "🤔"
     ],
     [
      "suggest",
      "পরামর্শ দেওয়া",
      "💡"
     ],
     [
      "feel",
      "অনুভব করা",
      "💗"
     ],
     [
      "consider",
      "বিবেচনা করা",
      "🧐"
     ],
     [
      "argue",
      "বিতর্ক করা",
      "🗣️"
     ],
     [
      "prefer",
      "পছন্দ করা",
      "⭐"
     ]
    ]
   },
   {
    "t": "sort",
    "title": "Opinion or Statement?",
    "groups": [
     {
      "n": "Opinion",
      "e": "💭"
     },
     {
      "n": "Statement",
      "e": "📌"
     }
    ],
    "cards": [
     [
      "I think winter is gentler than summer",
      0,
      ""
     ],
     [
      "I think the weather will be nice tomorrow",
      0,
      ""
     ],
     [
      "In my opinion, reading books is a great way to learn new things",
      0,
      "🙂"
     ],
     [
      "I feel that everyone should be treated with kindness and respect",
      0,
      "🙂"
     ],
     [
      "From my point of view, teamwork is essential for success",
      0,
      "💭"
     ],
     [
      "Summer is better than winter",
      1,
      ""
     ],
     [
      "Winter nights are longer than summer nights",
      1,
      ""
     ],
     [
      "The sky is blue",
      1,
      ""
     ],
     [
      "I have a pet cat",
      1,
      ""
     ],
     [
      "We are going to the park today",
      1,
      "🌳"
     ]
    ]
   },
   {
    "t": "tf",
    "title": "Disagree Politely",
    "labels": [
     "Correct",
     "Not correct"
    ],
    "items": [
     [
      "I your see point, but I think differently.",
      false,
      "🤝"
     ],
     [
      "I understand what you're saying, but can I explain my side?",
      true,
      "💡"
     ],
     [
      "I agree, don’t but I respect your opinion.",
      false,
      "🙂"
     ],
     [
      "That’s a good idea, but what if we try this instead?",
      true,
      "💡"
     ],
     [
      "Let’s a find way that works for both of us.",
      false,
      "🤗"
     ]
    ]
   }
  ],
  "talk": [
   [
    "Summer is better than winter. Do you agree?",
    "I agree with statement because ___.",
    "I agree with statement because I love going to the beach in summer."
   ],
   [
    "Pizza is better than burgers. What do you think?",
    "In my opinion, ___.",
    "In my opinion, pizza is better than burgers."
   ],
   [
    "Summer is better than winter. Do you disagree?",
    "I disagree because ___.",
    "I disagree because winter feels cozy, and I love drinking hot chocolate."
   ],
   [
    "Ask your friend for an opinion.",
    "What do you think?",
    "What do you think?"
   ]
  ]
 },
 {
  "code": "2.1",
  "unit": 2,
  "title": "School Stories",
  "emoji": "🏫",
  "hero": "innovara",
  "mission": {
   "en": "Describe your school and your favorite activities!",
   "bn": "তোমার school আর প্রিয় activity-র কথা বলো!"
  },
  "words": [
   [
    "Timetable",
    "সময়সূচী",
    true
   ],
   [
    "Seminar",
    "আলোচনাসভা",
    true
   ],
   [
    "Assignment",
    "লিখিত বা ব্যবহারিক বাড়ির কাজ",
    true
   ],
   [
    "Syllabus",
    "পাঠ্যসূচী",
    true
   ],
   [
    "Curriculum",
    "পাঠ্যক্রম",
    true
   ],
   [
    "Discipline",
    "শৃঙ্খলা",
    true
   ],
   [
    "Orientation",
    "পরিচিতি অনুষ্ঠান",
    true
   ]
  ],
  "games": [
   {
    "t": "match",
    "title": "School Spelling Bee",
    "pairs": [
     [
      "curriculum",
      "পাঠ্যক্রম"
     ],
     [
      "discipline",
      "শৃঙ্খলা"
     ],
     [
      "orientation",
      "পরিচিতি অনুষ্ঠান"
     ],
     [
      "transcript",
      "সনদপত্র / মার্কশীট"
     ],
     [
      "canteen",
      "Where we buy food at school"
     ],
     [
      "library",
      "Quiet and full of books"
     ],
     [
      "classroom",
      "Where we have our lessons"
     ]
    ]
   },
   {
    "t": "blank",
    "title": "Have or Has?",
    "items": [
     [
      "We {have} a library where we read books.",
      [
       "has"
      ],
      "📚"
     ],
     [
      "She {has} a garden where she grows flowers.",
      [
       "have"
      ],
      "🌷"
     ],
     [
      "We {have} a kitchen where we cook meals.",
      [
       "has"
      ],
      "🍳"
     ],
     [
      "He {has} a workshop where he builds furniture.",
      [
       "have"
      ],
      "🔨"
     ],
     [
      "They {have} a farm where they raise animals.",
      [
       "has"
      ],
      "🐄"
     ],
     [
      "Innovara {has} a studio where she paints pictures.",
      [
       "have"
      ],
      "🎨"
     ],
     [
      "We {have} a music room where we practice instruments.",
      [
       "has"
      ],
      "🎹"
     ],
     [
      "They {have} a swimming pool where they learn to swim.",
      [
       "has"
      ],
      "🏊"
     ],
     [
      "Ms Bhasha {has} a balcony where she drinks tea.",
      [
       "have"
      ],
      "🍵"
     ],
     [
      "We {have} a science lab where we do experiments.",
      [
       "has"
      ],
      "🔬"
     ]
    ]
   },
   {
    "t": "whack",
    "title": "There Is or There Are?",
    "prompt": "Tap only the There is ones!",
    "good": [
     "a library in my school.",
     "a big playground.",
     "some water in the bottle."
    ],
    "bad": [
     "two canteens in my school.",
     "many classrooms in my school.",
     "a lot of books in the library."
    ]
   }
  ],
  "talk": [
   [
    "What is the name of your school?",
    "My school’s name is ___.",
    "My school’s name is Dhaka Model School."
   ],
   [
    "Where is your school located?",
    "It is located in ___.",
    "It is located in Mirpur."
   ],
   [
    "What do we do in the library?",
    "The library is ___.",
    "The library is quiet and full of books."
   ],
   [
    "What is your favorite subject?",
    "My favorite subject is ___ because ___.",
    "My favorite subject is Science because I like doing experiments."
   ]
  ]
 },
 {
  "code": "2.2",
  "unit": 2,
  "title": "Classroom Chronicles",
  "emoji": "✏️",
  "hero": "mathman",
  "mission": {
   "en": "Name your school things and your favorite thing at school!",
   "bn": "School-এর জিনিসপত্রের নাম আর তোমার প্রিয় জিনিসের কথা বলো!"
  },
  "words": [
   [
    "Sharp",
    "চোখা বা ধারালো",
    true
   ],
   [
    "Compact",
    "ছোট এবং সুবিধাজনক",
    true
   ],
   [
    "Lightweight",
    "হালকা",
    true
   ],
   [
    "Durable",
    "টেকসই বা মজবুত",
    true
   ],
   [
    "Sticky",
    "আঠালো",
    true
   ]
  ],
  "games": [
   {
    "t": "quiz",
    "title": "Classroom or Living Room?",
    "items": [
     [
      "Where does “Eraser” go?",
      "Classroom Object",
      [
       "Living Room Object"
      ],
      "🧽"
     ],
     [
      "Where does “Pen” go?",
      "Classroom Object",
      [
       "Living Room Object"
      ],
      "🖊️"
     ],
     [
      "Where does “Pencil” go?",
      "Classroom Object",
      [
       "Living Room Object"
      ],
      "✏️"
     ],
     [
      "Where does “Notebook” go?",
      "Classroom Object",
      [
       "Living Room Object"
      ],
      "📓"
     ],
     [
      "Where does “Whiteboard” go?",
      "Classroom Object",
      [
       "Living Room Object"
      ],
      "⬜"
     ],
     [
      "Where does “Blackboard” go?",
      "Classroom Object",
      [
       "Living Room Object"
      ],
      "⬛"
     ],
     [
      "Where does “Sofa” go?",
      "Living Room Object",
      [
       "Classroom Object"
      ],
      "🛋️"
     ],
     [
      "Where does “Armchair” go?",
      "Living Room Object",
      [
       "Classroom Object"
      ],
      "💺"
     ],
     [
      "Where does “Tea Table” go?",
      "Living Room Object",
      [
       "Classroom Object"
      ],
      "☕"
     ],
     [
      "Where does “TV” go?",
      "Living Room Object",
      [
       "Classroom Object"
      ],
      "📺"
     ],
     [
      "Where does “Carpet” go?",
      "Living Room Object",
      [
       "Classroom Object"
      ],
      "🟥"
     ],
     [
      "Where does “Curtains” go?",
      "Living Room Object",
      [
       "Classroom Object"
      ],
      "🌤️"
     ]
    ]
   },
   {
    "t": "boxes",
    "title": "Finish the Sentence",
    "items": [
     [
      "writing and drawing",
      "A pencil is used for",
      [
       "Pencils come in"
      ],
      ""
     ],
     [
      "different sizes and colors",
      "Pencils come in",
      [
       "Notebooks can have"
      ],
      ""
     ],
     [
      "and erase mistakes easily",
      "A pencil helps us write",
      [
       "A notebook is made of"
      ],
      ""
     ],
     [
      "paper and a cover",
      "A notebook is made of",
      [
       "A pencil helps us write"
      ],
      ""
     ],
     [
      "hardcovers or softcovers",
      "Notebooks can have",
      [
       "A pencil is used for"
      ],
      ""
     ]
    ]
   },
   {
    "t": "spell",
    "title": "School Bag Scramble",
    "items": [
     [
      "scissors",
      "They cut paper",
      "✂️"
     ],
     [
      "canvas",
      "We paint pictures on it",
      "🖼️"
     ],
     [
      "crayon",
      "It colors pictures",
      "🖍️"
     ],
     [
      "calculator",
      "A math tool",
      "🧮"
     ],
     [
      "compass",
      "A math tool for drawing circles",
      "📐"
     ],
     [
      "notebook",
      "We write in it",
      "📓"
     ],
     [
      "highlighter",
      "It marks words in a bright color",
      "🖊️"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What is this object? It’s a pencil.",
    "A pencil is used for ___.",
    "A pencil is used for writing and drawing."
   ],
   [
    "What is a pencil made of?",
    "It is usually made of ___.",
    "It is usually made of wood."
   ],
   [
    "What is your favorite activity in the school?",
    "My favorite activity is ___.",
    "My favorite activity is games class."
   ],
   [
    "Why do you like it?",
    "I like it because ___.",
    "I like it because I get to run, play, and have fun with my friends."
   ]
  ]
 },
 {
  "code": "2.3",
  "unit": 2,
  "title": "Classroom Expert",
  "emoji": "🙏",
  "hero": "bhasha",
  "mission": {
   "en": "Use polite words in class and talk about school rules!",
   "bn": "ক্লাসে polite কথা বলো আর school-এর rules নিয়ে বলো!"
  },
  "words": [
   [
    "Please",
    "অনুগ্রহ করে"
   ],
   [
    "Excuse me",
    "কারো attention পেতে",
    true
   ],
   [
    "Thank you",
    "ধন্যবাদ"
   ],
   [
    "May I",
    "permission নেওয়ার জন্য"
   ],
   [
    "Must",
    "কঠোর নিয়ম"
   ],
   [
    "Can",
    "অনুমতি"
   ],
   [
    "Should",
    "পরামর্শ"
   ]
  ],
  "games": [
   {
    "t": "sort",
    "title": "Polite or Impolite?",
    "groups": [
     {
      "n": "Polite Sentences",
      "e": "😊"
     },
     {
      "n": "Impolite Sentences",
      "e": "😠"
     }
    ],
    "cards": [
     [
      "Could you please help me?",
      0,
      "🙋"
     ],
     [
      "Excuse me, may I pass through, please?",
      0,
      ""
     ],
     [
      "May I have some water, please?",
      0,
      ""
     ],
     [
      "I understand your idea, but I think differently.",
      0,
      "💭"
     ],
     [
      "Could you please be a little quicker?",
      0,
      ""
     ],
     [
      "Help me right now!",
      1,
      "🙋"
     ],
     [
      "Move! You're in my way!",
      1,
      ""
     ],
     [
      "Give me some water immediately",
      1,
      ""
     ],
     [
      "You’re wrong!",
      1,
      ""
     ],
     [
      "Hurry up!",
      1,
      ""
     ]
    ]
   },
   {
    "t": "find",
    "title": "Magic Words",
    "items": [
     [
      "shows appreciation",
      "Thank you"
     ],
     [
      "Used to respond politely when someone thanks you",
      "You're welcome"
     ],
     [
      "Used to make a request politely",
      "Please"
     ],
     [
      "Used to get attention or apologize politely.",
      "Excuse me"
     ],
     [
      "Ask for permission politely",
      "May I"
     ],
     [
      "Advice/Suggestion",
      "Should"
     ]
    ]
   },
   {
    "t": "unjumble",
    "title": "Polite Sentences",
    "items": [
     "📕|Please pass me the book.",
     "❓|Excuse me, may I ask a question?",
     "📝|Thank you for helping me with my homework.",
     "🚪|May I leave the room, please?",
     "🙋|Could you help me with this, please?",
     "🙏|Sorry, I didn’t mean to interrupt.",
     "👂|Pardon me, could you say that again?",
     "🌤️|Would you mind opening the window?",
     "🙋|I appreciate your help!"
    ]
   }
  ],
  "talk": [
   [
    "You need a pen. Ask your friend.",
    "Could you please ___?",
    "Could you please pass me the pen?"
   ],
   [
    "You want to leave the room. Ask your teacher.",
    "May I ___, please?",
    "May I leave the room, please?"
   ],
   [
    "Your friend helped you. Say thanks.",
    "Thank you for ___.",
    "Thank you for helping me."
   ],
   [
    "Tell us a rule at your school.",
    "We must ___.",
    "We must raise our hand before speaking."
   ]
  ]
 },
 {
  "code": "2.4",
  "unit": 2,
  "title": "The School Clock",
  "emoji": "⏰",
  "hero": "bhasha",
  "mission": {
   "en": "Talk about your school routine, step by step!",
   "bn": "তোমার school routine ধাপে ধাপে বলো!"
  },
  "words": [
   [
    "At first",
    "প্রথমে",
    true
   ],
   [
    "Next",
    "এরপর",
    true
   ],
   [
    "Then",
    "তারপর",
    true
   ],
   [
    "After that",
    "এর পরেই",
    true
   ],
   [
    "Finally",
    "শেষে",
    true
   ],
   [
    "Arrive",
    "পৌঁছানো"
   ],
   [
    "Study",
    "পড়াশোনা করা"
   ],
   [
    "Participate",
    "অংশ নেওয়া"
   ]
  ],
  "games": [
   {
    "t": "whack",
    "title": "Regular or Irregular?",
    "prompt": "Tap only the Regular Actions ones!",
    "good": [
     "Brushing your teeth",
     "Eating breakfast",
     "Going to school",
     "Completing homework",
     "Having lunch",
     "Taking a shower",
     "Having Dinner"
    ],
    "bad": [
     "Attending a birthday party",
     "Going on a picnic",
     "Visiting a zoo",
     "Going to a doctor for checkup",
     "Going on a forest camping",
     "Attending a family dinner party",
     "Going on a vacation"
    ]
   },
   {
    "t": "tf",
    "title": "Step by Step",
    "labels": [
     "Correct",
     "Not correct"
    ],
    "items": [
     [
      "In morning, the I wake up and brush my teeth.",
      false,
      "🦷"
     ],
     [
      "At noon, I have lunch with my classmates.",
      true,
      "🏫"
     ],
     [
      "After I lunch, play with my friends.",
      false,
      "🍛"
     ],
     [
      "Finally, I go home.",
      true,
      "🏠"
     ],
     [
      "Next, eat I my breakfast.",
      false,
      "🍳"
     ],
     [
      "Then, I go to school with my mother.",
      true,
      "🏫"
     ]
    ]
   },
   {
    "t": "anagram",
    "title": "Routine Spelling",
    "items": [
     [
      "arrive",
      "When you reach a place",
      "📍"
     ],
     [
      "collaborate",
      "To work together with others",
      "🤝"
     ],
     [
      "brainstorm",
      "To think of new ideas",
      "🧠"
     ],
     [
      "contribute",
      "To share your ideas or help",
      "🙌"
     ],
     [
      "participate",
      "To take part in an activity",
      "🏃"
     ]
    ]
   }
  ],
  "talk": [
   [
    "When do you arrive at school?",
    "I arrive at school at ___ every day.",
    "I arrive at school at 8 AM every day."
   ],
   [
    "What do you do during the break?",
    "I ___ during break time.",
    "I play in the playground during break time."
   ],
   [
    "Say your morning in order.",
    "At first, I ___.",
    "At first, I wake up and brush my teeth."
   ],
   [
    "What do you do next?",
    "Next, I ___.",
    "Next, I eat my breakfast."
   ],
   [
    "What do you do at the end?",
    "Finally, I ___.",
    "Finally, I pack my bag and leave school."
   ]
  ]
 },
 {
  "code": "2.5",
  "unit": 2,
  "title": "After-School Fun",
  "emoji": "🛹",
  "hero": "mathman",
  "mission": {
   "en": "Share your after-school fun and invite your friends!",
   "bn": "School-এর পরের মজা আর বন্ধুদের invite করার কথা বলো!"
  },
  "words": [
   [
    "Homework",
    "বাড়ির কাজ",
    true
   ],
   [
    "Play outside",
    "বাইরে খেলা",
    true
   ],
   [
    "Help clean the house",
    "ঘর পরিষ্কার করতে সাহায্য করা",
    true
   ],
   [
    "Help with dinner",
    "Dinner বানাতে সাহায্য করা",
    true
   ],
   [
    "Read books",
    "বই পড়া",
    true
   ],
   [
    "Watch TV",
    "TV দেখা",
    true
   ]
  ],
  "games": [
   {
    "t": "match",
    "title": "Picture Match",
    "pairs": [
     [
      "📝",
      "Doing Homework"
     ],
     [
      "⚽",
      "Playing Football"
     ],
     [
      "📺",
      "Watching TV"
     ],
     [
      "📚",
      "Reading Books"
     ],
     [
      "🎨",
      "Drawing & Painting"
     ],
     [
      "🎮",
      "Playing Video Games"
     ],
     [
      "🧹",
      "Helping at Home"
     ],
     [
      "🚴",
      "Cycling"
     ],
     [
      "🎹",
      "Music Practice"
     ],
     [
      "👫",
      "Hanging Out"
     ]
    ]
   },
   {
    "t": "unjumble",
    "title": "Invite Your Friend",
    "items": [
     "🏫|Do you want to play soccer after school?",
     "🚶|Why don’t we go for a walk?",
     "🤝|Let’s meet at the playground at 4 PM!",
     "⚽|Would you like to play football with me?",
     "🌳|How about we go to the park?",
     "🎮|I was wondering if you’d like to play video games with me?"
    ]
   },
   {
    "t": "sort",
    "title": "Formal or Informal?",
    "groups": [
     {
      "n": "Formal",
      "e": "✅"
     },
     {
      "n": "Informal",
      "e": "❌"
     }
    ],
    "cards": [
     [
      "Do you want to read some books?",
      1,
      "📚"
     ],
     [
      "Why don’t we go for a bike ride?",
      1,
      "🚲"
     ],
     [
      "Let’s practice some music!",
      1,
      "🎹"
     ],
     [
      "Would you like to play video games?",
      0,
      "🎮"
     ],
     [
      "How about cleaning the house today?",
      0,
      "🧹"
     ],
     [
      "I was wondering if you’d like to watch TV?",
      0,
      "📺"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What do you do after school?",
    "After school, I ___.",
    "After school, I play outside with my friends."
   ],
   [
    "What do you do in the evening?",
    "In the evening, I ___.",
    "In the evening, I read books or watch TV."
   ],
   [
    "Invite your friend.",
    "Do you want to go to the park after school?",
    "Do you want to go to the park after school?"
   ],
   [
    "Say no politely.",
    "I’d love to, but ___.",
    "I’d love to, but I have too much homework."
   ]
  ]
 },
 {
  "code": "3.1",
  "unit": 3,
  "title": "My Humble Abode",
  "emoji": "🏡",
  "hero": "bhasha",
  "mission": {
   "en": "Describe houses, rooms and your dream house!",
   "bn": "বিভিন্ন বাড়ি, ঘর আর তোমার dream house-এর কথা বলো!"
  },
  "words": [
   [
    "Tall",
    "লম্বা",
    true
   ],
   [
    "Huge",
    "বিশাল",
    true
   ],
   [
    "Modern",
    "আধুনিক",
    true
   ],
   [
    "Old",
    "পুরানো",
    true
   ],
   [
    "Beautiful",
    "সুন্দর",
    true
   ],
   [
    "Colorful",
    "রঙিন",
    true
   ],
   [
    "Cozy",
    "আরামদায়ক",
    true
   ],
   [
    "Spacious",
    "প্রশস্ত",
    true
   ],
   [
    "Peaceful",
    "শান্তিপূর্ণ",
    true
   ]
  ],
  "games": [
   {
    "t": "find",
    "title": "Room Match",
    "items": [
     [
      "We sleep here",
      "Bedroom"
     ],
     [
      "We cook food here",
      "Kitchen"
     ],
     [
      "We take a bath here",
      "Bathroom"
     ],
     [
      "We spend time with family here",
      "Living Room"
     ],
     [
      "We eat with family here",
      "Dining Room"
     ]
    ]
   },
   {
    "t": "spell",
    "title": "Dream House Spelling",
    "items": [
     [
      "peaceful",
      "শান্তিপূর্ণ",
      "🕊️"
     ],
     [
      "bright",
      "উজ্জ্বল",
      "☀️"
     ],
     [
      "functional",
      "সুবিধাজনক ও কার্যকরী",
      "🔧"
     ],
     [
      "stylish",
      "আকর্ষণীয়",
      "😎"
     ],
     [
      "spacious",
      "প্রশস্ত",
      "🏟️"
     ],
     [
      "cozy",
      "আরামদায়ক",
      "🛋️"
     ],
     [
      "luxurious",
      "জাঁকজমকপূর্ণ",
      "💎"
     ],
     [
      "traditional",
      "ঐতিহ্যবাহী",
      "🏺"
     ]
    ]
   },
   {
    "t": "tf",
    "title": "House Facts",
    "items": [
     [
      "A bedroom is a place where we sleep.",
      true,
      "🛏️"
     ],
     [
      "A house can have more than one room.",
      true,
      "🏠"
     ],
     [
      "A garden is usually outside the house.",
      true,
      "🌱"
     ],
     [
      "A house protects us from rain and sun.",
      true,
      "☔"
     ],
     [
      "A house protects us from enemies.",
      true,
      "🛡️"
     ],
     [
      "A bathroom is where we cook food.",
      false,
      "🛁"
     ],
     [
      "Doors and windows are not important in a house.",
      false,
      "🚪"
     ],
     [
      "A treehouse is built underground.",
      false,
      "🌳"
     ],
     [
      "A house cannot have a swimming pool.",
      false,
      "🏊"
     ],
     [
      "We live on the street.",
      false,
      "🛣️"
     ]
    ]
   }
  ],
  "talk": [
   [
    "Where do you live?",
    "I live in a ___ in ___.",
    "I live in a small apartment in Dhaka."
   ],
   [
    "What rooms does your home have?",
    "We have ___.",
    "We have 1 living room, 2 bedrooms, 1 balcony, 1 kitchen and 2 bathrooms."
   ],
   [
    "What is your dream house?",
    "My dream house is ___.",
    "My dream house is duplex house."
   ],
   [
    "Describe your dream house.",
    "It will be a ___ house with ___.",
    "It will be a cozy house with 4 bedrooms and a living room with a big TV."
   ]
  ]
 },
 {
  "code": "3.2",
  "unit": 3,
  "title": "Room Riddles",
  "emoji": "🧹",
  "hero": "knight",
  "mission": {
   "en": "Describe your rooms and the chores you do at home!",
   "bn": "তোমার ঘর আর বাসার কাজগুলো নিয়ে কথা বলো!"
  },
  "words": [
   [
    "Spacious",
    "বড় এবং খোলামেলা",
    true
   ],
   [
    "Cozy",
    "আরামদায়ক এবং শান্ত",
    true
   ],
   [
    "Bright",
    "উজ্জ্বল এবং আলোয় ভরা",
    true
   ],
   [
    "Tidy",
    "গোছানো এবং পরিষ্কার",
    true
   ],
   [
    "Messy",
    "অগোছালো এবং এলোমেলো",
    true
   ],
   [
    "Laundry",
    "কাপড় ধোয়া",
    true
   ],
   [
    "Sweeping",
    "ঝাড়ু দেওয়া",
    true
   ],
   [
    "Mopping",
    "floor মুছা",
    true
   ]
  ],
  "games": [
   {
    "t": "anagram",
    "title": "Room Word Spelling",
    "items": [
     [
      "spacious",
      "প্রশস্ত",
      "🏟️"
     ],
     [
      "cozy",
      "আরামদায়ক",
      "🛋️"
     ],
     [
      "bright",
      "উজ্জ্বল",
      "☀️"
     ],
     [
      "tidy",
      "গোছানো এবং পরিষ্কার",
      "✨"
     ],
     [
      "messy",
      "অগোছালো এবং এলোমেলো",
      "🧦"
     ],
     [
      "modern",
      "নতুন design-এর",
      "🛰️"
     ],
     [
      "traditional",
      "ঐতিহ্যবাহী",
      "🏺"
     ],
     [
      "colorful",
      "রঙে ভরা",
      "🌈"
     ],
     [
      "minimalistic",
      "সহজ এবং কম জিনিসপত্রে সাজানো",
      "⚪"
     ]
    ]
   },
   {
    "t": "boxes",
    "title": "Chores Match",
    "items": [
     [
      "Washing clothes",
      "Laundry",
      [
       "Dishwashing"
      ],
      "🧺"
     ],
     [
      "Cleaning plates and cups",
      "Dishwashing",
      [
       "Laundry"
      ],
      "🍽️"
     ],
     [
      "Using a broom to clean floors",
      "Sweeping",
      [
       "Laundry"
      ],
      "🧹"
     ],
     [
      "Wiping away dust",
      "Dusting",
      [
       "Laundry"
      ],
      "✨"
     ],
     [
      "Cleaning floors with water",
      "Mopping",
      [
       "Laundry"
      ],
      "💧"
     ],
     [
      "Buying food and essentials",
      "Grocery Shopping",
      [
       "Laundry"
      ],
      "🛒"
     ]
    ]
   },
   {
    "t": "blank",
    "title": "Room Riddles",
    "items": [
     [
      "We like to relax on the {sofa} in the living room.",
      [
       "dining table"
      ],
      "🛋️"
     ],
     [
      "We enjoy {watching} movies on the TV in the living room.",
      [
       "listening"
      ],
      "🎬"
     ],
     [
      "In the living room, we {spend} time with our family.",
      [
       "eat"
      ],
      "👨‍👩‍👧"
     ],
     [
      "We usually sleep on the {bed} in our bedroom.",
      [
       "dining table"
      ],
      "🛏️"
     ],
     [
      "We {cook} in the kitchen.",
      [
       "shower"
      ],
      "🍳"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What things are in the room?",
    "My bedroom has a ___ and a ___.",
    "My bedroom has a big bed and a wardrobe."
   ],
   [
    "What do we do in the room?",
    "We ___ in the living room.",
    "We sit, chat and watch TV in the living room."
   ],
   [
    "How can we describe other household chores?",
    "I help with ___.",
    "I help with dishwashing."
   ],
   [
    "Why do we need to do it?",
    "This keeps the house ___.",
    "This keeps the house clean and helps everyone work as a team!"
   ]
  ]
 },
 {
  "code": "3.3",
  "unit": 3,
  "title": "Bound by Friendship",
  "emoji": "💌",
  "hero": "mathman",
  "mission": {
   "en": "Make plans with friends and invite them to events!",
   "bn": "বন্ধুদের সাথে plan করো আর event-এ invite করো!"
  },
  "words": [
   [
    "Join",
    "যোগ দেওয়া",
    true
   ],
   [
    "Visit",
    "দেখা করা",
    true
   ],
   [
    "Celebrate",
    "উদযাপন করা",
    true
   ],
   [
    "Hang out",
    "সময় কাটানো",
    true
   ],
   [
    "Attend",
    "উপস্থিত থাকা",
    true
   ],
   [
    "Plan",
    "পরিকল্পনা করা",
    true
   ],
   [
    "Explore",
    "ঘুরে দেখা",
    true
   ]
  ],
  "games": [
   {
    "t": "match",
    "title": "Plan Words Spelling",
    "pairs": [
     [
      "join",
      "যোগ দেওয়া"
     ],
     [
      "visit",
      "দেখা করা"
     ],
     [
      "celebrate",
      "উদযাপন করা"
     ],
     [
      "attend",
      "উপস্থিত থাকা"
     ],
     [
      "plan",
      "পরিকল্পনা করা"
     ],
     [
      "explore",
      "ঘুরে দেখা"
     ]
    ]
   },
   {
    "t": "quiz",
    "show": true,
    "title": "Friendship Quiz Show",
    "items": [
     [
      "What will you say when you love your buddy's plan?",
      "That sounds great! Yes, I’d love to!",
      [
       "That sounds bad!"
      ],
      "🥳"
     ],
     [
      "How would you politely say no to an invitation?",
      "I’m sorry, I can’t make it. Maybe next time.",
      [
       "Go away!"
      ],
      "🙏"
     ],
     [
      "How can you suggest your friend to study with you?",
      "Let's study together!",
      [
       "Go to your home!"
      ],
      "📚"
     ],
     [
      "How do you ask your friend to plan a football match together?",
      "Let's play football this evening!",
      [
       "Play football"
      ],
      "⚽"
     ],
     [
      "How do you say no to a plan when you have other plans?",
      "I’d love to, but I already have plans!",
      [
       "I don't care!"
      ],
      "📅"
     ]
    ]
   },
   {
    "t": "unjumble",
    "title": "Invitation Train",
    "items": [
     "🍽️|Would you like to come over for dinner?",
     "💍|Would you like to come to the wedding?",
     "🧺|Shall we go for a picnic this Saturday?",
     "🎂|Would you like to come with me to the party on Friday?",
     "🎂|I would love to invite you to my birthday party."
    ]
   }
  ],
  "talk": [
   [
    "Suggest a plan to your friend.",
    "Let’s ___ at ___ this afternoon.",
    "Let’s play football in the playground this afternoon."
   ],
   [
    "Would you like to come?",
    "Would you like to come to my birthday party?",
    "Would you like to come to my birthday party this Saturday?"
   ],
   [
    "Say yes.",
    "Yes, I’d love to! ___",
    "Yes, I’d love to! What time is it?"
   ],
   [
    "Say no politely.",
    "I’m sorry, ___.",
    "I’m sorry, I have other plans, but thanks for inviting me!"
   ]
  ]
 },
 {
  "code": "3.4",
  "unit": 3,
  "title": "Family Fiesta",
  "emoji": "👨‍👩‍👧‍👦",
  "hero": "mathman",
  "mission": {
   "en": "Describe your family and what everyone does!",
   "bn": "তোমার family আর সবার কাজের কথা বলো!"
  },
  "words": [
   [
    "Take care of",
    "যত্ন নেওয়া",
    true
   ],
   [
    "Cook",
    "রান্না করা",
    true
   ],
   [
    "Support",
    "সাহায্য করা",
    true
   ],
   [
    "Tell stories",
    "গল্প বলা",
    true
   ],
   [
    "Look after",
    "দেখভাল করা",
    true
   ],
   [
    "Fix",
    "মেরামত করা",
    true
   ],
   [
    "Share",
    "ভাগ করে নেওয়া",
    true
   ],
   [
    "Guide",
    "পথ দেখানো",
    true
   ]
  ],
  "games": [
   {
    "t": "spell",
    "title": "Family Spelling",
    "items": [
     [
      "supportive",
      "যে সাহায্য করে",
      "🤝"
     ],
     [
      "responsible",
      "দায়িত্বশীল",
      "🦸"
     ],
     [
      "family members",
      "পরিবারের সদস্যরা",
      "👨‍👩‍👧"
     ],
     [
      "younger",
      "বয়সে ছোট",
      "👧"
     ],
     [
      "elder",
      "বয়সে বড়",
      "👦"
     ],
     [
      "attentive",
      "মনোযোগী",
      "👂"
     ],
     [
      "together",
      "একসাথে",
      "🤗"
     ]
    ]
   },
   {
    "t": "tf",
    "title": "Family Sentences",
    "labels": [
     "Correct",
     "Not correct"
    ],
    "items": [
     [
      "I my love family.",
      false,
      "❤️"
     ],
     [
      "My grandfather stays with us.",
      true,
      "👴"
     ],
     [
      "I one have elder brother and one younger sister.",
      false,
      "👧"
     ],
     [
      "I’m the middle child.",
      true,
      "🧒"
     ],
     [
      "We together live in a small apartment in Dhaka.",
      false,
      "🏙️"
     ],
     [
      "In our family, we support each other.",
      true,
      "❤️"
     ],
     [
      "We a spend lot of quality time together.",
      false,
      "🤝"
     ]
    ]
   },
   {
    "t": "blank",
    "title": "Who Does What?",
    "items": [
     [
      "My grandmother {cooks} delicious food for me.",
      [
       "cook"
      ],
      "👵"
     ],
     [
      "My mother {works} as a teacher during the day.",
      [
       "work"
      ],
      "👩‍🏫"
     ],
     [
      "My father {helps} me with my homework.",
      [
       "help"
      ],
      "👨"
     ],
     [
      "Sometimes, my grandfather {cooks} the dinner for us.",
      [
       "cook"
      ],
      "👴"
     ],
     [
      "My father {helps} my mother with chores at home.",
      [
       "help"
      ],
      "🧹"
     ]
    ]
   }
  ],
  "talk": [
   [
    "How many member do you have in your family?",
    "I have ___ members in my family.",
    "I have 5 members in my family."
   ],
   [
    "What does your father and mother do?",
    "My father ___, and my mother ___.",
    "My father works at an office, and my mother stays at home and takes care of us."
   ],
   [
    "How many brothers/sisters do you have?",
    "I have ___.",
    "I have one elder brother and one younger sister."
   ],
   [
    "Who helps you with your homework?",
    "___ helps me with my homework.",
    "My grandpa helps me with my homework."
   ]
  ]
 },
 {
  "code": "4.1",
  "unit": 4,
  "title": "Toy Tales",
  "emoji": "🧸",
  "hero": "mathman",
  "mission": {
   "en": "Describe your favorite toys and games!",
   "bn": "তোমার প্রিয় toy আর game-এর বর্ণনা দাও!"
  },
  "words": [
   [
    "Soft",
    "নরম",
    true
   ],
   [
    "Colorful",
    "রঙিন",
    true
   ],
   [
    "Big",
    "বড়",
    true
   ],
   [
    "Small",
    "ছোট",
    true
   ],
   [
    "Fun",
    "মজাদার",
    true
   ],
   [
    "Shiny",
    "ঝকঝকে",
    true
   ],
   [
    "Build",
    "তৈরি করা",
    true
   ],
   [
    "Solve",
    "সমাধান করা",
    true
   ],
   [
    "Pretend",
    "ভান করা",
    true
   ]
  ],
  "games": [
   {
    "t": "find",
    "title": "Toy Words",
    "items": [
     [
      "Feels gentle, like a pillow.",
      "Soft"
     ],
     [
      "Full of bright colors, like a rainbow.",
      "Colorful"
     ],
     [
      "Large in size, like an elephant.",
      "Big"
     ],
     [
      "Tiny, like a mouse.",
      "Small"
     ],
     [
      "Makes you happy, like playing games.",
      "Fun"
     ],
     [
      "Bright and reflects light, like a mirror.",
      "Shiny"
     ],
     [
      "A strong sound, like thunder.",
      "Loud"
     ]
    ]
   },
   {
    "t": "sort",
    "title": "Toy or Machine?",
    "groups": [
     {
      "n": "Toys",
      "e": "🧸"
     },
     {
      "n": "Machines",
      "e": "⚙️"
     }
    ],
    "cards": [
     [
      "Doll",
      0,
      "🎎"
     ],
     [
      "Teddy Bear",
      0,
      "🧸"
     ],
     [
      "Puzzle",
      0,
      "🧩"
     ],
     [
      "Ball",
      0,
      "⚽"
     ],
     [
      "Building Blocks",
      0,
      "🧱"
     ],
     [
      "Kite",
      0,
      "🎏"
     ],
     [
      "Washing Machine",
      1,
      "🧼"
     ],
     [
      "Airplane",
      1,
      "✈️"
     ],
     [
      "Vacuum Cleaner",
      1,
      "🧹"
     ],
     [
      "Car",
      1,
      "🚗"
     ],
     [
      "Robot",
      1,
      "🤖"
     ],
     [
      "Helicopter",
      1,
      "🚁"
     ]
    ]
   },
   {
    "t": "anagram",
    "title": "Listen and Spell",
    "audio": true,
    "items": [
     [
      "build",
      "তৈরি করা",
      "🧱"
     ],
     [
      "race",
      "দৌড়ানো",
      "🏁"
     ],
     [
      "solve",
      "সমাধান করা",
      "🧩"
     ],
     [
      "pretend",
      "ভান করা",
      "🎭"
     ],
     [
      "create",
      "সৃষ্টি করা",
      "🎨"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What’s your most favourite toy?",
    "My most favorite toy is ___.",
    "My most favorite toy is a soft teddy bear."
   ],
   [
    "How does your favorite toy look?",
    "It has ___.",
    "It has cute black eyes with fluffy fur."
   ],
   [
    "Why do you like it so much?",
    "I like my teddy bear because ___.",
    "I like my teddy bear because it makes me feel safe and cozy when I sleep."
   ],
   [
    "What’s your favorite game?",
    "I love playing ___!",
    "I love playing football! It’s the best game ever!"
   ]
  ]
 },
 {
  "code": "4.2",
  "unit": 4,
  "title": "Safari",
  "emoji": "🦁",
  "hero": "knight",
  "mission": {
   "en": "Describe wild animals and talk about pets!",
   "bn": "বন্য প্রাণীর বর্ণনা দাও আর pet নিয়ে কথা বলো!"
  },
  "words": [
   [
    "Strong",
    "শক্তিশালী"
   ],
   [
    "Furry",
    "লোমশ"
   ],
   [
    "Scaly",
    "আঁশযুক্ত"
   ],
   [
    "Wild",
    "বন্য"
   ],
   [
    "Tame",
    "পোষ মানা"
   ],
   [
    "Playful",
    "খেলাধুলা পছন্দ করে"
   ],
   [
    "Friendly",
    "বন্ধুসুলভ"
   ],
   [
    "Loyal",
    "বিশ্বস্ত"
   ]
  ],
  "games": [
   {
    "t": "whack",
    "title": "Pet or Wild?",
    "prompt": "Tap only the Pet Animals ones!",
    "good": [
     "Dog",
     "Cat",
     "Goldfish",
     "Hamster",
     "Guinea Pig",
     "Rabbit",
     "Parrot",
     "Canary"
    ],
    "bad": [
     "Bear",
     "Giraffe",
     "Crocodile",
     "Fox",
     "Lion",
     "Tiger",
     "Rhinoceros",
     "Hippopotamus"
    ]
   },
   {
    "t": "boxes",
    "title": "Guess the Animal!",
    "items": [
     [
      "I have a trunk and long teeth. I am the largest land animal. What am I?",
      "Elephant",
      [
       "Tiger",
       "Giraffe",
       "Rhino"
      ],
      "🌿"
     ],
     [
      "I have a long neck and I eat leaves from tall trees. What am I?",
      "Giraffe",
      [
       "Zebra",
       "Kangaroo",
       "Camel"
      ],
      "🌳"
     ],
     [
      "I am a bird. I have sharp eyes and strong wings. I can fly very high. What am I?",
      "Eagle",
      [
       "Penguin",
       "Parrot",
       "Owl"
      ],
      "🏔️"
     ],
     [
      "I have orange fur with black stripes. I am a strong hunter and the national animal of Bangladesh. What am I?",
      "Tiger",
      [
       "Lion",
       "Cheetah",
       "Leopard"
      ],
      "🇧🇩"
     ],
     [
      "I am from Australia. I have strong legs and a pouch for my baby. What am I?",
      "Kangaroo",
      [
       "Deer",
       "Koala",
       "Bear"
      ],
      "🦘"
     ],
     [
      "I eat bamboo and have black and white fur. I am from China. What am I?",
      "Panda",
      [
       "Polar bear",
       "Raccoon",
       "Monkey"
      ],
      "🎋"
     ],
     [
      "I am a bird, but I cannot fly. I live in cold places and love to swim. What am I?",
      "Penguin",
      [
       "Chicken",
       "Duck",
       "Flamingo"
      ],
      "🧊"
     ]
    ]
   },
   {
    "t": "match",
    "title": "Animal Scramble",
    "pairs": [
     [
      "hippopotamus",
      "জলহস্তী"
     ],
     [
      "orangutan",
      "A big orange ape"
     ],
     [
      "woodpecker",
      "কাঠঠোকরা"
     ],
     [
      "chameleon",
      "It changes its color"
     ],
     [
      "kangaroo",
      "It has a pouch for its baby"
     ],
     [
      "crocodile",
      "কুমির"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What does the Lion look like?",
    "The lion has ___.",
    "The lion has a golden-brown body and a big, bushy mane around its head."
   ],
   [
    "What can the animal do?",
    "The elephant can ___.",
    "The elephant can use its trunk to grab food and water."
   ],
   [
    "Describe your pet.",
    "___ is my pet ___.",
    "Bubbles is my pet goldfish."
   ],
   [
    "What is your favorite activity with your pet?",
    "My favorite activity with my pet is ___.",
    "My favorite activity with my pet is feeding it every day."
   ]
  ]
 },
 {
  "code": "4.3",
  "unit": 4,
  "title": "Colour Craze",
  "emoji": "🎨",
  "hero": "bhasha",
  "mission": {
   "en": "Name colors and say where things are!",
   "bn": "রঙের নাম বলো আর জিনিসটি কোথায় আছে তা বলো!"
  },
  "words": [
   [
    "In",
    "মধ্যে",
    true
   ],
   [
    "On",
    "উপর",
    true
   ],
   [
    "Under",
    "নিচে",
    true
   ],
   [
    "Near",
    "কাছে",
    true
   ],
   [
    "Between",
    "মধ্যে",
    true
   ],
   [
    "Behind",
    "পেছনে",
    true
   ],
   [
    "In front of",
    "সামনে",
    true
   ],
   [
    "Far",
    "দুরে",
    true
   ],
   [
    "Around",
    "চারপাশে",
    true
   ]
  ],
  "games": [
   {
    "t": "blank",
    "title": "Pick the Colour",
    "items": [
     [
      "The grass is {green}.",
      [
       "purple"
      ],
      "🌱"
     ],
     [
      "Bananas are {yellow}.",
      [
       "blue"
      ],
      "🍌"
     ],
     [
      "Strawberries are {red}.",
      [
       "brown"
      ],
      "🍓"
     ],
     [
      "The ocean is {blue}.",
      [
       "orange"
      ],
      "🌊"
     ],
     [
      "Carrots are {orange}.",
      [
       "pink"
      ],
      "🥕"
     ],
     [
      "A panda has {black and white} fur.",
      [
       "yellow and green"
      ],
      "🐼"
     ],
     [
      "The sun is {yellow}.",
      [
       "purple"
      ],
      "☀️"
     ],
     [
      "A chocolate bar is {brown}.",
      [
       "green"
      ],
      "🍫"
     ],
     [
      "Eggplants are {purple}.",
      [
       "white"
      ],
      "🍆"
     ],
     [
      "Flamingos are {pink}.",
      [
       "black"
      ],
      "🦩"
     ]
    ]
   },
   {
    "t": "pair",
    "title": "Shape Pairs",
    "items": [
     [
      "Round",
      "",
      true,
      "📐",
      "svg:circle"
     ],
     [
      "Triangle",
      "",
      true,
      "📐",
      "svg:triangle"
     ],
     [
      "Square",
      "",
      true,
      "📐",
      "svg:square"
     ],
     [
      "Rectangle",
      "",
      true,
      "📐",
      "svg:rectangle"
     ],
     [
      "Oval",
      "",
      true,
      "📐",
      "svg:oval"
     ],
     [
      "Trapezium",
      "",
      true,
      "📐",
      "svg:trapezium"
     ],
     [
      "Round",
      "",
      false,
      "📐",
      "svg:square"
     ],
     [
      "Triangle",
      "",
      false,
      "📐",
      "svg:rectangle"
     ],
     [
      "Rectangle",
      "",
      false,
      "📐",
      "svg:triangle"
     ],
     [
      "Oval",
      "",
      false,
      "📐",
      "svg:circle"
     ],
     [
      "Trapezium",
      "",
      false,
      "📐",
      "svg:rectangle"
     ]
    ]
   },
   {
    "t": "plane",
    "title": "Where Is It?",
    "items": [
     [
      "The dog is hiding ___ the couch.",
      "under",
      [
       "on",
       "above"
      ]
     ],
     [
      "She walked ___ the door without knocking.",
      "through",
      [
       "between",
       "around"
      ]
     ],
     [
      "The plane flew ___ the mountains.",
      "across",
      [
       "under",
       "behind"
      ]
     ],
     [
      "The baby is sleeping ___ the bed.",
      "on",
      [
       "into",
       "by"
      ]
     ],
     [
      "We had a picnic ___ the park.",
      "in",
      [
       "under",
       "over"
      ]
     ],
     [
      "The rabbit ran ___ the hole.",
      "into",
      [
       "across",
       "over"
      ]
     ]
    ]
   }
  ],
  "talk": [
   [
    "What color is the dress?",
    "The dress is ___.",
    "The dress is red."
   ],
   [
    "How do we describe the ball’s shape?",
    "The ball is ___.",
    "The ball is round."
   ],
   [
    "Where is the ball?",
    "The ball is ___.",
    "The ball is on the table."
   ],
   [
    "Where is the dog?",
    "The dog is ___.",
    "The dog is under the table."
   ]
  ]
 },
 {
  "code": "4.4",
  "unit": 4,
  "title": "Style Shuffle",
  "emoji": "👕",
  "hero": "bhasha",
  "mission": {
   "en": "Name clothes and say what you like to wear!",
   "bn": "পোশাকের নাম বলো আর তুমি কী পরতে পছন্দ করো তা বলো!"
  },
  "words": [
   [
    "Saree",
    "শাড়ি"
   ],
   [
    "Panjabi",
    "পাঞ্জাবি"
   ],
   [
    "Sweater",
    "সোয়েটার"
   ],
   [
    "Socks",
    "মোজা"
   ],
   [
    "Footwear",
    "পায়ে পরার জিনিস"
   ],
   [
    "Accessories",
    "সাজের জিনিস"
   ],
   [
    "Traditional",
    "ঐতিহ্যবাহী"
   ],
   [
    "Comfortable",
    "আরামদায়ক"
   ]
  ],
  "games": [
   {
    "t": "quiz",
    "show": true,
    "title": "Odd One Out",
    "items": [
     [
      "Which of the following is not a traditional Bangladeshi clothing item?",
      "Jeans",
      [
       "Saree",
       "Panjabi",
       "Lungi"
      ],
      "🇧🇩"
     ],
     [
      "Find the odd one out among these clothing items:",
      "Panjabi",
      [
       "Saree",
       "Salwar Kameez",
       "Lehenga (long skirt outfit)"
      ],
      "👗"
     ],
     [
      "Which one is the odd one out in this list?",
      "Saree",
      [
       "Panjabi (kurta)",
       "Lungi",
       "Shirt"
      ],
      "👔"
     ],
     [
      "Which of these is the odd one out among winter clothes?",
      "T-shirt",
      [
       "Sweater",
       "Jacket",
       "Coat"
      ],
      "🧥"
     ],
     [
      "Which clothing item doesn’t belong with the others?",
      "Lungi",
      [
       "T-shirt",
       "Jeans",
       "Suit"
      ],
      "👕"
     ],
     [
      "Which one doesn’t belong with the others?",
      "Saree",
      [
       "Jeans",
       "T-shirt",
       "Shorts"
      ],
      "👖"
     ],
     [
      "Which option is the odd one out (considering typical school uniforms)?",
      "Panjabi",
      [
       "White shirt",
       "Navy blue pants",
       "School tie"
      ],
      "🎒"
     ]
    ]
   },
   {
    "t": "find",
    "title": "Who Am I? Clothes",
    "items": [
     [
      "I keep your feet warm in the winter. You wear me with socks.",
      "Boots"
     ],
     [
      "I protect your head from the sun during hot summer days.",
      "Cap"
     ],
     [
      "I’m a traditional dress worn by boys during festivals",
      "Panjabi"
     ],
     [
      "You wear me when it's raining and I help keep you dry.",
      "Raincoat"
     ],
     [
      "I’m worn on your eyes to protect them from sunlight",
      "Sunglasses"
     ],
     [
      "I’m worn by swimmers and I help you move easily in the water",
      "Swimsuit"
     ]
    ]
   },
   {
    "t": "boxes",
    "title": "What Should You Wear?",
    "items": [
     [
      "You should wear a raincoat.",
      "Rainy",
      [
       "Cold"
      ],
      "🌧️"
     ],
     [
      "You should wear sunglasses.",
      "Sunny",
      [
       "Snowy"
      ],
      "☀️"
     ],
     [
      "You must wear a jacket.",
      "Cold",
      [
       "Rainy"
      ],
      "🥶"
     ],
     [
      "You can wear light cotton clothes.",
      "Hot",
      [
       "Sunny"
      ],
      "🔥"
     ],
     [
      "You should take a swimsuit.",
      "Beach",
      [
       "Hiking"
      ],
      "🏖️"
     ],
     [
      "You must wear boots and gloves.",
      "Snowy",
      [
       "Rainy"
      ],
      "❄️"
     ],
     [
      "You have to wear your uniform.",
      "School",
      [
       "Rainy"
      ],
      "🏫"
     ],
     [
      "You can wear whatever you want.",
      "Home",
      [
       "School"
      ],
      "🏠"
     ],
     [
      "You should wear comfortable shoes.",
      "Hiking",
      [
       "Cold"
      ],
      "🥾"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What are you wearing today?",
    "Today, I am wearing ___.",
    "Today, I am wearing a Salwar Kameez with an orna and white sandals."
   ],
   [
    "How would you describe the clothing?",
    "My ___ is ___, and it’s made of ___.",
    "My dress is pink, and it’s made of cotton."
   ],
   [
    "Why did you choose these clothes?",
    "I chose this dress because ___.",
    "I chose this dress because it’s light and perfect for a warm day."
   ],
   [
    "What would you wear in the cold?",
    "People wear ___ when it’s cold.",
    "People wear a sweater when it’s cold."
   ]
  ]
 },
 {
  "code": "4.5",
  "unit": 4,
  "title": "Where to Go?",
  "emoji": "🚦",
  "hero": "mathman",
  "mission": {
   "en": "Read street signs and ask for directions!",
   "bn": "Street sign চিনে নাও আর direction জিজ্ঞেস করো!"
  },
  "words": [
   [
    "Turn left",
    "বামে যাওয়া",
    true
   ],
   [
    "Turn right",
    "ডান যাওয়া",
    true
   ],
   [
    "Go straight",
    "সোজা যাওয়া",
    true
   ],
   [
    "Turn back",
    "পেছানো",
    true
   ],
   [
    "Turn around",
    "উল্টা ঘুরে যাওয়া",
    true
   ],
   [
    "Down the street",
    "রাস্তার সামনের দিকে",
    true
   ]
  ],
  "games": [
   {
    "t": "spell",
    "title": "Make a Word",
    "items": [
     [
      "straight",
      "সোজা",
      "⬆️"
     ],
     [
      "left",
      "বাম দিক",
      "⬅️"
     ],
     [
      "back",
      "পেছন দিক",
      "🔙"
     ],
     [
      "exit",
      "The way out",
      "🚪"
     ],
     [
      "right",
      "ডান দিক",
      "➡️"
     ],
     [
      "return",
      "ফিরে আসা",
      "↩️"
     ],
     [
      "turn",
      "ঘুরে যাওয়া",
      "🔄"
     ],
     [
      "stop",
      "Red light means this",
      "🛑"
     ],
     [
      "park",
      "A place with trees to play in",
      "🌳"
     ],
     [
      "roads",
      "রাস্তা",
      "🛣️"
     ],
     [
      "traffic",
      "রাস্তার যানবাহন",
      "🚦"
     ],
     [
      "sign",
      "চিহ্ন",
      "⚠️"
     ],
     [
      "north",
      "উত্তর",
      "🧭"
     ],
     [
      "south",
      "দক্ষিণ",
      "🧭"
     ],
     [
      "east",
      "পূর্ব",
      "🌅"
     ],
     [
      "west",
      "পশ্চিম",
      "🌇"
     ]
    ]
   },
   {
    "t": "match",
    "title": "Sign Match",
    "pairs": [
     [
      "🛑 Stop Sign",
      "Tells drivers to stop completely before moving forward"
     ],
     [
      "🔴 Traffic Light (Red)",
      "Stop the car and wait till the light becomes green"
     ],
     [
      "🦓 Zebra Crossing",
      "Helps people cross the road safely"
     ],
     [
      "↩️ U-turn Sign",
      "Lets drivers turn back in the opposite direction"
     ],
     [
      "🅿️ No Parking Sign",
      "Tells drivers not to park here"
     ],
     [
      "🔕 No Horn Sign",
      "No honking in quiet areas like schools"
     ],
     [
      "🔢 Speed Limit Sign",
      "Tells drivers the fastest allowed speed"
     ],
     [
      "🚪 Exit Sign",
      "Shows the way out of a building or area"
     ],
     [
      "🟢 Traffic Light (Green)",
      "Go with the car"
     ],
     [
      "🟡 Traffic Light (Yellow)",
      "Slow down the car"
     ]
    ]
   },
   {
    "t": "tf",
    "title": "Error Detector",
    "items": [
     [
      "A stop sign means cars must stop.",
      true,
      "🛑"
     ],
     [
      "Zebra crossings help people cross the road safely.",
      true,
      "🦓"
     ],
     [
      "U-turn signs allow drivers to go back in the opposite direction.",
      true,
      "↩️"
     ],
     [
      "Red light means stop, and yellow light means get ready.",
      true,
      "🔴"
     ],
     [
      "Speed limit signs help drivers know how fast they can drive.",
      true,
      "🔢"
     ],
     [
      "Traffic signs help keep roads safe for everyone.",
      true,
      "🚦"
     ],
     [
      "No Parking signs help keep the roads clear.",
      true,
      "🅿️"
     ],
     [
      "You can park your car where there’s a No Parking sign.",
      false,
      "🚫"
     ],
     [
      "The green light means stop.",
      false,
      "🟢"
     ],
     [
      "A No Horn sign tells drivers they can honk anytime.",
      false,
      "🔕"
     ],
     [
      "Exit signs show people the way into a place.",
      false,
      "🚪"
     ],
     [
      "Drivers should slow down at a No Parking sign.",
      false,
      "🅿️"
     ],
     [
      "You must stop at a green light.",
      false,
      "🟢"
     ],
     [
      "Zebra crossings are for cars to speed up.",
      false,
      "🦓"
     ],
     [
      "You can make a U-turn anywhere, even if there is no sign.",
      false,
      "↩️"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What is this? What is the use of it?",
    "A traffic light has three lights. It tells cars and people when to ___.",
    "A traffic light has three lights. It tells cars and people when to stop, when to go, and when to slow down."
   ],
   [
    "Ask for directions to the park.",
    "Excuse me, can you tell me how to get to the ___?",
    "Excuse me, can you tell me how to get to the park?"
   ],
   [
    "How do you get to the Park from the Restaurant?",
    "Go straight and then turn ___.",
    "Go straight and then turn left at the school."
   ],
   [
    "Someone helped you. Reply.",
    "Thanks! Is it far from here?",
    "Thanks! Is it far from here?"
   ]
  ]
 },
 {
  "code": "4.6",
  "unit": 4,
  "title": "Unveiling Festivals",
  "emoji": "🎆",
  "hero": "innovara",
  "mission": {
   "en": "Describe festivals and share your favorite memory!",
   "bn": "উৎসবের বর্ণনা দাও আর তোমার প্রিয় স্মৃতির কথা বলো!"
  },
  "words": [
   [
    "Festival",
    "উৎসব"
   ],
   [
    "Celebrate",
    "উদযাপন করা"
   ],
   [
    "Get → Got",
    "পাওয়া → পেয়েছিলাম"
   ],
   [
    "Eat → Ate",
    "খাওয়া → খেয়েছিলাম"
   ],
   [
    "Feel → Felt",
    "অনুভব করা → অনুভব করেছিলাম"
   ],
   [
    "Smile → Smiled",
    "হাসা → হেসেছিলাম"
   ]
  ],
  "games": [
   {
    "t": "sort",
    "title": "Now or Before?",
    "groups": [
     {
      "n": "Present Tense Sentences",
      "e": "▶️"
     },
     {
      "n": "Past Tense Sentences",
      "e": "⏪"
     }
    ],
    "cards": [
     [
      "I eat biriyani.",
      0,
      ""
     ],
     [
      "They go to the mosque.",
      0,
      "🕌"
     ],
     [
      "She wears a red dress.",
      0,
      ""
     ],
     [
      "We celebrate Pohela Boishakh together.",
      0,
      "🤝"
     ],
     [
      "My father gives me a gift.",
      0,
      "🎁"
     ],
     [
      "I feel happy during Christmas.",
      0,
      ""
     ],
     [
      "She sings a song every Eid.",
      0,
      "👘"
     ],
     [
      "He plays with his cousins.",
      0,
      "🪔"
     ],
     [
      "I wear white on Buddha Purnima.",
      0,
      ""
     ],
     [
      "We visit our relatives on festivals.",
      0,
      ""
     ],
     [
      "He smiles at everyone.",
      0,
      ""
     ],
     [
      "My mother cooks delicious food.",
      0,
      "👩"
     ],
     [
      "We wore new clothes.",
      1,
      "👘"
     ],
     [
      "She got a red balloon.",
      1,
      ""
     ],
     [
      "I ate too many sweets.",
      1,
      "🍬"
     ],
     [
      "They went to Ramna Park.",
      1,
      "🌳"
     ],
     [
      "He gave a gift to a poor boy.",
      1,
      "🎁"
     ],
     [
      "I felt very excited.",
      1,
      ""
     ],
     [
      "She sang beautifully.",
      1,
      ""
     ],
     [
      "My parents took me to a fair.",
      1,
      "🎡"
     ],
     [
      "We celebrated Eid at my uncle’s house.",
      1,
      "👘"
     ],
     [
      "He smiled when he saw the lights.",
      1,
      ""
     ],
     [
      "I played with my cousins all day.",
      1,
      "🪔"
     ],
     [
      "She cooked biriyani for the whole family.",
      1,
      "❤️"
     ]
    ]
   },
   {
    "t": "blank",
    "title": "Missing Word",
    "items": [
     [
      "We {celebrate} Pohela Boishakh every year.",
      [
       "celebrated"
      ],
      "🎊"
     ],
     [
      "He {gave} sweets to a child last Eid.",
      [
       "gives"
      ],
      "🍬"
     ],
     [
      "On Eid, people {wear} new clothes.",
      [
       "wore"
      ],
      "👘"
     ],
     [
      "They usually {eat} biryani and sweets during Eid.",
      [
       "ate"
      ],
      "🍛"
     ],
     [
      "She {sang} a song at the Durga Puja fair last year.",
      [
       "sings"
      ],
      "🎤"
     ],
     [
      "They {went} to Ramna Park on Pohela Boishakh.",
      [
       "goes"
      ],
      "🌳"
     ],
     [
      "I {got} a big red balloon last year.",
      [
       "get"
      ],
      "🎈"
     ],
     [
      "We {enjoy} panta bhaat and ilish every Boishakh.",
      [
       "enjoyed"
      ],
      "🐟"
     ],
     [
      "He {felt} very happy during Christmas last year.",
      [
       "feels"
      ],
      "🎄"
     ],
     [
      "I always {help} my mother cook festival food.",
      [
       "helped"
      ],
      "👩"
     ],
     [
      "They {decorated} the house with stars last Christmas.",
      [
       "decorate"
      ],
      "⭐"
     ],
     [
      "She {smiled} when she saw the lights.",
      [
       "smiles"
      ],
      "💡"
     ]
    ]
   },
   {
    "t": "unjumble",
    "title": "Fix the Festival Sentence!",
    "items": [
     "👘|I wore new clothes on Eid.",
     "👘|We ate sweets on Eid.",
     "🌸|I wore red and white on Boishakh.",
     "❤️|I went to the fair with my family.",
     "🌸|Pohela Boishakh is the Bengali New Year.",
     "🕌|We go to the mosque.",
     "🎅|I left cookies for Santa.",
     "🪔|We celebrated Durga Puja at my cousin’s house.",
     "🍛|I ate delicious biryani.",
     "🎁|My friend gave me a gift."
    ]
   }
  ],
  "talk": [
   [
    "What is your favorite festival?",
    "My favourite festival is ___.",
    "My favourite festival is Pohela Boishakh."
   ],
   [
    "Who did you celebrate with?",
    "I celebrated it with ___ at ___.",
    "I celebrated it with my parents and my cousin at Ramna Park."
   ],
   [
    "What’s your favourite festival memory?",
    "I got ___.",
    "I got a big red balloon and ate panta-ilish for the first time!"
   ],
   [
    "How did you feel?",
    "It made me feel ___.",
    "It made me feel so special and brave."
   ]
  ]
 },
 {
  "code": "4.7",
  "unit": 4,
  "title": "Life on Wheels",
  "emoji": "🚌",
  "hero": "innovara",
  "mission": {
   "en": "Talk about vehicles and your travel stories!",
   "bn": "বিভিন্ন যানবাহন আর তোমার ভ্রমণের গল্প বলো!"
  },
  "words": [
   [
    "Commute",
    "যাতায়াত",
    true
   ],
   [
    "Transportation",
    "পরিবহন",
    true
   ],
   [
    "Route",
    "পথ",
    true
   ],
   [
    "Carpool",
    "একসাথে গাড়ি ব্যবহার করা",
    true
   ],
   [
    "Subway",
    "মাটির নিচের ট্রেন"
   ]
  ],
  "games": [
   {
    "t": "anagram",
    "title": "Name the Vehicles",
    "audio": true,
    "items": [
     [
      "aeroplane",
      "I have wings. I fly in the sky.",
      "✈️"
     ],
     [
      "rickshaw",
      "রিকশা",
      "🛺"
     ],
     [
      "helicopter",
      "I fly with big spinning blades",
      "🚁"
     ],
     [
      "motorbike",
      "I have two wheels and an engine",
      "🏍️"
     ],
     [
      "launch",
      "লঞ্চ",
      "🛥️"
     ],
     [
      "rocket",
      "I fly to space",
      "🚀"
     ],
     [
      "bicycle",
      "I have two wheels. You pedal me.",
      "🚲"
     ],
     [
      "train",
      "I run on tracks",
      "🚆"
     ],
     [
      "pickup truck",
      "I carry things in my open back",
      "🛻"
     ],
     [
      "ship",
      "I move on water",
      "🚢"
     ]
    ]
   },
   {
    "t": "whack",
    "title": "Where Does It Go?",
    "prompt": "Tap only the In the air ones!",
    "good": [
     "Airplane",
     "Helicopter",
     "Hot Air Balloon",
     "Spaceship",
     "Rocket",
     "Glider",
     "Jet Plane",
     "Military Fighter Jet",
     "Zeppelin / Airship",
     "Hang Glider"
    ],
    "bad": [
     "Bus",
     "Car",
     "Rickshaw",
     "CNG",
     "Bicycle",
     "Truck",
     "Mini-Bus",
     "Motorbike",
     "Covered Van",
     "Jeep"
    ]
   },
   {
    "t": "quiz",
    "title": "Complete the Blanks",
    "items": [
     [
      "A bus is ___ the school.",
      "in front of",
      [
       "on"
      ],
      "🚌"
     ],
     [
      "The car is ___ the garage.",
      "in",
      [
       "of"
      ],
      "🚗"
     ],
     [
      "The bicycle is ___ the tree.",
      "behind",
      [
       "inside"
      ],
      "🚲"
     ],
     [
      "The motorbike is ___ two trucks.",
      "between",
      [
       "on"
      ],
      "🏍️"
     ],
     [
      "The plane is flying ___ the city.",
      "over",
      [
       "under"
      ],
      "✈️"
     ],
     [
      "The rickshaw is ___ the bridge.",
      "under",
      [
       "inside"
      ],
      "🛺"
     ],
     [
      "The boat is ___ the shore.",
      "near",
      [
       "in"
      ],
      "🚤"
     ],
     [
      "The train is ___ the tracks.",
      "on",
      [
       "of"
      ],
      "🚆"
     ],
     [
      "The van is ___ the bus stop.",
      "beside",
      [
       "on"
      ],
      "🚐"
     ]
    ]
   }
  ],
  "talk": [
   [
    "What is the name of this transport?",
    "This is a ___.",
    "This is a bus."
   ],
   [
    "Where does it go?",
    "It goes on the ___.",
    "It goes on the road."
   ],
   [
    "Did you travel anywhere recently? Where did you go?",
    "I went to ___.",
    "I went to Cox’s Bazar."
   ],
   [
    "Who did you go with?",
    "I went with ___.",
    "I went with my parents and my little brother."
   ]
  ]
 },
 {
  "code": "4.8",
  "unit": 4,
  "title": "Season Spin",
  "emoji": "🌦️",
  "hero": "knight",
  "mission": {
   "en": "Describe the seasons and share your favorite!",
   "bn": "ঋতুর বর্ণনা দাও আর তোমার প্রিয় ঋতুর কথা বলো!"
  },
  "words": [
   [
    "Spring",
    "বসন্ত",
    true
   ],
   [
    "Summer",
    "গ্রীষ্ম",
    true
   ],
   [
    "Autumn",
    "শরৎ",
    true
   ],
   [
    "Winter",
    "শীত",
    true
   ],
   [
    "Heatwave",
    "তাপপ্রবাহ",
    true
   ],
   [
    "Drought",
    "খরা",
    true
   ],
   [
    "Monsoon",
    "বর্ষা",
    true
   ],
   [
    "Chilly",
    "ঠাণ্ডা",
    true
   ],
   [
    "Mild",
    "হালকা",
    true
   ]
  ],
  "games": [
   {
    "t": "plane",
    "title": "Season Quiz Show",
    "items": [
     [
      "Which season do people wear raincoats?",
      "Rainy Season",
      [
       "Summer",
       "Winter"
      ]
     ],
     [
      "What is the weather like in winter?",
      "Very cold",
      [
       "Hot and sunny",
       "Wet and rainy"
      ]
     ],
     [
      "What do people do in the rainy season?",
      "Jump in puddles",
      [
       "Go swimming",
       "Sit by the fire"
      ]
     ],
     [
      "What do people wear in summer?",
      "T-shirts and caps",
      [
       "Woolen jackets",
       "Raincoats"
      ]
     ],
     [
      "Which season is known for blooming flowers?",
      "Spring",
      [
       "Autumn",
       "Summer"
      ]
     ],
     [
      "What do people like to drink in winter?",
      "Hot chocolate",
      [
       "Cold drinks",
       "Lemonade"
      ]
     ],
     [
      "Which season has cool and windy weather with falling leaves?",
      "Autumn",
      [
       "Spring",
       "Winter"
      ]
     ],
     [
      "Which season comes before winter and feels chilly?",
      "Late Autumn",
      [
       "Autumn",
       "Spring"
      ]
     ],
     [
      "When do people wear jackets and scarves?",
      "Winter",
      [
       "Autumn",
       "Summer"
      ]
     ]
    ]
   },
   {
    "t": "spell",
    "title": "Spell the Season",
    "items": [
     [
      "spring",
      "বসন্ত",
      "🌼"
     ],
     [
      "summer",
      "গ্রীষ্ম",
      "☀️"
     ],
     [
      "autumn",
      "শরৎ",
      "🍂"
     ],
     [
      "winter",
      "শীত",
      "⛄"
     ],
     [
      "heatwave",
      "তাপপ্রবাহ",
      "🥵"
     ],
     [
      "drought",
      "খরা",
      "🏜️"
     ],
     [
      "monsoon",
      "বর্ষা",
      "🌧️"
     ],
     [
      "frost",
      "হিম",
      "❄️"
     ],
     [
      "chilly",
      "ঠাণ্ডা",
      "🥶"
     ],
     [
      "mild",
      "হালকা",
      "🌤️"
     ],
     [
      "weather",
      "আবহাওয়া",
      "🌦️"
     ]
    ]
   },
   {
    "t": "unjumble",
    "title": "A or An?",
    "items": [
     "🍦|It’s hot today. I want to eat an ice cream.",
     "🧥|In winter, I wear a jacket to stay warm.",
     "🌷|Spring is an amazing season.",
     "☂️|He is holding an umbrella in the rainy season.",
     "🍵|My mom made a hot cup of tea in winter.",
     "🦅|I saw an eagle flying in the sky.",
     "🧣|That is a beautiful scarf for autumn.",
     "🍊|We had an orange after the picnic.",
     "🧶|She brought a sweater for the trip.",
     "🐘|Look! It’s an elephant in the zoo."
    ]
   }
  ],
  "talk": [
   [
    "What is the name of the season?",
    "The name of the season is ___.",
    "The name of the season is winter."
   ],
   [
    "What do you like about this season?",
    "I like the ___.",
    "I like the cold weather and wearing warm clothes."
   ],
   [
    "What do you wear in this season?",
    "I wear ___.",
    "I wear jackets, woolly hats and gloves."
   ],
   [
    "What do you like to do during this season?",
    "I like ___.",
    "I like drinking hot chocolate and staying cozy at home."
   ]
  ]
 }
];
