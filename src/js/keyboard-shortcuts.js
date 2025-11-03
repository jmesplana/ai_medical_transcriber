/**
 * Keyboard Shortcuts Manager
 */

const KeyboardShortcuts = {
    shortcuts: {},
    enabled: true,

    init() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;

            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            const key = this.getKeyString(e);
            if (this.shortcuts[key]) {
                e.preventDefault();
                this.shortcuts[key]();
            }
        });

        // Show shortcuts help on ?
        this.register('Shift+/', () => this.showHelp());
    },

    getKeyString(event) {
        const parts = [];
        if (event.ctrlKey) parts.push('Ctrl');
        if (event.altKey) parts.push('Alt');
        if (event.shiftKey) parts.push('Shift');
        if (event.metaKey) parts.push('Cmd');

        let key = event.key;
        if (key === ' ') key = 'Space';

        if (key.length === 1) {
            key = key.toUpperCase();
        }

        parts.push(key);
        return parts.join('+');
    },

    register(keyString, callback) {
        this.shortcuts[keyString] = callback;
    },

    unregister(keyString) {
        delete this.shortcuts[keyString];
    },

    enable() {
        this.enabled = true;
    },

    disable() {
        this.enabled = false;
    },

    showHelp() {
        const shortcuts = [
            { key: 'Space', desc: 'Start/Stop recording' },
            { key: 'Enter', desc: 'Proceed to next step' },
            { key: 'Ctrl+S', desc: 'Save session' },
            { key: 'Ctrl+E', desc: 'Export current session' },
            { key: 'Ctrl+H', desc: 'View session history' },
            { key: 'Escape', desc: 'Cancel/Go back' },
            { key: '?', desc: 'Show this help' }
        ];

        const html = `
            <div id="shortcuts-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
                <div style="background: white; border-radius: 12px; padding: 32px; max-width: 500px; width: 90%;">
                    <h2 style="font-family: 'Space Grotesk', sans-serif; color: #1A365D; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
                        <span><i class="fas fa-keyboard mr-2"></i>Keyboard Shortcuts</span>
                        <button onclick="document.getElementById('shortcuts-modal').remove()" style="background: none; border: none; font-size: 24px; color: #94A3B8; cursor: pointer;">×</button>
                    </h2>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        ${shortcuts.map(s => `
                            <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: #F8FAFC; border-radius: 8px;">
                                <span style="color: #475569;">${s.desc}</span>
                                <kbd style="background: white; border: 1px solid #E2E8F0; padding: 4px 12px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #1A365D;">${s.key}</kbd>
                            </div>
                        `).join('')}
                    </div>
                    <p style="margin-top: 20px; color: #94A3B8; font-size: 12px; text-align: center;">
                        Press <kbd style="background: #F8FAFC; padding: 2px 8px; border-radius: 4px;">?</kbd> anytime to see shortcuts
                    </p>
                </div>
            </div>
        `;

        const existing = document.getElementById('shortcuts-modal');
        if (existing) existing.remove();

        document.body.insertAdjacentHTML('beforeend', html);

        // Close on escape or click outside
        const modal = document.getElementById('shortcuts-modal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        });
    }
};

window.KeyboardShortcuts = KeyboardShortcuts;
