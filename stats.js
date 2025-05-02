/**
 * Generates a deterministic "cozy" HSL color string based on an input string.
 * Uses a simple hashing algorithm to create a hue value, keeping saturation and lightness constant
 * for a consistent color palette.
 *
 * @param {string} str - The input string (e.g., a label, category name).
 * @returns {string} An HSL color string (e.g., "hsl(120, 60%, 70%)").
 */
function stringToCozyColor(str) {
    let hash = 0;
    // Simple hash function (variant of djb2) to convert string to a number.
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Convert the hash to a hue value (0-359 degrees).
    const hue = hash % 360;
    // Return HSL color with fixed saturation (60%) and lightness (70%) for a "cozy" feel.
    return `hsl(${hue}, 60%, 70%)`;
}

/**
 * Generates and displays a doughnut chart using Chart.js.
 * Counts the occurrences of values for a specified property within the data array
 * and renders the chart in the specified canvas element.
 *
 * @param {object[]} data - An array of objects (e.g., book data).
 * @param {string} label - The key within each data object to group and count by (e.g., 'Genre').
 * @param {string} title - The title to display above the chart.
 * @param {string} elementId - The ID of the HTML canvas element where the chart will be drawn.
 */
function generateChart(data, label, title, elementId, type ='doughnut') {
    // Get the 2D rendering context for the specified canvas element.
    const ctx = document.getElementById(elementId).getContext('2d');
    // Object to store the counts of each unique value for the given label.
    const counts = {};
    
    // Group small values into "Other" (e.g., < 3 books)
    const groupedCounts = {};
    let otherCount = 0;
    Object.entries(counts).forEach(([key, count]) => {
        if (count < 3) {
            otherCount += count;
            } else {
              groupedCounts[key] = count;
            }
    });
    if (otherCount > 0) {
        groupedCounts['Other'] = otherCount;
    }

    // Iterate over the data array to count occurrences.
    data.forEach(item => {
        // Get the value for the specified label, default to 'Unknown' if missing.
        const value = item[label] || 'Unknown';
        // Increment the count for this value.
        counts[value] = (counts[value] || 0) + 1;
    });

    const labels = Object.keys(groupedCounts);
    const dataValues = Object.values(groupedCounts);
    const backgroundColors = labels.map(label => stringToCozyColor(label));

     new Chart(ctx, {
        type: type,
        data: {
          labels: labels,
          datasets: [{
            label: `${label} Distribution`,
            data: dataValues,
            backgroundColor: backgroundColors,
            borderColor: '#ffffff',
            borderWidth: 1
          }]
        },
        options: {
          plugins: {
            title: {
              display: true,
              text: title,
              font: { size: 20 }
            },
            legend: {
              position: 'bottom',
              onClick: (e, legendItem) => displayBooksByLabel(label, legendItem.text)
            }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      }
    
  /*  // Extract the unique labels (keys) from the counts object.
    const chartLabels = Object.keys(counts);
    // Generate a background color for each label using the stringToCozyColor function.
    const backgroundColors = chartLabels.map(labelValue => stringToCozyColor(labelValue));

    // Create a new Chart.js doughnut chart instance.
    new Chart(ctx, {
        type: 'doughnut', // Specify the chart type.
        data: {
            labels: chartLabels, // Labels for each segment (e.g., different genres).
            datasets: [{
                label: `${label} Distribution`, // Label for the dataset itself.
                data: Object.values(counts), // The actual count data for each segment.
                backgroundColor: backgroundColors, // Colors for each segment.
                borderColor: '#ffffff', // Border color for segments.
                borderWidth: 1 // Border width for segments.
            }]
        },
        options: {
            plugins: {
                // Configure the chart title plugin.
                title: {
                    display: true,
                    text: title,
                    font: {
                        size: 20
                    }
                },
                // Configure the chart legend plugin.
                legend: {
                    position: 'bottom', // Display legend below the chart.
                    // Custom click handler for legend items.
                    onClick: function(event, legendItem) {
                        // When a legend item is clicked, get the corresponding value.
                        const value = legendItem.text;
                        // Call displayBooksByLabel to show books matching the clicked label/value.
                        displayBooksByLabel(label, value);
                    }
                }
            },
            responsive: true, // Make the chart responsive to container size changes.
            maintainAspectRatio: false // Allow the aspect ratio to change on resize.
        }
    }*/
    );
}

// Global array to store the filtered book data after loading.
let globalBooks = [];

// Add an event listener to run code once the DOM is fully loaded and parsed.
window.addEventListener('DOMContentLoaded', () => {
    // Use PapaParse library to fetch and parse the CSV file.
    Papa.parse("goodreads_fully_enriched.csv", {
        download: true, // Instruct PapaParse to download the file from the URL.
        header: true,   // Treat the first row as header data (creates objects with keys).
        // Callback function executed when parsing is complete.
        complete: function(results) {
            // Filter the parsed data: keep books that have a 'Title'
            // and are on the 'Exclusive Shelf' named 'read'.
            globalBooks = results.data.filter(book =>
                book['Title'] &&
                book['Exclusive Shelf'] === 'read'
            );
            globalBooks.forEach(book => {
              if (!book['Year Published'] || isNaN(book['Year Published'])) {
                book['Year Published'] = 'Unknown';
              }
            });
            // Generate the initial chart based on 'Genre', 'Year Published', 'Publisher', and 'My Rating' distribution.
            generateChart(globalBooks, 'Genre', 'Books by Genre', 'subgenreChart');            
            generateChart(globalBooks, 'Year Published', 'Books by Year Published', 'yearReadChart', 'bar');
            generateChart(globalBooks, 'Publisher', 'Books by Publisher', 'publisherChart');
            generateChart(globalBooks, 'My Rating', 'Books by My Rating', 'ratingChart');

            // Optional: uncomment to display all read books initially
            // displayBooksByLabel('Exclusive Shelf', 'read'); // Or a more specific initial view
        }
    });
});

/**
 * Filters the global book list based on a label and value, then displays
 * the matching books as interactive cards in the designated container.
 *
 * @param {string} label - The key in the book objects to filter by (e.g., 'Genre').
 * @param {string} value - The specific value to match for the given label (e.g., 'Fantasy').
 */
function displayBooksByLabel(label, value) {
    // Get the container element where book cards will be displayed.
    const booksContainer = document.getElementById('books-container');
    // Clear any previously displayed books or messages.
    booksContainer.innerHTML = '';

    // Filter the globalBooks array to find books matching the label and value.
    const filteredBooks = globalBooks.filter(book => book[label] === value);

    // Create and add a sub-header indicating the filter criteria and book count.
    const subHeader = document.createElement('h2');
    subHeader.className = 'sub-header';
    subHeader.innerHTML = `📚 ${value} — ${filteredBooks.length} book(s)`;
    booksContainer.appendChild(subHeader);

    // If no books match the filter, display a message and exit.
    if (filteredBooks.length === 0) {
        booksContainer.innerHTML += `<p>No books found in: ${value}</p>`;
        return;
    }

    // Create a container div for the book cards grid/layout.
    const bookContainer = document.createElement('div');
    bookContainer.className = 'book-container'; // Apply styling for the book grid.

    // Iterate over the filtered books to create and add a card for each.
    filteredBooks.forEach((book, index) => {
        const bookDiv = document.createElement('div');
        // Clean the ISBN: remove any non-numeric/X characters (sometimes Goodreads includes extra chars).
        const isbn = book.ISBN?.replace(/[^0-9Xx]/g, '');
        // Construct the cover image URL using Open Library Covers API (Medium size).
        // Use a default cover image if ISBN is missing or invalid.
        const coverUrl = isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
            : 'https://kellybearclawz.github.io/mybooks/default-cover.jpg'; // Provide a path to your default image

        // Get the user's rating, default to 0 if not present or invalid.
        const rating = parseInt(book['My Rating']) || 0;

        // Apply CSS classes for styling and fade-in animation.
        bookDiv.className = 'book-card fade-in';
        // Stagger the fade-in animation for each card.
        bookDiv.style.animationDelay = `${index * 0.1}s`;
        // Set the inner HTML of the book card with book details.
        bookDiv.innerHTML = `
            <img src="${coverUrl}" alt="Cover of ${book.Title}" onerror="this.onerror=null;this.src='https://kellybearclawz.github.io/mybooks/default-cover.jpg';" /> <div>
                <p><strong>${book.Title}</strong><br>
                by ${book.Author}<br>
                Rating: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p> <p><a href="${book['Goodreads URL']}" target="_blank">Goodreads Link</a></p>
            </div>
        `;
        // Append the newly created book card to the book container.
        bookContainer.appendChild(bookDiv);
    });

    // Append the container holding all book cards to the main display area.
    booksContainer.appendChild(bookContainer);
}
