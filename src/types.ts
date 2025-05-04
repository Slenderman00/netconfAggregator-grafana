import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';

export interface Query extends DataQuery {
  queryText?: string;
  constant: number;
  device: string;
}

export const DEFAULT_QUERY: Partial<Query> = {
  constant: 6.5,
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface DataSourceOptions extends DataSourceJsonData {
  address?: string;
}