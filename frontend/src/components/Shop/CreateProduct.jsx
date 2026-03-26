import React, { useEffect, useState } from "react";
import { AiOutlinePlusCircle, AiOutlineClose } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../../redux/actions/product";
import { categoriesData } from "../../static/data";
import { toast } from "react-toastify";
import { backend_url } from "../../server";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';

// Product types based on category
const productTypesByCategory = {
    "Grocery": [
        "Fruit",
        "Vegetable",
        "Grain / Rice",
        "Spice / Masala",
        "Dairy Product",
        "Nuts / Dry Fruits",
        "Snack",
        "Ready Mix / Instant Mix",
        "Breakfast / Cereals",
        "Spreads / Sauces",
        "Bakery",
        "Others"
    ],
    "Home & Office": [
        "Furniture",
        "Decor",
        "Kitchen",
        "Stationery",
        "Storage",
        "Others"
    ],
    "Electronics & Appliances": [
        "Mobile Phones",
        "Tablets",
        "Laptops",
        "Desktops",
        "Audio Devices",
        "TV & Entertainment",
        "Home Appliances",
        "Kitchen Appliances",
        "Smart Devices",
        "Gaming",
        "Electronic Accessories",
        "Power & Electrical"
    ],
    "Fashion": [
        "Men Clothing",
        "Women Clothing",
        "Kids Wear",
        "Footwear",
        "Bags & Accessories",
        "Watches",
    ],
    "Beauty & Personal Care": [
        "Skincare",
        "Haircare",
        "Makeup",
        "Fragrances",
        "Grooming",
        "Personal Hygiene",
        "Others"
    ],
    "Sports & Fitness": [
        "Fitness Equipment",
        "Yoga Accessories",
        "Sports Gear",
        "Outdoor Equipment",
        "Others"
    ],
    "Pet Care": [
        "Pet Food",
        "Pet Grooming",
        "Pet Accessories",
        "Health Care",
        "Others"
    ],
    "Toys & Baby Products": [
        "Toys",
        "Baby Care",
        "Diapers & Wipes",
        "Feeding Products",
        "Baby Gear",
        "Others"
    ],
    "Gardening & Outdoor": [
        "Plants",
        "Seeds",
        "Gardening Tools",
        "Pots & Planters",
        "Fertilizers & Soil",
        "Others"
    ],
    "Others": [
        "General",
        "Others"
    ]
};

// Unit options
const unitOptions = [
    "Piece",
    "Kg",
    "Gram",
    "Liter",
    "ml",
    "Pack",
    "Dozen",
    "Box",
    "Bottle",
    "Pouch",
    "Meter",
    "Set"
];

// Maximum regenerations allowed per field
const MAX_REGENERATIONS = 3;

// Initial regeneration state
const initialRegenerationState = {
    all: { count: MAX_REGENERATIONS, hasGenerated: false },
    title: { count: MAX_REGENERATIONS, hasGenerated: false },
    description: { count: MAX_REGENERATIONS, hasGenerated: false },
    tags: { count: MAX_REGENERATIONS, hasGenerated: false },
    brand: { count: MAX_REGENERATIONS, hasGenerated: false }
};

// Loading spinner component
const LoadingSpinner = ({ size = 16 }) => (
    <svg 
        className="animate-spin" 
        style={{ width: size, height: size }} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
    >
        <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
        ></circle>
        <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
    </svg>
);

// AI Button Component
const AIButton = ({ 
    onClick, 
    isLoading, 
    disabled, 
    regenerationState,
    hasImage
}) => {
    const { count, hasGenerated } = regenerationState;
    const isDisabled = disabled || !hasImage || count <= 0;
    
    const getButtonText = () => {
        if (isLoading) return "Generating...";
        if (!hasGenerated) return "Generate";
        if (count <= 0) return "No regenerations left";
        return `Regenerate (${count} left)`;
    };

    const getButtonStyle = () => {
        if (isDisabled) {
            return "bg-gray-200 text-gray-400 cursor-not-allowed";
        }
        if (isLoading) {
            return "bg-blue-400 text-white cursor-wait";
        }
        if (hasGenerated) {
            return "bg-purple-100 text-purple-700 hover:bg-purple-200";
        }
        return "bg-blue-100 text-blue-700 hover:bg-blue-200";
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled || isLoading}
            className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${getButtonStyle()}`}
            title={!hasImage ? "Upload an image first" : hasGenerated ? `Regenerate (${count} left)` : "Generate with AI"}
        >
            {isLoading ? (
                <LoadingSpinner size={12} />
            ) : (
                <AutoFixHighIcon sx={{ fontSize: 14 }} />
            )}
            {getButtonText()}
        </button>
    );
};

// Fill All Button Component
const FillAllButton = ({ onClick, isLoading, disabled, hasImage, regenerationState }) => {
    const { count, hasGenerated } = regenerationState;
    const isDisabled = disabled || !hasImage || count <= 0;

    const getButtonText = () => {
        if (isLoading) return (
            <>
                <LoadingSpinner size={14} />
                <span>Generating...</span>
            </>
        );
        if (!hasGenerated) return (
            <>
                <AutoFixHighIcon sx={{ fontSize: 16 }} />
                <span> Fill All</span>
            </>
        );
        if (count <= 0) return "No regenerations left";
        return (
            <>
                <AutoFixHighIcon sx={{ fontSize: 16 }} />
                <span>Regenerate All ({count} left)</span>
            </>
        );
    };

    const getButtonStyle = () => {
        if (isDisabled) {
            return "bg-gray-200 text-gray-400 cursor-not-allowed";
        }
        if (isLoading) {
            return "bg-blue-400 text-white cursor-wait";
        }
        if (hasGenerated) {
            return "bg-purple-500 text-white hover:bg-purple-600";
        }
        return "bg-blue-600 text-white hover:bg-blue-700";
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={isDisabled || isLoading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${getButtonStyle()}`}
            title={!hasImage ? "Upload an image first" : hasGenerated ? `Regenerate All (${count} left)` : "Fill all fields with AI"}
        >
            {getButtonText()}
        </button>
    );
};

const CreateProduct = () => {
    const { seller } = useSelector((state) => state.seller);
    const { success, error } = useSelector((state) => state.products);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // Form state
    const [images, setImages] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [productType, setProductType] = useState("");
    const [brand, setBrand] = useState("");
    const [tags, setTags] = useState([]);
    const [tagInput, setTagInput] = useState("");
    const [originalPrice, setOriginalPrice] = useState("");
    const [discountPrice, setDiscountPrice] = useState("");
    const [unit, setUnit] = useState("");
    const [stock, setStock] = useState("");
    const [expiryDate, setExpiryDate] = useState("");
    
    // Image URL state (for AI generation)
    const [uploadedImageUrl, setUploadedImageUrl] = useState("");

    // AI states
    const [isGenerating, setIsGenerating] = useState({
        all: false,
        title: false,
        description: false,
        tags: false,
        brand: false
    });
    
    // Regeneration tracking
    const [regenerations, setRegenerations] = useState(initialRegenerationState);
    
    // Other UI states
    const [showRemoveBgPopup, setShowRemoveBgPopup] = useState(false);
    const [isProcessingBgRemoval, setIsProcessingBgRemoval] = useState(false);
    const [processingImageIndex, setProcessingImageIndex] = useState(null);
    const [processedImages, setProcessedImages] = useState({});
    const [fullscreenImage, setFullscreenImage] = useState(null);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
        if (success) {
            toast.success("Product created successfully!");
            navigate("/dashboard");
            window.location.reload();
        }
    }, [dispatch, error, success]);

    // Reset product type when category changes
    useEffect(() => {
        setProductType("");
    }, [category]);

    // Get product types for selected category
    const getProductTypes = () => {
        if (category && productTypesByCategory[category]) {
            return productTypesByCategory[category];
        }
        return [];
    };

    // Handle tag input
    const handleTagInputKeyDown = (e) => {
        if (e.key === "," || e.key === "Enter") {
            e.preventDefault();
            addTag();
        } else if (e.key === "Backspace" && tagInput === "" && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmedTag = tagInput.trim();
        if (trimmedTag && !tags.includes(trimmedTag)) {
            setTags([...tags, trimmedTag]);
            setTagInput("");
        }
    };

    const removeTag = (indexToRemove) => {
        setTags(tags.filter((_, index) => index !== indexToRemove));
    };

    const handleImageChange = (e) => {
        e.preventDefault();
        let files = Array.from(e.target.files);
        setImages((prevImages) => [...prevImages, ...files]);
        // Reset uploaded image URL when new images are added
        setUploadedImageUrl("");
    };

    const removeImage = (index) => {
        setImages(images.filter((_, i) => i !== index));
        // Reset uploaded image URL when image is removed
        setUploadedImageUrl("");
    };

    // Calculate display price
    const getDisplayPrice = () => {
        const price = discountPrice || originalPrice;
        if (price && unit) {
            return `₹${price} / ${unit}`;
        } else if (price) {
            return `₹${price}`;
        }
        return "";
    };

    // Upload image to Cloudinary and get URL
    const uploadImageToCloudinary = async (imageFile) => {
        const formData = new FormData();
        formData.append("image", imageFile);

        const response = await fetch(`${backend_url}api/v2/product/generate-title-description`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to upload image: ${response.status}`);
        }

        const result = await response.json();
        return result.imageUrl;
    };

    // Get or upload image URL for AI generation
    const getImageUrlForAI = async () => {
        if (uploadedImageUrl) {
            return uploadedImageUrl;
        }

        if (images.length === 0) {
            throw new Error("Please upload an image first");
        }

        if (images.length > 1) {
            throw new Error("Please upload only one image for AI generation");
        }

        const imageToUse = processedImages[0] || images[0];
        const imageUrl = await uploadImageToCloudinary(imageToUse);
        setUploadedImageUrl(imageUrl);
        return imageUrl;
    };

    // Generic AI generation function
    const generateWithAI = async (mode) => {
        try {
            const imageUrl = await getImageUrlForAI();

            setIsGenerating(prev => ({ ...prev, [mode]: true }));

            const response = await fetch(`${backend_url}api/v2/product/generate-product`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    mode,
                    imageUrl,
                    category: category || "",
                    productType: productType || ""
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to generate: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                // Update form fields based on mode
                if (mode === 'all' || mode === 'title') {
                    setName(result.data.title || "");
                }
                if (mode === 'all' || mode === 'description') {
                    setDescription(result.data.description || "");
                }
                if (mode === 'all' || mode === 'tags') {
                    if (Array.isArray(result.data.tags) && result.data.tags.length > 0) {
                        setTags(result.data.tags);
                    }
                }
                if (mode === 'all' || mode === 'brand') {
                    setBrand(result.data.brand || "");
                }

                // Update regeneration state
                setRegenerations(prev => ({
                    ...prev,
                    [mode]: {
                        count: prev[mode].count - 1,
                        hasGenerated: true
                    }
                }));

                toast.success(`${mode === 'all' ? 'All fields' : mode.charAt(0).toUpperCase() + mode.slice(1)} generated successfully!`);
            } else {
                throw new Error("Invalid response from AI");
            }
        } catch (error) {
            console.error(`[Generate ${mode}] Error:`, error);
            toast.error(error.message || `Failed to generate ${mode}`);
        } finally {
            setIsGenerating(prev => ({ ...prev, [mode]: false }));
        }
    };

    // Handle Fill All
    const handleFillAll = () => generateWithAI('all');
    
    // Handle individual field generation
    const handleGenerateTitle = () => generateWithAI('title');
    const handleGenerateDescription = () => generateWithAI('description');
    const handleGenerateTags = () => generateWithAI('tags');
    const handleGenerateBrand = () => generateWithAI('brand');

    const handleRemoveBackground = async (imageIndex) => {
        try {
            setProcessingImageIndex(imageIndex);

            const formData = new FormData();
            formData.append("image", images[imageIndex]);

            const response = await fetch(`${backend_url}api/v2/product/remove-background`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.imageUrl) {
                const imageUrl = result.imageUrl;
                const imageResponse = await fetch(imageUrl);
                const imageBlob = await imageResponse.blob();

                const newFile = new File([imageBlob], `bg_removed_${images[imageIndex].name}`, {
                    type: imageBlob.type || 'image/png'
                });

                setProcessedImages(prev => ({
                    ...prev,
                    [imageIndex]: newFile
                }));

                // Reset uploaded image URL since image was modified
                setUploadedImageUrl("");

                toast.success("Background removed successfully!");
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (error) {
            console.error("Error removing background:", error);
            toast.error("Failed to remove background");
        } finally {
            setProcessingImageIndex(null);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!seller || !seller._id) {
            toast.error("Seller not found. Please login again.");
            return;
        }

        // Validation
        if (!name) {
            toast.error("Please enter product name!");
            return;
        }
        if (!description) {
            toast.error("Please enter product description!");
            return;
        }
        if (!category) {
            toast.error("Please select a category!");
            return;
        }
        if (!originalPrice) {
            toast.error("Please enter the original price!");
            return;
        }
        if (!stock) {
            toast.error("Please enter stock quantity!");
            return;
        }
        if (images.length === 0) {
            toast.error("Please upload at least one product image!");
            return;
        }

        const newForm = new FormData();

        // Use processed images if available
        const finalImages = images.map((image, index) =>
            processedImages[index] ? processedImages[index] : image
        );

        finalImages.forEach((image) => {
            newForm.append("images", image);
        });

        // Required fields
        newForm.append("name", name);
        newForm.append("description", description);
        newForm.append("category", category);
        newForm.append("originalPrice", originalPrice);
        newForm.append("stock", stock);
        newForm.append("shopId", seller._id);

        // Optional fields
        if (productType) {
            newForm.append("productType", productType);
        }
        if (brand) {
            newForm.append("brand", brand);
        }
        if (tags && tags.length > 0) {
            newForm.append("tags", JSON.stringify(tags));
        }
        if (discountPrice) {
            newForm.append("discountPrice", discountPrice);
        } else {
            newForm.append("discountPrice", originalPrice);
        }
        if (unit) {
            newForm.append("unit", unit);
        }
        if (expiryDate) {
            newForm.append("expiryDate", expiryDate);
        }

        dispatch(createProduct(newForm));
    };

    const hasImage = images.length > 0;

    return (
        <div className="w-[90%] 800px:w-[60%] bg-white shadow-lg h-[85vh] rounded-lg p-6 overflow-y-scroll">
            <h5 className="text-[28px] font-Poppins text-center font-semibold text-gray-800 mb-6">
                Create New Product
            </h5>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Basic Information */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h6 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                        <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">1</span>
                        Basic Information
                    </h6>

                    {/* Product Name */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between pb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Product Name <span className="text-red-500">*</span>
                            </label>
                            <AIButton
                                onClick={handleGenerateTitle}
                                isLoading={isGenerating.title}
                                disabled={false}
                                regenerationState={regenerations.title}
                                hasImage={hasImage}
                            />
                        </div>
                        <input
                            type="text"
                            name="name"
                            value={name}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter your product name..."
                        />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between pb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <AIButton
                                onClick={handleGenerateDescription}
                                isLoading={isGenerating.description}
                                disabled={false}
                                regenerationState={regenerations.description}
                                hasImage={hasImage}
                            />
                        </div>
                        <textarea
                            cols="30"
                            required
                            rows="4"
                            name="description"
                            value={description}
                            className="appearance-none block w-full pt-2 px-3 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Enter your product description..."
                        ></textarea>
                    </div>

                    {/* Category and Product Type - Row */}
                    <div className="grid grid-cols-1 800px:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block pb-2 text-sm font-medium text-gray-700">
                                Category <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full border border-gray-300 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                            >
                                <option value="">Select Category</option>
                                {categoriesData &&
                                    categoriesData.map((i) => (
                                        <option value={i.title} key={i.title}>
                                            {i.title}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        <div>
                            <label className="block pb-2 text-sm font-medium text-gray-700">
                                Product Type
                            </label>
                            <select
                                className="w-full border border-gray-300 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white disabled:bg-gray-100"
                                value={productType}
                                onChange={(e) => setProductType(e.target.value)}
                                disabled={!category}
                            >
                                <option value="">Select Type</option>
                                {getProductTypes().map((type) => (
                                    <option value={type} key={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between pb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Tags <span className="text-gray-400 text-xs">(Press comma or Enter to add)</span>
                            </label>
                            <AIButton
                                onClick={handleGenerateTags}
                                isLoading={isGenerating.tags}
                                disabled={false}
                                regenerationState={regenerations.tags}
                                hasImage={hasImage}
                            />
                        </div>
                        <div className="border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
                            <div className="flex flex-wrap gap-2 p-2">
                                {tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => removeTag(index)}
                                            className="hover:text-red-500 ml-1"
                                        >
                                            <AiOutlineClose size={14} />
                                        </button>
                                    </span>
                                ))}
                                <input
                                    type="text"
                                    value={tagInput}
                                    onChange={(e) => setTagInput(e.target.value)}
                                    onKeyDown={handleTagInputKeyDown}
                                    onBlur={addTag}
                                    placeholder={tags.length === 0 ? "Enter tags..." : ""}
                                    className="flex-1 min-w-[120px] outline-none text-sm py-1"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Brand */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between pb-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Brand
                            </label>
                            <AIButton
                                onClick={handleGenerateBrand}
                                isLoading={isGenerating.brand}
                                disabled={false}
                                regenerationState={regenerations.brand}
                                hasImage={hasImage}
                            />
                        </div>
                        <input
                            type="text"
                            name="brand"
                            value={brand}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            onChange={(e) => setBrand(e.target.value)}
                            placeholder="Enter brand name..."
                        />
                    </div>
                </div>

                {/* Section 2: Pricing */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h6 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                        <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">2</span>
                        Pricing
                    </h6>

                    {/* Original Price and Discount Price - Row */}
                    <div className="grid grid-cols-1 800px:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block pb-2 text-sm font-medium text-gray-700">
                                Original Price <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    name="originalPrice"
                                    value={originalPrice}
                                    className="appearance-none block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    onChange={(e) => setOriginalPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block pb-2 text-sm font-medium text-gray-700">
                                Price with Discount <span className="text-gray-400 text-xs">(Optional)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                <input
                                    type="number"
                                    name="discountPrice"
                                    value={discountPrice}
                                    className="appearance-none block w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                                    onChange={(e) => setDiscountPrice(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Unit Selection */}
                    <div className="mb-4">
                        <label className="block pb-2 text-sm font-medium text-gray-700">
                            Unit
                        </label>
                        <select
                            className="w-full border border-gray-300 py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm bg-white"
                            value={unit}
                            onChange={(e) => setUnit(e.target.value)}
                        >
                            <option value="">Select Unit</option>
                            {unitOptions.map((u) => (
                                <option value={u} key={u}>
                                    {u}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Price Preview */}
                    {getDisplayPrice() && (
                        <div className="bg-white p-3 rounded-lg border border-green-200 mt-3">
                            <span className="text-sm text-gray-600">Preview: </span>
                            <span className="text-lg font-semibold text-green-600">{getDisplayPrice()}</span>
                        </div>
                    )}
                </div>

                {/* Section 3: Inventory */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h6 className="text-lg font-semibold text-gray-700 mb-4 flex items-center">
                        <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">3</span>
                        Inventory
                    </h6>

                    {/* Stock and Expiry Date - Row */}
                    <div className="grid grid-cols-1 800px:grid-cols-2 gap-4">
                        <div>
                            <label className="block pb-2 text-sm font-medium text-gray-700">
                                Stock Quantity <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="stock"
                                value={stock}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                onChange={(e) => setStock(e.target.value)}
                                placeholder="Enter stock quantity..."
                            />
                        </div>

                        <div>
                            <label className="block pb-2 text-sm font-medium text-gray-700">
                                Expiry Date <span className="text-gray-400 text-xs">(Optional)</span>
                            </label>
                            <input
                                type="date"
                                name="expiryDate"
                                value={expiryDate}
                                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                onChange={(e) => setExpiryDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Section 4: Product Media */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h6 className="text-lg font-semibold text-gray-700 mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-2">4</span>
                            Product Media
                        </div>
                        <FillAllButton
                            onClick={handleFillAll}
                            isLoading={isGenerating.all}
                            disabled={false}
                            hasImage={hasImage}
                            regenerationState={regenerations.all}
                        />
                    </h6>

                    {/* Product Image Upload */}
                    <div className="mb-4">
                        <label className="block pb-2 text-sm font-medium text-gray-700">
                            Product Image <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="file"
                            id="upload"
                            className="hidden"
                            multiple
                            accept="image/*"
                            onChange={handleImageChange}
                        />

                        <div className="w-full flex items-center flex-wrap gap-3">
                            <label
                                htmlFor="upload"
                                className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-500 transition-colors flex flex-col items-center justify-center w-[120px] h-[120px]"
                            >
                                <AiOutlinePlusCircle size={30} className="text-gray-400 mb-1" />
                                <span className="text-xs text-gray-500">Upload Image</span>
                            </label>

                            {images &&
                                images.map((image, index) => (
                                    <div key={index} className="relative group">
                                        <img
                                            src={processedImages[index]
                                                ? URL.createObjectURL(processedImages[index])
                                                : URL.createObjectURL(image)}
                                            alt={`Product ${index + 1}`}
                                            className="h-[120px] w-[120px] object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setFullscreenImage(image)}
                                            title="Click to view full screen"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <AiOutlineClose size={14} />
                                        </button>
                                    </div>
                                ))}
                        </div>

                        {/* AI Buttons */}
                        {images.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowRemoveBgPopup(true)}
                                    disabled={isProcessingBgRemoval}
                                    className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full transition-colors ${isProcessingBgRemoval
                                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        : "bg-blue-100 text-blue-700 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                        }`}
                                >
                                    {isProcessingBgRemoval ? "Processing..." : " Remove Bg"}
                                </button>
                            </div>
                        )}
                        
                        {/* Image URL display for debugging */}
                        {uploadedImageUrl && (
                            <div className="mt-2 text-xs text-gray-500">
                                Image URL: <span className="text-green-600">Ready for AI generation</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => navigate("/dashboard")}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                        Create Product
                    </button>
                </div>
            </form>

            {/* Remove Background Popup */}
            {showRemoveBgPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[90%] max-w-4xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Remove Background</h3>
                            <button
                                onClick={() => setShowRemoveBgPopup(false)}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                &times;
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image, index) => (
                                <div key={index} className="border rounded-lg p-2">
                                    <div className="relative">
                                        <img
                                            src={processedImages[index]
                                                ? URL.createObjectURL(processedImages[index])
                                                : URL.createObjectURL(image)}
                                            alt={`Product ${index + 1}`}
                                            className="w-full h-40 object-cover rounded mb-2"
                                        />

                                        {processingImageIndex === index && (
                                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                                                <div className="flex flex-col items-center text-white">
                                                    <LoadingSpinner size={32} />
                                                    <span className="text-sm mt-2">Processing...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col space-y-2">
                                        <button
                                            onClick={() => handleRemoveBackground(index)}
                                            disabled={processingImageIndex !== null}
                                            className={`w-full py-2 px-3 rounded text-white font-medium text-sm ${processingImageIndex !== null
                                                ? "bg-gray-400 cursor-not-allowed"
                                                : "bg-red-600 hover:bg-red-700"
                                                }`}
                                        >
                                            {processingImageIndex === index ? "Processing..." : "Remove Bg"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex justify-center space-x-4">
                            <button
                                onClick={() => setShowRemoveBgPopup(false)}
                                disabled={processingImageIndex !== null}
                                className={`px-6 py-3 rounded-md text-white font-medium ${processingImageIndex !== null
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-gray-600 hover:bg-gray-700"
                                    }`}
                            >
                                Exit
                            </button>
                            <button
                                onClick={() => {
                                    const updatedImages = images.map((image, index) =>
                                        processedImages[index] ? processedImages[index] : image
                                    );
                                    setImages(updatedImages);
                                    setShowRemoveBgPopup(false);
                                }}
                                disabled={processingImageIndex !== null}
                                className={`px-6 py-3 rounded-md text-white font-medium ${processingImageIndex !== null
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700"
                                    }`}
                            >
                                Apply Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Modal */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 cursor-zoom-out"
                    onClick={() => setFullscreenImage(null)}
                >
                    <div className="relative max-w-full max-h-full">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setFullscreenImage(null);
                            }}
                            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10"
                            title="Close"
                        >
                            &times;
                        </button>
                        <img
                            src={URL.createObjectURL(fullscreenImage)}
                            alt="Fullscreen view"
                            className="max-w-full max-h-full object-contain"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateProduct;