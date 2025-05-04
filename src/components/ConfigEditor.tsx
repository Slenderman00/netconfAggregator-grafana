import React, { ChangeEvent } from 'react';
import { InlineField, Input } from '@grafana/ui';
import { DataSourcePluginOptionsEditorProps } from '@grafana/data';
import { DataSourceOptions } from '../types';

interface Props extends DataSourcePluginOptionsEditorProps<DataSourceOptions> {}

export function ConfigEditor(props: Props) {
  const { onOptionsChange, options } = props;
  const { jsonData } = options;

  const onAddressChange = (event: ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({
      ...options,
      jsonData: {
        ...jsonData,
        address: event.target.value,
      },
    });
  };

  return (
    <>
      <InlineField label="Address" labelWidth={14} interactive tooltip={'NetconfAggregator Address'}>
        <Input
          id="config-editor-path"
          onChange={onAddressChange}
          value={jsonData.address}
          placeholder="Enter the address: ie 127.0.0.1:3001"
          width={40}
        />
      </InlineField>
    </>
  );
}

//<InlineField label="API Key" labelWidth={14} interactive tooltip={'Secure json field (backend only)'}>
//<SecretInput
//  required
//  id="config-editor-api-key"
//  isConfigured={secureJsonFields.apiKey}
//  value={secureJsonData?.apiKey}
//  placeholder="Enter your API key"
//  width={40}
//  onReset={onResetAPIKey}
//  onChange={onAPIKeyChange}
///>
//</InlineField>
