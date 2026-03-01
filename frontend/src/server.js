export const server = `${import.meta.env.VITE_SERVER_URL}/api/v2`;
// "http://localhost:8001/api/v2"
console.log(server);
export const backend_url = `${import.meta.env.VITE_BACKEND_URL}/`;
// "http://localhost:8001/"
console.log(backend_url);
// Helper function to handle both Cloudinary URLs and local relative paths
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';

  // If it's already a full URL (Cloudinary), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // For local relative paths, prepend backend_url
  return `${backend_url}${imagePath}`;
};

// Safe data access helper
export const safeGet = (obj, path, defaultValue = undefined) => {
  try {
    return path.split('.').reduce((current, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};
