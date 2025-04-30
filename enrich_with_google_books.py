import pandas as pd
import requests
import time

# Load the Goodreads export
#df = pd.read_csv("goodreads_library_export.csv") - error with the Genre column in your CSV was likely empty or numeric, so pandas inferred its type as float64. 
#df = pd.read_csv("goodreads_library_export.csv", dtype={"Genre": "string"})
df = pd.read_csv("goodreads_library_export.csv", dtype={
    "Genre": "string",
    "Original Publication Year": "string"
})



# Ensure ISBN13 is a string of 13 digits
df["ISBN13"] = df["ISBN13"].astype(str).str.extract(r'(\d{13})')

# Only enrich rows missing Genre or Publish Year
needs_enrichment = df[df["Genre"].isnull() | df["Original Publication Year"].isnull()]

def get_google_books_data(isbn):
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}"
    try:
        resp = requests.get(url)
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return {}

        volume_info = items[0].get("volumeInfo", {})
        genre = volume_info.get("categories", [None])[0]
        published_date = volume_info.get("publishedDate", "")
        publish_year = published_date[:4] if published_date else None

        return {
            "Genre": genre,
            "Publish Year": publish_year
        }

    except Exception as e:
        print(f"Error fetching ISBN {isbn}: {e}")
        return {}

# Enrich the rows
for idx, row in needs_enrichment.iterrows():
    isbn = row["ISBN13"]
    if pd.isna(isbn):
        continue
    result = get_google_books_data(isbn)
    for key, value in result.items():
        if key == "Publish Year" and pd.isna(row["Original Publication Year"]) and value:
            df.at[idx, "Original Publication Year"] = value
        elif key == "Genre" and pd.isna(row["Genre"]) and value:
            df.at[idx, "Genre"] = value
    time.sleep(1)  # Rate limiting

# Save to new CSV
df.to_csv("goodreads_enriched_google.csv", index=False)
print("✅ Enriched file saved as goodreads_enriched_google.csv")