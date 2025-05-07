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
const noteDetailContent = document.getElementById('note-detail-content'); // Hiển thị text/code
const noteDetailTodolist = document.getElementById('note-detail-todolist'); // Hiển thị todolist
const noteDetailCode = document.getElementById('note-detail-code');
const codeBlock = noteDetailCode.querySelector('code');
const copyCodeBtn = document.getElementById('copy-code-btn');
const editNoteBtn = document.getElementById('edit-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');
const pinNoteDetailBtn = document.getElementById('pin-note-detail-btn');


const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id-input');
// *** THÊM MỚI: Tham chiếu đến các phần tử của editor mới ***
const noteTypeSelect = document.getElementById('note-type-select');
const textCodeContentEditor = document.getElementById('text-code-content-editor');
const todolistEditor = document.getElementById('todolist-editor');
const todolistItemsContainer = document.getElementById('todolist-items-container');
const addTodoItemBtn = document.getElementById('add-todo-item-btn');

const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteTagsInput = document.getElementById('note-tags-input');
const tagSuggestionsContainer = document.getElementById('tag-suggestions');

const isCodeCheckbox = document.getElementById('note-is-code-checkbox');
const noteIsCodeLabel = document.getElementById('note-is-code-label'); // Label cho checkbox code
const languageSelect = document.getElementById('note-language-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editorError = document.getElementById('editor-error');

const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const contentArea = document.querySelector('.content-area');

const themeButtons = document.querySelectorAll('.sidebar-settings .theme-button');
const prismThemeLink = document.getElementById('prism-theme-link');
const accentColorButtons = document.querySelectorAll('.sidebar-settings .accent-color-button');
const fontSelect = document.querySelector('.sidebar-settings #font-select');
const settingsToggleBtn = document.getElementById('toggle-settings-btn');
const settingsOptionsContent = document.getElementById('settings-options-content');


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
// *** THÊM MỚI: Mảng tạm thời lưu các mục to-do trong editor ***
let currentTodoItems = [];


// --- SVG Paths ---
const pinAngleSVGPath = "M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146zm-3.27 1.96a.5.5 0 0 1 0 .707L2.874 8.874a.5.5 0 1 1-.707-.707l3.687-3.687a.5.5 0 0 1 .707 0z";
const pinAngleFillSVGPath = "M9.828.722a.5.5 0 0 1 .354.146l4.95 4.95a.5.5 0 0 1 0 .707c-.48.48-1.072.588-1.503.588-.177 0-.335-.018-.46-.039l-3.134 3.134a5.927 5.927 0 0 1 .16 1.013c.046.702-.032 1.687-.72 2.375a.5.5 0 0 1-.707 0l-2.829-2.828-3.182 3.182c-.195.195-1.219.902-1.414.707-.195-.195.512-1.22.707-1.414l3.182-3.182-2.828-2.829a.5.5 0 0 1 0-.707c.688-.688 1.673-.767 2.375-.72a5.922 5.922 0 0 1 1.013.16l3.134-3.133a2.772 2.772 0 0 1-.04-.461c0-.43.108-1.022.589-1.503a.5.5 0 0 1 .353-.146z";


// --- Hàm trợ giúp quản lý giao diện (UI Helpers) ---
// (Các hàm show/hide/clear/set/linkify/highlight giữ nguyên)
// ... (Toàn bộ các hàm UI đã có) ...

// --- Logic xử lý Theme, Màu Nhấn, Font ---
// ... (Toàn bộ code cho applyTheme, loadSavedTheme, themeButtons, etc.) ...

// --- Logic Xác thực (Authentication) ---
// ... (Toàn bộ code xác thực) ...


// --- Logic quản lý Ghi chú (Notes CRUD & Display) ---

// *** CẬP NHẬT: Xử lý thay đổi Loại Ghi chú trong Editor ***
if (noteTypeSelect) {
    noteTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        if (type === 'todolist') {
            textCodeContentEditor.style.display = 'none';
            todolistEditor.style.display = 'block';
            isCodeCheckbox.checked = false; // Tự động bỏ check "Đây là code"
            isCodeCheckbox.style.display = 'none';
            if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'none';
            languageSelect.style.display = 'none';
            // Nếu đang tạo mới, khởi tạo to-do list rỗng
            if (!noteIdInput.value) { // Chỉ khi tạo mới
                currentTodoItems = [];
                renderTodoEditorItems();
            }
        } else {
            textCodeContentEditor.style.display = 'block';
            todolistEditor.style.display = 'none';
            // Xử lý cho loại "code"
            if (type === 'code') {
                isCodeCheckbox.checked = true; // Tự động check
                isCodeCheckbox.style.display = 'inline-block';
                if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'inline-block';
                languageSelect.style.display = 'inline-block';
            } else { // Loại "text"
                isCodeCheckbox.checked = false;
                isCodeCheckbox.style.display = 'none';
                 if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'none';
                languageSelect.style.display = 'none';
            }
        }
    });
}

// *** THÊM MỚI: Các hàm cho To-do List Editor ***
/** Render các mục to-do trong trình soạn thảo */
function renderTodoEditorItems() {
    if (!todolistItemsContainer) return;
    todolistItemsContainer.innerHTML = ''; // Xóa các mục cũ
    currentTodoItems.forEach((item, index) => {
        const todoItemDiv = document.createElement('div');
        todoItemDiv.classList.add('todo-editor-item');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = item.completed;
        checkbox.addEventListener('change', () => {
            currentTodoItems[index].completed = checkbox.checked;
            // Không cần lưu ngay, sẽ lưu khi nhấn "Lưu Ghi Chú"
        });

        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.value = item.text;
        textInput.placeholder = `Công việc ${index + 1}`;
        textInput.addEventListener('input', () => {
            currentTodoItems[index].text = textInput.value;
        });
        if (item.completed) { // Thêm class nếu đã hoàn thành
            textInput.classList.add('completed');
        }


        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-todo-item-btn');
        deleteBtn.innerHTML = '&times;'; // Ký tự X
        deleteBtn.title = "Xóa mục này";
        deleteBtn.addEventListener('click', () => {
            currentTodoItems.splice(index, 1); // Xóa khỏi mảng
            renderTodoEditorItems(); // Vẽ lại
        });

        todoItemDiv.appendChild(checkbox);
        todoItemDiv.appendChild(textInput);
        todoItemDiv.appendChild(deleteBtn);
        todolistItemsContainer.appendChild(todoItemDiv);
    });
}

/** Thêm một mục to-do mới vào editor */
if (addTodoItemBtn) {
    addTodoItemBtn.addEventListener('click', () => {
        currentTodoItems.push({ text: '', completed: false, id: `temp_${Date.now()}` }); // Tạo ID tạm thời
        renderTodoEditorItems();
        // Focus vào input text của mục mới tạo
        const newItemInputs = todolistItemsContainer.querySelectorAll('.todo-editor-item input[type="text"]');
        if (newItemInputs.length > 0) {
            newItemInputs[newItemInputs.length - 1].focus();
        }
    });
}


// Cập nhật hàm showEditor
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
        noteTagsInput.value = note.tags ? note.tags.join(', ') : '';
        currentNoteId = note.id;

        // Thiết lập loại ghi chú và hiển thị editor tương ứng
        const noteType = note.noteType || (note.isCode ? 'code' : 'text'); // Mặc định nếu không có noteType
        noteTypeSelect.value = noteType;

        if (noteType === 'todolist') {
            textCodeContentEditor.style.display = 'none';
            todolistEditor.style.display = 'block';
            isCodeCheckbox.style.display = 'none';
            if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'none';
            languageSelect.style.display = 'none';
            currentTodoItems = Array.isArray(note.content) ? JSON.parse(JSON.stringify(note.content)) : []; // Sao chép sâu
            renderTodoEditorItems();
        } else if (noteType === 'code') {
            textCodeContentEditor.style.display = 'block';
            todolistEditor.style.display = 'none';
            noteContentInput.value = note.content;
            isCodeCheckbox.checked = true;
            isCodeCheckbox.style.display = 'inline-block';
            if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'inline-block';
            languageSelect.value = note.language || 'plaintext';
            languageSelect.style.display = 'inline-block';
        } else { // text
            textCodeContentEditor.style.display = 'block';
            todolistEditor.style.display = 'none';
            noteContentInput.value = note.content;
            isCodeCheckbox.checked = false;
            isCodeCheckbox.style.display = 'none';
            if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'none';
            languageSelect.style.display = 'none';
        }

    } else { // Tạo mới
        editorTitle.textContent = "Tạo Ghi chú Mới";
        clearEditorFields(); // Sẽ reset cả noteTypeSelect về text
        noteIdInput.value = '';
        currentNoteId = null;
        noteTypeSelect.value = 'text'; // Mặc định là text
        textCodeContentEditor.style.display = 'block';
        todolistEditor.style.display = 'none';
        isCodeCheckbox.style.display = 'none';
        if (noteIsCodeLabel) noteIsCodeLabel.style.display = 'none';
        languageSelect.style.display = 'none';
        currentTodoItems = []; // Reset mảng to-do
    }
    noteTitleInput.focus();
    if (contentArea) contentArea.scrollTop = 0;
}


// Cập nhật hàm saveNoteBtn
saveNoteBtn.addEventListener('click', async () => {
    if (!currentUser) return;

    const id = noteIdInput.value;
    const title = noteTitleInput.value.trim();
    const tags = [...new Set(noteTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag))];
    const noteType = noteTypeSelect.value;

    let contentToSave;
    let isCodeForDB = false;
    let languageForDB = 'plaintext';

    if (noteType === 'todolist') {
        // Lấy dữ liệu từ currentTodoItems, đảm bảo mỗi item có id duy nhất nếu chưa có
        contentToSave = currentTodoItems.map(item => ({
            text: item.text.trim(),
            completed: item.completed,
            id: item.id.startsWith('temp_') ? `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : item.id
        })).filter(item => item.text); // Lọc bỏ các mục rỗng
        if (contentToSave.length === 0 && !title) { // Nếu không có tiêu đề và không có mục nào
             editorError.textContent = "Tiêu đề và ít nhất một mục công việc không được để trống!";
             alert("Tiêu đề và ít nhất một mục công việc không được để trống!");
             return;
        }
    } else if (noteType === 'code') {
        contentToSave = noteContentInput.value.trim();
        isCodeForDB = true;
        languageForDB = languageSelect.value;
        if (!title || !contentToSave) {
            editorError.textContent = "Tiêu đề và Nội dung code không được để trống!";
            alert("Tiêu đề và Nội dung code không được để trống!");
            return;
        }
    } else { // text
        contentToSave = noteContentInput.value.trim();
        if (!title || !contentToSave) {
            editorError.textContent = "Tiêu đề và Nội dung không được để trống!";
            alert("Tiêu đề và Nội dung không được để trống!");
            return;
        }
    }

    editorError.textContent = '';
    saveNoteBtn.disabled = true;
    saveNoteBtn.textContent = 'Đang lưu...';

    const noteData = {
        title,
        content: contentToSave, // content có thể là string hoặc array
        tags,
        noteType, // Lưu loại ghi chú
        isCode: isCodeForDB, // Chỉ đúng nếu noteType là 'code'
        language: languageForDB, // Chỉ có ý nghĩa nếu isCode là true
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

// Cập nhật hàm displayNoteDetailContent
function displayNoteDetailContent(note) {
    if (!note) return;
    noteDetailTitle.textContent = note.title;

    // Xử lý nút ghim
    if (pinNoteDetailBtn) {
        pinNoteDetailBtn.classList.toggle('pinned', !!note.isPinned);
        pinNoteDetailBtn.title = note.isPinned ? "Bỏ ghim ghi chú" : "Ghim ghi chú";
        const svgIcon = pinNoteDetailBtn.querySelector('svg');
        if (svgIcon) {
            const pathElement = svgIcon.querySelector('path');
            if(pathElement){
                 pathElement.setAttribute('d', note.isPinned ? pinAngleFillSVGPath : pinAngleSVGPath);
            }
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

    // Ẩn tất cả các khu vực nội dung trước
    noteDetailContent.style.display = 'none';
    noteDetailCode.style.display = 'none';
    noteDetailTodolist.style.display = 'none';
    copyCodeBtn.style.display = 'none';

    // Hiển thị nội dung dựa trên noteType
    if (note.noteType === 'todolist') {
        noteDetailTodolist.innerHTML = ''; // Xóa các mục cũ
        if (Array.isArray(note.content) && note.content.length > 0) {
            note.content.forEach(item => {
                const todoItemDiv = document.createElement('div');
                todoItemDiv.classList.add('todo-item');

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.checked = item.completed;
                checkbox.dataset.itemId = item.id; // Lưu id của task
                checkbox.addEventListener('change', async (e) => {
                    const itemId = e.target.dataset.itemId;
                    const newCompletedStatus = e.target.checked;
                    // Cập nhật trạng thái trong Firestore
                    const noteRef = doc(db, "notes", currentNoteId);
                    const updatedContent = notesCache[currentNoteId].content.map(task =>
                        task.id === itemId ? { ...task, completed: newCompletedStatus } : task
                    );
                    try {
                        await updateDoc(noteRef, { content: updatedContent, updatedAt: Timestamp.now() });
                        // Cache sẽ được cập nhật bởi onSnapshot
                    } catch (error) {
                        console.error("Error updating todo item status:", error);
                        // Hoàn lại trạng thái checkbox nếu lỗi
                        e.target.checked = !newCompletedStatus;
                        alert("Lỗi cập nhật công việc.");
                    }
                });

                const label = document.createElement('label');
                label.textContent = item.text;
                if (item.completed) {
                    label.classList.add('completed'); // Thêm class để CSS gạch ngang
                }
                // Cho phép click vào label để toggle checkbox
                label.addEventListener('click', () => checkbox.click());


                todoItemDiv.appendChild(checkbox);
                todoItemDiv.appendChild(label);
                noteDetailTodolist.appendChild(todoItemDiv);
            });
        } else {
            noteDetailTodolist.innerHTML = '<p><em>Chưa có mục công việc nào.</em></p>';
        }
        noteDetailTodolist.style.display = 'block';
    } else if (note.noteType === 'code' || note.isCode) { // isCode để tương thích ngược
        codeBlock.textContent = note.content;
        codeBlock.className = `language-${note.language || 'plaintext'}`;
        noteDetailCode.style.display = 'block';
        copyCodeBtn.style.display = 'inline-block';
        if (window.Prism) Prism.highlightElement(codeBlock);
    } else { // text
        noteDetailContent.innerHTML = linkify(note.content);
        noteDetailContent.style.display = 'block';
    }
}

// Cập nhật renderNotesList để hiển thị tóm tắt to-do list
function renderNotesList(notesFromCache) {
    notesListContainer.innerHTML = '';
    const searchTermLower = currentSearchTerm.toLowerCase();
    let notesToRender = notesFromCache.filter(note => {
        const tagMatch = !activeTag || (note.tags && note.tags.includes(activeTag));
        if (!tagMatch) return false;
        if (searchTermLower) {
            const titleMatch = note.title?.toLowerCase().includes(searchTermLower);
            let contentForSearch = '';
            if (note.noteType === 'todolist' && Array.isArray(note.content)) {
                contentForSearch = note.content.map(item => item.text).join(' ');
            } else if (typeof note.content === 'string') {
                contentForSearch = note.content;
            }
            const contentMatch = contentForSearch.toLowerCase().includes(searchTermLower);
            const tagsMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchTermLower));
            return titleMatch || contentMatch || tagsMatch;
        }
        return true;
    });

    if (notesToRender.length === 0) {
        let message = 'Chưa có ghi chú nào.';
        // ... (logic message giữ nguyên)
        notesListContainer.innerHTML = `<p>${message}</p>`;
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item');
        noteElement.dataset.id = note.id;

        const pinIcon = document.createElement('span');
        pinIcon.classList.add('pin-icon');
        pinIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin-angle${note.isPinned ? '-fill' : ''}" viewBox="0 0 16 16"><path d="${note.isPinned ? pinAngleFillSVGPath : pinAngleSVGPath}"/></svg>`;
        if (note.isPinned) pinIcon.classList.add('pinned');
        pinIcon.title = note.isPinned ? "Bỏ ghim" : "Ghim ghi chú";
        pinIcon.addEventListener('click', (e) => { e.stopPropagation(); togglePinStatus(note.id); });
        noteElement.appendChild(pinIcon);

        const titleElement = document.createElement('h3');
        titleElement.innerHTML = highlightText(note.title || "Không có tiêu đề", currentSearchTerm);

        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        if (note.noteType === 'todolist' && Array.isArray(note.content)) {
            const completedCount = note.content.filter(item => item.completed).length;
            const totalCount = note.content.length;
            let previewText = `To-do: ${completedCount}/${totalCount} hoàn thành. `;
            // Hiển thị một vài mục đầu tiên
            note.content.slice(0, 2).forEach(item => { // Hiển thị tối đa 2 mục
                previewText += `[${item.completed ? 'x' : ' '}] ${item.text.substring(0, 20)}${item.text.length > 20 ? '...' : ''} `;
            });
            contentPreview.innerHTML = highlightText(previewText, currentSearchTerm);

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


// (Các hàm còn lại: renderTagsList, togglePinStatus, Thùng rác, Gợi ý Tag, Scroll, Tìm kiếm, Sắp xếp, Khởi chạy giữ nguyên)
// ...
// --- Khởi chạy ---
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTheme();
    loadSavedAccentColor();
    loadSavedContentFont();
});

console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");
