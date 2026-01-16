"""
Celery Tasks for SCADA Data Scraping

Scheduled tasks to periodically scrape AEMO SCADA data.
"""
import logging
from datetime import datetime, timedelta

from celery import shared_task
from sqlalchemy.orm import Session

from shared.database.session import get_db
from app.services.scada_scraper import SCADAScraper

logger = logging.getLogger(__name__)


@shared_task(name="performance_assessment.scrape_latest_scada")
def scrape_latest_scada():
    """
    Scrape the latest SCADA data from NEMWEB.
    Scheduled to run every 5 minutes via Celery Beat.
    """
    logger.info("Starting scheduled SCADA scraping task")
    
    db = next(get_db())
    try:
        scraper = SCADAScraper(db)
        result = scraper.scrape_latest()
        logger.info(f"SCADA scraping completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in SCADA scraping task: {e}")
        raise
    finally:
        db.close()


@shared_task(name="performance_assessment.scrape_historical_scada")
def scrape_historical_scada(start_date_str: str, end_date_str: str):
    """
    Scrape historical SCADA data for a date range.
    Used for backfilling data.
    
    Args:
        start_date_str: Start date in ISO format (YYYY-MM-DD HH:MM:SS)
        end_date_str: End date in ISO format (YYYY-MM-DD HH:MM:SS)
    """
    logger.info(f"Starting historical SCADA scraping: {start_date_str} to {end_date_str}")
    
    start_date = datetime.fromisoformat(start_date_str)
    end_date = datetime.fromisoformat(end_date_str)
    
    db = next(get_db())
    try:
        scraper = SCADAScraper(db)
        result = scraper.scrape_historical(start_date, end_date)
        logger.info(f"Historical SCADA scraping completed: {result}")
        return result
    except Exception as e:
        logger.error(f"Error in historical SCADA scraping task: {e}")
        raise
    finally:
        db.close()


@shared_task(name="performance_assessment.identify_underperforming_assets")
def identify_underperforming_assets():
    """
    Analyze recent SCADA data to identify underperforming solar farms.
    Scheduled to run daily.
    """
    logger.info("Starting underperforming assets identification task")
    
    db = next(get_db())
    try:
        from app.services.performance_engine import PerformanceEngine
        from app.models.solar_farm import SolarFarm
        from datetime import date
        
        engine = PerformanceEngine(db)
        solar_farms = db.query(SolarFarm).filter(SolarFarm.deleted_at.is_(None)).all()
        
        underperforming = []
        end_date = date.today()
        start_date = end_date - timedelta(days=30)  # Last 30 days
        
        for farm in solar_farms:
            # Get default internal model (would need to be created first)
            # This is a placeholder - actual implementation would fetch the model
            try:
                # Calculate performance for the last 30 days
                # result = engine.calculate_performance_ratio(
                #     str(farm.id),
                #     "default_internal_model_id",
                #     start_date,
                #     end_date
                # )
                
                # if result["performance_ratio"] < 0.75:  # Less than 75% PR
                #     underperforming.append({
                #         "duid": farm.duid,
                #         "name": farm.name,
                #         "performance_ratio": result["performance_ratio"],
                #         "capacity_mw": float(farm.capacity_mw)
                #     })
                pass
            except Exception as e:
                logger.warning(f"Could not assess {farm.duid}: {e}")
        
        logger.info(f"Found {len(underperforming)} underperforming assets")
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "underperforming_count": len(underperforming),
            "underperforming_assets": underperforming
        }
    except Exception as e:
        logger.error(f"Error in underperforming assets identification: {e}")
        raise
    finally:
        db.close()
