import jwt from 'jsonwebtoken';


function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not set');
    }
    return secret;
}


function signToken(payload, options = {}) {
    return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d', ...options });
}

function verifyToken(token) {
    return jwt.verify(token, getJwtSecret());
}

export { signToken, verifyToken };
