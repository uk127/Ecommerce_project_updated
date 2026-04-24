const express = require("express");
const router = express.Router();
const { processSellerAIRequest } = require("../controller/aiController");

router.post("/seller", processSellerAIRequest);

module.exports = router;
