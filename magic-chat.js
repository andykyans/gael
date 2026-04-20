/**
 * Magic Chat - Gaele AI Assistant
 * Inspired by 21st.dev premium components
 */

class MagicChat {
    constructor() {
        this.isOpen = false;
        this.messages = [
            { role: 'assistant', content: "Bonjour ! Je suis l'assistant intelligent de Gaele. Comment puis-je vous aider à réduire vos factures aujourd'hui ?" }
        ];
        this.init();
    }

    init() {
        this.createStyles();
        this.render();
        this.bindEvents();
    }

    createStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .magic-chat-container {
                position: fixed;
                bottom: 30px;
                right: 30px;
                z-index: 10000;
                font-family: var(--font-body);
                display: flex;
                flex-direction: column;
                align-items: flex-end;
            }

            .magic-chat-bubble {
                width: 60px;
                height: 60px;
                border-radius: 30px;
                background: var(--neon-green);
                box-shadow: 0 10px 30px rgba(34, 197, 94, 0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 10001;
            }

            .magic-chat-bubble:hover {
                transform: scale(1.1);
                box-shadow: 0 15px 40px rgba(34, 197, 94, 0.6);
            }

            .magic-chat-bubble svg {
                width: 28px;
                height: 28px;
                color: white;
            }

            .magic-chat-window {
                position: absolute;
                bottom: 80px;
                right: 0;
                width: 380px;
                height: 550px;
                background: rgba(15, 23, 42, 0.85);
                backdrop-filter: blur(25px);
                -webkit-backdrop-filter: blur(25px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                transform: scale(0.9) translateY(20px);
                opacity: 0;
                pointer-events: none;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .magic-chat-window.open {
                transform: scale(1) translateY(0);
                opacity: 1;
                pointer-events: all;
            }

            .magic-chat-header {
                padding: 20px;
                background: rgba(255, 255, 255, 0.05);
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                align-items: center;
                gap: 12px;
            }

            .header-avatar {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: var(--neon-green);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
            }

            .header-info h4 {
                margin: 0;
                color: white;
                font-size: 16px;
            }

            .header-info p {
                margin: 0;
                color: var(--neon-green);
                font-size: 11px;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }

            .magic-chat-messages {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .message {
                max-width: 85%;
                padding: 12px 16px;
                border-radius: 16px;
                font-size: 14px;
                line-height: 1.5;
            }

            .message.assistant {
                background: rgba(255, 255, 255, 0.07);
                color: var(--white);
                align-self: flex-start;
                border-bottom-left-radius: 4px;
            }

            .message.user {
                background: var(--neon-green);
                color: white;
                align-self: flex-end;
                border-bottom-right-radius: 4px;
            }

            .magic-chat-input-area {
                padding: 20px;
                background: rgba(255, 255, 255, 0.03);
                border-top: 1px solid rgba(255, 255, 255, 0.05);
                display: flex;
                gap: 10px;
            }

            .magic-chat-input {
                flex: 1;
                background: rgba(0, 0, 0, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 10px 15px;
                color: white;
                font-family: inherit;
                outline: none;
                transition: border-color 0.2s;
            }

            .magic-chat-input:focus {
                border-color: var(--neon-green);
            }

            .magic-chat-send {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: var(--neon-green);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: transform 0.2s;
            }

            .magic-chat-send:active {
                transform: scale(0.9);
            }

            @media (max-width: 480px) {
                .magic-chat-window {
                    width: calc(100vw - 40px);
                    height: 70vh;
                    bottom: 70px;
                }
                .magic-chat-container {
                    bottom: 20px;
                    right: 20px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    render() {
        const container = document.createElement('div');
        container.className = 'magic-chat-container';
        container.innerHTML = `
            <div class="magic-chat-window" id="magicChatWindow">
                <div class="magic-chat-header">
                    <div class="header-avatar">⚡</div>
                    <div class="header-info">
                        <h4>Assistant Gaele</h4>
                        <p>En ligne</p>
                    </div>
                </div>
                <div class="magic-chat-messages" id="magicChatMessages">
                    ${this.messages.map(m => `
                        <div class="message ${m.role}">${m.content}</div>
                    `).join('')}
                </div>
                <div class="magic-chat-input-area">
                    <input type="text" class="magic-chat-input" id="magicChatInput" placeholder="Posez votre question...">
                    <button class="magic-chat-send" id="magicChatSend">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </div>
            </div>
            <div class="magic-chat-bubble" id="magicChatBubble">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
        `;
        document.body.appendChild(container);
    }

    bindEvents() {
        const bubble = document.getElementById('magicChatBubble');
        const window = document.getElementById('magicChatWindow');
        const input = document.getElementById('magicChatInput');
        const sendBtn = document.getElementById('magicChatSend');
        const messagesContainer = document.getElementById('magicChatMessages');

        bubble.addEventListener('click', () => {
            this.isOpen = !this.isOpen;
            window.classList.toggle('open', this.isOpen);
        });

        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) return;

            // Add user message
            this.addMessage('user', text);
            input.value = '';

            // Simple Auto-response logic
            setTimeout(() => {
                let response = "C'est une excellente question. Laissez-moi vérifier votre éligibilité...";
                if (text.toLowerCase().includes('prix') || text.toLowerCase().includes('tarif')) {
                    response = "Le tarif de Gaele XL est fixe à 0,2703€/kWh pendant 25 ans, avec une installation gratuite.";
                } else if (text.toLowerCase().includes('andy')) {
                    response = "Andy est votre conseiller expert. Il peut vous rappeler demain pour une étude personnalisée.";
                }
                this.addMessage('assistant', response);
            }, 1000);
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    addMessage(role, content) {
        const messagesContainer = document.getElementById('magicChatMessages');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role}`;
        msgDiv.textContent = content;
        messagesContainer.appendChild(msgDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Save to state
        this.messages.push({ role, content });
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    window.gaeleMagicChat = new MagicChat();
});
