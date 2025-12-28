const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const { MongoClient, ObjectId, GridFSBucket } = require("mongodb");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = "mongodb+srv://adityadubey:Nh3JbOX2LHQm4dTv@cluster0.k3jf7tw.mongodb.net/demoreview";
const PORT = 3000;

/* -------------------- Mongo Connection -------------------- */
let gfsBucket;
let db;

MongoClient.connect(MONGO_URI).then((client) => {
  db = client.db();
  gfsBucket = new GridFSBucket(db, { bucketName: "logos" });
  console.log("MongoDB Connected");
});

/* -------------------- Multer Setup -------------------- */
const storage = multer.memoryStorage();
const upload = multer({ storage });

/* -------------------- Save Company -------------------- */
app.post("/company", upload.single("logo"), async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Logo file is required" });
    }

    const uploadStream = gfsBucket.openUploadStream(
      req.file.originalname,
      { contentType: req.file.mimetype }
    );

    uploadStream.end(req.file.buffer);

    uploadStream.on("finish", async () => {
      const company = {
        name,
        email,
        logoId: uploadStream.id, // ✅ FIX HERE
      };

      await db.collection("companies").insertOne(company);

      res.json({
        message: "Company saved successfully",
        company,
      });
    });

    uploadStream.on("error", (err) => {
      res.status(500).json({ error: err.message });
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* -------------------- Get Companies -------------------- */
app.get("/companies", async (req, res) => {
  const companies = await db.collection("companies").find().toArray();
  res.json(companies);
});

/* -------------------- Get Logo Image -------------------- */
app.get("/logo/:id", (req, res) => {
  gfsBucket
    .openDownloadStream(new ObjectId(req.params.id))
    .pipe(res);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
