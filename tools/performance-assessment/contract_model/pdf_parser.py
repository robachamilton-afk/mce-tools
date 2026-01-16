"""
PDF Contract Parser with LLM-based Equation Extraction

This service parses PDF contracts and uses an LLM to extract performance
equations, variable definitions, and compliance criteria.

Author: Manus AI
Date: January 12, 2026
"""

import pdfplumber
import re
import json
from typing import Dict, List, Optional, Tuple
from pathlib import Path
import os
from openai import OpenAI


class ContractPDFParser:
    """
    Parses performance contract PDFs and extracts structured performance models.
    """
    
    def __init__(self, openai_api_key: Optional[str] = None):
        """
        Initialize the parser.
        
        Args:
            openai_api_key: OpenAI API key (defaults to env variable)
        """
        self.client = OpenAI(api_key=openai_api_key or os.getenv('OPENAI_API_KEY'))
    
    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract raw text from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text as a single string
        """
        text_content = []
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        text_content.append(text)
        except Exception as e:
            raise ValueError(f"Error extracting text from PDF: {str(e)}")
        
        return "\n\n".join(text_content)
    
    def extract_performance_model_with_llm(
        self, 
        contract_text: str,
        duid: str
    ) -> Dict:
        """
        Use an LLM to extract the performance model from contract text.
        
        This is the key method that leverages AI to understand complex
        contractual language and extract structured performance requirements.
        
        Args:
            contract_text: The full text of the contract
            duid: The DUID of the solar farm
            
        Returns:
            Structured performance model as a dictionary
        """
        
        system_prompt = """You are an expert in solar energy contracts and performance modeling. 
Your task is to analyze solar farm performance contracts and extract:

1. Performance equations (e.g., Expected Energy = POA Irradiance × Array Area × Performance Ratio)
2. Variable definitions (e.g., POA Irradiance measured by on-site pyranometer)
3. Parameter values (e.g., Array Area = 50,000 m², Temperature Coefficient = -0.4%/°C)
4. Data source specifications (e.g., "irradiance shall be measured by Class A pyranometer")
5. Compliance criteria (e.g., "Performance Ratio shall exceed 85% on a monthly basis")

Return your analysis as a JSON object with the following structure:
{
  "equations": {
    "expected_energy_kwh": "equation string",
    "performance_ratio": "equation string"
  },
  "parameters": {
    "parameter_name": {"value": number, "unit": "string"}
  },
  "data_sources": {
    "variable_name": "description of data source"
  },
  "compliance_criteria": {
    "metric_name": {"operator": ">=", "value": number, "period": "monthly"}
  }
}

Be precise and extract exact values and equations as stated in the contract."""

        user_prompt = f"""Analyze this solar farm performance contract and extract the performance model:

CONTRACT TEXT:
{contract_text[:8000]}  # Limit to first 8000 chars to avoid token limits

DUID: {duid}

Please extract all performance equations, parameters, data sources, and compliance criteria."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4.1-mini",  # Using the available model from env
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Low temperature for precision
                response_format={"type": "json_object"}
            )
            
            # Parse the JSON response
            model_json = json.loads(response.choices[0].message.content)
            
            return model_json
            
        except Exception as e:
            raise ValueError(f"Error extracting performance model with LLM: {str(e)}")
    
    def validate_performance_model(self, model: Dict) -> Tuple[bool, List[str]]:
        """
        Validate the extracted performance model for completeness.
        
        Args:
            model: The extracted performance model dictionary
            
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        # Check for required sections
        required_sections = ['equations', 'parameters', 'data_sources', 'compliance_criteria']
        for section in required_sections:
            if section not in model or not model[section]:
                issues.append(f"Missing or empty section: {section}")
        
        # Check that equations exist
        if 'equations' in model:
            if not model['equations']:
                issues.append("No equations found in contract")
        
        # Check that compliance criteria exist
        if 'compliance_criteria' in model:
            if not model['compliance_criteria']:
                issues.append("No compliance criteria found in contract")
        
        is_valid = len(issues) == 0
        return is_valid, issues
    
    def parse_contract(
        self, 
        pdf_path: str,
        duid: str,
        validate: bool = True
    ) -> Dict:
        """
        Complete pipeline to parse a contract PDF and extract the performance model.
        
        Args:
            pdf_path: Path to the PDF contract file
            duid: The DUID of the solar farm
            validate: Whether to validate the extracted model
            
        Returns:
            Complete parsed contract data including raw text and structured model
        """
        # Step 1: Extract text from PDF
        print(f"Extracting text from {pdf_path}...")
        raw_text = self.extract_text_from_pdf(pdf_path)
        
        if not raw_text or len(raw_text) < 100:
            raise ValueError("Insufficient text extracted from PDF. File may be scanned or corrupted.")
        
        # Step 2: Extract performance model using LLM
        print("Analyzing contract with LLM...")
        performance_model = self.extract_performance_model_with_llm(raw_text, duid)
        
        # Step 3: Validate (optional)
        if validate:
            print("Validating extracted model...")
            is_valid, issues = self.validate_performance_model(performance_model)
            if not is_valid:
                print(f"Warning: Validation issues found: {issues}")
        
        # Step 4: Compile complete result
        result = {
            "duid": duid,
            "pdf_path": pdf_path,
            "raw_text": raw_text,
            "performance_model": performance_model,
            "extracted_at": None,  # Would be datetime.now() in production
            "validation_status": "VALID" if is_valid else "INVALID",
            "validation_issues": issues if not is_valid else []
        }
        
        return result
    
    def save_parsed_contract(self, parsed_contract: Dict, output_path: str):
        """
        Save the parsed contract to a JSON file.
        
        Args:
            parsed_contract: The parsed contract dictionary
            output_path: Path to save the JSON file
        """
        with open(output_path, 'w') as f:
            json.dump(parsed_contract, f, indent=2)
        
        print(f"Parsed contract saved to {output_path}")


# Example usage
if __name__ == "__main__":
    # This would be used with an actual contract PDF
    parser = ContractPDFParser()
    
    # Example: Parse a contract
    # result = parser.parse_contract(
    #     pdf_path="/path/to/contract.pdf",
    #     duid="ROYALLA1"
    # )
    # 
    # parser.save_parsed_contract(result, "parsed_contract.json")
    
    print("Contract PDF Parser initialized successfully")
    print("Note: This parser requires an OpenAI API key to be set in the environment")
    print("Usage: parser.parse_contract(pdf_path='contract.pdf', duid='DUID')")
