function stringToCozyColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 60%, 70%)`;
}

function generateChart(data, label, title, elementId) {
    const ctx = document.getElementById(elementId).getContext('2d');
    const counts = {};

    data.forEach(book => {
        const value = book[label] || 'Unknown';
        counts[value] = (counts[value] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const backgroundColors = labels.map(label => stringToCozyColor(label));

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: `${label} Distribution`,
                data: Object.values(counts),
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
                    font: {
                        size: 20
                    }
                },
                legend: {
                    position: 'bottom',
                    onClick: function(event, legendItem) {
                        const value = legendItem.text;
                        displayBooksByLabel(label, value);
                    }
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

let globalBooks = [];

window.addEventListener('DOMContentLoaded', () => {
    Papa.parse("goodreads_fully_enriched.csv", {
        download: true,
        header: true,
        complete: function(results) {
            globalBooks = results.data.filter(book =>
                book['Title'] &&
                book['Exclusive Shelf'] === 'read'
            );
            generateChart(globalBooks, 'Sub-Genre', 'Books by Sub-Genre', 'subgenreChart');
        }
    });
});

function displayBooksByLabel(label, value) {
    const booksContainer = document.getElementById('books-container');
    booksContainer.innerHTML = '';

    const filteredBooks = globalBooks.filter(book => book[label] === value);

    const subHeader = document.createElement('h2');
    subHeader.className = 'sub-header';
    subHeader.innerHTML = `📚 ${value} — ${filteredBooks.length} book(s)`;
    booksContainer.appendChild(subHeader);

    if (filteredBooks.length === 0) {
        booksContainer.innerHTML += `<p>No books found in: ${value}</p>`;
        return;
    }

    const bookContainer = document.createElement('div');
    bookContainer.className = 'book-container';

    filteredBooks.forEach((book, index) => {
        const bookDiv = document.createElement('div');
        const isbn = book.ISBN?.replace(/[^0-9Xx]/g, '');
        const coverUrl = isbn
            ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`
            : 'https://kellybearclawz.github.io/mybooks/default-cover.jpg';

        const rating = parseInt(book['My Rating']) || 0;

        bookDiv.className = 'book-card fade-in';
        bookDiv.style.animationDelay = `${index * 0.1}s`;
        bookDiv.innerHTML = `
            <img src="${coverUrl}" alt="Cover of ${book.Title}" />
            <div>
                <p><strong>${book.Title}</strong><br>
                by ${book.Author}<br>
                Rating: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</p>
                <p><a href="${book['Goodreads URL']}" target="_blank">Goodreads Link</a></p>
            </div>
        `;
        bookContainer.appendChild(bookDiv);
    });

    booksContainer.appendChild(bookContainer);
}
