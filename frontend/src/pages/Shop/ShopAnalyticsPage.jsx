import React from "react";
import { useSelector } from "react-redux";
import DashboardHeader from "../../components/Shop/Layout/DashboardHeader";
import DashboardSideBar from "../../components/Shop/Layout/DashboardSideBar";
import Analytics from "../../components/Shop/Analytics";

const ShopAnalyticsPage = () => {
    // Get seller data from Redux store
    const { seller, isLoading } = useSelector((state) => state.seller);
    const sellerId = seller?._id;
    
    console.log("[ShopAnalyticsPage] Seller from Redux:", seller);
    console.log("[ShopAnalyticsPage] Seller ID:", sellerId);

    return (
        <div>
            <DashboardHeader />
            <div className="flex items-start justify-between w-full">
                <div className="w-[80px] 800px:w-[330px]">
                    <DashboardSideBar active={2} />
                </div>
                <div className="w-full">
                    <Analytics sellerId={sellerId} />
                </div>
            </div>
        </div>
    );
};

export default ShopAnalyticsPage;
