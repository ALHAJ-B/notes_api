import { postNoteToApi, fetchNotesFromApi, updateNoteInApi, deleteNoteFromApi } from "../api/notesApi.js";
import SecureVault from "../crypto/SecureVault.js";

export const encryptAndSaveNote = async (plainText, encryptionKey, token)=>{

    const encryptedPayload = await SecureVault.encryptNote(plainText, encryptionKey);
    return postNoteToApi(encryptedPayload,token);
}

export const fetchAndDecryptNotes = async (encryptionKey, token)=>{

    const encryptedNotes = await fetchNotesFromApi(token);
    
    const results = await Promise.allSettled(
        encryptedNotes.map(async (note)=>{
            const decryptedContent = await SecureVault.decryptNote(note, encryptionKey);
            return { ...note, content: decryptedContent };
        })
    );

    return results.map((result, i) => {
        if (result.status === 'fulfilled') return result.value;
        return { id: encryptedNotes[i].id, iv: encryptedNotes[i].iv, content: null, error: 'Decryption failed' };
    });

}

export const encryptAndUpdateNote = async (id, plainText, encryptionKey, token) => {
    const encryptedPayload = await SecureVault.encryptNote(plainText, encryptionKey);
    return updateNoteInApi(id, encryptedPayload, token);
};

export const deleteNoteService = async (id, token) => {
    return deleteNoteFromApi(id, token);
};