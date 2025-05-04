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
    onChange({ ...query, xpath: event.target.value });
    onRunQuery();
  };

  const onDeviceChange = (value: string) => {
    onChange({ ...query, device: value });
    onRunQuery();
  };

  const onTypeChange = (value: string) => {
    onChange({ ...query, type: value });
    if (value !== 'contains') {
      onChange({ ...query, type: value, containsString: undefined });
    }
    onRunQuery();
  };

  const onContainsStringChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...query, containsString: event.target.value });
    onRunQuery();
  };

  const { xpath, device, type, containsString } = query;

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
    <>
      <Stack gap={0}>
        <InlineField label="XPATH" labelWidth={17} tooltip="The XPATH to the query resource">
          <Input
            id="query-editor-query-text"
            onChange={onQueryTextChange}
            value={xpath || ''}
            required
            placeholder="Enter an XPATH ie /"
            width={40}
          />
        </InlineField>
        <InlineField label="Device" labelWidth={17} tooltip="Select a device from the list">
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
      <Stack gap={0}>
        <InlineField label="Type" labelWidth={17} tooltip="Specify the type of query">
          <Combobox
            options={[
              { label: 'Integer (int)', value: 'int' },
              { label: 'Contains (string)', value: 'contains' },
            ]}
            value={type || ''}
            onChange={(e) => onTypeChange(e.value)}
            placeholder="Select a type"
            width={40}
          />
        </InlineField>
        {type === 'contains' && (
          <InlineField label="Contains String" labelWidth={17} tooltip="Enter the string to look for">
            <Input
              id="query-editor-contains-string"
              onChange={onContainsStringChange}
              value={containsString || ''}
              required
              placeholder="Enter the string to look for"
              width={40}
            />
          </InlineField>
        )}
    </Stack>
  </>
  );
}
