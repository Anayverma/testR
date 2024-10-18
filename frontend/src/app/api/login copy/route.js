import { NextResponse } from 'next/server';
import { findUserByEmail } from '../../../lib/db'; // Adjusted the import path to match the signup file
import keccak from 'keccak';
import crypto from 'crypto';

// Hash password with Keccak-256
const hashPassword = (password) => {
  return keccak('keccak256').update(password).digest();  // Returns a Buffer
};

// Generate token with HMAC-SHA256
function createToken(username) {
  const secret = process.env.NEXT_PUBLIC_SALT; // Ensure this is set in your environment

  if (!secret) {
    throw new Error('SALT not set in environment variables.');
  }

  // Wrap the username in quotes before hashing
  const hash = crypto.createHmac('sha256', secret)
                     .update(username)
                     .digest('hex');

  return hash;
}

export async function POST(req) {
  try {
    // Parse request body
    const { email, password } = await req.json();

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    // Hash the provided password
    const hashedPassword = hashPassword(password);

    // Retrieve the user by email
    const user = await findUserByEmail(email);
    console.log(user.password,"poko")
    // Check if the user exists and the hashed passwords match
    if (!user || user.password !== hashedPassword.toString('hex')) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    // Generate a token using the username
    const token = createToken(user.username);

    // Respond with the token and username
    return NextResponse.json({ token, username: user.username }, { status: 200 });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
