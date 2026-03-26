from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB

# Sample data
texts = [
    "Apple MacBook Pro 16 inch",
    "Fresh Organic Apples pack",
    "Classmate Spider-Man Drawing Instruments Set",
    "ectoparasiticide pet care flea treatment tick prevention animal health VI-FI Forte dog spray cat spray",
    "dog food cat food",

]
labels = [
    "Electronics & Appliances|Laptops",
    "Grocery|Fruit",
    "Home & Office|Stationery",
    "Pet Care | Health Care",
    "Pet Care | Pet Food",
]

# 1. Vectorize
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)

# 2. Train
clf = MultinomialNB()
clf.fit(X, labels)

# 3. Predict
test_text = ["dog food"]
X_test = vectorizer.transform(test_text)
print(clf.predict(X_test))  # → Electronics & Appliances|Mobile Phones