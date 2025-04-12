// Open Contact Modal
function openContact() {
    document.getElementById("contactModal").style.display = "block";
}

// Close Contact Modal
function closeContact() {
    document.getElementById("contactModal").style.display = "none";
}

// Open About Modal
function openAbout() {
    document.getElementById("aboutModal").style.display = "block";
}

// Close About Modal
function closeAbout() {
    document.getElementById("aboutModal").style.display = "none";
}

// Add this script
document.addEventListener('DOMContentLoaded', async () => {
    try {
      const response = await fetch('http://localhost:3000/api/books/free');
      const books = await response.json();
      const container = document.getElementById('freeBooksContainer');
      
      books.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
          <img src="${book.cover_url}" alt="${book.title}">
          <div class="book-details">
            <h2>${book.title}</h2>
            <p class="genre">${book.genre}</p>
            ${book.rating ? `<p class="rating">Rating: ${book.rating}/5</p>` : ''}
            <button class="download-btn" onclick="window.open('${book.download_url}')">
              Download
            </button>
            <button class="wishlist-btn" onclick="addToWishlist(${book.id})">
              Add to Wishlist
            </button>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (error) {
      console.error('Error loading free books:', error);
      container.innerHTML = '<p>Error loading free books. Please try again later.</p>';
    }
  });
  
  async function addToWishlist(bookId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser?.id) {
      alert('Please login to add to wishlist');
      return;
    }
  
    try {
      const response = await fetch('http://localhost:3000/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.id,
          book_id: bookId
        })
      });
      
      const result = await response.json();
      if (response.ok) {
        alert('Added to wishlist!');
      } else {
        alert(result.error || 'Failed to add to wishlist');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Network error. Please try again.');
    }
  }