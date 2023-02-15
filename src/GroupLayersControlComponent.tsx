import {
  LeafletProvider,
  createContainerComponent,
  createControlHook,
  createElementHook,
  useLeafletContext
} from "@react-leaflet/core";
import { Control, Layer } from "leaflet";
import React, {
  ForwardRefExoticComponent,
  FunctionComponent,
  FunctionComponentElement,
  ReactNode,
  RefAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import GLC, { GroupLayersControl, LayerType } from "./GroupLayersControl";

export interface LayersControlProps extends Control.LayersOptions {
  children?: ReactNode;
}

export const useLayersControlElement = createElementHook<
  GroupLayersControl,
  LayersControlProps
>(
  function createLayersControl({ children: _c, ...options }, ctx) {
    // @ts-ignore
    const instance = new GLC(
      undefined,
      // @ts-ignore
      undefined,
      // @ts-ignore
      options
    ) as GroupLayersControl;
    return { instance, context: { ...ctx, layersControl: instance } };
  },
  function updateLayersControl(control, props, prevProps) {
    if (props.collapsed !== prevProps.collapsed) {
      if (props.collapsed === true) {
        control.collapse();
      } else {
        control.expand();
      }
    }
  }
);

export const useLayersControl = createControlHook(useLayersControlElement);

export interface ControlledLayerProps {
  checked?: boolean;
  children: ReactNode;
  name: string;
  group?: string;
}

export interface GroupLayerProps {
  children:
    | FunctionComponentElement<ControlledLayerProps>
    | FunctionComponentElement<ControlledLayerProps>[];
  name: string;
  multiple?: boolean;
  inline?: boolean;
}

// @ts-ignore
export const LayersControl: ForwardRefExoticComponent<
  LayersControlProps & RefAttributes<GroupLayersControl>
> & {
  BaseLayer: FunctionComponent<ControlledLayerProps>;
  Overlay: FunctionComponent<ControlledLayerProps>;
  Group: FunctionComponent<GroupLayerProps>;
} = createContainerComponent(useLayersControl);

export function createControlledLayer(type: LayerType) {
  return function ControlledLayer(props: ControlledLayerProps) {
    const parentContext = useLeafletContext();
    const propsRef = useRef<ControlledLayerProps>(props);
    const [layer, setLayer] = useState<Layer | null>(null);

    const { layersControl, map } = parentContext;
    const control = layersControl as GroupLayersControl;

    const addLayer = useCallback(
      (layerToAdd: Layer) => {
        if (control) {
          if (propsRef.current.checked) {
            map.addLayer(layerToAdd);
          }
          control.addControl(
            type,
            layerToAdd,
            propsRef.current.name,
            propsRef.current.checked || false,
            propsRef.current.group || null
          );
          setLayer(layerToAdd);
        }
      },
      [control, map]
    );

    const removeLayer = useCallback(
      (layerToRemove: Layer) => {
        if (control) {
          control.removeControl(
            type,
            layerToRemove,
            propsRef.current.name,
            propsRef.current.group
          );
        }
        setLayer(null);
      },
      [control]
    );

    const context = useMemo(
      () => ({ ...parentContext, layerContainer: { addLayer, removeLayer } }),
      [parentContext, addLayer, removeLayer]
    );

    useEffect(() => {
      if (layer !== null && propsRef.current !== props) {
        if (
          props.checked === true &&
          (propsRef.current.checked == null ||
            propsRef.current.checked === false)
        ) {
          map.addLayer(layer);
        } else if (
          propsRef.current.checked === true &&
          (props.checked == null || props.checked === false)
        ) {
          map.removeLayer(layer);
        }
        propsRef.current = props;
      }
    });

    return props.children ? (
      <LeafletProvider value={context}>{props.children}</LeafletProvider>
    ) : null;
  };
}

export function createGroupLayer() {
  return function GroupLayer(props: GroupLayerProps) {
    const parentContext = useLeafletContext();
    const propsRef = useRef<GroupLayerProps>(props);

    const { layersControl } = parentContext;
    const control = layersControl as GroupLayersControl;
    const { name, children, ...options } = propsRef.current;
    control.addGroup(propsRef.current.name, { multiple: false, inline: false, ...options });

    useEffect(() => {
      const { name } = propsRef.current;

      return () => {
        control.removeGroup(name);
      };
    }, [control]);

    return props.children ? (
      <LeafletProvider value={parentContext}>
        {Array.isArray(props.children)
          ? props.children.map((child) =>
              React.cloneElement<ControlledLayerProps>(child, {
                group: propsRef.current.name
              })
            )
          : React.cloneElement(props.children, {
              group: propsRef.current.name
            })}
      </LeafletProvider>
    ) : null;
  };
}

LayersControl.BaseLayer = createControlledLayer("baselayer");
LayersControl.Overlay = createControlledLayer("overlay");
LayersControl.Group = createGroupLayer();
