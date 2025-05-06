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

// *** THÊM MỚI: Tham chiếu đến ô tìm kiếm ***
const searchInput = document.getElementById('search-input');

const tagsListContainer = document.getElementById('tags-list-container');
const addNoteBtn = document.getElementById('add-note-btn');

const notesGridView = document.getElementById('notes-grid-view');
const noteDetailView = document.getElementById('note-detail-view');
const noteEditorView = document.getElementById('note-editor-view');

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

const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id-input');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteTagsInput = document.getElementById('note-tags-input');
const isCodeCheckbox = document.getElementById('note-is-code-checkbox');
const languageSelect = document.getElementById('note-language-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editorError = document.getElementById('editor-error');

const scrollToTopBtn = document.getElementById('scrollToTopBtn');
const contentArea = document.querySelector('.content-area');

// --- Biến trạng thái toàn cục ---
let currentUser = null;
let currentNoteId = null;
let notesUnsubscribe = null;
let activeTag = null;
let notesCache = {};
let currentSearchTerm = ''; // *** THÊM MỚI: Lưu trữ từ khóa tìm kiếm hiện tại ***

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
    tagsListContainer.innerHTML = '';
    if (notesUnsubscribe) {
        notesUnsubscribe();
        notesUnsubscribe = null;
    }
    notesCache = {};
    activeTag = null;
    currentNoteId = null;
    currentSearchTerm = ''; // Reset search term
    if(searchInput) searchInput.value = ''; // Clear search input
    if (scrollToTopBtn) scrollToTopBtn.style.display = 'none';
    loginForm.style.display = 'block';
    signupForm.style.display = 'none';
    loginError.textContent = '';
    signupError.textContent = '';
}

function showGridView() {
    notesGridView.style.display = 'block';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null;
    if (activeTag) {
        activeTagDisplay.textContent = `(Tag: ${activeTag})`;
    } else {
        activeTagDisplay.textContent = '';
    }
    if (contentArea) contentArea.scrollTop = 0;
    // Render lại list khi quay về grid để đảm bảo filter đúng
    renderNotesList(Object.values(notesCache));
}

function showEditor(note = null) {
    notesGridView.style.display = 'none';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'block';
    editorError.textContent = '';

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
        showGridView();
        return;
    }
    notesGridView.style.display = 'none';
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
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text;
    let escapedText = tempDiv.innerHTML;
    escapedText = escapedText.replace(urlRegex, (url) => {
         let originalUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
         return `<a href="${originalUrl}" target="_blank" rel="noopener noreferrer">${originalUrl}</a>`;
    });
    return escapedText.replace(/\n/g, '<br>');
}


// --- Logic Xác thực (Authentication) ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user.uid, user.email);
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        showApp();
        loadNotesAndTags();
        showGridView();
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
    showGridView();
});

backToGridBtn.addEventListener('click', () => {
    showGridView();
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
        return;
    }
    editorError.textContent = '';
    saveNoteBtn.disabled = true;
    saveNoteBtn.textContent = 'Đang lưu...';

    const noteData = {
        title, content, tags, isCode, language,
        userId: currentUser.uid,
        updatedAt: Timestamp.now()
    };

    try {
        let savedNoteId = id;
        if (id) {
            console.log("Updating note with ID:", id);
            const noteRef = doc(db, "notes", id);
            await updateDoc(noteRef, noteData);
            console.log("Note updated successfully");
            notesCache[id] = { ...notesCache[id], ...noteData, id };
        } else {
            console.log("Adding new note");
            noteData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, "notes"), noteData);
            console.log("Note added with ID:", docRef.id);
            savedNoteId = docRef.id;
            notesCache[savedNoteId] = { ...noteData, id: savedNoteId };
        }
        clearEditor();
        showGridView(); // Quay lại grid sau khi lưu

    } catch (error) {
        console.error("Error saving note: ", error);
        editorError.textContent = `Lỗi lưu ghi chú: ${error.message}`;
    } finally {
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = 'Lưu Ghi Chú';
    }
});

editNoteBtn.addEventListener('click', () => {
    if (!currentNoteId || !notesCache[currentNoteId]) {
        alert("Không tìm thấy dữ liệu ghi chú để sửa.");
        showGridView();
        return;
    };
    const noteToEdit = notesCache[currentNoteId];
    showEditor(noteToEdit);
});

deleteNoteBtn.addEventListener('click', async () => {
     if (!currentNoteId) return;

     const noteTitle = notesCache[currentNoteId]?.title || "ghi chú này";
     if (confirm(`Bạn có chắc chắn muốn xóa ghi chú "${noteTitle}" không?`)) {
        console.log("Deleting note ID:", currentNoteId);
        const idToDelete = currentNoteId;
        currentNoteId = null;
        try {
            const noteRef = doc(db, "notes", idToDelete);
            await deleteDoc(noteRef);
            console.log("Note deleted successfully");
            delete notesCache[idToDelete];
            showGridView(); // Quay lại grid sau khi xóa
        } catch (error) {
            console.error("Error deleting note: ", error);
            alert(`Lỗi xóa ghi chú: ${error.message}`);
            currentNoteId = idToDelete;
        }
     }
});

copyCodeBtn.addEventListener('click', () => {
    const codeToCopy = codeBlock.textContent;
    if (codeToCopy) {
        navigator.clipboard.writeText(codeToCopy)
            .then(() => {
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
    console.log("Setting up Firestore listener for user:", currentUser.uid);

    const notesQuery = query(
        collection(db, "notes"),
        where("userId", "==", currentUser.uid),
        orderBy("updatedAt", "desc")
    );

    if (notesUnsubscribe) {
        console.log("Unsubscribing previous listener.");
        notesUnsubscribe();
    }

    notesUnsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
        console.log("Firestore data received (onSnapshot)");
        const allNotes = [];
        const newNotesCache = {};

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allNotes.push(note);
            newNotesCache[note.id] = note;
        });

        console.log("Notes data changed, updating cache and UI.");
        notesCache = newNotesCache;
        // *** Gọi renderNotesList với dữ liệu mới nhất từ cache ***
        renderNotesList(Object.values(notesCache));
        renderTagsList(allNotes); // Render lại tags (có thể tối ưu sau)

        if (currentNoteId && !notesCache[currentNoteId]) {
            console.log("Current note removed, showing grid view.");
            showGridView();
        }

    }, (error) => {
        console.error("Error listening to Firestore: ", error);
        notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`;
    });
}

/**
 * Hiển thị danh sách ghi chú lên Grid View, áp dụng bộ lọc tag và tìm kiếm.
 * @param {Array<object>} allNotes - Mảng tất cả ghi chú từ cache.
 */
function renderNotesList(allNotes) {
    notesListContainer.innerHTML = ''; // Xóa grid cũ

    // *** Áp dụng bộ lọc tag và tìm kiếm ***
    const searchTermLower = currentSearchTerm.toLowerCase(); // Chuyển từ khóa tìm kiếm sang chữ thường

    const notesToRender = allNotes.filter(note => {
        // 1. Lọc theo tag (nếu có)
        const tagMatch = !activeTag || (note.tags && note.tags.includes(activeTag));
        if (!tagMatch) return false; // Nếu không khớp tag, bỏ qua

        // 2. Lọc theo từ khóa tìm kiếm (nếu có)
        if (searchTermLower) {
            const titleMatch = note.title?.toLowerCase().includes(searchTermLower);
            const contentMatch = note.content?.toLowerCase().includes(searchTermLower);
            // Tìm trong mảng tags
            const tagsMatch = note.tags?.some(tag => tag.toLowerCase().includes(searchTermLower));
            // Chỉ cần khớp một trong các trường là được
            return titleMatch || contentMatch || tagsMatch;
        }

        // Nếu không có từ khóa tìm kiếm, chỉ cần khớp tag là đủ
        return true;
    });


    if (notesToRender.length === 0) {
        let message = '';
        if (activeTag && currentSearchTerm) {
            message = `Không có ghi chú nào với tag "${activeTag}" khớp với "${currentSearchTerm}".`;
        } else if (activeTag) {
            message = `Không có ghi chú nào với tag "${activeTag}".`;
        } else if (currentSearchTerm) {
            message = `Không có ghi chú nào khớp với "${currentSearchTerm}".`;
        } else {
            message = 'Chưa có ghi chú nào. Hãy tạo ghi chú mới!';
        }
        notesListContainer.innerHTML = `<p>${message}</p>`;
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item');
        noteElement.dataset.id = note.id;

        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title || "Không có tiêu đề";

        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        contentPreview.textContent = note.content || '';

        const dateElement = document.createElement('div');
        dateElement.classList.add('note-item-date');
        if (note.updatedAt && note.updatedAt.toDate) {
             dateElement.textContent = note.updatedAt.toDate().toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
             });
        } else {
             dateElement.textContent = "";
        }

        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentPreview);
        noteElement.appendChild(dateElement);

        noteElement.addEventListener('click', () => {
            showDetailView(note);
        });

        notesListContainer.appendChild(noteElement);
    });
}


function renderTagsList(notes) {
    const allTags = new Set();
    notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => allTags.add(tag));
        }
    });

    tagsListContainer.innerHTML = '';

    const allTagElement = document.createElement('span');
    allTagElement.classList.add('tag-item');
    allTagElement.textContent = 'Tất cả';
    if (activeTag === null) {
        allTagElement.classList.add('active');
    }
    allTagElement.addEventListener('click', () => {
        if (activeTag !== null) {
            activeTag = null;
            setActiveTagItem(null);
            renderNotesList(Object.values(notesCache)); // Render lại grid với filter mới
            showGridView();
        }
    });
    tagsListContainer.appendChild(allTagElement);

    [...allTags].sort().forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag-item');
        tagElement.textContent = tag;
        tagElement.dataset.tag = tag;
        if (tag === activeTag) {
            tagElement.classList.add('active');
        }

        tagElement.addEventListener('click', () => {
            if (activeTag !== tag) {
                activeTag = tag;
                setActiveTagItem(tag);
                renderNotesList(Object.values(notesCache)); // Render lại grid với filter mới
                showGridView();
            }
        });

        tagsListContainer.appendChild(tagElement);
    });

     if (allTags.size === 0) {
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
        if (window.Prism) {
            Prism.highlightElement(codeBlock);
        }
    } else {
        noteDetailCode.style.display = 'none';
        copyCodeBtn.style.display = 'none';
        noteDetailContent.innerHTML = linkify(note.content);
        noteDetailContent.style.display = 'block';
    }
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

// --- *** THÊM MỚI: Logic tìm kiếm *** ---
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.trim(); // Cập nhật biến tìm kiếm toàn cục
        // Render lại danh sách ghi chú với từ khóa tìm kiếm mới
        // Dùng dữ liệu từ cache để lọc ngay lập tức
        renderNotesList(Object.values(notesCache));
        // Không cần gọi showGridView() vì người dùng vẫn đang ở grid view
    });
} else {
    console.warn("Search input element not found.");
}


// --- Khởi chạy ---
console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");

