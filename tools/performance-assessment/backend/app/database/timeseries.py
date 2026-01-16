"""
Time-Series Database Integration

Uses InfluxDB for storing high-frequency SCADA and weather data.

Author: Manus AI
Date: January 12, 2026
"""

from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import os
import pandas as pd


class TimeSeriesDB:
    """
    Time-series database client for SCADA and weather data.
    
    Uses InfluxDB 2.x for efficient storage and querying of time-series data.
    """
    
    def __init__(
        self,
        url: Optional[str] = None,
        token: Optional[str] = None,
        org: Optional[str] = None,
        bucket: Optional[str] = None
    ):
        """
        Initialize the time-series database client.
        
        Args:
            url: InfluxDB URL (defaults to env variable)
            token: InfluxDB token (defaults to env variable)
            org: InfluxDB organization (defaults to env variable)
            bucket: InfluxDB bucket (defaults to env variable)
        """
        self.url = url or os.getenv("INFLUXDB_URL", "http://localhost:8086")
        self.token = token or os.getenv("INFLUXDB_TOKEN")
        self.org = org or os.getenv("INFLUXDB_ORG", "mce")
        self.bucket = bucket or os.getenv("INFLUXDB_BUCKET", "performance_assessment")
        
        self.client = InfluxDBClient(url=self.url, token=self.token, org=self.org)
        self.write_api = self.client.write_api(write_options=SYNCHRONOUS)
        self.query_api = self.client.query_api()
    
    def close(self):
        """Close the database connection."""
        self.client.close()
    
    # ========================================================================
    # SCADA Data Methods
    # ========================================================================
    
    def write_scada_data(
        self,
        duid: str,
        timestamp: datetime,
        scada_value_mw: float,
        **additional_fields
    ):
        """
        Write a single SCADA data point.
        
        Args:
            duid: Dispatchable Unit Identifier
            timestamp: Timestamp of the reading
            scada_value_mw: Generation in MW
            **additional_fields: Any additional fields to store
        """
        point = Point("scada") \
            .tag("duid", duid) \
            .field("value_mw", scada_value_mw) \
            .time(timestamp, WritePrecision.S)
        
        # Add any additional fields
        for key, value in additional_fields.items():
            point = point.field(key, value)
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=point)
    
    def write_scada_batch(self, records: List[Dict]):
        """
        Write multiple SCADA records in batch.
        
        Args:
            records: List of dictionaries with keys: duid, timestamp, scada_value_mw
        """
        points = []
        for record in records:
            point = Point("scada") \
                .tag("duid", record['duid']) \
                .field("value_mw", record['scada_value_mw']) \
                .time(record['timestamp'], WritePrecision.S)
            points.append(point)
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=points)
    
    def query_scada_data(
        self,
        duid: str,
        start_time: datetime,
        end_time: datetime
    ) -> pd.DataFrame:
        """
        Query SCADA data for a specific DUID and time range.
        
        Args:
            duid: Dispatchable Unit Identifier
            start_time: Start of time range
            end_time: End of time range
            
        Returns:
            DataFrame with columns: timestamp, value_mw
        """
        query = f'''
        from(bucket: "{self.bucket}")
          |> range(start: {start_time.isoformat()}Z, stop: {end_time.isoformat()}Z)
          |> filter(fn: (r) => r["_measurement"] == "scada")
          |> filter(fn: (r) => r["duid"] == "{duid}")
          |> filter(fn: (r) => r["_field"] == "value_mw")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        '''
        
        result = self.query_api.query_data_frame(query, org=self.org)
        
        if result.empty:
            return pd.DataFrame(columns=['timestamp', 'value_mw'])
        
        # Rename columns for consistency
        result = result.rename(columns={'_time': 'timestamp'})
        return result[['timestamp', 'value_mw']]
    
    # ========================================================================
    # Dispatch Data Methods
    # ========================================================================
    
    def write_dispatch_data(
        self,
        duid: str,
        timestamp: datetime,
        dispatch_target_mw: float,
        availability_mw: float,
        **additional_fields
    ):
        """
        Write dispatch data (targets and availability).
        
        Args:
            duid: Dispatchable Unit Identifier
            timestamp: Timestamp
            dispatch_target_mw: Dispatch target in MW
            availability_mw: Available capacity in MW
            **additional_fields: Additional fields
        """
        point = Point("dispatch") \
            .tag("duid", duid) \
            .field("target_mw", dispatch_target_mw) \
            .field("availability_mw", availability_mw) \
            .time(timestamp, WritePrecision.S)
        
        for key, value in additional_fields.items():
            point = point.field(key, value)
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=point)
    
    def write_dispatch_batch(self, records: List[Dict]):
        """Write multiple dispatch records in batch."""
        points = []
        for record in records:
            point = Point("dispatch") \
                .tag("duid", record['duid']) \
                .field("target_mw", record.get('dispatch_target_mw', 0)) \
                .field("availability_mw", record.get('availability_mw', 0)) \
                .time(record['timestamp'], WritePrecision.S)
            points.append(point)
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=points)
    
    def query_dispatch_data(
        self,
        duid: str,
        start_time: datetime,
        end_time: datetime
    ) -> pd.DataFrame:
        """Query dispatch data for a specific DUID and time range."""
        query = f'''
        from(bucket: "{self.bucket}")
          |> range(start: {start_time.isoformat()}Z, stop: {end_time.isoformat()}Z)
          |> filter(fn: (r) => r["_measurement"] == "dispatch")
          |> filter(fn: (r) => r["duid"] == "{duid}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        '''
        
        result = self.query_api.query_data_frame(query, org=self.org)
        
        if result.empty:
            return pd.DataFrame(columns=['timestamp', 'target_mw', 'availability_mw'])
        
        result = result.rename(columns={'_time': 'timestamp'})
        return result[['timestamp', 'target_mw', 'availability_mw']]
    
    # ========================================================================
    # Weather Data Methods
    # ========================================================================
    
    def write_weather_data(
        self,
        duid: str,
        timestamp: datetime,
        poa_irradiance: float,
        ghi: float,
        ambient_temp: float,
        **additional_fields
    ):
        """
        Write weather data (from Solcast or BoM).
        
        Args:
            duid: Associated DUID
            timestamp: Timestamp
            poa_irradiance: Plane-of-array irradiance (W/m²)
            ghi: Global horizontal irradiance (W/m²)
            ambient_temp: Ambient temperature (°C)
            **additional_fields: Additional fields
        """
        point = Point("weather") \
            .tag("duid", duid) \
            .field("poa_irradiance", poa_irradiance) \
            .field("ghi", ghi) \
            .field("ambient_temp", ambient_temp) \
            .time(timestamp, WritePrecision.S)
        
        for key, value in additional_fields.items():
            point = point.field(key, value)
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=point)
    
    def write_weather_batch(self, records: List[Dict]):
        """Write multiple weather records in batch."""
        points = []
        for record in records:
            point = Point("weather") \
                .tag("duid", record['duid']) \
                .field("poa_irradiance", record.get('poa_irradiance', 0)) \
                .field("ghi", record.get('ghi', 0)) \
                .field("ambient_temp", record.get('ambient_temp', 0)) \
                .time(record['timestamp'], WritePrecision.S)
            points.append(point)
        
        self.write_api.write(bucket=self.bucket, org=self.org, record=points)
    
    def query_weather_data(
        self,
        duid: str,
        start_time: datetime,
        end_time: datetime
    ) -> pd.DataFrame:
        """Query weather data for a specific DUID and time range."""
        query = f'''
        from(bucket: "{self.bucket}")
          |> range(start: {start_time.isoformat()}Z, stop: {end_time.isoformat()}Z)
          |> filter(fn: (r) => r["_measurement"] == "weather")
          |> filter(fn: (r) => r["duid"] == "{duid}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
        '''
        
        result = self.query_api.query_data_frame(query, org=self.org)
        
        if result.empty:
            return pd.DataFrame(columns=['timestamp', 'poa_irradiance', 'ghi', 'ambient_temp'])
        
        result = result.rename(columns={'_time': 'timestamp'})
        return result[['timestamp', 'poa_irradiance', 'ghi', 'ambient_temp']]
    
    # ========================================================================
    # Curtailment Analysis Methods
    # ========================================================================
    
    def calculate_curtailment(
        self,
        duid: str,
        start_time: datetime,
        end_time: datetime
    ) -> pd.DataFrame:
        """
        Calculate curtailment by comparing SCADA to dispatch targets.
        
        Args:
            duid: Dispatchable Unit Identifier
            start_time: Start of analysis period
            end_time: End of analysis period
            
        Returns:
            DataFrame with curtailment analysis
        """
        # Get SCADA and dispatch data
        scada = self.query_scada_data(duid, start_time, end_time)
        dispatch = self.query_dispatch_data(duid, start_time, end_time)
        
        if scada.empty or dispatch.empty:
            return pd.DataFrame()
        
        # Merge on timestamp
        merged = pd.merge(scada, dispatch, on='timestamp', how='inner')
        
        # Calculate curtailment
        merged['curtailment_mw'] = merged['target_mw'] - merged['value_mw']
        merged['curtailment_mw'] = merged['curtailment_mw'].clip(lower=0)  # Only positive curtailment
        
        # Calculate curtailment percentage
        merged['curtailment_pct'] = (merged['curtailment_mw'] / merged['availability_mw'] * 100).fillna(0)
        
        return merged


# Singleton instance
_ts_db_instance = None


def get_timeseries_db() -> TimeSeriesDB:
    """Get or create the time-series database singleton instance."""
    global _ts_db_instance
    if _ts_db_instance is None:
        _ts_db_instance = TimeSeriesDB()
    return _ts_db_instance
