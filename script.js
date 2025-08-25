// Configuration
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api/send-email'
    : 'https://dare-consulting-api.onrender.com/api/send-email'; // Update this with your actual API URL

// PostHog Event Tracking Helper
function trackEvent(eventName, properties = {}) {
    if (typeof posthog !== 'undefined') {
        posthog.capture(eventName, properties);
    }
}

// Track page views with custom properties
document.addEventListener('DOMContentLoaded', () => {
    if (typeof posthog !== 'undefined') {
        // Get page name from title or URL
        const pageName = document.title.split(' - ')[0] || 'Unknown Page';
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // Track pageview with properties
        trackEvent('$pageview', {
            page_name: pageName,
            page_path: currentPage,
            referrer: document.referrer
        });
    }
});

// Mobile Menu Toggle
const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
const navMenu = document.querySelector('.nav-menu');

mobileMenuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    
    // Track mobile menu interaction
    trackEvent('mobile_menu_toggle', {
        action: navMenu.classList.contains('active') ? 'open' : 'close'
    });
    
    // Animate hamburger menu
    const spans = mobileMenuToggle.querySelectorAll('span');
    if (navMenu.classList.contains('active')) {
        spans[0].style.transform = 'rotate(45deg) translateY(8px)';
        spans[1].style.opacity = '0';
        spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
    } else {
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }
});

// Close mobile menu when clicking on a link
document.querySelectorAll('.nav-menu a').forEach(link => {
    link.addEventListener('click', () => {
        // Track navigation click
        trackEvent('navigation_click', {
            link_text: link.textContent,
            link_href: link.getAttribute('href')
        });
        
        navMenu.classList.remove('active');
        const spans = mobileMenuToggle.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    });
});

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Navbar Scroll Effect
let lastScroll = 0;
const navbar = document.querySelector('.navbar');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    
    lastScroll = currentScroll;
});

// Retry configuration
const RETRY_CONFIG = {
    maxRetries: 3,
    baseDelay: 1000, // Start with 1 second
    maxDelay: 8000,  // Max 8 seconds between retries
    backoffMultiplier: 2
};

// Exponential backoff with retry logic
async function sendEmailWithRetry(data, retryCount = 0) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });
        
        // Check if response is ok (status 200-299)
        if (!response.ok) {
            // For server errors (500+), we should retry
            if (response.status >= 500 && retryCount < RETRY_CONFIG.maxRetries) {
                throw new Error(`Server error: ${response.status}`);
            }
            // For client errors (400-499), don't retry
            const errorData = await response.json().catch(() => ({}));
            return { 
                success: false, 
                error: errorData.error || `Request failed with status ${response.status}`,
                shouldRetry: false 
            };
        }
        
        const result = await response.json();
        return result;
        
    } catch (error) {
        // Network errors, timeouts, and server errors (500+) should be retried
        if (retryCount < RETRY_CONFIG.maxRetries) {
            const delay = Math.min(
                RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
                RETRY_CONFIG.maxDelay
            );
            
            console.log(`Retry attempt ${retryCount + 1}/${RETRY_CONFIG.maxRetries} after ${delay}ms`);
            
            // Show retry notification to user
            showNotification(
                `Connection issue. Retrying... (Attempt ${retryCount + 2}/${RETRY_CONFIG.maxRetries + 1})`, 
                'warning'
            );
            
            // Track retry attempt
            trackEvent('form_submit_retry', {
                form_name: 'contact_form',
                retry_attempt: retryCount + 1,
                delay_ms: delay,
                error_type: error.name || 'NetworkError'
            });
            
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Recursive retry
            return sendEmailWithRetry(data, retryCount + 1);
        }
        
        // Max retries exceeded
        console.error('Max retries exceeded:', error);
        trackEvent('form_submit_max_retries_exceeded', {
            form_name: 'contact_form',
            total_attempts: RETRY_CONFIG.maxRetries + 1,
            final_error: error.message
        });
        
        throw error;
    }
}

// Form Submission
const contactForm = document.getElementById('contactForm');

contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validate form first
    if (!validateForm(contactForm)) {
        showNotification('Please fill in all required fields correctly.', 'error');
        // Track form validation error
        trackEvent('form_validation_error', {
            form_name: 'contact_form'
        });
        return;
    }
    
    // Get form data
    const formData = new FormData(contactForm);
    const data = {};
    formData.forEach((value, key) => {
        data[key] = value;
    });
    
    // Track form submission attempt
    trackEvent('form_submit_attempt', {
        form_name: 'contact_form',
        service_interest: data.service || 'not_specified',
        has_phone: !!data.phone
    });
    
    // Show loading state
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const originalText = submitButton.innerHTML;
    
    // Update button with loading state
    const updateButtonState = (text, showSpinner = true) => {
        if (showSpinner) {
            submitButton.innerHTML = `
                <span style="display: inline-flex; align-items: center; gap: 8px;">
                    <svg class="spinner" style="animation: spin 1s linear infinite;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 11-6.219-8.56"/>
                    </svg>
                    ${text}
                </span>
            `;
        } else {
            submitButton.innerHTML = text;
        }
    };
    
    updateButtonState('Sending...');
    submitButton.disabled = true;
    
    // Show info notification
    showNotification('Sending your message...', 'info');
    
    try {
        // Send data to backend API with retry logic
        const result = await sendEmailWithRetry(data);
        
        if (result.success) {
            showNotification('Thank you for your message! We will contact you soon.', 'success');
            contactForm.reset();
            
            // Track successful form submission
            trackEvent('form_submit_success', {
                form_name: 'contact_form',
                service_interest: data.service || 'not_specified'
            });
            
            // Track conversion
            trackEvent('lead_generated', {
                source: 'contact_form',
                service_interest: data.service || 'not_specified'
            });
        } else {
            // Check if it was a client error (no retry) or server error (retried but failed)
            const errorMessage = result.shouldRetry === false 
                ? 'Failed to send message. Please check your information and try again.'
                : 'Failed to send message after multiple attempts. Please try again later or contact us directly.';
            
            showNotification(errorMessage, 'error');
            
            // Track form submission failure
            trackEvent('form_submit_error', {
                form_name: 'contact_form',
                error_type: result.shouldRetry === false ? 'client_error' : 'server_error',
                error_message: result.error
            });
        }
    } catch (error) {
        console.error('Error sending form after retries:', error);
        
        // Provide helpful error message based on error type
        let errorMessage = 'An error occurred. Please try again later.';
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (!navigator.onLine) {
            errorMessage = 'No internet connection. Please check your connection and try again.';
        } else {
            errorMessage = 'Unable to send message after multiple attempts. Please contact us directly at coach@dareconsulting.group';
        }
        
        showNotification(errorMessage, 'error');
        
        // Track form submission exception
        trackEvent('form_submit_exception', {
            form_name: 'contact_form',
            error_message: error.message,
            error_type: error.name || 'UnknownError',
            is_online: navigator.onLine
        });
    } finally {
        // Restore button state
        submitButton.innerHTML = originalText;
        submitButton.disabled = false;
    }
});

// Notification System
function showNotification(message, type = 'info') {
    // Remove any existing notifications
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Add icon based on type
    const icon = type === 'success' 
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>'
        : type === 'error'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
        : type === 'warning'
        ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>'
        : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px;">
            <div style="flex-shrink: 0;">${icon}</div>
            <div style="flex: 1;">${message}</div>
            <button onclick="this.parentElement.parentElement.remove()" style="
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 0;
                margin-left: 8px;
                opacity: 0.8;
                transition: opacity 0.2s;
            " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `;
    
    // Add styles for notification
    const bgColor = type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : '#3498DB';
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        padding: 16px 20px;
        background: ${bgColor};
        color: white;
        border-radius: 8px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
        max-width: 400px;
        font-size: 14px;
        line-height: 1.5;
        font-family: 'Open Sans', sans-serif;
    `;
    
    document.body.appendChild(notification);
    
    // Remove notification after 7 seconds (increased for better readability)
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 7000);
}

// Add CSS animations for notifications and spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
    
    @keyframes shake {
        0%, 100% {
            transform: translateX(0);
        }
        10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
        }
        20%, 40%, 60%, 80% {
            transform: translateX(5px);
        }
    }
    
    .notification {
        transition: all 0.3s ease;
    }
    
    .notification:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 48px rgba(0,0,0,0.25) !important;
    }
    
    .field-error {
        background-color: #fff5f5 !important;
    }
    
    input:focus, textarea:focus, select:focus {
        outline: none;
        box-shadow: 0 0 0 3px rgba(243, 156, 18, 0.2);
    }
`;
document.head.appendChild(style);

// Intersection Observer for Scroll Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe elements for animation
document.addEventListener('DOMContentLoaded', () => {
    const animateElements = document.querySelectorAll('.service-card, .about-card, .challenge-item, .stat-item');
    animateElements.forEach(el => {
        el.style.opacity = '0';
        observer.observe(el);
    });
});

// Counter Animation for Statistics
function animateCounter(element, start, end, duration) {
    const range = end - start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        element.textContent = current + (element.dataset.suffix || '');
        
        if (current === end) {
            clearInterval(timer);
        }
    }, stepTime);
}

// Trigger counter animation when stats section is in view
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const text = stat.textContent;
                if (text.includes('+')) {
                    const num = parseInt(text.replace('+', ''));
                    stat.textContent = '0';
                    stat.dataset.suffix = '+';
                    animateCounter(stat, 0, num, 2000);
                } else if (text.includes('%')) {
                    const num = parseInt(text.replace('%', ''));
                    stat.textContent = '0';
                    stat.dataset.suffix = '%';
                    animateCounter(stat, 0, num, 2000);
                }
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

// Observe portfolio section for counter animation
const portfolioSection = document.querySelector('.portfolio');
if (portfolioSection) {
    statsObserver.observe(portfolioSection);
}

// Active Navigation Highlighting
window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;
    
    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav-menu a[href="#${sectionId}"]`);
        
        if (navLink) {
            if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                navLink.classList.add('active');
            } else {
                navLink.classList.remove('active');
            }
        }
    });
});

// Add active link styles
const activeStyle = document.createElement('style');
activeStyle.textContent = `
    .nav-menu a.active {
        color: var(--primary-orange);
    }
    .nav-menu a.active::after {
        width: 100%;
    }
`;
document.head.appendChild(activeStyle);

// Service Card Hover Effects
document.querySelectorAll('.service-card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-10px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// Lazy Loading for Images (if you add images later)
if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add('loaded');
                imageObserver.unobserve(img);
            }
        });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// Form Validation
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
    let isValid = true;
    let firstInvalidField = null;
    
    inputs.forEach(input => {
        // Remove previous error styling
        input.classList.remove('field-error');
        
        if (!input.value.trim()) {
            input.style.borderColor = '#E74C3C';
            input.classList.add('field-error');
            if (!firstInvalidField) firstInvalidField = input;
            isValid = false;
            
            // Add shake animation
            input.style.animation = 'shake 0.5s';
            setTimeout(() => {
                input.style.animation = '';
            }, 500);
        } else {
            input.style.borderColor = '#27AE60';
        }
        
        // Email validation
        if (input.type === 'email' && input.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value)) {
                input.style.borderColor = '#E74C3C';
                input.classList.add('field-error');
                if (!firstInvalidField) firstInvalidField = input;
                isValid = false;
                
                // Add shake animation
                input.style.animation = 'shake 0.5s';
                setTimeout(() => {
                    input.style.animation = '';
                }, 500);
            }
        }
    });
    
    // Focus on first invalid field
    if (firstInvalidField) {
        firstInvalidField.focus();
    }
    
    return isValid;
}

// Add real-time validation
document.querySelectorAll('#contactForm input, #contactForm textarea, #contactForm select').forEach(field => {
    field.addEventListener('blur', function() {
        if (this.hasAttribute('required')) {
            if (this.value.trim()) {
                this.style.borderColor = '#27AE60';
                this.classList.remove('field-error');
            } else {
                this.style.borderColor = '#E74C3C';
                this.classList.add('field-error');
            }
            
            // Special email validation
            if (this.type === 'email' && this.value.trim()) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (emailRegex.test(this.value)) {
                    this.style.borderColor = '#27AE60';
                    this.classList.remove('field-error');
                } else {
                    this.style.borderColor = '#E74C3C';
                    this.classList.add('field-error');
                }
            }
        }
    });
});


// Page Load Animations
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
    
    // Animate hero content
    const heroElements = document.querySelectorAll('.hero-content > *');
    heroElements.forEach((el, index) => {
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

console.log('DARE Consulting website loaded successfully!');

// Additional PostHog Event Tracking
document.addEventListener('DOMContentLoaded', () => {
    // Track service card clicks
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', (e) => {
            const serviceName = card.querySelector('h3')?.textContent || 'Unknown';
            const link = card.querySelector('.service-link');
            
            if (link && !e.target.closest('.service-link')) {
                // If clicked on card but not the link, don't track
                return;
            }
            
            trackEvent('service_card_click', {
                service_name: serviceName,
                card_class: card.className
            });
        });
    });
    
    // Track CTA button clicks
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
        button.addEventListener('click', () => {
            trackEvent('cta_button_click', {
                button_text: button.textContent.trim(),
                button_type: button.classList.contains('btn-primary') ? 'primary' : 'secondary',
                button_location: button.closest('section')?.id || 'unknown'
            });
        });
    });
    
    // Track social media link clicks
    document.querySelectorAll('.social-links a').forEach(link => {
        link.addEventListener('click', () => {
            const platform = link.getAttribute('aria-label') || 'Unknown';
            trackEvent('social_media_click', {
                platform: platform,
                url: link.href
            });
        });
    });
    
    // Track scroll depth
    let maxScrollDepth = 0;
    let scrollTimer;
    
    window.addEventListener('scroll', () => {
        const scrollPercentage = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);
        
        if (scrollPercentage > maxScrollDepth) {
            maxScrollDepth = scrollPercentage;
            
            // Track milestone scroll depths
            if ([25, 50, 75, 90, 100].includes(maxScrollDepth)) {
                clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    trackEvent('scroll_depth_reached', {
                        depth_percentage: maxScrollDepth,
                        page_height: document.documentElement.scrollHeight
                    });
                }, 1000); // Debounce to avoid excessive tracking
            }
        }
    });
    
    // Track time on page (send event before user leaves)
    const pageLoadTime = Date.now();
    window.addEventListener('beforeunload', () => {
        const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
        trackEvent('page_exit', {
            time_on_page_seconds: timeOnPage,
            page_name: document.title.split(' - ')[0] || 'Unknown Page'
        });
    });
    
    // Track form field interactions
    document.querySelectorAll('#contactForm input, #contactForm textarea, #contactForm select').forEach(field => {
        field.addEventListener('focus', function() {
            trackEvent('form_field_focus', {
                field_name: this.name,
                field_type: this.type || this.tagName.toLowerCase()
            });
        });
    });
    
    // Track service selection in dropdown
    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        serviceSelect.addEventListener('change', function() {
            trackEvent('service_selection', {
                selected_service: this.value,
                service_label: this.options[this.selectedIndex]?.text || 'Unknown'
            });
        });
    }
    
    // Track "Learn More" links on service cards
    document.querySelectorAll('.service-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent duplicate tracking from card click
            trackEvent('learn_more_click', {
                service_name: link.closest('.service-card')?.querySelector('h3')?.textContent || 'Unknown',
                destination: link.href
            });
        });
    });
});