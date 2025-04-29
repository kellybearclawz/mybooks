import pandas as pd
import requests
import time

# Load your Goodreads CSV export
df = pd.read_csv("goodreads_library_export.csv")

# Clean ISBN13 and drop nulls
df["ISBN13"] = df["ISBN13"].astype(str).str.extract(r'(\d{13})')
books_to_enrich = df[df[["Genre", "Author Gender", "Author Nationality", "Author Age When Written"]].isnull().any(axis=1)]
books_with_isbn = books_to_enrich[books_to_enrich["ISBN13"].notnull()].copy()

def get_openlibrary_data(isbn):
    """Query Open Library API using ISBN and return relevant metadata."""
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&jscmd=details&format=json"
    try:
        response = requests.get(url)
        data = response.json().get(f"ISBN:{isbn}", {}).get("details", {})
        
        subjects = data.get("subjects", [])
        subject_names = [s["name"] for s in subjects if "name" in s]
        genre = subject_names[0] if subject_names else None

        author_name = data.get("authors", [{}])[0].get("name", None)
        publish_year = data.get("publish_date", "")[-4:]
        birth_year = data.get("by_statement", "")
        
        return {
            "Genre": genre,
            "Author Name": author_name,
            "Publish Year": publish_year,
        }
    except Exception as e:
        print(f"Error fetching {isbn}: {e}")
        return {}

# Apply Open Library API
enriched_rows = []
for idx, row in books_with_isbn.iterrows():
    isbn = row["ISBN13"]
    data = get_openlibrary_data(isbn)
    for key, value in data.items():
        df.at[idx, key] = value
    time.sleep(1)  # Avoid rate limiting

# Optional: infer author gender/nationality using external packages like genderize.io or NameAPI

# Save enriched file
df.to_csv("goodreads_enriched.csv", index=False)
print("Enriched data saved to goodreads_enriched.csv")
