/**
 * Onboarding Tour Manager
 */

const OnboardingTour = {
    currentStep: 0,
    steps: [
        {
            title: 'Welcome to Aidstack!',
            description: 'Transform voice notes into structured FHIR-compliant clinical documentation in seconds.',
            target: null, // No specific target, just show modal
            position: 'center'
        },
        {
            title: 'Choose Your EHR',
            description: 'Connect to your Electronic Health Record system or use our demo mode to try it out.',
            target: '#connectorList',
            position: 'bottom'
        },
        {
            title: 'Patient Information',
            description: 'Enter patient details or search for existing patients in your EHR.',
            target: '#newPatientForm',
            position: 'top'
        },
        {
            title: 'Voice Recording',
            description: 'Click the microphone or press SPACE to start recording your clinical notes.',
            target: '#micButton',
            position: 'top'
        },
        {
            title: 'AI Processing',
            description: 'Our AI extracts conditions, medications, procedures, and symptoms automatically.',
            target: '#fhirDataSection',
            position: 'left'
        },
        {
            title: 'Review & Edit',
            description: 'Review the extracted data and make any necessary edits before pushing to your EHR.',
            target: '#reviewSection',
            position: 'top'
        },
        {
            title: 'Ready to Go!',
            description: 'Press ? anytime to see keyboard shortcuts. Happy documenting!',
            target: null,
            position: 'center'
        }
    ],

    start() {
        if (localStorage.getItem('aidstack_onboarding_completed')) {
            return;
        }
        this.currentStep = 0;
        this.showStep();
    },

    showStep() {
        const step = this.steps[this.currentStep];
        if (!step) {
            this.complete();
            return;
        }

        // Force remove ALL existing onboarding elements
        document.querySelectorAll('#onboarding-overlay, #onboarding-tooltip').forEach(el => {
            el.remove();
        });

        // Small delay to ensure DOM cleanup before creating new elements
        setTimeout(() => {
            this.renderStep(step);
        }, 50);
    },

    renderStep(step) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'onboarding-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            z-index: 9998;
        `;

        // Create tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'onboarding-tooltip';
        tooltip.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            max-width: 400px;
            z-index: 9999;
            font-family: 'Inter', sans-serif;
        `;

        tooltip.innerHTML = `
            <div style="margin-bottom: 16px;">
                <h3 style="font-family: 'Space Grotesk', sans-serif; color: #1A365D; font-size: 20px; margin-bottom: 8px;">${step.title}</h3>
                <p style="color: #475569; font-size: 14px; line-height: 1.6;">${step.description}</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="color: #94A3B8; font-size: 12px;">
                    Step ${this.currentStep + 1} of ${this.steps.length}
                </div>
                <div style="display: flex; gap: 8px;">
                    ${this.currentStep > 0 ? `
                        <button onclick="OnboardingTour.prev()" style="padding: 8px 16px; border: 1px solid #E2E8F0; background: white; color: #475569; border-radius: 6px; cursor: pointer; font-size: 14px;">
                            Back
                        </button>
                    ` : ''}
                    ${this.currentStep < this.steps.length - 1 ? `
                        <button onclick="OnboardingTour.next()" style="padding: 8px 16px; background: #FF6B35; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                            Next
                        </button>
                    ` : `
                        <button onclick="OnboardingTour.complete()" style="padding: 8px 16px; background: #1A365D; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
                            Get Started
                        </button>
                    `}
                    <button onclick="OnboardingTour.skip()" style="padding: 8px 16px; border: 1px solid #E2E8F0; background: white; color: #94A3B8; border-radius: 6px; cursor: pointer; font-size: 14px;">
                        Skip
                    </button>
                </div>
            </div>
        `;

        // Position tooltip
        if (step.target) {
            const target = document.querySelector(step.target);
            if (target) {
                // Highlight target
                target.style.position = 'relative';
                target.style.zIndex = '10000';

                const rect = target.getBoundingClientRect();
                const tooltipWidth = 400;
                const tooltipHeight = 200;

                let top, left;

                switch (step.position) {
                    case 'top':
                        top = rect.top - tooltipHeight - 20;
                        left = rect.left + (rect.width - tooltipWidth) / 2;
                        break;
                    case 'bottom':
                        top = rect.bottom + 20;
                        left = rect.left + (rect.width - tooltipWidth) / 2;
                        break;
                    case 'left':
                        top = rect.top + (rect.height - tooltipHeight) / 2;
                        left = rect.left - tooltipWidth - 20;
                        break;
                    case 'right':
                        top = rect.top + (rect.height - tooltipHeight) / 2;
                        left = rect.right + 20;
                        break;
                }

                tooltip.style.top = Math.max(20, top) + 'px';
                tooltip.style.left = Math.max(20, Math.min(window.innerWidth - tooltipWidth - 20, left)) + 'px';
            }
        } else {
            // Center tooltip
            tooltip.style.top = '50%';
            tooltip.style.left = '50%';
            tooltip.style.transform = 'translate(-50%, -50%)';
        }

        document.body.appendChild(overlay);
        document.body.appendChild(tooltip);
    },

    next() {
        this.currentStep++;
        this.showStep();
    },

    prev() {
        this.currentStep--;
        this.showStep();
    },

    skip() {
        this.complete();
    },

    complete() {
        localStorage.setItem('aidstack_onboarding_completed', 'true');

        // Force remove ALL onboarding elements
        document.querySelectorAll('#onboarding-overlay, #onboarding-tooltip').forEach(el => {
            el.remove();
        });

        toast.success('Welcome aboard! Press ? to see keyboard shortcuts anytime.');
    },

    reset() {
        localStorage.removeItem('aidstack_onboarding_completed');
        toast.info('Onboarding reset. Reload the page to see it again.');
    }
};

window.OnboardingTour = OnboardingTour;
