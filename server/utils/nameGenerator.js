const adjectives = [
  'Happy', 'Sad', 'Angry', 'Funny', 'Clever', 'Brave',
  'Quiet', 'Loud', 'Fast', 'Slow', 'Red', 'Blue',
  'Green', 'Yellow', 'Purple', 'Orange', 'Pink',
  'White', 'Black', 'Brown'
];

const animals = [
  'Dog', 'Cat', 'Bird', 'Fish', 'Lion', 'Tiger',
  'Bear', 'Wolf', 'Fox', 'Rabbit', 'Mouse', 'Rat',
  'Horse', 'Cow', 'Pig', 'Sheep', 'Goat', 'Chicken',
  'Duck', 'Goose'
];

const getRandomAnimalName = () => {
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  return `${randomAdjective} ${randomAnimal}`;
};

module.exports = {
  getRandomAnimalName
};