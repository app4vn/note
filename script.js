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
// let tagsUnsubscribe = null; // Không cần nữa vì tags lấy từ notes
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
    // if (tagsUnsubscribe) {
    //     tagsUnsubscribe();
    //     tagsUnsubscribe = null;
    // }
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
        // currentNoteId đã được set khi click vào note item, không cần set lại ở đây
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
    // Không reset currentNoteId ở đây, vì có thể người dùng chỉ đổi tag filter
}

/** Xóa trắng các trường trong form editor */
function clearEditorFields() {
    // Không xóa noteIdInput.value ở đây vì có thể cần dùng khi hủy sửa
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
    // currentNoteId = null; // Không reset ở đây, để nút cancel biết quay về đâu
}

/** Xóa trắng khu vực hiển thị chi tiết ghi chú */
function clearNoteDisplay() {
     noteDetailTitle.textContent = '';
     noteDetailTags.innerHTML = ''; // Xóa các tag cũ
     noteDetailContent.textContent = ''; // Xóa nội dung text
     noteDetailContent.style.display = 'none'; // Ẩn vùng text
     noteDetailCode.style.display = 'none'; // Ẩn vùng code
     codeBlock.textContent = ''; // Xóa nội dung code
     codeBlock.className = ''; // Xóa class ngôn ngữ cũ (quan trọng cho Prism)
     copyCodeBtn.style.display = 'none'; // Ẩn nút copy
     // currentNoteId = null; // Không reset ở đây
}

/**
 * Đánh dấu (highlight) ghi chú đang được chọn trong danh sách sidebar.
 * @param {string | null} noteId - ID của ghi chú cần highlight, hoặc null để bỏ highlight tất cả.
 */
function setActiveNoteItem(noteId) {
    // Lặp qua tất cả các item trong danh sách
    document.querySelectorAll('#notes-list-container .note-item').forEach(item => {
        // So sánh data-id của item với noteId được truyền vào
        if (item.dataset.id === noteId) {
            item.classList.add('active'); // Thêm class 'active' nếu trùng
        } else {
            item.classList.remove('active'); // Xóa class 'active' nếu không trùng
        }
    });
}

/**
 * Đánh dấu tag đang được chọn trong danh sách sidebar.
 * @param {string | null} tagName - Tên tag cần highlight, hoặc null cho nút 'Tất cả'.
 */
function setActiveTagItem(tagName) {
    document.querySelectorAll('#tags-list-container .tag-item').forEach(item => {
        // Lấy tên tag từ data attribute hoặc textContent (cho nút 'Tất cả')
        const itemTag = item.dataset.tag || (item.textContent === 'Tất cả' ? null : item.textContent);
        if (itemTag === tagName) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}


// --- Logic Xác thực (Authentication) ---

// Lắng nghe sự thay đổi trạng thái đăng nhập của người dùng
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Nếu có user object -> người dùng đã đăng nhập
        console.log("User logged in:", user.uid, user.email);
        currentUser = user; // Lưu thông tin người dùng hiện tại
        userEmailDisplay.textContent = user.email; // Hiển thị email ở header
        showApp(); // Hiển thị giao diện ứng dụng
        loadNotesAndTags(); // Tải dữ liệu ghi chú và tags của người dùng này
        showPlaceholder(); // Hiển thị placeholder ban đầu
    } else {
        // Nếu user là null -> người dùng đã đăng xuất hoặc chưa đăng nhập
        console.log("User logged out.");
        showAuth(); // Hiển thị giao diện đăng nhập/đăng ký
    }
});

// Xử lý sự kiện submit form đăng nhập
loginForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Ngăn trình duyệt tải lại trang
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    loginError.textContent = ''; // Xóa thông báo lỗi cũ

    // Gọi hàm đăng nhập của Firebase Auth
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Đăng nhập thành công
            console.log("Login successful:", userCredential.user.uid);
            loginForm.reset(); // Xóa nội dung form
            // onAuthStateChanged sẽ tự động xử lý việc hiển thị app
        })
        .catch((error) => {
            // Xử lý lỗi đăng nhập
            console.error("Login error:", error.code, error.message);
            loginError.textContent = `Lỗi đăng nhập: ${error.message}`; // Hiển thị lỗi
        });
});

// Xử lý sự kiện submit form đăng ký
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    signupError.textContent = ''; // Xóa lỗi cũ

    // Gọi hàm đăng ký của Firebase Auth
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Đăng ký thành công
            console.log("Signup successful:", userCredential.user.uid);
            signupForm.reset(); // Xóa form
            // Firebase tự động đăng nhập sau khi đăng ký thành công
            // onAuthStateChanged sẽ xử lý việc hiển thị app
        })
        .catch((error) => {
            // Xử lý lỗi đăng ký
            console.error("Signup error:", error.code, error.message);
            signupError.textContent = `Lỗi đăng ký: ${error.message}`; // Hiển thị lỗi
        });
});

// Xử lý sự kiện click nút đăng xuất
logoutButton.addEventListener('click', () => {
    // Gọi hàm đăng xuất của Firebase Auth
    signOut(auth).catch((error) => {
        // Xử lý lỗi nếu có (hiếm khi xảy ra)
        console.error("Logout error:", error);
        alert(`Lỗi đăng xuất: ${error.message}`);
    });
    // onAuthStateChanged sẽ tự động xử lý việc hiển thị màn hình auth
});


// --- Logic quản lý Ghi chú (Notes CRUD & Display) ---

// Xử lý sự kiện thay đổi checkbox "Đây là code?"
isCodeCheckbox.addEventListener('change', (e) => {
    // Hiện hoặc ẩn dropdown chọn ngôn ngữ dựa trên trạng thái checkbox
    languageSelect.style.display = e.target.checked ? 'inline-block' : 'none';
    // Nếu bỏ check, tự động reset về 'plaintext'
    if (!e.target.checked) {
        languageSelect.value = 'plaintext';
    }
});

// Xử lý sự kiện click nút "Thêm Ghi Chú Mới"
addNoteBtn.addEventListener('click', () => {
    // currentNoteId = null; // Đảm bảo đang tạo mới (đã làm trong showEditor)
    setActiveNoteItem(null); // Bỏ highlight item cũ trong danh sách
    showEditor(); // Hiển thị editor trống
});

// Xử lý sự kiện click nút "Hủy" trong editor
cancelEditBtn.addEventListener('click', () => {
    const idBeingEdited = noteIdInput.value; // Lấy ID từ input ẩn (nếu đang sửa)
    clearEditor(); // Xóa dữ liệu và trạng thái editor
    if (idBeingEdited && notesCache[idBeingEdited]) {
        // Nếu đang sửa và có dữ liệu trong cache -> quay lại xem chi tiết note đó
        currentNoteId = idBeingEdited; // Khôi phục ID đang xem
        displayNoteDetail(notesCache[idBeingEdited]); // Hiển thị lại chi tiết
        setActiveNoteItem(idBeingEdited); // Highlight lại item trong list
    } else {
        // Nếu đang tạo mới hoặc không tìm thấy cache -> về placeholder
        showPlaceholder();
    }
});

// Xử lý sự kiện click nút "Lưu Ghi Chú"
saveNoteBtn.addEventListener('click', async () => {
    // Kiểm tra xem người dùng đã đăng nhập chưa
    if (!currentUser) {
        alert("Vui lòng đăng nhập để lưu ghi chú.");
        return;
    }

    // Lấy dữ liệu từ form editor
    const id = noteIdInput.value; // Lấy ID (rỗng nếu tạo mới, có giá trị nếu sửa)
    const title = noteTitleInput.value.trim(); // Lấy tiêu đề, xóa khoảng trắng thừa
    const content = noteContentInput.value.trim(); // Lấy nội dung, xóa khoảng trắng thừa
    // Xử lý tags: tách chuỗi bằng dấu phẩy, xóa khoảng trắng từng tag,
    // lọc bỏ tag rỗng, và dùng Set để loại bỏ tag trùng lặp
    const tags = [...new Set(noteTagsInput.value.split(',')
                                        .map(tag => tag.trim())
                                        .filter(tag => tag))];
    const isCode = isCodeCheckbox.checked; // Lấy trạng thái checkbox
    // Lấy ngôn ngữ từ dropdown nếu là code, mặc định là 'plaintext' nếu không phải
    const language = isCode ? languageSelect.value : 'plaintext';

    // Kiểm tra dữ liệu bắt buộc
    if (!title || !content) {
        editorError.textContent = "Tiêu đề và Nội dung không được để trống!";
        return; // Dừng lại nếu thiếu dữ liệu
    }
    editorError.textContent = ''; // Xóa thông báo lỗi nếu dữ liệu hợp lệ
    saveNoteBtn.disabled = true; // Vô hiệu hóa nút Lưu để tránh click nhiều lần
    saveNoteBtn.textContent = 'Đang lưu...'; // Thay đổi text nút

    // Chuẩn bị đối tượng dữ liệu để lưu vào Firestore
    const noteData = {
        title,
        content,
        tags,
        isCode,
        language,
        userId: currentUser.uid, // **Quan trọng**: Lưu ID người dùng để phân quyền
        updatedAt: Timestamp.now() // Luôn cập nhật thời gian sửa đổi cuối cùng
        // createdAt sẽ được thêm chỉ khi tạo mới
    };

    try {
        if (id) {
            // --- Trường hợp: Sửa ghi chú đã có ---
            console.log("Updating note with ID:", id);
            // Tạo tham chiếu đến document cần sửa
            const noteRef = doc(db, "notes", id);
            // Gọi hàm updateDoc để cập nhật dữ liệu
            // Chỉ cần truyền các trường cần cập nhật
            await updateDoc(noteRef, noteData);
            console.log("Note updated successfully");

            // Cập nhật dữ liệu trong cache cục bộ
            notesCache[id] = { ...notesCache[id], ...noteData, id }; // Giữ lại createdAt cũ nếu có

            // Hiển thị lại chi tiết ghi chú vừa sửa
            currentNoteId = id; // Đảm bảo ID hiện tại là ID vừa sửa
            displayNoteDetail(notesCache[id]);
            setActiveNoteItem(id); // Highlight item trong danh sách

        } else {
            // --- Trường hợp: Tạo ghi chú mới ---
            console.log("Adding new note");
            // Thêm trường createdAt khi tạo mới
            noteData.createdAt = Timestamp.now();
            // Gọi hàm addDoc để thêm document mới vào collection 'notes'
            const docRef = await addDoc(collection(db, "notes"), noteData);
            console.log("Note added with ID:", docRef.id);

            // Thêm note mới vào cache (tạm thời, onSnapshot sẽ cập nhật chính xác hơn)
            notesCache[docRef.id] = { ...noteData, id: docRef.id };

            // Hiển thị chi tiết ghi chú vừa tạo
            currentNoteId = docRef.id; // Đặt ID hiện tại là ID của note mới
            displayNoteDetail(notesCache[docRef.id]);
            setActiveNoteItem(docRef.id); // Highlight item mới trong danh sách
            clearEditorFields(); // Xóa form editor sau khi tạo thành công
            noteEditorView.style.display = 'none'; // Ẩn editor
        }
        // Không cần gọi loadNotes() hay loadTags() vì onSnapshot sẽ tự động làm việc đó
    } catch (error) {
        // Xử lý lỗi nếu lưu thất bại
        console.error("Error saving note: ", error);
        editorError.textContent = `Lỗi lưu ghi chú: ${error.message}`;
    } finally {
        // Dù thành công hay thất bại, bật lại nút Lưu và trả lại text cũ
        saveNoteBtn.disabled = false;
        saveNoteBtn.textContent = 'Lưu Ghi Chú';
    }
});

// Xử lý sự kiện click nút "Sửa" trong khu vực xem chi tiết
editNoteBtn.addEventListener('click', () => {
    // Kiểm tra xem có note nào đang được chọn và có dữ liệu trong cache không
    if (!currentNoteId || !notesCache[currentNoteId]) {
        alert("Vui lòng chọn một ghi chú để sửa.");
        return;
    }
    // Lấy dữ liệu từ cache và hiển thị editor với dữ liệu đó
    const noteToEdit = notesCache[currentNoteId];
    showEditor(noteToEdit);
});

// Xử lý sự kiện click nút "Xóa" trong khu vực xem chi tiết
deleteNoteBtn.addEventListener('click', async () => {
    // Kiểm tra xem có note nào đang được chọn không
     if (!currentNoteId) {
         alert("Vui lòng chọn một ghi chú để xóa.");
         return;
     }
     // Lấy tiêu đề để hiển thị trong thông báo xác nhận
     const noteTitle = notesCache[currentNoteId]?.title || "ghi chú này";
     // Hiển thị hộp thoại xác nhận
     if (confirm(`Bạn có chắc chắn muốn xóa ghi chú "${noteTitle}" không? Hành động này không thể hoàn tác.`)) {
        console.log("Attempting to delete note ID:", currentNoteId);
        try {
            // Tạo tham chiếu đến document cần xóa
            const noteRef = doc(db, "notes", currentNoteId);
            // Gọi hàm deleteDoc để xóa
            await deleteDoc(noteRef);
            console.log("Note deleted successfully from Firestore");

            // Xóa ghi chú khỏi cache cục bộ
            delete notesCache[currentNoteId];
            // Hiển thị placeholder sau khi xóa thành công
            showPlaceholder();
            // onSnapshot sẽ tự động cập nhật danh sách ghi chú và tags trên UI

        } catch (error) {
            // Xử lý lỗi nếu xóa thất bại
            console.error("Error deleting note: ", error);
            alert(`Lỗi xóa ghi chú: ${error.message}`);
        }
     }
});

// Xử lý sự kiện click nút "Copy Code"
copyCodeBtn.addEventListener('click', () => {
    // Lấy nội dung text từ thẻ <code> bên trong <pre>
    const codeToCopy = codeBlock.textContent;
    if (codeToCopy) {
        // Sử dụng Clipboard API để sao chép vào bộ nhớ đệm
        navigator.clipboard.writeText(codeToCopy)
            .then(() => {
                // Thông báo thành công (có thể thay bằng tooltip hoặc hiệu ứng khác)
                copyCodeBtn.textContent = 'Đã chép!';
                // Trả lại text cũ sau một khoảng thời gian
                setTimeout(() => { copyCodeBtn.textContent = 'Copy Code'; }, 1500);
            })
            .catch(err => {
                // Xử lý lỗi nếu không thể sao chép (ví dụ: do quyền truy cập)
                console.error('Clipboard copy failed:', err);
                alert('Lỗi khi sao chép code.');
            });
    }
});

// --- Tải và Hiển thị Dữ liệu từ Firestore ---

/** Tải danh sách ghi chú và tags, đồng thời lắng nghe thay đổi real-time */
function loadNotesAndTags() {
    // Chỉ thực hiện nếu người dùng đã đăng nhập
    if (!currentUser) return;
    console.log("Setting up Firestore listener for user:", currentUser.uid);

    // --- Tạo truy vấn để lấy ghi chú ---
    const notesQuery = query(
        collection(db, "notes"), // Lấy từ collection 'notes'
        where("userId", "==", currentUser.uid), // Chỉ lấy các notes của user hiện tại
        orderBy("updatedAt", "desc") // Sắp xếp theo ngày cập nhật giảm dần (mới nhất lên đầu)
    );

    // Hủy lắng nghe cũ trước khi tạo lắng nghe mới (quan trọng khi đăng nhập lại)
    if (notesUnsubscribe) {
        console.log("Unsubscribing previous listener.");
        notesUnsubscribe();
    }

    // --- Thiết lập lắng nghe real-time (onSnapshot) ---
    notesUnsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
        console.log("Firestore data received (onSnapshot)");
        const allNotes = []; // Mảng để lưu tất cả ghi chú từ snapshot
        notesCache = {}; // Reset và xây dựng lại cache mỗi khi có cập nhật

        // Lặp qua từng document trong kết quả snapshot
        querySnapshot.forEach((doc) => {
            const note = { id: doc.id, ...doc.data() }; // Lấy ID và dữ liệu
            allNotes.push(note);
            notesCache[note.id] = note; // Cập nhật cache
        });

        // Cập nhật giao diện danh sách ghi chú và tags
        renderNotesList(allNotes);
        renderTagsList(allNotes);

        // --- Xử lý các trường hợp cạnh ---
        // Nếu ghi chú đang xem chi tiết bị xóa ở DB -> quay về placeholder
        if (currentNoteId && !notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
            console.log("Current detailed note removed, showing placeholder.");
            showPlaceholder();
        }
        // Nếu đang sửa ghi chú mà nó bị xóa ở DB -> quay về placeholder
        const editorNoteId = noteIdInput.value;
        if (noteEditorView.style.display === 'block' && editorNoteId && !notesCache[editorNoteId]) {
             console.log("Current edited note removed, clearing editor and showing placeholder.");
             clearEditor();
             showPlaceholder();
        }
        // Nếu đang xem chi tiết và dữ liệu của note đó thay đổi -> cập nhật lại view chi tiết
        else if (currentNoteId && notesCache[currentNoteId] && noteDetailView.style.display === 'block') {
             console.log("Updating detail view for note:", currentNoteId);
             displayNoteDetail(notesCache[currentNoteId]); // Cập nhật lại view
        }


    }, (error) => {
        // Xử lý lỗi khi lắng nghe Firestore
        console.error("Error listening to Firestore: ", error);
        notesListContainer.innerHTML = `<p class="error-message">Lỗi tải ghi chú: ${error.message}</p>`;
    });
}

/**
 * Hiển thị danh sách ghi chú lên sidebar.
 * @param {Array<object>} notes - Mảng các đối tượng ghi chú.
 */
function renderNotesList(notes) {
    notesListContainer.innerHTML = ''; // Xóa danh sách cũ

    // Lọc danh sách ghi chú nếu có tag đang được chọn (activeTag)
    const notesToRender = activeTag
        ? notes.filter(note => note.tags && note.tags.includes(activeTag))
        : notes; // Nếu không có activeTag, hiển thị tất cả

    // Hiển thị thông báo nếu không có ghi chú nào (hoặc không có ghi chú nào khớp tag)
    if (notesToRender.length === 0) {
        notesListContainer.innerHTML = activeTag
            ? `<p>Không có ghi chú nào với tag "${activeTag}".</p>`
            : '<p>Chưa có ghi chú nào. Hãy tạo ghi chú mới!</p>';
        return;
    }

    // Lặp qua danh sách ghi chú đã lọc và tạo phần tử HTML cho mỗi ghi chú
    notesToRender.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.classList.add('note-item');
        noteElement.dataset.id = note.id; // Lưu ID vào data attribute để dễ truy xuất

        // Tiêu đề ghi chú
        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title || "Không có tiêu đề"; // Hiển thị tiêu đề hoặc text mặc định

        // Ngày cập nhật cuối cùng
        const dateElement = document.createElement('span');
        if (note.updatedAt && note.updatedAt.toDate) { // Kiểm tra xem có phải là Timestamp không
             // Định dạng ngày tháng theo kiểu Việt Nam
             dateElement.textContent = note.updatedAt.toDate().toLocaleDateString('vi-VN', {
                day: '2-digit', month: '2-digit', year: 'numeric'//, hour: '2-digit', minute: '2-digit' // Có thể thêm giờ phút nếu muốn
             });
        } else {
             dateElement.textContent = "Không rõ ngày"; // Text mặc định nếu không có ngày
        }

        // Thêm tiêu đề và ngày vào phần tử note
        noteElement.appendChild(titleElement);
        noteElement.appendChild(dateElement);

        // Thêm sự kiện click cho mỗi item ghi chú
        noteElement.addEventListener('click', () => {
            // Chỉ xử lý nếu click vào note khác note đang chọn, hoặc đang ở editor
            if (currentNoteId !== note.id || noteEditorView.style.display === 'block') {
                currentNoteId = note.id; // Cập nhật ID đang chọn
                displayNoteDetail(note); // Hiển thị chi tiết note này
                setActiveNoteItem(note.id); // Highlight item này trong danh sách

                 // Nếu đang mở editor, đóng nó lại
                 if (noteEditorView.style.display === 'block') {
                    clearEditor();
                    noteEditorView.style.display = 'none';
                 }
            }
        });

        // Thêm phần tử note vào container trong sidebar
        notesListContainer.appendChild(noteElement);
    });

     // Sau khi render xong, kiểm tra xem note đang active (nếu có) có còn trong danh sách hiển thị không
     // (trường hợp này xảy ra khi lọc tag và note đang active không chứa tag đó)
     if (currentNoteId && !notesToRender.some(n => n.id === currentNoteId)) {
        // Nếu note đang active không thuộc bộ lọc tag hiện tại
        if (noteDetailView.style.display === 'block' || noteEditorView.style.display === 'block') {
             // Nếu đang xem chi tiết hoặc sửa note đó -> quay về placeholder
            showPlaceholder();
        }
     } else if (currentNoteId) {
         // Nếu note đang active vẫn nằm trong list -> đảm bảo nó được highlight
         setActiveNoteItem(currentNoteId);
     }
}

/**
 * Hiển thị danh sách các tags duy nhất lên sidebar.
 * @param {Array<object>} notes - Mảng tất cả ghi chú (để trích xuất tags).
 */
function renderTagsList(notes) {
    const allTags = new Set(); // Dùng Set để tự động loại bỏ các tag trùng lặp
    // Lặp qua tất cả ghi chú để thu thập tags
    notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
            note.tags.forEach(tag => allTags.add(tag)); // Thêm tag vào Set
        }
    });

    tagsListContainer.innerHTML = ''; // Xóa danh sách tags cũ

    // --- Tạo nút "Tất cả" ---
    const allTagElement = document.createElement('span');
    allTagElement.classList.add('tag-item');
    allTagElement.textContent = 'Tất cả';
    // Highlight nút "Tất cả" nếu không có tag nào đang được chọn (activeTag là null)
    if (activeTag === null) {
        allTagElement.classList.add('active');
    }
    // Thêm sự kiện click cho nút "Tất cả"
    allTagElement.addEventListener('click', () => {
        if (activeTag !== null) { // Chỉ xử lý nếu đang lọc tag khác
            activeTag = null; // Reset bộ lọc
            renderNotesList(Object.values(notesCache)); // Hiển thị lại toàn bộ list note
            setActiveTagItem(null); // Cập nhật highlight cho tag
            showPlaceholder(); // Quay về placeholder khi đổi bộ lọc
        }
    });
    tagsListContainer.appendChild(allTagElement);

    // --- Hiển thị các tag khác ---
    // Chuyển Set thành Array, sắp xếp theo alphabet và lặp qua
    [...allTags].sort().forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag-item');
        tagElement.textContent = tag;
        tagElement.dataset.tag = tag; // Lưu tên tag vào data attribute
        // Highlight tag này nếu nó đang là activeTag
        if (tag === activeTag) {
            tagElement.classList.add('active');
        }

        // Thêm sự kiện click cho mỗi tag
        tagElement.addEventListener('click', () => {
            if (activeTag !== tag) { // Chỉ xử lý nếu click vào tag khác tag đang active
                activeTag = tag; // Đặt tag này làm bộ lọc mới
                renderNotesList(Object.values(notesCache)); // Lọc và hiển thị lại list note
                setActiveTagItem(tag); // Cập nhật highlight cho tag
                showPlaceholder(); // Quay về placeholder khi đổi bộ lọc
            }
        });

        tagsListContainer.appendChild(tagElement);
    });

    // Hiển thị thông báo nếu không có tag nào
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
    // Nếu không có note hoặc note không hợp lệ -> về placeholder
    if (!note || !note.id) {
        console.warn("Invalid note data passed to displayNoteDetail");
        showPlaceholder();
        return;
    }
    console.log("Displaying detail for note:", note.id);
    clearNoteDisplay(); // Xóa nội dung cũ trước khi hiển thị mới

    // Hiển thị tiêu đề
    noteDetailTitle.textContent = note.title;

    // Hiển thị tags
    noteDetailTags.innerHTML = ''; // Xóa tag cũ
    if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('tag'); // Class để CSS định dạng
            tagElement.textContent = tag;
            noteDetailTags.appendChild(tagElement);
        });
    }

    // Hiển thị nội dung (dạng code hoặc text thường)
    if (note.isCode) {
        // --- Hiển thị dạng Code ---
        noteDetailContent.style.display = 'none'; // Ẩn vùng text thường
        codeBlock.textContent = note.content; // Đặt nội dung code vào thẻ <code>

        // **Quan trọng**: Đặt class ngôn ngữ cho Prism.js
        // Prism dùng class `language-xyz` trên thẻ <code> để biết cách highlight
        codeBlock.className = `language-${note.language || 'plaintext'}`;

        noteDetailCode.style.display = 'block'; // Hiện thẻ <pre> chứa code
        copyCodeBtn.style.display = 'inline-block'; // Hiện nút Copy Code

        // Gọi Prism để thực hiện syntax highlighting
        // Đảm bảo thư viện Prism đã được tải (Prism.js và prism-autoloader.js)
        if (window.Prism) {
            Prism.highlightElement(codeBlock); // Highlight thẻ <code>
        } else {
            console.warn("Prism.js not loaded. Syntax highlighting disabled.");
        }
    } else {
        // --- Hiển thị dạng Text thường ---
        noteDetailCode.style.display = 'none'; // Ẩn vùng code
        copyCodeBtn.style.display = 'none'; // Ẩn nút Copy Code
        noteDetailContent.textContent = note.content; // Đặt nội dung text
        noteDetailContent.style.display = 'block'; // Hiện vùng text thường
    }

    showDetailView(); // Đảm bảo khu vực xem chi tiết đang được hiển thị
}


// --- Khởi chạy ---
console.log("Script loaded. Firebase Initialized. Waiting for Auth state change...");
// Logic chính sẽ bắt đầu chạy khi onAuthStateChanged được gọi lần đầu.

