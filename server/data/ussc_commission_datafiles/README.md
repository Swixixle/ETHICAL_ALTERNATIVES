# USSC Commission Datafiles

This directory contains U.S. Sentencing Commission datafiles for sentencing disparity analysis.

**Raw `fy2024/` files are not committed to git** (large). Run `download_fy2024.sh` locally, then `server/scripts/preprocess_ussc_data.mjs` to build `ussc_preprocessed/`.

## Data Source

**Source**: U.S. Sentencing Commission
**URL**: https://www.ussc.gov/research/datafiles/commission-datafiles
**Fiscal Year**: 2024

## File Structure

```
ussc_commission_datafiles/
├── README.md
├── download_script.sh          # Script to download FY2024 data
├── fy2024/
│   ├── opafy24.csv            # Offender data file
│   ├── opafy24_record_layout.pdf  # Record layout documentation
│   └── opafy24_descriptions.pdf   # Variable descriptions
└── processed/
    └── sentencing_index.json   # Generated index for lookups
```

## Key Variables

The offender data files contain sentencing information including:

- **SENTENCE**: Sentence length in months
- **MONRACE**: Race/ethnicity
- **MONSEX**: Gender
- **CITIZEN**: Citizenship status
- **EDUCATION**: Education level
- **AGE**: Age at sentencing
- **OFFTYPE**: Primary offense type
- **OFF2**: Secondary offense
- **LOSS**: Loss amount (for economic crimes)
- **HRCOM**: Criminal history category
- **GDLINE**: Guideline fine amount
- **SENTIMP**: Type of sentence
- **PRISDUM**: Prison sentence indicator
- **PROBATN**: Probation time
- **SENSPC**: Special assessment amount

## Usage

See `/server/services/sentencingDataAdapter.js` for the query interface.

## License

Public domain federal government data.

## Last Updated

Data current as of FY2024 (October 2023 - September 2024).
