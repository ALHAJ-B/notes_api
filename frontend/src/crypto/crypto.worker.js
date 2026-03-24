// crypto.worker.js
import SecureVault from "./SecureVault.js";

self.onmessage = async (e) => {
    const { password, salt } = e.data;
    
    try {
        const encryptionKey = await SecureVault.deriveKey(password, salt);
        
        self.postMessage({ status: 'success', key: encryptionKey });
    } catch (error) {
        self.postMessage({ status: 'error', error: error.message });
    }
};