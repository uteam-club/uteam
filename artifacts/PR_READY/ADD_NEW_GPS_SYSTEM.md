# How to Add a New GPS System

This guide explains how to add support for a new GPS tracking system without any code changes. The GPS module is now vendor-agnostic and works through profile configuration.

## 🎯 Overview

The GPS module uses a **canonical layer** approach:
- **Raw data** from any GPS system is normalized and mapped to **canonical metrics**
- **Profiles** define how to map system-specific columns to canonical metrics
- **Visualization** uses custom display names while calculations use canonical data
- **Comparisons** between different systems are automatic (same canonical metrics)

## 📋 Step-by-Step Guide

### Step 1: Create GPS Profile

1. **Navigate to GPS Profiles** in the admin interface
2. **Click "Create New Profile"**
3. **Fill in basic information**:
   - **Name**: e.g., "Garmin Edge 1040"
   - **GPS System**: Any string (e.g., "Garmin", "Custom", "NewSystem")
   - **Sport**: e.g., "football", "basketball", "hockey"

### Step 2: Configure Column Mapping

1. **Add columns** for each data field in your GPS system
2. **For each column, specify**:
   - **Source Header**: Exact column name from your CSV/Excel file
   - **Canonical Metric**: Choose from the dropdown (e.g., "total_distance_m", "max_speed_ms")
   - **Display Name**: Custom name for UI (e.g., "Total Distance", "Max Speed")
   - **Unit**: Original unit from your system (e.g., "km", "km/h", "min")
   - **Order**: Display order in reports (1, 2, 3...)
   - **Visible**: Check if column should be shown in reports

### Step 3: Map Common Metrics

**Essential metrics to map**:
- **Distance**: `total_distance_m` (from "Total Distance", "Distance", "TD")
- **Speed**: `max_speed_ms` (from "Max Speed", "Top Speed", "Vmax")
- **Time**: `minutes_played` or `duration_s` (from "Time", "Duration", "Minutes")
- **Player**: `athlete_name` (from "Player", "Athlete", "Name")

**Optional metrics**:
- **Heart Rate**: `avg_heart_rate_bpm`, `max_heart_rate_bpm`
- **Zones**: `zone1_distance_m`, `zone2_distance_m`, etc.
- **Acceleration**: `acceleration_count`, `deceleration_count`

### Step 4: Configure Units

**The system automatically converts to SI units**:
- **Distance**: km → m, miles → m
- **Speed**: km/h → m/s, mph → m/s
- **Time**: min → s, hours → s
- **Heart Rate**: bpm → bpm (no conversion needed)

**Example mappings**:
```
Source Header: "Total Distance (km)"
Canonical Metric: "total_distance_m"
Unit: "km"
→ System converts 5.2 km to 5200 m

Source Header: "Max Speed (km/h)"
Canonical Metric: "max_speed_ms"  
Unit: "km/h"
→ System converts 28.4 km/h to 7.89 m/s
```

### Step 5: Hide Unnecessary Columns

1. **Review all columns** in your profile
2. **Uncheck "Visible"** for columns you don't want to show
3. **Keep only essential metrics** visible for cleaner reports

### Step 6: Save Profile

1. **Click "Save Profile"**
2. **Verify the configuration** looks correct
3. **Note the profile ID** for future reference

## 📊 Import GPS Reports

### Step 1: Prepare Data File

1. **Export data** from your GPS system as CSV or Excel
2. **Ensure column headers** match your profile configuration
3. **Check data format** (numbers, not text for numeric fields)

### Step 2: Upload Report

1. **Go to GPS Reports** section
2. **Click "Import New Report"**
3. **Select your profile** from the dropdown
4. **Upload the file** (CSV/Excel)
5. **Click "Import"**

### Step 3: Map Players

1. **Review the player mapping** screen
2. **Match players** by name or athlete ID
3. **Create new players** if needed
4. **Save mappings**

### Step 4: Verify Results

1. **Check the report** appears in the list
2. **Open the report** to verify data
3. **Confirm headers** show your custom display names
4. **Verify calculations** are correct

## 🔄 Switching Between Systems

### Adding a Second System

1. **Create a new profile** for the second system
2. **Use the same canonical metrics** as the first system
3. **Configure different display names** if desired
4. **Import reports** using the new profile

### Comparing Reports

**Reports from different systems are automatically comparable**:
- **Same canonical metrics** = same calculations
- **Different display names** = system-specific UI
- **Unified data** = accurate comparisons

**Example**:
- **Polar report**: "TD" (Total Distance) → `total_distance_m`
- **STATSports report**: "Дистанция" (Distance) → `total_distance_m`
- **Both reports**: Show 5200m in canonical data, different display names

## 🛠️ Troubleshooting

### Common Issues

**"Column not found" error**:
- Check source header spelling (case-sensitive)
- Verify CSV has the exact column name
- Try different variations of the header

**"Invalid data" error**:
- Check numeric columns contain numbers, not text
- Verify date/time formats are standard
- Look for special characters in data

**"Unit conversion failed"**:
- Check unit field matches the data (km vs miles)
- Verify canonical metric supports the unit
- Try different unit options

### Getting Help

1. **Check the readiness report**: `artifacts/GPS_READINESS_SUMMARY.md`
2. **Review the ADR**: `docs/adr/ADR-0001-gps-canonical-snapshot.md`
3. **Run diagnostics**: `tsx scripts/gps/readiness-check.ts`
4. **Contact support** with specific error messages

## 📚 Best Practices

### Profile Design
- **Use descriptive display names** for your users
- **Map all available metrics** (even if not immediately visible)
- **Keep column order logical** (distance, speed, time, etc.)
- **Test with sample data** before production use

### Data Quality
- **Validate CSV format** before importing
- **Check for missing values** in critical columns
- **Verify unit consistency** across all reports
- **Use consistent player names** for better mapping

### Performance
- **Limit visible columns** to essential metrics
- **Use appropriate data types** (numbers for calculations)
- **Avoid very large files** (split if needed)
- **Regular cleanup** of empty reports

## 🎉 Success Indicators

**Your new GPS system is working when**:
- ✅ Reports import without errors
- ✅ Data displays with your custom headers
- ✅ Calculations are accurate (check against original)
- ✅ Players are mapped correctly
- ✅ Reports are comparable with other systems

**You're ready for production when**:
- ✅ Profile is tested with multiple reports
- ✅ All team members can access reports
- ✅ Data quality is consistent
- ✅ Performance is acceptable

---

**Need help?** Check the operational runbook: `docs/runbook/GPS_RUNBOOK.md`
