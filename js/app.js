// Handles clicking between the four expert tabs
function showTab(tabId) {
    // Hide all reports
    document.querySelectorAll('.expert-report').forEach(el => el.classList.remove('active-tab'));
    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    // Show the target tab
    document.getElementById(tabId).classList.add('active-tab');
    event.currentTarget.classList.add('active');
}

// Executes the API call to your local Python server
document.getElementById('convene-btn').addEventListener('click', async () => {
    const textInput = document.getElementById('manuscript-input').value.trim();
    const btn = document.getElementById('convene-btn');
    const statusBox = document.getElementById('status-monitor');
    const statusText = document.getElementById('status-text');
    
    if (!textInput) {
        alert("Please paste a manuscript scene first.");
        return;
    }

    // Lock the UI and show execution status
    btn.disabled = true;
    btn.textContent = "Board is Convening...";
    statusBox.classList.remove('hidden');
    statusText.innerHTML = "⏳ Sending text to Chief Editor...<br><br><em>Note: Llama-3.3-70B is reading. This will take 1-2 minutes depending on OpenRouter traffic.</em>";
    
    // Clear out old reports
    document.getElementById('pacing').textContent = "Analyzing...";
    document.getElementById('psychology').textContent = "Analyzing...";
    document.getElementById('world').textContent = "Analyzing...";
    document.getElementById('dialogue').textContent = "Analyzing...";
    document.getElementById('debate-output').textContent = "Awaiting debate...";
    document.getElementById('master-output').textContent = "Synthesizing...";

    try {
        // Send the POST request to FastAPI
        const response = await fetch('http://127.0.0.1:8000/critique', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manuscript_text: textInput })
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Inject the returned JSON payloads directly into the UI containers
        document.getElementById('pacing').textContent = data.pacing_report;
        document.getElementById('psychology').textContent = data.psychology_report;
        document.getElementById('world').textContent = data.world_report;
        document.getElementById('dialogue').textContent = data.dialogue_report;
        document.getElementById('debate-output').textContent = data.debate_compromise;
        document.getElementById('master-output').textContent = data.final_master_report;
        
        statusText.innerHTML = "✅ <strong>Master Report Complete!</strong>";
        
    } catch (error) {
        console.error("Critique Error:", error);
        statusText.innerHTML = "❌ <strong>Connection Error:</strong> Could not connect to the API. Ensure your FastAPI server is actively running in the background.";
    } finally {
        // Unlock the UI
        btn.disabled = false;
        btn.textContent = "Convene Editorial Board";
    }
});