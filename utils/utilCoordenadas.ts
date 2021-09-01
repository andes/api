// Aplica applyHaversine para calcular distancia entre dos puntos
export function getDistanceBetweenPoints(start, end, units) {
    const earthRadius = {
        miles: 3958.8,
        km: 6371
    };

    const R = earthRadius[units || 'km'];
    const lat1 = start.lat;
    const lon1 = start.lng;
    const lat2 = end.lat;
    const lon2 = end.lng;

    const dLat = toRad((lat2 - lat1));
    const dLon = toRad((lon2 - lon1));
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;
    return d;
}

function toRad(x) {
    return x * Math.PI / 180;
}
