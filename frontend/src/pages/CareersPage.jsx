import React, { useState } from "react";
import Footer from "../components/Layout/Footer";
import Header from "../components/Layout/Header";
import styles from "../styles/styles";

const CareersPage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Header activeHeading={7} />
            <HeroSection />
            <WhyJoinUsSection />
            <OpenPositionsSection />
            <BenefitsSection />
            <CultureSection />
            <CTASection />
            <Footer />
        </div>
    );
};

// Hero Section with career-focused background
const HeroSection = () => {
    return (
        <section className="relative min-h-[70vh] 800px:min-h-[80vh] w-full bg-no-repeat bg-center bg-cover flex items-center"
            style={{
                backgroundImage:
                    "url(https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D)",
            }}
        >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 text-white">
                        <div className="inline-flex items-center gap-3 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full border border-white/30">
                            <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">Join Our Team</span>
                        </div>
                        
                        <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                            Build Your Future <br />
                            <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                                With Us
                            </span>
                        </h1>
                        
                        <p className="text-lg leading-relaxed max-w-2xl text-gray-200">
                            We're looking for passionate individuals who want to make a difference. 
                            Join a team that values innovation, collaboration, and growth. 
                            Together, we're shaping the future of e-commerce.
                        </p>
                        
                        <div className="flex flex-wrap gap-4">
                            <button className="group bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                                View Openings
                                <span className="ml-2 group-hover:translate-x-1 transition-transform duration-300">→</span>
                            </button>
                            <button className="border-2 border-white/50 text-white px-8 py-4 rounded-xl font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300 hover:shadow-lg">
                                Send Resume
                            </button>
                        </div>
                    </div>
                    
                    <div className="hidden lg:block">
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-2">50+</div>
                                    <p className="text-sm text-gray-200">Team Members</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-2">15+</div>
                                    <p className="text-sm text-gray-200">Countries</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-2">95%</div>
                                    <p className="text-sm text-gray-200">Retention Rate</p>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white mb-2">4.8/5</div>
                                    <p className="text-sm text-gray-200">Employee Rating</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// Why Join Us Section
const WhyJoinUsSection = () => {
    const benefits = [
        {
            title: "Innovation First",
            description: "Work with cutting-edge technologies and be part of groundbreaking projects that shape the future.",
            icon: "🚀"
        },
        {
            title: "Growth Opportunities",
            description: "Continuous learning, skill development, and clear career progression paths.",
            icon: "📈"
        },
        {
            title: "Work-Life Balance",
            description: "Flexible schedules, remote work options, and time to recharge and be your best self.",
            icon: "⚖️"
        },
        {
            title: "Inclusive Culture",
            description: "Diversity and inclusion are at our core. Everyone belongs and everyone contributes.",
            icon: "🤝"
        }
    ];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Join Us?</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        We believe that our people are our greatest asset. That's why we're committed to creating 
                        an environment where you can thrive both professionally and personally.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {benefits.map((benefit, index) => (
                        <div
                            key={index}
                            className="group text-center p-8 rounded-2xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all duration-300 transform hover:-translate-y-2"
                        >
                            <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                {benefit.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-4">{benefit.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{benefit.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Open Positions Section
const OpenPositionsSection = () => {
    const [selectedDepartment, setSelectedDepartment] = useState('All');

    const departments = ['All', 'Engineering', 'Design', 'Marketing', 'Sales', 'Support'];
    
    const positions = [
        {
            title: "Senior Frontend Developer",
            department: "Engineering",
            type: "Full-time",
            location: "Remote",
            description: "Build beautiful, responsive interfaces using React and modern technologies.",
            requirements: ["5+ years experience", "React expertise", "TypeScript knowledge"]
        },
        {
            title: "UX/UI Designer",
            department: "Design",
            type: "Full-time",
            location: "Hybrid",
            description: "Create intuitive and beautiful user experiences for our platform.",
            requirements: ["Portfolio required", "Figma expertise", "User research experience"]
        },
        {
            title: "Digital Marketing Manager",
            department: "Marketing",
            type: "Full-time",
            location: "Remote",
            description: "Lead our marketing efforts and drive user acquisition.",
            requirements: ["3+ years experience", "SEO/SEM knowledge", "Analytics expertise"]
        },
        {
            title: "Customer Success Specialist",
            department: "Support",
            type: "Part-time",
            location: "Office",
            description: "Help our customers succeed and ensure they get the most value from our platform.",
            requirements: ["Customer service experience", "Problem-solving skills", "Communication skills"]
        },
        {
            title: "Product Manager",
            department: "Engineering",
            type: "Full-time",
            location: "Hybrid",
            description: "Lead product development and strategy for our key features.",
            requirements: ["Product management experience", "Technical background", "Leadership skills"]
        }
    ];

    const filteredPositions = selectedDepartment === 'All' 
        ? positions 
        : positions.filter(pos => pos.department === selectedDepartment);

    return (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Open Positions</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Find your perfect role and start your journey with us.
                    </p>
                </div>

                {/* Department Filter */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                    {departments.map((dept) => (
                        <button
                            key={dept}
                            onClick={() => setSelectedDepartment(dept)}
                            className={`px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                                selectedDepartment === dept
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {dept}
                        </button>
                    ))}
                </div>

                {/* Job Listings */}
                <div className="grid gap-8">
                    {filteredPositions.map((position, index) => (
                        <div
                            key={index}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-4 mb-3">
                                        <h3 className="text-2xl font-bold text-gray-900">{position.title}</h3>
                                        <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                            {position.department}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {position.type}
                                        </span>
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {position.location}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 leading-relaxed mb-4">{position.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        {position.requirements.map((req, i) => (
                                            <span key={i} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                                                {req}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <button className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-300">
                                        Apply Now
                                    </button>
                                    <button className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-all duration-300">
                                        Learn More
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredPositions.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No positions available</h3>
                        <p className="text-gray-600">Check back soon for new opportunities!</p>
                    </div>
                )}
            </div>
        </section>
    );
};

// Benefits Section
const BenefitsSection = () => {
    const benefits = [
        {
            category: "Health & Wellness",
            items: ["Medical, Dental, Vision Insurance", "Mental Health Support", "Gym Membership", "Wellness Programs"]
        },
        {
            category: "Financial",
            items: ["Competitive Salary", "Stock Options", "401(k) Matching", "Performance Bonuses"]
        },
        {
            category: "Work-Life Balance",
            items: ["Flexible PTO", "Remote Work Options", "Flexible Hours", "Parental Leave"]
        },
        {
            category: "Professional Growth",
            items: ["Learning Budget", "Conference Attendance", "Mentorship Programs", "Career Development"]
        }
    ];

    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Benefits</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        We invest in our team's well-being and growth because when you thrive, we all succeed.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {benefits.map((benefit, index) => (
                        <div
                            key={index}
                            className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-8"
                        >
                            <h3 className="text-xl font-bold text-gray-900 mb-6">{benefit.category}</h3>
                            <ul className="space-y-3">
                                {benefit.items.map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-gray-700">
                                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

// Culture Section
const CultureSection = () => {
    return (
        <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Culture</h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        We're more than just a company. We're a community of passionate individuals 
                        working together to make a difference.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mb-6 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Team Collaboration</h3>
                        <p className="text-gray-600 leading-relaxed">
                            We believe in the power of teamwork. Our collaborative environment 
                            encourages open communication, knowledge sharing, and mutual support.
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mb-6 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Innovation</h3>
                        <p className="text-gray-600 leading-relaxed">
                            Innovation is in our DNA. We encourage creative thinking, 
                            experimentation, and always look for better ways to solve problems.
                        </p>
                    </div>
                    
                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-6 flex items-center justify-center">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Work-Life Balance</h3>
                        <p className="text-gray-600 leading-relaxed">
                            We understand that life happens outside of work. That's why we 
                            offer flexible schedules and support to help you maintain balance.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
};

// CTA Section
const CTASection = () => {
    return (
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
                <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
                <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                    Join a team that values your ideas, supports your growth, and celebrates your success. 
                    Together, we'll build something amazing.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-105">
                        View All Openings
                    </button>
                    <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white hover:text-blue-600 transition-all duration-300">
                        Send Your Resume
                    </button>
                </div>
                <p className="mt-8 text-blue-200">
                    Have questions? <a href="mailto:careers@sigmastore.com" className="underline">Contact our HR team</a>
                </p>
            </div>
        </section>
    );
};

export default CareersPage;