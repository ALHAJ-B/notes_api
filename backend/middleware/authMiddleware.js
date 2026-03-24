// middleware
import jwt from 'jsonwebtoken'


function authMiddleware(req, res, next){
    const SECRET = process.env.JWT_SECRET;
    const authHeader = req.get('authorization') || '';

    if (!SECRET) {
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    jwt.verify(token, SECRET, (err, decoded)=>{
        if (err){
            return res.status(401).json({ error: 'Invalid token' })
        }
        req.userId = decoded.id
        next()
    })
}

export default authMiddleware