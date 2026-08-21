import { handleSubmit } from '/src/api/authApi.js';
import { encryptAndSaveNote, fetchAndDecryptNotes, encryptAndUpdateNote, deleteNoteService } from '/src/services/noteServices.js';

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

    
    // --- Tab Switching Logic ---
    const setAuthMode = (mode) => {
        authAction.value = mode; // Set hidden input for handleSubmit
        authSubmitBtn.textContent = mode === 'login' ? 'Login' : 'Register';
        
        const authTitle = document.querySelector('.auth-header h2');
        if (authTitle) {
            authTitle.textContent = mode === 'login' ? 'Access Vault' : 'Create Vault';
        }
        
        if (mode === 'login') {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
        } else {
            loginTab.classList.remove('active');
            registerTab.classList.add('active');
        }
    };

    loginTab.addEventListener('click', () => setAuthMode('login'));
    registerTab.addEventListener('click', () => setAuthMode('register'));
    
    // Set default mode on load
    setAuthMode('login');

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

    // --- Helper: HTML Escaper to prevent XSS ---
    const escapeHTML = (str) => {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
    };

    // --- 3. Note Retrieval (Fetch & Decrypt) ---
    const loadNotes = async () => {
        try {
            // Service decrypts ciphertext locally using RAM key [cite: 953, 969]
            const decryptedNotes = await fetchAndDecryptNotes(state.encryptionKey, state.token);
            
            notesList.innerHTML = decryptedNotes.map(note => {
                if (note.error) {
                    return `<div class="note-item note-error" data-id="${note.id}">
                        <div class="note-content">
                            <p class="note-text">⚠️ This note could not be decrypted.</p>
                        </div>
                        <div class="note-actions">
                            <button class="delete-btn btn-outline">Delete</button>
                        </div>
                    </div>`;
                }
                return `
                <div class="note-item" data-id="${note.id}">
                    <div class="note-content">
                        <p class="note-text">${escapeHTML(note.content)}</p>
                        <small>IV: ${escapeHTML(note.iv).substring(0, 10)}...</small>
                    </div>
                    <div class="note-actions">
                        <button class="edit-btn btn-outline">Edit</button>
                        <button class="delete-btn btn-outline">Delete</button>
                    </div>
                </div>
                `;
            }).join('') || '<p>No notes found.</p>';
        } catch (err) {
            notesList.innerHTML = '<p class="error">Decryption failed.</p>';
        }
    };

    // --- Handle Edit & Delete Clicks ---
    notesList.addEventListener('click', async (e) => {
        const noteItem = e.target.closest('.note-item');
        if (!noteItem) return;
        
        const noteId = noteItem.getAttribute('data-id');

        // Delete Logic
        if (e.target.classList.contains('delete-btn')) {
            if (confirm("Are you sure you want to delete this encrypted note?")) {
                try {
                    await deleteNoteService(noteId, state.token);
                    loadNotes(); // Refresh list
                } catch (err) {
                    alert("Failed to delete note.");
                }
            }
        }

        // Edit Logic
        if (e.target.classList.contains('edit-btn')) {
            const currentText = noteItem.querySelector('.note-text').innerText;
            const newContent = prompt("Edit your note:", currentText);
            
            if (newContent && newContent !== currentText) {
                try {
                    // Encrypts the newly edited text before sending it over the network
                    await encryptAndUpdateNote(noteId, newContent, state.encryptionKey, state.token);
                    loadNotes(); // Refresh list
                } catch (err) {
                    alert("Failed to edit note.");
                }
            }
        }
    });

    // --- 4. Logout (Wipe Memory) ---
    logoutBtn.addEventListener('click', () => {
        state.token = null;
        state.encryptionKey = null; // Wipe key from memory [cite: 65, 984]
        sessionStorage.clear(); // [cite: 66]
        toggleUI(false);
    });
});