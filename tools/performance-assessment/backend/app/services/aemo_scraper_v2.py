"""
AEMO Data Scraper with Database Integration

Complete AEMO scraper with storage to time-series database and error handling.

Author: Manus AI
Date: January 12, 2026
"""

import requests
from bs4 import BeautifulSoup
import zipfile
import io
import csv
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

from ..database.timeseries import get_timeseries_db
from ..database.connection import get_db
from ..database import crud

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class AEMOScraper:
    """
    Scrapes AEMO data from NEMWEB and stores it in the database.
    """
    
    BASE_URL = "https://www.nemweb.com.au"
    SCADA_PATH = "/REPORTS/CURRENT/Dispatch_SCADA/"
    DISPATCH_PATH = "/REPORTS/CURRENT/Daily_Reports/"
    
    def __init__(self):
        """Initialize the scraper."""
        self.ts_db = get_timeseries_db()
    
    def get_latest_scada_file_url(self) -> Optional[str]:
        """
        Get the URL of the most recent SCADA file.
        
        Returns:
            URL of the latest file, or None if not found
        """
        try:
            response = requests.get(self.BASE_URL + self.SCADA_PATH, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a', href=True)
            
            # Filter for ZIP files
            zip_files = [
                link['href'] for link in links 
                if link['href'].endswith('.zip') and 'PUBLIC_DISPATCHSCADA' in link['href']
            ]
            
            if not zip_files:
                logger.warning("No SCADA files found")
                return None
            
            # Get the most recent file (they're sorted by name/timestamp)
            latest_file = sorted(zip_files)[-1]
            return self.BASE_URL + self.SCADA_PATH + latest_file
            
        except Exception as e:
            logger.error(f"Error getting latest SCADA file: {e}")
            return None
    
    def download_and_parse_scada(self, file_url: str) -> List[Dict]:
        """
        Download and parse a SCADA ZIP file.
        
        Args:
            file_url: URL of the ZIP file
            
        Returns:
            List of SCADA records
        """
        try:
            logger.info(f"Downloading SCADA file: {file_url}")
            response = requests.get(file_url, timeout=60)
            response.raise_for_status()
            
            # Extract ZIP file
            with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                # Get the CSV file (should be only one)
                csv_files = [f for f in z.namelist() if f.endswith('.CSV')]
                if not csv_files:
                    logger.error("No CSV file found in ZIP")
                    return []
                
                with z.open(csv_files[0]) as csv_file:
                    # Parse CSV
                    content = csv_file.read().decode('utf-8')
                    reader = csv.DictReader(io.StringIO(content))
                    
                    records = []
                    for row in reader:
                        # Skip header rows
                        if row.get('SETTLEMENTDATE') == 'SETTLEMENTDATE':
                            continue
                        
                        try:
                            records.append({
                                'timestamp': datetime.strptime(
                                    row['SETTLEMENTDATE'], 
                                    '%Y/%m/%d %H:%M:%S'
                                ),
                                'duid': row['DUID'],
                                'scada_value_mw': float(row['SCADAVALUE'])
                            })
                        except (ValueError, KeyError) as e:
                            logger.warning(f"Error parsing row: {e}")
                            continue
                    
                    logger.info(f"Parsed {len(records)} SCADA records")
                    return records
                    
        except Exception as e:
            logger.error(f"Error downloading/parsing SCADA file: {e}")
            return []
    
    def scrape_and_store_scada(
        self,
        solar_farm_duids: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Scrape the latest SCADA data and store it in the database.
        
        Args:
            solar_farm_duids: Optional list of DUIDs to filter for (solar farms only)
            
        Returns:
            Dictionary with statistics
        """
        stats = {
            'total_records': 0,
            'solar_records': 0,
            'stored_records': 0,
            'errors': 0
        }
        
        try:
            # Get latest file URL
            file_url = self.get_latest_scada_file_url()
            if not file_url:
                logger.error("Could not get latest SCADA file URL")
                return stats
            
            # Download and parse
            records = self.download_and_parse_scada(file_url)
            stats['total_records'] = len(records)
            
            if not records:
                return stats
            
            # Filter for solar farms if list provided
            if solar_farm_duids:
                records = [r for r in records if r['duid'] in solar_farm_duids]
                stats['solar_records'] = len(records)
            
            # Store in time-series database
            try:
                self.ts_db.write_scada_batch(records)
                stats['stored_records'] = len(records)
                logger.info(f"Stored {len(records)} SCADA records")
            except Exception as e:
                logger.error(f"Error storing SCADA data: {e}")
                stats['errors'] += 1
            
            # Update sync status in PostgreSQL
            db = next(get_db())
            try:
                for duid in set(r['duid'] for r in records):
                    crud.create_or_update_sync_status(
                        db=db,
                        duid=duid,
                        data_type='SCADA',
                        status='SUCCESS',
                        message=f"Synced {len([r for r in records if r['duid'] == duid])} records",
                        records_synced=len([r for r in records if r['duid'] == duid])
                    )
            except Exception as e:
                logger.error(f"Error updating sync status: {e}")
            finally:
                db.close()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error in scrape_and_store_scada: {e}")
            stats['errors'] += 1
            return stats
    
    def get_daily_dispatch_file_url(self, date: datetime) -> Optional[str]:
        """
        Get the URL for a specific day's dispatch file.
        
        Args:
            date: Date to get dispatch file for
            
        Returns:
            URL of the file, or None if not found
        """
        try:
            response = requests.get(self.BASE_URL + self.DISPATCH_PATH, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a', href=True)
            
            # Format: PUBLIC_DAILY_YYYYMMDD_*.zip
            date_str = date.strftime('%Y%m%d')
            target_pattern = f'PUBLIC_DAILY_{date_str}'
            
            for link in links:
                if target_pattern in link['href'] and link['href'].endswith('.zip'):
                    return self.BASE_URL + self.DISPATCH_PATH + link['href']
            
            logger.warning(f"No dispatch file found for {date_str}")
            return None
            
        except Exception as e:
            logger.error(f"Error getting dispatch file URL: {e}")
            return None
    
    def download_and_parse_dispatch(self, file_url: str) -> List[Dict]:
        """
        Download and parse a daily dispatch ZIP file.
        
        Args:
            file_url: URL of the ZIP file
            
        Returns:
            List of dispatch records
        """
        try:
            logger.info(f"Downloading dispatch file: {file_url}")
            response = requests.get(file_url, timeout=120)  # Larger files
            response.raise_for_status()
            
            with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                csv_files = [f for f in z.namelist() if f.endswith('.CSV')]
                if not csv_files:
                    logger.error("No CSV file found in ZIP")
                    return []
                
                with z.open(csv_files[0]) as csv_file:
                    content = csv_file.read().decode('utf-8')
                    lines = content.split('\n')
                    
                    records = []
                    for line in lines:
                        # Look for DUNIT table rows
                        if not line.startswith('D,DUNIT'):
                            continue
                        
                        parts = line.split(',')
                        if len(parts) < 10:
                            continue
                        
                        try:
                            records.append({
                                'timestamp': datetime.strptime(parts[4], '%Y/%m/%d %H:%M:%S'),
                                'duid': parts[1],
                                'dispatch_target_mw': float(parts[6]) if parts[6] else 0,
                                'availability_mw': float(parts[7]) if parts[7] else 0
                            })
                        except (ValueError, IndexError) as e:
                            continue
                    
                    logger.info(f"Parsed {len(records)} dispatch records")
                    return records
                    
        except Exception as e:
            logger.error(f"Error downloading/parsing dispatch file: {e}")
            return []
    
    def scrape_and_store_dispatch(
        self,
        date: datetime,
        solar_farm_duids: Optional[List[str]] = None
    ) -> Dict[str, int]:
        """
        Scrape dispatch data for a specific date and store it.
        
        Args:
            date: Date to scrape
            solar_farm_duids: Optional list of DUIDs to filter for
            
        Returns:
            Dictionary with statistics
        """
        stats = {
            'total_records': 0,
            'solar_records': 0,
            'stored_records': 0,
            'errors': 0
        }
        
        try:
            file_url = self.get_daily_dispatch_file_url(date)
            if not file_url:
                return stats
            
            records = self.download_and_parse_dispatch(file_url)
            stats['total_records'] = len(records)
            
            if solar_farm_duids:
                records = [r for r in records if r['duid'] in solar_farm_duids]
                stats['solar_records'] = len(records)
            
            # Store in time-series database
            try:
                self.ts_db.write_dispatch_batch(records)
                stats['stored_records'] = len(records)
                logger.info(f"Stored {len(records)} dispatch records")
            except Exception as e:
                logger.error(f"Error storing dispatch data: {e}")
                stats['errors'] += 1
            
            # Update sync status
            db = next(get_db())
            try:
                for duid in set(r['duid'] for r in records):
                    crud.create_or_update_sync_status(
                        db=db,
                        duid=duid,
                        data_type='DISPATCH',
                        status='SUCCESS',
                        message=f"Synced dispatch data for {date.strftime('%Y-%m-%d')}",
                        records_synced=len([r for r in records if r['duid'] == duid])
                    )
            except Exception as e:
                logger.error(f"Error updating sync status: {e}")
            finally:
                db.close()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error in scrape_and_store_dispatch: {e}")
            stats['errors'] += 1
            return stats


# Example usage
if __name__ == "__main__":
    scraper = AEMOScraper()
    
    # Example solar farm DUIDs
    solar_duids = ['ROYALLA1', 'GRIFSF1', 'CULCAIRN']
    
    # Scrape latest SCADA
    print("Scraping SCADA data...")
    stats = scraper.scrape_and_store_scada(solar_farm_duids=solar_duids)
    print(f"SCADA Stats: {stats}")
    
    # Scrape yesterday's dispatch
    print("\nScraping dispatch data...")
    yesterday = datetime.now() - timedelta(days=1)
    stats = scraper.scrape_and_store_dispatch(date=yesterday, solar_farm_duids=solar_duids)
    print(f"Dispatch Stats: {stats}")
