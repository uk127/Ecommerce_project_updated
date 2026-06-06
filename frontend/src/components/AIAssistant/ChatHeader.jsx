import React from "react";
import { AiOutlineClose } from "react-icons/ai";
import { BsChatDots } from "react-icons/bs";
import { FiSettings } from "react-icons/fi";
import { HiOutlineVolumeUp, HiOutlineVolumeOff } from "react-icons/hi";
import { useNavigate, useLocation } from "react-router-dom";

const ChatHeader = ({ isSpeaking, isListening, isLoading, isAudioEnabled, onToggleAudio, onClose, onSettingsClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // const handleSettingsClick = () => {
  //   navigate("/chat/settings/language", { replace: false, state: { from: location.pathname } });
  // };

  return (
    <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm relative">
          <BsChatDots className="text-white text-xl" />
          {isSpeaking && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          )}
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">Annachi AI</h3>
          <p className="text-white/80 text-xs">
            {isListening
              ? "🎤 Listening..."
              : isSpeaking
                ? "🔊 Speaking..."
                : isLoading
                  ? "⏳ Thinking..."
                  : "Powered by AI"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Audio Toggle Button */}
        <button
          onClick={onToggleAudio}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
          aria-label={isAudioEnabled ? "Mute AI voice" : "Unmute AI voice"}
          title={isAudioEnabled ? "Mute AI voice" : "Unmute AI voice"}
        >
          {isAudioEnabled ? (
            <HiOutlineVolumeUp className="text-white text-lg" />
          ) : (
            <HiOutlineVolumeOff className="text-white text-lg" />
          )}
        </button>

        {/* Settings Icon */}
        <button
          onClick={onSettingsClick}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
          aria-label="Open settings"
          title="Settings"
        >
          <FiSettings className="text-white text-lg" />
        </button>

        {/* Close Icon */}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-colors flex items-center justify-center"
          aria-label="Close chat"
        >
          <AiOutlineClose className="text-white text-lg" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;

