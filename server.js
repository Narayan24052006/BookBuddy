const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const path = require('path');

const app = express();
const db = new sqlite3.Database('/Users/kcsn/Downloads/web_pro/database/bookbuddy.db');

// Enable detailed logging for debugging
const logRequests = (req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
};

app.use(logRequests);

// CORS configuration
app.use(cors({
  origin: '*', // Allow from any origin for testing - change to specific origin in production
  methods: ['GET', 'POST', 'DELETE'],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.static('public'));

// Registration endpoint
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  console.log('Registration attempt:', email);
  
  db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, password], 
    function(err) {
      if(err) {
        console.error('Registration error:', err.message);
        return res.status(400).json({ error: 'Registration failed. Email may already exist.' });
      }
      console.log('Registration successful for:', email);
      res.json({ success: true });
  });
});

// Login endpoint
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', email);
  
  db.get('SELECT * FROM users WHERE email = ? AND password = ?', [email, password],
    (err, row) => {
      if(err) {
        console.error('Login error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if(!row) {
        console.log('Login failed for:', email);
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      console.log('Login successful for:', email);
      res.json({ success: true, user: { id: row.id, email: row.email } });
  });
});

// Add book to wishlist
app.post('/api/wishlist', (req, res) => {
  const { user_id, book_id } = req.body;
  console.log(`Received request to add book ${book_id} for user ${user_id}`);

  if (!user_id || !book_id) {
    console.log("Missing user_id or book_id in request");
    return res.status(400).json({ error: 'Missing user_id or book_id' });
  }

  // Check if the book is already in the wishlist
  db.get(
    'SELECT * FROM wishlist WHERE user_id = ? AND book_id = ?',
    [user_id, book_id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }

      if (row) {
        console.log(`Book ${book_id} is already in wishlist for user ${user_id}`);
        return res.status(409).json({ error: 'Book is already in wishlist' });
      }

      // Insert into wishlist
      db.run(
        'INSERT INTO wishlist (user_id, book_id) VALUES (?, ?)',
        [user_id, book_id],
        function (err) {
          if (err) {
            console.error('Error inserting into wishlist:', err.message);
            return res.status(500).json({ error: 'Failed to add book to wishlist' });
          }

          console.log(`✅ Book ${book_id} successfully added to wishlist for user ${user_id}`);
          res.json({ success: true });
        }
      );
    }
  );
});

// Get user's wishlist
app.get('/api/books/:genre', (req, res) => {
  const genreParam = req.params.genre;
  console.log(`Genre requested: ${genreParam}`);

  // Map frontend genre values to database genre values
  const genreMap = {
    'fiction': 'Fiction',
    'mystery': 'Mystery',
    'scifi': 'Science Fiction',
    'fantasy': 'Fantasy',
    'nonfiction': 'Non-Fiction'
  };

  const genre = genreMap[genreParam] || genreParam;
  console.log(`Mapped genre: ${genre}`);

  const query = 'SELECT id, title, author, genre, rating FROM books WHERE LOWER(genre) = LOWER(?)';
  console.log(`Executing SQL Query: ${query} with param: ${genre}`);

  db.all(query, [genre], (err, rows) => {
    if (err) {
      console.error('Error fetching books by genre:', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ Found ${rows.length} books for genre: ${genre}`);
    res.json(rows);
  });
});

// Remove book from wishlist
app.delete('/api/wishlist/:userId/:bookId', (req, res) => {
  const { userId, bookId } = req.params;
  console.log(`Removing book ${bookId} from wishlist for user ${userId}`);
  
  if (!userId || !bookId) {
    return res.status(400).json({ error: 'Missing userId or bookId parameter' });
  }
  
  db.run(
    'DELETE FROM wishlist WHERE user_id = ? AND book_id = ?',
    [userId, bookId],
    function(err) {
      if (err) {
        console.error('Error removing from wishlist:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        console.log(`No wishlist item found for user ${userId} and book ${bookId}`);
        return res.status(404).json({ error: 'Wishlist item not found' });
      }
      
      console.log(`Book ${bookId} removed from wishlist for user ${userId}`);
      res.json({ success: true });
    }
  );
});

// Get user's wishlist
app.get('/api/wishlist/:userId', (req, res) => {
  const userId = req.params.userId;
  console.log(`Fetching wishlist for user: ${userId}`);

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  const query = `
    SELECT books.id, books.title, books.author, books.genre, books.rating, books.download_url 
    FROM books 
    JOIN wishlist ON books.id = wishlist.book_id 
    WHERE wishlist.user_id = ?
  `;
  
  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('Error fetching wishlist:', err.message);
      return res.status(500).json({ error: err.message });
    }

    console.log(`✅ Wishlist data for user ${userId}:`, rows);
    res.json(rows);
  });
});

// Get all users (admin only)
app.get('/api/users', (req, res) => {
  console.log('Fetching all users');
  
  db.all('SELECT * FROM users', [], (err, rows) => {
    if (err) {
      console.error('Error fetching users:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    console.log(`✅ Found ${rows.length} users`);
    res.json(rows);
  });
});

// Update user (admin only)
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { email, password } = req.body;
  console.log(`Updating user ${userId}`);
  
  if (!userId || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // If password is provided, update both email and password
  if (password) {
    db.run(
      'UPDATE users SET email = ?, password = ? WHERE id = ?',
      [email, password, userId],
      function(err) {
        if (err) {
          console.error('Error updating user:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✅ User ${userId} updated`);
        res.json({ success: true });
      }
    );
  } else {
    // Update only email
    db.run(
      'UPDATE users SET email = ? WHERE id = ?',
      [email, userId],
      function(err) {
        if (err) {
          console.error('Error updating user:', err.message);
          return res.status(500).json({ error: err.message });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        console.log(`✅ User ${userId} updated`);
        res.json({ success: true });
      }
    );
  }
});

// Delete user (admin only)
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  console.log(`Deleting user ${userId}`);
  
  // First, delete all wishlist entries for the user
  db.run('DELETE FROM wishlist WHERE user_id = ?', [userId], function(err) {
    if (err) {
      console.error('Error deleting user wishlist entries:', err.message);
      return res.status(500).json({ error: err.message });
    }
    
    // Then delete the user
    db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
      if (err) {
        console.error('Error deleting user:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log(`✅ User ${userId} deleted`);
      res.json({ success: true });
    });
  });
});

// Get all books
app.get('/api/books/all', (req, res) => {
  db.all('SELECT * FROM books', [], (err, rows) => {
    if (err) {
      console.error('Error fetching books:', err);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get a specific book
app.get('/api/books/:id', (req, res) => {
  const bookId = req.params.id;
  db.get('SELECT * FROM books WHERE id = ?', [bookId], (err, row) => {
    if (err) {
      console.error('Error fetching book:', err);
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(row);
  });
});


// Add a new book
app.post('/api/books', (req, res) => {
  const { title, author, genre, rating, download_url } = req.body;
  
  if (!title || !author || !genre) {
    return res.status(400).json({ error: 'Title, author, and genre are required' });
  }
  
  const sql = `
    INSERT INTO books (title, author, genre, rating, download_url) 
    VALUES (?, ?, ?, ?, ?)
  `;

  
  db.run(sql, [title, author, genre, rating || '', download_url || ''], function(err) {
    if (err) {
      console.error('Error adding book:', err);
      return res.status(500).json({ error: err.message });
    }
    
    res.json({ 
      success: true, 
      id: this.lastID,
      message: 'Book added successfully'
    });
  });
});

// Update a book
app.put('/api/books/:id', (req, res) => {
  const bookId = req.params.id;
  const { title, author, genre, rating, download_url } = req.body;
  
  if (!title || !author || !genre) {
    return res.status(400).json({ error: 'Title, author, and genre are required' });
  }
  
  const sql = `
    UPDATE books 
    SET title = ?, 
        author = ?, 
        genre = ?, 
        rating = ?, 
        download_url = ?
    WHERE id = ?
  `;
  
  db.run(sql, [title, author, genre, rating || '', download_url || '', bookId], function(err) {
    if (err) {
      console.error('Error updating book:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Book updated successfully'
    });
  });
});

// Delete a book
app.delete('/api/books/:id', (req, res) => {
  const bookId = req.params.id;
  
  db.run('DELETE FROM books WHERE id = ?', [bookId], function(err) {
    if (err) {
      console.error('Error deleting book:', err);
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'Book deleted successfully'
    });
  });
});

app.get('/api/books/free', (req, res) => {
  const query = 'SELECT id, title, author, genre, rating FROM books'; // Removed WHERE clause
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Error fetching free books:', err.message);
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a bookmark
app.post('/api/bookmarks', (req, res) => {
  const { user_id, book_id, page } = req.body;
  console.log(`Adding/updating bookmark for user ${user_id}, book ${book_id}, page ${page}`);
  
  if (!user_id || !book_id || !page) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check if bookmark already exists
  db.get(
    'SELECT * FROM bookmarks WHERE user_id = ? AND book_id = ?',
    [user_id, book_id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (row) {
        // Update existing bookmark
        db.run(
          'UPDATE bookmarks SET page = ? WHERE user_id = ? AND book_id = ?',
          [page, user_id, book_id],
          function(err) {
            if (err) {
              console.error('Error updating bookmark:', err.message);
              return res.status(500).json({ error: 'Failed to update bookmark' });
            }
            console.log(`✅ Bookmark updated for user ${user_id}, book ${book_id}`);
            res.json({ success: true });
          }
        );
      } else {
        // Insert new bookmark
        db.run(
          'INSERT INTO bookmarks (user_id, book_id, page) VALUES (?, ?, ?)',
          [user_id, book_id, page],
          function(err) {
            if (err) {
              console.error('Error inserting bookmark:', err.message);
              return res.status(500).json({ error: 'Failed to add bookmark' });
            }
            console.log(`✅ Bookmark added for user ${user_id}, book ${book_id}`);
            res.json({ success: true });
          }
        );
      }
    }
  );
});

// Get user's bookmarks
app.get('/api/bookmarks/:userId', (req, res) => {
  const userId = req.params.userId;
  console.log(`Fetching bookmarks for user: ${userId}`);
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }
  
  db.all(
    'SELECT book_id, page FROM bookmarks WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching bookmarks:', err.message);
        return res.status(500).json({ error: err.message });
      }
      
      console.log(`✅ Found ${rows.length} bookmarks for user ${userId}`);
      res.json(rows);
    }
  );
});

// Add audiobooks endpoint
app.get('/api/audiobooks', (req, res) => {
  const query = 'SELECT id, title, author, genre, rating, download_url FROM books WHERE is_audiobook = 1';
  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);
  
  // Add this for debugging - check if tables exist and have proper structure
  db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, tables) => {
    if (err) {
      console.error('Error checking database tables:', err.message);
      return;
    }
    console.log('Database tables:', tables.map(t => t.name).join(', '));
    
    // Check wishlist table structure
    db.all("PRAGMA table_info(wishlist)", [], (err, columns) => {
      if (err) {
        console.error('Error checking wishlist table structure:', err.message);
        return;
      }
      console.log('Wishlist table structure:', columns.map(c => `${c.name} (${c.type})`).join(', '));
    });
  });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));