import { useState, useCallback, useMemo } from "react";
import ReactDOM, { unstable_renderSubtreeIntoContainer } from "react-dom";
import { Map as LeafletMap, Control, DomUtil, Layer, Util } from "leaflet";
import {
  FormControl,
  FormGroup,
  Radio,
  RadioGroup,
  Switch,
  Checkbox,
  Typography,
  FormControlLabel
} from "@material-ui/core";

export type LayerType = "baselayer" | "overlay";

export interface GroupLayersControl extends Control.Layers {
  addControl(
    type: LayerType,
    layer: Layer,
    name: string,
    checked: boolean,
    group: string | null
  ): this;
  removeControl(
    type: LayerType,
    layer: Layer,
    name: string,
    group: string | null
  ): this;
  addGroup(name: string, options: any): this;
  removeGroup(name: string): this;
}

interface ControlLayer {
  id: number;
  layer: Layer;
  name: string;
  checked: boolean;
}

interface GroupOptions {
  multiple?: boolean;
  inline?: boolean;
}

interface Group {
  name: string;
  layers: ControlLayer[];
  options: GroupOptions;
}

interface CustomLayerControlProps {
  baseLayers: ControlLayer[];
  overlays: ControlLayer[];
  groups: Group[];
  addLayer(layer: Layer);
  removeLayer(layer: Layer);
}

interface CustomControlProps {
  type: "radio" | "checkbox";
  label: string;
  value: string | number;
  checked?: boolean;
  onChange?(value: string): void;
}

const CustomControl = ({
  label,
  value,
  checked,
  onChange,
  type
}: CustomControlProps) => {
  const [isChecked, setChecked] = useState(checked);

  const component = useMemo(() => {
    if (type === "checkbox") {
      const handleChange = (event) => {
        setChecked(event.target.checked);
        if (onChange) {
          onChange(event.target.checked);
        }
      };

      return (
        <Checkbox
          size="small"
          color="primary"
          checked={isChecked}
          onChange={handleChange}
        />
      );
    }

    return <Radio size="small" />;
  }, [type, isChecked, onChange]);

  return (
    <FormControlLabel
      value={value}
      label={label}
      labelPlacement="end"
      control={component}
    />
  );
};

const CustomRadioGroup = ({ options, value, onChange }) => {
  return (
    <FormControl component="fieldset">
      <RadioGroup
        value={value}
        onChange={(event) => {
          onChange(parseFloat(event.target.value));
        }}
      >
        {options.map((option) => (
          <FormControlLabel
            key={option.value}
            value={option.value}
            label={option.label}
            labelPlacement="end"
            control={<Radio size="small" />}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};

const CustomCheckboxGroup = ({ options, onChange }) => {
  return (
    <FormControl component="fieldset">
      {options.map((option) => (
        <FormControlLabel
          key={option.value}
          value={option.value}
          label={option.label}
          checked={option.checked}
          labelPlacement="end"
          control={<Checkbox size="small" />}
          onChange={(event) => {
            onChange(option.value, event.target.checked);
          }}
        />
      ))}
    </FormControl>
  );
};

const CustomLayerControl = ({
  baseLayers,
  overlays,
  groups,
  addLayer,
  removeLayer
}: CustomLayerControlProps) => {
  const [expanded, setExpanded] = useState(true);
  const [baseLayer, setBaseLayer] = useState<number>(
    baseLayers.find((l) => l.checked)?.id || -1
  );

  const [activeOverlays, setActiveOverlays] = useState<Record<number, boolean>>(
    overlays.reduce((acc, overlay) => {
      return { ...acc, [overlay.id]: overlay.checked };
    }, {})
  );

  const [activeGroups, setActiveGroups] = useState<Record<string, boolean>>(
    groups.reduce((acc, group) => {
      return { ...acc, [group.name]: group.layers.some((l) => l.checked) };
    }, {})
  );

  const [activeGroupLayers, setActiveGroupLayers] = useState<
    Record<string, ControlLayer[]>
  >(
    groups.reduce((acc, group) => {
      return { ...acc, [group.name]: group.layers.filter((l) => l.checked) };
    }, {})
  );

  const renderBaseLayers = useCallback(() => {
    if (baseLayers.length < 2) {
      return null;
    }

    return (
      <CustomRadioGroup
        value={baseLayer}
        options={baseLayers.map((l) => ({ value: l.id, label: l.name }))}
        onChange={(value) => {
          const oldLayer = baseLayers.find((l) => l.id === baseLayer);
          const newLayer = baseLayers.find((l) => l.id === parseFloat(value));

          removeLayer(oldLayer.layer);
          addLayer(newLayer.layer);

          setBaseLayer(newLayer.id);
        }}
      />
    );
  }, [baseLayers, baseLayer, addLayer, removeLayer]);

  const renderOverlays = useCallback(() => {
    if (overlays.length === 0) {
      return null;
    }

    return (
      <FormGroup>
        {overlays.map((layer) => (
          <CustomControl
            key={layer.id}
            type="checkbox"
            value={layer.id}
            label={layer.name}
            checked={activeOverlays[layer.id]}
            onChange={(value) => {
              if (value) {
                addLayer(layer.layer);
              } else {
                removeLayer(layer.layer);
              }
              setActiveOverlays({ ...activeOverlays, [layer.id]: value });
            }}
          />
        ))}
      </FormGroup>
    );
  }, [overlays, activeOverlays, addLayer, removeLayer]);

  const renderGroupsControl = useCallback(() => {
    if (groups.length === 0) {
      return null;
    }
    return (
      <FormGroup>
        {groups
          .filter((g) => !g.options.inline)
          .map((group) => (
            <CustomControl
              key={group.name}
              value={group.name}
              label={group.name}
              checked={activeGroups[group.name]}
              type="checkbox"
              onChange={(value) => {
                if (value) {
                  activeGroupLayers[group.name].forEach((l) =>
                    addLayer(l.layer)
                  );
                } else {
                  activeGroupLayers[group.name].forEach((l) =>
                    removeLayer(l.layer)
                  );
                }
                setActiveGroups({ ...activeGroups, [group.name]: value });
              }}
            />
          ))}
      </FormGroup>
    );
  }, [groups, activeGroups, activeGroupLayers, addLayer, removeLayer]);

  const renderActiveGroups = useCallback(() => {
    const _groups = groups.filter((g) => activeGroups[g.name]);
    if (_groups.length === 0) {
      return null;
    }

    return _groups.map(({ name, layers, options }) => {
      if (layers.length === 0) {
        return null;
      }

      return (
        <div
          key={name}
          className="leaflet-control-layers leaflet-group-control-group"
          style={{ textAlign: "left" }}
        >
          <Typography variant="h6">{name}</Typography>
          {options.multiple ? (
            <CustomCheckboxGroup
              options={layers.map((l) => ({
                value: l.id,
                label: l.name,
                checked: activeGroupLayers[name].includes(l)
              }))}
              onChange={(layerId, value) => {
                const layer = layers.find((l) => l.id === layerId);
                let activeLayers;
                if (value) {
                  addLayer(layer.layer);
                  activeLayers = [...activeGroupLayers[name], layer];
                } else {
                  removeLayer(layer.layer);
                  activeLayers = activeGroupLayers[name].filter(
                    (l) => l.id !== layer.id
                  );
                }

                setActiveGroupLayers({
                  ...activeGroupLayers,
                  [name]: activeLayers
                });
              }}
            />
          ) : (
            <CustomRadioGroup
              value={activeGroupLayers[name][0].id}
              options={layers.map((l) => ({ value: l.id, label: l.name }))}
              onChange={(value) => {
                const newLayer = layers.find((la) => la.id === value);

                removeLayer(activeGroupLayers[name][0].layer);
                addLayer(newLayer.layer);

                setActiveGroupLayers({
                  ...activeGroupLayers,
                  [name]: [newLayer]
                });
              }}
            />
          )}
        </div>
      );
    });
  }, [groups, activeGroups, activeGroupLayers, addLayer, removeLayer]);

  const renderBox = () => {
    return (
      <div className="leaflet-control-layers">
        <section className="leaflet-control-layers-list">
          {renderBaseLayers()}
          <div className="leaflet-control-layers-separator" />
          {renderOverlays()}
          <div className="leaflet-control-layers-separator" />
          {renderGroupsControl()}
        </section>
      </div>
    );
  };

  return (
    <>
      <div
        className={`${expanded ? "leaflet-control-layers-expanded" : ""}`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(true)}
      >
        <div className="leaflet-control-layers toggle">
          <span className="leaflet-control-layers-toggle" />
        </div>
        <div className="leaflet-group-control-layers">
          {renderBox()}
          {renderActiveGroups()}
        </div>
      </div>
    </>
  );
};

const LeafletGroupLayersControl = Control.Layers.extend({
  options: {},

  initialize: function (baseLayers, overlays, options) {
    Util.setOptions(this, options);
    // @ts-ignore
    Control.Layers.prototype.initialize.call(
      this,
      baseLayers,
      overlays,
      options
    );

    this._baseLayers = [];
    this._overlays = [];
    this._groups = [];
  },

  addBaseLayer(layer: Layer, name: string) {
    this.addControl("baselayer", layer, name, false, null);
  },

  addOverlay(layer: Layer, name: string) {
    this.addControl("overlay", layer, name, false, null);
  },

  addControl(
    type: LayerType,
    layer: Layer,
    name: string,
    checked: boolean,
    group: string | null
  ) {
    // if no group supplied, add to baseLayers or overlays
    if (!group) {
      const list = type === "baselayer" ? this._baseLayers : this._overlays;
      list.push({
        id: Util.stamp(layer),
        layer,
        name,
        checked
      });
    } else {
      // find group
      const _group = this._groups.find((g) => g.name === group);

      if (!_group) {
        // group does not exists
        console.error(`Group ${group} not found!`);
        return this;
      }

      if (this._map) {
        layer.on("add remove", this._onLayerChange, this);
      }

      console.log(`Add layer ${name} to ${group}!`);
      _group.layers.push({
        id: Util.stamp(layer),
        layer,
        name,
        checked
      });
    }

    return this._map ? this._update() : this;
  },
  removeControl(
    type: LayerType,
    layer: Layer,
    name: string,
    group: string | null
  ) {},
  addGroup(name: string, options: GroupOptions) {
    console.log("add group", name, options);
    // check if group already exists
    if (this._groups.some((group) => group.name === name)) {
      // group already exists
      return;
    }

    this._groups.push({
      name,
      options: {
        multiple: false,
        ...options
      },
      layers: []
    });

    return this;
  },
  removeGroup(name: string) {
    console.log("remove group", name);

    return this;
  },
  expand() {
    DomUtil.addClass(this._layersContainer, "leaflet-control-layers-expanded");

    this._section.style.height = null;

    const acceptableHeight =
      this._map.getSize().y - (this._container.offsetTop + 50);

    if (acceptableHeight < this._section.clientHeight) {
      DomUtil.addClass(this._section, "leaflet-control-layers-scrollbar");
      this._section.style.height = acceptableHeight + "px";
    } else {
      DomUtil.removeClass(this._section, "leaflet-control-layers-scrollbar");
    }

    //this._checkDisabledLayers();
    return this;
  },
  collapse() {
    DomUtil.removeClass(
      this._layersContainer,
      "leaflet-control-layers-expanded"
    );
    return this;
  },
  _update() {
    ReactDOM.render(
      <CustomLayerControl
        baseLayers={this._baseLayers}
        overlays={this._overlays}
        groups={this._groups}
        addLayer={(layer) => {
          this._map.addLayer(layer);
        }}
        removeLayer={(layer) => {
          this._map.removeLayer(layer);
        }}
      />,
      this._container
    );
  },
  _initLayout() {
    this._container = DomUtil.create("div", "leaflet-group-control");
  },

  _getLayer(id) {
    // first search in original layers
    // @ts-ignore
    const layer = Control.Layers.prototype._getLayer.call(this, id);

    // if no layer found, search in group layers
    if (!layer) {
      const layers = this._groups.map((g) => g.layers).flat();
      for (var i = 0; i < layers.length; i++) {
        if (layers[i] && Util.stamp(layers[i].layer) === id) {
          return layers[i];
        }
      }
    }

    return layer;
  }
});

export default LeafletGroupLayersControl;
