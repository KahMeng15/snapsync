import os
import re
import sys

def replace_in_string(text):
    replacements = [
        (re.compile(r'snapsync', re.IGNORECASE), 'snapsync'),
        (re.compile(r'snapsync-server', re.IGNORECASE), 'snapsync-server'),
        (re.compile(r'snapsync-share', re.IGNORECASE), 'snapsync-share'),
        (re.compile(r'snapsync-client', re.IGNORECASE), 'snapsync-client'),
        (re.compile(r'snapsync-server', re.IGNORECASE), 'snapsync-server'),
        (re.compile(r'snapsync-share', re.IGNORECASE), 'snapsync-share'),
        (re.compile(r'snapsync-client', re.IGNORECASE), 'snapsync-client'),
        (re.compile(r'SnapSync'), 'SnapSync'),
        (re.compile(r'SnapSync'), 'SnapSync'),
        (re.compile(r'snapsync', re.IGNORECASE), 'snapsync'),
        (re.compile(r'snapsync', re.IGNORECASE), 'snapsync'),
        (re.compile(r'snapsync-server', re.IGNORECASE), 'snapsync-server'),
        (re.compile(r'snapsync-client', re.IGNORECASE), 'snapsync-client'),
        (re.compile(r'snapsync-share', re.IGNORECASE), 'snapsync-share'),
        (re.compile(r'SnapSync'), 'SnapSync'),
        (re.compile(r'SNAPSYNC'), 'SNAPSYNC'),
        (re.compile(r'snapsync', re.IGNORECASE), 'snapsync')
    ]
    for pattern, repl in replacements:
        text = pattern.sub(repl, text)
    return text

def is_text_file(filepath):
    try:
        with open(filepath, 'tr') as check_file:
            check_file.read(1024)
            return True
    except:
        return False

def process_file(filepath):
    if not is_text_file(filepath):
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = replace_in_string(content)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated content in {filepath}")

def process_directory(root_dir):
    # Rename file contents
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude directories
        dirnames[:] = [d for d in dirnames if d not in ['.git', 'node_modules', 'dist', 'out', 'build', '.DS_Store', 'storage']]
        for filename in filenames:
            if filename.endswith(('.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff2', '.ttf')):
                continue
            filepath = os.path.join(dirpath, filename)
            try:
                process_file(filepath)
            except Exception as e:
                print(f"Failed to process {filepath}: {e}")

    # Rename files and directories
    for dirpath, dirnames, filenames in os.walk(root_dir, topdown=False):
        dirnames[:] = [d for d in dirnames if d not in ['.git', 'node_modules', 'dist', 'out', 'build', '.DS_Store', 'storage']]
        
        # Rename files
        for filename in filenames:
            new_name = replace_in_string(filename)
            if new_name != filename:
                old_path = os.path.join(dirpath, filename)
                new_path = os.path.join(dirpath, new_name)
                os.rename(old_path, new_path)
                print(f"Renamed file: {old_path} -> {new_path}")
        
        # Rename directories
        for dirname in dirnames:
            new_name = replace_in_string(dirname)
            if new_name != dirname:
                old_path = os.path.join(dirpath, dirname)
                new_path = os.path.join(dirpath, new_name)
                os.rename(old_path, new_path)
                print(f"Renamed directory: {old_path} -> {new_path}")

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else '.'
    process_directory(root)
