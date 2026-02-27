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

//Below code is live working code

// const express = require("express");

// const cors = require("cors");



// const port = 8080;

// const HOST = "0.0.0.0"; // ✅ Bind to all interfaces, not just localhost

// const app = express();



// /* ===============================

//    ✅ CORS — Fix Private Network Access

//    =============================== */



// // Allow requests from your frontend public IP

// const allowedOrigins = [

//   "http://13.232.114.177",       // your frontend public IP (HTTP)

//   "https://13.232.114.177",      // your frontend public IP (HTTPS, if used)

//   "https://13.232.114.177",      // your frontend public IP (HTTPS, if used)

//   "http://localhost:3000",        // local dev

//   "http://localhost:5173",        // Vite dev server (if used)

// ];



// app.use(

//   cors({

//     origin: function (origin, callback) {

//       // Allow requests with no origin (mobile apps, curl, Postman)

//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {

//         return callback(null, true);

//       }

//       return callback(new Error(`CORS blocked for origin: ${origin}`), false);

//     },

//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],

//     allowedHeaders: ["Content-Type", "Authorization"],

//     credentials: true,

//   })

// );



// /* ===============================

//    ✅ Handle Private Network Access Preflight

//    Browsers send this preflight when a public origin

//    tries to access a private/loopback address.

//    =============================== */

// app.use((req, res, next) => {

//   // Required header for Chrome's Private Network Access policy
//  res.setHeader("Access-Control-Allow-Private-Network", "true");



//   // Handle OPTIONS preflight requests immediately

//   if (req.method === "OPTIONS") {

//     return res.sendStatus(204);

//   }

//   next();

// });



// /* ===============================

//    ✅ MIDDLEWARE

//    =============================== */

// app.use(express.json());

// app.use(express.urlencoded({ extended: true }));


// /* ===============================
// ✅ ROUTERS

//    =============================== */

// const router = require("./router");

// const gradeRouter = require("./routes/grade.router");

// const sectionRouter = require("./routes/section.router");

// const studentsslcRouter = require("./routes/studentsslc.router");

// const groupRouter = require("./routes/group.router");



// app.use("/studentsslc", studentsslcRouter);

// app.use("/group", groupRouter);

// app.use("/grade", gradeRouter);

// app.use("/section", sectionRouter);

// app.use("/", router); // ✅ Keep this LAST among routers


// /* ===============================

//    ✅ HEALTH CHECK ROUTE

//    =============================== */

// app.get("/health", (req, res) => {

//   res.json({ status: "ok", message: "School app is running       " });

// });



// app.post("/wapi", (req, res) => {

//   const { name } = req.body;

//   res.send(name);

// });



// app.post("/admin/login", (req, res) => {

//   const { email, password } = req.body;
//  const dummyUser = {

//     email: "nisha@chettinadeducation.org",

//     password: "123",

//     roleName: "SuperAdmin",

//     name: "Nisha",

//   };



//   if (email === dummyUser.email && password === dummyUser.password) {

//     res.json({ success: true, user: dummyUser });

//   } else {

//     res.status(401).json({ success: false, error: "Invalid email or password" });

//   }

// });


// /* ===============================

//    ✅ START SERVER — bind to 0.0.0.0

//    =============================== */

// app.listen(port, HOST, () => {

//   console.log(`✅ Server is running on http://${HOST}:${port}`);

//   console.log(`✅ Access externally at: http://13.232.114.177:${port}`);

//   console.log(`✅ Fee collection API: http://13.232.114.177:${port}/feeCollection/getAllRecords`);

// });
