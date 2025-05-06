// script.js

// Import các hàm cần thiết từ Firebase SDK
// Sử dụng cú pháp module ES6
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged, // Theo dõi trạng thái đăng nhập
    createUserWithEmailAndPassword, // Đăng ký
    signInWithEmailAndPassword, // Đăng nhập
    signOut // Đăng xuất
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection, // Tham chiếu đến một collection
    addDoc, // Thêm document mới
    query, // Tạo truy vấn
    where, // Lọc theo điều kiện
    orderBy, // Sắp xếp kết quả
    onSnapshot, // Lắng nghe thay đổi real-time
    doc, // Tham chiếu đến một document cụ thể bằng ID
    getDoc, // Lấy dữ liệu một document (ít dùng khi có onSnapshot)
    updateDoc, // Cập nhật document
    deleteDoc, // Xóa document
    Timestamp // Lưu trữ ngày giờ chuẩn của Firebase
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Cấu hình Firebase của bạn ---
// Lấy từ thông tin bạn cung cấp
const firebaseConfig = {
    apiKey: "AIzaSyAe5UOFul4ce8vQN66Bpcktj4oiV19ht-I",
    authDomain: "ghichu-198277.firebaseapp.com",
    projectId: "ghichu-198277",
    storageBucket: "ghichu-198277.appspot.com", // Đảm bảo đúng đuôi .appspot.com
    messagingSenderId: "1001550945488",
    appId: "1:1001550945488:web:bbda01f5a11f15a81192d5"
};

// --- Khởi tạo Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Dịch vụ xác thực
const db = getFirestore(app); // Dịch vụ Firestore Database

// --- Lấy tham chiếu đến các phần tử DOM quan trọng ---
// Sử dụng const vì các tham chiếu này không thay đổi
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email');
const loginError = document.getElementById('login-error');
const signupError = document.getElementById('signup-error');

const notesListContainer = document.getElementById('notes-list-container');
const tagsListContainer = document.getElementById('tags-list-container');
const addNoteBtn = document.getElementById('add-note-btn');
const noteDetailPlaceholder = document.getElementById('note-detail-placeholder');
const noteDetailView = document.getElementById('note-detail-view');
const noteEditorView = document.getElementById('note-editor-view');
const noteDetailTitle = document.getElementById('note-detail-title');
const noteDetailTags = document.getElementById('note-detail-tags');
const noteDetailContent = document.getElementById('note-detail-content'); // Cho text thường
const noteDetailCode = document.getElementById('note-detail-code'); // Thẻ <pre> cho code
const codeBlock = noteDetailCode.querySelector('code'); // Thẻ <code> bên trong <pre>
const copyCodeBtn = document.getElementById('copy-code-btn');

const editorTitle = document.getElementById('editor-title');
const noteIdInput = document.getElementById('note-id-input'); // Input ẩn lưu ID khi sửa
const noteTitleInput = document.getElementById('note-title-input');
const noteContentInput = document.getElementById('note-content-input');
const noteTagsInput = document.getElementById('note-tags-input');
const isCodeCheckbox = document.getElementById('note-is-code-checkbox');
const languageSelect = document.getElementById('note-language-select');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const editorError = document.getElementById('editor-error');
const editNoteBtn = document.getElementById('edit-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');

// --- Biến trạng thái toàn cục ---
let currentUser = null; // Lưu thông tin người dùng đang đăng nhập
let currentNoteId = null; // Lưu ID của ghi chú đang được chọn/xem/sửa
let notesUnsubscribe = null; // Hàm để hủy lắng nghe thay đổi notes (quan trọng để tránh memory leak)
let activeTag = null; // Tag đang được dùng để lọc (null = hiển thị tất cả)
let notesCache = {}; // Lưu trữ dữ liệu các ghi chú đã tải để truy cập nhanh

// --- Hàm trợ giúp quản lý giao diện (UI Helpers) ---

/** Hiển thị giao diện ứng dụng chính, ẩn khu vực đăng nhập */
function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex'; // Layout chính dùng flex
}

/** Hiển thị khu vực đăng nhập/đăng ký, ẩn ứng dụng chính */
function showAuth() {
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    currentUser = null; // Reset user khi logout
    clearNoteDisplay(); // Xóa dữ liệu chi tiết note
    clearEditor(); // Xóa dữ liệu editor
    notesListContainer.innerHTML = '<p>Vui lòng đăng nhập.</p>'; // Reset danh sách note
    tagsListContainer.innerHTML = ''; // Reset danh sách tag
    // Hủy lắng nghe Firestore khi logout để giải phóng tài nguyên
    if (notesUnsubscribe) {
        notesUnsubscribe();
        notesUnsubscribe = null;
    }
    notesCache = {}; // Xóa cache ghi chú
    activeTag = null; // Reset bộ lọc tag
    currentNoteId = null; // Reset note đang chọn
}

/**
 * Hiển thị form soạn thảo/sửa ghi chú.
 * @param {object | null} note - Dữ liệu ghi chú để sửa (nếu có). Null nếu tạo mới.
 */
function showEditor(note = null) {
    noteDetailPlaceholder.style.display = 'none'; // Ẩn placeholder
    noteDetailView.style.display = 'none'; // Ẩn view chi tiết
    noteEditorView.style.display = 'block'; // Hiện view editor
    editorError.textContent = ''; // Xóa thông báo lỗi cũ

    if (note && note.id) { // Nếu có dữ liệu note -> đang sửa
        editorTitle.textContent = "Sửa Ghi chú";
        noteIdInput.value = note.id; // Lưu ID vào input ẩn để biết đang sửa note nào
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        noteTagsInput.value = note.tags ? note.tags.join(', ') : ''; // Nối các tag bằng dấu phẩy
        isCodeCheckbox.checked = note.isCode || false; // Đặt trạng thái checkbox
        languageSelect.value = note.language || 'plaintext'; // Đặt ngôn ngữ đã chọn
        // Hiện/ẩn dropdown ngôn ngữ dựa trên checkbox
        languageSelect.style.display = note.isCode ? 'inline-block' : 'none';
    } else { // Nếu không có dữ liệu note -> đang tạo mới
        editorTitle.textContent = "Tạo Ghi chú Mới";
        clearEditorFields(); // Xóa trắng các trường input
        noteIdInput.value = ''; // Đảm bảo input ID rỗng
        currentNoteId = null; // Đảm bảo không có note nào đang được chọn khi tạo mới
    }
    noteTitleInput.focus(); // Tự động focus vào ô tiêu đề
}

/** Hiển thị khu vực xem chi tiết ghi chú */
function showDetailView() {
    noteDetailPlaceholder.style.display = 'none';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'block';
}

/** Hiển thị placeholder (khi không có note nào được chọn) */
function showPlaceholder() {
    noteDetailPlaceholder.style.display = 'flex'; // Hiện placeholder
    noteEditorView.style.display = 'none'; // Ẩn editor
    noteDetailView.style.display = 'none'; // Ẩn view chi tiết
    clearNoteDisplay(); // Xóa dữ liệu chi tiết cũ
    setActiveNoteItem(null); // Bỏ highlight item trong danh sách
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

/** Xóa toàn bộ trạng thái của editor (bao gồm cả ID) */
function clearEditor() {
    clearEditorFields();
    noteIdInput.value = ''; // Xóa ID đang sửa (nếu có)
}

/** Xóa trắng khu vực hiển thị chi tiết ghi chú */
function clearNoteDisplay() {
     noteDetailTitle.textContent = '';
     noteDetailTags.innerHTML = ''; // Xóa các tag cũ
     noteDetailContent.innerHTML = ''; // *** THAY ĐỔI: Dùng innerHTML thay vì textContent
     noteDetailContent.style.display = 'none'; // Ẩn vùng text
     noteDetailCode.style.display = 'none'; // Ẩn vùng code
     codeBlock.textContent = ''; // Xóa nội dung code
     codeBlock.className = ''; // Xóa class ngôn ngữ cũ (quan trọng cho Prism)
     copyCodeBtn.style.display = 'none'; // Ẩn nút copy
}

/**
 * Đánh dấu (highlight) ghi chú đang được chọn trong danh sách sidebar.
 * @param {string | null} noteId - ID của ghi chú cần highlight, hoặc null để bỏ highlight tất cả.
 */
function setActiveNoteItem(noteId) {
    document.querySelectorAll('#notes-list-container .note-item').forEach(item => {
        if (item.dataset.id === noteId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
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
 * Hàm tìm và thay thế URL trong text bằng thẻ <a>.
 * @param {string} text - Đoạn văn bản đầu vào.
 * @returns {string} - Chuỗi HTML với các URL đã được chuyển thành link.
 */
function linkify(text) {
    if (!text) return '';
    // Regex đơn giản để tìm URL (http, https, ftp)
    const urlRegex = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    // Regex để tìm URL không có scheme (vd: www.google.com) - phức tạp hơn và có thể bắt nhầm
    // const pseudoUrlRegex = /(^|[^\/])(www\.[\S]+(\b|$))/ig;

    let linkedText = text.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });

    // Tùy chọn: Xử lý link không có scheme (www.) - Cẩn thận vì có thể bắt nhầm
    // linkedText = linkedText.replace(pseudoUrlRegex, (match, p1, p2) => {
    //     return `${p1}<a href="http://${p2}" target="_blank" rel="noopener noreferrer">${p2}</a>`;
    // });

    // Quan trọng: Thoát các ký tự HTML đặc biệt khác để tránh XSS khi dùng innerHTML
    // Ngoại trừ các thẻ <a> vừa tạo
    const tempDiv = document.createElement('div');
    tempDiv.textContent = text; // Gán text thuần túy để trình duyệt tự thoát HTML
    let escapedText = tempDiv.innerHTML;

    // Thay thế lại các URL đã thoát bằng link thật sự
    escapedText = escapedText.replace(urlRegex, (url) => {
         // Cần đảm bảo URL trong href không bị thoát lần nữa
         let originalUrl = url.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
         return `<a href="${originalUrl}" target="_blank" rel="noopener noreferrer">${originalUrl}</a>`;
    });


    // Trả về text đã được xử lý link và thoát HTML an toàn
    return escapedText.replace(/\n/g, '<br>'); // Thay thế xuống dòng bằng <br>
}


// --- Logic Xác thực (Authentication) ---
// (Giữ nguyên như trước)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user.uid, user.email);
        currentUser = user;
        userEmailDisplay.textContent = user.email;
        showApp();
        loadNotesAndTags();
        showPlaceholder();
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
// (Các hàm khác giữ nguyên)

// Hiện/ẩn ô chọn ngôn ngữ
isCodeCheckbox.addEventListener('change', (e) => {
    languageSelect.style.display = e.target.checked ? 'inline-block' : 'none';
    if (!e.target.checked) {
        languageSelect.value = 'plaintext';
    }
});

// Nút "Thêm Ghi Chú Mới"
addNoteBtn.addEventListener('click', () => {
    setActiveNoteItem(null);
    showEditor();
});

// Nút "Hủy" trong Editor
cancelEditBtn.addEventListener('click', () => {
    const idBeingEdited = noteIdInput.value;
    clearEditor();
    if (idBeingEdited && notesCache[idBeingEdited]) {
        currentNoteId = idBeingEdited;
        displayNoteDetail(notesCache[idBeingEdited]);
        setActiveNoteItem(idBeingEdited);
    } else {
        showPlaceholder();
    }
});

// Nút "Lưu Ghi Chú"
saveNoteBtn.addEventListener('click', async () => {
    if (!currentUser) {
        alert("Vui lòng đăng nhập để lưu ghi chú.");
        return;
    }

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
        title,
        content,
        tags,
        isCode,
        language,
        userId: currentUser.uid,
        updatedAt: Timestamp.now()
    };

    try {
        if (id) {
            // --- Sửa ghi chú ---
            console.log("Updating note with ID:", id);
            const noteRef = doc(db, "notes", id);
            await updateDoc(noteRef, noteData);
            console.log("Note updated successfully");
            notesCache[id] = { ...notesCache[id], ...noteData, id };
            currentNoteId = id;
            displayNoteDetail(notesCache[id]);
            setActiveNoteItem(id);
        } else {
            // --- Tạo ghi chú mới ---
            console.log("Adding new note");
            noteData.createdAt = Timestamp.now();
            const docRef = await addDoc(collection(db, "notes"), noteData);
            console.log("Note added with ID:", docRef.id);
            notesCache[docRef.id] = { ...noteData, id: docRef.id };
            currentNoteId = docRef.id;
            displayNoteDetail(notesCache[docRef.id]);
            setActiveNoteItem(docRef.id);
            clearEditorFields();
            noteEditorView.style.display = 'none';
        }
    } catch (error) {
        console.error("Error saving note: ", error);
        editorError.textContent = `Lỗi lưu ghi chú: ${error.message}`;
    } finally {
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = 'Lưu Ghi Chú';
    }
});

// Nút "Sửa" trong Detail View
editNoteBtn.addEventListener('click', () => {
    if (!currentNoteId || !notesCache[currentNoteId]) {
        alert("Vui lòng chọn một ghi chú để sửa.");
        return;
    };
    const noteToEdit = notesCache[currentNoteId];
    showEditor(noteToEdit);
});

// Nút "Xóa" trong Detail View
deleteNoteBtn.addEventListener('click', async () => {
     if (!currentNoteId) {
         alert("Vui lòng chọn một ghi chú để xóa.");
         return;
     }
     const noteTitle = notesCache[currentNoteId]?.title || "ghi chú này";
     if (confirm(`Bạn có chắc chắn muốn xóa ghi chú "${noteTitle}" không? Hành động này không thể hoàn tác.`)) {
        console.log("Attempting to delete note ID:", currentNoteId);
        try {
            const noteRef = doc(db, "notes", currentNoteId);
            await deleteDoc(noteRef);
            console.log("Note deleted successfully from Firestore");
            delete notesCache[currentNoteId];
            showPlaceholder();
        } catch (error) {
            console.error("Error deleting note: ", error);
            alert(`Lỗi xóa ghi chú: ${error.message}`);
        }
     }
});

// Nút "Copy Code"
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
        notesCache = {};

        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() };
            allNotes.push(note);
            notesCache[note.id] = note;
        });

        renderNotesList(allNotes);
        renderTagsList(allNotes);

        // --- Xử lý các trường hợp cạnh ---
        if (currentNoteId && !notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
            console.log("Current detailed note removed, showing placeholder.");
            showPlaceholder();
        }
        const editorNoteId = noteIdInput.value;
        if (noteEditorView.style.display === 'block' && editorNoteId && !notesCache[editorNoteId]) {
             console.log("Current edited note removed, clearing editor and showing placeholder.");
             clearEditor();
             showPlaceholder();
        }
        else if (currentNoteId && notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
             console.log("Updating detail view for note:", currentNoteId);
             displayNoteDetail(notesCache[currentNoteId]);
        }

    }, (error) => {
        console.error("Error listening to Firestore: ", error);
        notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`;
    });
}

/**
 * Hiển thị danh sách ghi chú lên sidebar.
 * @param {Array<object>} notes - Mảng các đối tượng ghi chú.
 */
function renderNotesList(notes) {
    notesListContainer.innerHTML = '';

    const notesToRender = activeTag
        ? notes.filter(note => note.tags && note.tags.includes(activeTag))
        : notes;

    if (notesToRender.length === 0) {
        notesListContainer.innerHTML = activeTag
            ? `<p>Không có ghi chú nào với tag "${activeTag}".</p>`
            : '<p>Chưa có ghi chú nào. Hãy tạo ghi chú mới!</p>';
        return;
    }

    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item');
        noteElement.dataset.id = note.id;

        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title || "Không có tiêu đề";

        const dateElement = document.createElement('span');
        if (note.updatedAt && note.updatedAt.toDate) {
             dateElement.textContent = note.updatedAt.toDate().toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'
             });
        } else {
             dateElement.textContent = "Không rõ ngày";
        }

        noteElement.appendChild(titleElement);
        noteElement.appendChild(dateElement);

        noteElement.addEventListener('click', () => {
            if (currentNoteId !== note.id || noteEditorView.style.display === 'block') {
                currentNoteId = note.id;
                displayNoteDetail(note);
                setActiveNoteItem(note.id);
                 if (noteEditorView.style.display === 'block') {
                    clearEditor();
                    noteEditorView.style.display = 'none';
                 }
            }
        });

        notesListContainer.appendChild(noteElement);
    });

     if (currentNoteId && !notesToRender.some(n => n.id === currentNoteId)) {
        if (noteDetailView.style.display === 'block' || noteEditorView.style.display === 'block') {
            showPlaceholder();
        }
     } else if (currentNoteId) {
         setActiveNoteItem(currentNoteId);
     }
}

/**
 * Hiển thị danh sách các tags duy nhất lên sidebar.
 * @param {Array<object>} notes - Mảng tất cả ghi chú (để trích xuất tags).
 */
function renderTagsList(notes) {
    const allTags = new Set();
    notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => allTags.add(tag));
        }
    });

    tagsListContainer.innerHTML = '';

    // --- Tạo nút "Tất cả" ---
    const allTagElement = document.createElement('span');
    allTagElement.classList.add('tag-item');
    allTagElement.textContent = 'Tất cả';
    if (activeTag === null) {
        allTagElement.classList.add('active');
    }
    allTagElement.addEventListener('click', () => {
        if (activeTag !== null) {
            activeTag = null;
            renderNotesList(Object.values(notesCache));
            setActiveTagItem(null);
            showPlaceholder();
        }
    });
    tagsListContainer.appendChild(allTagElement);

    // --- Hiển thị các tag khác ---
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
                renderNotesList(Object.values(notesCache));
                setActiveTagItem(tag);
                showPlaceholder();
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
 * Hiển thị chi tiết của một ghi chú cụ thể.
 * @param {object} note - Đối tượng ghi chú cần hiển thị.
 */
function displayNoteDetail(note) {
    if (!note || !note.id) {
        console.warn("Invalid note data passed to displayNoteDetail");
        showPlaceholder();
        return;
    }
    console.log("Displaying detail for note:", note.id);
    clearNoteDisplay();

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
        // --- Hiển thị dạng Code ---
        noteDetailContent.style.display = 'none';
        codeBlock.textContent = note.content;
        codeBlock.className = `language-${note.language || 'plaintext'}`; // Đặt class ngôn ngữ
        noteDetailCode.style.display = 'block';
        copyCodeBtn.style.display = 'inline-block';

        // Gọi Prism để highlight
        if (window.Prism) {
            Prism.highlightElement(codeBlock);
        } else {
            console.warn("Prism.js not loaded. Syntax highlighting disabled.");
        }
    } else {
        // --- Hiển thị dạng Text thường với link ---
        noteDetailCode.style.display = 'none';
        copyCodeBtn.style.display = 'none';
        // *** THAY ĐỔI: Sử dụng hàm linkify và innerHTML ***
        noteDetailContent.innerHTML = linkify(note.content);
        noteDetailContent.style.display = 'block';
    }

    showDetailView();
}

// --- Khởi chạy ---
console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");

