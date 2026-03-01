import React, { useState } from "react";
import { AiOutlineBarChart, AiOutlineLineChart, AiOutlinePieChart } from "react-icons/ai";
import { FaShoppingCart, FaUsers, FaRupeeSign } from "react-icons/fa";
import styles from "../../styles/styles";

const Analytics = () => {
    // Hardcoded sample data for demonstration
    const [analyticsData] = useState({
        totalRevenue: 125000,
        totalOrders: 45,
        totalProducts: 12,
        totalCustomers: 38,
        monthlyRevenue: [8000, 12000, 9500, 15000, 11000, 18000, 14000, 16000, 13000, 12500, 14500, 16500],
        productBuyers: [
            ["Organic Apples", 15],
            ["Fresh Tomatoes", 12],
            ["Whole Grain Bread", 10],
            ["Free Range Eggs", 8],
            ["Greek Yogurt", 6]
        ],
        orderStatus: { delivered: 35, pending: 7, cancelled: 3 }
    });

    return (
        <div className="w-full p-8">
            <h3 className="text-[22px] font-Poppins pb-2">Analytics Dashboard</h3>
            
            {/* Key Metrics */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Revenue</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">₹{analyticsData.totalRevenue.toLocaleString()}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                            <FaRupeeSign className="text-white text-xl" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-green-600">
                        <span className="mr-2">▲</span>
                        <span>vs last month</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Orders</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.totalOrders}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                            <FaShoppingCart className="text-white text-xl" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-blue-600">
                        <span className="mr-2">▲</span>
                        <span>vs last month</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Products</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.totalProducts}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                            <AiOutlineBarChart className="text-white text-xl" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-purple-600">
                        <span className="mr-2">▲</span>
                        <span>vs last month</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Customers</p>
                            <h3 className="text-2xl font-bold text-gray-900 mt-1">{analyticsData.totalCustomers}</h3>
                        </div>
                        <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-red-500 rounded-lg flex items-center justify-center">
                            <FaUsers className="text-white text-xl" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm text-orange-600">
                        <span className="mr-2">▲</span>
                        <span>vs last month</span>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Monthly Revenue Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold mb-4">Monthly Revenue</h4>
                    <div className="space-y-2">
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                            const revenue = analyticsData.monthlyRevenue[index] || 0;
                            const maxRevenue = Math.max(...analyticsData.monthlyRevenue, 1);
                            const percentage = (revenue / maxRevenue) * 100;
                            
                            return (
                                <div key={month} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600 w-12">{month}</span>
                                    <div className="flex-1 mx-4 bg-gray-200 rounded-full h-4">
                                        <div 
                                            className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium">₹{revenue.toLocaleString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Product Buyers Chart */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold mb-4">Products vs Number of Buyers</h4>
                    <div className="space-y-4">
                        {analyticsData.productBuyers.map(([productName, buyerCount], index) => {
                            const maxBuyers = Math.max(...analyticsData.productBuyers.map(([, count]) => count), 1);
                            const percentage = (buyerCount / maxBuyers) * 100;
                            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                            
                            return (
                                <div key={index} className="flex items-center">
                                    <span className="text-sm text-gray-600 w-24 truncate">{productName}</span>
                                    <div className="flex-1 mx-4 bg-gray-200 rounded-full h-6">
                                        <div 
                                            className={`h-6 rounded-full transition-all duration-500 ${colors[index % colors.length]}`}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-sm font-medium w-12 text-right">{buyerCount}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Order Status Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h4 className="text-lg font-semibold mb-4">Order Status Distribution</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="relative">
                            <div className="w-48 h-48 mx-auto relative">
                                {/* Delivered */}
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {analyticsData.orderStatus.delivered}
                                </div>
                                {/* Pending */}
                                <div className="absolute top-16 left-0 w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {analyticsData.orderStatus.pending}
                                </div>
                                {/* Cancelled */}
                                <div className="absolute top-16 right-0 w-20 h-20 bg-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                    {analyticsData.orderStatus.cancelled}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                <span className="font-medium">Delivered</span>
                            </div>
                            <span className="text-lg font-bold">{analyticsData.orderStatus.delivered}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                                <span className="font-medium">Pending</span>
                            </div>
                            <span className="text-lg font-bold">{analyticsData.orderStatus.pending}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                            <div className="flex items-center">
                                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                                <span className="font-medium">Cancelled</span>
                            </div>
                            <span className="text-lg font-bold">{analyticsData.orderStatus.cancelled}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance Summary */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold mb-4">Average Order Value</h4>
                    <div className="text-3xl font-bold text-blue-600">
                        ₹{analyticsData.totalOrders > 0 ? (analyticsData.totalRevenue / analyticsData.totalOrders).toFixed(2) : '0.00'}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Average revenue per order</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold mb-4">Conversion Rate</h4>
                    <div className="text-3xl font-bold text-green-600">
                        {analyticsData.totalProducts > 0 ? ((analyticsData.totalOrders / analyticsData.totalProducts) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Orders per product</p>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h4 className="text-lg font-semibold mb-4">Customer Retention</h4>
                    <div className="text-3xl font-bold text-purple-600">
                        {analyticsData.totalOrders > 0 ? ((analyticsData.totalCustomers / analyticsData.totalOrders) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Repeat customer rate</p>
                </div>
            </div>
        </div>
    );
};

export default Analytics;