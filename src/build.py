"""Build the standalone winter game with the historical 'big' build command."""
from pathlib import Path
import runpy
import sys

if __name__ == '__main__':
    if sys.argv[1:] not in ([], ['big'], ['winter']):
        sys.exit('Usage: python3 src/build.py [big|winter]')
    runpy.run_path(str(Path(__file__).resolve().parent / 'winter' / 'build.py'), run_name='__main__')
