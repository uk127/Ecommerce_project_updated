import torch
from transformers import BlipProcessor, BlipForConditionalGeneration, AutoTokenizer, AutoModelForSeq2SeqLM
from PIL import Image
import easyocr
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import spacy
import requests
import io
import numpy as np
import pandas as pd
import time
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from collections import Counter
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# -------------------------------
# Load OCR (once)
# -------------------------------
reader = easyocr.Reader(['en'], gpu=False, verbose=False)

# -------------------------------
# Load BLIP model (once)
# -------------------------------

processor = BlipProcessor.from_pretrained(
    "Salesforce/blip-image-captioning-base",
    use_fast=True
)
model = BlipForConditionalGeneration.from_pretrained(
    "Salesforce/blip-image-captioning-base"
)
model.eval()
# Load SpaCy English model
nlp = spacy.load("en_core_web_sm")

# -------------------------------
# Load FLAN model for description generation
# -------------------------------
flan_tokenizer = AutoTokenizer.from_pretrained("google/flan-t5-base")
flan_model = AutoModelForSeq2SeqLM.from_pretrained("google/flan-t5-base")
flan_model.eval()

# -------------------------------
# Generate description function
# -------------------------------
def generate_description(product_name):
    """
    Generate a product description using FLAN model.
    
    Args:
        product_name (str): The name of the product
    Returns:
        str: Generated product description
    """
    prompt = (
        f"You are a creative e-commerce copywriter. "
        f"Write 45 short, engaging bullet points describing '{product_name}'. "
        "Include taste, texture, usage, packaging, and why customers will love it. "
        "Keep it unique and readable for an online store."
    )
    inputs = flan_tokenizer(prompt, return_tensors="pt")
    outputs = flan_model.generate(
        **inputs,
        max_length=250,
        do_sample=True,
        top_p=0.9,
        temperature=0.7,
        no_repeat_ngram_size=2
    )
    return flan_tokenizer.decode(outputs[0], skip_special_tokens=True)

# -------------------------------
# Background removal function
# -------------------------------
def remove_background(input_image_path, output_image_path):
    """
    Remove background from an image and replace with white background.
    
    Args:
        input_image_path (str): Path to the input image
        output_image_path (str): Path to save the output image
    """
    from rembg import remove
    from PIL import Image
    
    # Load image
    input_image = Image.open(input_image_path)
    
    # Remove background
    output_image = remove(input_image)
    
    # Create white background
    white_bg = Image.new("RGB", output_image.size, (255, 255, 255))
    white_bg.paste(output_image, mask=output_image.split()[3])
    
    # Save final image
    white_bg.save(output_image_path)

# -------------------------------
# Main function
# -------------------------------
def generate_title_and_description(image):
    """
    image: PIL.Image
    """

    # PIL → NumPy for EasyOCR
    image_np = np.array(image)

    # 1️⃣ OCR
    ocr_result = reader.readtext(image_np)

    if ocr_result:
        raw_text = " ".join([text for _, text, _ in ocr_result])

        import re
        text = re.sub(r"[^A-Za-z0-9\s]", " ", raw_text)
        text = re.sub(r"\s+", " ", text).strip()

        doc = nlp(text)
        keywords = [t.text for t in doc if t.pos_ in ["NOUN", "PROPN", "ADJ"]]

        unique_words = []
        for w in keywords:
            if w.lower() not in [x.lower() for x in unique_words]:
                unique_words.append(w)

        clean_title = " ".join(unique_words).title()
        description = generate_description(clean_title)

        return {
            "title": clean_title,
            "description": description
        }

    # 2️⃣ OCR failed → BLIP
    inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        output = model.generate(
            **inputs,
            max_length=10,
            num_beams=5,
            repetition_penalty=3.0,
            no_repeat_ngram_size=2,
            early_stopping=True
        )

    caption = processor.decode(output[0], skip_special_tokens=True)

    doc = nlp(caption)
    words = [t.text for t in doc if t.pos_ in ["NOUN", "PROPN", "ADJ"]]

    title_clean = " ".join(words[:2]).capitalize()
    description = generate_description(title_clean)

    return {
        "title": title_clean,
        "description": description
    }

# def generate_title_and_description(image_path):
#     """
#     Generate both title and description for a product image.
    
#     Args:
#         image_path (str): Path to the product image
#     Returns:
#         dict: Dictionary containing title and description
#     """
#     # 1️⃣ Try OCR first
#     ocr_result = reader.readtext(image_path)  # EasyOCR reader
#     if ocr_result:
#         # Combine all OCR detected text
#         raw_text = " ".join([text for _, text, _ in ocr_result])
        
#         # Remove special characters
#         import re
#         text = re.sub(r"[^A-Za-z0-9\s]", " ", raw_text)
#         text = re.sub(r"\s+", " ", text).strip()
        
#         # NLP parsing to extract nouns, proper nouns, adjectives
#         doc = nlp(text)
#         keywords = [token.text for token in doc if token.pos_ in ["NOUN", "PROPN", "ADJ"]]
        
#         # Remove duplicates
#         unique_words = []
#         for w in keywords:
#             if w.lower() not in [x.lower() for x in unique_words]:
#                 unique_words.append(w)
        
#         # Capitalize and join
#         clean_title = " ".join(unique_words).title()
        
#         # Generate description using the title
#         description = generate_description(clean_title)
        
#         return {
#             'title': clean_title,
#             'description': description
#         }
    
#     # 2️⃣ OCR failed → BLIP (image-only)
#     image = Image.open(image_path).convert("RGB")
#     inputs = processor(images=image, return_tensors="pt")

#     with torch.no_grad():
#         output = model.generate(
#             **inputs,
#             max_length=10,
#             num_beams=5,
#             repetition_penalty=3.0,
#             no_repeat_ngram_size=2,
#             early_stopping=True
#         )

#     caption = processor.decode(output[0], skip_special_tokens=True)

#     # 3️⃣ NLP post-processing
#     doc = nlp(caption)
    
#     # Collect adjectives + nouns
#     words = []
#     for token in doc:
#         if token.pos_ in ["NOUN", "PROPN"] or token.pos_ == "ADJ":
#             words.append(token.text)
    
#     # 4️⃣ Keep first 1–2 words (main product)
#     title_clean = " ".join(words[:2]).capitalize()
    
#     # Generate description using the title
#     description = generate_description(title_clean)
    
#     return {
#         'title': title_clean,
#         'description': description
#     }

# Backward compatibility function
def generate_title(image_path):
    """
    Generate title for a product image (backward compatibility).
    
    Args:
        image_path (str): Path to the product image
    Returns:
        str: Generated product title
    """
    result = generate_title_and_description(image_path)
    return result['title']


# =====================================================
# CUSTOMER SEGMENTATION WITH K-MEANS CLUSTERING
# =====================================================

# Segment labels (sorted by spending level)
SEGMENT_LABELS = ["budget", "regular", "premium"]

def preprocess_user_data(users):
    """
    Convert user list to pandas DataFrame and extract features.
    Handle missing values by replacing with 0.
    
    Args:
        users (list): List of user dictionaries with features
        
    Returns:
        tuple: (DataFrame with features, list of user IDs)
    """
    print(f"[Segmentation] Preprocessing {len(users)} users...")
    
    # Create DataFrame from user list
    df = pd.DataFrame(users)
    
    # Extract user IDs for later reference
    user_ids = df['userId'].tolist()
    
    # Define feature columns
    feature_columns = ['totalSpent', 'totalOrders', 'avgPrice', 'clicks']
    
    # Handle missing values - fill with 0
    for col in feature_columns:
        if col not in df.columns:
            df[col] = 0
        df[col] = df[col].fillna(0)
    
    # Extract features for clustering
    features = df[feature_columns].values
    
    print(f"[Segmentation] Features extracted: {feature_columns}")
    print(f"[Segmentation] Feature matrix shape: {features.shape}")
    
    return features, user_ids, df


def normalize_features(features):
    """
    Normalize features using StandardScaler.
    
    Args:
        features (np.array): Raw feature matrix
        
    Returns:
        np.array: Normalized features
    """
    print("[Segmentation] Normalizing features...")
    
    scaler = StandardScaler()
    normalized = scaler.fit_transform(features)
    
    print(f"[Segmentation] Features normalized (mean≈0, std≈1)")
    
    return normalized, scaler


def run_kmeans_clustering(features, k=3):
    """
    Run K-Means clustering on normalized features.
    
    Args:
        features (np.array): Normalized feature matrix
        k (int): Number of clusters (default: 3)
        
    Returns:
        tuple: (cluster labels, cluster centers)
    """
    # Adjust k if fewer users than clusters
    n_samples = features.shape[0]
    actual_k = min(k, n_samples)
    
    if actual_k < k:
        print(f"[Segmentation] Adjusting k from {k} to {actual_k} (fewer users than clusters)")
    
    print(f"[Segmentation] Running K-Means with k={actual_k}...")
    
    kmeans = KMeans(
        n_clusters=actual_k,
        random_state=42,
        n_init=10,
        max_iter=300
    )
    
    labels = kmeans.fit_predict(features)
    centers = kmeans.cluster_centers_
    
    print(f"[Segmentation] Clustering complete. Found {actual_k} clusters")
    
    return labels, centers, actual_k


def assign_segment_labels(labels, centers, features_original, k=3):
    """
    Assign meaningful segment labels based on cluster centers.
    Sort clusters by totalSpent (or avgPrice) and assign:
    - lowest → "budget"
    - middle → "regular"  
    - highest → "premium"
    
    Args:
        labels (np.array): Cluster labels from K-Means
        centers (np.array): Cluster centers
        features_original (np.array): Original (non-normalized) features
        k (int): Number of clusters
        
    Returns:
        dict: Mapping from cluster index to segment label
    """
    print("[Segmentation] Assigning segment labels...")
    
    # If only 1 cluster, all users are "regular"
    if k == 1:
        return {0: "regular"}
    
    # Get the totalSpent column index (column 0 in our features)
    # Cluster centers are in normalized space, but relative order is preserved
    # We use the first feature (totalSpent) to determine spending level
    
    # Calculate mean totalSpent for each cluster using original features
    cluster_spending = {}
    for cluster_idx in range(k):
        # Get indices of users in this cluster
        cluster_mask = labels == cluster_idx
        # Calculate mean totalSpent (column 0) for this cluster
        mean_spent = features_original[cluster_mask, 0].mean()
        cluster_spending[cluster_idx] = mean_spent
    
    # Sort clusters by spending level (ascending)
    sorted_clusters = sorted(cluster_spending.items(), key=lambda x: x[1])
    
    # Create mapping from cluster index to segment label
    cluster_to_segment = {}
    
    if k == 2:
        # For 2 clusters: low → budget, high → regular
        cluster_to_segment[sorted_clusters[0][0]] = "budget"
        cluster_to_segment[sorted_clusters[1][0]] = "regular"
    else:
        # For 3+ clusters: low → budget, middle → regular, high → premium
        for i, (cluster_idx, _) in enumerate(sorted_clusters):
            if i == 0:
                cluster_to_segment[cluster_idx] = "budget"
            elif i == k - 1:
                cluster_to_segment[cluster_idx] = "premium"
            else:
                cluster_to_segment[cluster_idx] = "regular"
    
    print(f"[Segmentation] Cluster spending levels: {cluster_spending}")
    print(f"[Segmentation] Cluster to segment mapping: {cluster_to_segment}")
    
    return cluster_to_segment


def build_segment_response(user_ids, labels, cluster_to_segment):
    """
    Build the response JSON with segment assignments and summary.
    
    Args:
        user_ids (list): List of user IDs
        labels (np.array): Cluster labels
        cluster_to_segment (dict): Mapping from cluster to segment
        
    Returns:
        dict: Response with segments and summary
    """
    # Build segments list
    segments = []
    for i, user_id in enumerate(user_ids):
        cluster = int(labels[i])
        segment = cluster_to_segment.get(cluster, "regular")
        segments.append({
            "userId": user_id,
            "cluster": cluster,
            "segment": segment
        })
    
    # Build cluster summary
    segment_counts = Counter([s["segment"] for s in segments])
    cluster_summary = {
        "budget": segment_counts.get("budget", 0),
        "regular": segment_counts.get("regular", 0),
        "premium": segment_counts.get("premium", 0)
    }
    
    return segments, cluster_summary


# -------------------------------
# Flask route for health check
# -------------------------------
@app.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint.
    
    Returns:
        JSON: Server status
    """
    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "ML Service - Image Processing & Customer Segmentation",
        "endpoints": [
            "/health",
            "/generate-title",
            "/generate-title-and-description",
            "/remove-background",
            "/segment-users"
        ]
    })


# -------------------------------
# Flask route for user segmentation
# -------------------------------
@app.route('/segment-users', methods=['POST'])
def segment_users_endpoint():
    """
    Segment users using K-Means clustering.
    
    Input JSON:
        {
            "k": 3,  // optional, default 3
            "users": [
                {"userId": "U1", "totalSpent": 5000, "totalOrders": 20, "avgPrice": 250, "clicks": 100},
                ...
            ]
        }
    
    Returns:
        JSON: {
            "success": true,
            "segments": [...],
            "clusterSummary": {"budget": 5, "regular": 10, "premium": 3}
        }
    """
    start_time = time.time()
    
    try:
        # Get JSON data
        data = request.get_json(force=True)
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No JSON data provided"
            }), 400
        
        # Extract parameters
        k = data.get('k', 3)
        users = data.get('users', [])
        
        # Validate users array
        if not users or len(users) == 0:
            return jsonify({
                "success": False,
                "error": "users array must not be empty"
            }), 400
        
        # Validate required fields in each user
        required_fields = ['userId', 'totalSpent', 'totalOrders', 'avgPrice', 'clicks']
        for i, user in enumerate(users):
            for field in required_fields:
                if field not in user:
                    print(f"[Segmentation] Warning: Missing field '{field}' in user {i}, using 0")
                    user[field] = 0 if field != 'userId' else f"user_{i}"
        
        print(f"[Segmentation] Processing {len(users)} users with k={k}")
        
        # Step 1: Preprocess data
        features, user_ids, df = preprocess_user_data(users)
        
        # Step 2: Normalize features
        features_normalized, scaler = normalize_features(features)
        
        # Step 3: Run K-Means
        labels, centers, actual_k = run_kmeans_clustering(features_normalized, k)
        
        # Step 4: Assign segment labels (using original features for spending comparison)
        cluster_to_segment = assign_segment_labels(labels, centers, features, actual_k)
        
        # Step 5: Build response
        segments, cluster_summary = build_segment_response(user_ids, labels, cluster_to_segment)
        
        elapsed_time = time.time() - start_time
        
        print(f"[Segmentation] Completed in {elapsed_time:.3f}s")
        print(f"[Segmentation] Cluster distribution: {cluster_summary}")
        
        return jsonify({
            "success": True,
            "message": f"Segmented {len(users)} users into {actual_k} clusters",
            "segments": segments,
            "clusterSummary": cluster_summary,
            "metadata": {
                "k": actual_k,
                "totalUsers": len(users),
                "processingTimeMs": round(elapsed_time * 1000, 2)
            }
        })
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# -------------------------------
# Flask route for background removal
# -------------------------------
@app.route('/remove-background', methods=['POST'])
def remove_background_endpoint():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image_file = request.files['image']
    
    # Save the uploaded image temporarily
    temp_path = 'temp_bg_image.jpg'
    output_path = 'temp_bg_removed.jpg'
    image_file.save(temp_path)

    try:
        # Remove background
        remove_background(temp_path, output_path)
        
        # Return the processed image
        with open(output_path, 'rb') as f:
            image_data = f.read()
        
        return image_data, 200, {'Content-Type': 'image/jpeg'}
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temporary files
        import os
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(output_path):
            os.remove(output_path)

# -------------------------------
# Flask route for title and description
# -------------------------------
@app.route('/generate-title-and-description', methods=['POST'])
def generate_title_and_description_endpoint():
    # if 'image' not in request.files:
    #     return jsonify({'error': 'No image file provided'}), 400

    # image_file = request.files['image']
    
    # # Save the uploaded image temporarily
    # temp_path = 'temp_uploaded_image.jpg'
    # image_file.save(temp_path)

    # try:
    #     # Generate title and description
    #     result = generate_title_and_description(temp_path)
    #     return jsonify(result)
    # except Exception as e:
    #     return jsonify({'error': str(e)}), 500
    # finally:
    #     # Clean up temporary file
    #     if os.path.exists(temp_path):
    #         os.remove(temp_path)
    # data = request.get_json()
    # image_url = data.get("image_url")

    # if not image_url:
    #     return jsonify({'error': 'No image URL provided'}), 400

    # image_bytes = requests.get(image_url).content
    # image = Image.open(io.BytesIO(image_bytes))

    # result = generate_title_and_description(image)
    # return jsonify(result)
    try:
        data = request.get_json(force=True)

        image_url = data.get("image_url") if data else None
        if not image_url:
            return jsonify({"error": "No image URL provided"}), 400

        # Download image
        response = requests.get(image_url, timeout=10)
        response.raise_for_status()

        # Open image correctly
        image = Image.open(io.BytesIO(response.content)).convert("RGB")

        # VERY IMPORTANT:
        # generate_title_and_description must NOT call .read()
        result = generate_title_and_description(image)

        return jsonify(result)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

# -------------------------------
# Flask route
# -------------------------------
@app.route('/generate-title', methods=['POST'])
def generate_title_endpoint():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400

    image_file = request.files['image']
    
    # Save the uploaded image temporarily
    temp_path = 'temp_uploaded_image.jpg'
    image_file.save(temp_path)

    try:
        # Generate title
        title = generate_title(temp_path)
        return jsonify({'title': title})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up temporary file
        if os.path.exists(temp_path):
            os.remove(temp_path)

# -------------------------------
# Run server
# -------------------------------
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
