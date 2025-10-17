/** @type {Record<string, {name: string, description: string, image: string, minHours: number, minStars: number, maxStars: number, primaryColor: string, secondaryColor: string, cta: string, markdownContent: string, eggImages: string[]}>} */
export const promptData = {
  "roulette": {
    name: 'ROULETTE',
    description: 'Spin three wheels & let fate decide the contents of your game!',
    image: '/prompts/roulette.png',
    minHours: 20,
    minStars: 150,
    maxStars: 500,
    primaryColor: '#ED738B',
    secondaryColor: 'black',
    cta: 'SPIN WHEELS!',
    eggImages: [
      '/projects/roulette_egg1.png',
      '/projects/roulette_egg2.png'
    ],
    markdownContent: `

  You've spun the wheels. Now, you have to follow through!

  Combine the results of the wheels to create a game that is wholly unique and new. Take this chance to experiment with game mechanics and ideas.

  Your game does not have to be 100% true to the results of the wheels as long as you try to incorporate them as much as you can.
`
  },
  "sparkle": {
    name: 'SPARKLE',
    description: 'Take a simple game, and make it as polished and juicy as you can!',
    image: '/prompts/sparkle.png',
    minHours: 5,
    minStars: 30,
    maxStars: 300,
    primaryColor: '#bf9a0d',
    secondaryColor: '#f2eac2',
    cta: 'MAKE SPARKLES!',
    eggImages: [
      '/projects/sparkle_egg1.png',
      '/projects/sparkle_egg2.png'
    ],
    markdownContent: `

This is a challenge that builds your gamedev skillset. Take a simple game concept and make it absolutely shine :)

## What games can we make?

Some examples are: pong, pacman, tetris, flappy bird, snake, space shooter, cookie clicker, simple platformer/infinite runner, etc.

Don't spend too much time working on the core mechanics. Challenge yourself to focus on the polish and juice.

## How do you add polish and juice?

- Feedback: every action that you make in the game should feel satisfying!
- Use techniques like: animations, screen shakes, particles, sound effects, music
- Also consider experimenting with: transitions, shaders, building a 2d game in 3d, etc.
- Make the gameplay super smooth and responsive — no bugs!

## Let's start!

Check out some of these resources for how to make a game _feel good._

- [Platformer Toolkit](https://gmtk.itch.io/platformer-toolkit) by GMTK explains the details that make up a platformer's feel 
- [Daily Akari](https://dailyakari.com/) is a web-based daily puzzle game that has a really simple premise, but is an absolute joy to play thanks to the interactions and effects.
- [Recreating Balatro's effect in Godot](https://www.youtube.com/watch?v=Alwy-TH0WzE) is also super cool, especially for the more technical parts. Balatro is really well-made with so many particles, too!
- [How To Shader. (using Godot Engine)](https://www.youtube.com/watch?v=KVTa2xkly1g) explains shaders so well! I really loved watching this.

You can also think of your favorite game and look for the little details that make it feel good.

Coins awarded will be based on how long your project took and how well-made it is.
`
  },
  "new": {
    name: 'CUSTOM PROJECT',
    description: 'Or: make your own! Any game you want!',
    image: '/prompts/yourown.png',
    minHours: 10,
    minStars: 50,
    maxStars: 1000,
    primaryColor: 'black',
    secondaryColor: 'white',
    cta: 'SOMETHING NEW!',
    eggImages: [
      '/projects/new_egg1.png',
      '/projects/new_egg2.png'
    ],
    markdownContent: `
    
This is a catch-all custom project! You can make any game you want beyond the Milkyway challenge prompts.

Make sure your project is good and fun to play.

Coins will be awarded based on how long you have spent developing your project and how well-made and fun it is to play.

Need help getting started? Come say hi in the #milkyway slack channel!

`
  }
};

// Helper function to get prompt data by name (case insensitive)
export function getPromptData(/** @type {string} */ promptName) {
  if (!promptName) return null;
  
  const normalizedName = promptName.toLowerCase();
  
  // Check for exact matches first
  if (promptData[normalizedName]) {
    return promptData[normalizedName];
  }
  
  // Check for partial matches
  for (const [key, data] of Object.entries(promptData)) {
    if (data.name.toLowerCase().includes(normalizedName) || 
        normalizedName.includes(data.name.toLowerCase())) {
      return data;
    }
  }
  
  return null;
}

// Helper function to get a random egg image for a prompt
export function getRandomEggImage(/** @type {string} */ promptName) {
  const prompt = getPromptData(promptName);
  if (!prompt || !prompt.eggImages || prompt.eggImages.length === 0) {
    return '/projects/sparkle_egg1.png'; // fallback
  }
  
  const randomIndex = Math.floor(Math.random() * prompt.eggImages.length);
  return prompt.eggImages[randomIndex];
}

// Helper function to map egg images to their corresponding creature images
export function getCreatureImageFromEgg(/** @type {string} */ eggImagePath) {
  if (!eggImagePath) return '/projects/new_creature1.png'; // fallback
  
  // Map egg images to creature images
  const eggToCreatureMap = /** @type {Record<string, string>} */ ({
    '/projects/new_egg1.png': '/projects/new_creature1.png',
    '/projects/new_egg2.png': '/projects/new_creature2.png',
    '/projects/sparkle_egg1.png': '/projects/sparkle_creature1.png',
    '/projects/sparkle_egg2.png': '/projects/sparkle_creature2.png',
    '/projects/roulette_egg1.png': '/projects/new_creature1.png', // Temporary fallback until roulette creatures are ready
    '/projects/roulette_egg2.png': '/projects/new_creature2.png'  // Temporary fallback until roulette creatures are ready
  });
  
  // Also handle cases where the path might not start with '/projects/'
  const normalizedPath = eggImagePath.startsWith('/projects/') ? eggImagePath : `/projects/${eggImagePath}`;
  
  return eggToCreatureMap[normalizedPath] || '/projects/new_creature1.png'; // fallback
}

// Helper function to get the appropriate SVG shape based on the creature image
export function getCreatureShapeFromCreature(/** @type {string} */ creatureImagePath) {
  if (!creatureImagePath) return '/projects/egg_shape.svg'; // fallback
  
  // Map creature images to their corresponding SVG shapes
  const creatureToShapeMap = /** @type {Record<string, string>} */ ({
    '/projects/new_creature1.png': '/projects/new_creature_shape.svg',
    '/projects/new_creature2.png': '/projects/new_creature_shape.svg',
    '/projects/sparkle_creature1.png': '/projects/sparkle_creature_shape.svg',
    '/projects/sparkle_creature2.png': '/projects/sparkle_creature_shape.svg'
  });
  
  // Also handle cases where the path might not start with '/projects/'
  const normalizedPath = creatureImagePath.startsWith('/projects/') ? creatureImagePath : `/projects/${creatureImagePath}`;
  
  return creatureToShapeMap[normalizedPath] || '/projects/egg_shape.svg'; // fallback
}
