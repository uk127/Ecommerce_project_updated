/**
 * Recommended Products Component
 * 
 * Displays personalized product recommendations on the home page.
 * Only shows for authenticated users based on their browsing history.
 */

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { server } from "../../../server";
import ProductCard from "../ProductCard/ProductCard";
import styles from "../../../styles/styles";

const RecommendedProducts = () => {
  const { isAuthenticated } = useSelector((state) => state.user);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Only fetch recommendations for authenticated users
    if (!isAuthenticated) {
      setRecommendations([]);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data } = await axios.get(`${server}/recommendations`, {
          withCredentials: true,
        });
        
        console.log("Recommendations response:", data);
        
        if (data && data.recommendations) {
          setRecommendations(data.recommendations);
        }
      } catch (err) {
        console.error("Recommendations error:", err.response?.data || err.message);
        setError("Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [isAuthenticated]);

  // Don't render anything if user is not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if loading and no recommendations yet
  if (loading && recommendations.length === 0) {
    return (
      <div className={`${styles.section} mb-10`}>
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3321c8] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading personalized recommendations...</p>
        </div>
      </div>
    );
  }

  // Show message if no recommendations available yet
  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <div className={`${styles.section} mb-10`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Recommended For You
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Based on your browsing history and preferences
          </p>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Products Grid */}
      <div className="grid grid-cols-2 gap-[20px] md:grid-cols-3 md:gap-[25px] lg:grid-cols-4 lg:gap-[25px] xl:grid-cols-5 xl:gap-[30px] mb-12">
        {recommendations.slice(0, 10).map((product, index) => (
          <ProductCard key={product._id || index} data={product} />
        ))}
      </div>

      {/* Loading overlay when fetching more */}
      {loading && recommendations.length > 0 && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3321c8] mx-auto"></div>
        </div>
      )}
    </div>
  );
};

export default RecommendedProducts;