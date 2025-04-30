import pandas as pd
import requests
import time
import re

# Load your previously enriched CSV (or the original if preferred)
df = pd.read_csv("goodreads_enriched_google.csv")

# Clean author names for lookup
df["Author Clean"] = df["Author"].str.replace(r"\(.*\)", "", regex=True).str.strip()
df["Author First Name"] = df["Author Clean"].str.extract(r"^([A-Za-z\-']+)")

# Filter only rows missing Gender/Nationality/Age
needs_gender = df["Author Gender"].isnull()
needs_nat_or_age = df["Author Nationality"].isnull() | df["Author Age When Written"].isnull()

def get_gender_from_first_name(first_name):
    if not first_name:
        return None
    try:
        resp = requests.get(f"https://api.genderize.io?name={first_name}")
        return resp.json().get("gender")
    except:
        return None

def get_wikidata_author_info(name):
    query = f"""
    SELECT ?birthYear ?nationalityLabel WHERE {{
      ?author ?label "{name}"@en .
      OPTIONAL {{ ?author wdt:P27 ?nationality. }}
      OPTIONAL {{
        ?author wdt:P569 ?birthDate.
        BIND(YEAR(?birthDate) AS ?birthYear)
      }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "en". }}
    }} LIMIT 1
    """
    url = "https://query.wikidata.org/sparql"
    headers = {"Accept": "application/sparql-results+json"}
    try:
        resp = requests.get(url, params={"query": query}, headers=headers)
        data = resp.json().get("results", {}).get("bindings", [])
        if not data:
            return None, None
        row = data[0]
        birth_year = int(row["birthYear"]["value"]) if "birthYear" in row else None
        nationality = row["nationalityLabel"]["value"] if "nationalityLabel" in row else None
        return birth_year, nationality
    except:
        return None, None

# Enrich gender
print("🔍 Enriching gender...")
for idx, row in df[needs_gender].iterrows():
    gender = get_gender_from_first_name(row["Author First Name"])
    if gender:
        df.at[idx, "Author Gender"] = gender
    time.sleep(0.5)  # Be nice to the free API

# Enrich nationality and calculate age
print("🌍 Enriching nationality and age...")
for idx, row in df[needs_nat_or_age].iterrows():
    author = row["Author Clean"]
    pub_year = row["Original Publication Year"]
    if pd.isna(author) or pd.isna(pub_year):
        continue
    birth_year, nationality = get_wikidata_author_info(author)
    if nationality:
        df.at[idx, "Author Nationality"] = nationality
    if birth_year:
        try:
            age = int(pub_year) - int(birth_year)
            df.at[idx, "Author Age When Written"] = age
        except:
            continue
    time.sleep(1.2)  # Avoid SPARQL rate limits

# Save final file
df.to_csv("goodreads_fully_enriched.csv", index=False)
print("✅ Saved as goodreads_fully_enriched.csv")