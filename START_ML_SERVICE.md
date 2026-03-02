# Starting the ML Service

To use the AI title and description generation feature, you need to start the Python Flask ML service.

## Steps to Start the ML Service:

1. **Open a new terminal/command prompt**
2. **Navigate to the ml directory:**
   ```bash
   cd ml
   ```
3. **Install required Python packages (if not already installed):**
   ```bash
   pip install flask flask-cors transformers torch pillow easyocr rembg
   ```
4. **Start the ML service:**
   ```bash
   python res.py
   ```

## Expected Output:
```
* Serving Flask app 'res'
* Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
Use a production WSGI server instead.
* Running on http://127.0.0.1:5000
Press CTRL+C to quit
```

## Troubleshooting:

- **If you get import errors:** Make sure all required packages are installed
- **If port 5000 is in use:** The service will show an error - you can change the port in res.py
- **If the service won't start:** Check that Python is installed and accessible

## Verification:

After starting the service, you can test it by visiting: http://localhost:5000

You should see a JSON response or a simple message indicating the service is running.

## Important Notes:

- The ML service must be running before using the "Generate Title and Description" feature
- The service uses AI models that may take a few seconds to process images
- Keep the ML service running in the background while using the CreateProduct feature