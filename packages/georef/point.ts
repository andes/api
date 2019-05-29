import { Coordenadas } from './index';

/**
 * Calcula la distancia entre dos puntos
 */
export function pointDistance(start: Coordenadas, end: Coordenadas, units: 'miles' | 'km' = 'km') {
    const earthRadius = {
        miles: 3958.8,
        km: 6371
    };

    const R = earthRadius[units || 'km'];
    const lat1 = start.lat;
    const lon1 = start.lng;
    const lat2 = end.lat;
    const lon2 = end.lng;

    const dLat = toRadian((lat2 - lat1));
    const dLon = toRadian((lon2 - lon1));
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadian(lat1)) * Math.cos(toRadian(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = R * c;
    return d;
}

function toRadian(x) {
    return x * Math.PI / 180;
}
