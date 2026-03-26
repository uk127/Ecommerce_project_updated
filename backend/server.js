const express = require("express");
const mongoose = require("mongoose");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const app = express();

const cookieParser = require("cookie-parser");
const cors = require("cors");
const path = require("path");

// config - load environment variables first
if (process.env.NODE_ENV !== "PRODUCTION") {
  require("dotenv").config({
    path: ".env",
  });
}

// connect db
connectDatabase();

// create server
const server = app.listen(process.env.PORT, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT}`);
});

// Setup Change Streams after MongoDB connection is established
mongoose.connection.once("open", () => {
  console.log("[Server] MongoDB connection established, setting up Change Streams...");
  
  // Import setupChangeStreams for incremental clustering
  const { setupChangeStreams } = require("./utils/changeStreams");
  setupChangeStreams();
});

// Handle graceful shutdown - close change streams before exit
const gracefulShutdown = async () => {
  console.log("[Server] Shutting down gracefully...");
  
  try {
    const { closeChangeStreams } = require("./utils/changeStreams");
    await closeChangeStreams();
    console.log("[Server] Change streams closed");
  } catch (error) {
    console.error("[Server] Error closing change streams:", error.message);
  }
  
  mongoose.connection.close(false);
  server.close(() => {
    console.log("[Server] Server closed");
    process.exit(0);
  });
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// middlewares
// Express 5 has built-in body parsing, no need for body-parser
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// Enable CORS for all routes
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003"],
    credentials: true,
  })
);

app.use("/", express.static("uploads"));

app.get("/test", (req, res) => {
  res.send("Hello World!");
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// routes
const user = require("./controller/user");
const shop = require("./controller/shop");
const product = require("./controller/product");
const event = require("./controller/event");
const coupon = require("./controller/coupounCode");
const payment = require("./controller/payment");
const order = require("./controller/order");
const message = require("./controller/message");
const conversation = require("./controller/conversation");
const withdraw = require("./controller/withdraw");
const aiAssistant = require("./controller/aiAssistant");
const cart = require("./controller/cart");
const activityRoutes = require("./routes/activityRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const clusteringRoutes = require("./routes/clusteringRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");

app.use("/api/v2/withdraw", withdraw);

// end points
app.use("/api/v2/user", user);
app.use("/api/v2/conversation", conversation);
app.use("/api/v2/message", message);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/event", event);
app.use("/api/v2/coupon", coupon);
app.use("/api/v2/payment", payment);
app.use("/api/v2/ai-assistant", aiAssistant);
app.use("/api/v2/cart", cart);
app.use("/api/v2/activity", activityRoutes);
app.use("/api/v2/recommendations", recommendationRoutes);
app.use("/api/v2/clustering", clusteringRoutes);
app.use("/api/v2/analytics", analyticsRoutes);

// it'for errhendel
app.use(ErrorHandler);

// Handling Uncaught Exceptions
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling UNCAUGHT EXCEPTION! 💥`);
});

// unhandled promise rejection
process.on("unhandledRejection", (err) => {
  console.log(`Shutting down the server for ${err.message}`);
  console.log(`shutting down the server for unhandle promise rejection`);

  server.close(() => {
    process.exit(1);
  });
});