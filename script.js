// Import các hàm cần thiết từ Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// import { getFirestore, ... } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Chúng ta sẽ import Firestore khi cần dùng đến

// --- Cấu hình Firebase của bạn ---
const firebaseConfig = {
    apiKey: "AIzaSyAe5UOFul4ce8vQN66Bpcktj4oiV19ht-I", // <- !!! Thay bằng API key thật nếu cần
    authDomain: "ghichu-198277.firebaseapp.com",
    projectId: "ghichu-198277",
    storageBucket: "ghichu-198277.appspot.com", // <- !!! Sửa lại đuôi .appspot.com
    messagingSenderId: "1001550945488",
    appId: "1:1001550945488:web:bbda01f5a11f15a81192d5"
};

// --- Khởi tạo Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
// const db = getFirestore(app); // Khởi tạo Firestore khi cần

// --- Lấy tham chiếu đến các phần tử DOM ---
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
const noteDetailContent = document.getElementById('note-detail-content');
const noteDetailCode = document.getElementById('note-detail-code');
const codeBlock = noteDetailCode.querySelector('code'); // Lấy thẻ code bên trong pre
const copyCodeBtn = document.getElementById('copy-code-btn');

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
const editNoteBtn = document.getElementById('edit-note-btn');
const deleteNoteBtn = document.getElementById('delete-note-btn');

let currentUser = null; // Lưu thông tin người dùng hiện tại
let currentNoteId = null; // Lưu ID của ghi chú đang được xem/sửa

// --- Hàm trợ giúp ---
function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'block'; // Hoặc 'flex' nếu bạn dùng flexbox cho layout chính
}

function showAuth() {
    authContainer.style.display = 'block';
    appContainer.style.display = 'none';
    currentUser = null; // Reset user khi logout
    clearNoteDisplay(); // Xóa dữ liệu cũ
    clearEditor();
    notesListContainer.innerHTML = '<p>Vui lòng đăng nhập.</p>'; // Reset list
    tagsListContainer.innerHTML = '';
}

function showEditor(note = null) { // note = null là tạo mới, có note là sửa
    noteDetailPlaceholder.style.display = 'none';
    noteDetailView.style.display = 'none';
    noteEditorView.style.display = 'block';
    editorError.textContent = ''; // Xóa lỗi cũ

    if (note) {
        editorTitle.textContent = "Sửa Ghi chú";
        noteIdInput.value = note.id; // Lưu ID để biết là đang sửa
        noteTitleInput.value = note.title;
        noteContentInput.value = note.content;
        noteTagsInput.value = note.tags ? note.tags.join(', ') : '';
        isCodeCheckbox.checked = note.isCode || false;
        languageSelect.value = note.language || 'plaintext';
        languageSelect.style.display = note.isCode ? 'inline-block' : 'none';
        currentNoteId = note.id; // Lưu ID ghi chú đang sửa
    } else {
        editorTitle.textContent = "Tạo Ghi chú Mới";
        clearEditor(); // Xóa form để tạo mới
        currentNoteId = null; // Đảm bảo không có ID khi tạo mới
    }
}

function showDetailView() {
    noteDetailPlaceholder.style.display = 'none';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'block';
}

function showPlaceholder(){
    noteDetailPlaceholder.style.display = 'flex';
    noteEditorView.style.display = 'none';
    noteDetailView.style.display = 'none';
}

function clearEditor() {
    noteIdInput.value = '';
    noteTitleInput.value = '';
    noteContentInput.value = '';
    noteTagsInput.value = '';
    isCodeCheckbox.checked = false;
    languageSelect.value = 'plaintext';
    languageSelect.style.display = 'none';
    editorError.textContent = '';
    currentNoteId = null;
}

function clearNoteDisplay(){
     noteDetailTitle.textContent = '';
     noteDetailTags.innerHTML = '';
     noteDetailContent.textContent = '';
     noteDetailCode.style.display = 'none';
     codeBlock.textContent = '';
     codeBlock.className = ''; // Xóa class ngôn ngữ cũ
     copyCodeBtn.style.display = 'none';
     currentNoteId = null;
}

// --- Logic Xác thực ---

// Theo dõi trạng thái đăng nhập
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Người dùng đã đăng nhập
        console.log("Người dùng đã đăng nhập:", user);
        currentUser = user; // Lưu thông tin user
        userEmailDisplay.textContent = user.email;
        showApp();
        // TODO: Tải danh sách ghi chú của người dùng này
        // loadNotes();
        // loadTags();
        showPlaceholder(); // Hiện placeholder khi mới đăng nhập
    } else {
        // Người dùng đã đăng xuất
        console.log("Người dùng đã đăng xuất.");
        showAuth();
    }
});

// Xử lý đăng nhập
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginForm['login-email'].value;
    const password = loginForm['login-password'].value;
    loginError.textContent = ''; // Xóa lỗi cũ

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Đăng nhập thành công
            console.log("Đăng nhập thành công:", userCredential.user);
            loginForm.reset(); // Xóa form
        })
        .catch((error) => {
            console.error("Lỗi đăng nhập:", error);
            loginError.textContent = `Lỗi: ${error.message}`;
        });
});

// Xử lý đăng ký
signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = signupForm['signup-email'].value;
    const password = signupForm['signup-password'].value;
    signupError.textContent = ''; // Xóa lỗi cũ

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            // Đăng ký thành công
            console.log("Đăng ký thành công:", userCredential.user);
            signupForm.reset(); // Xóa form
            // Tự động đăng nhập sau khi đăng ký thành công
        })
        .catch((error) => {
            console.error("Lỗi đăng ký:", error);
            signupError.textContent = `Lỗi: ${error.message}`;
        });
});

// Xử lý đăng xuất
logoutButton.addEventListener('click', () => {
    signOut(auth).then(() => {
        console.log("Đăng xuất thành công.");
    }).catch((error) => {
        console.error("Lỗi đăng xuất:", error);
        alert(`Lỗi đăng xuất: ${error.message}`);
    });
});


// --- Logic Ghi chú (Cơ bản UI, chưa có Firestore) ---

// Hiện/ẩn ô chọn ngôn ngữ khi check/uncheck "Đây là code?"
isCodeCheckbox.addEventListener('change', (e) => {
    languageSelect.style.display = e.target.checked ? 'inline-block' : 'none';
    if (!e.target.checked) {
        languageSelect.value = 'plaintext'; // Reset về plaintext nếu bỏ check
    }
});

// Nút "Thêm Ghi Chú Mới" -> Hiển thị Editor trống
addNoteBtn.addEventListener('click', () => {
    showEditor(); // Gọi không có tham số để tạo mới
});

// Nút "Hủy" trong Editor -> Quay lại Placeholder hoặc Detail view trước đó
cancelEditBtn.addEventListener('click', () => {
    clearEditor();
    if (currentNoteId) {
        // Nếu đang sửa -> quay lại xem chi tiết ghi chú đó
        // TODO: Cần hàm để tải lại và hiển thị chi tiết ghi chú `currentNoteId`
        // showNoteDetail(currentNoteId); // Giả sử có hàm này
         showPlaceholder(); // Tạm thời quay về placeholder
    } else {
        // Nếu đang tạo mới -> quay lại placeholder
        showPlaceholder();
    }
});

// Nút "Lưu Ghi Chú" (Chưa xử lý lưu vào Firestore)
saveNoteBtn.addEventListener('click', () => {
    const id = noteIdInput.value; // Lấy ID (nếu có)
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const tags = noteTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag); // Tách tags, xóa khoảng trắng, loại bỏ tag rỗng
    const isCode = isCodeCheckbox.checked;
    const language = languageSelect.value;

    if (!title || !content) {
        editorError.textContent = "Tiêu đề và Nội dung không được để trống!";
        return;
    }
    editorError.textContent = ''; // Xóa lỗi

    const noteData = { title, content, tags, isCode, language };

    if (id) {
        // --- Đang sửa ghi chú ---
        console.log("Đang sửa ghi chú ID:", id);
        console.log("Dữ liệu cập nhật:", noteData);
        // TODO: Gọi hàm cập nhật Firestore với noteData và id
        // updateNoteInFirestore(id, noteData);
        alert("Chức năng sửa chưa hoàn thiện!"); // Placeholder
        // Sau khi lưu thành công:
        // clearEditor();
        // showNoteDetail(id); // Hiển thị lại chi tiết ghi chú vừa sửa
    } else {
        // --- Đang tạo ghi chú mới ---
        console.log("Đang tạo ghi chú mới");
        console.log("Dữ liệu mới:", noteData);
        // TODO: Gọi hàm thêm mới vào Firestore với noteData
        // addNoteToFirestore(noteData);
        alert("Chức năng thêm mới chưa hoàn thiện!"); // Placeholder
        // Sau khi lưu thành công:
        // clearEditor();
        // showPlaceholder(); // Hoặc hiển thị ghi chú vừa tạo
    }
});

// Nút "Sửa" trong Detail View -> Hiển thị Editor với dữ liệu hiện tại
editNoteBtn.addEventListener('click', () => {
    if (!currentNoteId) return; // Phải có ghi chú đang được chọn
    console.log("Yêu cầu sửa ghi chú ID:", currentNoteId);
    // TODO: Cần lấy dữ liệu đầy đủ của `currentNoteId` từ Firestore hoặc cache
    // const noteToEdit = findNoteDataById(currentNoteId); // Hàm giả định
    // if(noteToEdit) {
    //    showEditor(noteToEdit);
    // } else {
    //    alert("Không tìm thấy dữ liệu ghi chú để sửa.");
    // }
    alert("Chức năng sửa chưa hoàn thiện - cần lấy dữ liệu trước!"); // Placeholder
});

// Nút "Xóa" trong Detail View
deleteNoteBtn.addEventListener('click', () => {
     if (!currentNoteId) return;
     if (confirm(`Bạn có chắc chắn muốn xóa ghi chú "${noteDetailTitle.textContent}" không?`)) {
        console.log("Yêu cầu xóa ghi chú ID:", currentNoteId);
        // TODO: Gọi hàm xóa ghi chú khỏi Firestore
        // deleteNoteFromFirestore(currentNoteId);
        alert("Chức năng xóa chưa hoàn thiện!"); // Placeholder
        // Sau khi xóa thành công:
        // clearNoteDisplay();
        // showPlaceholder();
        // loadNotes(); // Tải lại danh sách
        // loadTags(); // Tải lại tags
     }
});

// Nút "Copy Code"
copyCodeBtn.addEventListener('click', () => {
    if (codeBlock.textContent) {
        navigator.clipboard.writeText(codeBlock.textContent)
            .then(() => {
                alert('Đã sao chép code vào clipboard!');
            })
            .catch(err => {
                console.error('Lỗi sao chép:', err);
                alert('Lỗi khi sao chép code.');
            });
    }
});


// --- Các hàm xử lý Firestore (Sẽ được thêm vào sau) ---
// function addNoteToFirestore(noteData) { ... }
// function loadNotes() { ... } // Tải và hiển thị danh sách
// function loadTags() { ... } // Tải và hiển thị tags
// function showNoteDetail(noteId) { ... } // Tải và hiển thị chi tiết
// function updateNoteInFirestore(noteId, noteData) { ... }
// function deleteNoteFromFirestore(noteId) { ... }

console.log("Script loaded. Waiting for DOM and Firebase Auth...");
