import React from "react";
import { AiOutlineGift } from "react-icons/ai";
import { MdOutlineLocalOffer } from "react-icons/md";
import { FiPackage, FiShoppingBag } from "react-icons/fi";
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { BiMessageSquareDetail } from "react-icons/bi";
import { AiOutlineLogout } from "react-icons/ai";
import { backend_url, server } from "../../../server";
import axios from "axios";
import { toast } from "react-toastify";

const DashboardHeader = () => {
    const { seller } = useSelector((state) => state.seller);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const logoutHandler = async () => {
        try {
            await axios.get(`${server}/shop/logout`, {
                withCredentials: true,
            });
            dispatch({ type: "LoadSellerFail" });
            toast.success("Logged out successfully!");
            navigate("/shop-login");
        } catch (error) {
            toast.error(error.response?.data?.message || "Logout failed");
        }
    };

    return (
        <div className="w-full h-[80px] bg-white shadow sticky top-0 left-0 z-30 flex items-center justify-between px-4">
            <div>
                <Link to="/dashboard">
                    <img
                        // src="https://shopo.quomodothemes.website/assets/images/logo.svg"
                        src="sigmastore4.png"
                        alt=""
                    />
                </Link>
            </div>
            <div className="flex items-center">
                <div className="flex items-center mr-4">
                    <Link to="/dashboard/cupouns" className="800px:block hidden">
                        <AiOutlineGift
                            color="#555"
                            size={30}
                            className="mx-5 cursor-pointer"
                        />
                    </Link>
                    <Link to="/dashboard-events" className="800px:block hidden">
                        <MdOutlineLocalOffer
                            color="#555"
                            size={30}
                            className="mx-5 cursor-pointer"
                        />
                    </Link>
                    <Link to="/dashboard-products" className="800px:block hidden">
                        <FiShoppingBag
                            color="#555"
                            size={30}
                            className="mx-5 cursor-pointer"
                        />
                    </Link>
                    <Link to="/dashboard-orders" className="800px:block hidden">
                        <FiPackage color="#555" size={30} className="mx-5 cursor-pointer" />
                    </Link>
                    <Link to="/dashboard-messages" className="800px:block hidden">
                        <BiMessageSquareDetail
                            color="#555"
                            size={30}
                            className="mx-5 cursor-pointer"
                        />
                    </Link>
                    {seller && seller._id && (
                        <Link to={`/shop/${seller._id}`}>
                            <img
                                src={seller.avatar?.startsWith('http') ? seller.avatar : `${backend_url}${seller.avatar}`}
                                alt=""
                                className="w-[50px] h-[50px] rounded-full object-cover"
                            />
                        </Link>
                    )}
                    <div
                        className="ml-4 cursor-pointer"
                        onClick={logoutHandler}
                    >
                        <AiOutlineLogout
                            color="#555"
                            size={30}
                            className="mx-5 cursor-pointer"
                            title="Logout"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
