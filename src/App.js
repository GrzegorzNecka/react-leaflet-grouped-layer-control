import {
  Circle,
  Polyline,
  Polygon,
  MapContainer,
  TileLayer,
  Rectangle
} from "react-leaflet";

import "./styles.css";

import "leaflet/dist/leaflet.css";
import { LayersControl } from "./GroupLayersControlComponent";
import { ThemeProvider } from "@material-ui/core";

const center = [51.505, -0.09];

const polyline = [
  [51.505, -0.09],
  [51.51, -0.1],
  [51.51, -0.12]
];

const multiPolyline = [
  [
    [51.5, -0.1],
    [51.5, -0.12],
    [51.52, -0.12]
  ],
  [
    [51.5, -0.05],
    [51.5, -0.06],
    [51.52, -0.06]
  ]
];

const polygon = [
  [51.515, -0.09],
  [51.52, -0.1],
  [51.52, -0.12]
];

const multiPolygon = [
  [
    [51.51, -0.12],
    [51.51, -0.13],
    [51.53, -0.13]
  ],
  [
    [51.51, -0.05],
    [51.51, -0.07],
    [51.53, -0.07]
  ]
];

const rectangle = [
  [51.49, -0.08],
  [51.5, -0.06]
];

const fillBlueOptions = { fillColor: "blue" };
const blackOptions = { color: "black" };
const limeOptions = { color: "lime" };
const purpleOptions = { color: "purple" };
const redOptions = { color: "red" };

export default function App() {
  const position = [51.505, -0.09];

  return (
    <div className="App">
      <ThemeProvider>
        <MapContainer
          center={position}
          zoom={13}
          scrollWheelZoom={false}
          style={{ height: "100%" }}
        >
          <LayersControl>
            <LayersControl.BaseLayer name="OpenStreetMap.Mapnik" checked>
              <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="OpenStreetMap.BlackAndWhite">
              <TileLayer
                attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
                url="https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.Overlay name="Stations with data">
              <Circle
                center={[51.51, -0.12]}
                pathOptions={redOptions}
                radius={20}
              />
            </LayersControl.Overlay>
            <LayersControl.Overlay name="Stations without data">
              <Rectangle bounds={rectangle} pathOptions={fillBlueOptions} />
            </LayersControl.Overlay>
            <LayersControl.Group name="DOP single">
              <LayersControl.Overlay name="HDOP" checked>
                <Polyline pathOptions={limeOptions} positions={polyline} />
              </LayersControl.Overlay>
              <LayersControl.Overlay name="VDOP">
                <Polyline pathOptions={limeOptions} positions={multiPolyline} />
              </LayersControl.Overlay>
              <LayersControl.Overlay name="GDOP">
                <Polygon pathOptions={purpleOptions} positions={polygon} />
              </LayersControl.Overlay>
            </LayersControl.Group>
            <LayersControl.Group name="DOP multiple" multiple>
              <LayersControl.Overlay name="HDOP">
                <Polygon pathOptions={purpleOptions} positions={multiPolygon} />
              </LayersControl.Overlay>
              <LayersControl.Overlay name="VDOP">
                <Rectangle bounds={rectangle} pathOptions={blackOptions} />
              </LayersControl.Overlay>
              <LayersControl.Overlay name="GDOP">
                <Circle
                  center={center}
                  pathOptions={fillBlueOptions}
                  radius={200}
                />
              </LayersControl.Overlay>
            </LayersControl.Group>
          </LayersControl>
        </MapContainer>
      </ThemeProvider>
    </div>
  );
}
