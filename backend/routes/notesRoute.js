// Notes routes
import express from 'express'
import db from '../db.js'
import { notesWriteRateLimiter } from '../middleware/rateLimit.js'
import { noteIdParamSchema, notePayloadSchema, validateBody, validateParams } from '../middleware/validation.js'
import { createHttpError } from '../middleware/errorHandler.js'

const router = express.Router();

router.get('/',(req,res, next)=>{
    
    try{
        const getNotes = db.prepare(`SELECT id, content, iv FROM notes WHERE userId = ? ORDER BY id DESC`)
        const notes = getNotes.all(req.userId);
        res.json({notes})
    } catch(err){
            next(createHttpError(500, 'Failed to retrieve note'));

    }
})

router.post('/', notesWriteRateLimiter, validateBody(notePayloadSchema), async (req, res, next) => {
    const { content, iv } = req.validatedBody;
    const userId = req.userId;

    try {
        const insertNote = db.prepare(`INSERT INTO notes (userId, content, iv) VALUES (?, ?, ?)`);
        const result = insertNote.run(userId, content, iv);
        res.status(201).json({ message: "Note added!", id: Number(result.lastInsertRowid) });
    } catch (err) {
        next(createHttpError(500, 'Failed to add note'));
    }
});

router.put('/:id', notesWriteRateLimiter, validateParams(noteIdParamSchema), validateBody(notePayloadSchema), async(req, res, next) => {
    const { id } = req.validatedParams;
    const { content, iv } = req.validatedBody;
    const userId = req.userId;     // Who is asking?

    try {
        const updateNote = db.prepare(`
            UPDATE notes 
            SET content = ?, iv = ?
            WHERE id = ? AND userId = ?
        `);
        
        const result = updateNote.run(content, iv, id, userId);

        if (result.changes === 0) {
            return res.status(404).json({ message: "Note not found or unauthorized" });
        }

        res.json({ message: "Note updated successfully!" });
    } catch (err) {
        next(createHttpError(500, 'Update failed'));
    }
});

router.delete('/:id', notesWriteRateLimiter, validateParams(noteIdParamSchema), (req,res, next)=>{
    const { id } = req.validatedParams;
    const userId = req.userId;

    try{
        const deleteNote = db.prepare(`DELETE FROM notes WHERE userId = ? AND id = ?`)
        const result = deleteNote.run(userId, id);

        if (result.changes===0){
            return res.status(404).json({message:'Note not found or you arent authorized'});
        }

        return res.json({message: 'Note has been deleted'})
    } catch(err){
        return next(createHttpError(500, 'Internal server error'));
    }
})

export default router