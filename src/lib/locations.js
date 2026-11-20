// Places you can jump to from the control panel. The sun is calculated for each place,
// and the camera (zoom, pitch, bearing) is set to frame its terrain.
// Zoom should stay above 8, where shadows are drawn.
export const LOCATIONS = [
  { id: 'oahu', name: 'Oʻahu', lng: -157.98, lat: 21.48, zoom: 9.6, pitch: 55, bearing: 20 },
  { id: 'grand-canyon', name: 'Grand Canyon', lng: -112.11, lat: 36.1, zoom: 11.5, pitch: 60, bearing: 10 },
  { id: 'canyonlands', name: 'Canyonlands', lng: -109.88, lat: 38.4, zoom: 11.5, pitch: 55, bearing: -20 },
  { id: 'yosemite', name: 'Yosemite Valley', lng: -119.57, lat: 37.73, zoom: 12.2, pitch: 65, bearing: 70 },
  { id: 'matterhorn', name: 'Matterhorn', lng: 7.66, lat: 45.98, zoom: 12, pitch: 65, bearing: -60 },
  { id: 'everest', name: 'Mount Everest', lng: 86.93, lat: 27.99, zoom: 11.2, pitch: 65, bearing: 0 },
  { id: 'torres-del-paine', name: 'Torres del Paine', lng: -73.05, lat: -50.97, zoom: 11.2, pitch: 60, bearing: 0 },
  { id: 'geirangerfjord', name: 'Geirangerfjord', lng: 7.06, lat: 62.11, zoom: 11.2, pitch: 60, bearing: 90 },
]

// Set to true to look straight down (pitch 0) at every place, ignoring each place's pitch.
const TOP_DOWN = true

/** The camera for a place, as MapLibre options: center, zoom, pitch, bearing. */
export function cameraFor(place) {
  return {
    center: [place.lng, place.lat],
    zoom: place.zoom,
    pitch: TOP_DOWN ? 0 : place.pitch,
    bearing: place.bearing,
  }
}
