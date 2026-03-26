import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# -----------------------------
# 1. Load JSON data
# -----------------------------
with open("product_data.json", "r", encoding="utf-8") as f:
    products = json.load(f)

# -----------------------------
# 2. Prepare features (title+tags) and combined labels
# -----------------------------
texts = []
labels = []

for p in products:
    if all(k in p for k in ["title", "tags", "category", "productType"]):
        title = p["title"].strip()
        tags_text = " ".join(p["tags"]) if isinstance(p["tags"], list) else ""
        full_text = f"{title} {tags_text}".strip()
        
        label = f"{p['category'].strip()}|{p['productType'].strip()}"
        
        if full_text and label:
            texts.append(full_text)
            labels.append(label)

# -----------------------------
# 3. Vectorize text (title + tags)
# -----------------------------
vectorizer = TfidfVectorizer()  # unigrams + bigrams
X = vectorizer.fit_transform(texts)

# -----------------------------
# 4. Train classifier
# -----------------------------
clf = MultinomialNB(alpha=1.0)
clf.fit(X, labels)

# -----------------------------
# 5. Predict new products
# -----------------------------
test_texts = [
    "dog food",
    "papaya",
    "Fresh organic bananas pack",
    "Basmati Rice",
    "Daawat Pulav Basmati Rice (Slender Grains)",
    "fresh cabbage",
    "organic capsicum",
    "pedigree",
    "maska chaska biscuits"
]

X_test = vectorizer.transform(test_texts)
predictions = clf.predict(X_test)

# -----------------------------
# 6. Print results
# -----------------------------
for text, label in zip(test_texts, predictions):
    print(f"Product: '{text}' → Predicted Category: '{label}'")