"""
Celery Tasks for Data Scraping

Background tasks for scraping AEMO data.

Author: Manus AI
Date: January 12, 2026
"""

from celery import Task
from datetime import datetime, timedelta
import logging

from ..celery_app import celery_app
from ..services.aemo_scraper_v2 import AEMOScraper
from ..database.connection import get_db
from ..database import crud

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


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.scraping_tasks.scrape_scada_task')
def scrape_scada_task(self):
    """
    Scrape the latest SCADA data from AEMO.
    
    Runs every 5 minutes to capture near-real-time generation data.
    """
    logger.info("Starting SCADA scraping task")
    
    try:
        # Get list of solar farm DUIDs from database
        solar_farms = crud.list_solar_farms(self.db, limit=1000)
        solar_duids = [farm.duid for farm in solar_farms]
        
        if not solar_duids:
            logger.warning("No solar farms found in database")
            return {"status": "NO_FARMS", "message": "No solar farms registered"}
        
        # Scrape and store
        scraper = AEMOScraper()
        stats = scraper.scrape_and_store_scada(solar_farm_duids=solar_duids)
        
        logger.info(f"SCADA scraping completed: {stats}")
        return {
            "status": "SUCCESS",
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in SCADA scraping task: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@celery_app.task(bind=True, base=DatabaseTask, name='app.tasks.scraping_tasks.scrape_dispatch_task')
def scrape_dispatch_task(self, date_str: str = None):
    """
    Scrape dispatch data from AEMO for a specific date.
    
    Args:
        date_str: Date string in YYYY-MM-DD format (defaults to yesterday)
    """
    logger.info(f"Starting dispatch scraping task for {date_str or 'yesterday'}")
    
    try:
        # Parse date or use yesterday
        if date_str:
            target_date = datetime.strptime(date_str, '%Y-%m-%d')
        else:
            target_date = datetime.now() - timedelta(days=1)
        
        # Get list of solar farm DUIDs
        solar_farms = crud.list_solar_farms(self.db, limit=1000)
        solar_duids = [farm.duid for farm in solar_farms]
        
        if not solar_duids:
            logger.warning("No solar farms found in database")
            return {"status": "NO_FARMS", "message": "No solar farms registered"}
        
        # Scrape and store
        scraper = AEMOScraper()
        stats = scraper.scrape_and_store_dispatch(
            date=target_date,
            solar_farm_duids=solar_duids
        )
        
        logger.info(f"Dispatch scraping completed: {stats}")
        return {
            "status": "SUCCESS",
            "date": target_date.strftime('%Y-%m-%d'),
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error in dispatch scraping task: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@celery_app.task(name='app.tasks.scraping_tasks.backfill_dispatch_data')
def backfill_dispatch_data(start_date_str: str, end_date_str: str):
    """
    Backfill dispatch data for a date range.
    
    Args:
        start_date_str: Start date in YYYY-MM-DD format
        end_date_str: End date in YYYY-MM-DD format
    """
    logger.info(f"Starting dispatch backfill from {start_date_str} to {end_date_str}")
    
    try:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
        
        current_date = start_date
        results = []
        
        while current_date <= end_date:
            # Trigger scraping task for this date
            result = scrape_dispatch_task.delay(current_date.strftime('%Y-%m-%d'))
            results.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'task_id': result.id
            })
            current_date += timedelta(days=1)
        
        logger.info(f"Backfill initiated for {len(results)} days")
        return {
            "status": "SUCCESS",
            "days_queued": len(results),
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error in backfill task: {e}", exc_info=True)
        return {
            "status": "ERROR",
            "error": str(e)
        }
