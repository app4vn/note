// script.js

// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Cấu hình Firebase của bạn ---
const firebaseConfig = {
    apiKey: "AIzaSyAe5UOFul4ce8vQN66Bpcktj4oiV19ht-I",
    authDomain: "ghichu-198277.firebaseapp.com",
    projectId: "ghichu-198277",
    storageBucket: "ghichu-198277.appspot.com",
    messagingSenderId: "1001550945488",
    appId: "1:1001550945488:web:bbda01f5a11f15a81192d5"
};

// --- Khởi tạo Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Lấy tham chiếu đến các phần tử DOM ---
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');

const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');

const tagsListContainer = document.getElementById('tags-list-container');
const addNoteBtn = document.getElementById('add-note-btn');
// *** THÊM MỚI: Tham chiếu đến nút Thùng rác và Tất cả Ghi chú ***
const showTrashBtn = document.getElementById('show-trash-btn');
const showAllNotesBtn = document.getElementById('show-all-notes-btn');


const notesGridView = document.getElementById('notes-grid-view');
const noteDetailView = document.getElementById('note-detail-view');
const noteEditorView = document.getElementById('note-editor-view');
// *** THÊM MỚI: Tham chiếu đến view Thùng rác và list container của nó ***
const trashView = document.getElementById('trash-view');
const trashListContainer = document.getElementById('trash-list-container');
const mainViewTitle = document.getElementById('main-view-title');


const notesListContainer = document.getElementById('notes-list-container');
const activeTagDisplay = document.getElementById('active-tag-display');

const backToGridBtn = document.getElementById('back-to-grid-btn');
const noteDetailTitle = document.getElementById('note-detail-title');
const noteDetailTags = document.getElementById('note-detail-tags');
const noteDetailContent = document.getElementById('note-detail-content');
const noteDetailCode = document.getElementById('note-detail-code');
const codeBlock = noteDetailCode.querySelector('code');
const copyCodeBtn = document.getElementById('copy-code-btn');
const editNoteBtn = document.getElementById('edit-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn'); // Nút này giờ sẽ "soft delete"
const pinNoteDetailBtn = document.getElementById('pin-note-detail-btn');


const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id-input');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteTagsInput = document.getElementById('note-tags-input');
const tagSuggestionsContainer = document.getElementById('tag-suggestions');

const isCodeCheckbox = document.getElementById('note-is-code-checkbox');
const languageSelect = document.getElementById('note-language-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editorError = document.getElementById('editor-error');

const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const contentArea = document.querySelector('.content-area');

const themeButtons = document.querySelectorAll('.theme-button');
const prismThemeLink = document.getElementById('prism-theme-link');
const accentColorButtons = document.querySelectorAll('.accent-color-button');
const fontSelect = document.getElementById('font-select');

// --- Biến trạng thái toàn cục ---
let currentUser = null;
let currentNoteId = null; // ID của note đang xem chi tiết (nếu có)
let notesUnsubscribe = null; // Listener cho notes chính
let trashUnsubscribe = null; // Listener cho notes trong thùng rác
let activeTag = null;
let notesCache = {}; // Cache cho notes chính
let trashedNotesCache = {}; // Cache cho notes trong thùng rác
let currentSearchTerm = '';
let currentSortOption = 'updatedAt_desc';
let currentTheme = 'light';
let currentAccentColor = '#007bff';
let currentContentFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
let allUserTags = new Set();
// *** THÊM MỚI: Trạng thái đang xem view nào (notes, trash) ***
let currentView = 'notes'; // 'notes' hoặc 'trash'


// --- Hàm trợ giúp quản lý giao diện (UI Helpers) ---
function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
}

function showAuth() {
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    currentUser = null;
    clearEditor();
    notesListContainer.innerHTML = '<p>Vui lòng đăng nhập.</p>';
    trashListContainer.innerHTML = '<p>Vui lòng đăng nhập.</p>'; // Reset trash view
    tagsListContainer.innerHTML = '';
    if (notesUnsubscribe) { notesUnsubscribe(); notesUnsubscribe = null; }
    if (trashUnsubscribe) { trashUnsubscribe(); trashUnsubscribe = null; } // Hủy listener trash
    notesCache = {};
    trashedNotesCache = {}; // Reset cache trash
    allUserTags.clear();
    activeTag = null;
    currentNoteId = null;
    currentSearchTerm = '';
    currentSortOption = 'updatedAt_desc';
    currentView = 'notes'; // Reset về view notes
    if(searchInput) searchInput.value = '';
    if(sortSelect) sortSelect.value = currentSortOption;
    if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';
    if (showTrashBtn) showTrashBtn.style.display = 'flex'; // Hiện nút thùng rác
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'none'; // Ẩn nút tất cả notes
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginError.textContent = '';
    signupError.textContent = '';
}

/** Hiển thị Grid View chính, ẩn các view khác */
function showMainNotesView() {
    notesGridView.style.display = 'block';
    trashView.style.display = 'none'; // Ẩn view thùng rác
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    currentView = 'notes';
    if (mainViewTitle) mainViewTitle.textContent = "Tất cả Ghi chú";
    if (activeTag) {
        activeTagDisplay.textContent = `(Tag: ${activeTag})`;
    } else {
        activeTagDisplay.textContent = '';
    }
    if (showTrashBtn) showTrashBtn.style.display = 'flex';
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'none';
    if (sortSelect) sortSelect.disabled = false; // Bật lại sort cho notes chính
    if (searchInput) searchInput.disabled = false; // Bật lại search
    if (tagsListContainer) tagsListContainer.style.display = 'block'; // Hiện lại tags

    if (contentArea) contentArea.scrollTop = 0;
    renderNotesList(Object.values(notesCache)); // Render notes từ cache chính
}

/** Hiển thị Thùng rác View, ẩn các view khác */
function showTrashNotesView() {
    notesGridView.style.display = 'none';
    trashView.style.display = 'block'; // Hiện view thùng rác
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    currentView = 'trash';
    if (showTrashBtn) showTrashBtn.style.display = 'none'; // Ẩn nút thùng rác
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'flex'; // Hiện nút tất cả notes
    if (sortSelect) sortSelect.disabled = true; // Vô hiệu hóa sort trong thùng rác
    if (searchInput) searchInput.disabled = true; // Vô hiệu hóa search
    if (tagsListContainer) tagsListContainer.style.display = 'none'; // Ẩn tags

    if (contentArea) contentArea.scrollTop = 0;
    renderTrashedNotesList(Object.values(trashedNotesCache)); // Render notes từ cache thùng rác
}


function showEditor(note = null) {
    notesGridView.style.display = 'none';
    trashView.style.display = 'none';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'block';
    editorError.textContent = '';
    hideTagSuggestions();

    if (note && note.id) { // Sửa
        editorTitle.textContent = "Sửa Ghi chú";
        noteIdInput.value = note.id;
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        noteTagsInput.value = note.tags ? note.tags.join(', ') : '';
        isCodeCheckbox.checked = note.isCode || false;
        languageSelect.value = note.language || 'plaintext';
        languageSelect.style.display = note.isCode ? 'inline-block' : 'none';
        currentNoteId = note.id;
    } else { // Tạo mới
        editorTitle.textContent = "Tạo Ghi chú Mới";
        clearEditorFields();
        noteIdInput.value = '';
        currentNoteId = null;
    }
    noteTitleInput.focus();
    if (contentArea) contentArea.scrollTop = 0;
}

function showDetailView(note) {
    if (!note || !note.id) {
        console.warn("Attempted to show detail view with invalid note data.");
        showMainNotesView(); // Quay lại grid chính nếu lỗi
        return;
    }
    notesGridView.style.display = 'none';
    trashView.style.display = 'none';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'block';
    currentNoteId = note.id;
    displayNoteDetailContent(note);
    if (contentArea) contentArea.scrollTop = 0;
}

function clearEditorFields() {
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteTagsInput.value = '';
    isCodeCheckbox.checked = false;
    languageSelect.value = 'plaintext';
    languageSelect.style.display = 'none';
    editorError.textContent = '';
    hideTagSuggestions();
}

function clearEditor() {
    clearEditorFields();
    noteIdInput.value = '';
}

function setActiveTagItem(tagName) {
    document.querySelectorAll('#tags-list-container .tag-item').forEach(item => {
        const itemTag = item.dataset.tag || (item.textContent === 'Tất cả' ? null : item.textContent);
        if (itemTag === tagName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function linkify(text) {
    if (!text) return '';
    const urlRegex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    let linkedText = text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    return linkedText.replace(/\n/g, '<br>');
}

function highlightText(text, searchTerm) {
    if (!searchTerm) {
        const tempDiv = document.createElement('div');
        tempDiv.textContent = text || '';
        return tempDiv.innerHTML.replace(/\n/g, '<br>');
    }
    if (!text) return '';

    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    const escapedText = tempDiv.innerHTML.replace(/\n/g, '<br>');
    return escapedText.replace(regex, '<span class="search-highlight">$1</span>');
}


// --- Logic xử lý Theme, Màu Nhấn, Font --- (Giữ nguyên)
// ... (Toàn bộ code cho applyTheme, loadSavedTheme, themeButtons, applyAccentColor, loadSavedAccentColor, accentColorButtons, applyContentFont, loadSavedContentFont, fontSelect) ...
function applyTheme(themeName) {
    console.log("Applying theme:", themeName);
    document.body.classList.remove('theme-dark', 'theme-gruvbox-light', 'theme-dracula', 'theme-solarized-light');
    if (themeName !== 'light') {
        document.body.classList.add(`theme-${themeName}`);
    }
    themeButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.theme === themeName);
    });
    if (prismThemeLink) {
        let prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
        if (themeName === 'dark' || themeName === 'dracula') {
            prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css';
        } else if (themeName === 'gruvbox-light') {
            prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css';
        } else if (themeName === 'solarized-light') {
            prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-solarizedlight.min.css';
        }
        prismThemeLink.href = prismThemeUrl;
    }
    try {
        localStorage.setItem('noteAppTheme', themeName);
        currentTheme = themeName;
    } catch (e) {
        console.error("Failed to save theme to localStorage:", e);
    }
}

function loadSavedTheme() {
    try {
        const savedTheme = localStorage.getItem('noteAppTheme');
        if (savedTheme && ['light', 'dark', 'gruvbox-light', 'dracula', 'solarized-light'].includes(savedTheme)) {
            applyTheme(savedTheme);
        } else {
            applyTheme('light');
        }
    } catch (e) {
        console.error("Failed to load theme from localStorage:", e);
        applyTheme('light');
    }
}

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        const selectedTheme = button.dataset.theme;
        if (selectedTheme !== currentTheme) {
            applyTheme(selectedTheme);
            if (noteDetailView.style.display === 'block' && codeBlock.textContent && window.Prism) {
                Prism.highlightElement(codeBlock);
            }
        }
    });
});

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function darkenColor(hexColor, percent) {
    let { r, g, b } = hexToRgb(hexColor);
    const factor = 1 - percent / 100;
    r = Math.max(0, Math.min(255, Math.round(r * factor)));
    g = Math.max(0, Math.min(255, Math.round(g * factor)));
    b = Math.max(0, Math.min(255, Math.round(b * factor)));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

function applyAccentColor(colorHex) {
    console.log("Applying accent color:", colorHex);
    const root = document.documentElement;
    root.style.setProperty('--accent-color', colorHex);
    const hoverColor = darkenColor(colorHex, 15);
    root.style.setProperty('--accent-color-hover', hoverColor);
    const rgb = hexToRgb(colorHex);
    if (rgb) {
        root.style.setProperty('--shadow-focus', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`);
    }
    accentColorButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.accent === colorHex);
    });
    try {
        localStorage.setItem('noteAppAccentColor', colorHex);
        currentAccentColor = colorHex;
    } catch (e) {
        console.error("Failed to save accent color to localStorage:", e);
    }
}

function loadSavedAccentColor() {
    try {
        const savedAccentColor = localStorage.getItem('noteAppAccentColor');
        if (savedAccentColor) {
            applyAccentColor(savedAccentColor);
        } else {
            applyAccentColor('#007bff');
        }
    } catch (e) {
        console.error("Failed to load accent color from localStorage:", e);
        applyAccentColor('#007bff');
    }
}

accentColorButtons.forEach(button => {
    button.addEventListener('click', () => {
        const selectedAccent = button.dataset.accent;
        if (selectedAccent !== currentAccentColor) {
            applyAccentColor(selectedAccent);
        }
    });
});

function applyContentFont(fontFamily) {
    console.log("Applying content font:", fontFamily);
    document.documentElement.style.setProperty('--font-content', fontFamily);
    if (noteContentInput) {
        noteContentInput.style.fontFamily = fontFamily;
    }
    if (fontSelect && fontSelect.value !== fontFamily) {
        fontSelect.value = fontFamily;
    }
    try {
        localStorage.setItem('noteAppContentFont', fontFamily);
        currentContentFont = fontFamily;
    } catch (e) {
        console.error("Failed to save content font to localStorage:", e);
    }
}

function loadSavedContentFont() {
    try {
        const savedFont = localStorage.getItem('noteAppContentFont');
        const defaultFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
        if (savedFont) {
            applyContentFont(savedFont);
        } else {
            applyContentFont(defaultFont);
        }
    } catch (e) {
        console.error("Failed to load content font from localStorage:", e);
        applyContentFont(defaultFont);
    }
}

if (fontSelect) {
    fontSelect.addEventListener('change', (e) => {
        const selectedFont = e.target.value;
        if (selectedFont !== currentContentFont) {
            applyContentFont(selectedFont);
        }
    });
} else {
    console.warn("Font select element not found.");
}


// --- Logic Xác thực (Authentication) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user.uid, user.email);
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        showApp();
        loadNotesAndTags(); // Tải notes chính
        loadTrashedNotes(); // Tải notes trong thùng rác
        showMainNotesView(); // Hiển thị view notes chính ban đầu
    } else {
        console.log("User logged out.");
        showAuth();
    }
});

// (Các hàm xử lý form login/signup/logout giữ nguyên)
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    loginError.textContent = '';
    signInWithEmailAndPassword(auth, email, password)
        .then(() => loginForm.reset())
        .catch((error) => loginError.textContent = `Lỗi: ${error.message}`);
});

signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    signupError.textContent = '';
    createUserWithEmailAndPassword(auth, email, password)
        .then(() => signupForm.reset())
        .catch((error) => signupError.textContent = `Lỗi: ${error.message}`);
});

logoutButton.addEventListener('click', () => {
    signOut(auth).catch((error) => alert(`Lỗi đăng xuất: ${error.message}`));
});

if (showSignupLink) {
    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
        loginError.textContent = '';
    });
}

if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
        signupError.textContent = '';
    });
}


// --- Logic quản lý Ghi chú (Notes CRUD & Display) ---

isCodeCheckbox.addEventListener('change', (e) => {
    languageSelect.style.display = e.target.checked ? 'inline-block' : 'none';
    if (!e.target.checked) {
        languageSelect.value = 'plaintext';
    }
});

addNoteBtn.addEventListener('click', () => {
    showEditor();
});

cancelEditBtn.addEventListener('click', () => {
    clearEditor();
    // Quay lại view trước đó (grid hoặc trash)
    if (currentView === 'trash') {
        showTrashNotesView();
    } else {
        showMainNotesView();
    }
});

backToGridBtn.addEventListener('click', () => {
    // Quay lại view trước đó (grid hoặc trash)
    if (currentView === 'trash') {
        showTrashNotesView();
    } else {
        showMainNotesView();
    }
});

saveNoteBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    const id = noteIdInput.value;
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const tags = [...new Set(noteTagsInput.value.split(',')
                                        .map(tag => tag.trim())
                                        .filter(tag => tag))];
    const isCode = isCodeCheckbox.checked;
    const language = isCode ? languageSelect.value : 'plaintext';

    if (!title || !content) {
        editorError.textContent = "Tiêu đề và Nội dung không được để trống!";
        alert("Tiêu đề và Nội dung không được để trống!");
        return;
    }
    editorError.textContent = '';
    saveNoteBtn.disabled = true;
    saveNoteBtn.textContent = 'Đang lưu...';

    const noteData = {
        title, content, tags, isCode, language,
        userId: currentUser.uid,
        updatedAt: Timestamp.now(),
        isPinned: id ? (notesCache[id]?.isPinned || false) : false,
        isTrashed: false // Khi lưu (tạo mới hoặc sửa) thì không nằm trong thùng rác
    };

    try {
        if (id) {
            console.log("Updating note with ID:", id);
            const noteRef = doc(db, "notes", id);
            await updateDoc(noteRef, noteData);
            console.log("Note updated successfully");
            // Cache sẽ được cập nhật bởi onSnapshot
            alert('Ghi chú đã được cập nhật!');
        } else {
            console.log("Adding new note");
            noteData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, "notes"), noteData);
            console.log("Note added with ID:", docRef.id);
            alert('Ghi chú mới đã được tạo!');
        }
        clearEditor();
        showMainNotesView(); // Luôn quay lại grid chính sau khi lưu

    } catch (error) {
        console.error("Error saving note: ", error);
        editorError.textContent = `Lỗi lưu ghi chú: ${error.message}`;
        alert(`Lỗi lưu ghi chú: ${error.message}`);
    } finally {
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = 'Lưu Ghi Chú';
    }
});

editNoteBtn.addEventListener('click', () => {
    if (!currentNoteId || !notesCache[currentNoteId]) {
        alert("Không tìm thấy dữ liệu ghi chú để sửa.");
        showMainNotesView();
        return;
    };
    const noteToEdit = notesCache[currentNoteId];
    showEditor(noteToEdit);
});

// *** CẬP NHẬT: Nút deleteNoteBtn giờ sẽ "soft delete" ***
deleteNoteBtn.addEventListener('click', async () => {
     if (!currentNoteId || !notesCache[currentNoteId]) return;

     const noteTitle = notesCache[currentNoteId]?.title || "ghi chú này";
     if (confirm(`Bạn có chắc chắn muốn chuyển ghi chú "${noteTitle}" vào thùng rác không?`)) {
        console.log("Moving note to trash, ID:", currentNoteId);
        const noteRef = doc(db, "notes", currentNoteId);
        try {
            await updateDoc(noteRef, {
                isTrashed: true,
                trashedAt: Timestamp.now(),
                updatedAt: Timestamp.now() // Cập nhật để thay đổi thứ tự nếu cần
            });
            console.log("Note moved to trash successfully");
            alert(`Đã chuyển ghi chú "${noteTitle}" vào thùng rác.`);
            showMainNotesView(); // Quay lại grid chính
            // onSnapshot sẽ tự động cập nhật cả notesCache và trashedNotesCache
        } catch (error) {
            console.error("Error moving note to trash:", error);
            alert(`Lỗi khi chuyển vào thùng rác: ${error.message}`);
        }
     }
});

copyCodeBtn.addEventListener('click', () => {
    const codeToCopy = codeBlock.textContent;
    if (codeToCopy) {
        navigator.clipboard.writeText(codeToCopy)
            .then(() => {
                alert('Đã sao chép code vào clipboard!');
                copyCodeBtn.textContent = 'Đã chép!';
                setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 1500);
            })
            .catch(err => {
                console.error('Clipboard copy failed:', err);
                alert('Lỗi khi sao chép code.');
            });
    }
});

// --- Tải và Hiển thị Dữ liệu từ Firestore ---

/** Tải danh sách ghi chú chính (không trong thùng rác) */
function loadNotesAndTags() {
    if (!currentUser) return;
    console.log(`Loading main notes for user: ${currentUser.uid}, Sort: ${currentSortOption}`);

    const [sortField, sortDirection] = currentSortOption.split('_');

    let notesQuery = query(
        collection(db, "notes"),
        where("userId", "==", currentUser.uid),
        where("isTrashed", "==", false) // Chỉ lấy notes không trong thùng rác
    );
    notesQuery = query(notesQuery, orderBy("isPinned", "desc"), orderBy(sortField, sortDirection));


    if (notesUnsubscribe) notesUnsubscribe();

    notesUnsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
        console.log("Main notes data received");
        const allNotes = [];
        const newNotesCache = {};
        allUserTags.clear(); // Xóa tags cũ để cập nhật từ notes chính

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allNotes.push(note);
            newNotesCache[note.id] = note;
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => allUserTags.add(tag));
            }
        });

        notesCache = newNotesCache;
        if (currentView === 'notes') { // Chỉ render nếu đang ở view notes chính
            renderNotesList(Object.values(notesCache));
        }
        renderTagsList(allNotes); // Luôn cập nhật tags dựa trên notes chính

        // Xử lý nếu note đang xem chi tiết bị xóa hoặc chuyển vào thùng rác
        if (currentNoteId && !notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
            showMainNotesView();
        } else if (currentNoteId && notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
            displayNoteDetailContent(notesCache[currentNoteId]);
        }

    }, (error) => {
        console.error("Error loading main notes: ", error);
        if (error.code === 'failed-precondition') {
             notesListContainer.innerHTML = `<p class="error-message">Lỗi: Cần tạo chỉ mục (index) trong Firestore. Kiểm tra Console.</p>`;
             console.error("Firestore Index Required:", error.message);
        } else {
            notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`;
        }
    });
}

/** *** THÊM MỚI: Tải danh sách ghi chú trong thùng rác *** */
function loadTrashedNotes() {
    if (!currentUser) return;
    console.log(`Loading trashed notes for user: ${currentUser.uid}`);

    const trashQuery = query(
        collection(db, "notes"),
        where("userId", "==", currentUser.uid),
        where("isTrashed", "==", true), // Chỉ lấy notes trong thùng rác
        orderBy("trashedAt", "desc") // Sắp xếp theo ngày vào thùng rác mới nhất
    );

    if (trashUnsubscribe) trashUnsubscribe();

    trashUnsubscribe = onSnapshot(trashQuery, (querySnapshot) => {
        console.log("Trashed notes data received");
        const allTrashedNotes = [];
        const newTrashedNotesCache = {};

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allTrashedNotes.push(note);
            newTrashedNotesCache[note.id] = note;
        });
        trashedNotesCache = newTrashedNotesCache;
        if (currentView === 'trash') { // Chỉ render nếu đang ở view thùng rác
            renderTrashedNotesList(Object.values(trashedNotesCache));
        }
    }, (error) => {
        console.error("Error loading trashed notes: ", error);
         if (error.code === 'failed-precondition') {
             trashListContainer.innerHTML = `<p class="error-message">Lỗi: Cần tạo chỉ mục (index) cho thùng rác. Kiểm tra Console.</p>`;
             console.error("Firestore Index Required for trash:", error.message);
        } else {
            trashListContainer.innerHTML = `<p class="error-message">Lỗi tải thùng rác: ${error.message}</p>`;
        }
    });
}


/** Hiển thị danh sách ghi chú chính */
function renderNotesList(notesFromCache) {
    notesListContainer.innerHTML = '';

    const searchTermLower = currentSearchTerm.toLowerCase();
    let notesToRender = notesFromCache.filter(note => {
        const tagMatch = !activeTag || (note.tags && note.tags.includes(activeTag));
        if (!tagMatch) return false;
        if (searchTermLower) {
            const titleMatch = note.title?.toLowerCase().includes(searchTermLower);
            const contentMatch = note.content?.toLowerCase().includes(searchTermLower);
            const tagsMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchTermLower));
            return titleMatch || contentMatch || tagsMatch;
        }
        return true;
    });

    if (notesToRender.length === 0) {
        let message = 'Chưa có ghi chú nào.';
        if (activeTag && currentSearchTerm) message = `Không có ghi chú nào với tag "${activeTag}" khớp với "${currentSearchTerm}".`;
        else if (activeTag) message = `Không có ghi chú nào với tag "${activeTag}".`;
        else if (currentSearchTerm) message = `Không có ghi chú nào khớp với "${currentSearchTerm}".`;
        else message = 'Chưa có ghi chú nào. Hãy tạo ghi chú mới!';
        notesListContainer.innerHTML = `<p>${message}</p>`;
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item');
        noteElement.dataset.id = note.id;

        const pinIcon = document.createElement('span');
        pinIcon.classList.add('pin-icon');
        pinIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin-angle${note.isPinned ? '-fill' : ''}" viewBox="0 0 16 16">...</svg>`; // SVG content
        if (note.isPinned) pinIcon.classList.add('pinned');
        pinIcon.title = note.isPinned ? "Bỏ ghim" : "Ghim ghi chú";
        pinIcon.addEventListener('click', (e) => { e.stopPropagation(); togglePinStatus(note.id); });
        noteElement.appendChild(pinIcon);

        const titleElement = document.createElement('h3');
        titleElement.innerHTML = highlightText(note.title || "Không có tiêu đề", currentSearchTerm);
        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        contentPreview.innerHTML = highlightText(note.content || '', currentSearchTerm);
        const dateElement = document.createElement('div');
        dateElement.classList.add('note-item-date');
        if (note.updatedAt && note.updatedAt.toDate) {
             dateElement.textContent = note.updatedAt.toDate().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'});
        }
        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentPreview);
        noteElement.appendChild(dateElement);
        noteElement.addEventListener('click', () => showDetailView(note));
        notesListContainer.appendChild(noteElement);
    });
}

/** *** THÊM MỚI: Hiển thị danh sách ghi chú trong thùng rác *** */
function renderTrashedNotesList(trashedNotes) {
    trashListContainer.innerHTML = '';
    if (trashedNotes.length === 0) {
        trashListContainer.innerHTML = '<p>Thùng rác trống.</p>';
        return;
    }

    trashedNotes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item'); // Tái sử dụng class .note-item
        noteElement.dataset.id = note.id;

        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title || "Không có tiêu đề";

        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        contentPreview.textContent = note.content || ''; // Không cần highlight trong thùng rác

        const trashedDateElement = document.createElement('div');
        trashedDateElement.classList.add('note-item-date');
        if (note.trashedAt && note.trashedAt.toDate) {
            trashedDateElement.textContent = `Vào thùng rác: ${note.trashedAt.toDate().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'})}`;
        }

        // Nút hành động cho thùng rác
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('trashed-note-actions');

        const restoreBtn = document.createElement('button');
        restoreBtn.classList.add('button-secondary'); // Hoặc class khác
        restoreBtn.textContent = 'Khôi phục';
        restoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            restoreNoteFromTrash(note.id);
        });

        const deletePermanentlyBtn = document.createElement('button');
        deletePermanentlyBtn.classList.add('button-danger');
        deletePermanentlyBtn.textContent = 'Xóa vĩnh viễn';
        deletePermanentlyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNotePermanently(note.id, note.title);
        });

        actionsDiv.appendChild(restoreBtn);
        actionsDiv.appendChild(deletePermanentlyBtn);

        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentPreview);
        noteElement.appendChild(trashedDateElement);
        noteElement.appendChild(actionsDiv);

        // Không thêm sự kiện click để xem chi tiết cho note trong thùng rác
        trashListContainer.appendChild(noteElement);
    });
}


function renderTagsList(notes) {
    tagsListContainer.innerHTML = '';
    const allTagElement = document.createElement('span');
    allTagElement.classList.add('tag-item');
    allTagElement.textContent = 'Tất cả';
    if (activeTag === null) allTagElement.classList.add('active');
    allTagElement.addEventListener('click', () => {
        if (activeTag !== null) {
            activeTag = null;
            setActiveTagItem(null);
            renderNotesList(Object.values(notesCache));
            showMainNotesView(); // Đảm bảo quay về view notes chính
        }
    });
    tagsListContainer.appendChild(allTagElement);

    [...allUserTags].sort().forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag-item');
        tagElement.textContent = tag;
        tagElement.dataset.tag = tag;
        if (tag === activeTag) tagElement.classList.add('active');
        tagElement.addEventListener('click', () => {
            if (activeTag !== tag) {
                activeTag = tag;
                setActiveTagItem(tag);
                renderNotesList(Object.values(notesCache));
                showMainNotesView(); // Đảm bảo quay về view notes chính
            }
        });
        tagsListContainer.appendChild(tagElement);
    });

     if (allUserTags.size === 0) {
        const noTags = document.createElement('p');
        noTags.textContent = 'Chưa có tag nào.';
        noTags.style.fontSize = '0.9em';
        noTags.style.color = '#6c757d';
        tagsListContainer.appendChild(noTags);
    }
}

function displayNoteDetailContent(note) {
    if (!note) return;
    noteDetailTitle.textContent = note.title;
    if (pinNoteDetailBtn) {
        pinNoteDetailBtn.classList.toggle('pinned', !!note.isPinned);
        pinNoteDetailBtn.title = note.isPinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú";
        const svgIcon = pinNoteDetailBtn.querySelector('svg');
        if (svgIcon) {
            svgIcon.classList.remove('bi-pin-angle', 'bi-pin-angle-fill');
            svgIcon.classList.add(note.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle');
            svgIcon.innerHTML = note.isPinned ? '<path d="M9.828.722...z"/>' : '<path d="M9.828.722...z"/><path d="M6.559...z"/>'; // Full SVG paths
        }
    }
    noteDetailTags.innerHTML = '';
    if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag');
            tagElement.textContent = tag;
            noteDetailTags.appendChild(tagElement);
        });
    }
    if (note.isCode) {
        noteDetailContent.style.display = 'none';
        codeBlock.textContent = note.content;
        codeBlock.className = `language-${note.language || 'plaintext'}`;
        noteDetailCode.style.display = 'block';
        copyCodeBtn.style.display = 'inline-block';
        if (window.Prism) Prism.highlightElement(codeBlock);
    } else {
        noteDetailCode.style.display = 'none';
        copyCodeBtn.style.display = 'none';
        noteDetailContent.innerHTML = linkify(note.content);
        noteDetailContent.style.display = 'block';
    }
}

// --- Logic Ghim Ghi chú ---
async function togglePinStatus(noteId) {
    if (!currentUser || !notesCache[noteId]) return;
    const noteRef = doc(db, "notes", noteId);
    const currentPinnedStatus = notesCache[noteId].isPinned || false;
    const newPinnedStatus = !currentPinnedStatus;
    try {
        await updateDoc(noteRef, { isPinned: newPinnedStatus, updatedAt: Timestamp.now() });
        console.log(`Note ${noteId} pin status updated to ${newPinnedStatus}`);
        alert(newPinnedStatus ? "Đã ghim ghi chú!" : "Đã bỏ ghim ghi chú.");
    } catch (error) {
        console.error("Error updating pin status:", error);
        alert("Lỗi cập nhật trạng thái ghim.");
    }
}

if (pinNoteDetailBtn) {
    pinNoteDetailBtn.addEventListener('click', () => {
        if (currentNoteId) togglePinStatus(currentNoteId);
    });
}

// --- *** THÊM MỚI: Logic cho Thùng rác *** ---
/** Khôi phục ghi chú từ thùng rác */
async function restoreNoteFromTrash(noteId) {
    if (!currentUser || !trashedNotesCache[noteId]) return;
    const noteRef = doc(db, "notes", noteId);
    try {
        await updateDoc(noteRef, {
            isTrashed: false,
            trashedAt: null, // Xóa thời điểm vào thùng rác
            updatedAt: Timestamp.now()
        });
        console.log(`Note ${noteId} restored from trash.`);
        alert("Đã khôi phục ghi chú.");
        // onSnapshot sẽ tự động cập nhật cả trashedNotesCache và notesCache
    } catch (error) {
        console.error("Error restoring note:", error);
        alert("Lỗi khôi phục ghi chú.");
    }
}

/** Xóa vĩnh viễn ghi chú */
async function deleteNotePermanently(noteId, noteTitle = "ghi chú này") {
    if (!currentUser || !trashedNotesCache[noteId]) return;
    if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ghi chú "${noteTitle}" không? Hành động này KHÔNG THỂ hoàn tác.`)) {
        const noteRef = doc(db, "notes", noteId);
        try {
            await deleteDoc(noteRef);
            console.log(`Note ${noteId} permanently deleted.`);
            alert("Đã xóa vĩnh viễn ghi chú.");
            // onSnapshot sẽ tự động cập nhật trashedNotesCache
        } catch (error) {
            console.error("Error permanently deleting note:", error);
            alert("Lỗi xóa vĩnh viễn ghi chú.");
        }
    }
}

// Gắn sự kiện cho các nút điều hướng view
if (showTrashBtn) {
    showTrashBtn.addEventListener('click', showTrashNotesView);
}
if (showAllNotesBtn) {
    showAllNotesBtn.addEventListener('click', showMainNotesView);
}


// --- Logic Gợi ý Tag ---
// (Giữ nguyên)
function displayTagSuggestions(suggestions, currentTagValue) {
    if (!tagSuggestionsContainer) return;
    tagSuggestionsContainer.innerHTML = '';
    if (suggestions.length === 0) {
        hideTagSuggestions();
        return;
    }

    suggestions.forEach(tag => {
        const suggestionItem = document.createElement('div');
        suggestionItem.classList.add('suggestion-item');
        suggestionItem.textContent = tag;
        suggestionItem.addEventListener('click', () => {
            const tagsArray = noteTagsInput.value.split(',').map(t => t.trim());
            tagsArray.pop();
            tagsArray.push(tag);
            noteTagsInput.value = tagsArray.join(', ') + ', ';
            hideTagSuggestions();
            noteTagsInput.focus();
        });
        tagSuggestionsContainer.appendChild(suggestionItem);
    });
    tagSuggestionsContainer.style.display = 'block';
}

function hideTagSuggestions() {
    if (tagSuggestionsContainer) {
        tagSuggestionsContainer.style.display = 'none';
    }
}

if (noteTagsInput) {
    noteTagsInput.addEventListener('input', () => {
        const inputValue = noteTagsInput.value;
        const tagsArray = inputValue.split(',').map(t => t.trim());
        const currentTypingTag = tagsArray[tagsArray.length - 1].toLowerCase();

        if (currentTypingTag) {
            const suggestions = [...allUserTags].filter(tag =>
                tag.toLowerCase().startsWith(currentTypingTag) && !tagsArray.slice(0, -1).includes(tag)
            );
            displayTagSuggestions(suggestions, currentTypingTag);
        } else {
            hideTagSuggestions();
        }
    });

    noteTagsInput.addEventListener('blur', () => {
        setTimeout(hideTagSuggestions, 150);
    });

    noteTagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideTagSuggestions();
        }
    });
}


// --- Logic cho nút Scroll to Top ---
// (Giữ nguyên)
function handleScroll() {
    if (!contentArea || !scrollToTopBtn) return;
    if (contentArea.scrollTop > 200) {
        scrollToTopBtn.style.display = "block";
    } else {
        scrollToTopBtn.style.display = "none";
    }
}

function scrollToTop() {
    if (!contentArea) return;
    contentArea.scrollTop = 0;
}

if (contentArea) {
    contentArea.addEventListener('scroll', handleScroll);
} else {
    console.warn("Content area element not found for scroll event listener.");
}

if (scrollToTopBtn) {
    scrollToTopBtn.addEventListener('click', scrollToTop);
} else {
    console.warn("Scroll to top button element not found.");
}

// --- Logic tìm kiếm ---
// (Giữ nguyên)
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.trim();
        // Render lại view hiện tại (notes hoặc trash)
        if (currentView === 'notes') {
            renderNotesList(Object.values(notesCache));
        } else if (currentView === 'trash') {
            renderTrashedNotesList(Object.values(trashedNotesCache)); // Cần hàm render riêng cho trash nếu muốn tìm kiếm trong trash
        }
    });
} else {
    console.warn("Search input element not found.");
}

// --- Logic sắp xếp ---
// (Giữ nguyên)
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        const newSortOption = e.target.value;
        if (newSortOption !== currentSortOption) {
            console.log("Sort option changed to:", newSortOption);
            currentSortOption = newSortOption;
            loadNotesAndTags(); // Tải lại notes chính với sắp xếp mới
            // Không cần tải lại trash vì trash có cách sắp xếp riêng
        }
    });
} else {
    console.warn("Sort select element not found.");
}


// --- Khởi chạy ---
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadSavedAccentColor();
    loadSavedContentFont();
});

console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");

