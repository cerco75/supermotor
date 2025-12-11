import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { aiAdvisorService } from './services/aiAdvisorService'

// 🤖 Expose AI configuration to window for easy setup
declare global {
    interface Window {
        setGeminiApiKey: (key: string) => void;
        setOpenAIApiKey: (key: string) => void;
        getGeminiUsage: () => any;
        getOpenAIUsage: () => any;
    }
}

window.setGeminiApiKey = (key: string) => {
    aiAdvisorService.setGeminiApiKey(key);
    console.log('✅ Gemini API key configured! AI analysis is now enabled.');
    console.log('📊 Usage stats:', aiAdvisorService.getGeminiUsageStats());
};

window.setOpenAIApiKey = (key: string) => {
    aiAdvisorService.setOpenAIApiKey(key);
    console.log('✅ OpenAI API key configured! GPT-4 analysis is now enabled.');
    console.log('📊 Usage stats:', aiAdvisorService.getOpenAIUsageStats());
};

window.getGeminiUsage = () => {
    const stats = aiAdvisorService.getGeminiUsageStats();
    console.log('📊 Gemini API Usage:');
    console.log(`   Requests today: ${stats.requestsToday}/${1500}`);
    console.log(`   Remaining: ${stats.remainingRequests}`);
    console.log(`   Resets at: ${stats.resetTime.toLocaleString()}`);
    return stats;
};

window.getOpenAIUsage = () => {
    const stats = aiAdvisorService.getOpenAIUsageStats();
    console.log('📊 OpenAI API Usage:');
    console.log(`   Requests today: ${stats.requestsToday}`);
    console.log(`   Model: ${stats.model}`);
    console.log(`   Session started: ${stats.lastResetTime.toLocaleString()}`);
    return stats;
};

console.log('🤖 AI Services Ready!');
console.log('   Gemini: ✅ Configured and ready');
console.log('   OpenAI: Configure with setOpenAIApiKey("your-key")');

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
