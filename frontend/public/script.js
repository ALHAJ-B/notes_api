import { handleSubmit } from '/src/api/authApi.js';
import { encryptAndSaveNote, fetchAndDecryptNotes } from '/src/services/noteServices.js';

// --- State Management (Memory Only) ---
let state = {
    token: null,
    encryptionKey: null, 
};

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Selectors ---
    const loginTab = document.getElementById('login-tab'); // login btn
    const registerTab = document.getElementById('register-tab'); // register btn
    const authAction = document.getElementById('auth-action');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authSection = document.getElementById('auth-section');
    const notesSection = document.getElementById('notes-section');
    const authForm = document.getElementById('auth-form');
    const noteForm = document.getElementById('note-form');
    const notesList = document.getElementById('notes-list');
    const logoutBtn = document.getElementById('logout-btn');

    
    registerTab.addEventListener("click", ()=>{
        authSubmitBtn.textContent = "Create Secure Account";
    })

    loginTab.addEventListener("click", ()=>{
        authSubmitBtn.textContent("Login to Vault");
    })
    
    // --- Tab Switching Logic ---
    const setAuthMode = (mode) => {
        authAction.value = mode; // Set hidden input for handleSubmit
        authSubmitBtn.textContent = mode === 'login' ? 'Login to Vault' : 'Create Secure Account';
        
        loginTab.classList.toggle('active', mode === 'login');
        registerTab.classList.toggle('active', mode === 'register');
    };

    loginTab.addEventListener('click', () => setAuthMode('login'));
    registerTab.addEventListener('click', () => setAuthMode('register'));

    // --- Helper: UI Transitions ---
    const toggleUI = (isLoggedIn) => {
        authSection.classList.toggle('hidden', isLoggedIn);
        notesSection.classList.toggle('hidden', !isLoggedIn);
        if (!isLoggedIn) {
            notesList.innerHTML = '';
            authForm.reset();
            setAuthMode('login'); // Default back to login on logout
        }
    };

    // --- 1. Authentication Handler ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            // Pass setEncryptionKey callback to update memory [cite: 939, 982]
            const result = await handleSubmit(e, (key) => {
                state.encryptionKey = key; 
            });

            if (result?.success) {
                state.token = result.token; // [cite: 934]
                sessionStorage.setItem('token', result.token); // [cite: 38]
                toggleUI(true);
                loadNotes();
            }
        } catch (err) {
            alert("Auth failed. Check credentials or console.");
            console.error(err);
        }
    });

    // --- 2. Note Creation (Encrypt & Save) ---
    noteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = document.getElementById('note-input').value;

        try {
            // Service encrypts plaintext locally before network transit [cite: 943, 968]
            await encryptAndSaveNote(content, state.encryptionKey, state.token);
            document.getElementById('note-input').value = '';
            loadNotes(); 
        } catch (err) {
            console.error("Save failed:", err);
        }
    });

    // --- 3. Note Retrieval (Fetch & Decrypt) ---
    const loadNotes = async () => {
        try {
            // Service decrypts ciphertext locally using RAM key [cite: 953, 969]
            const decryptedNotes = await fetchAndDecryptNotes(state.encryptionKey, state.token);
            
            notesList.innerHTML = decryptedNotes.map(note => `
                <div class="note-item">
                    <div class="note-content">
                        <p>${note.content}</p>
                        <small>IV: ${note.iv.substring(0, 10)}...</small>
                    </div>
                </div>
            `).join('') || '<p>No notes found.</p>';
        } catch (err) {
            notesList.innerHTML = '<p class="error">Decryption failed.</p>';
        }
    };

    // --- 4. Logout (Wipe Memory) ---
    logoutBtn.addEventListener('click', () => {
        state.token = null;
        state.encryptionKey = null; // Wipe key from memory [cite: 65, 984]
        sessionStorage.clear(); // [cite: 66]
        toggleUI(false);
    });
});