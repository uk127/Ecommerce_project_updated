/**
 * AI Prompt Builder for Product Generation
 * Builds dynamic prompts based on mode, category, productType, and imageUrl
 */

// Output formats for different modes
const outputFormats = {
  all: {
    title: "Product Title Here",
    description: "Detailed product description here",
    tags: ["tag1", "tag2", "tag3"],
    brand: "Brand Name"
  },
  title: { title: "Product Title Here" },
  description: { description: "Detailed product description here" },
  tags: { tags: ["tag1", "tag2"] },
  brand: { brand: "Brand Name" }
};

// Field guidelines for different modes
const fieldGuidelines = {
  all: "Title: 50-100 chars, Description: 100-200 words, Tags: 5-8 keywords, Brand if visible",
  title: "Generate SEO-friendly title (50-100 chars)",
  description: "Generate detailed product description (100-200 words)",
  tags: "Generate 5-8 relevant search tags",
  brand: "Identify brand or suggest generic"
};

/**
 * Build a prompt for AI product generation
 * @param {Object} params - Parameters for prompt building
 * @param {string} params.mode - Generation mode: 'all', 'title', 'description', 'tags', 'brand'
 * @param {string} params.category - Product category
 * @param {string} params.productType - Product type (subcategory)
 * @param {string} params.imageUrl - URL of the product image
 * @returns {string} - Built prompt string
 */
const buildPrompt = ({ mode, category, productType, imageUrl }) => {
  // Validate mode
  const validModes = ['all', 'title', 'description', 'tags', 'brand'];
  if (!validModes.includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}`);
  }

  // Get output format for the mode
  const outputFormat = JSON.stringify(outputFormats[mode], null, 2);
  const guidelines = fieldGuidelines[mode];

  // Build the prompt
  const prompt = `You are an ecommerce expert. Analyze the product image from the provided URL and generate product details.

Return ONLY valid JSON in this exact format:
${outputFormat}

Guidelines:
${guidelines}

STRICT RULES:
- Do not include extra fields
- Do not include explanations
- Do not include markdown code blocks
- Output must be valid JSON only
- Ensure all string values are properly escaped
${category ? `Category: ${category}` : 'Category: Not specified'}
${productType ? `Product Type: ${productType}` : 'Product Type: Not specified'}
Image URL: ${imageUrl}`;

  return prompt;
};

/**
 * Parse AI response and extract JSON data
 * @param {string} content - Raw AI response content
 * @param {string} mode - Generation mode
 * @returns {Object} - Parsed product data
 */
const parseAIResponse = (content, mode) => {
  try {
    // Clean up the content - remove markdown code blocks if present
    let cleanContent = content.trim();
    
    // Remove various markdown code block formats
    if (cleanContent.startsWith("```json")) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith("```")) {
      cleanContent = cleanContent.slice(0, -3);
    }
    
    // Remove any leading/trailing whitespace
    cleanContent = cleanContent.trim();

    // Parse JSON
    const productData = JSON.parse(cleanContent);

    // Validate based on mode
    const validatedData = {};

    if (mode === 'all' || mode === 'title') {
      validatedData.title = typeof productData.title === 'string' ? productData.title : '';
    }
    
    if (mode === 'all' || mode === 'description') {
      validatedData.description = typeof productData.description === 'string' ? productData.description : '';
    }
    
    if (mode === 'all' || mode === 'tags') {
      if (Array.isArray(productData.tags)) {
        validatedData.tags = productData.tags.filter(tag => typeof tag === 'string');
      } else {
        validatedData.tags = [];
      }
    }
    
    if (mode === 'all' || mode === 'brand') {
      validatedData.brand = typeof productData.brand === 'string' ? productData.brand : '';
    }

    return validatedData;
  } catch (error) {
    console.error('[PromptBuilder] Failed to parse AI response:', error.message);
    console.error('[PromptBuilder] Content was:', content);
    throw new Error('Failed to parse AI response as valid JSON');
  }
};

/**
 * Validate generation request parameters
 * @param {Object} params - Request parameters
 * @returns {Object} - Validation result { valid: boolean, error: string|null }
 */
const validateRequest = ({ mode, imageUrl }) => {
  const validModes = ['all', 'title', 'description', 'tags', 'brand'];
  
  if (!mode) {
    return { valid: false, error: 'Mode is required' };
  }
  
  if (!validModes.includes(mode)) {
    return { valid: false, error: `Invalid mode: ${mode}. Must be one of: ${validModes.join(', ')}` };
  }
  
  if (!imageUrl) {
    return { valid: false, error: 'Image URL is required' };
  }

  // Basic URL validation
  try {
    new URL(imageUrl);
  } catch {
    return { valid: false, error: 'Invalid image URL format' };
  }

  return { valid: true, error: null };
};

module.exports = {
  buildPrompt,
  parseAIResponse,
  validateRequest,
  outputFormats,
  fieldGuidelines
};