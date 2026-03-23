import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { signToken } from '../utils/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, password are required' });
        }
        if (String(password).length < 6) {
            return res.status(400).json({ error: 'password must be at least 6 characters' });
        }

        const existing = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ error: 'email already registered' });
        }

        const passwordHash = await bcrypt.hash(String(password), 10);
        const user = await User.create({
            name: String(name).trim(),
            email: String(email).toLowerCase().trim(),
            passwordHash,
        });

        const token = signToken({ userId: user._id.toString(), email: user.email, name: user.name });
        return res.status(201).json({
            token,
            user: { id: user._id.toString(), name: user.name, email: user.email },
        });
    } catch (err) {
        return res.status(500).json({ error: 'internal_error' });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({ error: 'email, password are required' });
        }

        const user = await User.findOne({ email: String(email).toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ error: 'invalid_credentials' });
        }

        const ok = await bcrypt.compare(String(password), user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: 'invalid_credentials' });
        }

        const token = signToken({ userId: user._id.toString(), email: user.email, name: user.name });
        return res.json({
            token,
            user: { id: user._id.toString(), name: user.name, email: user.email },
        });
    } catch {
        return res.status(500).json({ error: 'internal_error' });
    }
});

export default router;
