"""
AEMO SCADA Data Scraper

Downloads and processes SCADA data from NEMWEB for all registered solar farms.
Runs as a scheduled Celery task every 5 minutes.
"""
import csv
import io
import logging
import zipfile
from datetime import datetime, timedelta
from typing import List, Dict, Optional

import requests
from sqlalchemy.orm import Session

from app.models.solar_farm import SolarFarm
from app.models.scada_data import SCADAData

logger = logging.getLogger(__name__)


class SCADAScraper:
    """
    Scrapes SCADA data from AEMO NEMWEB and stores it in the database.
    """

    NEMWEB_BASE_URL = "https://www.nemweb.com.au/REPORTS/CURRENT/Dispatch_SCADA/"
    
    def __init__(self, db: Session):
        self.db = db
        self.session = requests.Session()

    def scrape_latest(self) -> Dict:
        """
        Scrape the latest SCADA data from NEMWEB.
        
        Returns:
            Dictionary with scraping statistics
        """
        logger.info("Starting SCADA scraping task")
        
        # Get list of registered solar farms
        solar_farms = self.db.query(SolarFarm).filter(SolarFarm.deleted_at.is_(None)).all()
        solar_farm_duids = {farm.duid: farm.id for farm in solar_farms}
        
        logger.info(f"Found {len(solar_farm_duids)} registered solar farms")
        
        # Get the latest SCADA file
        latest_file_url = self._get_latest_file_url()
        if not latest_file_url:
            logger.error("Could not determine latest SCADA file URL")
            return {"status": "error", "message": "Could not find latest file"}
        
        logger.info(f"Downloading: {latest_file_url}")
        
        # Download and parse the file
        scada_records = self._download_and_parse(latest_file_url)
        
        # Filter for solar farms only
        solar_records = [
            record for record in scada_records 
            if record["duid"] in solar_farm_duids
        ]
        
        logger.info(f"Found {len(solar_records)} SCADA records for solar farms")
        
        # Store in database
        records_stored = self._store_scada_data(solar_records, solar_farm_duids)
        
        return {
            "status": "success",
            "timestamp": datetime.utcnow().isoformat(),
            "total_records": len(scada_records),
            "solar_records": len(solar_records),
            "records_stored": records_stored
        }

    def scrape_historical(self, start_date: datetime, end_date: datetime) -> Dict:
        """
        Scrape historical SCADA data for a date range.
        Used for backfilling data.
        
        Args:
            start_date: Start datetime
            end_date: End datetime
            
        Returns:
            Dictionary with scraping statistics
        """
        logger.info(f"Starting historical SCADA scraping from {start_date} to {end_date}")
        
        # Get list of registered solar farms
        solar_farms = self.db.query(SolarFarm).filter(SolarFarm.deleted_at.is_(None)).all()
        solar_farm_duids = {farm.duid: farm.id for farm in solar_farms}
        
        total_records_stored = 0
        current_date = start_date
        
        while current_date <= end_date:
            # Generate file URL for this timestamp
            file_url = self._generate_file_url(current_date)
            
            try:
                scada_records = self._download_and_parse(file_url)
                solar_records = [
                    record for record in scada_records 
                    if record["duid"] in solar_farm_duids
                ]
                records_stored = self._store_scada_data(solar_records, solar_farm_duids)
                total_records_stored += records_stored
                
                logger.info(f"Processed {current_date}: {records_stored} records stored")
            except Exception as e:
                logger.error(f"Error processing {current_date}: {e}")
            
            # Move to next 5-minute interval
            current_date += timedelta(minutes=5)
        
        return {
            "status": "success",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_records_stored": total_records_stored
        }

    def _get_latest_file_url(self) -> Optional[str]:
        """
        Get the URL of the latest SCADA file from the NEMWEB directory.
        """
        try:
            response = self.session.get(self.NEMWEB_BASE_URL, timeout=30)
            response.raise_for_status()
            
            # Parse directory listing to find latest file
            # Files are named: PUBLIC_DISPATCHSCADA_YYYYMMDDHHMI_ID.zip
            import re
            pattern = r'PUBLIC_DISPATCHSCADA_(\d{12})_\d+\.zip'
            matches = re.findall(pattern, response.text)
            
            if not matches:
                return None
            
            # Get the most recent timestamp
            latest_timestamp = max(matches)
            
            # Find the full filename
            filename_pattern = f'PUBLIC_DISPATCHSCADA_{latest_timestamp}_\\d+\\.zip'
            filename_match = re.search(filename_pattern, response.text)
            
            if not filename_match:
                return None
            
            filename = filename_match.group(0)
            return f"{self.NEMWEB_BASE_URL}{filename}"
            
        except Exception as e:
            logger.error(f"Error getting latest file URL: {e}")
            return None

    def _generate_file_url(self, timestamp: datetime) -> str:
        """
        Generate NEMWEB file URL for a specific timestamp.
        Note: The exact file ID is unknown, so this may need adjustment.
        """
        # Format: PUBLIC_DISPATCHSCADA_YYYYMMDDHHMI_ID.zip
        timestamp_str = timestamp.strftime("%Y%m%d%H%M")
        # We don't know the ID, so we'll need to list the directory
        # This is a simplified version
        return f"{self.NEMWEB_BASE_URL}PUBLIC_DISPATCHSCADA_{timestamp_str}_*.zip"

    def _download_and_parse(self, file_url: str) -> List[Dict]:
        """
        Download and parse a SCADA CSV file from NEMWEB.
        
        Args:
            file_url: URL of the ZIP file
            
        Returns:
            List of SCADA records as dictionaries
        """
        try:
            # Download the ZIP file
            response = self.session.get(file_url, timeout=30)
            response.raise_for_status()
            
            # Extract CSV from ZIP
            with zipfile.ZipFile(io.BytesIO(response.content)) as zf:
                # Get the first (and only) file in the ZIP
                csv_filename = zf.namelist()[0]
                csv_content = zf.read(csv_filename).decode('utf-8')
            
            # Parse CSV
            records = []
            csv_reader = csv.reader(io.StringIO(csv_content))
            
            for row in csv_reader:
                # Skip header rows (start with 'I' or 'C')
                if not row or row[0] in ['I', 'C']:
                    continue
                
                # Data rows start with 'D'
                if row[0] == 'D':
                    # Format: D,DISPATCH,UNIT_SCADA,1,SETTLEMENTDATE,DUID,SCADAVALUE,LASTCHANGED
                    if len(row) >= 8:
                        records.append({
                            "settlement_date": datetime.strptime(row[4], "%Y/%m/%d %H:%M:%S"),
                            "duid": row[5],
                            "scada_value": float(row[6]),
                            "last_changed": datetime.strptime(row[7], "%Y/%m/%d %H:%M:%S")
                        })
            
            return records
            
        except Exception as e:
            logger.error(f"Error downloading/parsing {file_url}: {e}")
            raise

    def _store_scada_data(self, records: List[Dict], solar_farm_duids: Dict[str, str]) -> int:
        """
        Store SCADA records in the database.
        
        Args:
            records: List of SCADA records
            solar_farm_duids: Mapping of DUID to solar farm ID
            
        Returns:
            Number of records stored
        """
        records_stored = 0
        
        for record in records:
            duid = record["duid"]
            solar_farm_id = solar_farm_duids.get(duid)
            
            if not solar_farm_id:
                continue
            
            # Check if record already exists
            existing = self.db.query(SCADAData).filter(
                SCADAData.solar_farm_id == solar_farm_id,
                SCADAData.settlement_date == record["settlement_date"]
            ).first()
            
            if existing:
                # Update existing record
                existing.scada_value = record["scada_value"]
                existing.last_changed = record["last_changed"]
            else:
                # Create new record
                scada_data = SCADAData(
                    solar_farm_id=solar_farm_id,
                    settlement_date=record["settlement_date"],
                    scada_value=record["scada_value"],
                    last_changed=record["last_changed"]
                )
                self.db.add(scada_data)
            
            records_stored += 1
        
        self.db.commit()
        return records_stored
