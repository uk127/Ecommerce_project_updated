import React, { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const LanguageSettingsPage = ({onBack}) => {
  const navigate = useNavigate();

  //  load saved language or default
  const [selectedLang, setSelectedLang] = useState(
    localStorage.getItem("language") || "en"
  );

  const handleBack = () => {
    navigate(-1);
  };

  const handleLanguageSelect = (code) => {
    setSelectedLang(code);
    localStorage.setItem("language", code); //  IMPORTANT
    window.location.reload();
  };

  const languages = [
    { code: "en", label: "English", native: "English" },
    { code: "ta", label: "Tamil", native: "தமிழ்" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-orange-50/50 to-white">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-4 flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
        >
          <FiArrowLeft className="text-white text-lg" />
        </button>
        <h3 className="text-white font-semibold text-lg">Language Settings</h3>
      </div>

      {/* Options */}
      <div className="flex-1 px-4 py-6 overflow-y-auto">
        <p className="text-sm text-gray-500 mb-4">
          Select your preferred language
        </p>

        <div className="flex flex-col gap-3">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageSelect(lang.code)} //  ADD THIS
              className={`w-full text-left px-5 py-4 bg-white border rounded-xl shadow-sm transition-all duration-200 active:scale-[0.98]
                ${
                  selectedLang === lang.code
                    ? "border-orange-500 shadow-md"
                    : "border-orange-100 hover:border-orange-300 hover:shadow-md"
                }`}
            >
              <span className="font-medium text-gray-800">
                {lang.label}
              </span>
              <span className="block text-sm text-gray-500 mt-0.5">
                {lang.native}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LanguageSettingsPage;