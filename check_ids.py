import re
import sys
from collections import Counter

def find_duplicate_ids(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Find all id="..." or id='...'
            ids = re.findall(r'id=["\'](.*?)["\']', content)
            counts = Counter(ids)
            duplicates = {k: v for k, v in counts.items() if v > 1}
            if duplicates:
                print(f"Duplicate IDs in {file_path}:")
                for kid, count in duplicates.items():
                    print(f"  {kid}: {count} occurrences")
            else:
                print(f"No duplicate IDs found in {file_path}.")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")

if __name__ == "__main__":
    for arg in sys.argv[1:]:
        find_duplicate_ids(arg)
