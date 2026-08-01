require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const complaintRoutes = require("./routes/complaints");
const adminRoutes = require("./routes/admin");
const notificationRoutes = require("./routes/notifications");

const app = express();

// -------------------- Uploads Folder --------------------

const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// -------------------- CORS --------------------

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "https://civic-connectad.netlify.app",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {

        // Allow Postman/server-to-server requests
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("CORS Not Allowed"));
    },

    credentials: true,

    methods: [
        "GET",
        "POST",
        "PUT",
        "DELETE",
        "OPTIONS"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
}));

// -------------------- Middleware --------------------

app.use(express.json({
    limit: "10mb"
}));

app.use(express.urlencoded({
    extended: true
}));

app.use("/uploads", express.static(uploadsDir));

// -------------------- Routes --------------------

app.use("/api/auth", authRoutes);

app.use("/api/complaints", complaintRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/notifications", notificationRoutes);

// -------------------- Health Check --------------------

app.get("/api/health", (req, res) => {

    res.json({
        status: "ok",
        service: "civic-connect-backend"
    });

});

// -------------------- 404 --------------------

app.use((req, res) => {

    res.status(404).json({
        message: "Route not found."
    });

});

// -------------------- Error Handler --------------------

app.use((err, req, res, next) => {

    console.error(err);

    res.status(500).json({
        message: err.message || "Something went wrong."
    });

});

// -------------------- Start Server --------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(`🚀 Civic Connect API running on port ${PORT}`);

});