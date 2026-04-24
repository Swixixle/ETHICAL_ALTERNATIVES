#!/bin/bash
# Download REAL FY2024 USSC Commission Datafiles
# Source: https://www.ussc.gov/research/datafiles/commission-datafiles

set -e

BASE_URL="https://www.ussc.gov"
DATA_DIR="$(cd "$(dirname "$0")" && pwd)/fy2024"

echo "Downloading REAL FY2024 USSC Commission Datafiles..."
echo "Target directory: $DATA_DIR"

# Create directory if it doesn't exist
mkdir -p "$DATA_DIR"

# Download the main offender data file (ZIP)
echo "Downloading FY2024 Individual Datafile (opafy24nid_csv.zip)..."
ZIP_URL="${BASE_URL}/sites/default/files/zip/opafy24nid_csv.zip"
curl -L -o "$DATA_DIR/opafy24nid_csv.zip" "$ZIP_URL"

if [ -f "$DATA_DIR/opafy24nid_csv.zip" ]; then
    echo "Extracting CSV files..."
    unzip -o "$DATA_DIR/opafy24nid_csv.zip" -d "$DATA_DIR/"

    # Move the CSV to expected location
    if [ -f "$DATA_DIR/opafy24nid.csv" ]; then
        mv "$DATA_DIR/opafy24nid.csv" "$DATA_DIR/opafy24.csv"
        echo "Renamed to opafy24.csv"
    fi

    # Clean up zip
    rm "$DATA_DIR/opafy24nid_csv.zip"

    echo ""
    echo "Download complete!"
    echo ""
    ls -lh "$DATA_DIR/"*.csv 2>/dev/null || echo "No CSV files found"

    if [ -f "$DATA_DIR/opafy24.csv" ]; then
        LINE_COUNT=$(wc -l < "$DATA_DIR/opafy24.csv" 2>/dev/null || echo "unknown")
        echo "Records: $LINE_COUNT"
        echo ""
        echo "Next steps:"
        echo "1. Update adapter to use real column names from opafy24.csv"
        echo "2. Run: node test_sentencing_adapter.mjs"
    fi
else
    echo "ERROR: Download failed"
    exit 1
fi
