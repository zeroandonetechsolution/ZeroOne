const bcrypt = require('bcryptjs');

async function hashPassword() {
    const password = '11234456';
    const hash = await bcrypt.hash(password, 10);
    console.log('Password Hash:', hash);
}

hashPassword();
