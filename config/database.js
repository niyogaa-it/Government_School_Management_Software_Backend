/*const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("schooldb", "root", "", {
  host: "localhost",
  dialect: "mysql", // Change to your database type (mysql, postgres, sqlite, etc.)
  port: 3306, 
});

sequelize.connect(err => {
    if (err) throw err;
    console.log('MySQL connected');
});

module.exports = sequelize;

*/
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("schooldb", "root", "", {
  host: "localhost",
  dialect: "mysql",
  port: 3306,
  logging: false,
});

// // A proper way to test the connection is using the authenticate method
// async function testConnection() {
//     try {
//         await sequelize.authenticate();
//         console.log('Connection to MySQL has been established successfully.');
//     } catch (error) {
//         console.error('Unable to connect to the database:', error);
//     }
// }

// // Call the function to test the connection
// testConnection();

module.exports = sequelize;