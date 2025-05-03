 // --- Helper Functions ---

        /**
         * Generates a deterministic "cozy" HSL color string based on an input string.
         * Using slightly adjusted saturation/lightness for the new theme.
         * @param {string} str - The input string (e.g., a label, category name).
         * @returns {string} An HSL color string (e.g., "hsl(120, 55%, 78%)").
         */
        function stringToCozyColor(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                hash = str.charCodeAt(i) + ((hash << 5) - hash);
                hash = hash & hash; // Convert to 32bit integer
            }
            const hue = Math.abs(hash % 360);
            // Adjusted saturation and lightness for the new theme
            return `hsl(${hue}, 55%, 78%)`;
        }

        // --- Chart Generation ---

        const chartInstances = {};

        /**
         * Generates and displays a chart using Chart.js.
         * (Function remains largely the same, but styling comes from CSS)
         * @param {object[]} data - Array of book objects.
         * @param {string} propertyKey - The key within each book object to group and count by.
         * @param {string} chartTitle - The title to display above the chart.
         * @param {string} elementId - The ID of the HTML canvas element.
         * @param {string} [chartType='doughnut'] - Type of chart.
         * @param {number} [otherThreshold=3] - Group items below this threshold into "Other".
         */
        function generateChart(data, propertyKey, chartTitle, elementId, chartType = 'doughnut', otherThreshold = 3) {
            const canvas = document.getElementById(elementId);
            if (!canvas) {
                console.warn(`Canvas element #${elementId} not found`);
                return;
            }
            const ctx = canvas.getContext('2d');

            if (chartInstances[elementId]) {
                chartInstances[elementId].destroy();
            }

            // --- Data Processing (same as before) ---
            const counts = {};
            data.forEach(item => {
                const value = item[propertyKey] || 'Unknown';
                const key = (propertyKey === 'Year Published' && value !== 'Unknown') ? String(value) : value;
                counts[key] = (counts[key] || 0) + 1;
            });

            const groupedCounts = {};
            let otherCount = 0;
            let hasOther = false;
            Object.entries(counts).forEach(([key, count]) => {
                if (count < otherThreshold && key !== 'Unknown') {
                    otherCount += count;
                    hasOther = true;
                } else {
                    groupedCounts[key] = count;
                }
            });
            if (hasOther && otherCount > 0) {
                groupedCounts['Other'] = otherCount;
            }

            let labels = Object.keys(groupedCounts);
            let dataValues = Object.values(groupedCounts);

             // --- Sorting (same as before) ---
            if (chartType === 'bar' && propertyKey === 'Year Published') {
                const sortedEntries = Object.entries(groupedCounts)
                    .filter(([key]) => !isNaN(key))
                    .sort(([keyA], [keyB]) => parseInt(keyA) - parseInt(keyB));
                const unknownEntry = groupedCounts['Unknown'] ? ['Unknown', groupedCounts['Unknown']] : null;
                const otherEntry = groupedCounts['Other'] ? ['Other', groupedCounts['Other']] : null;
                labels = sortedEntries.map(entry => entry[0]);
                dataValues = sortedEntries.map(entry => entry[1]);
                if (unknownEntry) { labels.push(unknownEntry[0]); dataValues.push(unknownEntry[1]); }
                if (otherEntry) { labels.push(otherEntry[0]); dataValues.push(otherEntry[1]); }
            } else if (chartType === 'doughnut' || chartType === 'pie') {
                 const sortedEntries = Object.entries(groupedCounts)
                    .sort(([, countA], [, countB]) => countB - countA);
                 labels = sortedEntries.map(entry => entry[0]);
                 dataValues = sortedEntries.map(entry => entry[1]);
            }

            const backgroundColors = labels.map(label => stringToCozyColor(label));
            // Make border slightly darker version of background
            const borderColors = backgroundColors.map(hslColor => {
                const match = hslColor.match(/hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)/);
                if (match) {
                    const [_, h, s, l] = match;
                    return `hsl(${h}, ${s}%, ${Math.max(0, parseFloat(l) - 10)}%)`; // Decrease lightness by 10%
                }
                return '#cccccc'; // Fallback border color
            });


            // --- Chart Configuration ---
            chartInstances[elementId] = new Chart(ctx, {
                type: chartType,
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${propertyKey} Distribution`,
                        data: dataValues,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false, // Crucial for custom CSS container sizing
                    plugins: {
                        title: {
                            display: true,
                            text: chartTitle,
                            font: { size: 18, family: 'Georgia, serif', weight: 'bold' }, // Match body font
                            color: '#4a3f35', // Match body text
                            padding: { top: 10, bottom: 20 }
                        },
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 20,
                                font: { size: 12, family: 'Georgia, serif' }, // Match body font
                                color: '#5e4b3c' // Match sub-header color
                            },
                            onClick: (e, legendItem, legend) => {
                                const value = legendItem.text;
                                displayBooksByLabel(propertyKey, value);
                                document.getElementById('books-display-section')?.scrollIntoView({ behavior: 'smooth' });
                            }
                        },
                        tooltip: {
                            enabled: true,
                            // Use external tooltip styling via CSS (.chartjs-tooltip)
                            external: function(context) {
                                // Tooltip Element
                                let tooltipEl = document.getElementById('chartjs-tooltip');

                                // Create element on first render
                                if (!tooltipEl) {
                                    tooltipEl = document.createElement('div');
                                    tooltipEl.id = 'chartjs-tooltip';
                                    tooltipEl.style.opacity = '0'; // Start hidden
                                    tooltipEl.style.position = 'absolute';
                                    tooltipEl.style.pointerEvents = 'none';
                                    tooltipEl.style.transition = 'opacity 0.1s ease';
                                    document.body.appendChild(tooltipEl);
                                }

                                // Hide if no tooltip
                                const tooltipModel = context.tooltip;
                                if (tooltipModel.opacity === 0) {
                                    tooltipEl.style.opacity = '0';
                                    return;
                                }

                                // Set Text
                                if (tooltipModel.body) {
                                    const titleLines = tooltipModel.title || [];
                                    const bodyLines = tooltipModel.body.map(b => b.lines);

                                    let innerHtml = '';

                                    titleLines.forEach(function(title) {
                                        innerHtml += `<div style="font-weight: bold; margin-bottom: 5px;">${title}</div>`;
                                    });

                                     bodyLines.forEach(function(body, i) {
                                         // Extract label and value for custom formatting
                                         const dataPoint = tooltipModel.dataPoints[i];
                                         const label = dataPoint.label || '';
                                         const value = dataPoint.formattedValue || '';
                                         const dataset = context.chart.data.datasets[dataPoint.datasetIndex];
                                         const total = dataset.data.reduce((acc, val) => acc + val, 0);
                                         const percentage = total > 0 ? ((dataPoint.parsed / total) * 100).toFixed(1) : 0;

                                         innerHtml += `<div>${label}: ${value} book(s) (${percentage}%)</div>`;
                                     });

                                    tooltipEl.innerHTML = innerHtml;
                                }

                                // Position
                                const position = context.chart.canvas.getBoundingClientRect();
                                tooltipEl.style.left = position.left + window.pageXOffset + tooltipModel.caretX + 'px';
                                tooltipEl.style.top = position.top + window.pageYOffset + tooltipModel.caretY + 'px';
                                tooltipEl.style.fontFamily = tooltipModel.options.bodyFont.family || 'Georgia, serif';
                                tooltipEl.style.fontSize = (tooltipModel.options.bodyFont.size || 12) + 'px';
                                tooltipEl.style.padding = tooltipModel.padding + 'px ' + tooltipModel.padding + 'px';
                                tooltipEl.classList.add('chartjs-tooltip'); // Apply CSS class

                                // Display
                                tooltipEl.style.opacity = '1';
                            }
                        }
                    },
                    // Specific options for bar charts
                    scales: chartType === 'bar' ? {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#5e4b3c', font: { family: 'Georgia, serif' } },
                            grid: { color: '#e0cfc2' } // Lighter grid line color
                        },
                        x: {
                            ticks: { color: '#5e4b3c', font: { family: 'Georgia, serif' } },
                            grid: { display: false }
                        }
                    } : {} // No scales for doughnut/pie
                }
            });
        }

        // --- Book Display ---

        let globalBooks = [];

        /**
         * Filters and displays books using custom CSS classes.
         * @param {string} propertyKey - The key to filter by.
         * @param {string} value - The value to match.
         */
        function displayBooksByLabel(propertyKey, value) {
            const booksContainer = document.getElementById('books-container');
            booksContainer.innerHTML = ''; // Clear previous books

            // Filter books (same logic as before)
             const filteredBooks = (value === 'Other')
                ? globalBooks.filter(book => {
                      const bookValue = book[propertyKey] || 'Unknown';
                      const counts = {};
                      globalBooks.forEach(item => {
                          const val = item[propertyKey] || 'Unknown';
                          counts[val] = (counts[val] || 0) + 1;
                      });
                      // Determine threshold based on propertyKey
                      let threshold = 3; // Default
                      if (propertyKey === 'Year Published' || propertyKey === 'Publisher') threshold = 5;
                      if (propertyKey === 'My Rating') threshold = 1; // Don't group ratings

                      return (counts[bookValue] || 0) < threshold && bookValue !== 'Unknown';
                  })
                : globalBooks.filter(book => String(book[propertyKey] || 'Unknown') === String(value)); // Ensure comparison is string-based


            // --- Create and add a sub-header ---
            const subHeader = document.createElement('h3');
            // Apply the class from custom CSS
            subHeader.className = 'sub-header';
            subHeader.innerHTML = `📚 ${propertyKey}: ${value} (${filteredBooks.length} book${filteredBooks.length !== 1 ? 's' : ''})`;
            booksContainer.appendChild(subHeader);

            // --- Handle No Books Found ---
            if (filteredBooks.length === 0) {
                booksContainer.innerHTML += `<p style="text-align: center; color: #7c5e44; margin-top: 1rem;">No books found for: ${value}</p>`;
                return;
            }

            // --- Create Grid Container for Book Cards ---
            const bookGridContainer = document.createElement('div');
            // Apply the class from custom CSS
            bookGridContainer.className = 'book-container';

            // --- Iterate and Create Book Cards ---
            filteredBooks.forEach((book, index) => {
                const bookDiv = document.createElement('div');

                // Clean ISBN and construct cover URL (same logic)
                const isbn = book.ISBN?.replace(/[^0-9Xx]/g, '');
                const placeholderText = `${book.Title || 'No Title'} - ${book.Author || 'No Author'}`.replace(/ /g, '+');
                // Adjusted placeholder colors to fit the theme
                const placeholderUrl = `https://placehold.co/256x386/f4e4d4/4a3f35?text=${encodeURIComponent(placeholderText)}`;
                 const coverUrl = isbn
                    ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg` // Medium size cover
                    : placeholderUrl;

                const rating = parseInt(book['My Rating']) || 0;
                // Using text stars, style them if needed
                const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

                // Apply classes from custom CSS
                bookDiv.className = 'book-card fade-in';
                bookDiv.style.animationDelay = `${index * 0.05}s`; // Stagger animation

                // Inner HTML for the book card - REMOVED TAILWIND CLASSES
                // Using the structure expected by the custom CSS (.book-card img, .book-card .book-info, etc.)
                bookDiv.innerHTML = `
                    <img src="${coverUrl}"
                         alt="Cover of ${book.Title || 'N/A'}"
                         onerror="this.onerror=null; this.src='${placeholderUrl}'; this.alt='Cover image unavailable';">
                    <div class="book-info">
                        <div class="book-details">
                            <p><strong>${book.Title || 'No Title'}</strong></p>
                            <p>by ${book.Author || 'Unknown Author'}</p>
                            <p title="${rating} out of 5 stars" style="color: #d4af37;">${stars}</p> </div>
                        <div class="book-link">
                           ${book['Goodreads URL'] ? `<a href="${book['Goodreads URL']}" target="_blank" rel="noopener noreferrer">View on Goodreads</a>` : '<span>No Goodreads Link</span>'}
                        </div>
                    </div>
                `;
                bookGridContainer.appendChild(bookDiv);
            });

            // Append the grid container to the main display area
            booksContainer.appendChild(bookGridContainer);
        }


        // --- Initialization ---

        window.addEventListener('DOMContentLoaded', () => {
            const csvFilePath = "goodreads_fully_enriched.csv"; // Ensure this path is correct

            Papa.parse(csvFilePath, {
                download: true,
                header: true,
                skipEmptyLines: true,
                complete: function(results) {
                    // Error and empty data handling (same as before)
                    if (results.errors.length > 0) {
                        console.error("CSV Parsing Errors:", results.errors);
                         document.getElementById('books-container').innerHTML = `<p style="color: red; font-weight: bold; text-align: center;">Error loading or parsing book data from ${csvFilePath}. Please check the file path and format.</p>`;
                        return;
                    }
                    if (!results.data || results.data.length === 0) {
                         console.warn("CSV file loaded, but no data found or parsed.");
                         document.getElementById('books-container').innerHTML = `<p style="color: orange; font-weight: bold; text-align: center;">No book data found in ${csvFilePath}.</p>`;
                         return;
                    }

                    // Data processing (same as before)
                    globalBooks = results.data.filter(book =>
                        book['Title'] && book['Exclusive Shelf'] === 'read'
                    ).map(book => {
                        const year = book['Year Published'];
                        if (!year || isNaN(parseInt(year)) || parseInt(year) <= 0) {
                            book['Year Published'] = 'Unknown';
                        } else {
                            book['Year Published'] = parseInt(year); // Keep as number for sorting
                        }
                        book['My Rating'] = String(parseInt(book['My Rating']) || 0); // Ensure rating is string for consistency
                        return book;
                    });

                    console.log(`Loaded and filtered ${globalBooks.length} read books.`);

                    // --- Generate Initial Charts ---
                    // Define thresholds explicitly for clarity
                    const genreThreshold = 3;
                    const yearThreshold = 5;
                    const publisherThreshold = 5;
                    const ratingThreshold = 1; // Don't group ratings

                    generateChart(globalBooks, 'Genre', 'Books by Genre', 'genreChart', 'doughnut', genreThreshold);
                    generateChart(globalBooks, 'Year Published', 'Books by Year Published', 'yearPublishedChart', 'bar', yearThreshold);
                    generateChart(globalBooks, 'Publisher', 'Books by Publisher', 'publisherChart', 'doughnut', publisherThreshold);
                    // Ensure 'My Rating' uses the correct threshold and type
                    generateChart(globalBooks, 'My Rating', 'Books by Rating', 'ratingChart', 'pie', ratingThreshold);
                },
                error: function(error) {
                     console.error("Error fetching or parsing CSV:", error);
                     document.getElementById('books-container').innerHTML = `<p style="color: red; font-weight: bold; text-align: center;">Failed to load book data from ${csvFilePath}. Error: ${error.message}</p>`;
                }
            });
        });
