"""
Celery Tasks for Performance Assessments

Background tasks for calculating performance metrics.

Author: Manus AI
Date: January 12, 2026
"""

from celery import Task, group
from datetime import datetime, timedelta
import logging
import sys
import os

# Add paths for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '../../../'))

from ..celery_app import celery_app
from ..database.connection import get_db
from ..database import crud
from ..database.timeseries import get_timeseries_db
from iec61724_model.iec61724_calculator import IEC61724Calculator

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database session management."""
    _db = None
    
    @property
    def db(self):
        if self._db is None:
            self._db = next(get_db())
        return self._db
    
    def after_return(self, *args, **kwargs):
        if self._db is not None:
            self._db.close()


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.assessment_tasks.calculate_daily_assessments_task')
def calculate_daily_assessments_task(self, date_str: str = None):
    """
    Calculate daily performance assessments for all solar farms.
    
    Args:
        date_str: Date string in YYYY-MM-DD format (defaults to yesterday)
    """
    logger.info(f"Starting daily assessment calculation for {date_str or 'yesterday'}")
    
    try:
        # Parse date or use yesterday
        if date_str:
            target_date = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            target_date = datetime.now() - timedelta(days=1)
        
        # Get all solar farms
        solar_farms = crud.list_solar_farms(self.db, limit=1000)
        
        if not solar_farms:
            logger.warning("No solar farms found")
            return {"status": "NO_FARMS"}
        
        # Create parallel tasks for each farm
        tasks = []
        for farm in solar_farms:
            task = assess_single_farm_daily.s(
                farm.id,
                target_date.strftime('%Y-%m-%d')
            )
            tasks.append(task)
        
        # Execute in parallel
        job = group(tasks)
        result = job.apply_async()
        
        logger.info(f"Daily assessment tasks queued for {len(tasks)} farms")
        return {
            "status": "SUCCESS",
            "farms_queued": len(tasks),
            "date": target_date.strftime('%Y-%m-%d'),
            "group_id": result.id
        }
        
    except Exception as e:
        logger.error(f"Error in daily assessment task: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "error": str(e)
        }


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.assessment_tasks.assess_single_farm_daily')
def assess_single_farm_daily(self, farm_id: int, date_str: str):
    """
    Calculate daily performance assessment for a single solar farm.
    
    Args:
        farm_id: Solar farm ID
        date_str: Date string in YYYY-MM-DD format
    """
    try:
        # Get farm details
        farm = crud.get_solar_farm_by_id(self.db, farm_id)
        if not farm:
            return {"status": "ERROR", "error": "Farm not found"}
        
        # Parse date
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
        start_time = target_date.replace(hour=0, minute=0, second=0)
        end_time = start_time + timedelta(days=1)
        
        # Get time-series data
        ts_db = get_timeseries_db()
        scada_data = ts_db.query_scada_data(farm.duid, start_time, end_time)
        weather_data = ts_db.query_weather_data(farm.duid, start_time, end_time)
        
        if scada_data.empty or weather_data.empty:
            logger.warning(f"No data available for {farm.duid} on {date_str}")
            return {
                "status": "NO_DATA",
                "farm_id": farm_id,
                "duid": farm.duid,
                "date": date_str
            }
        
        # Merge data
        merged = scada_data.merge(weather_data, on='timestamp', how='inner')
        
        # Prepare data for calculator
        merged['ac_energy_kwh'] = merged['value_mw'] * 1000  # Convert MW to kWh
        merged = merged.rename(columns={'poa_irradiance': 'poa_irradiance'})
        merged = merged.set_index('timestamp')
        
        # Get module specs
        module_spec = farm.module_specs
        temp_coeff = module_spec.temp_coeff_power if module_spec else -0.4
        
        # Calculate performance
        calculator = IEC61724Calculator()
        report = calculator.generate_performance_report(
            df=merged,
            array_capacity_kw=farm.dc_capacity_kw or farm.registered_capacity_kw * 1.2,
            temp_coeff_power=temp_coeff,
            interval_hours=1.0
        )
        
        # Store results
        metrics = {
            'performance_ratio': report['average_pr'],
            'temp_corrected_pr': report['average_pr_corrected'],
            'final_yield': report['total_final_yield_hours'],
            'reference_yield': report['total_reference_yield_hours'],
            'capacity_factor': report['average_capacity_factor'],
            'data_completeness': report['data_completeness'],
            'confidence': 'HIGH' if report['data_completeness'] > 0.95 else 'MEDIUM'
        }
        
        crud.create_assessment_result(
            db=self.db,
            solar_farm_id=farm_id,
            timestamp=target_date,
            period='DAILY',
            metrics=metrics
        )
        
        logger.info(f"Daily assessment completed for {farm.duid}: PR={metrics['performance_ratio']*100:.1f}%")
        return {
            "status": "SUCCESS",
            "farm_id": farm_id,
            "duid": farm.duid,
            "date": date_str,
            "pr": metrics['performance_ratio']
        }
        
    except Exception as e:
        logger.error(f"Error assessing farm {farm_id}: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "farm_id": farm_id,
            "error": str(e)
        }


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.assessment_tasks.calculate_monthly_assessments_task')
def calculate_monthly_assessments_task(self, year: int = None, month: int = None):
    """
    Calculate monthly performance assessments for all solar farms.
    
    Args:
        year: Year (defaults to last month)
        month: Month (defaults to last month)
    """
    logger.info(f"Starting monthly assessment calculation")
    
    try:
        # Default to last month
        if year is None or month is None:
            last_month = datetime.now().replace(day=1) - timedelta(days=1)
            year = last_month.year
            month = last_month.month
        
        # Get all solar farms
        solar_farms = crud.list_solar_farms(self.db, limit=1000)
        
        if not solar_farms:
            return {"status": "NO_FARMS"}
        
        # Create parallel tasks
        tasks = []
        for farm in solar_farms:
            task = assess_single_farm_monthly.s(farm.id, year, month)
            tasks.append(task)
        
        # Execute in parallel
        job = group(tasks)
        result = job.apply_async()
        
        logger.info(f"Monthly assessment tasks queued for {len(tasks)} farms")
        return {
            "status": "SUCCESS",
            "farms_queued": len(tasks),
            "year": year,
            "month": month,
            "group_id": result.id
        }
        
    except Exception as e:
        logger.error(f"Error in monthly assessment task: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "error": str(e)
        }


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.assessment_tasks.assess_single_farm_monthly')
def assess_single_farm_monthly(self, farm_id: int, year: int, month: int):
    """
    Calculate monthly performance assessment for a single solar farm.
    
    Args:
        farm_id: Solar farm ID
        year: Year
        month: Month
    """
    try:
        # Get farm details
        farm = crud.get_solar_farm_by_id(self.db, farm_id)
        if not farm:
            return {"status": "ERROR", "error": "Farm not found"}
        
        # Calculate date range
        start_time = datetime(year, month, 1)
        if month == 12:
            end_time = datetime(year + 1, 1, 1)
        else:
            end_time = datetime(year, month + 1, 1)
        
        # Get daily assessments for the month
        daily_assessments = crud.get_assessment_results(
            db=self.db,
            solar_farm_id=farm_id,
            start_date=start_time,
            end_date=end_time,
            period='DAILY'
        )
        
        if not daily_assessments:
            logger.warning(f"No daily assessments for {farm.duid} in {year}-{month:02d}")
            return {
                "status": "NO_DATA",
                "farm_id": farm_id,
                "duid": farm.duid
            }
        
        # Aggregate monthly metrics
        avg_pr = sum(a.performance_ratio for a in daily_assessments) / len(daily_assessments)
        avg_pr_corrected = sum(a.temp_corrected_pr for a in daily_assessments) / len(daily_assessments)
        total_final_yield = sum(a.final_yield for a in daily_assessments)
        total_ref_yield = sum(a.reference_yield for a in daily_assessments)
        avg_cf = sum(a.capacity_factor for a in daily_assessments) / len(daily_assessments)
        
        # Store monthly result
        metrics = {
            'performance_ratio': avg_pr,
            'temp_corrected_pr': avg_pr_corrected,
            'final_yield': total_final_yield,
            'reference_yield': total_ref_yield,
            'capacity_factor': avg_cf,
            'data_completeness': len(daily_assessments) / 30.0,  # Approximate
            'confidence': 'HIGH'
        }
        
        crud.create_assessment_result(
            db=self.db,
            solar_farm_id=farm_id,
            timestamp=start_time,
            period='MONTHLY',
            metrics=metrics
        )
        
        logger.info(f"Monthly assessment completed for {farm.duid}: PR={avg_pr*100:.1f}%")
        return {
            "status": "SUCCESS",
            "farm_id": farm_id,
            "duid": farm.duid,
            "year": year,
            "month": month,
            "pr": avg_pr
        }
        
    except Exception as e:
        logger.error(f"Error in monthly assessment for farm {farm_id}: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "farm_id": farm_id,
            "error": str(e)
        }
