"""
Curtailment Analysis Engine

This module calculates curtailment by comparing dispatch targets with actual SCADA output.
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


class CurtailmentEngine:
    """Engine for calculating curtailment and analyzing performance."""

    def calculate_curtailment(
        self,
        scada_data: List[Dict],
        dispatch_data: List[Dict]
    ) -> List[Dict]:
        """
        Calculate curtailment for each interval by comparing dispatch targets with actual output.

        Args:
            scada_data: List of SCADA records with keys: timestamp, duid, scada_value_mw
            dispatch_data: List of dispatch records with keys: timestamp, duid, dispatch_target_mw, availability_mw

        Returns:
            List of curtailment records with calculated metrics
        """
        # Create lookup dictionary for dispatch data
        dispatch_lookup = {}
        for record in dispatch_data:
            key = (record['timestamp'], record['duid'])
            dispatch_lookup[key] = record

        curtailment_records = []

        for scada_record in scada_data:
            timestamp = scada_record['timestamp']
            duid = scada_record['duid']
            actual_mw = float(scada_record.get('scada_value_mw', 0))

            # Find matching dispatch record
            dispatch_record = dispatch_lookup.get((timestamp, duid))

            if not dispatch_record:
                logger.warning(f"No dispatch data found for {duid} at {timestamp}")
                continue

            dispatch_target_mw = float(dispatch_record.get('dispatch_target_mw', 0))
            availability_mw = float(dispatch_record.get('availability_mw', 0))

            # Calculate curtailment
            curtailment_mw = dispatch_target_mw - actual_mw

            # Calculate availability-based metrics
            unconstrained_headroom_mw = availability_mw - dispatch_target_mw
            availability_factor = (dispatch_target_mw / availability_mw) if availability_mw > 0 else 0

            curtailment_record = {
                'timestamp': timestamp,
                'duid': duid,
                'actual_mw': actual_mw,
                'dispatch_target_mw': dispatch_target_mw,
                'availability_mw': availability_mw,
                'curtailment_mw': curtailment_mw,
                'unconstrained_headroom_mw': unconstrained_headroom_mw,
                'availability_factor': availability_factor,
                'is_curtailed': curtailment_mw > 0.1,  # Threshold to account for rounding
            }

            curtailment_records.append(curtailment_record)

        return curtailment_records

    def aggregate_curtailment(
        self,
        curtailment_records: List[Dict],
        period: str = 'daily'
    ) -> Dict:
        """
        Aggregate curtailment data over a time period.

        Args:
            curtailment_records: List of curtailment records
            period: Aggregation period ('daily', 'monthly', 'total')

        Returns:
            Aggregated curtailment statistics
        """
        if not curtailment_records:
            return {}

        total_curtailment_mwh = sum(r['curtailment_mw'] / 12 for r in curtailment_records)  # 5-min to MWh
        total_actual_mwh = sum(r['actual_mw'] / 12 for r in curtailment_records)
        total_dispatch_target_mwh = sum(r['dispatch_target_mw'] / 12 for r in curtailment_records)

        curtailed_intervals = sum(1 for r in curtailment_records if r['is_curtailed'])
        total_intervals = len(curtailment_records)

        return {
            'total_curtailment_mwh': round(total_curtailment_mwh, 2),
            'total_actual_mwh': round(total_actual_mwh, 2),
            'total_dispatch_target_mwh': round(total_dispatch_target_mwh, 2),
            'curtailed_intervals': curtailed_intervals,
            'total_intervals': total_intervals,
            'curtailment_percentage': round((total_curtailment_mwh / total_dispatch_target_mwh * 100), 2) if total_dispatch_target_mwh > 0 else 0,
            'average_curtailment_mw': round(total_curtailment_mwh / (total_intervals / 12), 2) if total_intervals > 0 else 0,
        }

    def identify_underperforming_assets(
        self,
        curtailment_records: List[Dict],
        threshold_mwh: float = 100.0
    ) -> List[Dict]:
        """
        Identify assets with significant curtailment.

        Args:
            curtailment_records: List of curtailment records
            threshold_mwh: Minimum curtailment threshold to flag an asset

        Returns:
            List of underperforming assets with curtailment statistics
        """
        # Group by DUID
        asset_curtailment = {}

        for record in curtailment_records:
            duid = record['duid']
            if duid not in asset_curtailment:
                asset_curtailment[duid] = []
            asset_curtailment[duid].append(record)

        underperforming_assets = []

        for duid, records in asset_curtailment.items():
            stats = self.aggregate_curtailment(records)
            if stats['total_curtailment_mwh'] >= threshold_mwh:
                underperforming_assets.append({
                    'duid': duid,
                    **stats
                })

        # Sort by total curtailment descending
        underperforming_assets.sort(key=lambda x: x['total_curtailment_mwh'], reverse=True)

        return underperforming_assets


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    # Sample data
    scada_data = [
        {'timestamp': '2026-01-10 12:00:00', 'duid': 'ALDGASF1', 'scada_value_mw': 80},
        {'timestamp': '2026-01-10 12:05:00', 'duid': 'ALDGASF1', 'scada_value_mw': 75},
        {'timestamp': '2026-01-10 12:10:00', 'duid': 'ALDGASF1', 'scada_value_mw': 70},
    ]

    dispatch_data = [
        {'timestamp': '2026-01-10 12:00:00', 'duid': 'ALDGASF1', 'dispatch_target_mw': 100, 'availability_mw': 120},
        {'timestamp': '2026-01-10 12:05:00', 'duid': 'ALDGASF1', 'dispatch_target_mw': 100, 'availability_mw': 120},
        {'timestamp': '2026-01-10 12:10:00', 'duid': 'ALDGASF1', 'dispatch_target_mw': 100, 'availability_mw': 120},
    ]

    engine = CurtailmentEngine()

    # Calculate curtailment
    curtailment_records = engine.calculate_curtailment(scada_data, dispatch_data)
    print("Curtailment Records:")
    for record in curtailment_records:
        print(record)

    # Aggregate
    stats = engine.aggregate_curtailment(curtailment_records)
    print("\nAggregated Statistics:")
    print(stats)

    # Identify underperforming assets
    underperforming = engine.identify_underperforming_assets(curtailment_records, threshold_mwh=1.0)
    print("\nUnderperforming Assets:")
    for asset in underperforming:
        print(asset)
