requirementsimport streamlit as st
import google.generativeai as genai

# 1. Configuration
st.set_page_config(page_title="My Gemini App", page_icon="🤖")
st.title("My AI Studio App")

# 2. Setup API Key (Securely)
# In local development, you can hardcode it for a test, but use Secrets for deployment
# api_key = "YOUR_PASTED_API_KEY_HERE" 
api_key = st.secrets["GAIzaSyAGlrKEf84lcQ-qAQrz1q9ntpq1hecRCLo"] 

genai.configure(api_key=api_key)

# 3. Initialize Model (Copy this part from your AI Studio export)
generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 64,
  "max_output_tokens": 8192,
}
model = genai.GenerativeModel(
  model_name="gemini-1.5-flash", # Or whatever model you used
  generation_config=generation_config,
)

# 4. User Interface
user_input = st.chat_input("Ask me something...")

if "history" not in st.session_state:
    st.session_state.history = []

# Display history
for message in st.session_state.history:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

if user_input:
    # Display user message
    with st.chat_message("user"):
        st.markdown(user_input)
    
    # Send to Gemini
    try:
        response = model.generate_content(user_input)
        
        # Display AI response
        with st.chat_message("assistant"):
            st.markdown(response.text)
            
        # Update history
        st.session_state.history.append({"role": "user", "content": user_input})
        st.session_state.history.append({"role": "assistant", "content": response.text})
        
    except Exception as e:
        st.error(f"Error: {e}")