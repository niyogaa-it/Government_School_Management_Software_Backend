const bcrypt = require('bcrypt');
const { User } = require('./models/');  // Adjust for your setup

const email = 'nisha77@gmail.com';
const plaintextPassword = 'ns'; // The password entered by the user

async function checkPassword() {
  try {
    // Fetch the user record from the database
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.log('User not found');
      return;
    }

    // Compare the plaintext password with the hashed password
    const isPasswordValid = await bcrypt.compare(plaintextPassword, user.password);
    if (isPasswordValid) {
      console.log('Password is correct!');
    } else {
      console.log('Invalid password!');
    }
  } catch (err) {
    console.error('Error checking password:', err);
  }
}

// Call the function to check the password
checkPassword();
