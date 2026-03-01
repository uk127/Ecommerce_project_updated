const mongoose = require("mongoose");

const connectDatabase = async () => {
  try {
    // Mongoose 8+ no longer needs useNewUrlParser and useUnifiedTopology options
    // These options are now defaults and specifying them will throw warnings
    const data = await mongoose.connect(process.env.DB_URL);
    console.log(`MongoDB connected with server: ${data.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDatabase;
