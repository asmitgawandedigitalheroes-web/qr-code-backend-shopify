require("dotenv").config();
const express = require("express");
const cors = require("cors");
const galleriesRouter = require("./routes/galleries");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE"] }));
app.use(express.json());

app.use("/api/galleries", galleriesRouter);

app.get("/", (req, res) => res.send("QR Code Gallery API is live."));
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// Local development
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Gallery API running on port ${PORT}`);
  });
}

module.exports = app;
