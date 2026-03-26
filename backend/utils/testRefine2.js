// testRefine.js
const mongoose = require('mongoose');
const { refineForUser } = require('./refineRecommendations');
const { getHomeRecommendations } = require('./recommendation');

(async () => {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const userId = '69726d8984c77f1218514e97';

  const baseRecommendations = await getHomeRecommendations(userId, 5);
  console.log('Base Recommendations:', baseRecommendations.recommendations.length);

  const refined = await refineForUser(baseRecommendations.recommendations, userId);
  console.log('Refined Recommendations:', refined.length);

  await mongoose.disconnect();
})();