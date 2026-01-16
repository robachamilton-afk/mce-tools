"""
Celery Beat Schedule Configuration

Defines periodic tasks for the Performance Assessment Tool.
"""
from celery.schedules import crontab

# Celery Beat schedule for periodic tasks
CELERYBEAT_SCHEDULE = {
    # Scrape SCADA data every 5 minutes
    "scrape-latest-scada": {
        "task": "performance_assessment.scrape_latest_scada",
        "schedule": 300.0,  # 5 minutes in seconds
        "options": {
            "expires": 240,  # Task expires after 4 minutes
        }
    },
    
    # Identify underperforming assets daily at 2 AM
    "identify-underperforming-assets": {
        "task": "performance_assessment.identify_underperforming_assets",
        "schedule": crontab(hour=2, minute=0),
        "options": {
            "expires": 3600,  # Task expires after 1 hour
        }
    },
}
