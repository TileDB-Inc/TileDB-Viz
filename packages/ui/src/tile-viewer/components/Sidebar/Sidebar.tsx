import * as React from 'react';
import CacheControl from '../CacheControl';
import ZoomControls from '../ZoomControl';
import { Attribute, Dimension } from '@tiledb-inc/viz-core';
import TileDBClient from '@tiledb-inc/tiledb-cloud';
import GroupSelector from '../GroupSelector';
import ChannelPanel from '../ChannelPanel';
import DimensionPanel from '../DimensionPanel';
import AttributePanel from '../AttributePanel';
import './Sidebar.scss';
import ToggleSwitch from '../ToggleSwitch';
import { Channel, LevelRecord } from '@tiledb-inc/viz-core';

type Props = {
  baseGroup?: string;
  namespace: string;
  dimensions: Dimension[];
  client: TileDBClient;
  attributes: Attribute[];
  channels: Map<string, Channel[]>;
  levels: LevelRecord[];
  onGroupSelect: (id: string) => void;
  onDimensionUpdate: (value: number, name: string) => void;
  onAttributeUpdate: (name: string) => void;
};

const Sidebar: React.FC<Props> = (props: Props) => {

  const selectedAttribute = props.attributes.filter((item: Attribute) => item.visible)[0]?.name ?? '';

  return (
    <div className="ImageViewer-Sidebar">
      <ZoomControls />
      
      {(props.channels.get(selectedAttribute)?.length ?? 0) > 0 && (
        <ChannelPanel
          channels={
            props.channels.get(
              props.attributes.filter((item: Attribute) => item.visible)[0]?.name
            ) ?? []
          }
        />
      )}

      {props.dimensions.length > 0 && (
        <DimensionPanel
          dimensions={props.dimensions}
          onDimensionUpdate={() => {}}
        />
      )}

      {props.attributes.length > 1 && (
        <AttributePanel
          attributes={props.attributes}
          onAttributeUpdate={() => {}}
        />
      )}
      {props.baseGroup && (
        <GroupSelector
          client={props.client}
          groupNamespace={props.namespace}
          baseGroup={props.baseGroup}
          itemsPerPage={5}
          onGroupSelect={() => {}}
        />
      )}
     
      <CacheControl levels={props.levels} tileSize={1024} attribute={props.attributes.at(0)} />
      <ToggleSwitch
        active={true}
        onClick={() => {}}
        label={active => (active ? 'Disable minimap' : 'Enable minimap')}
      />
    </div>
  );
};

export default Sidebar;
