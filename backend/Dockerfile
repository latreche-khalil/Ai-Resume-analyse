FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies including Tesseract OCR, ClamAV, and WeasyPrint requirements
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-ara \
    tesseract-ocr-eng \
    tesseract-ocr-fra \
    clamav \
    clamav-daemon \
    libpq-dev \
    gcc \
    g++ \
    # WeasyPrint dependencies
    libpango-1.0-0 \
    libharfbuzz0b \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy models
RUN python -m spacy download ar_core_news_sm && \
    python -m spacy download en_core_web_sm && \
    python -m spacy download fr_core_news_sm

# Copy application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads /app/logs

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
