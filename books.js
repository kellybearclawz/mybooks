/**
 * Retrieves the year from a date string.
 * @param {string} dateString - The date string (e.g., "2023-10-26").
 * @returns {number} The year (e.g., 2023).
 */
function getReadYear(dateString) {
  const date = new Date(dateString);
  return date.getFullYear();
}

/**
 * Cleans up an ISBN-13 string by removing non-numeric characters and 'X'.
 * @param {string} isbn13 - The ISBN-13 string.
 * @returns {string} The cleaned ISBN-13 string.
 */
function cleanISBN(isbn13) {
  return isbn13?.replace(/[^0-9Xx]/g, '');
}

/**
 * Renders the book data onto the page, organized by year.
 * @param {Array<object>} data - An array of book objects.
 */
async function renderBooks(data) {
  const shelf = document.getElementById('bookshelf');

  // Group books by read year
  const booksByYear = {};
  for (const book of data) {
    const year = getReadYear(book['Date Read']);
    if (!booksByYear[year]) {
      booksByYear[year] = [];
    }
    booksByYear[year].push(book);
  }

  // Create jump links
  const years = Object.keys(booksByYear).sort((a, b) => b - a);
  const yearLinksDiv = document.createElement('div');
  yearLinksDiv.className = 'year-links';
  yearLinksDiv.innerHTML = years.map(y => `<a href="#year-${y}">${y}</a>`).join(' | ');
  shelf.appendChild(yearLinksDiv);

  // Render each year's section
  for (const year of years) {
    const section = document.createElement('section');
    section.id = `year-${year}`;
    section.innerHTML = `<h2>${year}</h2>`;

    const bookContainer = document.createElement('div');
    bookContainer.className = 'book-container';

    booksByYear[year].forEach((book, index) => {
      const isbn = cleanISBN(book.ISBN);
      const coverUrl = isbn
        ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
        : 'https://kellybearclawz.github.io//mybooks/default-cover.jpg';

      const bookDiv = document.createElement('div');
      bookDiv.className = 'book-card fade-in';
      bookDiv.style.animationDelay = `${index * 0.1}s`;

      bookDiv.innerHTML = `
        <img src="${coverUrl}" alt="Cover of ${book.Title}" onerror="this.onerror=null;this.src='https://kellybearclawz.github.io//mybooks/default-cover.jpg';" />
        <div>
          <p><strong>${book.Title}</strong><br>
          by ${book.Author}<br>
          Date Read: ${book['Date Read']}<br>
          Rating: ${'★'.repeat(book['My Rating'])}${'☆'.repeat(5 - book['My Rating'])}
          <p><a href="${book['Goodreads URL']}" target="_blank">Goodreads Link</a></p>
        </div>
      `;
      bookContainer.appendChild(bookDiv);
    });

    section.appendChild(bookContainer);

    // Add "Back to Top" link under each section
    const backToTop = document.createElement('div');
    backToTop.className = 'back-to-top';
    backToTop.innerHTML = `<a href="#top">↑ Back to Top ↑</a>`;
    section.appendChild(backToTop);

    shelf.appendChild(section);
  }

  // Add one last back to top link
  const topLink = document.createElement('div');
  topLink.innerHTML = `<a href="#top" id="top-link">↑ Back to Top ↑</a>`;
  shelf.appendChild(topLink);
}

/**
 * Sets up the event listener for the rating filter dropdown.
 * @param {Array<object>} cleanedData - The cleaned book data.
 */
function setupRatingFilter(cleanedData) {
    const ratingSelect = document.getElementById('ratingFilter');
    ratingSelect.addEventListener('change', () => {
        const minRating = parseInt(ratingSelect.value, 10);
        const filtered = cleanedData.filter(book => parseInt(book['My Rating'], 10) >= minRating);
        renderBooks(filtered);
    });
}

// Parse the CSV file and render the books
Papa.parse("goodreads_fully_enriched.csv", {
  download: true,
  header: true,
  complete: function(results) {
    const cleanedData = results.data.filter(book =>
      book['Title'] &&
      book['Date Read'] &&
      book['Exclusive Shelf'] === 'read'
    );
    setupRatingFilter(cleanedData); // <- setup dropdown listener
    renderBooks(cleanedData);       // <- initial render
  }
});
