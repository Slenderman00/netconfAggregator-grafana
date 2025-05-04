import React, { useEffect, useState, ChangeEvent } from 'react';
import { InlineField, Input, Stack, Combobox } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { DataSourceOptions, Query } from '../types';
type Props = QueryEditorProps<DataSource, Query, DataSourceOptions>;
export function QueryEditor({ query, onChange, onRunQuery, datasource }: Props) {
  
  const [deviceOptions, setDeviceOptions] = useState<Array<{ label: string; value: string }>>([]);
  const [loading, setLoading] = useState(true);

  const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, queryText: event.target.value });
  };

  const onDeviceChange = (value: string) => {
    onChange({ ...query, device: value });
    onRunQuery();
  };
  
  const { queryText, device } = query;

  useEffect(() => {
    setLoading(true);
    datasource
      .getDevices()
      .then((devices) => {
        const options = devices.map((device: any) => ({
          label: `${device.id} (${device.server}:${device.port})`,
          value: device.id,
        }));
        setDeviceOptions(options);
      })
      .catch((error) => {
        console.error('Error fetching devices:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [datasource]);

  return (
    <Stack gap={0}>
      <InlineField label="XPATH" labelWidth={16} tooltip="The XPATH to the query resource">
        <Input
          id="query-editor-query-text"
          onChange={onQueryTextChange}
          value={queryText || ''}
          required
          placeholder="Enter an XPATH ie /"
        />
      </InlineField>
      <InlineField label="Device" labelWidth={16} tooltip="Select a device from the list">
        {loading ? (
          <div>Loading...</div>
        ) : (
          <Combobox
            key={deviceOptions.length}
            options={deviceOptions}
            value={device}
            onChange={(e) => onDeviceChange(e.value)}
            placeholder="Select a device"
            width={40}
          />
        )}
      </InlineField>
    </Stack>
  );
}