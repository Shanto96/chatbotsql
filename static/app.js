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

    let isProcessing = false;

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
                tableList.appendChild(el);
            });
        } catch {
            tableList.innerHTML = '<div class="table-item" style="color:var(--accent-pink)">Unable to load</div>';
        }
    }
    loadTables();

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
