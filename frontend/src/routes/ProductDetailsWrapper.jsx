import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ProductDetails from "../components/Products/ProductDetails";

const ProductDetailsWrapper = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await axios.get(`/api/product/${id}`);
      setData(res.data.product);
    };

    fetchProduct();
  }, [id]);

  if (!data) return <div>Loading...</div>;

  return <ProductDetails data={data} />;
};

export default ProductDetailsWrapper;