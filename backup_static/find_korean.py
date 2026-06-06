import os
import re

korean_re = re.compile(r'[\uac00-\ud7a3]')

exclude_paths = ['node_modules', 'thailand-addresses.js', 'i18n.js', 'find_korean.py']

for root, dirs, files in os.walk('.'):
    # Skip excluded directories
    dirs[:] = [d for d in dirs if d not in exclude_paths]
    for file in files:
        if file.endswith('.html') or file.endswith('.js'):
            filepath = os.path.join(root, file)
            if any(ex in filepath for ex in exclude_paths):
                continue
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for line_num, line in enumerate(f, 1):
                        if korean_re.search(line):
                            print(f"{filepath}:{line_num}: {line.strip()}")
            except Exception as e:
                print(f"Error reading {filepath}: {e}")
