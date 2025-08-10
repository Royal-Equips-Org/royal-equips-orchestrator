"""Voice control components for the Holographic Control Center.

This module provides voice capture using streamlit-webrtc, speech-to-text
via OpenAI Whisper, and text-to-speech via browser SpeechSynthesis API.
"""

from __future__ import annotations

import os
import asyncio
import logging
import base64
from io import BytesIO
from typing import Optional, Callable, Any

import streamlit as st
import streamlit.components.v1 as components
from streamlit_webrtc import webrtc_streamer, WebRtcMode, RTCConfiguration
from streamlit_webrtc.models import ClientSettings

logger = logging.getLogger(__name__)

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available - voice features disabled")


def is_voice_enabled() -> bool:
    """Check if voice features are enabled and configured."""
    return (
        OPENAI_AVAILABLE and
        bool(os.getenv("OPENAI_API_KEY")) and
        os.getenv("VOICE_ENABLED", "true").lower() == "true"
    )


def render_voice_status() -> None:
    """Render voice feature status indicators."""
    if not is_voice_enabled():
        st.warning("🎤 Voice features disabled: Missing OpenAI API key or VOICE_ENABLED=false")
        return
    
    st.success("🎤 Voice features enabled")


class VoiceRecorder:
    """Voice recording component using streamlit-webrtc."""
    
    def __init__(self, key: str = "voice_recorder") -> None:
        self.key = key
        self.audio_data: Optional[bytes] = None
        
    def render_recorder(self) -> Optional[bytes]:
        """Render voice recorder interface and return audio data if available."""
        if not is_voice_enabled():
            st.error("Voice recording not available")
            return None
        
        # WebRTC configuration
        rtc_config = RTCConfiguration({"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]})
        
        # Client settings for audio recording
        client_settings = ClientSettings(
            rtc_configuration=rtc_config,
            media_stream_constraints={
                "video": False,
                "audio": {
                    "sampleRate": 16000,
                    "channelCount": 1,
                    "sampleSize": 16,
                    "echoCancellation": True,
                    "noiseSuppression": True,
                    "autoGainControl": True
                }
            }
        )
        
        # WebRTC streamer for audio recording
        webrtc_ctx = webrtc_streamer(
            key=self.key,
            mode=WebRtcMode.SENDONLY,
            client_settings=client_settings,
            media_stream_constraints={"video": False, "audio": True},
            audio_processor=self._audio_processor
        )
        
        # Recording state
        if webrtc_ctx.state.playing:
            st.info("🎤 Recording... Click Stop to process")
        else:
            st.info("🎤 Click Start to begin recording")
        
        return self.audio_data
    
    def _audio_processor(self, frames) -> None:
        """Process audio frames from WebRTC."""
        # This is a simplified version - in a real implementation,
        # you'd collect audio frames and convert them to a format
        # suitable for OpenAI Whisper
        pass


def render_microphone_button(on_click: Optional[Callable[[], Any]] = None) -> bool:
    """Render a styled microphone button."""
    if not is_voice_enabled():
        st.button("🎤 Voice Disabled", disabled=True)
        return False
    
    # Custom microphone button with CSS styling
    mic_button_html = f"""
    <style>
    .mic-button {{
        background: radial-gradient(circle, #ff0080, #8000ff);
        border: none;
        border-radius: 50%;
        width: 80px;
        height: 80px;
        color: white;
        font-size: 2rem;
        cursor: pointer;
        box-shadow: 
            0 0 30px rgba(255, 0, 128, 0.5),
            0 4px 15px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
        display: block;
        margin: 0 auto;
    }}
    
    .mic-button:hover {{
        box-shadow: 
            0 0 40px rgba(255, 0, 128, 0.7),
            0 6px 20px rgba(0, 0, 0, 0.4);
        transform: scale(1.1);
    }}
    
    .mic-button:active {{
        transform: scale(0.95);
    }}
    
    .mic-button.recording {{
        animation: pulse 2s infinite;
        background: radial-gradient(circle, #00ff41, #00ffff);
    }}
    
    @keyframes pulse {{
        0% {{ box-shadow: 0 0 30px rgba(0, 255, 65, 0.5); }}
        50% {{ box-shadow: 0 0 50px rgba(0, 255, 65, 0.9); }}
        100% {{ box-shadow: 0 0 30px rgba(0, 255, 65, 0.5); }}
    }}
    </style>
    
    <button class="mic-button" id="voice-btn" onclick="toggleRecording()">
        <span id="mic-icon">🎤</span>
    </button>
    
    <script>
    let isRecording = false;
    
    function toggleRecording() {{
        const btn = document.getElementById('voice-btn');
        const icon = document.getElementById('mic-icon');
        
        if (!isRecording) {{
            btn.classList.add('recording');
            icon.textContent = '⏹️';
            isRecording = true;
            // Trigger Streamlit callback
            window.parent.postMessage({{type: 'voice-start'}}, '*');
        }} else {{
            btn.classList.remove('recording');
            icon.textContent = '🎤';
            isRecording = false;
            // Trigger Streamlit callback
            window.parent.postMessage({{type: 'voice-stop'}}, '*');
        }}
    }}
    </script>
    """
    
    # Render the component
    components.html(mic_button_html, height=120)
    
    # Simplified button for now
    if st.button("🎤 Voice Command", key="voice_cmd_btn"):
        if on_click:
            on_click()
        return True
    
    return False


async def transcribe_audio(audio_data: bytes, model: str = "whisper-1") -> Optional[str]:
    """Transcribe audio using OpenAI Whisper."""
    if not OPENAI_AVAILABLE or not audio_data:
        return None
    
    try:
        # Initialize OpenAI client
        client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Create a file-like object from audio data
        audio_file = BytesIO(audio_data)
        audio_file.name = "audio.wav"  # Whisper needs a filename
        
        # Transcribe
        response = client.audio.transcriptions.create(
            model=model,
            file=audio_file,
            language="en"
        )
        
        return response.text
        
    except Exception as e:
        logger.error(f"Failed to transcribe audio: {e}")
        return None


def render_text_to_speech_component() -> None:
    """Render a component that can speak text using browser TTS."""
    tts_html = """
    <script>
    function speakText(text, voice = null, rate = 1, pitch = 1) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Configure voice parameters
            utterance.rate = rate;
            utterance.pitch = pitch;
            utterance.volume = 1;
            
            // Use specific voice if provided
            if (voice) {
                const voices = window.speechSynthesis.getVoices();
                const selectedVoice = voices.find(v => v.name === voice);
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
            }
            
            // Speak
            window.speechSynthesis.speak(utterance);
            
            return true;
        } else {
            console.error('Speech synthesis not supported');
            return false;
        }
    }
    
    function stopSpeaking() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }
    
    // Listen for messages from Streamlit
    window.addEventListener('message', function(event) {
        if (event.data.type === 'speak') {
            speakText(event.data.text, event.data.voice, event.data.rate, event.data.pitch);
        } else if (event.data.type === 'stop-speaking') {
            stopSpeaking();
        }
    });
    
    // Make functions globally available
    window.speakText = speakText;
    window.stopSpeaking = stopSpeaking;
    </script>
    """
    
    components.html(tts_html, height=0)


def speak_text(text: str, voice: Optional[str] = None, rate: float = 1.0, pitch: float = 1.0) -> None:
    """Speak text using browser TTS (requires render_text_to_speech_component to be called first)."""
    # This would send a message to the browser component
    # In a real implementation, you'd use st.experimental_set_query_params or similar
    st.write(f"🔊 Speaking: {text}")


def render_voice_settings() -> Dict[str, Any]:
    """Render voice settings controls."""
    st.subheader("🔊 Voice Settings")
    
    # Voice model selection
    whisper_model = st.selectbox(
        "Whisper Model:",
        options=["whisper-1"],
        index=0,
        help="Speech-to-text model"
    )
    
    # TTS settings
    tts_rate = st.slider(
        "Speech Rate:",
        min_value=0.5,
        max_value=2.0,
        value=1.0,
        step=0.1,
        help="Speed of text-to-speech"
    )
    
    tts_pitch = st.slider(
        "Speech Pitch:",
        min_value=0.5,
        max_value=2.0,
        value=1.0,
        step=0.1,
        help="Pitch of text-to-speech voice"
    )
    
    # Voice activation
    voice_enabled = st.checkbox(
        "Enable Voice Control",
        value=is_voice_enabled(),
        help="Enable/disable voice features"
    )
    
    return {
        "whisper_model": whisper_model,
        "tts_rate": tts_rate,
        "tts_pitch": tts_pitch,
        "voice_enabled": voice_enabled
    }


# Mock voice command for testing
def simulate_voice_command(command: str) -> str:
    """Simulate a voice command for testing purposes."""
    return f"Voice command received: '{command}'"