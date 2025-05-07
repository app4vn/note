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
    apiKey: "AIzaSyAe5UOFul4ce8vQN66Bpcktj4oiV19ht-I", // Giữ nguyên API key của bạn
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
const showTrashBtn = document.getElementById('show-trash-btn');
const showAllNotesBtn = document.getElementById('show-all-notes-btn');


const notesGridView = document.getElementById('notes-grid-view');
const noteDetailView = document.getElementById('note-detail-view');
const noteEditorView = document.getElementById('note-editor-view');
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
const deleteNoteBtn = document.getElementById('delete-note-btn');
const pinNoteDetailBtn = document.getElementById('pin-note-detail-btn');

// DOM Elements for To-Do List in Detail View
const noteDetailTodosContainer = document.getElementById('note-detail-todos-container');
const noteDetailTodosList = document.getElementById('note-detail-todos-list');
const noteDetailTodosProgress = document.getElementById('note-detail-todos-progress');


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

// DOM Elements for To-Do List Editor
const enableTodoCheckbox = document.getElementById('enable-todo-checkbox');
const noteEditorTodosList = document.getElementById('note-editor-todos-list');
const addTodoEditorItemBtn = document.getElementById('add-todo-editor-item-btn');


const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const contentArea = document.querySelector('.content-area');

// Tham chiếu đến các nút cài đặt trong sidebar
const themeButtons = document.querySelectorAll('.sidebar-settings .theme-button');
const prismThemeLink = document.getElementById('prism-theme-link');
const accentColorButtons = document.querySelectorAll('.sidebar-settings .accent-color-button');
const fontSelect = document.querySelector('.sidebar-settings #font-select');


// --- Biến trạng thái toàn cục ---
let currentUser = null;
let currentNoteId = null;
let notesUnsubscribe = null;
let trashUnsubscribe = null;
let activeTag = null;
let notesCache = {};
let trashedNotesCache = {};
let currentSearchTerm = '';
let currentSortOption = 'updatedAt_desc';
let currentTheme = 'light';
let currentAccentColor = '#007bff';
let currentContentFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
let allUserTags = new Set();
let currentView = 'notes';

// --- SVG Paths ---
const pinAngleSVGPath = "M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146zm-3.27 1.96a.5.5 0 0 1 0 .707L2.874 8.874a.5.5 0 1 1-.707-.707l3.687-3.687a.5.5 0 0 1 .707 0z";
const pinAngleFillSVGPath = "M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z";


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
    trashListContainer.innerHTML = '<p>Vui lòng đăng nhập.</p>';
    tagsListContainer.innerHTML = '';
    if (notesUnsubscribe) { notesUnsubscribe(); notesUnsubscribe = null; }
    if (trashUnsubscribe) { trashUnsubscribe(); trashUnsubscribe = null; }
    notesCache = {};
    trashedNotesCache = {};
    allUserTags.clear();
    activeTag = null;
    currentNoteId = null;
    currentSearchTerm = '';
    currentSortOption = 'updatedAt_desc';
    currentView = 'notes';
    if(searchInput) searchInput.value = '';
    if(sortSelect) sortSelect.value = currentSortOption;
    if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';
    if (showTrashBtn) showTrashBtn.style.display = 'flex';
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'none';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginError.textContent = '';
    signupError.textContent = '';
}

function showMainNotesView() {
    notesGridView.style.display = 'block';
    trashView.style.display = 'none';
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
    if (sortSelect) sortSelect.disabled = false;
    if (searchInput) searchInput.disabled = false;
    if (tagsListContainer) tagsListContainer.style.display = 'block';

    if (contentArea) contentArea.scrollTop = 0;
    renderNotesList(Object.values(notesCache));
}

function showTrashNotesView() {
    notesGridView.style.display = 'none';
    trashView.style.display = 'block';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    currentView = 'trash';
    if (showTrashBtn) showTrashBtn.style.display = 'none';
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'flex';
    if (sortSelect) sortSelect.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (tagsListContainer) tagsListContainer.style.display = 'none';

    if (contentArea) contentArea.scrollTop = 0;
    renderTrashedNotesList(Object.values(trashedNotesCache));
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

        // Xử lý To-Do List khi sửa
        if (note.todos && Array.isArray(note.todos) && note.todos.length > 0) {
            enableTodoCheckbox.checked = true;
            renderTodosInEditor(note.todos);
        } else {
            enableTodoCheckbox.checked = false;
            renderTodosInEditor([]); // Xóa danh sách to-do cũ (nếu có)
        }
    } else { // Tạo mới
        editorTitle.textContent = "Tạo Ghi chú Mới";
        clearEditorFields(); // Bao gồm cả việc reset to-do editor
        noteIdInput.value = '';
        currentNoteId = null;
    }
    toggleTodoEditorVisibility(); // Đảm bảo hiển thị đúng dựa trên checkbox
    noteTitleInput.focus();
    if (contentArea) contentArea.scrollTop = 0;
}

function showDetailView(note) {
    if (!note || !note.id) {
        console.warn("Attempted to show detail view with invalid note data.");
        showMainNotesView();
        return;
    }
    notesGridView.style.display = 'none';
    trashView.style.display = 'none';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'block';
    currentNoteId = note.id;
    displayNoteDetailContent(note); // Sẽ bao gồm cả việc render to-do list
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

    // Reset To-Do List Editor
    enableTodoCheckbox.checked = false;
    noteEditorTodosList.innerHTML = '';
    toggleTodoEditorVisibility();
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


// --- Logic xử lý Theme, Màu Nhấn, Font ---
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
            // Giữ theme prism mặc định cho gruvbox light, hoặc chọn một theme sáng khác nếu muốn
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
            applyTheme('light'); // Mặc định là theme sáng
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
            // Re-highlight code block if detail view is active and has code
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
    const hoverColor = darkenColor(colorHex, 15); // Làm tối màu hover đi 15%
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
            applyAccentColor('#007bff'); // Màu mặc định
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
    if (noteContentInput) { // Đảm bảo noteContentInput tồn tại
        noteContentInput.style.fontFamily = fontFamily;
    }
    if (fontSelect && fontSelect.value !== fontFamily) { // Đảm bảo fontSelect tồn tại
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
        applyContentFont(defaultFont); // Font mặc định
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
        loadNotesAndTags();
        loadTrashedNotes();
        showMainNotesView();
    } else {
        console.log("User logged out.");
        showAuth();
    }
});

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
    if (currentView === 'trash') {
        showTrashNotesView();
    } else {
        showMainNotesView();
    }
});

backToGridBtn.addEventListener('click', () => {
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

    if (!title) { // Chỉ cần tiêu đề, nội dung có thể là to-do list
        editorError.textContent = "Tiêu đề không được để trống!";
        alert("Tiêu đề không được để trống!");
        return;
    }
    // Nếu không phải là code và không bật to-do list, thì nội dung cũng không được trống
    if (!isCode && !enableTodoCheckbox.checked && !content) {
        editorError.textContent = "Nội dung không được để trống nếu không phải là code hoặc to-do list!";
        alert("Nội dung không được để trống nếu không phải là code hoặc to-do list!");
        return;
    }


    editorError.textContent = '';
    saveNoteBtn.disabled = true;
    saveNoteBtn.textContent = 'Đang lưu...';

    let todosToSave = null;
    if (enableTodoCheckbox.checked) {
        todosToSave = collectTodosFromEditor();
        // Nếu không có to-do item nào được thêm, vẫn có thể lưu mảng rỗng hoặc null
        // if (todosToSave.length === 0) todosToSave = null;
    }


    const noteData = {
        title,
        content: (isCode || !enableTodoCheckbox.checked) ? content : '', // Chỉ lưu content nếu là code hoặc không phải to-do
        tags,
        isCode,
        language,
        todos: todosToSave, // Sẽ là null nếu không bật to-do, hoặc mảng (có thể rỗng) nếu bật
        userId: currentUser.uid,
        updatedAt: Timestamp.now(),
        isPinned: id ? (notesCache[id]?.isPinned || false) : false,
        isTrashed: false
    };

    try {
        if (id) {
            console.log("Updating note with ID:", id);
            const noteRef = doc(db, "notes", id);
            await updateDoc(noteRef, noteData);
            console.log("Note updated successfully");
            alert('Ghi chú đã được cập nhật!');
        } else {
            console.log("Adding new note");
            noteData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, "notes"), noteData);
            console.log("Note added with ID:", docRef.id);
            // Bỏ alert khi tạo mới để trải nghiệm mượt hơn
        }
        clearEditor();
        showMainNotesView();

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
        alert("Vui lòng chọn một ghi chú để sửa.");
        showMainNotesView();
        return;
    };
    const noteToEdit = notesCache[currentNoteId];
    showEditor(noteToEdit);
});

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
                updatedAt: Timestamp.now() // Cập nhật cả updatedAt
            });
            console.log("Note moved to trash successfully");
            alert(`Đã chuyển ghi chú "${noteTitle}" vào thùng rác.`);
            showMainNotesView(); // Quay về danh sách chính
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
function loadNotesAndTags() {
    if (!currentUser) return;
    console.log(`Loading main notes for user: ${currentUser.uid}, Sort: ${currentSortOption}`);

    const [sortField, sortDirection] = currentSortOption.split('_');

    let notesQuery = query(
        collection(db, "notes"),
        where("userId", "==", currentUser.uid),
        where("isTrashed", "==", false)
    );
    // Sắp xếp theo ghim trước, sau đó mới đến tiêu chí người dùng chọn
    notesQuery = query(notesQuery, orderBy("isPinned", "desc"), orderBy(sortField, sortDirection));


    if (notesUnsubscribe) notesUnsubscribe(); // Hủy listener cũ trước khi tạo mới

    notesUnsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
        console.log("Main notes data received");
        const allNotes = [];
        const newNotesCache = {}; // Tạo cache mới để tránh lỗi khi note bị xóa
        allUserTags.clear(); // Xóa tags cũ

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allNotes.push(note);
            newNotesCache[note.id] = note;
            if (note.tags && Array.isArray(note.tags)) {
                note.tags.forEach(tag => allUserTags.add(tag));
            }
        });

        notesCache = newNotesCache; // Cập nhật cache chính
        if (currentView === 'notes') { // Chỉ render lại nếu đang ở view notes
            renderNotesList(Object.values(notesCache));
        }
        renderTagsList(allNotes); // Render lại danh sách tags

        // Nếu note đang xem chi tiết bị xóa hoặc không còn trong cache, quay về view chính
        if (currentNoteId && !notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
            showMainNotesView();
        } else if (currentNoteId && notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
            // Nếu note đang xem chi tiết được cập nhật, render lại nội dung chi tiết
            displayNoteDetailContent(notesCache[currentNoteId]);
        }

    }, (error) => {
        console.error("Error loading main notes: ", error);
        if (error.code === 'failed-precondition') {
             notesListContainer.innerHTML = `<p class="error-message">Lỗi: Cần tạo chỉ mục (index) trong Firestore. Kiểm tra Console để biết chi tiết và tạo chỉ mục theo hướng dẫn của Firebase.</p>`;
             console.error("Firestore Index Required:", error.message); // Log lỗi chi tiết hơn
        } else {
            notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`;
        }
    });
}

function loadTrashedNotes() {
    if (!currentUser) return;
    console.log(`Loading trashed notes for user: ${currentUser.uid}`);

    const trashQuery = query(
        collection(db, "notes"),
        where("userId", "==", currentUser.uid),
        where("isTrashed", "==", true),
        orderBy("trashedAt", "desc") // Sắp xếp theo ngày chuyển vào thùng rác
    );

    if (trashUnsubscribe) trashUnsubscribe(); // Hủy listener cũ

    trashUnsubscribe = onSnapshot(trashQuery, (querySnapshot) => {
        console.log("Trashed notes data received");
        const allTrashedNotes = [];
        const newTrashedNotesCache = {}; // Cache riêng cho thùng rác

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allTrashedNotes.push(note);
            newTrashedNotesCache[note.id] = note;
        });
        trashedNotesCache = newTrashedNotesCache; // Cập nhật cache thùng rác
        if (currentView === 'trash') { // Chỉ render lại nếu đang ở view thùng rác
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


function renderNotesList(notesFromCache) {
    notesListContainer.innerHTML = ''; // Xóa danh sách cũ

    // Lọc ghi chú dựa trên tag đang active và từ khóa tìm kiếm
    const searchTermLower = currentSearchTerm.toLowerCase();
    let notesToRender = notesFromCache.filter(note => {
        const tagMatch = !activeTag || (note.tags && note.tags.includes(activeTag));
        if (!tagMatch) return false;

        if (searchTermLower) {
            const titleMatch = note.title?.toLowerCase().includes(searchTermLower);
            const contentMatch = note.content?.toLowerCase().includes(searchTermLower);
            const tagsMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchTermLower));
            // Thêm tìm kiếm trong to-do items nếu có
            const todosMatch = note.todos?.some(todo => todo.text?.toLowerCase().includes(searchTermLower));
            return titleMatch || contentMatch || tagsMatch || todosMatch;
        }
        return true; // Nếu không có search term, trả về true nếu tag khớp
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

        // Icon ghim
        const pinIcon = document.createElement('span');
        pinIcon.classList.add('pin-icon');
        pinIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin-angle${note.isPinned ? '-fill' : ''}" viewBox="0 0 16 16">
                                <path d="${note.isPinned ? pinAngleFillSVGPath : pinAngleSVGPath}"/>
                             </svg>`;
        if (note.isPinned) pinIcon.classList.add('pinned');
        pinIcon.title = note.isPinned ? "Bỏ ghim" : "Ghim ghi chú";
        pinIcon.addEventListener('click', (e) => { e.stopPropagation(); togglePinStatus(note.id); });
        noteElement.appendChild(pinIcon);

        const titleElement = document.createElement('h3');
        titleElement.innerHTML = highlightText(note.title || "Không có tiêu đề", currentSearchTerm);

        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        // Hiển thị preview của to-do list nếu có, ngược lại hiển thị content
        if (note.todos && note.todos.length > 0) {
            const firstFewTodos = note.todos.slice(0, 3).map(todo =>
                `${todo.completed ? '[x]' : '[ ]'} ${todo.text}`
            ).join('<br>');
            contentPreview.innerHTML = highlightText(firstFewTodos, currentSearchTerm) + (note.todos.length > 3 ? '<br>...' : '');
        } else {
            contentPreview.innerHTML = highlightText(note.content || '', currentSearchTerm);
        }


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

function renderTrashedNotesList(trashedNotes) {
    trashListContainer.innerHTML = '';
    if (trashedNotes.length === 0) {
        trashListContainer.innerHTML = '<p>Thùng rác trống.</p>';
        return;
    }

    trashedNotes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item'); // Giữ nguyên class để có style dog-ear
        noteElement.dataset.id = note.id;

        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title || "Không có tiêu đề";

        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        // Hiển thị preview của to-do list nếu có, ngược lại hiển thị content
        if (note.todos && note.todos.length > 0) {
            const firstFewTodos = note.todos.slice(0, 3).map(todo =>
                `${todo.completed ? '[x]' : '[ ]'} ${todo.text}`
            ).join('\n'); // Dùng \n cho textContent
            contentPreview.textContent = firstFewTodos + (note.todos.length > 3 ? '\n...' : '');
        } else {
            contentPreview.textContent = note.content || '';
        }


        const trashedDateElement = document.createElement('div');
        trashedDateElement.classList.add('note-item-date');
        if (note.trashedAt && note.trashedAt.toDate) {
            trashedDateElement.textContent = `Vào thùng rác: ${note.trashedAt.toDate().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'})}`;
        }

        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('trashed-note-actions');

        const restoreBtn = document.createElement('button');
        restoreBtn.classList.add('button-secondary');
        restoreBtn.textContent = 'Khôi phục';
        restoreBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn sự kiện click vào note-item
            restoreNoteFromTrash(note.id);
        });

        const deletePermanentlyBtn = document.createElement('button');
        deletePermanentlyBtn.classList.add('button-danger');
        deletePermanentlyBtn.textContent = 'Xóa vĩnh viễn';
        deletePermanentlyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Ngăn sự kiện click vào note-item
            deleteNotePermanently(note.id, note.title);
        });

        actionsDiv.appendChild(restoreBtn);
        actionsDiv.appendChild(deletePermanentlyBtn);

        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentPreview);
        noteElement.appendChild(trashedDateElement);
        noteElement.appendChild(actionsDiv);

        trashListContainer.appendChild(noteElement);
    });
}


function renderTagsList(notes) { // notes ở đây là allNotes từ snapshot, không phải notesCache
    tagsListContainer.innerHTML = ''; // Xóa tags cũ
    const allTagElement = document.createElement('span');
    allTagElement.classList.add('tag-item');
    allTagElement.textContent = 'Tất cả';
    if (activeTag === null) allTagElement.classList.add('active');
    allTagElement.addEventListener('click', () => {
        if (activeTag !== null) { // Chỉ thực hiện nếu tag đang active khác null
            activeTag = null;
            setActiveTagItem(null); // Cập nhật UI cho tag item
            renderNotesList(Object.values(notesCache)); // Render lại danh sách notes
            showMainNotesView(); // Đảm bảo đang ở view chính
        }
    });
    tagsListContainer.appendChild(allTagElement);

    // allUserTags đã được cập nhật trong loadNotesAndTags
    [...allUserTags].sort().forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag-item');
        tagElement.textContent = tag;
        tagElement.dataset.tag = tag; // Lưu tag vào data attribute để dễ lấy
        if (tag === activeTag) tagElement.classList.add('active');
        tagElement.addEventListener('click', () => {
            if (activeTag !== tag) { // Chỉ thực hiện nếu chọn tag mới
                activeTag = tag;
                setActiveTagItem(tag); // Cập nhật UI cho tag item
                renderNotesList(Object.values(notesCache)); // Render lại danh sách notes
                showMainNotesView(); // Đảm bảo đang ở view chính
            }
        });
        tagsListContainer.appendChild(tagElement);
    });

     if (allUserTags.size === 0) {
        const noTags = document.createElement('p');
        noTags.textContent = 'Chưa có tag nào.';
        noTags.style.fontSize = '0.9em';
        noTags.style.color = 'var(--text-secondary)';
        tagsListContainer.appendChild(noTags);
    }
}

function displayNoteDetailContent(note) {
    if (!note) return; // Kiểm tra note tồn tại
    noteDetailTitle.textContent = note.title;

    // Xử lý nút ghim
    if (pinNoteDetailBtn) {
        pinNoteDetailBtn.classList.toggle('pinned', !!note.isPinned);
        pinNoteDetailBtn.title = note.isPinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú";
        const svgIcon = pinNoteDetailBtn.querySelector('svg');
        if (svgIcon) {
            const pathElement = svgIcon.querySelector('path');
            if(pathElement){ // Đảm bảo pathElement tồn tại
                 pathElement.setAttribute('d', note.isPinned ? pinAngleFillSVGPath : pinAngleSVGPath);
            }
            // Cập nhật class cho SVG (nếu bạn dùng class để đổi icon)
            svgIcon.classList.remove('bi-pin-angle', 'bi-pin-angle-fill');
            svgIcon.classList.add(note.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle');
        }
    }

    // Hiển thị tags
    noteDetailTags.innerHTML = '';
    if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag');
            tagElement.textContent = tag;
            noteDetailTags.appendChild(tagElement);
        });
    }

    // Hiển thị nội dung code hoặc văn bản thường
    if (note.isCode) {
        noteDetailContent.style.display = 'none';
        codeBlock.textContent = note.content;
        codeBlock.className = `language-${note.language || 'plaintext'}`; // Đặt class ngôn ngữ
        noteDetailCode.style.display = 'block';
        copyCodeBtn.style.display = 'inline-block';
        if (window.Prism) Prism.highlightElement(codeBlock); // Highlight code
    } else {
        noteDetailCode.style.display = 'none';
        copyCodeBtn.style.display = 'none';
        noteDetailContent.innerHTML = linkify(note.content); // Xử lý link và xuống dòng
        noteDetailContent.style.display = 'block';
    }

    // Hiển thị To-Do List
    if (note.todos && Array.isArray(note.todos) && note.todos.length > 0) {
        noteDetailTodosContainer.style.display = 'block';
        renderTodosInDetailView(note.id, note.todos);
    } else {
        noteDetailTodosContainer.style.display = 'none';
        noteDetailTodosList.innerHTML = ''; // Xóa nếu không có to-dos
        if (noteDetailTodosProgress) noteDetailTodosProgress.innerHTML = '';
    }
}

// --- Logic Ghim Ghi chú ---
async function togglePinStatus(noteId) {
    if (!currentUser || !notesCache[noteId]) return; // Kiểm tra user và note tồn tại trong cache
    const noteRef = doc(db, "notes", noteId);
    const currentPinnedStatus = notesCache[noteId].isPinned || false;
    const newPinnedStatus = !currentPinnedStatus;
    try {
        await updateDoc(noteRef, { isPinned: newPinnedStatus, updatedAt: Timestamp.now() });
        // Không cần alert, onSnapshot sẽ tự cập nhật UI
        console.log(`Note ${noteId} pin status updated to ${newPinnedStatus}`);
        // alert(newPinnedStatus ? "Đã ghim ghi chú!" : "Đã bỏ ghim ghi chú.");
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

// --- Logic cho Thùng rác ---
async function restoreNoteFromTrash(noteId) {
    if (!currentUser || !trashedNotesCache[noteId]) return;
    const noteRef = doc(db, "notes", noteId);
    try {
        await updateDoc(noteRef, {
            isTrashed: false,
            trashedAt: null, // Xóa trường trashedAt
            updatedAt: Timestamp.now() // Cập nhật thời gian
        });
        console.log(`Note ${noteId} restored from trash.`);
        alert("Đã khôi phục ghi chú.");
        // onSnapshot sẽ tự động cập nhật UI
    } catch (error) {
        console.error("Error restoring note:", error);
        alert("Lỗi khôi phục ghi chú.");
    }
}

async function deleteNotePermanently(noteId, noteTitle = "ghi chú này") {
    if (!currentUser || !trashedNotesCache[noteId]) return;
    if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ghi chú "${noteTitle}" không? Hành động này KHÔNG THỂ hoàn tác.`)) {
        const noteRef = doc(db, "notes", noteId);
        try {
            await deleteDoc(noteRef);
            console.log(`Note ${noteId} permanently deleted.`);
            alert("Đã xóa vĩnh viễn ghi chú.");
            // onSnapshot sẽ tự động cập nhật UI
        } catch (error) {
            console.error("Error permanently deleting note:", error);
            alert("Lỗi xóa vĩnh viễn ghi chú.");
        }
    }
}

if (showTrashBtn) {
    showTrashBtn.addEventListener('click', showTrashNotesView);
}
if (showAllNotesBtn) {
    showAllNotesBtn.addEventListener('click', showMainNotesView);
}


// --- Logic Gợi ý Tag ---
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
            tagsArray.pop(); // Xóa tag đang gõ dở
            tagsArray.push(tag); // Thêm tag được chọn
            noteTagsInput.value = tagsArray.join(', ') + ', '; // Thêm dấu phẩy và cách để dễ nhập tiếp
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
            const existingTagsInInput = tagsArray.slice(0, -1).map(t => t.toLowerCase());
            const suggestions = [...allUserTags].filter(tag =>
                tag.toLowerCase().startsWith(currentTypingTag) &&
                !existingTagsInInput.includes(tag.toLowerCase()) // Không gợi ý tag đã có trong input
            );
            displayTagSuggestions(suggestions, currentTypingTag);
        } else {
            hideTagSuggestions();
        }
    });

    noteTagsInput.addEventListener('blur', () => {
        // Dùng timeout để sự kiện click vào suggestion kịp xảy ra trước khi blur ẩn list
        setTimeout(hideTagSuggestions, 150);
    });

    noteTagsInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            hideTagSuggestions();
        }
        // (Tùy chọn) Xử lý Enter hoặc Tab để chọn suggestion đầu tiên
    });
}


// --- Logic cho nút Scroll to Top ---
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
    contentArea.scrollTop = 0; // Cuộn lên đầu
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
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.trim();
        // Render lại danh sách notes chính, không ảnh hưởng thùng rác khi tìm kiếm ở sidebar
        if (currentView === 'notes') {
            renderNotesList(Object.values(notesCache));
        }
        // Nếu muốn tìm kiếm cả trong thùng rác khi đang ở view thùng rác (cần UI riêng cho search trong trash)
        // else if (currentView === 'trash') {
        // renderTrashedNotesList(Object.values(trashedNotesCache));
        // }
    });
} else {
    console.warn("Search input element not found.");
}

// --- Logic sắp xếp ---
if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
        const newSortOption = e.target.value;
        if (newSortOption !== currentSortOption) {
            console.log("Sort option changed to:", newSortOption);
            currentSortOption = newSortOption;
            loadNotesAndTags(); // Tải lại notes với tùy chọn sắp xếp mới
        }
    });
} else {
    console.warn("Sort select element not found.");
}

// --- LOGIC CHO TO-DO LIST ---

// Hiển thị/ẩn khu vực editor to-do
function toggleTodoEditorVisibility() {
    const isEnabled = enableTodoCheckbox.checked;
    noteEditorTodosList.style.display = isEnabled ? 'block' : 'none';
    addTodoEditorItemBtn.style.display = isEnabled ? 'inline-block' : 'none';
    // Nếu tắt to-do, có thể ẩn luôn nội dung chính nếu muốn ghi chú chỉ là to-do
    // noteContentInput.style.display = isEnabled ? 'none' : 'block'; (Tùy chọn)
}

if (enableTodoCheckbox) {
    enableTodoCheckbox.addEventListener('change', toggleTodoEditorVisibility);
}

// Thêm một mục to-do mới vào trình soạn thảo
function addTodoItemToEditor(todo = { id: '', text: '', completed: false }) {
    const listItem = document.createElement('li');
    listItem.classList.add('todo-editor-item');
    // Sử dụng ID tạm thời nếu là item mới, hoặc ID thật nếu đang sửa
    const todoId = todo.id || `temp-${Date.now()}`;
    listItem.dataset.todoId = todoId;

    // Checkbox (chỉ hiển thị, không tương tác trong editor)
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.classList.add('todo-editor-item-checkbox');
    checkbox.checked = todo.completed;
    checkbox.disabled = true; // Không cho phép thay đổi trạng thái ở editor

    // Input text cho nội dung công việc
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.classList.add('todo-editor-item-text');
    textInput.placeholder = 'Nội dung công việc...';
    textInput.value = todo.text;

    // Nút xóa
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button'; // Quan trọng để không submit form (nếu có)
    deleteButton.classList.add('todo-editor-item-delete-btn');
    deleteButton.textContent = 'Xóa';
    deleteButton.addEventListener('click', () => {
        listItem.remove(); // Xóa mục này khỏi DOM
    });

    listItem.appendChild(checkbox);
    listItem.appendChild(textInput);
    listItem.appendChild(deleteButton);
    noteEditorTodosList.appendChild(listItem);
    textInput.focus(); // Focus vào input mới thêm
}

if (addTodoEditorItemBtn) {
    addTodoEditorItemBtn.addEventListener('click', () => addTodoItemToEditor());
}

// Render danh sách to-do trong trình soạn thảo (khi mở ghi chú để sửa)
function renderTodosInEditor(todosArray = []) {
    noteEditorTodosList.innerHTML = ''; // Xóa các mục cũ
    if (todosArray && todosArray.length > 0) {
        todosArray.forEach(todo => addTodoItemToEditor(todo));
    }
}

// Thu thập dữ liệu to-do từ trình soạn thảo để lưu
function collectTodosFromEditor() {
    const collectedTodos = [];
    const todoItems = noteEditorTodosList.querySelectorAll('.todo-editor-item');
    todoItems.forEach((item, index) => {
        const textInput = item.querySelector('.todo-editor-item-text');
        if (textInput && textInput.value.trim() !== '') {
            collectedTodos.push({
                id: item.dataset.todoId.startsWith('temp-') ? `todo-${Date.now()}-${index}` : item.dataset.todoId, // Tạo ID mới nếu là tạm thời
                text: textInput.value.trim(),
                completed: false, // Mới tạo hoặc sửa từ editor thì mặc định là chưa hoàn thành
                order: index // Lưu thứ tự
            });
        }
    });
    return collectedTodos;
}

// Render danh sách to-do trong chi tiết ghi chú
function renderTodosInDetailView(noteId, todosArray = []) {
    noteDetailTodosList.innerHTML = '';
    if (!todosArray || todosArray.length === 0) {
        if (noteDetailTodosProgress) noteDetailTodosProgress.innerHTML = ''; // Xóa progress nếu không có to-do
        return;
    }

    todosArray.sort((a, b) => (a.order || 0) - (b.order || 0)); // Sắp xếp theo thứ tự (nếu có)

    todosArray.forEach(todo => {
        const listItem = document.createElement('li');
        listItem.classList.add('todo-detail-item');
        listItem.dataset.todoId = todo.id;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.classList.add('todo-detail-item-checkbox');
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', async (e) => {
            await toggleTodoItemStatus(noteId, todo.id, e.target.checked);
        });

        const textSpan = document.createElement('span');
        textSpan.classList.add('todo-detail-item-text');
        textSpan.textContent = todo.text;
        if (todo.completed) {
            textSpan.classList.add('completed');
        }

        listItem.appendChild(checkbox);
        listItem.appendChild(textSpan);
        noteDetailTodosList.appendChild(listItem);
    });
    updateTodoProgress(todosArray);
}

// Cập nhật trạng thái hoàn thành của một mục to-do
async function toggleTodoItemStatus(noteId, todoId, isCompleted) {
    if (!currentUser || !notesCache[noteId] || !notesCache[noteId].todos) return;

    const noteToUpdate = { ...notesCache[noteId] };
    const todoIndex = noteToUpdate.todos.findIndex(t => t.id === todoId);

    if (todoIndex === -1) {
        console.error("Todo item not found for update:", todoId);
        return;
    }

    noteToUpdate.todos[todoIndex].completed = isCompleted;
    noteToUpdate.updatedAt = Timestamp.now(); // Cập nhật thời gian sửa của note

    try {
        const noteRef = doc(db, "notes", noteId);
        await updateDoc(noteRef, {
            todos: noteToUpdate.todos,
            updatedAt: noteToUpdate.updatedAt
        });
        console.log(`Todo ${todoId} in note ${noteId} status updated to ${isCompleted}`);
        // UI sẽ được cập nhật bởi onSnapshot, nhưng có thể cập nhật progress ngay
        updateTodoProgress(noteToUpdate.todos);
        // Cập nhật class cho text item đã thay đổi
        const detailItem = noteDetailTodosList.querySelector(`li[data-todo-id="${todoId}"] .todo-detail-item-text`);
        if (detailItem) {
            detailItem.classList.toggle('completed', isCompleted);
        }

    } catch (error) {
        console.error("Error updating todo status:", error);
        alert("Lỗi cập nhật trạng thái công việc.");
        // Rollback UI change if needed, or rely on onSnapshot to correct it
    }
}

// Cập nhật thanh tiến trình
function updateTodoProgress(todosArray = []) {
    if (!noteDetailTodosProgress) return;

    const totalTasks = todosArray.length;
    if (totalTasks === 0) {
        noteDetailTodosProgress.innerHTML = ''; // Hoặc 'Không có công việc nào.'
        return;
    }
    const completedTasks = todosArray.filter(todo => todo.completed).length;
    const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    noteDetailTodosProgress.innerHTML = `
        <span>Hoàn thành: ${completedTasks}/${totalTasks} công việc</span>
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${percentage}%;"></div>
        </div>
    `;
}


// --- Khởi chạy ---
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadSavedAccentColor();
    loadSavedContentFont();
    // Mặc định ẩn khu vực to-do editor khi tải trang
    toggleTodoEditorVisibility();
});

console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");

