# Motor Radar - AI Configuration

## 🤖 Dual AI Integration: Gemini + OpenAI

Motor Radar now supports **TWO AI services** for intelligent token analysis:

### ✅ Google Gemini AI (Already Configured!)
- **Status**: ✅ **READY TO USE** - API key already configured
- **Free Tier**: 1,500 requests/day
- **Model**: Gemini Pro
- **No setup needed** - Just start using it!

### 🔧 OpenAI GPT-4 (Optional)

To enable OpenAI GPT-4 analysis as an alternative/complement:

1. **Get your API key**:
   - Go to: https://platform.openai.com/api-keys
   - Create a new API key
   - Copy your key

2. **Add the key to your app**:
   - Open the browser console (F12)
   - Run this command:
   ```javascript
   setOpenAIApiKey('sk-your-api-key-here')
   ```

3. **Verify it's working**:
   - Check the console for messages like:
   ```
   🤖 OpenAI GPT-4: BTC - BUY (90% confidence)
      Timing: EARLY, Risk: LOW
   ```

## 📊 Usage Limits

### Gemini (FREE)
- **1,500 requests per day** - Very generous!
- Resets every 24 hours
- Check usage: `getGeminiUsage()`

### OpenAI (Paid)
- **Pay per request** (~$0.0001 per token)
- Model: gpt-4o-mini (cheaper and faster)
- Check usage: `getOpenAIUsage()`

## 🎯 What Both AIs Analyze
- ✅ Is this a REAL breakout or are we too late?
- ✅ How long has the uptrend been going?
- ✅ What's the risk level at current price?
- ✅ Should we BUY, HOLD, or AVOID?
- ✅ Entry timing: EARLY, MID, LATE, or TOO_LATE

## 🔐 Security Note
Your API keys are stored only in your browser's memory and are never sent to any server except the respective AI service (Google or OpenAI).

## 💡 Which AI to Use?

**Gemini (Recommended for most users)**:
- ✅ Already configured
- ✅ FREE (1500/day)
- ✅ Fast responses
- ✅ Good accuracy

**OpenAI GPT-4**:
- ⚡ Potentially more accurate
- 💰 Costs money (but very cheap with gpt-4o-mini)
- 🎯 Better for complex analysis
- 🔧 Requires API key setup

**Best approach**: Use Gemini by default, add OpenAI for critical decisions!
