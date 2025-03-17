var myAPIKey = "1b95c3f497b54d0f9d3f098eb3636c89";
const socket = io();
const map = L.map("map").setView([0, 0], 15);
L.tileLayer("https://maps.geoapify.com/v1/tile/osm-liberty/{z}/{x}/{y}.png?apiKey={apiKey}", {
    attribution: "OpenStreetMap",
    apiKey: myAPIKey,
    maxZoom: 20,
    id: "osm-liberty"
}).addTo(map);

const markers = {};
let fromWaypoint = null;
let toWaypoint = null;

window.addEventListener('testToWaypointReady', (event) => {
    toWaypoint = event.detail;
    const toWaypointMarker = L.marker(toWaypoint).addTo(map).bindPopup("Destination").openPopup();
});

// Send location if supported
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            socket.emit("send-location", { latitude, longitude });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
}

// Receive updates from server
socket.on("receive-location", (data) => {
    const { id, latitude, longitude } = data;
    
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }

    map.setView([latitude, longitude]);
    fromWaypoint = [latitude, longitude];

    if (toWaypoint) { // Ensure toWaypoint is not null before making the fetch call
        const url = `https://api.geoapify.com/v1/routing?waypoints=${fromWaypoint.join(',')}|${toWaypoint.join(',')}&mode=drive&apiKey=${myAPIKey}`;
        
        fetch(url).then(res => res.json()).then(result => {
            console.log(result);

            L.geoJSON(result, {
                style: (feature) => {
                    return {
                        color: "rgba(20, 137, 255, 0.7)",
                        weight: 5
                    };
                }
            }).bindPopup((layer) => {
                return `${layer.feature.properties.distance} ${layer.feature.properties.distance_units}, ${layer.feature.properties.time}`;
            }).addTo(map);

        }, error => console.log(error));
    }
});

// Handle user disconnects
socket.on("user-disconnected", (id) => {
    if (markers[id]) {
        map.removeLayer(markers[id]);
        delete markers[id];
    }
});


