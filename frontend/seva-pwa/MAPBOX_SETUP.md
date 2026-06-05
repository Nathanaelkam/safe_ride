# Mapbox Setup Guide

## Getting Your Mapbox Access Token

1. **Create a Mapbox Account**
   - Visit [mapbox.com](https://www.mapbox.com/)
   - Sign up for a free account

2. **Get Your Access Token**
   - Go to your [Mapbox Account page](https://account.mapbox.com/)
   - Find your "Default public token" or create a new one
   - Copy the token (starts with `pk.`)

3. **Add Token to Environment Variables**
   Create a `.env.local` file in your project root:
   ```env
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.your_actual_token_here
   ```

## Free Tier Limits

- **50,000 map loads per month** - Free
- **Directions API**: 100,000 requests per month - Free
- **Geocoding**: 100,000 requests per month - Free

## Features You Get with Mapbox

✅ **Beautiful Maps**: Multiple style options (light, dark, streets, satellite)
✅ **Real Road Routing**: Accurate driving directions following actual roads
✅ **Theme Support**: Light and dark themes that match your app
✅ **Interactive Maps**: Smooth zooming, panning, and interactions
✅ **Cameroon Coverage**: Excellent map coverage for Cameroon and Africa
✅ **Performance**: Fast loading and rendering
✅ **Mobile Optimized**: Works great on PWAs and mobile devices

## Map Styles Available

- `mapbox://styles/mapbox/streets-v12` - Default streets
- `mapbox://styles/mapbox/light-v11` - Light theme
- `mapbox://styles/mapbox/dark-v11` - Dark theme  
- `mapbox://styles/mapbox/satellite-v9` - Satellite imagery
- `mapbox://styles/mapbox/navigation-day-v1` - Navigation optimized

## Components Created

1. **MapboxRoutePreview** - Shows route preview with real roads on trip confirmation
2. **MapboxTrackingMap** - Shows live trip tracking during active trips

## Next Steps

After setting up your token:
1. Install dependencies: `npm install mapbox-gl react-map-gl`
2. Add your token to `.env.local`
3. Restart your development server
4. Test the route preview and tracking features

Your maps will now show beautiful, accurate routes following real roads in Cameroon! 🗺️