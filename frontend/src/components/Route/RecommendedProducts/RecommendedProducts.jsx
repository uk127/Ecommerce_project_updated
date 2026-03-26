/**
 * Recommended Products Component
 * 
 * Displays personalized product recommendations on the home page.
 * Uses ADD scoring algorithm:
 * - Click weight: 3
 * - Order weight: 4
 * - Score(category) = (click_count × 3) + (order_count × 4)
 * 
 * Features:
 * - Shows up to 20 products for authenticated users
 * - Proportional distribution based on category preferences
 * - Shows trending products for new users
 * - Fallback for guest users
 */

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { server } from "../../../server";
import ProductCard from "../ProductCard/ProductCard";
import styles from "../../../styles/styles";

const RecommendedProducts = ({ count = 20 }) => {
  const { isAuthenticated } = useSelector((state) => state.user);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metadata, setMetadata] = useState(null);

  useEffect(() => {
    // Fetch recommendations based on authentication status
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        let endpoint;
        
        if (isAuthenticated) {
          // Use personalized home recommendations for authenticated users
          endpoint = `${server}/recommendations/home?count=${count}`;
        } else {
          // Use trending products for guest users
          endpoint = `${server}/recommendations/trending?count=${count}`;
        }
        
        const { data } = await axios.get(endpoint, {
          withCredentials: true,
        });
        
        console.log("Recommendations response:", data);
        
        if (data && data.recommendations) {
          setRecommendations(data.recommendations);
          setMetadata(data.metadata || null);
        }
      } catch (err) {
        console.error("Recommendations error:", err.response?.data || err.message);
        setError("Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isAuthenticated, count]);

  // Don't render if loading and no recommendations yet
  if (loading && recommendations.length === 0) {
    return (
      <div className={`${styles.section} mb-10`}>
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3321c8] mx-auto"></div>
          <p className="mt-4 text-gray-500">
            {isAuthenticated 
              ? "Loading personalized recommendations..." 
              : "Loading trending products..."}
          </p>
        </div>
      </div>
    );
  }

  // Show message if no recommendations available
  if (!loading && recommendations.length === 0) {
    return null;
  }

  // Determine the section title and description
  const getSectionInfo = () => {
    if (!isAuthenticated) {
      return {
        title: "Trending Products",
        description: "Popular products our customers love",
        icon: "🔥"
      };
    }
    
    if (metadata?.isPersonalized) {
      return {
        title: "Recommended For You",
        description: "Based on your browsing history and purchases",
        icon: "✨"
      };
    }
    
    return {
      title: "Popular Products",
      description: "Browse more products to get personalized recommendations",
      icon: "⭐"
    };
  };

  const sectionInfo = getSectionInfo();

  return (
    <div className={`${styles.section} mb-10`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span>{sectionInfo.icon}</span>
            {sectionInfo.title}
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            {sectionInfo.description}
          </p>
        </div>
        
        {/* Show category scores if available */}
        {metadata?.categoryScores && Object.keys(metadata.categoryScores).length > 0 && (
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
            <span>Categories:</span>
            {Object.entries(metadata.categoryScores)
              .slice(0, 3)
              .map(([category, score]) => (
                <span 
                  key={category}
                  className="bg-gray-100 px-2 py-1 rounded-full"
                >
                  {category} ({score})
                </span>
              ))}
          </div>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Products Grid - Responsive layout for up to 20 products */}
      <div className="grid grid-cols-2 gap-[20px] md:grid-cols-3 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
        {recommendations.map((product, index) => (
          <ProductCard key={product._id || index} data={product} />
        ))}
      </div>

      {/* Loading overlay when fetching more */}
      {loading && recommendations.length > 0 && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3321c8] mx-auto"></div>
        </div>
      )}

      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === 'development' && metadata && (
        <details className="text-xs text-gray-400 mt-4">
          <summary className="cursor-pointer">Debug: Recommendation Metadata</summary>
          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-x-auto">
            {JSON.stringify(metadata, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default RecommendedProducts;