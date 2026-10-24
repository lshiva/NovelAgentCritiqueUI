// ==========================================
// 1. UI NAVIGATION & TAB LOGIC
// ==========================================

// Switch between Critique and Studio Dashboards
function switchDashboard(targetId) {
    // Update header buttons
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('btn-mode-' + targetId).classList.add('active');

    // Update main containers
    document.querySelectorAll('.dashboard-container').forEach(container => {
        container.classList.remove('active');
        container.classList.add('hidden');
    });
    
    const targetContainer = document.getElementById('dashboard-' + targetId);
    targetContainer.classList.remove('hidden');
    targetContainer.classList.add('active');
}

// Switch between internal panel tabs
function openTab(evt, tabId, context) {
    const dashboard = document.getElementById('dashboard-' + context);
    
    // Hide all tab contents in the current dashboard
    const tabContents = dashboard.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }

    // Remove active class from all tab buttons in the current dashboard
    const tablinks = dashboard.getElementsByClassName("tab-btn");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].classList.remove("active");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// ==========================================
// 2. API CONNECTION LOGIC
// ==========================================
const API_URL = "http://127.0.0.1:8000";

document.getElementById('btn-generate-draft').addEventListener('click', async () => {
    const rawPlot = document.getElementById('studio-plot-input').value;
    const isAuto = document.querySelector('input[name="exec_mode"][value="auto"]').checked;
    const statusList = document.getElementById('studio-status').getElementsByTagName('span');
    
    if (!rawPlot) {
        alert("Please enter a plot premise first!");
        return;
    }

    // Set first status dot to active (yellow)
    statusList[0].className = "status-icon active";
    document.getElementById('btn-generate-draft').innerText = "GENERATING...";

    try {
        if (isAuto) {
            // COMPLETE AUTOMATION MODE
            document.getElementById('btn-generate-draft').innerText = "RUNNING AUTOMATION... (Takes ~45s)";
            
            // Turn all dots yellow to show it's working in the background
            for(let i=0; i<6; i++) {
                statusList[i].className = "status-icon active";
            }

            const response = await fetch(`${API_URL}/pipeline/autonomous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_plot: rawPlot })
            });

            const data = await response.json();

            // Populate the UI with the final V2 output and the Master Report
            document.getElementById('active-manuscript-box').value = data.draft_v2;
            
            // Handle however your backend formats the final report key
            const reportText = data.master_report.synthesis || data.master_report.final_report || JSON.stringify(data.master_report, null, 2);
            document.getElementById('studio-master-report').value = reportText;

            // Turn all status dots green
            for(let i=0; i<6; i++) {
                statusList[i].className = "status-icon complete";
            }
         } else {
            // MANUAL MODE: Call the /generate endpoint
            const response = await fetch(`${API_URL}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ raw_plot: rawPlot })
            });

            const data = await response.json();

            // Populate the UI with the AI's output
            document.getElementById('active-manuscript-box').value = data.draft_v1;
            document.getElementById('outline-box').value = data.outline;
            document.getElementById('research-box').value = data.research_notes;
            document.getElementById('profiles-box').value = data.character_profiles;

            // Turn the first four status dots green
            for(let i=0; i<4; i++) {
                statusList[i].className = "status-icon complete";
            }
        }
    } catch (error) {
        console.error("Error connecting to backend:", error);
        alert("Failed to connect to the backend. Is your FastAPI server running?");
    } finally {
        document.getElementById('btn-generate-draft').innerText = "GENERATE DRAFT V1";
    }
});

document.getElementById('btn-submit-critique').addEventListener('click', async () => {
    const draftText = document.getElementById('active-manuscript-box').value;
    const statusList = document.getElementById('studio-status').getElementsByTagName('span');
    const submitBtn = document.getElementById('btn-submit-critique');
    
    if (!draftText) {
        alert("There is no draft to critique!");
        return;
    }

    // Set the 5th status dot (Editorial Board) to active (yellow)
    statusList[4].className = "status-icon active";
    submitBtn.innerText = "ANALYZING DRAFT...";

    try {
        // Send the edited draft to your existing critique endpoint
        const response = await fetch(`${API_URL}/critique`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manuscript_text: draftText }) 
        });

        const data = await response.json();

        // Populate the Master Report box in the UI
        // We check for common key names just in case your backend uses a different one
        const reportText = data.master_report || data.final_report || data.synthesis || JSON.stringify(data, null, 2);
        document.getElementById('studio-master-report').value = reportText;

        // Turn the 5th status dot green
        statusList[4].className = "status-icon complete";
        
    } catch (error) {
        console.error("Error connecting to backend:", error);
        alert("Failed to connect. Make sure your /critique endpoint is running in app.py.");
    } finally {
        submitBtn.innerText = "SUBMIT TO CRITIQUE BOARD";
    }
});

document.getElementById('btn-authorize-rewrite').addEventListener('click', async () => {
    const rewriteBtn = document.getElementById('btn-authorize-rewrite');
    const statusList = document.getElementById('studio-status').getElementsByTagName('span');
    
    // Gather all context needed for the rewrite from the UI
    const rawPlot = document.getElementById('studio-plot-input').value;
    const outline = document.getElementById('outline-box').value;
    const research = document.getElementById('research-box').value;
    const profiles = document.getElementById('profiles-box').value;
    const masterReport = document.getElementById('studio-master-report').value;
    const directorOverride = document.getElementById('director-override').value;

    if (!masterReport) {
        alert("You need a critique report before rewriting!");
        return;
    }

    // Set the 6th status dot to active (yellow)
    statusList[5].className = "status-icon active";
    rewriteBtn.innerText = "WRITING DRAFT V2...";

    try {
        const response = await fetch(`${API_URL}/revise`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                raw_plot: rawPlot,
                outline: outline,
                research: research,
                profiles: profiles,
                master_report: masterReport,
                director_override: directorOverride || "No manual override provided. Follow critique strictly."
            })
        });

        const data = await response.json();

        // Replace Draft V1 with Draft V2 in the UI
        document.getElementById('active-manuscript-box').value = data.draft_v2;
        
        // Turn the 6th status dot green
        statusList[5].className = "status-icon complete";
        
        alert("Draft V2 is ready!");
        
    } catch (error) {
        console.error("Error during rewrite:", error);
        alert("Failed to connect to the /revise endpoint.");
    } finally {
        rewriteBtn.innerText = "AUTHORIZE REWRITE (DRAFT V2)";
    }
});

// ==========================================
// 3. CRITIQUE DASHBOARD LOGIC
// ==========================================

document.getElementById('btn-convene-board').addEventListener('click', async () => {
    const manuscript = document.getElementById('critique-input').value;
    const statusList = document.getElementById('critique-status').getElementsByTagName('span');
    const conveneBtn = document.getElementById('btn-convene-board');

    if (!manuscript) {
        alert("Please paste your manuscript first!");
        return;
    }

    // Set all status dots to active (yellow)
    for(let i = 0; i < 5; i++) {
        statusList[i].className = "status-icon active";
    }
    conveneBtn.innerText = "BOARD IS DELIBERATING...";

    try {
        const response = await fetch(`${API_URL}/critique`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manuscript_text: manuscript })
        });

        const data = await response.json();

        // 1. Populate the Individual Expert Tabs
        // Using innerText for divs instead of value (since they are standard divs, not textareas)
        document.getElementById('tab-pacing').innerText = data.pacing_report || "No data.";
        document.getElementById('tab-psychology').innerText = data.psychology_report || "No data.";
        document.getElementById('tab-world').innerText = data.world_report || "No data.";
        document.getElementById('tab-dialogue').innerText = data.dialogue_report || "No data.";

        // 2. Populate the Summary Panels (these are textareas)
        document.getElementById('debate-output').value = data.debate_compromise || "No data.";
        
        // Clean up the Master Report (checking if it returned as a JSON string based on your logs)
        let masterText = data.final_master_report || data.master_report;
        try {
            const parsedMaster = JSON.parse(masterText);
            if (parsedMaster.answer) masterText = parsedMaster.answer;
        } catch(e) {
            // If it's already a clean string, do nothing
        }
        document.getElementById('master-output').value = masterText || "No data.";

        // 3. Turn all status dots green
        for(let i = 0; i < 5; i++) {
            statusList[i].className = "status-icon complete";
        }
        
    } catch (error) {
        console.error("Error connecting to backend:", error);
        alert("Failed to connect. Make sure your FastAPI server is running.");
        // Reset status dots on failure
        for(let i = 0; i < 5; i++) {
            statusList[i].className = "status-icon pending";
        }
    } finally {
        conveneBtn.innerText = "CONVENE EDITORIAL BOARD";
    }
});