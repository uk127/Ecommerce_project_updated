import React, { useEffect, useState } from "react";
import { AiOutlinePlusCircle } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { createProduct } from "../../redux/actions/product";
import { categoriesData } from "../../static/data";
import { toast } from "react-toastify";
import { backend_url } from "../../server";

const CreateProduct = () => {
    const { seller } = useSelector((state) => state.seller);
    const { success, error } = useSelector((state) => state.products);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [images, setImages] = useState([]);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("");
    const [tags, setTags] = useState("");
    const [originalPrice, setOriginalPrice] = useState();
    const [discountPrice, setDiscountPrice] = useState();
    const [stock, setStock] = useState();
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiGeneratedTitle, setAiGeneratedTitle] = useState("");
    const [aiGeneratedDescription, setAiGeneratedDescription] = useState("");
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

    const handleImageChange = (e) => {
        e.preventDefault();

        let files = Array.from(e.target.files);
        setImages((prevImages) => [...prevImages, ...files]);
    };

    console.log(images);

    const handleGenerateTitleAndDescription = async () => {
        if (images.length === 0) {
            toast.error("Please upload an image first");
            return;
        }

        if (images.length > 1) {
            toast.error("Please upload only one image for AI generation");
            return;
        }

        setIsGenerating(true);
        
        try {
            const formData = new FormData();
            formData.append("image", images[0]);

            console.log("Sending image to backend:", {
                filename: images[0].name,
                size: images[0].size,
                type: images[0].type
            });

            const response = await fetch(`${backend_url}api/v2/product/generate-title-description`, {
                method: "POST",
                body: formData,
            });

            console.log("Backend response status:", response.status);
            console.log("Backend response ok:", response.ok);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Backend error response:", errorText);
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            console.log("Generated result:", result);
            
            // Set the generated content
            setAiGeneratedTitle(result.title);
            setAiGeneratedDescription(result.description);
            
            // Update the form fields
            setName(result.title);
            setDescription(result.description);
            
            toast.success("Title and description generated successfully!");
        } catch (error) {
            console.error("Error generating title and description:", error);
            toast.error(`Failed to generate title and description: ${error.message}`);
        } finally {
            setIsGenerating(false);
        }
    };

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
                // Create a new file from the Cloudinary URL
                const imageUrl = result.imageUrl;
                
                // Fetch the image from Cloudinary to get the blob
                const imageResponse = await fetch(imageUrl);
                const imageBlob = await imageResponse.blob();
                
                // Create a new file with the processed image
                const newFile = new File([imageBlob], `bg_removed_${images[imageIndex].name}`, {
                    type: imageBlob.type || 'image/png'
                });

                // Update the processed images state
                setProcessedImages(prev => ({
                    ...prev,
                    [imageIndex]: newFile
                }));

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

    const handleCloseRemoveBgPopup = () => {
        setShowRemoveBgPopup(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const newForm = new FormData();

        images.forEach((image) => {
            newForm.append("images", image);
        });
        newForm.append("name", name);
        newForm.append("description", description);
        newForm.append("category", category);
        newForm.append("tags", tags);
        newForm.append("originalPrice", originalPrice);
        newForm.append("discountPrice", discountPrice);
        newForm.append("stock", stock);
        newForm.append("shopId", seller._id);
        dispatch(createProduct(newForm));
    };

    return (
        <div className="w-[90%] 800px:w-[50%] bg-white  shadow h-[80vh] rounded-[4px] p-3 overflow-y-scroll">
            <h5 className="text-[30px] font-Poppins text-center">Create Product</h5>
            {/* create product form */}
            <form onSubmit={handleSubmit}>
                <br />
                <div>
                    <label className="pb-2">
                        Name <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={name}
                        className="mt-2 appearance-none block w-full px-3 h-[35px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your product name..."
                    />
                </div>
                <br />
                <div>
                    <label className="pb-2">
                        Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        cols="30"
                        required
                        rows="8"
                        type="text"
                        name="description"
                        value={description}
                        className="mt-2 appearance-none block w-full pt-2 px-3 border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Enter your product description..."
                    ></textarea>
                </div>
                <br />
                <div>
                    <label className="pb-2">
                        Category <span className="text-red-500">*</span>
                    </label>
                    <select
                        className="w-full mt-2 border h-[35px] rounded-[5px]"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                    >
                        <option value="Choose a category">Choose a category</option>
                        {categoriesData &&
                            categoriesData.map((i) => (
                                <option value={i.title} key={i.title}>
                                    {i.title}
                                </option>
                            ))}
                    </select>
                </div>
                <br />
                <div>
                    <label className="pb-2">Tags</label>
                    <input
                        type="text"
                        name="tags"
                        value={tags}
                        className="mt-2 appearance-none block w-full px-3 h-[35px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Enter your product tags..."
                    />
                </div>
                <br />
                <div>
                    <label className="pb-2">Original Price</label>
                    <input
                        type="number"
                        name="price"
                        value={originalPrice}
                        className="mt-2 appearance-none block w-full px-3 h-[35px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="Enter your product price..."
                    />
                </div>
                <br />
                <div>
                    <label className="pb-2">
                        Price (With Discount) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="price"
                        value={discountPrice}
                        className="mt-2 appearance-none block w-full px-3 h-[35px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setDiscountPrice(e.target.value)}
                        placeholder="Enter your product price with discount..."
                    />
                </div>
                <br />
                <div>
                    <label className="pb-2">
                        Product Stock <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="price"
                        value={stock}
                        className="mt-2 appearance-none block w-full px-3 h-[35px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        onChange={(e) => setStock(e.target.value)}
                        placeholder="Enter your product stock..."
                    />
                </div>
                <br />
                <div>
                    <label className="pb-2">
                        Upload Images <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        name=""
                        id="upload"
                        className="hidden"
                        multiple
                        onChange={handleImageChange}
                    />
                    <div className="w-full flex items-center flex-wrap justify-center">
                        <label htmlFor="upload">
                            <AiOutlinePlusCircle size={70} className="mt-3 cursor-pointer" color="#555" />
                        </label>
                        {images &&
                            images.map((i, index) => (
                                <img
                                    src={URL.createObjectURL(i)}
                                    key={i}
                                    alt={`Product ${index + 1}`}
                                    className="h-[120px] w-[120px] object-cover m-2 cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => setFullscreenImage(i)}
                                    title="Click to view full screen"
                                />
                            ))}
                    </div>
                    
                    {/* Generate title and description button and Remove Bg button - side by side */}
                    {images.length > 0 && (
                        <div className="mt-4 flex justify-center space-x-4">
                            {/* Generate title and description button - only show when one image is uploaded */}
                            {images.length === 1 && (
                                <button
                                    type="button"
                                    onClick={handleGenerateTitleAndDescription}
                                    disabled={isGenerating}
                                    className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                                        isGenerating 
                                            ? "bg-gray-400 cursor-not-allowed" 
                                            : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    }`}
                                >
                                    {isGenerating ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Generating...
                                        </>
                                    ) : (
                                        "Generate Title & Description"
                                    )}
                                </button>
                            )}
                            
                            {/* Remove Bg button - show when images are uploaded */}
                            <button
                                type="button"
                                onClick={() => setShowRemoveBgPopup(true)}
                                disabled={isProcessingBgRemoval}
                                className={`flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                                    isProcessingBgRemoval 
                                        ? "bg-gray-400 cursor-not-allowed" 
                                        : "bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                }`}
                            >
                                {isProcessingBgRemoval ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    "Remove Bg"
                                )}
                            </button>
                        </div>
                    )}
                    
                    <br />
                    <div>
                        <input
                            type="submit"
                            value="Create"
                            className="mt-2 cursor-pointer appearance-none text-center block w-full px-3 h-[35px] border border-gray-300 rounded-[3px] placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        />
                    </div>
                </div>
            </form>

            {/* Remove Background Popup */}
            {showRemoveBgPopup && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[90%] max-w-4xl max-h-[80vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-semibold">Remove Background</h3>
                            <button
                                onClick={handleCloseRemoveBgPopup}
                                className="text-gray-500 hover:text-gray-700 text-2xl"
                            >
                                &times;
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((image, index) => (
                                <div key={index} className="border rounded-lg p-2">
                                    <div className="relative">
                                        {/* Show processed image if available, otherwise show original */}
                                        <img
                                            src={processedImages[index] 
                                                ? URL.createObjectURL(processedImages[index])
                                                : URL.createObjectURL(image)}
                                            alt={`Product ${index + 1}`}
                                            className="w-full h-40 object-cover rounded mb-2"
                                        />
                                        
                                        {/* Loading spinner overlay when processing this specific image */}
                                        {processingImageIndex === index && (
                                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                                                <div className="flex flex-col items-center text-white">
                                                    <svg className="animate-spin h-8 w-8 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                    <span className="text-sm">Processing...</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex flex-col space-y-2">
                                        <button
                                            onClick={() => handleRemoveBackground(index)}
                                            disabled={processingImageIndex !== null}
                                            className={`w-full py-2 px-3 rounded text-white font-medium ${
                                                processingImageIndex !== null
                                                    ? "bg-gray-400 cursor-not-allowed"
                                                    : "bg-red-600 hover:bg-red-700"
                                            }`}
                                        >
                                            {processingImageIndex === index ? "Processing..." : "Remove Bg"}
                                        </button>
                                        <button
                                            onClick={() => setShowRemoveBgPopup(false)}
                                            className="w-full py-2 px-3 rounded bg-gray-200 text-gray-800 font-medium hover:bg-gray-300"
                                        >
                                            Don't Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-4 text-sm text-gray-600">
                            Tip: Click "Remove Bg" to remove the background from an image, 
                            or "Don't Remove" to keep the image as is.
                        </div>
                        
                        {/* OK and Exit Buttons to complete the process */}
                        <div className="mt-6 flex justify-center space-x-4">
                            <button
                                onClick={() => {
                                    // Exit without applying changes - just close popup
                                    setShowRemoveBgPopup(false);
                                }}
                                disabled={processingImageIndex !== null}
                                className={`px-6 py-3 rounded-md text-white font-medium ${
                                    processingImageIndex !== null
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                }`}
                            >
                                {processingImageIndex !== null ? "Processing..." : "Exit"}
                            </button>
                            <button
                                onClick={() => {
                                    // Update main form images with processed images
                                    const updatedImages = images.map((image, index) => 
                                        processedImages[index] ? processedImages[index] : image
                                    );
                                    setImages(updatedImages);
                                    setShowRemoveBgPopup(false);
                                }}
                                disabled={processingImageIndex !== null}
                                className={`px-6 py-3 rounded-md text-white font-medium ${
                                    processingImageIndex !== null
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                }`}
                            >
                                {processingImageIndex !== null ? "Processing..." : "OK"}
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
                        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded">
                            Click anywhere outside the image to close
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreateProduct;
