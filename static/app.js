/* ═══════════════════════════════════════════════════════════════════════
   SQL Chatbot — Frontend Logic
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
    "use strict";

    // ── DOM References ──────────────────────────────────────────────────
    const messagesContainer = document.getElementById("messages-container");
    const inputForm         = document.getElementById("input-form");
    const userInput         = document.getElementById("user-input");
    const sendBtn           = document.getElementById("send-btn");
    const clearBtn          = document.getElementById("clear-btn");
    const welcomeCard       = document.getElementById("welcome-card");
    const tableList         = document.getElementById("table-list");
    const sidebar           = document.getElementById("sidebar");
    const menuToggle        = document.getElementById("menu-toggle");

    // Table viewer DOM
    const tableViewer   = document.getElementById("table-viewer");
    const tvBackBtn     = document.getElementById("tv-back-btn");
    const tvTableName   = document.getElementById("tv-table-name");
    const tvRowCount    = document.getElementById("tv-row-count");
    const tvBody        = document.getElementById("tv-body");
    const tvAskBtn      = document.getElementById("tv-ask-btn");

    let isProcessing = false;
    let currentTableName = "";

    // ── Fetch available tables on load ───────────────────────────────────
    async function loadTables() {
        try {
            const res = await fetch("/api/tables");
            const data = await res.json();
            tableList.innerHTML = "";
            (data.tables || []).forEach((t) => {
                const el = document.createElement("div");
                el.className = "table-item";
                el.textContent = t;
                el.addEventListener("click", () => openTableViewer(t));
                tableList.appendChild(el);
            });
        } catch {
            tableList.innerHTML = '<div class="table-item" style="color:var(--accent-pink)">Unable to load</div>';
        }
    }
    loadTables();

    // ═════════════════════════════════════════════════════════════════════
    //  Table Data Viewer
    // ═════════════════════════════════════════════════════════════════════

    async function openTableViewer(tableName) {
        currentTableName = tableName;

        // Highlight active table in sidebar
        document.querySelectorAll(".table-item").forEach((el) => {
            el.classList.toggle("active", el.textContent === tableName);
        });

        // Show viewer with loading state
        tvTableName.textContent = tableName;
        tvRowCount.textContent = "";
        tvBody.innerHTML = `
            <div class="tv-loading">
                <div class="tv-spinner"></div>
                <p>Loading table data…</p>
            </div>
        `;
        tableViewer.classList.add("open");

        // Close sidebar on mobile
        sidebar.classList.remove("open");
        removeOverlay();

        // Fetch data
        try {
            const res = await fetch(`/api/table/${encodeURIComponent(tableName)}`);
            const data = await res.json();

            if (data.error) {
                tvBody.innerHTML = `<div class="tv-error">⚠️ ${escapeHtml(data.error)}</div>`;
                return;
            }

            renderTable(data);
        } catch (err) {
            tvBody.innerHTML = `<div class="tv-error">❌ Failed to load table: ${escapeHtml(err.message)}</div>`;
        }
    }

    function renderTable(data) {
        const { columns, rows, total_rows, showing } = data;

        // Update row count badge
        tvRowCount.textContent = total_rows === showing
            ? `${total_rows} rows`
            : `Showing ${showing} of ${total_rows} rows`;

        // Build info bar
        let html = `
            <div class="tv-info-bar">
                <div>
                    <span class="tv-info-badge">${columns.length} columns</span>
                    <span class="tv-info-badge" style="margin-left:8px">${total_rows} rows</span>
                </div>
                ${total_rows > showing ? `<span>Showing first ${showing} rows</span>` : ""}
            </div>
        `;

        // Build table
        html += '<div class="tv-table-wrapper"><table class="data-table">';

        // Header
        html += "<thead><tr>";
        html += '<th class="row-num">#</th>';
        columns.forEach((col) => {
            html += `<th>${escapeHtml(col)}</th>`;
        });
        html += "</tr></thead>";

        // Body
        html += "<tbody>";
        if (rows.length === 0) {
            html += `<tr><td colspan="${columns.length + 1}" style="text-align:center;color:var(--text-muted);padding:40px;">No data in this table</td></tr>`;
        } else {
            rows.forEach((row, i) => {
                html += "<tr>";
                html += `<td class="row-num">${i + 1}</td>`;
                row.forEach((cell) => {
                    if (cell === null || cell === undefined) {
                        html += '<td><span class="null-value">NULL</span></td>';
                    } else {
                        html += `<td>${escapeHtml(String(cell))}</td>`;
                    }
                });
                html += "</tr>";
            });
        }
        html += "</tbody></table></div>";

        tvBody.innerHTML = html;
    }

    // Close table viewer
    tvBackBtn.addEventListener("click", closeTableViewer);

    function closeTableViewer() {
        tableViewer.classList.remove("open");
        document.querySelectorAll(".table-item").forEach((el) => {
            el.classList.remove("active");
        });
        currentTableName = "";
    }

    // "Ask AI" button — go back to chat with a pre-filled question
    tvAskBtn.addEventListener("click", () => {
        const name = currentTableName;
        closeTableViewer();
        userInput.value = `Describe the ${name} table and show me some interesting insights`;
        userInput.focus();
    });

    // Close viewer with Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && tableViewer.classList.contains("open")) {
            closeTableViewer();
        }
    });

    // ═════════════════════════════════════════════════════════════════════
    //  Chat Functionality
    // ═════════════════════════════════════════════════════════════════════

    // ── Auto-resize textarea ─────────────────────────────────────────────
    userInput.addEventListener("input", () => {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
    });

    // ── Keyboard shortcut: Enter to send, Shift+Enter for newline ───────
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            inputForm.dispatchEvent(new Event("submit"));
        }
    });

    // ── Submit handler ───────────────────────────────────────────────────
    inputForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const question = userInput.value.trim();
        if (!question || isProcessing) return;

        // Close table viewer if open
        if (tableViewer.classList.contains("open")) {
            closeTableViewer();
        }

        // Hide welcome card
        if (welcomeCard) welcomeCard.style.display = "none";

        // Add user message
        appendMessage("user", question);
        userInput.value = "";
        userInput.style.height = "auto";

        // Show typing indicator
        const typing = showTyping();
        setProcessing(true);

        try {
            const res = await fetch("/api/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question }),
            });

            const data = await res.json();
            typing.remove();

            if (data.error) {
                appendMessage("bot", `⚠️ ${data.error}`, []);
            } else {
                appendMessage("bot", data.answer || "No answer returned.", data.steps || []);
            }
        } catch (err) {
            typing.remove();
            appendMessage("bot", `❌ Network error: ${err.message}`, []);
        } finally {
            setProcessing(false);
        }
    });

    // ── Append a chat message ────────────────────────────────────────────
    function appendMessage(role, text, steps) {
        const msg = document.createElement("div");
        msg.className = `message ${role}`;

        const avatar = document.createElement("div");
        avatar.className = "message-avatar";
        avatar.textContent = role === "user" ? "Y" : "AI";

        const content = document.createElement("div");
        content.className = "message-content";
        content.textContent = text;

        // If bot message with steps, add expandable section
        if (role === "bot" && steps && steps.length > 0) {
            const toggle = document.createElement("button");
            toggle.className = "steps-toggle";
            toggle.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5l3 3 3-3" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Show ${steps.length} agent step${steps.length > 1 ? "s" : ""}
            `;

            const panel = document.createElement("div");
            panel.className = "steps-panel";

            const list = document.createElement("div");
            list.className = "steps-list";

            steps.forEach((s) => {
                const item = document.createElement("div");
                item.className = "step-item";

                if (s.type === "tool_call") {
                    item.innerHTML = `
                        <div class="step-label call">⚡ Tool Call: ${escapeHtml(s.tool)}</div>
                        <div>${escapeHtml(JSON.stringify(s.input))}</div>
                    `;
                } else {
                    item.innerHTML = `
                        <div class="step-label result">✓ Result: ${escapeHtml(s.tool)}</div>
                        <div>${escapeHtml(s.output)}</div>
                    `;
                }
                list.appendChild(item);
            });

            panel.appendChild(list);

            toggle.addEventListener("click", () => {
                toggle.classList.toggle("open");
                panel.classList.toggle("open");
            });

            content.appendChild(toggle);
            content.appendChild(panel);
        }

        msg.appendChild(avatar);
        msg.appendChild(content);
        messagesContainer.appendChild(msg);
        scrollToBottom();
    }

    // ── Typing indicator ─────────────────────────────────────────────────
    function showTyping() {
        const el = document.createElement("div");
        el.className = "typing-indicator";
        el.innerHTML = `
            <div class="message-avatar" style="background:var(--gradient-subtle);border:1px solid var(--border-subtle);color:var(--accent-purple);font-size:.85rem;font-weight:600;">AI</div>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        `;
        messagesContainer.appendChild(el);
        scrollToBottom();
        return el;
    }

    // ── Helpers ──────────────────────────────────────────────────────────
    function setProcessing(v) {
        isProcessing = v;
        sendBtn.disabled = v;
    }

    function scrollToBottom() {
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: "smooth",
        });
    }

    function escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = String(str);
        return div.innerHTML;
    }

    // ── Clear chat ───────────────────────────────────────────────────────
    clearBtn.addEventListener("click", () => {
        messagesContainer.innerHTML = "";
        if (welcomeCard) {
            messagesContainer.appendChild(welcomeCard);
            welcomeCard.style.display = "";
        }
    });

    // ── Suggestion / welcome chips ───────────────────────────────────────
    document.querySelectorAll("[data-q]").forEach((btn) => {
        btn.addEventListener("click", () => {
            userInput.value = btn.getAttribute("data-q");
            inputForm.dispatchEvent(new Event("submit"));
            // Close sidebar on mobile
            sidebar.classList.remove("open");
            removeOverlay();
        });
    });

    // ── Mobile sidebar toggle ────────────────────────────────────────────
    let overlay = null;

    menuToggle.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        if (sidebar.classList.contains("open")) {
            showOverlay();
        } else {
            removeOverlay();
        }
    });

    function showOverlay() {
        overlay = document.createElement("div");
        overlay.className = "sidebar-overlay active";
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            removeOverlay();
        });
        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }
})();

