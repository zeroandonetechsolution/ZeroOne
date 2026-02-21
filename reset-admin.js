const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const NEW_PASSWORD = 'admin123'; // CHANGE THIS TO YOUR DESIRED PASSWORD
const USERS_FILE = path.join(__dirname, 'users.json');

async function resetPassword() {
    try {
        const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
        const adminIndex = data.users.findIndex(u => u.username === 'zeroandone');

        if (adminIndex === -1) {
            console.error('Admin user not found!');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(NEW_PASSWORD, salt);

        data.users[adminIndex].passwordHash = hash;
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));

        console.log('--------------------------------------------------');
        console.log('SUCCESS: Admin password has been reset!');
        console.log(`Username: zeroandone`);
        console.log(`New Password: ${NEW_PASSWORD}`);
        console.log('--------------------------------------------------');
        console.log('NOTE: You must now REDEPLOY your backend or update it on your host.');
    } catch (error) {
        console.error('Error resetting password:', error);
    }
}

resetPassword();
