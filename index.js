const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const port = 8080;
const app = express();

const gradeRouter = require("./routes/grade.router");
const sectionRouter = require("./routes/section.router");

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true // if using cookies or auth
}));

// The list of domains/ports allowed to access your API
const allowedOrigins = [
    'http://localhost:3000', // <-- Your React app's correct IP:Port
    'http://localhost:3000',
    // Add any other specific origins here (e.g., your public domain)
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

// ✅ Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ Routers
const router = require("./router");
const studentsslcRouter = require('./routes/studentsslc.router');
const groupRouter = require('./routes/group.router');

// ✅ Route bindings

app.use("/studentsslc", studentsslcRouter);
app.use('/group', groupRouter);
app.use("/", router);
app.use("/grade", gradeRouter);
app.use("/section", sectionRouter);

// ✅ Sample endpoint
app.get("/", (req, res) => {
  res.json({ message: "school app started" });
});

app.post("/wapi", (req, res) => {
  const { name } = req.body;
  res.send(name);
});

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;

  // Dummy user for demo
  const dummyUser = {
    email: "nisha@chettinadeducation.org",
    password: "123",
    roleName: "SuperAdmin",
    name: "Nisha"
  };

  if (email === dummyUser.email && password === dummyUser.password) {
    res.json({
      success: true,
      user: dummyUser
    });
  } else {
    res.status(401).json({ success: false, error: "Invalid email or password" });
  }
});

// ✅ Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
