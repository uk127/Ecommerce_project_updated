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
