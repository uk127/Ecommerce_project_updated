const { refineRecommendations, refineForUser } = require('./refineRecommendations');

// Example mock products
const products = [
  { _id: '1', name: 'Product A', price: 500, ratings: 4.5 },
  { _id: '2', name: 'Product B', price: 1500, ratings: 4.8 },
  { _id: '3', name: 'Product C', price: 300, ratings: 3.9 },
  { _id: '4', name: 'Product D', price: 2000, ratings: 5 },
  { _id: '5', name: 'Product E', price: 800, ratings: 4.2 }
];

// Test segment-based refinement
const testRefinement = async () => {
  console.log('=== Premium User ===');
  const premium = refineRecommendations(products, 'premium');
  console.log(premium.map(p => ({ name: p.name, price: p.price, ratings: p.ratings })));

  console.log('\n=== Budget User ===');
  const budget = refineRecommendations(products, 'budget');
  console.log(budget.map(p => ({ name: p.name, price: p.price })));

  console.log('\n=== Regular User ===');
  const regular = refineRecommendations(products, 'regular');
  console.log(regular.map(p => ({ name: p.name, price: p.price })));
};

testRefinement();