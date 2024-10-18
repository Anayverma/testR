// db.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.NEXT_PUBLIC_DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Helper function to create the table if it doesn't exist
async function ensureTableExists() {
    const query = `
        CREATE TABLE IF NOT EXISTS history (
            id SERIAL PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            email VARCHAR(255),
            masks INTEGER DEFAULT 0,
            demasks INTEGER DEFAULT 0,
            validations INTEGER DEFAULT 0
        );
    `;
    await pool.query(query);
}

// Helper function to check if the user exists
async function checkUserExists(username) {
    await ensureTableExists(); // Ensure the table exists before checking the user
    const query = `
        SELECT id FROM history WHERE username = $1;
    `;
    const values = [username];
    const res = await pool.query(query, values);
    return res.rows.length > 0;
}

// Get user metrics by username
export async function getUserMetricsByUsername(username) {
    try {
        const userExists = await checkUserExists(username);

        if (!userExists) {
            console.log(`User with username ${username} does not exist`);
            return null;
        }

        const query = `
        SELECT username, masks, demasks, validations
        FROM history
        WHERE username = $1;
      `;
        const values = [username];

        const res = await pool.query(query, values);
        return res.rows.length > 0 ? res.rows[0] : null;

    } catch (error) {
        console.error('Error fetching user metrics:', error);
        throw new Error('Database query failed');
    }
}

// Update user metrics or create a new user if not exists
export async function updateUser(username, updatedMetrics) {
    const { incrementMask, incrementDemask, incrementValidation } = updatedMetrics;

    try {
        const userExists = await checkUserExists(username);

        if (!userExists) {
            console.log(`User with username ${username} does not exist, creating new user...`);
            return await createUser(username, null); // Assuming no email provided during update
        }

        const query = `
        UPDATE history
        SET masks = masks + $1,
            demasks = demasks + $2,
            validations = validations + $3
        WHERE username = $4
        RETURNING id, username, email, masks, demasks, validations;
        `;
        const values = [incrementMask || 0, incrementDemask || 0, incrementValidation || 0, username];
        const res = await pool.query(query, values);

        return res.rows.length > 0 ? res.rows[0] : null;

    } catch (error) {
        console.error('Error updating user metrics:', error);
        throw new Error('Database query failed');
    }
}

// Create a new user if they don't exist
export async function createUser(username, email) {
    try {
        await ensureTableExists(); // Ensure the table exists before creating a new user

        const userExists = await checkUserExists(username);

        if (userExists) {
            console.log(`User with username ${username} already exists.`);
            return null;  // Or you could return existing user info if required
        }

        const query = `
        INSERT INTO history (username, email, masks, demasks, validations)
        VALUES ($1, $2, 0, 0, 0)
        RETURNING id, username, email, masks, demasks, validations;
      `;
        const values = [username, email];
        const res = await pool.query(query, values);

        return res.rows.length > 0 ? res.rows[0] : null;

    } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Database query failed');
    }
}
