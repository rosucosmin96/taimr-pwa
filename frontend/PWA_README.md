# PWA Setup for Taimr

## Overview
This React app has been configured as a Progressive Web App (PWA) using the Vite PWA plugin.

## Features Enabled

### ✅ PWA Features
- **Web App Manifest**: Defines app metadata, icons, and display properties
- **Service Worker**: Enables offline functionality and caching
- **App Icons**: Multiple sizes for different devices and contexts
- **Install Prompt**: Users can install the app on their devices
- **Offline Support**: Basic caching of static assets

### 🎯 Caching Strategy
- **Static Assets**: CSS, JS, HTML, images cached for offline use
- **Supabase API**: Network-first caching with 30-day expiration
- **Render API**: Network-first caching with 7-day expiration
- **Auto Updates**: Service worker automatically updates when new version is available

### 📱 App Properties
- **Name**: Taimr - Freelancer Management
- **Short Name**: Taimr
- **Theme Color**: #805AD5 (Purple)
- **Display Mode**: Standalone (full-screen app experience)
- **Orientation**: Portrait (mobile-optimized)

## Icons Generated
- `favicon.png` (16x16) - Browser tab icon
- `favicon-16x16.png` (16x16) - Small favicon
- `favicon-32x32.png` (32x32) - Standard favicon
- `apple-touch-icon.png` (180x180) - iOS home screen
- `pwa-192x192.png` (192x192) - Android home screen
- `pwa-512x512.png` (512x512) - Large app icon
- `masked-icon.svg` - Safari pinned tab icon

## Development Commands

```bash
# Generate app icons
npm run generate-icons

# Build with PWA features
npm run build

# Preview built app
npm run preview
```

## Testing PWA Features

1. **Build the app**: `npm run build`
2. **Serve the dist folder**: `npm run preview`
3. **Open in Chrome**: Navigate to the preview URL
4. **Check PWA status**: Open DevTools → Application → Manifest
5. **Test install**: Look for install button in address bar
6. **Test offline**: Disconnect network and refresh page

## Deployment Notes

When deploying to Render:
- The PWA features are automatically included in the build
- Service worker and manifest files are generated in the `dist` folder
- All icons are copied to the public directory
- HTTPS is required for PWA features to work (Render provides this)

## Browser Support
- ✅ Chrome/Edge (full PWA support)
- ✅ Firefox (basic PWA support)
- ✅ Safari (limited PWA support)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Customization

To modify PWA settings, edit `vite.config.ts`:
- Change app name, description, colors in the `manifest` section
- Adjust caching strategies in the `workbox` section
- Add more icons or modify existing ones
