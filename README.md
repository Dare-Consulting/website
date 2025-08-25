# DARE Consulting Website

Professional consulting website for DARE Management Consultancy Services, featuring the DARE framework (Discover, Actualize, Relate, Excel) for business transformation and leadership development.

## 🚀 Quick Start

### Local Development
```bash
# Navigate to website directory
cd website/

# Open in browser (no build required - static site)
open index.html

# Or use a local server for better development experience
python3 -m http.server 8000
# Visit http://localhost:8000
```

## 📁 Project Structure

```
website/
├── index.html          # Main landing page
├── discover.html       # Discover service page
├── actualize.html      # Actualize service page
├── relate.html         # Relate service page
├── excel.html          # Excel service page
├── styles.css          # Main stylesheet
├── script.js           # JavaScript (forms, analytics, animations)
├── test-retry.html     # Email retry logic test suite
└── render.yaml         # Render.com deployment config
```

## ✨ Features

### Core Functionality
- **Responsive Design**: Mobile-first approach, adapts to all screen sizes
- **Contact Forms**: Available on all pages with service pre-selection
- **Email Integration**: Backend API integration with retry logic
- **Analytics**: PostHog tracking for user interactions
- **SEO Optimized**: Meta tags, Open Graph, structured data
- **Performance**: Lazy loading, optimized images

### DARE Framework Services
1. **Discover**: Organizational assessment and analysis
2. **Actualize**: Strategic planning and implementation
3. **Relate**: Leadership and team development
4. **Excel**: Performance optimization and growth

### Technical Features
- **Retry Logic**: Exponential backoff for email sending (max 3 retries)
- **Error Handling**: User-friendly notifications for all scenarios
- **Event Tracking**: Comprehensive analytics with PostHog
- **Smooth Animations**: Scroll-triggered animations and transitions
- **Form Validation**: Client-side validation with helpful feedback

## 🔧 Configuration

### API Endpoint
The email API endpoint is configured in `script.js`:
```javascript
const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api/send-email'
    : 'https://email-api-m118.onrender.com/api/send-email';
```

### PostHog Analytics
PostHog is integrated with API key: `phc_9ky4zAZoQtZ5pxA3z6Dy1qpzSfwqprCi37GhxrbzDBv`

Events tracked:
- Page views
- Form submissions
- Service interest
- User interactions
- Error events
- Retry attempts

## 📊 Current Statistics
- **Companies Transformed**: 100+
- **Leaders Trained**: 1000+
- **Client Satisfaction**: 95%
- **Global Reach**: Worldwide Impact

## 🎨 Design System

### Colors
- Primary Red: `#e74c3c`
- Primary Orange: `#f39c12`
- Dark Gray: `#2c3e50`
- Light Gray: `#f8f9fa`
- White: `#ffffff`

### Typography
- Font Family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
- Hero Title: 3.5rem (mobile: 2.5rem)
- Section Title: 2.5rem
- Body Text: 1rem with 1.6 line-height

### Components
- Hero sections with gradient overlays
- Service cards with hover effects
- Contact forms with validation
- Notification system (success/error/warning/info)
- Statistics counter animations

## 🚀 Deployment

### Static Site Deployment (Render.com)

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Deploy DARE Consulting website"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main
```

2. **Deploy on Render**
- Go to [Render Dashboard](https://dashboard.render.com)
- Create New → Static Site
- Connect GitHub repository
- Use `render.yaml` configuration
- Deploy

### Manual Deployment
Simply upload all files to any static hosting service:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any web server

## 🧪 Testing

### Email Retry Logic Testing
Open `test-retry.html` to test:
- Successful email sending
- Server error with retry
- Client error without retry
- Network error with retry
- Timeout with retry

### Browser Compatibility
Tested and supported on:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 📈 Analytics Dashboard

View analytics at [PostHog Dashboard](https://app.posthog.com)

Key metrics tracked:
- Page views and user sessions
- Form conversion rates
- Service interest distribution
- Error rates and retry patterns
- User journey flows

## 🔒 Security

- No sensitive data stored client-side
- HTTPS enforced in production
- Form validation and sanitization
- CORS configured for API calls
- Security headers via Render configuration

## 📝 Development Notes

### Adding New Pages
1. Copy existing service page as template
2. Update content and meta tags
3. Add PostHog tracking events
4. Ensure contact form has correct service pre-selection
5. Test on mobile and desktop

### Modifying Styles
- Main styles in `styles.css`
- Component-specific styles inline in HTML
- Maintain CSS variables for consistency
- Test responsive breakpoints

### Updating Content
- Statistics: `index.html` lines 286-291
- Service descriptions: Individual service HTML files
- Contact email: Update in API configuration
- Images: Use Unsplash with optimization parameters

## 🐛 Troubleshooting

### Forms Not Submitting
- Check browser console for errors
- Verify API endpoint is accessible
- Ensure all required fields are filled
- Check network tab for API response

### Images Not Loading
- Verify Unsplash URLs are valid
- Check internet connection
- Try alternative image URLs
- Use local images as fallback

### Analytics Not Tracking
- Verify PostHog script is loaded
- Check for ad blockers
- Ensure cookies are enabled
- View browser console for errors

## 📚 Documentation

Additional documentation available in:
- `/documentation/website/` - Comprehensive guides
- `DEPLOY-TO-RENDER.md` - Deployment instructions
- `SEO-REPORT.md` - SEO implementation details
- `POSTHOG-SETUP.md` - Analytics configuration

## 🤝 Support

For technical support or questions:
- Email: coach@dareconsulting.group
- Website: [dareconsulting.group](https://dareconsulting.group)

## 📄 License

© 2025 DARE Management Consultancy Services. All rights reserved.

---

*Last Updated: January 2025*
*Version: 1.0.0*