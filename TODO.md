# TODO: Global Audio Toggle Feature

## Steps
- [x] 1. Understand current AIAssistant.jsx and ChatHeader.jsx implementation
- [x] 2. Add `isAudioEnabled` state + `toggleAudio` function in AIAssistant.jsx
- [x] 3. Gate `speakText()` behind audio toggle in AIAssistant.jsx
- [x] 4. Gate `playAudioFromBase64()` behind audio toggle in AIAssistant.jsx
- [x] 5. Gate audio playback in `sendMessage()` behind audio toggle in AIAssistant.jsx
- [x] 6. Pass `isAudioEnabled` and `toggleAudio` props to ChatHeader.jsx
- [x] 7. Add volume icon toggle button in ChatHeader.jsx UI
- [x] 8. Verify no breaking changes and clean code

