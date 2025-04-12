// Admin Dashboard JavaScript

// Global variables to store data
let users = [];
let books = [];
let wishlistItems = [];
let selectedUserId = null;

// Initialize the admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    // Load initial data
    loadUsers();
    loadBooks();
    populateUserFilter();
    
    // Set up event listeners for forms
    document.getElementById('genreFilter').addEventListener('change', filterBooksByGenre);
    document.getElementById('newUserForm').addEventListener('submit', addUser);
    document.getElementById('newBookForm').addEventListener('submit', addBook);
    document.getElementById('editUserForm').addEventListener('submit', updateUser);
    document.getElementById('editBookForm').addEventListener('submit', updateBook);
});

// Tab navigation
function openTab(tabName, event) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName).classList.add('active');
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'books') {
        loadBooks();
    } else if (tabName === 'wishlists') {
        populateUserFilter();
    }
}

// ------ USER MANAGEMENT ------

// Load users from the server
function loadUsers() {
    // Normally we would fetch from the server
    // For this example, we'll use a direct API call
    fetch('http://localhost:3000/api/users')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            users = data;
            renderUsersTable();
        })
        .catch(error => {
            console.error('Error loading users:', error);
            // For demo purposes, load mock data if server is not available
            users = [
                { id: 1, email: 'hi@bye', password: '123' },
                { id: 2, email: 'hi@bye123', password: 'bye123' }
            ];
            renderUsersTable();
        });
}

// Render the users table
function renderUsersTable() {
    const tableBody = document.getElementById('usersTableBody');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.email}</td>
            <td>${maskPassword(user.password)}</td>
            <td>
                <button onclick="showEditUserModal(${user.id})">Edit</button>
                <button onclick="showDeleteConfirmation('user', ${user.id}, '${user.email}')">Delete</button>
                <button onclick="viewUserWishlist(${user.id})">View Wishlist</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Mask password for display
function maskPassword(password) {
    return '•'.repeat(password.length);
}

// Search users by email
function searchUsers() {
    const searchTerm = document.getElementById('userSearch').value.toLowerCase();
    const tableBody = document.getElementById('usersTableBody');
    const rows = tableBody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        const emailCell = rows[i].getElementsByTagName('td')[1];
        if (emailCell) {
            const email = emailCell.textContent || emailCell.innerText;
            if (email.toLowerCase().indexOf(searchTerm) > -1) {
                rows[i].style.display = '';
            } else {
                rows[i].style.display = 'none';
            }
        }
    }
}

// Show Add User Form
function showAddUserForm() {
    document.getElementById('addUserForm').style.display = 'block';
    document.getElementById('newEmail').focus();
}

// Hide Add User Form
function hideAddUserForm() {
    document.getElementById('addUserForm').style.display = 'none';
    document.getElementById('newUserForm').reset();
}

// Add a new user
function addUser(event) {
    event.preventDefault();
    
    const email = document.getElementById('newEmail').value;
    const password = document.getElementById('newPassword').value;
    
    // Create new user object
    const newUser = {
        email: email,
        password: password
    };
    
    // Send to server
    fetch('http://localhost:3000/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Reload users to get the new user with ID
            loadUsers();
            hideAddUserForm();
            alert('User added successfully!');
        } else {
            alert('Failed to add user: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error adding user:', error);
        // For demo, add to local array if server is not available
        newUser.id = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        users.push(newUser);
        renderUsersTable();
        hideAddUserForm();
        populateUserFilter();
        alert('User added!');
    });
}

// Show Edit User Modal
function showEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editEmail').value = user.email;
        document.getElementById('editPassword').value = ''; // Don't pre-fill password
        document.getElementById('editUserModal').style.display = 'block';
    }
}

// Close Edit User Modal
function closeEditUserModal() {
    document.getElementById('editUserModal').style.display = 'none';
    document.getElementById('editUserForm').reset();
}

// Update a user
function updateUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('editUserId').value;
    const email = document.getElementById('editEmail').value;
    const password = document.getElementById('editPassword').value;
    
    // Create updated user object
    const updatedUser = {
        id: parseInt(userId),
        email: email
    };
    
    // Only include password if it's been changed
    if (password) {
        updatedUser.password = password;
    }
    
    // Send to server
    fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedUser)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadUsers();
            closeEditUserModal();
            alert('User updated successfully!');
        } else {
            alert('Failed to update user: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error updating user:', error);
        // For demo, update local array if server is not available
        const index = users.findIndex(u => u.id === parseInt(userId));
        if (index !== -1) {
            // Keep the existing password if none provided
            if (!updatedUser.password) {
                updatedUser.password = users[index].password;
            }
            users[index] = updatedUser;
            renderUsersTable();
            closeEditUserModal();
            populateUserFilter();
            alert('User updated!');
        }
    });
}

// ------ BOOK MANAGEMENT ------

// Load books from the server
function loadBooks() {
    // Fetch all books from the server
    const tableBody = document.getElementById('booksTableBody');
    tableBody.innerHTML = '<tr><td colspan="7">Loading books...</td></tr>';
    
    // Fetch all books from the server
    fetch('http://localhost:3000/api/books/all')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Network response error: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        books = data;
        renderBooksTable();
    })
    .catch(error => {
        console.error('Error loading books:', error);
        tableBody.innerHTML = `<tr><td colspan="7">Error loading books: ${error.message}. Using mock data instead.</td></tr>`;
        
        // For demo purposes, load mock data if server is not available
        setTimeout(() => {
            books = [
                { id: 1, title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction', rating: 4.5, cover_url: 'https://images.example.com/sapiens.jpg' },
                { id: 2, title: 'Dune', author: 'Frank Herbert', genre: 'Science Fiction', rating: 4.8, cover_url: 'https://images.example.com/dune.jpg' },
                { id: 3, title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', genre: 'Fiction', rating: 4.3, cover_url: 'https://images.example.com/gatsby.jpg' }
            ];
            renderBooksTable();
        }, 1000); // Short delay to make the error message visible
    });
}

// Render the books table
function renderBooksTable() {
    const tableBody = document.getElementById('booksTableBody');
    tableBody.innerHTML = '';
    
    books.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${book.id}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.genre}</td>
            <td>${book.rating || 'N/A'}</td>
            <td>
                <button onclick="showEditBookModal(${book.id})">Edit</button>
                <button onclick="showDeleteConfirmation('book', ${book.id}, '${book.title}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Filter books by genre
function filterBooksByGenre() {
    const genreFilter = document.getElementById('genreFilter').value;
    
    // If "All" or empty filter is selected, show all books
    if (!genreFilter) {
        renderBooksTable();
        return;
    }
    
    // Filter books by genre - case insensitive comparison
    const filteredBooks = books.filter(book => 
        book.genre && book.genre.toLowerCase() === genreFilter.toLowerCase()
    );
    
    // Render the filtered books
    const tableBody = document.getElementById('booksTableBody');
    tableBody.innerHTML = '';
    
    if (filteredBooks.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6">No books found in the "${genreFilter}" genre</td></tr>`;
        return;
    }
    
    filteredBooks.forEach(book => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${book.id}</td>
            <td>${book.title}</td>
            <td>${book.author}</td>
            <td>${book.genre}</td>
            <td>${book.rating || 'N/A'}</td>
            <td>
                <button onclick="showEditBookModal(${book.id})">Edit</button>
                <button onclick="showDeleteConfirmation('book', ${book.id}, '${book.title}')">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Show Add Book Form
function showAddBookForm() {
    document.getElementById('addBookForm').style.display = 'block';
    document.getElementById('bookTitle').focus();
}

// Hide Add Book Form
function hideAddBookForm() {
    document.getElementById('addBookForm').style.display = 'none';
    document.getElementById('newBookForm').reset();
}

function addBook(event) {
    event.preventDefault();
    
    const newBookTitle = document.getElementById('bookTitle').value.trim();
    const newBookAuthor = document.getElementById('bookAuthor').value.trim();
    
    // Check for duplicates first
    const duplicateBook = books.find(book => 
        book.title.toLowerCase() === newBookTitle.toLowerCase() && 
        book.author.toLowerCase() === newBookAuthor.toLowerCase()
    );
    
    if (duplicateBook) {
        alert('A book with this title and author already exists!');
        return;
    }
    
    const newBook = {
        title: newBookTitle,
        author: newBookAuthor,
        genre: document.getElementById('bookGenre').value,
        rating: parseFloat(document.getElementById('bookRating').value),
        download_url: document.getElementById('bookDownloadUrl').value,
    };
    
    // Show loading state
    const submitButton = document.querySelector('#newBookForm button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Adding...';
    submitButton.disabled = true;
    
    // Send to server
    fetch('http://localhost:3000/api/books', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(newBook)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadBooks();
            hideAddBookForm();
            alert('Book added successfully!');
        } else {
            alert('Failed to add book: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error adding book:', error);
        // For demo, add to local array if server is not available
        newBook.id = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;
        books.push(newBook);
        renderBooksTable();
        hideAddBookForm();
        alert('Book added! (Note: Server connection failed, using local storage only)');
    })
    .finally(() => {
        // Reset button state
        submitButton.textContent = originalText;
        submitButton.disabled = false;
    });
}

// Show Edit Book Modal
function showEditBookModal(bookId) {
    const book = books.find(b => b.id === bookId);
    if (book) {
        document.getElementById('editBookId').value = book.id;
        document.getElementById('editTitle').value = book.title;
        document.getElementById('editAuthor').value = book.author;
        document.getElementById('editGenre').value = book.genre;
        document.getElementById('editRating').value = book.rating || '';
        document.getElementById('editDownloadUrl').value = book.download_url || '';
        document.getElementById('editBookModal').style.display = 'block';
    }
}

// Close Edit Book Modal
function closeEditBookModal() {
    document.getElementById('editBookModal').style.display = 'none';
    document.getElementById('editBookForm').reset();
}

// Update a book
function updateBook(event) {
    event.preventDefault();
    
    const bookId = document.getElementById('editBookId').value;
    const updatedBook = {
        id: parseInt(bookId),
        title: document.getElementById('editTitle').value,
        author: document.getElementById('editAuthor').value,
        genre: document.getElementById('editGenre').value,
        rating: parseFloat(document.getElementById('editRating').value) || null,
        download_url: document.getElementById('editDownloadUrl').value
    };
    
    // Send to server
    fetch(`http://localhost:3000/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedBook)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadBooks();
            closeEditBookModal();
            alert('Book updated successfully!');
        } else {
            alert('Failed to update book: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error updating book:', error);
        // For demo, update local array if server is not available
        const index = books.findIndex(b => b.id === parseInt(bookId));
        if (index !== -1) {
            // Preserve the cover_url from the original book
            updatedBook.cover_url = books[index].cover_url;
            books[index] = updatedBook;
            renderBooksTable();
            closeEditBookModal();
            alert('Book updated!');
        }
    });
}

// ------ WISHLIST MANAGEMENT ------

// Populate the user filter dropdown for wishlists
function populateUserFilter() {
    const userFilter = document.getElementById('userFilter');
    
    // Clear existing options except the first one
    while (userFilter.options.length > 1) {
        userFilter.remove(1);
    }
    
    // Add users to dropdown
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = `${user.email} (ID: ${user.id})`;
        userFilter.appendChild(option);
    });
}

// Load wishlist for selected user
function loadWishlistForUser() {
    const userId = document.getElementById('userFilter').value;
    
    if (!userId) {
        // Clear the wishlist table if no user is selected
        document.getElementById('wishlistTableBody').innerHTML = '';
        return;
    }
    
    selectedUserId = userId;
    
    // Fetch the wishlist for the selected user
    fetch(`http://localhost:3000/api/wishlist/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            wishlistItems = data;
            renderWishlistTable();
        })
        .catch(error => {
            console.error('Error loading wishlist:', error);
            // For demo purposes, generate mock wishlist if server is not available
            wishlistItems = books
                .filter((_, index) => index % 2 === 0) // Just get some books for demo
                .map(book => ({ ...book }));
            renderWishlistTable();
        });
}

// View a specific user's wishlist (called from the Users tab)
function viewUserWishlist(userId) {
    // Switch to the wishlist tab
    openTab('wishlists');
    
    // Select the user in the dropdown
    document.getElementById('userFilter').value = userId;
    
    // Load the wishlist
    loadWishlistForUser();
}

function renderWishlistTable() {
    const tableBody = document.getElementById('wishlistTableBody');
    tableBody.innerHTML = '';
    
    if (wishlistItems.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6">No books in wishlist</td>`;
        tableBody.appendChild(row);
        return;
    }
    
    wishlistItems.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.id}</td>
            <td>${item.title}</td>
            <td>${item.author}</td>
            <td>${item.genre}</td>
            <td><span style="font-size: 20px; color: #0066cc;">🔖</span></td>
            <td>
                <button onclick="removeFromWishlist(${item.id})">Remove</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Remove a book from a user's wishlist
function removeFromWishlist(bookId) {
    if (!selectedUserId) {
        alert('No user selected!');
        return;
    }
    
    // Confirm removal
    if (!confirm(`Are you sure you want to remove this book from the wishlist?`)) {
        return;
    }
    
    // Send to server
    fetch(`http://localhost:3000/api/wishlist/${selectedUserId}/${bookId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Reload the wishlist
            loadWishlistForUser();
            alert('Book removed from wishlist!');
        } else {
            alert('Failed to remove book: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error removing from wishlist:', error);
        // For demo, remove from local array if server is not available
        wishlistItems = wishlistItems.filter(item => item.id !== bookId);
        renderWishlistTable();
        alert('Book removed from wishlist!');
    });
}

// ------ DELETE OPERATIONS ------

// Show delete confirmation modal
function showDeleteConfirmation(itemType, itemId, itemName) {
    const modal = document.getElementById('deleteConfirmModal');
    const message = document.getElementById('deleteConfirmMessage');
    const deleteItemId = document.getElementById('deleteItemId');
    const deleteItemType = document.getElementById('deleteItemType');
    
    message.textContent = `Are you sure you want to delete ${itemType}: ${itemName}?`;
    deleteItemId.value = itemId;
    deleteItemType.value = itemType;
    
    modal.style.display = 'block';
}

// Close delete confirmation modal
function closeDeleteConfirmModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
}

// Confirm and execute deletion
function confirmDelete() {
    const itemId = document.getElementById('deleteItemId').value;
    const itemType = document.getElementById('deleteItemType').value;
    
    if (itemType === 'user') {
        deleteUser(itemId);
    } else if (itemType === 'book') {
        deleteBook(itemId);
    }
    
    closeDeleteConfirmModal();
}

// Delete a user
function deleteUser(userId) {
    // Send to server
    fetch(`http://localhost:3000/api/users/${userId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadUsers();
            alert('User deleted successfully!');
        } else {
            alert('Failed to delete user: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        // For demo, remove from local array if server is not available
        users = users.filter(user => user.id !== parseInt(userId));
        renderUsersTable();
        populateUserFilter();
        alert('User deleted!');
    });
}

// Delete a book
function deleteBook(bookId) {
    // Send to server
    fetch(`http://localhost:3000/api/books/${bookId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            loadBooks();
            alert('Book deleted successfully!');
        } else {
            alert('Failed to delete book: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error deleting book:', error);
        // For demo, remove from local array if server is not available
        books = books.filter(book => book.id !== parseInt(bookId));
        renderBooksTable();
        alert('Book deleted!');
    });
}

// Logout function
function logout() {
    // Clear any stored session/user data
    sessionStorage.removeItem('adminLoggedIn');
    // Redirect to login page
    window.location.href = 'admin_login.html';
}