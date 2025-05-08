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
const authModalOverlay = document.getElementById('auth-modal-overlay');
const authModal = document.getElementById('auth-modal');
const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
const showLoginModalBtn = document.getElementById('show-login-modal-btn');
const showSignupModalBtn = document.getElementById('show-signup-modal-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');
const showSignupLink = document.getElementById('show-signup-link');
const showLoginLink = document.getElementById('show-login-link');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const contentArea = document.getElementById('content-area');
const searchInput = document.getElementById('search-input');
const sortSelect = document.getElementById('sort-select');
const tagsListContainer = document.getElementById('tags-list-container');
const addNoteBtn = document.getElementById('add-note-btn');
const showTrashBtn = document.getElementById('show-trash-btn');
const showAllNotesBtn = document.getElementById('show-all-notes-btn');
const showCalendarBtn = document.getElementById('show-calendar-btn');
const notesGridView = document.getElementById('notes-grid-view');
const calendarView = document.getElementById('calendar-view');
const calendarContainer = document.getElementById('calendar-container');
const calendarTagFilter = document.getElementById('calendar-tag-filter');
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
const noteDetailTodosContainer = document.getElementById('note-detail-todos-container');
const noteDetailTodosList = document.getElementById('note-detail-todos-list');
const noteDetailTodosProgress = document.getElementById('note-detail-todos-progress');
const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id-input');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteTagsInput = document.getElementById('note-tags-input');
const tagSuggestionsContainer = document.getElementById('tag-suggestions');
const noteEventDateInput = document.getElementById('note-event-date');
const isCodeCheckbox = document.getElementById('note-is-code-checkbox');
const languageSelect = document.getElementById('note-language-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editorError = document.getElementById('editor-error');
const enableTodoCheckbox = document.getElementById('enable-todo-checkbox');
const noteEditorTodosList = document.getElementById('note-editor-todos-list');
const addTodoEditorItemBtn = document.getElementById('add-todo-editor-item-btn');
const scrollToTopBtn = document.getElementById('scrollToTopBtn');
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
let previousView = 'notes';
let calendar = null;
let calendarSelectedTag = null;

// --- SVG Paths ---
const pinAngleSVGPath = "M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146zm-3.27 1.96a.5.5 0 0 1 0 .707L2.874 8.874a.5.5 0 1 1-.707-.707l3.687-3.687a.5.5 0 0 1 .707 0z";
const pinAngleFillSVGPath = "M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z";


// --- Logic cho Mobile Sidebar ---
function openMobileSidebar() { document.body.classList.add('sidebar-open'); }
function closeMobileSidebar() { document.body.classList.remove('sidebar-open'); }
if (mobileMenuBtn) { mobileMenuBtn.addEventListener('click', (e) => { e.stopPropagation(); document.body.classList.contains('sidebar-open') ? closeMobileSidebar() : openMobileSidebar(); }); }
if (sidebarOverlay) { sidebarOverlay.addEventListener('click', closeMobileSidebar); }
if (sidebar) { sidebar.addEventListener('click', (e) => { if (window.innerWidth <= 768 && e.target.closest('a, button')) { setTimeout(closeMobileSidebar, 150); } }); }

// --- Logic cho Auth Modal ---
function openAuthModal(mode = 'login') { loginError.textContent = ''; signupError.textContent = ''; if (mode === 'login') { loginForm.style.display = 'block'; signupForm.style.display = 'none'; } else { loginForm.style.display = 'none'; signupForm.style.display = 'block'; } document.body.classList.add('modal-open'); }
function closeAuthModal() { document.body.classList.remove('modal-open'); }
if (showLoginModalBtn) { showLoginModalBtn.addEventListener('click', () => openAuthModal('login')); }
if (showSignupModalBtn) { showSignupModalBtn.addEventListener('click', () => openAuthModal('signup')); }
if (closeAuthModalBtn) { closeAuthModalBtn.addEventListener('click', closeAuthModal); }
if (authModalOverlay) { authModalOverlay.addEventListener('click', closeAuthModal); }
if (showSignupLink) { showSignupLink.addEventListener('click', (e) => { e.preventDefault(); loginForm.style.display = 'none'; signupForm.style.display = 'block'; loginError.textContent = ''; }); }
if (showLoginLink) { showLoginLink.addEventListener('click', (e) => { e.preventDefault(); signupForm.style.display = 'none'; loginForm.style.display = 'block'; signupError.textContent = ''; }); }

// --- Hàm trợ giúp quản lý giao diện (UI Helpers) ---
function setActiveSidebarButton(activeButtonId) { [showAllNotesBtn, showCalendarBtn, showTrashBtn].forEach(btn => { if (btn) { btn.classList.toggle('active', btn.id === activeButtonId); } }); }

function showMainNotesView() {
    if (!currentUser) return;
    notesGridView.style.display = 'block';
    calendarView.style.display = 'none';
    trashView.style.display = 'none';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    currentView = 'notes';
    if (mainViewTitle) mainViewTitle.textContent = "Tất cả Ghi chú";
    if (activeTag) { activeTagDisplay.textContent = `(Tag: ${activeTag})`; } else { activeTagDisplay.textContent = ''; }
    if (showTrashBtn) showTrashBtn.style.display = 'flex';
    if (showCalendarBtn) showCalendarBtn.style.display = 'flex';
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'none';
    setActiveSidebarButton('show-all-notes-btn');
    if (sortSelect) sortSelect.disabled = false;
    if (searchInput) searchInput.disabled = false;
    if (tagsListContainer) tagsListContainer.style.display = 'block';
    if (contentArea) contentArea.scrollTop = 0;
    renderNotesList(Object.values(notesCache));
}
function showCalendarView() {
    if (!currentUser) return;
    notesGridView.style.display = 'none';
    calendarView.style.display = 'block';
    trashView.style.display = 'none';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    currentView = 'calendar';
    if (showTrashBtn) showTrashBtn.style.display = 'flex';
    if (showCalendarBtn) showCalendarBtn.style.display = 'none';
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'flex';
    setActiveSidebarButton('show-calendar-btn');
    if (sortSelect) sortSelect.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (tagsListContainer) tagsListContainer.style.display = 'none';
    populateCalendarTagFilter();
    if (contentArea) contentArea.scrollTop = 0;
    initializeCalendar();
}
function showTrashNotesView() {
    if (!currentUser) return;
    notesGridView.style.display = 'none';
    calendarView.style.display = 'none';
    trashView.style.display = 'block';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    currentView = 'trash';
    if (showTrashBtn) showTrashBtn.style.display = 'none';
    if (showCalendarBtn) showCalendarBtn.style.display = 'flex';
    if (showAllNotesBtn) showAllNotesBtn.style.display = 'flex';
    setActiveSidebarButton('show-trash-btn');
    if (sortSelect) sortSelect.disabled = true;
    if (searchInput) searchInput.disabled = true;
    if (tagsListContainer) tagsListContainer.style.display = 'none';
    if (contentArea) contentArea.scrollTop = 0;
    renderTrashedNotesList(Object.values(trashedNotesCache));
}
function showEditor(note = null) {
    if (!currentUser) return;
    if (currentView !== 'editor' && currentView !== 'detail') { previousView = currentView; }
    notesGridView.style.display = 'none';
    calendarView.style.display = 'none';
    trashView.style.display = 'none';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'block';
    editorError.textContent = '';
    hideTagSuggestions();
    closeMobileSidebar();
    currentView = 'editor';
    if (note && note.id) { editorTitle.textContent = "Sửa Ghi chú"; noteIdInput.value = note.id; noteTitleInput.value = note.title; noteContentInput.value = note.content; noteTagsInput.value = note.tags ? note.tags.join(', ') : ''; noteEventDateInput.value = note.eventDate || ''; isCodeCheckbox.checked = note.isCode || false; languageSelect.value = note.language || 'plaintext'; languageSelect.style.display = note.isCode ? 'inline-block' : 'none'; currentNoteId = note.id; if (note.todos && Array.isArray(note.todos)) { enableTodoCheckbox.checked = true; renderTodosInEditor(note.todos); } else { enableTodoCheckbox.checked = false; renderTodosInEditor([]); } } else { editorTitle.textContent = "Tạo Ghi chú Mới"; clearEditorFields(); noteIdInput.value = ''; currentNoteId = null; }
    toggleTodoEditorVisibility();
    noteTitleInput.focus();
    if (contentArea) contentArea.scrollTop = 0;
}
function showDetailView(note) {
    if (!currentUser || !note || !note.id) { console.warn("Attempted to show detail view with invalid note data or not logged in."); showMainNotesView(); return; }
    if (currentView !== 'editor' && currentView !== 'detail') { previousView = currentView; }
    notesGridView.style.display = 'none';
    calendarView.style.display = 'none';
    trashView.style.display = 'none';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'block';
    currentNoteId = note.id;
    currentView = 'detail';
    displayNoteDetailContent(note);
    if (contentArea) contentArea.scrollTop = 0;
    closeMobileSidebar();
}
function handleBackButton() {
    console.log("Back button clicked. Previous view:", previousView);
    if (previousView === 'calendar') { showCalendarView(); }
    else if (previousView === 'trash') { showTrashNotesView(); }
    else { showMainNotesView(); }
}
if (backToGridBtn) {
    // Xóa listener cũ (nếu có) để tránh gọi nhiều lần
    const newBtn = backToGridBtn.cloneNode(true);
    backToGridBtn.parentNode.replaceChild(newBtn, backToGridBtn);
    document.getElementById('back-to-grid-btn').addEventListener('click', handleBackButton);
}

// --- Các hàm khác giữ nguyên ---
function clearEditorFields() { noteTitleInput.value = ''; noteContentInput.value = ''; noteTagsInput.value = ''; noteEventDateInput.value = ''; isCodeCheckbox.checked = false; languageSelect.value = 'plaintext'; languageSelect.style.display = 'none'; editorError.textContent = ''; hideTagSuggestions(); enableTodoCheckbox.checked = false; noteEditorTodosList.innerHTML = ''; toggleTodoEditorVisibility(); }
function clearEditor() { clearEditorFields(); noteIdInput.value = ''; }
function setActiveTagItem(tagName) { document.querySelectorAll('#tags-list-container .tag-item').forEach(item => { const itemTag = item.dataset.tag || (item.textContent === 'Tất cả' ? null : item.textContent); item.classList.toggle('active', itemTag === tagName); }); }
function linkify(text) { if (!text) return ''; const urlRegex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig; let linkedText = text.replace(urlRegex, (url) => { return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`; }); return linkedText.replace(/\n/g, '<br>'); }
function highlightText(text, searchTerm) { if (!searchTerm) { const tempDiv = document.createElement('div'); tempDiv.textContent = text || ''; return tempDiv.innerHTML.replace(/\n/g, '<br>'); } if (!text) return ''; const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); const regex = new RegExp(`(${escapedSearchTerm})`, 'gi'); const tempDiv = document.createElement('div'); tempDiv.textContent = text; const escapedText = tempDiv.innerHTML.replace(/\n/g, '<br>'); return escapedText.replace(regex, '<span class="search-highlight">$1</span>'); }

// --- Logic xử lý Theme, Màu Nhấn, Font ---
function applyTheme(themeName) { console.log("Applying theme:", themeName); document.body.classList.remove('theme-dark', 'theme-gruvbox-light', 'theme-dracula', 'theme-solarized-light'); if (themeName !== 'light') { document.body.classList.add(`theme-${themeName}`); } themeButtons.forEach(button => { button.classList.toggle('active', button.dataset.theme === themeName); }); if (prismThemeLink) { let prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css'; if (themeName === 'dark' || themeName === 'dracula') { prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-okaidia.min.css'; } else if (themeName === 'gruvbox-light') { prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css'; } else if (themeName === 'solarized-light') { prismThemeUrl = 'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-solarizedlight.min.css'; } prismThemeLink.href = prismThemeUrl; } try { localStorage.setItem('noteAppTheme', themeName); currentTheme = themeName; } catch (e) { console.error("Failed to save theme to localStorage:", e); } }
function loadSavedTheme() { try { const savedTheme = localStorage.getItem('noteAppTheme'); if (savedTheme && ['light', 'dark', 'gruvbox-light', 'dracula', 'solarized-light'].includes(savedTheme)) { applyTheme(savedTheme); } else { applyTheme('light'); } } catch (e) { console.error("Failed to load theme from localStorage:", e); applyTheme('light'); } }
themeButtons.forEach(button => { button.addEventListener('click', () => { const selectedTheme = button.dataset.theme; if (selectedTheme !== currentTheme) { applyTheme(selectedTheme); if (noteDetailView.style.display === 'block' && codeBlock.textContent && window.Prism) { Prism.highlightElement(codeBlock); } } }); });
function hexToRgb(hex) { const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null; }
function darkenColor(hexColor, percent) { let { r, g, b } = hexToRgb(hexColor); const factor = 1 - percent / 100; r = Math.max(0, Math.min(255, Math.round(r * factor))); g = Math.max(0, Math.min(255, Math.round(g * factor))); b = Math.max(0, Math.min(255, Math.round(b * factor))); return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`; }
function applyAccentColor(colorHex) { console.log("Applying accent color:", colorHex); const root = document.documentElement; root.style.setProperty('--accent-color', colorHex); const hoverColor = darkenColor(colorHex, 15); root.style.setProperty('--accent-color-hover', hoverColor); const rgb = hexToRgb(colorHex); if (rgb) { root.style.setProperty('--shadow-focus', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`); } accentColorButtons.forEach(button => { button.classList.toggle('active', button.dataset.accent === colorHex); }); try { localStorage.setItem('noteAppAccentColor', colorHex); currentAccentColor = colorHex; } catch (e) { console.error("Failed to save accent color to localStorage:", e); } }
function loadSavedAccentColor() { try { const savedAccentColor = localStorage.getItem('noteAppAccentColor'); if (savedAccentColor) { applyAccentColor(savedAccentColor); } else { applyAccentColor('#007bff'); } } catch (e) { console.error("Failed to load accent color from localStorage:", e); applyAccentColor('#007bff'); } }
accentColorButtons.forEach(button => { button.addEventListener('click', () => { const selectedAccent = button.dataset.accent; if (selectedAccent !== currentAccentColor) { applyAccentColor(selectedAccent); } }); });
function applyContentFont(fontFamily) { console.log("Applying content font:", fontFamily); document.documentElement.style.setProperty('--font-content', fontFamily); if (noteContentInput) { noteContentInput.style.fontFamily = fontFamily; } if (fontSelect && fontSelect.value !== fontFamily) { fontSelect.value = fontFamily; } try { localStorage.setItem('noteAppContentFont', fontFamily); currentContentFont = fontFamily; } catch (e) { console.error("Failed to save content font to localStorage:", e); } }
function loadSavedContentFont() { try { const savedFont = localStorage.getItem('noteAppContentFont'); const defaultFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'"; if (savedFont) { applyContentFont(savedFont); } else { applyContentFont(defaultFont); } } catch (e) { console.error("Failed to load content font from localStorage:", e); applyContentFont(defaultFont); } }
if (fontSelect) { fontSelect.addEventListener('change', (e) => { const selectedFont = e.target.value; if (selectedFont !== currentContentFont) { applyContentFont(selectedFont); } }); } else { console.warn("Font select element not found."); }

// --- Logic Xác thực (Authentication) ---
onAuthStateChanged(auth, (user) => { if (user) { console.log("User logged in:", user.uid, user.email); currentUser = user; userEmailDisplay.textContent = user.email; document.body.classList.remove('logged-out'); document.body.classList.add('logged-in'); closeAuthModal(); closeMobileSidebar(); if(searchInput) searchInput.disabled = false; if(sortSelect) sortSelect.disabled = false; if(addNoteBtn) addNoteBtn.disabled = false; setActiveSidebarButton('show-all-notes-btn'); loadNotesAndTags(); loadTrashedNotes(); showMainNotesView(); } else { console.log("User logged out."); currentUser = null; document.body.classList.remove('logged-in'); document.body.classList.add('logged-out'); closeAuthModal(); closeMobileSidebar(); clearEditor(); notesListContainer.innerHTML = ''; trashListContainer.innerHTML = '<p>Thùng rác trống.</p>'; tagsListContainer.innerHTML = ''; if (notesUnsubscribe) { notesUnsubscribe(); notesUnsubscribe = null; } if (trashUnsubscribe) { trashUnsubscribe(); trashUnsubscribe = null; } notesCache = {}; trashedNotesCache = {}; allUserTags.clear(); activeTag = null; currentNoteId = null; currentSearchTerm = ''; currentSortOption = 'updatedAt_desc'; currentView = 'notes'; if(searchInput) searchInput.value = ''; if(sortSelect) sortSelect.value = currentSortOption; if(searchInput) searchInput.disabled = true; if(sortSelect) sortSelect.disabled = true; if(addNoteBtn) addNoteBtn.disabled = true; notesGridView.style.display = 'none'; calendarView.style.display = 'none'; trashView.style.display = 'none'; noteDetailView.style.display = 'none'; noteEditorView.style.display = 'none'; } });
loginForm.addEventListener('submit', (e) => { e.preventDefault(); const email = loginForm['login-email'].value; const password = loginForm['login-password'].value; loginError.textContent = ''; const submitButton = loginForm.querySelector('button[type="submit"]'); submitButton.disabled = true; submitButton.textContent = 'Đang đăng nhập...'; signInWithEmailAndPassword(auth, email, password) .then(() => { loginForm.reset(); }) .catch((error) => { loginError.textContent = `Lỗi: ${error.message}`; }) .finally(() => { submitButton.disabled = false; submitButton.textContent = 'Đăng nhập'; }); });
signupForm.addEventListener('submit', (e) => { e.preventDefault(); const email = signupForm['signup-email'].value; const password = signupForm['signup-password'].value; signupError.textContent = ''; const submitButton = signupForm.querySelector('button[type="submit"]'); submitButton.disabled = true; submitButton.textContent = 'Đang đăng ký...'; createUserWithEmailAndPassword(auth, email, password) .then(() => { signupForm.reset(); }) .catch((error) => { signupError.textContent = `Lỗi: ${error.message}`; }) .finally(() => { submitButton.disabled = false; submitButton.textContent = 'Đăng ký'; }); });
logoutButton.addEventListener('click', () => { signOut(auth).catch((error) => alert(`Lỗi đăng xuất: ${error.message}`)); });

// --- Logic quản lý Ghi chú (Notes CRUD & Display) ---
isCodeCheckbox.addEventListener('change', (e) => { languageSelect.style.display = e.target.checked ? 'inline-block' : 'none'; if (!e.target.checked) { languageSelect.value = 'plaintext'; } toggleTodoEditorVisibility(); });
addNoteBtn.addEventListener('click', () => { showEditor(); });
cancelEditBtn.addEventListener('click', () => { clearEditor(); handleBackButton(); });
saveNoteBtn.addEventListener('click', async () => { if (!currentUser) return; const id = noteIdInput.value; const title = noteTitleInput.value.trim(); const content = noteContentInput.value.trim(); const tags = [...new Set(noteTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag))]; const eventDateValue = noteEventDateInput.value || null; const isCode = isCodeCheckbox.checked; const language = isCode ? languageSelect.value : 'plaintext'; if (!title) { editorError.textContent = "Tiêu đề không được để trống!"; alert("Tiêu đề không được để trống!"); return; } let todosToSave = null; if (enableTodoCheckbox.checked) { todosToSave = collectTodosFromEditor(); } if (!isCode && !enableTodoCheckbox.checked && !content && !eventDateValue) { editorError.textContent = "Nội dung hoặc Ngày sự kiện không được để trống nếu không phải là code hoặc to-do list!"; alert("Nội dung hoặc Ngày sự kiện không được để trống nếu không phải là code hoặc to-do list!"); return; } if (!isCode && enableTodoCheckbox.checked && (!todosToSave || todosToSave.length === 0) && !content && !eventDateValue) { editorError.textContent = "Vui lòng thêm công việc, nhập nội dung hoặc chọn ngày sự kiện."; alert("Vui lòng thêm công việc, nhập nội dung hoặc chọn ngày sự kiện."); return; } editorError.textContent = ''; saveNoteBtn.disabled = true; saveNoteBtn.textContent = 'Đang lưu...'; const noteData = { title, content: (isCode || (!enableTodoCheckbox.checked && !eventDateValue) || (enableTodoCheckbox.checked && content) || (eventDateValue && content) ) ? content : '', tags, eventDate: eventDateValue, isCode, language, todos: todosToSave, userId: currentUser.uid, updatedAt: Timestamp.now(), isPinned: id ? (notesCache[id]?.isPinned || false) : false, isTrashed: false }; if (!isCode && !content && ( (enableTodoCheckbox.checked && todosToSave && todosToSave.length > 0) || eventDateValue) ) { noteData.content = ''; } try { const targetViewFunction = previousView === 'calendar' ? showCalendarView : showMainNotesView; if (id) { console.log("Updating note with ID:", id); const noteRef = doc(db, "notes", id); await updateDoc(noteRef, noteData); console.log("Note updated successfully"); alert('Ghi chú đã được cập nhật!'); } else { console.log("Adding new note"); noteData.createdAt = Timestamp.now(); const docRef = await addDoc(collection(db, "notes"), noteData); console.log("Note added with ID:", docRef.id); } clearEditor(); targetViewFunction(); } catch (error) { console.error("Error saving note: ", error); editorError.textContent = `Lỗi lưu ghi chú: ${error.message}`; alert(`Lỗi lưu ghi chú: ${error.message}`); } finally { saveNoteBtn.disabled = false; saveNoteBtn.textContent = 'Lưu Ghi Chú'; } });
editNoteBtn.addEventListener('click', () => { if (!currentNoteId || !notesCache[currentNoteId]) { alert("Vui lòng chọn một ghi chú để sửa."); showMainNotesView(); return; }; const noteToEdit = notesCache[currentNoteId]; showEditor(noteToEdit); });
deleteNoteBtn.addEventListener('click', async () => { if (!currentNoteId || !notesCache[currentNoteId]) return; const noteTitle = notesCache[currentNoteId]?.title || "ghi chú này"; if (confirm(`Bạn có chắc chắn muốn chuyển ghi chú "${noteTitle}" vào thùng rác không?`)) { console.log("Moving note to trash, ID:", currentNoteId); const noteRef = doc(db, "notes", currentNoteId); try { await updateDoc(noteRef, { isTrashed: true, trashedAt: Timestamp.now(), updatedAt: Timestamp.now() }); console.log("Note moved to trash successfully"); alert(`Đã chuyển ghi chú "${noteTitle}" vào thùng rác.`); handleBackButton(); } catch (error) { console.error("Error moving note to trash:", error); alert(`Lỗi khi chuyển vào thùng rác: ${error.message}`); } } });
copyCodeBtn.addEventListener('click', () => { const codeToCopy = codeBlock.textContent; if (codeToCopy) { navigator.clipboard.writeText(codeToCopy) .then(() => { alert('Đã sao chép code vào clipboard!'); copyCodeBtn.textContent = 'Đã chép!'; setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 1500); }) .catch(err => { console.error('Clipboard copy failed:', err); alert('Lỗi khi sao chép code.'); }); } });

// --- Tải và Hiển thị Dữ liệu từ Firestore ---
// ... (giữ nguyên loadNotesAndTags, loadTrashedNotes)
function loadNotesAndTags() { if (!currentUser) return; console.log(`Loading notes for user: ${currentUser.uid}, Sort: ${currentSortOption}`); const [sortField, sortDirection] = currentSortOption.split('_'); let notesQuery = query( collection(db, "notes"), where("userId", "==", currentUser.uid), where("isTrashed", "==", false) ); if (currentSortOption !== 'deadline_asc') { notesQuery = query(notesQuery, orderBy("isPinned", "desc"), orderBy(sortField, sortDirection)); } else { notesQuery = query(notesQuery, orderBy("isPinned", "desc"), orderBy("updatedAt", "desc")); } if (notesUnsubscribe) notesUnsubscribe(); notesUnsubscribe = onSnapshot(notesQuery, (querySnapshot) => { console.log("Notes data received from Firestore"); const allNotes = []; const newNotesCache = {}; allUserTags.clear(); querySnapshot.forEach((doc) => { const note = { id: doc.id, ...doc.data() }; allNotes.push(note); newNotesCache[note.id] = note; if (note.tags && Array.isArray(note.tags)) { note.tags.forEach(tag => allUserTags.add(tag)); } }); notesCache = newNotesCache; if (currentView === 'notes') { renderNotesList(Object.values(notesCache)); } else if (currentView === 'calendar') { initializeCalendar(); } renderTagsList(allNotes); populateCalendarTagFilter(); if (currentNoteId && !notesCache[currentNoteId] && noteDetailView.style.display === 'block') { showMainNotesView(); } else if (currentNoteId && notesCache[currentNoteId] && noteDetailView.style.display === 'block') { displayNoteDetailContent(notesCache[currentNoteId]); } }, (error) => { console.error("Error loading main notes: ", error); if (error.code === 'failed-precondition') { notesListContainer.innerHTML = `<p class="error-message">Lỗi: Cần tạo chỉ mục (index) trong Firestore. Kiểm tra Console.</p>`; console.error("Firestore Index Required:", error.message); } else { notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`; } }); }
function loadTrashedNotes() { if (!currentUser) return; console.log(`Loading trashed notes for user: ${currentUser.uid}`); const trashQuery = query( collection(db, "notes"), where("userId", "==", currentUser.uid), where("isTrashed", "==", true), orderBy("trashedAt", "desc") ); if (trashUnsubscribe) trashUnsubscribe(); trashUnsubscribe = onSnapshot(trashQuery, (querySnapshot) => { console.log("Trashed notes data received"); const allTrashedNotes = []; const newTrashedNotesCache = {}; querySnapshot.forEach((doc) => { const note = { id: doc.id, ...doc.data() }; allTrashedNotes.push(note); newTrashedNotesCache[note.id] = note; }); trashedNotesCache = newTrashedNotesCache; if (currentView === 'trash') { renderTrashedNotesList(Object.values(trashedNotesCache)); } }, (error) => { console.error("Error loading trashed notes: ", error); if (error.code === 'failed-precondition') { trashListContainer.innerHTML = `<p class="error-message">Lỗi: Cần tạo chỉ mục (index) cho thùng rác. Kiểm tra Console.</p>`; console.error("Firestore Index Required for trash:", error.message); } else { trashListContainer.innerHTML = `<p class="error-message">Lỗi tải thùng rác: ${error.message}</p>`; } }); }

// --- Render Lists ---
// ... (giữ nguyên getNearestUpcomingDeadline, renderNotesList, renderTrashedNotesList, renderTagsList, displayNoteDetailContent)
function getNearestUpcomingDeadline(note) { if (!note.todos || note.todos.length === 0) { return null; } const today = new Date(); today.setHours(0, 0, 0, 0); let nearestDeadline = null; note.todos.forEach(todo => { if (!todo.completed && todo.deadline) { try { const deadlineDate = new Date(todo.deadline + "T00:00:00"); if (!isNaN(deadlineDate) && deadlineDate >= today) { if (nearestDeadline === null || deadlineDate < nearestDeadline) { nearestDeadline = deadlineDate; } } } catch (e) { console.warn("Invalid date format in todo:", todo); } } }); return nearestDeadline; }
function renderNotesList(notesFromCache) { notesListContainer.innerHTML = ''; const searchTermLower = currentSearchTerm.toLowerCase(); let notesToRender = notesFromCache.filter(note => { const tagMatch = !activeTag || (note.tags && note.tags.includes(activeTag)); if (!tagMatch) return false; if (searchTermLower) { const titleMatch = note.title?.toLowerCase().includes(searchTermLower); const contentMatch = note.content?.toLowerCase().includes(searchTermLower); const tagsMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchTermLower)); const todosMatch = note.todos?.some(todo => todo.text?.toLowerCase().includes(searchTermLower)); return titleMatch || contentMatch || tagsMatch || todosMatch; } return true; }); if (currentSortOption === 'deadline_asc') { notesToRender.sort((a, b) => { const deadlineA = getNearestUpcomingDeadline(a); const deadlineB = getNearestUpcomingDeadline(b); if (deadlineA && deadlineB) return deadlineA - deadlineB; if (deadlineA && !deadlineB) return -1; if (!deadlineA && deadlineB) return 1; const dateA = a.updatedAt?.toDate ? a.updatedAt.toDate() : new Date(0); const dateB = b.updatedAt?.toDate ? b.updatedAt.toDate() : new Date(0); return dateB - dateA; }); } else { notesToRender.sort((a, b) => { const pinA = a.isPinned || false; const pinB = b.isPinned || false; if (pinA !== pinB) return pinB - pinA; return 0; }); } if (notesToRender.length === 0) { let message = 'Chưa có ghi chú nào.'; if (activeTag && currentSearchTerm) message = `Không có ghi chú nào với tag "${activeTag}" khớp với "${currentSearchTerm}".`; else if (activeTag) message = `Không có ghi chú nào với tag "${activeTag}".`; else if (currentSearchTerm) message = `Không có ghi chú nào khớp với "${currentSearchTerm}".`; else message = 'Chưa có ghi chú nào. Hãy tạo ghi chú mới!'; notesListContainer.innerHTML = `<p>${message}</p>`; return; } const today = new Date(); today.setHours(0, 0, 0, 0); notesToRender.forEach(note => { const noteElement = document.createElement('div'); noteElement.classList.add('note-item'); noteElement.dataset.id = note.id; const pinIcon = document.createElement('span'); pinIcon.classList.add('pin-icon'); pinIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin-angle${note.isPinned ? '-fill' : ''}" viewBox="0 0 16 16"><path d="${note.isPinned ? pinAngleFillSVGPath : pinAngleSVGPath}"/></svg>`; if (note.isPinned) pinIcon.classList.add('pinned'); pinIcon.title = note.isPinned ? "Bỏ ghim" : "Ghim ghi chú"; pinIcon.addEventListener('click', (e) => { e.stopPropagation(); togglePinStatus(note.id); }); noteElement.appendChild(pinIcon); const titleElement = document.createElement('h3'); titleElement.innerHTML = highlightText(note.title || "Không có tiêu đề", currentSearchTerm); const contentPreview = document.createElement('div'); contentPreview.classList.add('note-item-content-preview'); if (note.todos && note.todos.length > 0) { let nearestDeadlineInfo = { date: null, text: '', isOverdue: false }; let highestPriorityUncompletedText = ''; let highestPriorityLevel = -1; note.todos.forEach(todo => { if (!todo.completed) { if (todo.deadline) { try { const deadlineDate = new Date(todo.deadline + "T00:00:00"); if (!isNaN(deadlineDate)) { const isOverdue = deadlineDate < today; if (deadlineDate >= today) { if (nearestDeadlineInfo.date === null || deadlineDate < nearestDeadlineInfo.date) { nearestDeadlineInfo = { date: deadlineDate, text: `Hạn: ${deadlineDate.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`, isOverdue: false }; } } else if (isOverdue) { if (nearestDeadlineInfo.date === null || !nearestDeadlineInfo.isOverdue || deadlineDate > nearestDeadlineInfo.date) { nearestDeadlineInfo = { date: deadlineDate, text: `Hạn: ${deadlineDate.toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})}`, isOverdue: true }; } } } } catch(e) {} } const currentPriorityLevel = (todo.priority === 'high' ? 2 : (todo.priority === 'medium' ? 1 : (todo.priority === 'low' ? 0 : -1))); if (currentPriorityLevel > highestPriorityLevel) { highestPriorityLevel = currentPriorityLevel; highestPriorityUncompletedText = `Ưu tiên: ${todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}`; } } }); let previewHTML = ''; if (nearestDeadlineInfo.date || highestPriorityLevel > -1) { previewHTML += `<div class="todo-preview-item">`; if (nearestDeadlineInfo.date) { previewHTML += `<span class="todo-deadline-preview ${nearestDeadlineInfo.isOverdue ? 'overdue' : ''}">${nearestDeadlineInfo.text}</span>`; } if (highestPriorityLevel > -1 && !(nearestDeadlineInfo.date && nearestDeadlineInfo.isOverdue)) { previewHTML += `<span class="todo-priority-preview priority-${['low','medium','high'][highestPriorityLevel]}">${highestPriorityUncompletedText}</span>`; } const otherTodos = note.todos.filter(t => !t.completed).slice(0, 2); otherTodos.forEach(t => { const tempDiv = document.createElement('div'); tempDiv.textContent = t.text || ''; const escapedTodoText = tempDiv.innerHTML; previewHTML += `<br><span class="todo-status">[ ]</span> <span class="todo-text">${escapedTodoText.substring(0, 50)}${escapedTodoText.length > 50 ? '...' : ''}</span>`; }); previewHTML += `</div>`; } else { const firstTodos = note.todos.slice(0, 3).map(todo => { const tempDiv = document.createElement('div'); tempDiv.textContent = todo.text || ''; const escapedTodoText = tempDiv.innerHTML; return `<span class="todo-preview-item"><span class="todo-status">${todo.completed ? '[x]' : '[ ]'}</span> <span class="todo-text">${escapedTodoText.substring(0, 50)}${escapedTodoText.length > 50 ? '...' : ''}</span></span>`; }).join(''); previewHTML = firstTodos + (note.todos.length > 3 ? '...' : ''); } contentPreview.innerHTML = previewHTML; } else { contentPreview.innerHTML = highlightText(note.content || '', currentSearchTerm); } const dateElement = document.createElement('div'); dateElement.classList.add('note-item-date'); if (note.updatedAt && note.updatedAt.toDate) { dateElement.textContent = note.updatedAt.toDate().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'}); } noteElement.appendChild(titleElement); noteElement.appendChild(contentPreview); noteElement.appendChild(dateElement); noteElement.addEventListener('click', () => showDetailView(note)); notesListContainer.appendChild(noteElement); }); }
function renderTrashedNotesList(trashedNotes) { trashListContainer.innerHTML = ''; if (trashedNotes.length === 0) { trashListContainer.innerHTML = '<p>Thùng rác trống.</p>'; return; } trashedNotes.forEach(note => { const noteElement = document.createElement('div'); noteElement.classList.add('note-item'); noteElement.dataset.id = note.id; const titleElement = document.createElement('h3'); titleElement.textContent = note.title || "Không có tiêu đề"; const contentPreview = document.createElement('div'); contentPreview.classList.add('note-item-content-preview'); if (note.todos && note.todos.length > 0) { const firstFewTodos = note.todos.slice(0, 3).map(todo => `${todo.completed ? '[x]' : '[ ]'} ${todo.text}`).join('\n'); contentPreview.textContent = firstFewTodos + (note.todos.length > 3 ? '\n...' : ''); } else { contentPreview.textContent = note.content || ''; } const trashedDateElement = document.createElement('div'); trashedDateElement.classList.add('note-item-date'); if (note.trashedAt && note.trashedAt.toDate) { trashedDateElement.textContent = `Vào thùng rác: ${note.trashedAt.toDate().toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit', year: 'numeric'})}`; } const actionsDiv = document.createElement('div'); actionsDiv.classList.add('trashed-note-actions'); const restoreBtn = document.createElement('button'); restoreBtn.classList.add('button-secondary'); restoreBtn.textContent = 'Khôi phục'; restoreBtn.addEventListener('click', (e) => { e.stopPropagation(); restoreNoteFromTrash(note.id); }); const deletePermanentlyBtn = document.createElement('button'); deletePermanentlyBtn.classList.add('button-danger'); deletePermanentlyBtn.textContent = 'Xóa vĩnh viễn'; deletePermanentlyBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteNotePermanently(note.id, note.title); }); actionsDiv.appendChild(restoreBtn); actionsDiv.appendChild(deletePermanentlyBtn); noteElement.appendChild(titleElement); noteElement.appendChild(contentPreview); noteElement.appendChild(trashedDateElement); noteElement.appendChild(actionsDiv); trashListContainer.appendChild(noteElement); }); }
function renderTagsList(notes) { tagsListContainer.innerHTML = ''; const allTagElement = document.createElement('span'); allTagElement.classList.add('tag-item'); allTagElement.textContent = 'Tất cả'; if (activeTag === null) allTagElement.classList.add('active'); allTagElement.addEventListener('click', () => { if (activeTag !== null) { activeTag = null; setActiveTagItem(null); renderNotesList(Object.values(notesCache)); showMainNotesView(); } }); tagsListContainer.appendChild(allTagElement); [...allUserTags].sort().forEach(tag => { const tagElement = document.createElement('span'); tagElement.classList.add('tag-item'); tagElement.textContent = tag; tagElement.dataset.tag = tag; if (tag === activeTag) tagElement.classList.add('active'); tagElement.addEventListener('click', () => { if (activeTag !== tag) { activeTag = tag; setActiveTagItem(tag); renderNotesList(Object.values(notesCache)); showMainNotesView(); } }); tagsListContainer.appendChild(tagElement); }); if (allUserTags.size === 0) { const noTags = document.createElement('p'); noTags.textContent = 'Chưa có tag nào.'; noTags.style.fontSize = '0.9em'; noTags.style.color = 'var(--text-secondary)'; tagsListContainer.appendChild(noTags); } populateCalendarTagFilter(); }
function displayNoteDetailContent(note) { if (!note) return; noteDetailTitle.textContent = note.title; if (pinNoteDetailBtn) { pinNoteDetailBtn.classList.toggle('pinned', !!note.isPinned); pinNoteDetailBtn.title = note.isPinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú"; const svgIcon = pinNoteDetailBtn.querySelector('svg'); if (svgIcon) { const pathElement = svgIcon.querySelector('path'); if(pathElement){ pathElement.setAttribute('d', note.isPinned ? pinAngleFillSVGPath : pinAngleSVGPath); } svgIcon.classList.remove('bi-pin-angle', 'bi-pin-angle-fill'); svgIcon.classList.add(note.isPinned ? 'bi-pin-angle-fill' : 'bi-pin-angle'); } } noteDetailTags.innerHTML = ''; if (note.tags && note.tags.length > 0) { note.tags.forEach(tag => { const tagElement = document.createElement('span'); tagElement.classList.add('tag'); tagElement.textContent = tag; noteDetailTags.appendChild(tagElement); }); } if (note.isCode) { noteDetailContent.style.display = 'none'; noteDetailTodosContainer.style.display = 'none'; codeBlock.textContent = note.content; codeBlock.className = `language-${note.language || 'plaintext'}`; noteDetailCode.style.display = 'block'; copyCodeBtn.style.display = 'inline-block'; if (window.Prism) Prism.highlightElement(codeBlock); } else { noteDetailCode.style.display = 'none'; copyCodeBtn.style.display = 'none'; if (note.todos && Array.isArray(note.todos) && note.todos.length > 0) { noteDetailContent.style.display = 'none'; noteDetailTodosContainer.style.display = 'block'; renderTodosInDetailView(note.id, note.todos); } else { noteDetailTodosContainer.style.display = 'none'; noteDetailContent.innerHTML = linkify(note.content); noteDetailContent.style.display = 'block'; } } }

// --- Logic Ghim Ghi chú ---
async function togglePinStatus(noteId) { if (!currentUser || !notesCache[noteId]) return; const noteRef = doc(db, "notes", noteId); const currentPinnedStatus = notesCache[noteId].isPinned || false; const newPinnedStatus = !currentPinnedStatus; try { await updateDoc(noteRef, { isPinned: newPinnedStatus, updatedAt: Timestamp.now() }); console.log(`Note ${noteId} pin status updated to ${newPinnedStatus}`); } catch (error) { console.error("Error updating pin status:", error); alert("Lỗi cập nhật trạng thái ghim."); } } if (pinNoteDetailBtn) { pinNoteDetailBtn.addEventListener('click', () => { if (currentNoteId) togglePinStatus(currentNoteId); }); }

// --- Logic cho Thùng rác ---
async function restoreNoteFromTrash(noteId) { if (!currentUser || !trashedNotesCache[noteId]) return; const noteRef = doc(db, "notes", noteId); try { await updateDoc(noteRef, { isTrashed: false, trashedAt: null, updatedAt: Timestamp.now() }); console.log(`Note ${noteId} restored from trash.`); alert("Đã khôi phục ghi chú."); } catch (error) { console.error("Error restoring note:", error); alert("Lỗi khôi phục ghi chú."); } } async function deleteNotePermanently(noteId, noteTitle = "ghi chú này") { if (!currentUser || !trashedNotesCache[noteId]) return; if (confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN ghi chú "${noteTitle}" không? Hành động này KHÔNG THỂ hoàn tác.`)) { const noteRef = doc(db, "notes", noteId); try { await deleteDoc(noteRef); console.log(`Note ${noteId} permanently deleted.`); alert("Đã xóa vĩnh viễn ghi chú."); } catch (error) { console.error("Error permanently deleting note:", error); alert("Lỗi xóa vĩnh viễn ghi chú."); } } } if (showTrashBtn) { showTrashBtn.addEventListener('click', showTrashNotesView); } if (showAllNotesBtn) { showAllNotesBtn.addEventListener('click', showMainNotesView); }

// --- Logic Gợi ý Tag ---
function displayTagSuggestions(suggestions, currentTagValue) { if (!tagSuggestionsContainer) return; tagSuggestionsContainer.innerHTML = ''; if (suggestions.length === 0) { hideTagSuggestions(); return; } suggestions.forEach(tag => { const suggestionItem = document.createElement('div'); suggestionItem.classList.add('suggestion-item'); suggestionItem.textContent = tag; suggestionItem.addEventListener('click', () => { const tagsArray = noteTagsInput.value.split(',').map(t => t.trim()); tagsArray.pop(); tagsArray.push(tag); noteTagsInput.value = tagsArray.join(', ') + ', '; hideTagSuggestions(); noteTagsInput.focus(); }); tagSuggestionsContainer.appendChild(suggestionItem); }); tagSuggestionsContainer.style.display = 'block'; } function hideTagSuggestions() { if (tagSuggestionsContainer) { tagSuggestionsContainer.style.display = 'none'; } } if (noteTagsInput) { noteTagsInput.addEventListener('input', () => { const inputValue = noteTagsInput.value; const tagsArray = inputValue.split(',').map(t => t.trim()); const currentTypingTag = tagsArray[tagsArray.length - 1].toLowerCase(); if (currentTypingTag) { const existingTagsInInput = tagsArray.slice(0, -1).map(t => t.toLowerCase()); const suggestions = [...allUserTags].filter(tag => tag.toLowerCase().startsWith(currentTypingTag) && !existingTagsInInput.includes(tag.toLowerCase()) ); displayTagSuggestions(suggestions, currentTypingTag); } else { hideTagSuggestions(); } }); noteTagsInput.addEventListener('blur', () => { setTimeout(hideTagSuggestions, 150); }); noteTagsInput.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideTagSuggestions(); } }); }

// --- Logic cho nút Scroll to Top ---
function handleScroll() { if (!contentArea || !scrollToTopBtn) return; if (contentArea.scrollTop > 200) { scrollToTopBtn.style.display = "block"; } else { scrollToTopBtn.style.display = "none"; } } function scrollToTop() { if (!contentArea) return; contentArea.scrollTop = 0; } if (contentArea) { contentArea.addEventListener('scroll', handleScroll); } else { console.warn("Content area element (#content-area) not found for scroll event listener."); } if (scrollToTopBtn) { scrollToTopBtn.addEventListener('click', scrollToTop); } else { console.warn("Scroll to top button element not found."); }

// --- Logic tìm kiếm ---
if (searchInput) { searchInput.addEventListener('input', (e) => { currentSearchTerm = e.target.value.trim(); if (currentView === 'notes') { renderNotesList(Object.values(notesCache)); } }); } else { console.warn("Search input element not found."); }

// --- Logic sắp xếp ---
if (sortSelect) { sortSelect.addEventListener('change', (e) => { const newSortOption = e.target.value; if (newSortOption !== currentSortOption) { console.log("Sort option changed to:", newSortOption); currentSortOption = newSortOption; if (currentSortOption === 'deadline_asc') { if (currentView === 'notes') { renderNotesList(Object.values(notesCache)); } } else { loadNotesAndTags(); } } }); } else { console.warn("Sort select element not found."); }

// --- LOGIC CHO TO-DO LIST ---
function toggleTodoEditorVisibility() { const isEnabled = enableTodoCheckbox.checked; noteEditorTodosList.style.display = isEnabled ? 'block' : 'none'; addTodoEditorItemBtn.style.display = isEnabled ? 'inline-block' : 'none'; if (isCodeCheckbox.checked) { noteContentInput.style.display = 'block'; } else { noteContentInput.style.display = isEnabled ? 'none' : 'block'; } } if (enableTodoCheckbox) { enableTodoCheckbox.addEventListener('change', toggleTodoEditorVisibility); } if (isCodeCheckbox) { isCodeCheckbox.addEventListener('change', toggleTodoEditorVisibility); } function addTodoItemToEditor(todo = { id: '', text: '', completed: false, priority: 'medium', deadline: null }) { const listItem = document.createElement('li'); listItem.classList.add('todo-editor-item'); const todoId = todo.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`; listItem.dataset.todoId = todoId; const mainDiv = document.createElement('div'); mainDiv.classList.add('todo-editor-item-main'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.classList.add('todo-editor-item-checkbox'); checkbox.checked = todo.completed; checkbox.disabled = true; const textInput = document.createElement('input'); textInput.type = 'text'; textInput.classList.add('todo-editor-item-text'); textInput.placeholder = 'Nội dung công việc...'; textInput.value = todo.text; mainDiv.appendChild(checkbox); mainDiv.appendChild(textInput); const metaDiv = document.createElement('div'); metaDiv.classList.add('todo-editor-item-meta'); const prioritySelect = document.createElement('select'); prioritySelect.classList.add('todo-editor-item-priority'); ['medium', 'low', 'high'].forEach(p => { const option = document.createElement('option'); option.value = p; let priorityText = 'Trung bình'; if (p === 'low') priorityText = 'Thấp'; else if (p === 'high') priorityText = 'Cao'; option.textContent = `Ưu tiên: ${priorityText}`; if (p === (todo.priority || 'medium')) option.selected = true; prioritySelect.appendChild(option); }); const deadlineInput = document.createElement('input'); deadlineInput.type = 'date'; deadlineInput.classList.add('todo-editor-item-deadline'); deadlineInput.value = todo.deadline || ''; const deleteButton = document.createElement('button'); deleteButton.type = 'button'; deleteButton.classList.add('todo-editor-item-delete-btn'); deleteButton.textContent = 'Xóa'; deleteButton.addEventListener('click', () => { listItem.remove(); }); metaDiv.appendChild(prioritySelect); metaDiv.appendChild(deadlineInput); metaDiv.appendChild(deleteButton); listItem.appendChild(mainDiv); listItem.appendChild(metaDiv); noteEditorTodosList.appendChild(listItem); textInput.focus(); } if (addTodoEditorItemBtn) { addTodoEditorItemBtn.addEventListener('click', () => addTodoItemToEditor()); } function renderTodosInEditor(todosArray = []) { noteEditorTodosList.innerHTML = ''; if (todosArray && todosArray.length > 0) { todosArray.forEach(todo => addTodoItemToEditor(todo)); } } function collectTodosFromEditor() { const collectedTodos = []; const todoItems = noteEditorTodosList.querySelectorAll('.todo-editor-item'); todoItems.forEach((item, index) => { const textInput = item.querySelector('.todo-editor-item-text'); const prioritySelect = item.querySelector('.todo-editor-item-priority'); const deadlineInput = item.querySelector('.todo-editor-item-deadline'); const completedCheckbox = item.querySelector('.todo-editor-item-checkbox'); if (textInput && textInput.value.trim() !== '') { collectedTodos.push({ id: item.dataset.todoId.startsWith('temp-') ? `todo-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 3)}` : item.dataset.todoId, text: textInput.value.trim(), completed: completedCheckbox ? completedCheckbox.checked : false, priority: prioritySelect ? prioritySelect.value : 'medium', deadline: deadlineInput && deadlineInput.value ? deadlineInput.value : null, order: index }); } }); return collectedTodos; } function renderTodosInDetailView(noteId, todosArray = []) { noteDetailTodosList.innerHTML = ''; if (!todosArray || todosArray.length === 0) { if (noteDetailTodosProgress) noteDetailTodosProgress.innerHTML = ''; return; } todosArray.sort((a, b) => (a.order || 0) - (b.order || 0)); const today = new Date(); today.setHours(0, 0, 0, 0); todosArray.forEach(todo => { const listItem = document.createElement('li'); listItem.classList.add('todo-detail-item'); listItem.dataset.todoId = todo.id; const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.classList.add('todo-detail-item-checkbox'); checkbox.checked = todo.completed; checkbox.addEventListener('change', async (e) => { await toggleTodoItemStatus(noteId, todo.id, e.target.checked); }); const contentDiv = document.createElement('div'); contentDiv.classList.add('todo-detail-item-content'); const textSpan = document.createElement('span'); textSpan.classList.add('todo-detail-item-text'); textSpan.textContent = todo.text; if (todo.completed) { textSpan.classList.add('completed'); } contentDiv.appendChild(textSpan); const metaDisplayDiv = document.createElement('div'); metaDisplayDiv.classList.add('todo-detail-item-meta-display'); if (todo.priority) { const prioritySpan = document.createElement('span'); prioritySpan.classList.add('todo-detail-item-priority', `priority-${todo.priority}`); let priorityText = 'Trung bình'; if (todo.priority === 'low') priorityText = 'Thấp'; else if (todo.priority === 'high') priorityText = 'Cao'; prioritySpan.textContent = `Ưu tiên: ${priorityText}`; metaDisplayDiv.appendChild(prioritySpan); } if (todo.deadline) { const deadlineSpan = document.createElement('span'); deadlineSpan.classList.add('todo-detail-item-deadline'); try { const deadlineDate = new Date(todo.deadline + "T00:00:00"); if (!isNaN(deadlineDate)) { deadlineSpan.textContent = `Hạn: ${deadlineDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`; if (!todo.completed && deadlineDate < today) { deadlineSpan.classList.add('overdue'); deadlineSpan.title = "Quá hạn!"; } } else { deadlineSpan.textContent = `Hạn: (không hợp lệ)`; } } catch (e) { deadlineSpan.textContent = `Hạn: (lỗi định dạng)`; console.warn("Error parsing deadline date:", todo.deadline, e); } metaDisplayDiv.appendChild(deadlineSpan); } if(metaDisplayDiv.hasChildNodes()){ contentDiv.appendChild(metaDisplayDiv); } listItem.appendChild(checkbox); listItem.appendChild(contentDiv); noteDetailTodosList.appendChild(listItem); }); updateTodoProgress(todosArray); }
async function toggleTodoItemStatus(noteId, todoId, isCompleted) { if (!currentUser || !notesCache[noteId]) return; const noteRef = doc(db, "notes", noteId); let currentTodos = []; const noteInCache = notesCache[noteId]; if (noteInCache && noteInCache.todos && Array.isArray(noteInCache.todos)) { currentTodos = [...noteInCache.todos]; } else { try { const serverNoteSnap = await getDoc(noteRef); if (serverNoteSnap.exists() && serverNoteSnap.data().todos && Array.isArray(serverNoteSnap.data().todos)) { currentTodos = serverNoteSnap.data().todos; } else { console.error("Note or todos not found on server for update:", noteId); alert("Lỗi: Không tìm thấy danh sách công việc để cập nhật."); return; } } catch (error) { console.error("Error fetching note before update:", error); alert("Lỗi khi lấy dữ liệu ghi chú để cập nhật."); return; } } const updatedTodos = currentTodos.map(t => { if (t.id === todoId) { return { ...t, completed: isCompleted }; } return t; }); try { await updateDoc(noteRef, { todos: updatedTodos, updatedAt: Timestamp.now() }); console.log(`Todo ${todoId} in note ${noteId} status updated to ${isCompleted} on server.`); const detailItemText = noteDetailTodosList.querySelector(`li[data-todo-id="${todoId}"] .todo-detail-item-text`); if (detailItemText) { detailItemText.classList.toggle('completed', isCompleted); } if (notesCache[noteId]) { notesCache[noteId].todos = updatedTodos; notesCache[noteId].updatedAt = Timestamp.now(); updateTodoProgress(updatedTodos); } } catch (error) { console.error("Error updating todo status on server:", error); alert("Lỗi cập nhật trạng thái công việc."); } }
function updateTodoProgress(todosArray = []) { if (!noteDetailTodosProgress) return; const totalTasks = todosArray.length; if (totalTasks === 0) { noteDetailTodosProgress.innerHTML = ''; return; } const completedTasks = todosArray.filter(todo => todo.completed).length; const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0; noteDetailTodosProgress.innerHTML = ` <span>Hoàn thành: ${completedTasks}/${totalTasks} công việc</span> <div class="progress-bar-container"> <div class="progress-bar" style="width: ${percentage}%;"></div> </div> `; }

// --- LOGIC CHO CALENDAR VIEW ---
function populateCalendarTagFilter() {
    if (!calendarTagFilter) return;
    const currentFilterValue = calendarTagFilter.value;
    while (calendarTagFilter.options.length > 1) { calendarTagFilter.remove(1); }
    [...allUserTags].sort().forEach(tag => {
        const option = document.createElement('option');
        option.value = tag; option.textContent = tag;
        calendarTagFilter.appendChild(option);
    });
    calendarTagFilter.value = currentFilterValue;
}
function initializeCalendar() {
    if (!calendarContainer) { console.error("Calendar container not found!"); return; }
    if (!currentUser) return;
    console.log(`Initializing calendar... Filtering by tag: ${calendarSelectedTag || 'All'}`);
    const events = [];
    const todayStr = new Date().toISOString().split('T')[0];
    Object.values(notesCache).forEach(note => {
        const noteTags = note.tags || [];
        if (calendarSelectedTag && !noteTags.includes(calendarSelectedTag)) { return; } // Lọc theo tag
        if (note.eventDate) { try { const eventDate = new Date(note.eventDate + "T00:00:00"); if (!isNaN(eventDate)) { events.push({ title: `📌 ${note.title}`, start: note.eventDate, allDay: true, extendedProps: { noteId: note.id, type: 'event', tags: noteTags }, color: '#6f42c1', borderColor: '#6f42c1' }); } else { console.warn(`Invalid eventDate format "${note.eventDate}" in note "${note.title}"`); } } catch (e) { console.warn(`Error parsing eventDate "${note.eventDate}" in note "${note.title}":`, e); } }
        if (note.todos && Array.isArray(note.todos)) {
            note.todos.forEach(todo => {
                if (todo.deadline) {
                    try {
                        const deadlineDate = new Date(todo.deadline + "T00:00:00");
                        if (!isNaN(deadlineDate)) {
                            let eventColor = currentAccentColor; let titlePrefix = todo.completed ? '✅ ' : '⏳ ';
                            if (todo.completed) { eventColor = '#6c757d'; }
                            else if (todo.priority === 'high') { eventColor = '#dc3545'; titlePrefix = '🔥 '; }
                            else if (todo.priority === 'low') { eventColor = '#198754'; titlePrefix = '🟢 '; }
                            if (!todo.completed && todo.deadline < todayStr) { titlePrefix = '❌ '; eventColor = '#8b0000'; }
                            events.push({ title: `${titlePrefix}${note.title}: ${todo.text}`, start: todo.deadline, allDay: true, extendedProps: { noteId: note.id, todoId: todo.id, type: 'todo', tags: noteTags }, color: eventColor, borderColor: eventColor, classNames: todo.completed ? ['event-completed'] : (todo.deadline < todayStr ? ['event-overdue'] : []) });
                        } else { console.warn(`Invalid deadline format "${todo.deadline}" in note "${note.title}", todo "${todo.text}"`); }
                    } catch (e) { console.warn(`Error parsing deadline "${todo.deadline}" in note "${note.title}", todo "${todo.text}":`, e); }
                }
            });
        }
    });
    if (calendar) { calendar.destroy(); calendar = null; console.log("Previous calendar instance destroyed."); }
    calendar = new FullCalendar.Calendar(calendarContainer, {
        initialView: 'dayGridMonth', locale: 'vi',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
        buttonText: { today: 'Hôm nay', month: 'Tháng', week: 'Tuần', day: 'Ngày', list: 'Danh sách' },
        events: events,
        eventClick: function(info) {
            const noteId = info.event.extendedProps.noteId;
            console.log("Event clicked:", info.event.title, "Note ID:", noteId);
            if (noteId && notesCache[noteId]) { showDetailView(notesCache[noteId]); }
            else { console.warn("Note not found in cache for event click:", noteId); alert("Không tìm thấy ghi chú tương ứng."); }
        },
        eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false },
        slotLabelFormat: { hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false },
    });
    calendar.render();
    console.log("Calendar rendered/updated.");
}
if (showCalendarBtn) { showCalendarBtn.addEventListener('click', showCalendarView); }
if (calendarTagFilter) { calendarTagFilter.addEventListener('change', (e) => { calendarSelectedTag = e.target.value || null; initializeCalendar(); }); }

// --- Khởi chạy ---
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadSavedAccentColor();
    loadSavedContentFont();
    toggleTodoEditorVisibility();
    if (!auth.currentUser) {
         document.body.classList.remove('logged-in');
         document.body.classList.add('logged-out');
    }
    if(sortSelect) sortSelect.value = currentSortOption;
});

console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");

