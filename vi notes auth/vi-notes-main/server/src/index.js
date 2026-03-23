import 'dotenv/config';

import app from './app.js';
import connectDb from './db.js';

const PORT = process.env.PORT || 5000;

connectDb().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch((error) => {
    console.error('Failed to connect to the database: ', error);
    process.exit(1);
});
