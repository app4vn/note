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
// (Thêm các tham chiếu mới và cập nhật/xóa các tham chiếu cũ nếu cần)
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

const tagsListContainer = document.getElementById('tags-list-container');
const addNoteBtn = document.getElementById('add-note-btn');

// Tham chiếu đến các view chính trong content-area
const notesGridView = document.getElementById('notes-grid-view');
const noteDetailView = document.getElementById('note-detail-view');
const noteEditorView = document.getElementById('note-editor-view');

// Các phần tử trong Grid View
const notesListContainer = document.getElementById('notes-list-container'); // Container chứa các thẻ grid
const activeTagDisplay = document.getElementById('active-tag-display'); // Hiển thị tag đang lọc

// Các phần tử trong Detail View
const backToGridBtn = document.getElementById('back-to-grid-btn'); // Nút quay lại lưới
const noteDetailTitle = document.getElementById('note-detail-title');
const noteDetailTags = document.getElementById('note-detail-tags');
const noteDetailContent = document.getElementById('note-detail-content');
const noteDetailCode = document.getElementById('note-detail-code');
const codeBlock = noteDetailCode.querySelector('code');
const copyCodeBtn = document.getElementById('copy-code-btn');
const editNoteBtn = document.getElementById('edit-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');

// Các phần tử trong Editor View
const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id-input');
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteTagsInput = document.getElementById('note-tags-input');
const isCodeCheckbox = document.getElementById('note-is-code-checkbox');
const languageSelect = document.getElementById('note-language-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn'); // Nút hủy trong editor
const editorError = document.getElementById('editor-error');


// --- Biến trạng thái toàn cục ---
let currentUser = null;
let currentNoteId = null; // ID của ghi chú đang được xem chi tiết hoặc sửa
let notesUnsubscribe = null;
let activeTag = null;
let notesCache = {};

// --- Hàm trợ giúp quản lý giao diện (UI Helpers) ---

/** Hiển thị giao diện ứng dụng chính, ẩn khu vực đăng nhập */
function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
}

/** Hiển thị khu vực đăng nhập/đăng ký, ẩn ứng dụng chính */
function showAuth() {
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    currentUser = null;
    // clearNoteDisplay(); // Không cần nữa vì grid sẽ tự render lại
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
}

/** Hiển thị Grid View, ẩn các view khác */
function showGridView() {
    notesGridView.style.display = 'block';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'none';
    currentNoteId = null; // Không có note nào đang được chọn khi ở grid view
    // Cập nhật tiêu đề grid view dựa trên activeTag
    if (activeTag) {
        activeTagDisplay.textContent = `(Tag: ${activeTag})`;
    } else {
        activeTagDisplay.textContent = ''; // Xóa hiển thị tag nếu xem tất cả
    }
    // Render lại danh sách ghi chú (có thể không cần nếu onSnapshot xử lý tốt)
    // renderNotesList(Object.values(notesCache));
}

/**
 * Hiển thị form soạn thảo/sửa ghi chú.
 * @param {object | null} note - Dữ liệu ghi chú để sửa (nếu có). Null nếu tạo mới.
 */
function showEditor(note = null) {
    notesGridView.style.display = 'none'; // Ẩn grid
    noteDetailView.style.display = 'none'; // Ẩn detail
    noteEditorView.style.display = 'block'; // Hiện editor
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
        currentNoteId = note.id; // Lưu ID đang sửa
    } else { // Tạo mới
        editorTitle.textContent = "Tạo Ghi chú Mới";
        clearEditorFields();
        noteIdInput.value = '';
        currentNoteId = null; // Đảm bảo không có ID khi tạo mới
    }
    noteTitleInput.focus();
}

/** Hiển thị khu vực xem chi tiết ghi chú */
function showDetailView(note) {
    if (!note || !note.id) {
        console.warn("Attempted to show detail view with invalid note data.");
        showGridView(); // Quay lại grid nếu dữ liệu không hợp lệ
        return;
    }
    notesGridView.style.display = 'none';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'block';
    currentNoteId = note.id; // Lưu ID đang xem
    displayNoteDetailContent(note); // Hàm mới để chỉ hiển thị nội dung chi tiết
}

/** Xóa trắng các trường trong form editor */
function clearEditorFields() {
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteTagsInput.value = '';
    isCodeCheckbox.checked = false;
    languageSelect.value = 'plaintext';
    languageSelect.style.display = 'none';
    editorError.textContent = '';
}

/** Xóa toàn bộ trạng thái của editor */
function clearEditor() {
    clearEditorFields();
    noteIdInput.value = '';
    // currentNoteId = null; // Reset khi hủy hoặc lưu xong
}

/**
 * Đánh dấu tag đang được chọn trong danh sách sidebar.
 * @param {string | null} tagName - Tên tag cần highlight, hoặc null cho nút 'Tất cả'.
 */
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

/**
 * Hàm tìm và thay thế URL trong text bằng thẻ <a>. (Giữ nguyên)
 * @param {string} text - Đoạn văn bản đầu vào.
 * @returns {string} - Chuỗi HTML với các URL đã được chuyển thành link.
 */
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
// (Giữ nguyên)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user.uid, user.email);
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        showApp();
        loadNotesAndTags(); // Tải dữ liệu
        showGridView(); // Hiển thị Grid View ban đầu
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


// --- Logic quản lý Ghi chú (Notes CRUD & Display) ---

// Hiện/ẩn ô chọn ngôn ngữ
isCodeCheckbox.addEventListener('change', (e) => {
    languageSelect.style.display = e.target.checked ? 'inline-block' : 'none';
    if (!e.target.checked) {
        languageSelect.value = 'plaintext';
    }
});

// Nút "Thêm Ghi Chú Mới" -> Hiển thị Editor trống
addNoteBtn.addEventListener('click', () => {
    showEditor(); // Gọi không có tham số để tạo mới
});

// Nút "Hủy" trong Editor -> Quay lại Grid View
cancelEditBtn.addEventListener('click', () => {
    clearEditor();
    showGridView(); // Luôn quay lại grid view khi hủy
});

// *** THAY ĐỔI: Nút "Quay lại danh sách" từ Detail View -> Quay lại Grid View ***
backToGridBtn.addEventListener('click', () => {
    showGridView();
});


// Nút "Lưu Ghi Chú"
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
        let savedNoteId = id; // Lưu lại ID để hiển thị sau khi lưu
        if (id) {
            // Sửa
            console.log("Updating note with ID:", id);
            const noteRef = doc(db, "notes", id);
            await updateDoc(noteRef, noteData);
            console.log("Note updated successfully");
            notesCache[id] = { ...notesCache[id], ...noteData, id };
        } else {
            // Tạo mới
            console.log("Adding new note");
            noteData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, "notes"), noteData);
            console.log("Note added with ID:", docRef.id);
            savedNoteId = docRef.id; // Lấy ID mới tạo
            notesCache[savedNoteId] = { ...noteData, id: savedNoteId };
        }
        // *** THAY ĐỔI: Sau khi lưu thành công, quay lại Grid View ***
        clearEditor();
        showGridView();
        // Không cần hiển thị chi tiết ngay sau khi lưu nữa
        // currentNoteId = savedNoteId;
        // displayNoteDetailContent(notesCache[savedNoteId]);
        // showDetailView(notesCache[savedNoteId]);

    } catch (error) {
        console.error("Error saving note: ", error);
        editorError.textContent = `Lỗi lưu ghi chú: ${error.message}`;
    } finally {
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = 'Lưu Ghi Chú';
    }
});

// Nút "Sửa" trong Detail View -> Hiển thị Editor với dữ liệu hiện tại
editNoteBtn.addEventListener('click', () => {
    if (!currentNoteId || !notesCache[currentNoteId]) {
        alert("Không tìm thấy dữ liệu ghi chú để sửa.");
        showGridView(); // Quay về grid nếu có lỗi
        return;
    };
    const noteToEdit = notesCache[currentNoteId];
    showEditor(noteToEdit); // Chuyển sang màn hình editor
});

// Nút "Xóa" trong Detail View
deleteNoteBtn.addEventListener('click', async () => {
     if (!currentNoteId) return; // Phải có note đang xem

     const noteTitle = notesCache[currentNoteId]?.title || "ghi chú này";
     if (confirm(`Bạn có chắc chắn muốn xóa ghi chú "${noteTitle}" không?`)) {
        console.log("Deleting note ID:", currentNoteId);
        const idToDelete = currentNoteId; // Lưu lại ID trước khi reset
        currentNoteId = null; // Reset ID đang xem
        try {
            const noteRef = doc(db, "notes", idToDelete);
            await deleteDoc(noteRef);
            console.log("Note deleted successfully");
            delete notesCache[idToDelete]; // Xóa khỏi cache
            // *** THAY ĐỔI: Quay lại Grid View sau khi xóa ***
            showGridView();
            // onSnapshot sẽ tự động cập nhật danh sách trong grid view
        } catch (error) {
            console.error("Error deleting note: ", error);
            alert(`Lỗi xóa ghi chú: ${error.message}`);
            currentNoteId = idToDelete; // Khôi phục ID nếu xóa lỗi
        }
     }
});

// Nút "Copy Code" (Giữ nguyên)
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

/** Tải danh sách ghi chú và tags, đồng thời lắng nghe thay đổi real-time */
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
        const newNotesCache = {}; // Dùng cache mới để so sánh

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allNotes.push(note);
            newNotesCache[note.id] = note;
        });

        // Chỉ cập nhật cache và render lại nếu có thay đổi thực sự (tối ưu hóa)
        // (Có thể bỏ qua bước kiểm tra này nếu muốn đơn giản)
        // if (JSON.stringify(notesCache) !== JSON.stringify(newNotesCache)) {
            console.log("Notes data changed, updating cache and UI.");
            notesCache = newNotesCache; // Cập nhật cache chính
            renderNotesList(allNotes); // Render lại grid
            renderTagsList(allNotes); // Render lại tags
        // } else {
        //     console.log("Notes data unchanged.");
        // }

        // Xử lý nếu note đang xem chi tiết/sửa bị xóa
        if (currentNoteId && !notesCache[currentNoteId]) {
            console.log("Current note removed, showing grid view.");
            showGridView(); // Nếu note đang xem/sửa bị xóa, quay về grid
        }
        // Không cần cập nhật detail view ở đây nữa vì người dùng sẽ quay lại grid

    }, (error) => {
        console.error("Error listening to Firestore: ", error);
        notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`;
    });
}

/**
 * Hiển thị danh sách ghi chú lên Grid View.
 * @param {Array<object>} notes - Mảng các đối tượng ghi chú.
 */
function renderNotesList(notes) {
    notesListContainer.innerHTML = ''; // Xóa grid cũ

    const notesToRender = activeTag
        ? notes.filter(note => note.tags && note.tags.includes(activeTag))
        : notes;

    if (notesToRender.length === 0) {
        notesListContainer.innerHTML = activeTag
            ? `<p>Không có ghi chú nào với tag "${activeTag}".</p>`
            : '<p>Chưa có ghi chú nào. Hãy tạo ghi chú mới!</p>';
        return;
    }

    // Tạo thẻ ghi chú cho mỗi note
    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item');
        noteElement.dataset.id = note.id; // Lưu ID

        // Tiêu đề (giới hạn 2 dòng - CSS xử lý)
        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title || "Không có tiêu đề";

        // Nội dung xem trước (giới hạn 4 dòng - CSS xử lý)
        const contentPreview = document.createElement('div');
        contentPreview.classList.add('note-item-content-preview');
        // Lấy text thuần túy từ nội dung để xem trước, tránh hiển thị HTML/code
        contentPreview.textContent = note.content || '';

        // Ngày cập nhật
        const dateElement = document.createElement('div'); // Đổi thành div
        dateElement.classList.add('note-item-date'); // Thêm class
        if (note.updatedAt && note.updatedAt.toDate) {
             dateElement.textContent = note.updatedAt.toDate().toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
             });
        } else {
             dateElement.textContent = ""; // Để trống nếu không có ngày
        }

        // Thêm các phần tử vào thẻ note
        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentPreview);
        noteElement.appendChild(dateElement);

        // *** THAY ĐỔI: Sự kiện click trên thẻ note -> hiển thị chi tiết ***
        noteElement.addEventListener('click', () => {
            showDetailView(note); // Gọi hàm hiển thị chi tiết với dữ liệu note này
        });

        notesListContainer.appendChild(noteElement);
    });
}

/**
 * Hiển thị danh sách các tags duy nhất lên sidebar.
 * @param {Array<object>} notes - Mảng tất cả ghi chú.
 */
function renderTagsList(notes) {
    const allTags = new Set();
    notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => allTags.add(tag));
        }
    });

    tagsListContainer.innerHTML = '';

    // Nút "Tất cả"
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
            showGridView(); // Hiển thị lại grid view (onSnapshot sẽ render lại list)
            // Cập nhật tiêu đề grid
             activeTagDisplay.textContent = '';
        }
    });
    tagsListContainer.appendChild(allTagElement);

    // Các tag khác
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
                showGridView(); // Hiển thị lại grid view (onSnapshot sẽ render lại list)
                 // Cập nhật tiêu đề grid
                 activeTagDisplay.textContent = `(Tag: ${tag})`;
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

/**
 * Chỉ hiển thị nội dung chi tiết của ghi chú (không chuyển view).
 * Hàm này được gọi bởi showDetailView và khi dữ liệu onSnapshot thay đổi.
 * @param {object} note - Đối tượng ghi chú cần hiển thị.
 */
function displayNoteDetailContent(note) {
    if (!note) return; // Thoát nếu không có note

    // Hiển thị tiêu đề
    noteDetailTitle.textContent = note.title;

    // Hiển thị tags
    noteDetailTags.innerHTML = ''; // Xóa tag cũ
    if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag');
            tagElement.textContent = tag;
            noteDetailTags.appendChild(tagElement);
        });
    }

    // Hiển thị nội dung (code hoặc text)
    if (note.isCode) {
        noteDetailContent.style.display = 'none';
        codeBlock.textContent = note.content;
        codeBlock.className = `language-${note.language || 'plaintext'}`;
        noteDetailCode.style.display = 'block';
        copyCodeBtn.style.display = 'inline-block';
        if (window.Prism) {
            Prism.highlightElement(codeBlock); // Highlight lại code
        }
    } else {
        noteDetailCode.style.display = 'none';
        copyCodeBtn.style.display = 'none';
        noteDetailContent.innerHTML = linkify(note.content); // Xử lý link
        noteDetailContent.style.display = 'block';
    }
}

// --- Khởi chạy ---
console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");

