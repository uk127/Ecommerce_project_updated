import React, { useState, useEffect } from "react";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import styles from "../styles/styles";

const AboutUsPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Header activeHeading={6} />
            <HeroSection />
            <MissionVisionSection />
            <StatsSection />
            <Footer />
        </div>
    );
};

// Hero Section with animated background
const HeroSection = () => {
    return (
        <section className="relative py-20 overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute top-1/3 right-0 w-80 h-80 bg-gradient-to-br from-green-400/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-br from-purple-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse delay-2000"></div>
            </div>

            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-white/50">
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-gray-700">About SigmaShop</span>
                        </div>
                        
                        <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                            <span className="text-gray-800">
                                Empowering
                            </span>{" "}
                            <br />
                            <span className="text-gray-800">Your Shopping</span>{" "}
                            <span className="text-gray-800">
                                Journey
                            </span>
                        </h1>
                        
                        <p className="text-xl text-gray-600 leading-relaxed max-w-2xl">
                            We're on a mission to revolutionize the way you shop. With cutting-edge 
                            technology and a passion for excellence, we bring you the best products 
                            and services tailored to your unique needs.
                        </p>
                        
                    </div>
                    
                    <div className="relative">
                        <div className="relative bg-white rounded-2xl shadow-2xl p-8 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-xl">
                                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg mb-4 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">Lightning Fast</h3>
                                    <p className="text-sm text-gray-600">Quick delivery and seamless experience</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-xl">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg mb-4 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">Trusted Quality</h3>
                                    <p className="text-sm text-gray-600">Premium products guaranteed</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl">
                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg mb-4 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">Customer Love</h3>
                                    <p className="text-sm text-gray-600">Satisfaction guaranteed</p>
                                </div>
                                
                                <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-xl">
                                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg mb-4 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-2">24/7 Support</h3>
                                    <p className="text-sm text-gray-600">Always here to help</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Floating elements */}
                        <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
                        <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-gradient-to-r from-green-400/20 to-blue-400/20 rounded-full blur-xl"></div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// Mission & Vision Section
const MissionVisionSection = () => {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Mission & Vision</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Discover what drives us and where we're headed. Our commitment to excellence 
                        and innovation shapes everything we do.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="relative">
                            <div className="absolute -left-4 top-0 w-1 h-16 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-6 pl-8">Our Mission</h3>
                            <p className="text-lg text-gray-600 leading-relaxed pl-8">
                                To provide exceptional shopping experiences through innovative technology, 
                                quality products, and outstanding customer service. We strive to make every 
                                interaction meaningful and every purchase worthwhile.
                            </p>
                        </div>
                        
                        <div className="relative">
                            <div className="absolute -left-4 top-0 w-1 h-16 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
                            <h3 className="text-3xl font-bold text-gray-900 mb-6 pl-8">Our Vision</h3>
                            <p className="text-lg text-gray-600 leading-relaxed pl-8">
                                To become the most trusted and preferred shopping destination worldwide, 
                                setting new standards for quality, innovation, and customer satisfaction 
                                in the e-commerce industry.
                            </p>
                        </div>
                    </div>
                    
                    <div className="relative">
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8 shadow-lg">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Innovation</h4>
                                    <p className="text-sm text-gray-600">Leading with cutting-edge solutions</p>
                                </div>
                                
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Security</h4>
                                    <p className="text-sm text-gray-600">Your safety is our priority</p>
                                </div>
                                
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Quality</h4>
                                    <p className="text-sm text-gray-600">Premium standards guaranteed</p>
                                </div>
                                
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-gray-900 mb-2">Support</h4>
                                    <p className="text-sm text-gray-600">Always here for you</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Decorative elements */}
                        <div className="absolute -top-4 -right-4 w-32 h-32 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full"></div>
                        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-full"></div>
                    </div>
                </div>
            </div>
        </section>
    );
};


// Stats Section
const StatsSection = () => {
    const [stats, setStats] = useState({
        customers: 0,
        products: 0,
        countries: 0,
        awards: 0
    });

    useEffect(() => {
        const targets = { customers: 50000, products: 10000, countries: 50, awards: 25 };
        const duration = 2000;
        const steps = 60;
        const interval = duration / steps;
        
        const increment = {
            customers: Math.ceil(targets.customers / steps),
            products: Math.ceil(targets.products / steps),
            countries: Math.ceil(targets.countries / steps),
            awards: Math.ceil(targets.awards / steps)
        };

        let current = { customers: 0, products: 0, countries: 0, awards: 0 };
        const timer = setInterval(() => {
            current = {
                customers: Math.min(current.customers + increment.customers, targets.customers),
                products: Math.min(current.products + increment.products, targets.products),
                countries: Math.min(current.countries + increment.countries, targets.countries),
                awards: Math.min(current.awards + increment.awards, targets.awards)
            };
            
            setStats(current);
            
            if (current.customers >= targets.customers &&
                current.products >= targets.products &&
                current.countries >= targets.countries &&
                current.awards >= targets.awards) {
                clearInterval(timer);
            }
        }, interval);

        return () => clearInterval(timer);
    }, []);

    const statsData = [
        { label: "Happy Customers", value: stats.customers.toLocaleString(), suffix: "+", icon: "👥" },
        { label: "Products Available", value: stats.products.toLocaleString(), suffix: "+", icon: "📦" },
        { label: "Countries Served", value: stats.countries, suffix: "+", icon: "🌍" },
        { label: "Awards Won", value: stats.awards, suffix: "+", icon: "🏆" }
    ];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Achievements</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Proud moments and milestones that define our journey of excellence.
                    </p>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                    {statsData.map((stat, index) => (
                        <div
                            key={index}
                            className="text-center group hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 p-8 rounded-2xl transition-all duration-300 transform hover:-translate-y-2"
                        >
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                {stat.icon}
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {stat.value}
                                <span className="text-lg font-normal text-gray-600 ml-1">{stat.suffix}</span>
                            </div>
                            <div className="text-gray-600 font-medium">{stat.label}</div>
                        </div>
                    ))}
                </div>
                
                <div className="mt-16 text-center">
                    <div className="inline-flex items-center gap-4 bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            5+
                        </div>
                        <div className="text-left">
                            <h3 className="text-2xl font-bold text-gray-900">Years of Excellence</h3>
                            <p className="text-gray-600">Serving customers with passion and dedication</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AboutUsPage;