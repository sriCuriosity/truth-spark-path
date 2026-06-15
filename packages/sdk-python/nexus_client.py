import time
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

class NexusValidationError(Exception):
    """Exception raised for validation errors in the NEXUS SDK."""
    pass

class NexusCortexClient:
    def __init__(self, supabase_url: str, supabase_key: str):
        self.supabase_url = supabase_url.rstrip('/')
        self.headers = {
            "apikey": supabase_key,
            "Authorization": f"Bearer {supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def validate_entry(self, data: Dict[str, Any]):
        """Validates entry payload against NEXUS rules."""
        required = ["entry_type", "title", "body", "domains"]
        for field in required:
            if field not in data:
                raise NexusValidationError(f"Missing required field: '{field}'")

        entry_type = data["entry_type"]
        valid_types = ['action', 'perspective_shift', 'experiment', 'contribution']
        if entry_type not in valid_types:
            raise NexusValidationError(f"Invalid entry_type '{entry_type}'. Must be one of {valid_types}")

        title = data["title"]
        if not isinstance(title, str) or len(title) < 3 or len(title) > 100:
            raise NexusValidationError("Title must be a string between 3 and 100 characters")

        body = data["body"]
        if not isinstance(body, str) or len(body) < 10:
            raise NexusValidationError("Body must be a string with at least 10 characters")

        domains = data["domains"]
        if not isinstance(domains, list) or len(domains) < 1:
            raise NexusValidationError("Domains must be a list containing at least one tag")
        for domain in domains:
            if not isinstance(domain, str):
                raise NexusValidationError("Domain tags must be strings")

        if "happened_at" in data and data["happened_at"]:
            try:
                # Basic ISO format validation check
                datetime.fromisoformat(data["happened_at"].replace("Z", "+00:00"))
            except ValueError:
                raise NexusValidationError("happened_at must be in valid ISO 8601 datetime format")

    def _execute_with_retry(self, method: str, url: str, json_data: Optional[Dict[str, Any]] = None, retries: int = 3, delay: float = 0.5) -> Dict[str, Any]:
        """Runs requests with exponential backoff retry logic."""
        for attempt in range(retries + 1):
            try:
                response = requests.request(method, url, headers=self.headers, json=json_data, timeout=10)
                # If API rate limits (HTTP 429) or server errors (5xx), we retry
                if response.status_code in [429, 500, 502, 503, 504]:
                    raise requests.HTTPError(response=response)
                response.raise_for_status()
                return response.json()
            except (requests.RequestException, requests.HTTPError) as e:
                if attempt == retries:
                    raise e
                time.sleep(delay)
                delay *= 2
        return {}

    def create_entry(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Creates a new cortex entry with validation and retry logic."""
        self.validate_entry(data)
        url = f"{self.supabase_url}/rest/v1/cortex_entries"
        # Supabase API maps post directly to REST table
        result = self._execute_with_retry("POST", url, json_data=data)
        return result[0] if isinstance(result, list) and len(result) > 0 else result

    def get_entries(self, user_id: str) -> List[Dict[str, Any]]:
        """Queries cortex entries for a specific user ID."""
        url = f"{self.supabase_url}/rest/v1/cortex_entries?user_id=eq.{user_id}&order=created_at.desc"
        return self._execute_with_retry("GET", url)

    def update_entry(self, entry_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Updates an existing cortex entry."""
        # Partial validation for keys passed
        if "entry_type" in data:
            valid_types = ['action', 'perspective_shift', 'experiment', 'contribution']
            if data["entry_type"] not in valid_types:
                raise NexusValidationError(f"Invalid entry_type '{data['entry_type']}'. Must be one of {valid_types}")
        if "title" in data:
            if not isinstance(data["title"], str) or len(data["title"]) < 3 or len(data["title"]) > 100:
                raise NexusValidationError("Title must be a string between 3 and 100 characters")
        if "body" in data:
            if not isinstance(data["body"], str) or len(data["body"]) < 10:
                raise NexusValidationError("Body must be a string with at least 10 characters")

        url = f"{self.supabase_url}/rest/v1/cortex_entries?id=eq.{entry_id}"
        result = self._execute_with_retry("PATCH", url, json_data=data)
        return result[0] if isinstance(result, list) and len(result) > 0 else result

    def delete_entry(self, entry_id: str) -> None:
        """Deletes a cortex entry."""
        url = f"{self.supabase_url}/rest/v1/cortex_entries?id=eq.{entry_id}"
        # Delete request to rest endpoint
        headers = self.headers.copy()
        # Prefer representation is fine, delete doesn't need payload back
        for attempt in range(4):
            try:
                response = requests.delete(url, headers=headers, timeout=10)
                response.raise_for_status()
                return
            except requests.RequestException as e:
                if attempt == 3:
                    raise e
                time.sleep(0.5 * (2 ** attempt))
