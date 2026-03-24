// Auth_route
import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import db from '../db.js'
import { validateBody, loginSchema, registerSchema } from '../middleware/validation.js'
import { createHttpError } from '../middleware/errorHandler.js'

const router = express.Router();

router.post('/register', validateBody(registerSchema), async (req, res, next) => {
    const { username, password, encryptionSalt } = req.validatedBody;
    const hashedPassword = await bcrypt.hash(password, 8);
    const SECRET = process.env.JWT_SECRET;

    if (!SECRET) {
        return next(createHttpError(500, 'Server configuration error'));
    }

    try {
        const insertUser = db.prepare(`INSERT INTO users(username, password, encryptionSalt) VALUES (?,?,?)`);
        const result = insertUser.run(username, hashedPassword, encryptionSalt);
        const userId = result.lastInsertRowid;
        
        const token = jwt.sign({ id: userId }, SECRET, { expiresIn: '24h' });
        return res.status(201).json({ token, message:"User created!!!" });

    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: "Username taken, try another!" });
        }
        return next(createHttpError(500, 'Something went wrong during registration'));
    }
});

// login route
router.post('/login', validateBody(loginSchema), async (req,res, next)=>{

    const SECRET = process.env.JWT_SECRET;
    const {username, password} = req.validatedBody;
    if (!SECRET) {
        return next(createHttpError(500, 'Server configuration error'));
    }

    try{
        const getUser = db.prepare(`SELECT * FROM users WHERE username = ? `);
        const user = getUser.get(username);
        if (!user){
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        const passwordIsVal = await bcrypt.compare(password, user.password);
        if (!passwordIsVal){
            return res.status(401).json({ message: 'Invalid credentials' })
        }

        const token = jwt.sign({id: user.id}, SECRET, {expiresIn: '24h'});
        return res.status(200).json({ token, encryptionSalt: user.encryptionSalt });

    }catch(err){
        return next(createHttpError(500, 'Something went wrong during login'));
    }
})


export default router

