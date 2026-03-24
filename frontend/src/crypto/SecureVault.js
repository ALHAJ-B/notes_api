
export const arrayBufferToBase64 = (buffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
export const base64ToArrayBuffer = (base64) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
export function generateSalt(){
    return crypto.getRandomValues(new Uint8Array(16));
}

 const SecureVault = {
    
    // 1. Derive the key
    async deriveKey(password, salt){

        const encoder = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        );

        return crypto.subtle.deriveKey(
            {
                name:"PBKDF2",
                salt: salt,
                iterations : 100000,
                hash: "SHA-256"
            },
            baseKey,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        );

    },

    // 2. Encrypt the data
    async encryptNote(plaintext, key){

        const encoder = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const encodedNote = encoder.encode(plaintext);

        const ciphertext = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            encodedNote
        );

        return {
            content :btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
            iv: btoa(String.fromCharCode(...iv))
        };
    },

    // 3. Decrypt data
    async decryptNote(ciphertext, key){

        const decoder = new TextDecoder();
        const {content, iv} = ciphertext;

        const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
        const dataBuffer = Uint8Array.from(atob(content), c => c.charCodeAt(0));

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: ivBuffer },
            key,
            dataBuffer
        );

        return decoder.decode(decrypted)
    }

}

export default SecureVault

// when user logs in
// const key = await SecureVault.deriveKey(password, salt)
