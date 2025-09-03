// Initialize the map
const map = L.map("map").setView([20, 0], 2);

// Add tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Create a layer group for earthquakes
const earthquakeLayer = L.layerGroup().addTo(map);

// Create a legend
const legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "legend");
  div.innerHTML = `
                <div class="legend-title">Earthquake Magnitude</div>
                <div class="legend-item"><span class="legend-color" style="background:#4CAF50"></span> < 4.0 (Minor)</div>
                <div class="legend-item"><span class="legend-color" style="background:#FFEB3B"></span> 4.0 - 5.0 (Light)</div>
                <div class="legend-item"><span class="legend-color" style="background:#FF9800"></span> 5.0 - 6.0 (Moderate)</div>
                <div class="legend-item"><span class="legend-color" style="background:#F44336"></span> 6.0 - 7.0 (Strong)</div>
                <div class="legend-item"><span class="legend-color" style="background:#9C27B0"></span> > 7.0 (Major)</div>
            `;
  return div;
};

legend.addTo(map);

// Function to determine color based on magnitude
function getColor(magnitude) {
  return magnitude > 7.0
    ? "#9C27B0"
    : magnitude > 6.0
    ? "#F44336"
    : magnitude > 5.0
    ? "#FF9800"
    : magnitude > 4.0
    ? "#FFEB3B"
    : "#4CAF50";
}

// Function to determine radius based on magnitude
function getRadius(magnitude) {
  return magnitude * 3;
}

// Fetch earthquake data from USGS API
async function fetchEarthquakeData() {
  try {
    const response = await fetch(
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson"
    );
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching earthquake data:", error);
    return null;
  }
}

// Process and display earthquake data
function displayEarthquakes(data) {
  // Clear previous earthquakes
  earthquakeLayer.clearLayers();

  if (!data || !data.features) {
    document.getElementById("earthquake-items").innerHTML =
      '<div class="loading">Failed to load earthquake data</div>';
    document.getElementById("list-items").innerHTML =
      '<div class="loading">Failed to load earthquake data</div>';
    return;
  }

  const earthquakes = data.features;
  const minMagnitude = parseFloat(
    document.getElementById("magnitude-slider").value
  );
  const maxDepth = parseFloat(document.getElementById("depth-slider").value);

  // Update stats
  document.getElementById("total-eq").textContent = earthquakes.length;

  let maxMagnitude = 0;
  const filteredEarthquakes = [];

  // Process each earthquake
  earthquakes.forEach((earthquake) => {
    const properties = earthquake.properties;
    const geometry = earthquake.geometry;
    const magnitude = properties.mag;
    const depth = geometry.coordinates[2];

    // Update max magnitude
    if (magnitude > maxMagnitude) maxMagnitude = magnitude;

    // Apply filters
    if (magnitude >= minMagnitude && depth <= maxDepth) {
      filteredEarthquakes.push(earthquake);

      // Create circle marker for earthquake
      const circle = L.circle(
        [geometry.coordinates[1], geometry.coordinates[0]],
        {
          color: getColor(magnitude),
          fillColor: getColor(magnitude),
          fillOpacity: 0.7,
          radius: getRadius(magnitude),
        }
      ).addTo(earthquakeLayer);

      // Bind popup to circle
      circle.bindPopup(`
                        <strong>${properties.place}</strong><br>
                        Magnitude: ${magnitude}<br>
                        Depth: ${depth} km<br>
                        Time: ${new Date(properties.time).toLocaleString()}
                    `);
    }
  });

  // Update max magnitude display
  document.getElementById("max-mag").textContent = maxMagnitude.toFixed(1);

  // Update last updated time
  document.getElementById("last-updated").textContent =
    new Date().toLocaleTimeString();

  // Update earthquake list
  updateEarthquakeList(filteredEarthquakes);
  updateListView(filteredEarthquakes);
}

// Update the earthquake list in the sidebar
function updateEarthquakeList(earthquakes) {
  const container = document.getElementById("earthquake-items");

  if (earthquakes.length === 0) {
    container.innerHTML =
      '<div class="loading">No earthquakes match the current filters</div>';
    return;
  }

  // Sort by time (most recent first)
  earthquakes.sort((a, b) => b.properties.time - a.properties.time);

  let html = "";
  earthquakes.slice(0, 5).forEach((earthquake) => {
    const properties = earthquake.properties;
    const geometry = earthquake.geometry;
    const magnitude = properties.mag;
    const depth = geometry.coordinates[2];

    html += `
                    <div class="earthquake-item" data-id="${earthquake.id}">
                        <div>
                            <span class="mag-badge" style="background: ${getColor(
                              magnitude
                            )}; color: ${
      magnitude > 5.0 ? "white" : "black"
    };">${magnitude.toFixed(1)}</span>
                            ${properties.place}
                        </div>
                        <div>${depth} km</div>
                    </div>
                `;
  });

  container.innerHTML = html;

  // Add click events to list items
  document.querySelectorAll(".earthquake-item").forEach((item) => {
    item.addEventListener("click", function () {
      const earthquakeId = this.getAttribute("data-id");
      const earthquake = earthquakes.find((eq) => eq.id === earthquakeId);
      if (earthquake) {
        const [lng, lat] = earthquake.geometry.coordinates;
        map.setView([lat, lng], 5);

        // Switch to map view
        showMapView();
      }
    });
  });
}

// Update the list view
function updateListView(earthquakes) {
  const container = document.getElementById("list-items");
  const countElement = document.getElementById("list-count");

  if (earthquakes.length === 0) {
    container.innerHTML =
      '<div class="loading">No earthquakes match the current filters</div>';
    countElement.textContent = "0 earthquakes";
    return;
  }

  // Get current sort type
  const sortType = document
    .querySelector(".sort-btn.active")
    .getAttribute("data-sort");

  // Sort based on selected criteria
  if (sortType === "time") {
    earthquakes.sort((a, b) => b.properties.time - a.properties.time);
  } else if (sortType === "magnitude") {
    earthquakes.sort((a, b) => b.properties.mag - a.properties.mag);
  } else if (sortType === "depth") {
    earthquakes.sort(
      (a, b) => a.geometry.coordinates[2] - b.geometry.coordinates[2]
    );
  }

  countElement.textContent = `${earthquakes.length} earthquakes`;

  let html = "";
  earthquakes.forEach((earthquake) => {
    const properties = earthquake.properties;
    const geometry = earthquake.geometry;
    const magnitude = properties.mag;
    const depth = geometry.coordinates[2];
    const time = new Date(properties.time).toLocaleString();

    html += `
                    <div class="list-view-item" data-id="${earthquake.id}">
                        <div class="list-mag" style="background: ${getColor(
                          magnitude
                        )}; color: ${
      magnitude > 5.0 ? "white" : "black"
    };">${magnitude.toFixed(1)}</div>
                        <div class="list-details">
                            <div class="list-location">${properties.place}</div>
                            <div class="list-meta">
                                <span>Depth: ${depth} km</span>
                                <span>${time}</span>
                            </div>
                        </div>
                    </div>
                `;
  });

  container.innerHTML = html;

  // Add click events to list items
  document.querySelectorAll(".list-view-item").forEach((item) => {
    item.addEventListener("click", function () {
      const earthquakeId = this.getAttribute("data-id");
      const earthquake = earthquakes.find((eq) => eq.id === earthquakeId);
      if (earthquake) {
        const [lng, lat] = earthquake.geometry.coordinates;
        map.setView([lat, lng], 5);

        // Switch to map view
        showMapView();
      }
    });
  });
}

// Show map view
function showMapView() {
  document.getElementById("map-view").style.display = "block";
  document.getElementById("list-view").style.display = "none";
  document.getElementById("map-toggle").classList.add("active");
  document.getElementById("list-toggle").classList.remove("active");

  // Trigger resize event to ensure map renders correctly
  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

// Show list view
function showListView() {
  document.getElementById("map-view").style.display = "none";
  document.getElementById("list-view").style.display = "block";
  document.getElementById("map-toggle").classList.remove("active");
  document.getElementById("list-toggle").classList.add("active");
}

// Initialize the application
async function initApp() {
  // Set up event listeners for filters
  document
    .getElementById("magnitude-slider")
    .addEventListener("input", function () {
      document.getElementById("min-mag-value").textContent = this.value;
      refreshData();
    });

  document
    .getElementById("depth-slider")
    .addEventListener("input", function () {
      document.getElementById("max-depth-value").textContent = this.value;
      refreshData();
    });

  // Set up view toggles
  document.getElementById("map-toggle").addEventListener("click", showMapView);
  document
    .getElementById("list-toggle")
    .addEventListener("click", showListView);

  // Set up sort buttons
  document.querySelectorAll(".sort-btn").forEach((button) => {
    button.addEventListener("click", function () {
      document
        .querySelectorAll(".sort-btn")
        .forEach((btn) => btn.classList.remove("active"));
      this.classList.add("active");
      refreshData();
    });
  });

  // Set up search input
  document
    .getElementById("search-input")
    .addEventListener("input", function () {
      refreshData();
    });

  // Load initial data
  await refreshData();

  // Set up auto-refresh every 5 minutes
  setInterval(refreshData, 5 * 60 * 1000);
}

// Refresh earthquake data
async function refreshData() {
  const data = await fetchEarthquakeData();
  displayEarthquakes(data);
}

// Start the application
initApp();
