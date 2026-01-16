"""
Celery Application Configuration

Configures Celery for background task processing and scheduled jobs.

Author: Manus AI
Date: January 12, 2026
"""

from celery import Celery
from celery.schedules import crontab
import os

# Redis URL from environment
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app
celery_app = Celery(
    "performance_assessment",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=['app.tasks.scraping_tasks', 'app.tasks.assessment_tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Australia/Sydney',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Beat schedule for periodic tasks
celery_app.conf.beat_schedule = {
    # Scrape SCADA data every 5 minutes
    'scrape-scada-every-5-minutes': {
        'task': 'app.tasks.scraping_tasks.scrape_scada_task',
        'schedule': crontab(minute='*/5'),
        'options': {'queue': 'scraping'}
    },
    
    # Scrape dispatch data daily at 5 AM (after AEMO publishes)
    'scrape-dispatch-daily': {
        'task': 'app.tasks.scraping_tasks.scrape_dispatch_task',
        'schedule': crontab(hour=5, minute=0),
        'options': {'queue': 'scraping'}
    },
    
    # Calculate daily performance assessments at 6 AM
    'calculate-daily-assessments': {
        'task': 'app.tasks.assessment_tasks.calculate_daily_assessments_task',
        'schedule': crontab(hour=6, minute=0),
        'options': {'queue': 'assessment'}
    },
    
    # Calculate monthly performance assessments on the 1st of each month
    'calculate-monthly-assessments': {
        'task': 'app.tasks.assessment_tasks.calculate_monthly_assessments_task',
        'schedule': crontab(day_of_month=1, hour=7, minute=0),
        'options': {'queue': 'assessment'}
    },
}

# Queue configuration
celery_app.conf.task_routes = {
    'app.tasks.scraping_tasks.*': {'queue': 'scraping'},
    'app.tasks.assessment_tasks.*': {'queue': 'assessment'},
}

if __name__ == '__main__':
    celery_app.start()
