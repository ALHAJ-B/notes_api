import { postNoteToApi, fetchNotesFromApi } from "../api/notesApi.js";
import SecureVault from "../crypto/SecureVault.js";

export const encryptAndSaveNote = async (plainText, encryptionKey, token)=>{

    const encryptedPayload = await SecureVault.encryptNote(plainText, encryptionKey);
    return postNoteToApi(encryptedPayload,token);
}

export const fetchAndDecryptNotes = async (encryptionKey, token)=>{

    const encryptedNotes = await fetchNotesFromApi(token);
    
    return Promise.all(
        encryptedNotes.map(async (note)=>{
            const decryptedContent = await SecureVault.decryptNote(note, encryptionKey);
            return { ...note, content: decryptedContent };
        })
    )

}