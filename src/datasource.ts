import { DataSourceInstanceSettings, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { Query, DataSourceOptions } from './types';

export class DataSource extends DataSourceWithBackend<Query, DataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<DataSourceOptions>) {
    super(instanceSettings);
  }

  applyTemplateVariables(query: Query, scopedVars: ScopedVars) {
    return {
      ...query,
      xpath: getTemplateSrv().replace(query.xpath, scopedVars),
    };
  }

  filterQuery(query: Query): boolean {
    return !!query.xpath;
  }

  async getDevices(): Promise<any[]> {
    try {
      const response = await this.getResource('devices');
      return response || [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  }

  async getDeviceData(device: string, xpath: string): Promise<any> {
    try {
      const response = await this.getResource(`devices/${device}/data?xpathQuery=${xpath}`);
      return response || [];
    } catch (error) {
      console.error('Error fetching device data:', error);
      return [];
    }
  }
}
