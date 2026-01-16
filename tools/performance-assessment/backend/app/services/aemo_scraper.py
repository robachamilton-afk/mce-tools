"""
AEMO Data Scraper Service

This module provides functions to scrape SCADA and dispatch data from AEMO's NEMWEB portal.
"""

import requests
import zipfile
import io
import csv
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

# NEMWEB base URLs
NEMWEB_BASE = "https://www.nemweb.com.au"
SCADA_PATH = "/REPORTS/CURRENT/Dispatch_SCADA/"
DAILY_DISPATCH_PATH = "/REPORTS/CURRENT/Daily_Reports/"
DISPATCH_REPORTS_PATH = "/REPORTS/CURRENT/Dispatch_Reports/"


class AEMOScraper:
    """Scraper for AEMO NEMWEB data."""

    def __init__(self, timeout: int = 30):
        """
        Initialize the scraper.

        Args:
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.session = requests.Session()

    def _download_and_extract_zip(self, url: str) -> Optional[str]:
        """
        Download a ZIP file and extract its CSV content.

        Args:
            url: The URL of the ZIP file

        Returns:
            The CSV content as a string, or None if failed
        """
        try:
            response = self.session.get(url, timeout=self.timeout)
            response.raise_for_status()

            with zipfile.ZipFile(io.BytesIO(response.content)) as z:
                # Get the first CSV file in the archive
                csv_files = [f for f in z.namelist() if f.endswith('.CSV')]
                if not csv_files:
                    logger.error(f"No CSV file found in {url}")
                    return None

                with z.open(csv_files[0]) as f:
                    return f.read().decode('utf-8')

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download {url}: {e}")
            return None
        except zipfile.BadZipFile as e:
            logger.error(f"Invalid ZIP file from {url}: {e}")
            return None

    def _parse_aemo_csv(self, csv_content: str, table_name: str) -> List[Dict]:
        """
        Parse an AEMO CSV file and extract records for a specific table.

        AEMO CSV format:
        - Lines starting with 'I,' are column definitions
        - Lines starting with 'D,' are data records

        Args:
            csv_content: The CSV content as a string
            table_name: The table name to extract (e.g., 'DISPATCH', 'DUNIT')

        Returns:
            A list of dictionaries, each representing a row
        """
        lines = csv_content.strip().split('\n')
        records = []
        columns = None

        for line in lines:
            parts = line.split(',')
            if len(parts) < 2:
                continue

            record_type = parts[0]
            table = parts[1]

            if record_type == 'I' and table == table_name:
                # Column definition line
                columns = [col.strip('"') for col in parts[4:]]  # Skip first 4 fields

            elif record_type == 'D' and table == table_name and columns:
                # Data line
                values = [val.strip('"') for val in parts[4:]]  # Skip first 4 fields
                if len(values) == len(columns):
                    record = dict(zip(columns, values))
                    records.append(record)

        return records

    def scrape_latest_scada(self) -> List[Dict]:
        """
        Scrape the latest SCADA data from NEMWEB.

        Returns:
            A list of SCADA records with keys: SETTLEMENTDATE, DUID, SCADAVALUE
        """
        # Get the directory listing
        try:
            response = self.session.get(f"{NEMWEB_BASE}{SCADA_PATH}", timeout=self.timeout)
            response.raise_for_status()

            # Find the latest SCADA file (they are sorted by time)
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a')
            scada_files = [link.get('href') for link in links if link.get('href') and 'PUBLIC_DISPATCHSCADA_' in link.get('href') and '.zip' in link.get('href')]

            if not scada_files:
                logger.error("No SCADA files found")
                return []

            # Get the latest file
            latest_file = scada_files[-1]
            file_url = f"{NEMWEB_BASE}{latest_file}"

            logger.info(f"Downloading SCADA file: {latest_file}")

            # Download and parse
            csv_content = self._download_and_extract_zip(file_url)
            if not csv_content:
                return []

            records = self._parse_aemo_csv(csv_content, 'DISPATCH')

            logger.info(f"Scraped {len(records)} SCADA records")
            return records

        except Exception as e:
            logger.error(f"Failed to scrape SCADA data: {e}")
            return []

    def scrape_daily_dispatch(self, date: Optional[datetime] = None) -> List[Dict]:
        """
        Scrape the daily aggregated dispatch data for a specific date.

        Args:
            date: The date to scrape (defaults to yesterday)

        Returns:
            A list of DUNIT records with dispatch targets and availability
        """
        if date is None:
            date = datetime.now() - timedelta(days=1)

        date_str = date.strftime('%Y%m%d')
        file_pattern = f"PUBLIC_DAILY_{date_str}0000_"

        try:
            # Get the directory listing
            response = self.session.get(f"{NEMWEB_BASE}{DAILY_DISPATCH_PATH}", timeout=self.timeout)
            response.raise_for_status()

            # Find the file for the specified date
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            links = soup.find_all('a')
            matching_files = [link.get('href') for link in links if link.get('href') and file_pattern in link.get('href') and '.zip' in link.get('href')]

            if not matching_files:
                logger.error(f"No daily dispatch file found for {date_str}")
                return []

            # Get the file
            latest_file = matching_files[-1]
            file_url = f"{NEMWEB_BASE}{latest_file}"

            logger.info(f"Downloading daily dispatch file: {latest_file}")

            # Download and parse
            csv_content = self._download_and_extract_zip(file_url)
            if not csv_content:
                return []

            records = self._parse_aemo_csv(csv_content, 'DUNIT')

            logger.info(f"Scraped {len(records)} DUNIT records for {date_str}")
            return records

        except Exception as e:
            logger.error(f"Failed to scrape daily dispatch data: {e}")
            return []

    def filter_solar_farms(self, records: List[Dict], solar_duids: List[str]) -> List[Dict]:
        """
        Filter records to only include solar farm DUIDs.

        Args:
            records: List of records from AEMO
            solar_duids: List of solar farm DUIDs to keep

        Returns:
            Filtered list of records
        """
        solar_duids_set = set(solar_duids)
        return [r for r in records if r.get('DUID') in solar_duids_set]


def get_solar_farm_duids() -> List[str]:
    """
    Get a list of known solar farm DUIDs.

    In production, this would query the database. For now, return a sample list.

    Returns:
        List of solar farm DUIDs
    """
    # This is a sample list - in production, query from perf_solar_farms table
    return [
        'ALDGASF1',  # Aldoga Solar Farm
        'AVLSF1',    # Avonlie Solar Farm
        'BERYLSF1',  # Beryl Solar Farm
        'BLUEGSF1',  # Bluegrass Solar Farm
        'BNGSF1',    # Bango Solar Farm
        'BOMENSF1',  # Bomen Solar Farm
        'CHILDSF1',  # Childers Solar Farm
        'CLARESF1',  # Clare Solar Farm
        'CLERMSF1',  # Clermont Solar Farm
        'COHUNSF1',  # Cohuna Solar Farm
    ]


if __name__ == "__main__":
    # Example usage
    logging.basicConfig(level=logging.INFO)

    scraper = AEMOScraper()

    # Scrape latest SCADA
    print("Scraping latest SCADA data...")
    scada_records = scraper.scrape_latest_scada()
    solar_duids = get_solar_farm_duids()
    solar_scada = scraper.filter_solar_farms(scada_records, solar_duids)
    print(f"Found {len(solar_scada)} solar farm SCADA records")
    if solar_scada:
        print("Sample:", solar_scada[0])

    # Scrape daily dispatch
    print("\nScraping daily dispatch data...")
    dispatch_records = scraper.scrape_daily_dispatch()
    solar_dispatch = scraper.filter_solar_farms(dispatch_records, solar_duids)
    print(f"Found {len(solar_dispatch)} solar farm dispatch records")
    if solar_dispatch:
        print("Sample:", solar_dispatch[0])
