import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';
import { Query, DataSourceOptions, DEFAULT_QUERY } from './types';

export class DataSource extends DataSourceWithBackend<Query, DataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<DataSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<Query> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: Query, scopedVars: ScopedVars) {
    return {
      ...query,
      queryText: getTemplateSrv().replace(query.queryText, scopedVars),
    };
  }

  filterQuery(query: Query): boolean {
    return !!query.queryText;
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
}