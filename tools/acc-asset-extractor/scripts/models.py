"""
Data models for ACC datascraping POC - Rewritten from scratch.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class DataCompleteness(Enum):
    FULL = "FULL"
    PARTIAL = "PARTIAL"
    INSUFFICIENT = "INSUFFICIENT"
    BULK_ONLY = "BULK_ONLY"
    INVALID = "INVALID"

@dataclass
class ExtractionMetadata:
    source_document: str
    extraction_method: str
    confidence: float
    source_page: Optional[int] = None
    extracted_at: datetime = field(default_factory=datetime.now)

@dataclass
class Asset:
    name: str
    category: str
    status: str = "Specified"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    data_completeness: DataCompleteness = DataCompleteness.INSUFFICIENT
    extraction_metadata: Optional[ExtractionMetadata] = None

@dataclass
class EquipmentAsset(Asset):
    manufacturer: Optional[str] = None
    model: Optional[str] = None
    specifications: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BulkMaterial:
    material_type: str
    quantity: float
    unit: str
    description: Optional[str] = None
    specifications: Dict[str, Any] = field(default_factory=dict)
    extraction_metadata: Optional[ExtractionMetadata] = None

@dataclass
class ExtractionResult:
    assets: List[Asset] = field(default_factory=list)
    bulk_materials: List[BulkMaterial] = field(default_factory=list)
